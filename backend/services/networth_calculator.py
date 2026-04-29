"""
Net Worth Calculator Service
-----------------------------
7-method net worth computation engine for Indian CA firm certificates.
All methods return None when required inputs are missing.
"""
from typing import Optional


METHODS = [
    "book_value",
    "companies_act",
    "tangible_nw",
    "nav",
    "sebi_lodr",
    "adjusted_tbv",
    "consolidated",
]

ENTITY_TYPES = ["company", "llp", "partnership", "proprietorship"]

# Which methods are applicable per entity type
ENTITY_METHOD_MAP: dict[str, list[str]] = {
    "company":        ["book_value", "companies_act", "tangible_nw", "nav", "sebi_lodr", "adjusted_tbv"],
    "llp":            ["book_value", "tangible_nw", "nav"],
    "partnership":    ["book_value", "tangible_nw", "nav"],
    "proprietorship": ["book_value", "tangible_nw", "nav"],
}

RECOMMENDED_METHOD: dict[str, str] = {
    "company":        "companies_act",
    "llp":            "book_value",
    "partnership":    "book_value",
    "proprietorship": "book_value",
}

METHOD_LABELS: dict[str, str] = {
    "book_value":    "Book Value (Basic)",
    "companies_act": "Companies Act Sec. 2(57)",
    "tangible_nw":   "Tangible Net Worth",
    "nav":           "NAV Method",
    "sebi_lodr":     "SEBI LODR",
    "adjusted_tbv":  "Adjusted TBV",
    "consolidated":  "Consolidated",
}

METHOD_FORMULAS: dict[str, str] = {
    "book_value":    "Share Capital + Reserves & Surplus − Accumulated Losses",
    "companies_act": "Paid-up Capital + Free Reserves − Losses − Deferred Expenditure",
    "tangible_nw":   "Book Value Net Worth − Intangible Assets − Goodwill",
    "nav":           "Total Assets − Total Liabilities",
    "sebi_lodr":     "Share Capital + Reserves & Surplus − Accumulated Losses (SEBI LODR Reg. 16)",
    "adjusted_tbv":  "Tangible Net Worth − Revaluation Reserve",
    "consolidated":  "Requires consolidated financial statements",
}

METHOD_CONTEXTS: dict[str, str] = {
    "book_value":    "General purpose — all entities",
    "companies_act": "Statutory compliance — Companies Act registered entities",
    "tangible_nw":   "Bank credit appraisal / lender requirements",
    "nav":           "All entities — balance sheet approach",
    "sebi_lodr":     "Listed companies — SEBI LODR Regulation 16 compliance",
    "adjusted_tbv":  "Private equity / M&A due diligence",
    "consolidated":  "Group entities — requires consolidated financial statements",
}


def _get(data: dict, key: str) -> Optional[float]:
    """Extract numeric value from raw extracted dict."""
    entry = data.get(key)
    if entry is None:
        return None
    if isinstance(entry, dict):
        val = entry.get("value")
        return float(val) if val is not None else None
    if isinstance(entry, (int, float)):
        return float(entry)
    return None


def compute_methods(data: dict) -> dict[str, Optional[float]]:
    """
    Compute all available net worth methods from raw extracted data dict.
    Returns method_id → value (None if required inputs missing).
    """
    sc = _get(data, "share_capital")
    rs = _get(data, "reserves_surplus")
    raw_al = _get(data, "accumulated_losses") or 0.0
    # If R&S is already negative, the deficit is embedded in it — don't double-deduct AL
    al = 0.0 if (rs is not None and rs < 0) else raw_al
    ta = _get(data, "total_assets")
    tl = _get(data, "total_liabilities")
    ia = _get(data, "intangible_assets")
    gw = _get(data, "goodwill") or 0.0
    rr = _get(data, "revaluation_reserve") or 0.0
    de = _get(data, "deferred_expenditure") or 0.0

    # Method 1: Book Value
    bv = (sc + rs - al) if sc is not None and rs is not None else None

    # Method 2: Companies Act § 2(57)
    ca_method = (sc + rs - al - de) if sc is not None and rs is not None else None

    # Method 3: Tangible Net Worth = Book Value − Intangibles − Goodwill
    if bv is not None and ia is not None:
        tnw = bv - ia - gw
    elif bv is not None:
        tnw = bv - gw
    else:
        tnw = None

    # Method 4: NAV = Total Assets − Total Liabilities
    nav = (ta - tl) if ta is not None and tl is not None else None

    # Method 5: SEBI LODR — same formula as Book Value, distinct legal context
    sebi = bv

    # Method 6: Adjusted TBV = Tangible NW − Revaluation Reserve
    atbv = (tnw - rr) if tnw is not None else None

    # Method 7: Consolidated — not auto-computed (requires separate consolidated FS)
    consolidated = None

    return {
        "book_value":    bv,
        "companies_act": ca_method,
        "tangible_nw":   tnw,
        "nav":           nav,
        "sebi_lodr":     sebi,
        "adjusted_tbv":  atbv,
        "consolidated":  consolidated,
    }


def build_method_results(data: dict, entity_type: str) -> list[dict]:
    """
    Build list of method result dicts for the given entity type.
    Each dict has: method_id, label, formula, context, value,
                   applicable, coming_soon, recommended
    """
    computed = compute_methods(data)
    applicable_set = set(ENTITY_METHOD_MAP.get(entity_type, list(METHODS)))
    recommended = RECOMMENDED_METHOD.get(entity_type, "book_value")

    results = []
    for method_id in METHODS:
        is_coming_soon = method_id == "consolidated"
        is_applicable = method_id in applicable_set and not is_coming_soon
        results.append({
            "method_id":   method_id,
            "label":       METHOD_LABELS[method_id],
            "formula":     METHOD_FORMULAS[method_id],
            "context":     METHOD_CONTEXTS[method_id],
            "value":       computed.get(method_id),
            "applicable":  is_applicable,
            "coming_soon": is_coming_soon,
            "recommended": method_id == recommended and is_applicable,
        })
    return results
