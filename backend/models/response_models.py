from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class UploadResponse(BaseModel):
    file_id: str
    filename: str
    file_type: Literal["pdf", "excel"]
    size_bytes: int
    message: str = "File uploaded securely"


class FinancialFigure(BaseModel):
    value: Optional[float] = None
    source_line: Optional[str] = None
    status: Literal["verified", "needs_review", "not_found"] = "not_found"


class PreviousYearData(BaseModel):
    financial_year: Optional[str] = None
    share_capital: Optional[float] = None
    reserves_surplus: Optional[float] = None
    accumulated_losses: Optional[float] = None
    net_worth: Optional[float] = None
    total_assets: Optional[float] = None
    total_liabilities: Optional[float] = None
    turnover: Optional[float] = None
    net_profit: Optional[float] = None
    current_assets: Optional[float] = None
    current_liabilities: Optional[float] = None
    working_capital: Optional[float] = None


class ExtractedData(BaseModel):
    share_capital: Optional[FinancialFigure] = None
    reserves_surplus: Optional[FinancialFigure] = None
    accumulated_losses: Optional[FinancialFigure] = None
    total_assets: Optional[FinancialFigure] = None
    total_liabilities: Optional[FinancialFigure] = None
    net_worth: Optional[FinancialFigure] = None
    turnover: Optional[FinancialFigure] = None
    net_profit: Optional[FinancialFigure] = None
    current_assets: Optional[FinancialFigure] = None
    current_liabilities: Optional[FinancialFigure] = None
    working_capital: Optional[FinancialFigure] = None
    financial_year: Optional[str] = None
    company_name: Optional[str] = None
    currency: str = "INR"
    confidence_score: float = Field(0.0, ge=0.0, le=1.0)
    extraction_notes: Optional[str] = None
    previous_year: Optional[PreviousYearData] = None


class NetWorthMethodResult(BaseModel):
    method_id: str
    label: str
    formula: str
    context: str
    value: Optional[float] = None
    applicable: bool = True
    coming_soon: bool = False
    recommended: bool = False


class NetWorthMethodsResponse(BaseModel):
    file_id: str
    entity_type: str
    methods: list[NetWorthMethodResult]


class ValidationResult(BaseModel):
    net_worth_equation_valid: Optional[bool] = None
    balance_sheet_balanced: Optional[bool] = None
    net_worth_discrepancy: Optional[float] = None
    balance_sheet_discrepancy: Optional[float] = None
    messages: list[str] = []
    overall_status: Literal["pass", "warning", "fail"] = "warning"


class RedactionSummary(BaseModel):
    cin_count: int = 0
    pan_count: int = 0
    aadhaar_count: int = 0
    mobile_count: int = 0
    email_count: int = 0
    gstin_count: int = 0
    total_redacted: int = 0


class ExtractionResponse(BaseModel):
    file_id: str
    certificate_type: str
    extracted_data: ExtractedData
    validation_results: ValidationResult
    redaction_summary: RedactionSummary
    tokens_used: int = 0
    extraction_mode: Literal["text", "vision"] = "text"


class CertificateResponse(BaseModel):
    certificate_id: str
    certificate_number: str
    download_url_pdf: str
    download_url_docx: str
    generated_at: str
    message: str = "Certificate generated successfully"
