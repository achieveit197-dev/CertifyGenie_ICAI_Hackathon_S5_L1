"""
Sample Balance Sheet PDF Generator
------------------------------------
Generates a realistic Indian company Balance Sheet PDF for demo purposes.
Includes a PAN number to demonstrate the redaction feature.

Run:
    cd samples
    pip install reportlab
    python sample_balance_sheet.py
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import os

# ── Company Details ────────────────────────────────────────────────────────────
COMPANY_NAME = "M/s ABC Traders Private Limited"
PAN = "AABCT1234D"          # Will be redacted by Certify Genie
GSTIN = "27AABCT1234D1Z5"   # Will be redacted by Certify Genie
FY = "2024-25"
BALANCE_SHEET_DATE = "31st March 2025"
AUDITOR_FIRM = "M/s XYZ & Associates, Chartered Accountants"
AUDITOR_MEMBERSHIP = "012345"
COMPANY_ADDRESS = "123, Industrial Area, Andheri East, Mumbai - 400 093"
COMPANY_PHONE = "+91 9876543210"   # Will be redacted
COMPANY_EMAIL = "accounts@abctraders.com"  # Will be redacted

# ── Financial Figures (in INR) ──────────────────────────────────────────────
SHARE_CAPITAL = 2_500_000        # ₹25,00,000
RESERVES_SURPLUS = 4_850_000     # ₹48,50,000
ACCUMULATED_LOSSES = 320_000     # ₹3,20,000
NET_WORTH = SHARE_CAPITAL + RESERVES_SURPLUS - ACCUMULATED_LOSSES  # ₹70,30,000

LONG_TERM_BORROWINGS = 3_500_000
SHORT_TERM_BORROWINGS = 1_200_000
TRADE_PAYABLES = 2_800_000
OTHER_CURR_LIAB = 1_110_000

TOTAL_LIABILITIES = (
    SHARE_CAPITAL + RESERVES_SURPLUS - ACCUMULATED_LOSSES
    + LONG_TERM_BORROWINGS + SHORT_TERM_BORROWINGS
    + TRADE_PAYABLES + OTHER_CURR_LIAB
)  # ₹1,85,40,000

FIXED_ASSETS = 8_200_000
INVESTMENTS = 1_500_000
INVENTORY = 3_200_000
TRADE_RECEIVABLES = 2_900_000
CASH_BANK = 780_000
SHORT_TERM_LOANS = 960_000

TOTAL_ASSETS = (
    FIXED_ASSETS + INVESTMENTS + INVENTORY
    + TRADE_RECEIVABLES + CASH_BANK + SHORT_TERM_LOANS
)  # Must equal TOTAL_LIABILITIES

TURNOVER = 12_450_000   # ₹1,24,50,000
NET_PROFIT = 1_870_000  # ₹18,70,000

# ── Helpers ────────────────────────────────────────────────────────────────────
NAVY = HexColor("#1E3A5F")
LIGHT_BLUE = HexColor("#EAF0F9")
GREEN = HexColor("#2ECC71")
GRAY = HexColor("#F5F5F5")


def fmt(amount: int) -> str:
    """Format amount in Indian style with ₹ symbol."""
    s = str(abs(amount))
    if len(s) <= 3:
        formatted = s
    else:
        formatted = s[-3:]
        remaining = s[:-3]
        while len(remaining) > 2:
            formatted = remaining[-2:] + "," + formatted
            remaining = remaining[:-2]
        if remaining:
            formatted = remaining + "," + formatted
    sign = "(" if amount < 0 else ""
    end = ")" if amount < 0 else ""
    return f"₹{sign}{formatted}{end}"


def generate():
    output_path = os.path.join(os.path.dirname(__file__), "sample_balance_sheet.pdf")

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    styles = getSampleStyleSheet()
    title_s = ParagraphStyle("Title", parent=styles["Normal"], fontSize=14,
                              fontName="Helvetica-Bold", textColor=NAVY, alignment=TA_CENTER)
    sub_s = ParagraphStyle("Sub", parent=styles["Normal"], fontSize=10,
                            alignment=TA_CENTER, textColor=HexColor("#333333"))
    small_s = ParagraphStyle("Small", parent=styles["Normal"], fontSize=8,
                              textColor=HexColor("#555555"))
    section_s = ParagraphStyle("Section", parent=styles["Normal"], fontSize=11,
                                fontName="Helvetica-Bold", textColor=NAVY)
    footer_s = ParagraphStyle("Footer", parent=styles["Normal"], fontSize=7,
                               textColor=HexColor("#888888"), alignment=TA_CENTER)

    def tbl(data, col_widths, header_row=True):
        t = Table(data, colWidths=col_widths)
        style = [
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("GRID", (0, 0), (-1, -1), 0.3, HexColor("#CCCCCC")),
        ]
        if header_row:
            style += [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("TEXTCOLOR", (0, 0), (-1, 0), white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ]
        t.setStyle(TableStyle(style))
        return t

    story = []

    # ── Header ────────────────────────────────────────────────────────────────
    story.append(Paragraph(COMPANY_NAME, title_s))
    story.append(Paragraph(f"PAN: {PAN} | GSTIN: {GSTIN}", sub_s))
    story.append(Paragraph(COMPANY_ADDRESS, sub_s))
    story.append(Paragraph(
        f"Phone: {COMPANY_PHONE} | Email: {COMPANY_EMAIL}", sub_s
    ))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=2, color=NAVY))
    story.append(Spacer(1, 4))
    story.append(Paragraph(f"BALANCE SHEET AS AT {BALANCE_SHEET_DATE}", title_s))
    story.append(Paragraph(f"For the Financial Year {FY}", sub_s))
    story.append(Spacer(1, 8))

    # ── Equity & Liabilities ──────────────────────────────────────────────────
    story.append(Paragraph("EQUITY & LIABILITIES", section_s))
    story.append(Spacer(1, 4))

    # Shareholders' Funds
    eq_data = [
        ["Shareholders' Funds", "Note", "Amount (₹)"],
        ["Share Capital", "1", fmt(SHARE_CAPITAL)],
        ["Reserves & Surplus", "2", fmt(RESERVES_SURPLUS)],
        ["Less: Accumulated Losses", "2a", f"({fmt(ACCUMULATED_LOSSES)})"],
        ["Net Worth", "", fmt(NET_WORTH)],
    ]
    story.append(tbl(eq_data, ["55%", "10%", "35%"]))
    story.append(Spacer(1, 6))

    # Non-current Liabilities
    ncl_data = [
        ["Non-Current Liabilities", "Note", "Amount (₹)"],
        ["Long-Term Borrowings", "3", fmt(LONG_TERM_BORROWINGS)],
    ]
    story.append(tbl(ncl_data, ["55%", "10%", "35%"]))
    story.append(Spacer(1, 6))

    # Current Liabilities
    cl_data = [
        ["Current Liabilities", "Note", "Amount (₹)"],
        ["Short-Term Borrowings", "4", fmt(SHORT_TERM_BORROWINGS)],
        ["Trade Payables", "5", fmt(TRADE_PAYABLES)],
        ["Other Current Liabilities", "6", fmt(OTHER_CURR_LIAB)],
    ]
    story.append(tbl(cl_data, ["55%", "10%", "35%"]))
    story.append(Spacer(1, 4))

    total_liab_tbl = Table(
        [["TOTAL EQUITY & LIABILITIES", "", fmt(TOTAL_LIABILITIES)]],
        colWidths=["55%", "10%", "35%"],
    )
    total_liab_tbl.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BLUE),
        ("ALIGN", (2, 0), (2, 0), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("LINEABOVE", (0, 0), (-1, -1), 1.5, NAVY),
        ("LINEBELOW", (0, 0), (-1, -1), 1.5, NAVY),
    ]))
    story.append(total_liab_tbl)
    story.append(Spacer(1, 10))

    # ── Assets ────────────────────────────────────────────────────────────────
    story.append(Paragraph("ASSETS", section_s))
    story.append(Spacer(1, 4))

    # Non-current Assets
    nca_data = [
        ["Non-Current Assets", "Note", "Amount (₹)"],
        ["Fixed Assets (Net Block)", "7", fmt(FIXED_ASSETS)],
        ["Long-Term Investments", "8", fmt(INVESTMENTS)],
    ]
    story.append(tbl(nca_data, ["55%", "10%", "35%"]))
    story.append(Spacer(1, 6))

    # Current Assets
    ca_data = [
        ["Current Assets", "Note", "Amount (₹)"],
        ["Inventories", "9", fmt(INVENTORY)],
        ["Trade Receivables", "10", fmt(TRADE_RECEIVABLES)],
        ["Cash & Bank Balances", "11", fmt(CASH_BANK)],
        ["Short-Term Loans & Advances", "12", fmt(SHORT_TERM_LOANS)],
    ]
    story.append(tbl(ca_data, ["55%", "10%", "35%"]))
    story.append(Spacer(1, 4))

    total_assets_tbl = Table(
        [["TOTAL ASSETS", "", fmt(TOTAL_ASSETS)]],
        colWidths=["55%", "10%", "35%"],
    )
    total_assets_tbl.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BLUE),
        ("ALIGN", (2, 0), (2, 0), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("LINEABOVE", (0, 0), (-1, -1), 1.5, NAVY),
        ("LINEBELOW", (0, 0), (-1, -1), 1.5, NAVY),
    ]))
    story.append(total_assets_tbl)
    story.append(Spacer(1, 10))

    # ── P&L Summary ───────────────────────────────────────────────────────────
    story.append(Paragraph("PROFIT & LOSS SUMMARY (FY 2024-25)", section_s))
    story.append(Spacer(1, 4))
    pl_data = [
        ["Particulars", "Amount (₹)"],
        ["Total Turnover / Revenue from Operations", fmt(TURNOVER)],
        ["Net Profit After Tax", fmt(NET_PROFIT)],
    ]
    story.append(tbl(pl_data, ["65%", "35%"]))
    story.append(Spacer(1, 12))

    # ── Schedules ─────────────────────────────────────────────────────────────
    story.append(Paragraph("NOTES TO ACCOUNTS (Selected Schedules)", section_s))
    story.append(Spacer(1, 4))

    sch1 = [
        ["Schedule 1 — Share Capital", "Amount (₹)"],
        ["Authorised Capital: 5,00,000 equity shares of ₹10 each", fmt(5_000_000)],
        ["Issued, Subscribed & Paid-up:", ""],
        ["  2,50,000 equity shares of ₹10 each, fully paid", fmt(SHARE_CAPITAL)],
    ]
    story.append(tbl(sch1, ["65%", "35%"]))
    story.append(Spacer(1, 6))

    sch2 = [
        ["Schedule 2 — Reserves & Surplus", "Amount (₹)"],
        ["General Reserve", fmt(2_000_000)],
        ["Profit & Loss Account (Surplus)", fmt(2_850_000)],
        ["Total Reserves & Surplus", fmt(RESERVES_SURPLUS)],
    ]
    story.append(tbl(sch2, ["65%", "35%"]))
    story.append(Spacer(1, 6))

    sch2a = [
        ["Schedule 2a — Accumulated Losses", "Amount (₹)"],
        ["Opening Balance of Losses", fmt(500_000)],
        ["Less: Transferred during year", fmt(180_000)],
        ["Closing Balance of Accumulated Losses", fmt(ACCUMULATED_LOSSES)],
    ]
    story.append(tbl(sch2a, ["65%", "35%"]))
    story.append(Spacer(1, 10))

    # ── Auditor's Report ──────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=1, color=HexColor("#CCCCCC")))
    story.append(Spacer(1, 6))
    story.append(Paragraph("AUDITOR'S REPORT", section_s))
    story.append(Paragraph(
        f"To the Members of {COMPANY_NAME}",
        ParagraphStyle("Aud", parent=styles["Normal"], fontSize=9),
    ))
    story.append(Paragraph(
        "We have audited the accompanying financial statements of the Company as of "
        f"{BALANCE_SHEET_DATE} and for the year then ended. In our opinion, these "
        "statements give a true and fair view in conformity with accounting principles "
        "generally accepted in India.",
        ParagraphStyle("AudBody", parent=styles["Normal"], fontSize=8, leading=12),
    ))
    story.append(Spacer(1, 8))
    story.append(Paragraph(f"For {AUDITOR_FIRM}", small_s))
    story.append(Paragraph(f"Membership No: {AUDITOR_MEMBERSHIP}", small_s))
    story.append(Paragraph(f"Date: 15/05/2025 | Place: Mumbai", small_s))
    story.append(Spacer(1, 10))

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.5, color=HexColor("#CCCCCC")))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "This is a sample document generated for Certify Genie demo | ICAI AI Hackathon Season 5",
        footer_s,
    ))
    story.append(Paragraph(
        f"Contains PAN ({PAN}) and GSTIN ({GSTIN}) for redaction demonstration",
        footer_s,
    ))

    doc.build(story)
    print(f"[OK] Sample Balance Sheet generated: {output_path}")
    print(f"   Net Worth: INR {NET_WORTH:,}")
    print(f"   Total Assets = Total Liabilities: INR {TOTAL_ASSETS:,}")
    print(f"   PAN {PAN} included for redaction demo")


if __name__ == "__main__":
    generate()
