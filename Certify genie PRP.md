# Certify Genie — Product Requirements Prompt (PRP)
## For use in Claude Code / Cursor IDE

---

## ROLE & CONTEXT

You are an expert Python/FastAPI + React/TypeScript full-stack developer building a
production-grade AI-powered Certificate Generation System for Indian Chartered Accountant
firms. The product is called **"Certify Genie"** — a cloud-based SaaS tool that allows
CA firms to upload client financial documents (PDF or Excel) and automatically generate
ICAI-format certificates with AI-extracted figures, zero manual data entry, and full
citation trails.

This is being built for the **ICAI AI Hackathon** and will be showcased as a live demo.
The judge audience is Chartered Accountants — so domain accuracy, privacy narrative,
and professional output quality are the top priorities.

---

## TECH STACK

**Backend:**
- Python 3.11+
- FastAPI (REST API)
- Anthropic Claude API (claude-sonnet-4-5 model) for PDF/Excel understanding
- openpyxl for Excel parsing
- PyMuPDF (fitz) for PDF text extraction
- pdfplumber as fallback PDF parser
- python-docx for certificate Word document generation
- reportlab for certificate PDF generation
- python-dotenv for environment variables
- uvicorn as ASGI server
- Pydantic v2 for data validation

**Frontend:**
- React 18 + TypeScript
- Vite as build tool
- Tailwind CSS for styling
- shadcn/ui component library
- react-dropzone for file upload
- axios for API calls
- react-hot-toast for notifications
- lucide-react for icons

**Storage:**
- Local filesystem for hackathon (uploads/ and outputs/ folders)
- No database required for MVP

**Environment:**
- Windows 11 (ASUS TUF Gaming A15)
- AMD Ryzen 7, 16GB RAM, NVIDIA RTX 3050
- Development in Cursor IDE with Claude Code

---

## PROJECT STRUCTURE TO CREATE

```
certify-genie/
├── backend/
│   ├── main.py                    # FastAPI app entry point
│   ├── requirements.txt           # Python dependencies
│   ├── .env                       # API keys (never commit)
│   ├── .env.example               # Template for env vars
│   ├── config.py                  # App configuration
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── upload.py              # File upload endpoints
│   │   ├── extract.py             # AI extraction endpoints
│   │   └── certificate.py        # Certificate generation endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   ├── redaction.py           # PII redaction before AI
│   │   ├── pdf_extractor.py       # PDF text/image extraction
│   │   ├── excel_extractor.py     # Excel data extraction
│   │   ├── claude_service.py      # Claude API integration
│   │   └── certificate_generator.py  # Certificate creation
│   ├── models/
│   │   ├── __init__.py
│   │   ├── request_models.py      # Pydantic request schemas
│   │   └── response_models.py     # Pydantic response schemas
│   ├── templates/
│   │   ├── net_worth.py           # Net Worth certificate template
│   │   ├── turnover.py            # Turnover certificate template
│   │   └── form_15cb.py          # Form 15CB template
│   └── uploads/                   # Temp storage for uploaded files
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── FileUpload.tsx      # Drag and drop upload
│       │   ├── CertificateSelector.tsx  # Certificate type picker
│       │   ├── ExtractedData.tsx   # Show extracted figures
│       │   ├── CertificatePreview.tsx   # Preview before download
│       │   └── ValidationPanel.tsx # Show validation results
│       ├── pages/
│       │   ├── Home.tsx
│       │   └── Generate.tsx
│       ├── api/
│       │   └── client.ts           # Axios API client
│       └── types/
│           └── index.ts            # TypeScript types
│
└── README.md
```

---

## CORE FEATURES TO BUILD

### Feature 1 — File Upload & Processing
- Accept PDF and Excel (.xlsx, .xls) files
- Max file size: 10MB
- Show upload progress
- Validate file type before processing
- Store uploaded file temporarily with unique UUID filename
- Return file_id for subsequent API calls

### Feature 2 — PII Redaction Layer (CRITICAL)
Build a redaction service that runs BEFORE any Claude API call.
This is a key privacy feature — must be highlighted in demo.

Redact these patterns from extracted text:
- PAN number: regex `[A-Z]{5}[0-9]{4}[A-Z]{1}` → replace with `[PAN_REDACTED]`
- Aadhaar: regex `\d{4}\s?\d{4}\s?\d{4}` → replace with `[AADHAAR_REDACTED]`
- Mobile: regex `(\+91|0)?[6-9]\d{9}` → replace with `[MOBILE_REDACTED]`
- Email: standard email regex → replace with `[EMAIL_REDACTED]`
- GSTIN: regex `\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}` → replace with `[GSTIN_REDACTED]`

The redaction must:
- Store a mapping of token → original value locally
- Never send original PII to Claude API
- Restore original values in final certificate output

### Feature 3 — AI Financial Data Extraction
Use Claude API (claude-sonnet-4-5) to extract financial figures.

**For PDF files:**
- Use PyMuPDF to extract text first
- If text extraction fails (scanned PDF), convert page to image and send to Claude vision
- Send redacted text/image to Claude with structured extraction prompt

**For Excel files:**
- Use openpyxl to read all sheets
- Convert to structured text representation
- Send to Claude for extraction

**Claude extraction prompt must ask for:**
```
Extract the following financial figures in JSON format:
{
  "share_capital": {"value": float, "source_line": "string"},
  "reserves_surplus": {"value": float, "source_line": "string"},
  "accumulated_losses": {"value": float, "source_line": "string"},
  "total_assets": {"value": float, "source_line": "string"},
  "total_liabilities": {"value": float, "source_line": "string"},
  "net_worth": {"value": float, "source_line": "string"},
  "turnover": {"value": float, "source_line": "string"},
  "net_profit": {"value": float, "source_line": "string"},
  "financial_year": "string",
  "company_name": "string (may be [REDACTED])",
  "currency": "INR",
  "confidence_score": float (0-1),
  "extraction_notes": "string"
}
Always include source_line showing exactly where each figure was found.
If a value is not found, return null for that field.
Never hallucinate values — only extract what is clearly visible.
```

### Feature 4 — Validation Engine
After extraction, validate:
- Net Worth = Share Capital + Reserves - Accumulated Losses (tolerance ±1%)
- Total Assets = Total Liabilities (Balance Sheet equation)
- Flag any inconsistencies with clear messages
- Show confidence score from Claude
- Mark each figure as VERIFIED ✅ or NEEDS_REVIEW ⚠️

### Feature 5 — Certificate Generation (3 Types)

#### 5a. Net Worth Certificate
Standard ICAI format containing:
- Certificate heading
- Client name (restored from redaction map)
- Financial year
- Net Worth computation table:
  - Share Capital: ₹X
  - Add: Reserves & Surplus: ₹X
  - Less: Accumulated Losses: ₹X
  - **Net Worth: ₹X**
- Source document reference
- CA firm details placeholder
- Date
- Signature block

#### 5b. Turnover Certificate
Standard format containing:
- Certificate heading
- Client name
- Financial year
- Turnover figure with period
- Basis (Audited/Provisional)
- CA firm details
- Signature block

#### 5c. Form 15CB (Basic Structure)
- Certificate of Accountant as per Income Tax Act
- Remittance details section
- Tax liability computation
- CA declaration
- Note: Mark complex fields as [TO BE FILLED BY CA]

**Output formats:**
- Generate both PDF and DOCX versions
- PDF: Use reportlab with professional formatting
- DOCX: Use python-docx with proper styles
- Clean neutral professional color scheme (navy blue and white)
- Certificate number: Auto-generated (CERT-YYYY-MM-XXXX)

### Feature 6 — Citation Trail
Every certificate must include a footer section:
```
AI EXTRACTION TRAIL
-------------------
Share Capital: ₹10,00,000 — Extracted from "Schedule 1 - Share Capital, Line 3"
Reserves: ₹45,00,000 — Extracted from "Balance Sheet, Reserves & Surplus row"
[etc.]
Processed by: Certify Genie | Powered by Anthropic Claude
Privacy: All PII redacted before AI processing | Data not stored after session
```

---

## API ENDPOINTS TO BUILD

```
POST /api/upload
  - Body: multipart/form-data with file
  - Returns: {file_id, filename, file_type, size}

POST /api/extract/{file_id}
  - Body: {certificate_type: "net_worth" | "turnover" | "form_15cb"}
  - Returns: {extracted_data, validation_results, redaction_summary}

POST /api/generate/{file_id}
  - Body: {certificate_type, ca_details: {name, firm, membership_no, address}}
  - Returns: {certificate_id, download_url_pdf, download_url_docx}

GET /api/download/{certificate_id}/{format}
  - format: "pdf" | "docx"
  - Returns: File download

GET /api/health
  - Returns: {status: "ok", version: "1.0.0"}
```

---

## FRONTEND SCREENS TO BUILD

### Screen 1 — Home / Landing
- Certify Genie branding (navy blue and white)
- Hero section: "Upload Financials. Get Certificates. In Seconds."
- Three certificate type cards: Net Worth | Turnover | Form 15CB
- Privacy badge: "🔒 PII Redacted Before AI Processing"
- "Start Generating" CTA button

### Screen 2 — Generate Certificate
Step-by-step wizard with 4 steps:

**Step 1 — Upload**
- Drag and drop zone accepting PDF / Excel
- File type and size validation
- Upload progress bar
- Show: "✅ File uploaded securely"

**Step 2 — Select & Extract**
- Certificate type selector (3 options with descriptions)
- "Extract with AI" button
- Loading state: "🤖 AI Reading Your Document..."
- Show redaction notice: "PAN, Aadhaar, Mobile numbers redacted before processing"

**Step 3 — Review Extracted Data**
- Table showing all extracted figures
- Source citations for each figure
- Validation status badges (✅ VERIFIED / ⚠️ REVIEW)
- Confidence score progress bar
- Editable fields — CA can override any extracted value
- CA Details form: Name, Firm Name, Membership No, Address, Date

**Step 4 — Download Certificate**
- Certificate preview (rendered HTML version)
- "Download PDF" and "Download DOCX" buttons
- Citation trail shown below preview
- "Generate New Certificate" button
- Share/copy certificate number

---

## ENVIRONMENT VARIABLES

Create `.env` file:
```
ANTHROPIC_API_KEY=your_key_here
CLAUDE_MODEL=claude-sonnet-4-5
MAX_FILE_SIZE_MB=10
UPLOAD_DIR=./uploads
OUTPUT_DIR=./outputs
CORS_ORIGINS=http://localhost:5173
APP_ENV=development
```

---

## ERROR HANDLING REQUIREMENTS

Handle these cases gracefully with user-friendly messages:

1. **Scanned PDF with no text layer**
   - Fallback: Convert to image → send to Claude vision
   - Message: "Scanned document detected — using AI vision mode"

2. **Low confidence extraction (< 0.7)**
   - Flag fields in yellow
   - Message: "Some figures need manual verification"
   - Allow CA to edit before generating

3. **Balance sheet doesn't balance**
   - Show specific mismatch
   - Message: "Assets ≠ Liabilities — please verify source document"

4. **Claude API timeout or error**
   - Retry once automatically
   - If fails: "AI service temporarily unavailable — please retry"

5. **Unsupported file format**
   - Clear message listing accepted formats

6. **File too large**
   - Message: "File exceeds 10MB limit — please compress and retry"

---

## SECURITY REQUIREMENTS

1. Never log or store PAN, Aadhaar, or mobile numbers
2. Uploaded files deleted after 1 hour (implement cleanup job)
3. Generated certificates deleted after 24 hours
4. No client financial data stored in any database
5. CORS restricted to frontend origin only
6. File type validation both by extension AND mime type
7. Filename sanitization before storage

---

## DEMO SCENARIO (for Hackathon)

Build with this exact demo flow in mind:

1. CA opens the app
2. Drags a sample Balance Sheet PDF (provide a sample in /samples folder)
3. Selects "Net Worth Certificate"
4. Clicks "Extract with AI"
5. Screen shows redaction happening: "3 PAN numbers redacted ✅"
6. Extracted figures appear in 5-8 seconds
7. Validation shows: "Balance Sheet verified ✅ — Assets = Liabilities"
8. CA enters their name and membership number
9. Clicks "Generate Certificate"
10. Downloads professional PDF certificate
11. Citation trail shows exactly where each number came from

---

## SAMPLE DATA TO CREATE

Create these sample files in `/samples` folder:

### sample_balance_sheet.py
Write a Python script that generates a sample Balance Sheet PDF
using reportlab with realistic Indian company data:
- Company: "M/s ABC Traders Private Limited"
- FY: 2024-25
- Share Capital: ₹25,00,000
- Reserves: ₹48,50,000
- Accumulated Losses: ₹3,20,000
- Net Worth: ₹70,30,000
- Total Assets: ₹1,85,40,000
- Include PAN: AABCT1234D (to demonstrate redaction)

---

## BRANDING

- Product name: **Certify Genie**
- Tagline: **"Your AI-Powered Certificate Assistant for CA Firms"**
- Primary color: #1E3A5F (navy blue)
- Secondary color: #FFFFFF (white)
- Accent color: #2ECC71 (green — for verified/success states)
- Font: Inter (Google Fonts)
- Logo text: "Certify Genie"
- No external brand references

Certificate footer must include:
"Generated by Certify Genie | Powered by Anthropic Claude AI"

---

## BUILD ORDER (Follow This Sequence)

**Phase 1 — Backend Foundation (Start Here)**
1. Create project structure and virtual environment
2. Install all dependencies (requirements.txt)
3. Build FastAPI app with health check
4. Implement file upload endpoint
5. Implement PDF extraction (PyMuPDF)
6. Implement Excel extraction (openpyxl)
7. Build redaction service with regex patterns
8. Integrate Claude API for extraction
9. Build validation engine
10. Build certificate generator (Net Worth first)
11. Add PDF and DOCX output
12. Test all endpoints with Postman/curl

**Phase 2 — Frontend**
1. Create Vite + React + TypeScript project
2. Configure Tailwind + shadcn/ui
3. Build Home screen with branding
4. Build file upload component
5. Build certificate type selector
6. Build extraction results view
7. Build CA details form
8. Build certificate preview and download
9. Connect all API calls
10. Add loading states and error handling

**Phase 3 — Polish for Demo**
1. Create sample Balance Sheet PDF
2. Test complete end-to-end flow
3. Add demo mode with pre-loaded sample
4. Verify citation trail is clear and impressive
5. Test on localhost with actual Tally-exported PDF

---

## SPECIFIC CLAUDE API INTEGRATION NOTES

Use the Anthropic Python SDK:
```python
import anthropic

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# For text-based extraction
response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=2000,
    messages=[{
        "role": "user",
        "content": f"Extract financial data from this document:\n\n{redacted_text}\n\nReturn valid JSON only."
    }]
)

# For image/scanned PDF extraction
response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=2000,
    messages=[{
        "role": "user",
        "content": [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": base64_image_string
                }
            },
            {
                "type": "text",
                "text": "Extract all financial figures from this Balance Sheet. Return JSON only."
            }
        ]
    }]
)
```

Always:
- Parse Claude response as JSON (strip markdown code fences if present)
- Handle JSON parse errors gracefully
- Log token usage for cost monitoring
- Use prompt caching for the system prompt (saves 90% on repeated calls)

---

## WHAT TO BUILD FIRST — SINGLE COMMAND

When I give you this PRP, start by saying:
"Starting Certify Genie build. Creating project structure..."

Then immediately:
1. Create the full folder structure
2. Create requirements.txt with all dependencies
3. Create .env.example
4. Build main.py with FastAPI app
5. Build the redaction service first (most important)
6. Build Claude integration service
7. Build one complete endpoint: /api/extract
8. Test it works before moving to frontend

Do not ask clarifying questions — make reasonable decisions and build.
If something is ambiguous, choose the simpler implementation and note it.

---

## SUCCESS CRITERIA

The demo is successful when:
- [ ] CA can upload a PDF Balance Sheet
- [ ] System shows "PII Redacted" confirmation
- [ ] Figures extracted in under 10 seconds
- [ ] Validation shows Balance Sheet equation verified
- [ ] Net Worth Certificate downloads as professional PDF
- [ ] Citation trail shows source for every figure
- [ ] Zero hallucinated figures (all traceable to source)

---

*PRP Version: 1.0 | Project: Certify Genie | Built for ICAI AI Hackathon Season 5*
*Stack: FastAPI + React + Claude API*
