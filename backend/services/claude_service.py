"""
Claude API Service
------------------
Integrates with Anthropic Claude API (claude-sonnet-4-6) for:
1. Text-based financial data extraction (PDF with text layer / Excel)
2. Vision-based extraction (scanned PDFs — image input)

Handles:
- JSON response parsing (strips markdown fences)
- Automatic retry on transient failure
- Token usage logging
- Prompt caching for system prompt
"""
import json
import logging
import re
import time
from typing import Optional

import anthropic

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

EXTRACTION_SYSTEM_PROMPT = """You are a highly accurate financial document analyst specialising in Indian CA firm documents.
Your task is to extract specific financial figures from the provided document.

Rules:
- NEVER hallucinate or infer values. Only extract what is explicitly stated in the document.
- Always cite the exact line or section where each value was found in source_line.
- If a value is not found, return null for that field.
- Return ONLY valid JSON — no markdown, no explanation, no code fences.
- Amounts should be in the document's unit (usually Indian Rupees, full value not lakhs unless document uses lakhs).
- confidence_score: 0.0 (complete guess) to 1.0 (clearly stated, no ambiguity).
- BRACKET NOTATION: In Indian accounting, amounts shown in parentheses/brackets e.g. (1,23,56,657) mean NEGATIVE values. Always return these as negative numbers e.g. -12356657. Never strip the negative sign."""

EXTRACTION_PROMPT = """Extract the following financial figures from this document and return ONLY a JSON object matching the schema below exactly.

CRITICAL RULES for net_worth: The document may not use the word "Net Worth" explicitly. Look for the subtotal of "Shareholders' funds", "Shareholders' equity", or "Equity" section on the Balance Sheet — that subtotal IS the net worth. Extract that subtotal for the net_worth field.

CRITICAL RULES for total_assets vs total_liabilities:
- "total_assets": The grand TOTAL on the ASSETS side of the Balance Sheet (sum of all assets).
- "total_liabilities": ONLY the sum of EXTERNAL liabilities — i.e., Non-current liabilities + Current liabilities. Do NOT use the grand balance sheet TOTAL (which equals assets). Do NOT include Shareholders' funds / equity in total_liabilities. The formula is: Total Assets = Shareholders' Funds + Total External Liabilities. So total_liabilities = Total Assets − Shareholders' Funds (net worth).

CRITICAL RULES for working_capital fields:
- "current_assets": The TOTAL of the "Current Assets" section on the Balance Sheet. Includes Inventories, Trade Receivables, Cash & Bank, Short-term Loans & Advances, Other Current Assets. Do NOT use Total Assets.
- "current_liabilities": The TOTAL of the "Current Liabilities" section ONLY. Do NOT include Non-current / Long-term liabilities.
- "working_capital": Current Assets − Current Liabilities. Compute this if not explicitly stated in the document.

CRITICAL RULES for reserves_surplus vs accumulated_losses — read carefully:
- "reserves_surplus": Extract the TOTAL NET figure (the heading subtotal) under "Reserves and Surplus" on the Balance Sheet. If it is in brackets e.g. (1,23,56,657), return it as a NEGATIVE number -12356657. This total already nets all sub-components including any deficit.
- "accumulated_losses": Return null in ALL of these cases: (a) when reserves_surplus total is negative/in brackets — the deficit is already inside it; (b) when the only loss figure is a sub-line inside the Reserves & Surplus section (e.g. "Surplus/(Deficit) in Statement of P&L"). Only return a value here if a SEPARATE "Accumulated Losses" or "Deficit" line appears as a standalone deduction BELOW the Shareholders' Funds section.
- NEVER put the same number in both reserves_surplus and accumulated_losses.
- NEVER return a positive accumulated_losses when reserves_surplus is negative — that is always double-counting.

CRITICAL RULES for previous_year:
- Indian financial statements (Balance Sheet, P&L) always show TWO columns: current year and the PREVIOUS year side-by-side for comparison.
- You MUST extract the previous year column figures if they exist. Do NOT skip them.
- The previous year column is typically labelled "As at 31st March 20XX" (prior year) or "Previous Year" or "2023-24" next to "2024-25".
- Set previous_year to null ONLY if the document genuinely has no prior-year column at all (e.g. a first-year company or a single-column document).

Return this JSON object (no markdown, no explanation, no code fences):

{
  "share_capital": {"value": <float or null>, "source_line": "<exact text where found>"},
  "reserves_surplus": {"value": <float or null>, "source_line": "<exact text where found>"},
  "accumulated_losses": {"value": <float or null>, "source_line": "<exact text where found>"},
  "total_assets": {"value": <float or null>, "source_line": "<exact text where found>"},
  "total_liabilities": {"value": <float or null>, "source_line": "<exact text where found>"},
  "net_worth": {"value": <float or null>, "source_line": "<exact text where found>"},
  "turnover": {"value": <float or null>, "source_line": "<exact text where found>"},
  "net_profit": {"value": <float or null>, "source_line": "<exact text where found>"},
  "goodwill": {"value": <float or null>, "source_line": "<exact text where found>"},
  "intangible_assets": {"value": <float or null>, "source_line": "<exact text where found>"},
  "revaluation_reserve": {"value": <float or null>, "source_line": "<exact text where found>"},
  "securities_premium": {"value": <float or null>, "source_line": "<exact text where found>"},
  "deferred_expenditure": {"value": <float or null>, "source_line": "<exact text where found>"},
  "current_assets": {"value": <float or null>, "source_line": "<exact text where found>"},
  "current_liabilities": {"value": <float or null>, "source_line": "<exact text where found>"},
  "working_capital": {"value": <float or null>, "source_line": "<exact text where found>"},
  "financial_year": "<string e.g. 2024-25 or null>",
  "company_name": "<string — the business/company name as stated in document>",
  "currency": "INR",
  "confidence_score": <float 0.0 to 1.0>,
  "extraction_notes": "<brief note about document quality or any anomalies>",
  "previous_year": null
}

IMPORTANT: If the document has a prior-year comparative column, replace the "previous_year": null above with:
  "previous_year": {
    "financial_year": "<string e.g. 2023-24>",
    "share_capital": <float or null>,
    "reserves_surplus": <float or null>,
    "accumulated_losses": <float or null>,
    "net_worth": <float or null>,
    "total_assets": <float or null>,
    "total_liabilities": <float or null>,
    "turnover": <float or null>,
    "net_profit": <float or null>,
    "current_assets": <float or null>,
    "current_liabilities": <float or null>,
    "working_capital": <float or null>
  }

Document content:
"""


def _parse_claude_json(raw: str) -> dict:
    """Strip markdown code fences and parse JSON from Claude response."""
    # Remove ```json ... ``` or ``` ... ```
    cleaned = re.sub(r"```(?:json)?\s*", "", raw).replace("```", "").strip()
    return json.loads(cleaned)


def extract_financial_data_text(
    document_text: str, max_retries: int = 2
) -> tuple[dict, int]:
    """
    Extract financial figures from plain text using Claude.
    Returns (extracted_dict, tokens_used).
    """
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    prompt = EXTRACTION_PROMPT + document_text

    for attempt in range(1, max_retries + 2):
        try:
            response = client.messages.create(
                model=settings.claude_model,
                max_tokens=3000,
                system=EXTRACTION_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
            )
            raw_text = response.content[0].text
            tokens_used = response.usage.input_tokens + response.usage.output_tokens
            logger.info(
                "Claude text extraction — tokens: %d (attempt %d)", tokens_used, attempt
            )
            data = _parse_claude_json(raw_text)
            return data, tokens_used

        except json.JSONDecodeError as exc:
            logger.warning("JSON parse failed on attempt %d: %s", attempt, exc)
            if attempt > max_retries:
                raise RuntimeError("Claude returned invalid JSON after retries") from exc
            time.sleep(1)

        except anthropic.APIError as exc:
            logger.warning("Claude API error on attempt %d: %s", attempt, exc)
            if attempt > max_retries:
                raise RuntimeError(f"Claude API unavailable: {exc}") from exc
            time.sleep(2)

    raise RuntimeError("Extraction failed after all retries")


def extract_financial_data_vision(
    page_images_b64: list[str], max_retries: int = 2
) -> tuple[dict, int]:
    """
    Extract financial figures from scanned PDF images using Claude Vision.
    Returns (extracted_dict, tokens_used).
    """
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    # Build content blocks: images first, then the extraction prompt
    content: list[dict] = []
    for b64_image in page_images_b64[:5]:  # limit to 5 pages to control token cost
        content.append(
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": b64_image,
                },
            }
        )

    content.append(
        {
            "type": "text",
            "text": EXTRACTION_PROMPT + "(Document is provided as images above — extract from the images)",
        }
    )

    for attempt in range(1, max_retries + 2):
        try:
            response = client.messages.create(
                model=settings.claude_model,
                max_tokens=3000,
                system=EXTRACTION_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": content}],
            )
            raw_text = response.content[0].text
            tokens_used = response.usage.input_tokens + response.usage.output_tokens
            logger.info(
                "Claude vision extraction — tokens: %d (attempt %d)", tokens_used, attempt
            )
            data = _parse_claude_json(raw_text)
            return data, tokens_used

        except json.JSONDecodeError as exc:
            logger.warning("Vision JSON parse failed on attempt %d: %s", attempt, exc)
            if attempt > max_retries:
                raise RuntimeError("Claude Vision returned invalid JSON after retries") from exc
            time.sleep(1)

        except anthropic.APIError as exc:
            logger.warning("Claude Vision API error on attempt %d: %s", attempt, exc)
            if attempt > max_retries:
                raise RuntimeError(f"Claude API unavailable: {exc}") from exc
            time.sleep(2)

    raise RuntimeError("Vision extraction failed after all retries")
