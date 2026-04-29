"""
PII Redaction Service
---------------------
Redacts sensitive identifiers from text before sending to Claude API.
Maintains a session-scoped token map for restoration in final output.
Company name is intentionally NOT redacted (needed for certificate).
"""
import re
import logging
import uuid
from typing import Tuple

logger = logging.getLogger(__name__)

# Redaction patterns — ordered from most-specific to least-specific
REDACTION_PATTERNS: list[tuple[str, str, str]] = [
    # (label, regex_pattern, replacement_token_prefix)
    ("CIN", r"[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}", "CIN_REDACTED"),
    ("PAN", r"[A-Z]{5}[0-9]{4}[A-Z]{1}", "PAN_REDACTED"),
    ("GSTIN", r"\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}", "GSTIN_REDACTED"),
    ("AADHAAR", r"\d{4}\s?\d{4}\s?\d{4}", "AADHAAR_REDACTED"),
    ("MOBILE", r"(\+91|0)?[6-9]\d{9}", "MOBILE_REDACTED"),
    (
        "EMAIL",
        r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}",
        "EMAIL_REDACTED",
    ),
]


class RedactionService:
    """Stateful per-request redaction service. One instance per extraction session."""

    def __init__(self) -> None:
        # token_map: placeholder_token → original_value
        self._token_map: dict[str, str] = {}
        self.counts: dict[str, int] = {label: 0 for label, _, _ in REDACTION_PATTERNS}

    def redact(self, text: str) -> str:
        """Replace all PII in text with stable placeholder tokens."""
        redacted = text
        for label, pattern, prefix in REDACTION_PATTERNS:
            def _replacer(match: re.Match, _label=label, _prefix=prefix) -> str:
                original = match.group(0)
                # Reuse token if same value seen before
                existing = next(
                    (k for k, v in self._token_map.items() if v == original), None
                )
                self.counts[_label] += 1
                if existing:
                    return f"[{existing}]"
                token = f"{_prefix}_{uuid.uuid4().hex[:6].upper()}"
                self._token_map[token] = original
                logger.debug("Redacted %s: %s → [%s]", _label, original, token)
                return f"[{token}]"

            redacted = re.sub(pattern, _replacer, redacted)

        total = sum(self.counts.values())
        if total > 0:
            logger.info(
                "Redaction complete — CIN:%d PAN:%d GSTIN:%d AADHAAR:%d MOBILE:%d EMAIL:%d",
                self.counts["CIN"],
                self.counts["PAN"],
                self.counts["GSTIN"],
                self.counts["AADHAAR"],
                self.counts["MOBILE"],
                self.counts["EMAIL"],
            )
        return redacted

    def restore(self, text: str) -> str:
        """Replace all placeholder tokens in text with original values."""
        restored = text
        for token, original in self._token_map.items():
            restored = restored.replace(f"[{token}]", original)
        return restored

    @property
    def summary(self) -> dict[str, int]:
        return {
            "cin_count": self.counts["CIN"],
            "pan_count": self.counts["PAN"],
            "aadhaar_count": self.counts["AADHAAR"],
            "mobile_count": self.counts["MOBILE"],
            "email_count": self.counts["EMAIL"],
            "gstin_count": self.counts["GSTIN"],
            "total_redacted": sum(self.counts.values()),
        }
