from pydantic import BaseModel, Field
from typing import Literal, Optional, List

EntityType = Literal["company", "llp", "partnership", "proprietorship"]
NWMethod = Literal[
    "book_value", "companies_act", "tangible_nw",
    "nav", "sebi_lodr", "adjusted_tbv", "consolidated",
]


class ManualRedactionBox(BaseModel):
    page_index: int = Field(..., description="0-based page index")
    x0: float = Field(..., description="Left edge in PDF points")
    y0: float = Field(..., description="Top edge in PDF points")
    x1: float = Field(..., description="Right edge in PDF points")
    y1: float = Field(..., description="Bottom edge in PDF points")


class ExtractRequest(BaseModel):
    certificate_type: Literal["net_worth", "turnover", "working_capital"] = Field(
        default="net_worth", description="Type of certificate to generate"
    )
    manual_boxes: Optional[List[ManualRedactionBox]] = Field(
        default=None, description="User-drawn redaction boxes applied on top of auto-redaction"
    )


class NetWorthMethodsRequest(BaseModel):
    entity_type: EntityType = Field("company", description="Legal entity type")


class CADetails(BaseModel):
    name: str = Field(..., description="CA full name")
    firm_name: str = Field(..., description="CA firm name")
    membership_no: str = Field(..., description="ICAI membership number")
    address: str = Field(default="", description="Office address")
    date: Optional[str] = Field(None, description="Certificate date (DD/MM/YYYY)")


class GenerateRequest(BaseModel):
    certificate_type: Literal["net_worth", "turnover", "working_capital"]
    ca_details: CADetails
    entity_type: Optional[EntityType] = Field(
        default=None,
        description="Legal entity type — used to select net worth method.",
    )
    nw_method: Optional[NWMethod] = Field(
        default=None,
        description="Net worth calculation method ID selected by CA.",
    )
    nw_method_label: Optional[str] = Field(
        default=None,
        description="Display label of the selected net worth method.",
    )
    overrides: Optional[dict] = Field(
        default=None,
        description="Manual overrides for extracted values. Key = field name, value = new amount.",
    )
    custom_narrative: Optional[str] = Field(
        default=None,
        description="Custom opening paragraph text for the certificate body.",
    )
    additional_notes: Optional[str] = Field(
        default=None,
        description="Additional notes or lines to append before the signature block.",
    )
    custom_row_labels: Optional[dict[str, str]] = Field(
        default=None,
        description="Custom labels for figure rows. Key = field name, value = display label.",
    )
    custom_cert_number: Optional[str] = Field(
        default=None,
        description="Custom certificate number (overrides auto-generated if provided).",
    )
    custom_company_name: Optional[str] = Field(
        default=None,
        description="Override for the company name shown in the certificate.",
    )
    custom_financial_year: Optional[str] = Field(
        default=None,
        description="Override for the financial year shown in the certificate.",
    )
    udin: Optional[str] = Field(
        default=None,
        description="Unique Document Identification Number (UDIN) — printed bold in certificate.",
    )
    pdf_password: Optional[str] = Field(
        default=None,
        description="Alphanumeric password to restrict opening the PDF. Empty = no protection.",
    )
    wc_purpose: Optional[str] = Field(
        default=None,
        description="Purpose of the Working Capital certificate (e.g. 'Bank Loan Assessment'). Shown in closing line.",
    )
