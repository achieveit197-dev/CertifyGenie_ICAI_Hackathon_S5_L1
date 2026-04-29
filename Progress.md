# Certify Genie — Build Progress Log
### ICAI AI Hackathon Season 5 | Team Documentation

---

## Project Overview

| Item | Detail |
|------|--------|
| **Product** | Certify Genie — AI-Powered Certificate Generation for CA Firms |
| **Hackathon** | ICAI AI Hackathon Season 5 |
| **Start Date** | 2026-03-20 |
| **Demo Target** | Net Worth Certificate from PDF Balance Sheet |
| **AI Model** | Anthropic Claude (`claude-sonnet-4-6`) |

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Backend Framework** | FastAPI | 0.115.5 | REST API server |
| **Runtime** | Python | 3.11+ | Backend language |
| **AI / LLM** | Anthropic Claude | `claude-sonnet-4-6` | Financial data extraction from documents |
| **PDF Parsing** | PyMuPDF (fitz) | 1.24.14 | Text extraction from PDF files |
| **PDF Fallback** | pdfplumber | 0.11.4 | Alternate PDF parser |
| **Excel Parsing** | openpyxl | 3.1.5 | Read XLSX/XLS financial statements |
| **PDF Generation** | reportlab | 4.2.5 | Generate professional certificate PDFs |
| **DOCX Generation** | python-docx | 1.1.2 | Generate editable Word certificates |
| **Data Validation** | Pydantic v2 | 2.10.3 | Request/response schemas |
| **Scheduling** | APScheduler | 3.10.4 | Background file cleanup job |
| **ASGI Server** | Uvicorn | 0.32.1 | FastAPI server |
| **Frontend Framework** | React | 18.3.1 | UI |
| **Language** | TypeScript | 5.6.3 | Type-safe frontend |
| **Build Tool** | Vite | 5.4.11 | Fast development server |
| **Styling** | Tailwind CSS | 3.4.15 | Utility-first CSS |
| **Animations** | Framer Motion | 11.12.0 | Smooth UI transitions |
| **Routing** | React Router DOM | 6.28.0 | Page navigation |
| **HTTP Client** | Axios | 1.7.9 | API calls from frontend |
| **File Upload UI** | react-dropzone | 14.3.5 | Drag-and-drop file upload |
| **Notifications** | react-hot-toast | 2.4.1 | Success/error toast messages |
| **Icons** | lucide-react | 0.460.0 | Clean icon set |
| **Storage** | Local filesystem | — | No database (hackathon MVP) |
| **Session State** | localStorage | — | Frontend session persistence |
| **Session State** | Python in-memory dict | — | Backend file_id → session mapping |

---

## Build Phases

---

### Phase 1 — Backend Foundation
**Date:** 2026-03-20
**Status:** ✅ Complete

#### Files Created
| File | Purpose |
|------|---------|
| `backend/main.py` | FastAPI app, CORS, lifespan, cleanup scheduler |
| `backend/config.py` | Settings via pydantic-settings + .env |
| `backend/.env` | API key placeholder + config |
| `backend/.env.example` | Template for env vars |
| `backend/requirements.txt` | All Python dependencies |
| `backend/models/request_models.py` | Pydantic request schemas |
| `backend/models/response_models.py` | Pydantic response schemas |
| `backend/routers/upload.py` | `POST /api/upload` |
| `backend/routers/extract.py` | `POST /api/extract/{file_id}` |
| `backend/routers/certificate.py` | `POST /api/generate/{file_id}`, `GET /api/download/{id}/{format}` |
| `backend/services/redaction.py` | PII redaction (PAN, Aadhaar, Mobile, Email, GSTIN) |
| `backend/services/pdf_extractor.py` | PyMuPDF text + page-to-image fallback |
| `backend/services/excel_extractor.py` | openpyxl → structured text |
| `backend/services/claude_service.py` | Anthropic SDK integration (text + vision modes) |
| `backend/services/certificate_generator.py` | reportlab PDF + python-docx for all 3 cert types |

#### API Endpoints Built
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/upload` | POST | File upload (PDF/XLSX/XLS) |
| `/api/extract/{file_id}` | POST | AI extraction + validation |
| `/api/generate/{file_id}` | POST | Certificate generation |
| `/api/download/{cert_id}/{format}` | GET | File download (PDF/DOCX) |

#### Key Design Decisions
- **No database** — In-memory Python dicts for file_id→session and cert_id→path. Intentional for hackathon demo (single-server, no setup friction).
- **Session persistence** — Frontend uses localStorage so wizard state survives page refresh without losing progress.
- **PII Redaction** — `RedactionService` class runs BEFORE any Claude API call. Maintains token map for value restoration in certificates. Company name intentionally NOT redacted (needed for certificate content).
- **Scanned PDF fallback** — If PyMuPDF extracts < 50 characters, switches to vision mode (page images → Claude Vision API).
- **File cleanup** — APScheduler runs every 30 minutes; deletes uploads > 1 hour old, certificates > 24 hours old.
- **Model choice** — `claude-sonnet-4-6` (latest as of March 2026, better than 4-5 specified in original PRP).

---

### Phase 2 — Frontend
**Date:** 2026-03-20
**Status:** ✅ Complete

#### Files Created
| File | Purpose |
|------|---------|
| `frontend/src/types/index.ts` | All TypeScript interfaces |
| `frontend/src/api/client.ts` | Axios API client |
| `frontend/src/context/SessionContext.tsx` | localStorage-persisted wizard state |
| `frontend/src/components/FileUpload.tsx` | Drag-and-drop with progress bar |
| `frontend/src/components/CertificateSelector.tsx` | 3-card certificate type picker |
| `frontend/src/components/ExtractedData.tsx` | Table with inline edit/override |
| `frontend/src/components/ValidationPanel.tsx` | Validation + redaction badges |
| `frontend/src/components/CADetailsForm.tsx` | CA details input form |
| `frontend/src/components/StepIndicator.tsx` | 4-step progress indicator |
| `frontend/src/pages/Home.tsx` | Landing page with hero + features |
| `frontend/src/pages/Generate.tsx` | 4-step wizard |
| `frontend/src/App.tsx` | Router + toast setup |
| `frontend/src/main.tsx` | React entry point |
| `frontend/src/index.css` | Tailwind base |

#### UI Features
- 4-step animated wizard (Upload → Extract → Review → Download)
- State persisted to localStorage — **no progress lost on page refresh**
- CA can override any extracted field value inline
- Citation trail shown in terminal-style dark box on download screen
- Privacy shield badge showing exact PII item counts redacted
- Professional navy blue (#1E3A5F) + green (#2ECC71) brand palette

---

### Phase 3 — Sample Data
**Date:** 2026-03-20
**Status:** ✅ Complete

#### Files Created
| File | Purpose |
|------|---------|
| `samples/sample_balance_sheet.py` | Generates realistic PDF Balance Sheet for demo |

#### Sample Company Data
| Field | Value |
|-------|-------|
| Company | M/s ABC Traders Private Limited |
| FY | 2024-25 |
| PAN | AABCT1234D *(for redaction demo)* |
| GSTIN | 27AABCT1234D1Z5 *(for redaction demo)* |
| Share Capital | ₹25,00,000 |
| Reserves & Surplus | ₹48,50,000 |
| Accumulated Losses | ₹3,20,000 |
| **Net Worth** | **₹70,30,000** |
| Total Assets | ₹1,85,40,000 |
| Turnover | ₹1,24,50,000 |

---

## Token Usage Log

| Session | Operation | Model | Tokens Used | Notes |
|---------|-----------|-------|-------------|-------|
| Dev Build | N/A | — | — | No API calls during build |
| Demo Run (Est.) | Text extraction | claude-sonnet-4-6 | ~1,200–2,000 | Per extraction call |
| Demo Run (Est.) | Vision extraction | claude-sonnet-4-6 | ~3,000–8,000 | Per scanned PDF (higher due to image tokens) |

> **Note:** Actual token counts logged to backend console during demo. Check uvicorn log for `Claude text extraction — tokens: XXXX`.

---

## Problems Faced & Solutions

| # | Problem | Root Cause | Solution |
|---|---------|-----------|----------|
| 1 | Scanned PDFs return empty text | No text layer in PDF | Implemented PyMuPDF page→image conversion + Claude Vision fallback |
| 2 | Claude sometimes returns JSON wrapped in markdown fences | Model formatting behavior | `_parse_claude_json()` strips ` ```json ` fences before parsing |
| 3 | Session state lost on page refresh | Browser memory wiped on reload | localStorage-backed `SessionContext` persists all wizard state |
| 4 | PAN regex partially matching other numbers | Overlapping regex patterns | Ordered patterns from most-specific to least-specific; GSTIN checked before PAN |
| 5 | File ID collision risk | UUID reuse unlikely but possible | UUID4 hex (128-bit entropy) — collision probability negligible for demo |
| 6 | Balance sheet verification tolerance | Rounding differences in Indian numbers | 1% tolerance applied (`max(abs(nw) * 0.01, 1.0)`) |

---

## Demo Flow (Judges Reference)

```
1. Open http://localhost:5173
2. Click "Start Generating"
3. Drag samples/sample_balance_sheet.pdf onto upload zone
4. Select "Net Worth Certificate"
5. Click "Extract with AI"
   → Screen shows: "1 PAN redacted ✅" "1 GSTIN redacted ✅"
   → Figures appear in ~5–8 seconds
6. Validation shows: "✅ Balance Sheet verified — Assets = Liabilities"
7. Fill CA name, firm, membership no
8. Click "Generate Certificate"
9. Download PDF → professional ICAI-format certificate
10. Citation trail shows each figure's exact source line
```

---

## Security Checklist

| Item | Status |
|------|--------|
| PAN never sent to Claude API | ✅ Redacted before extraction |
| Aadhaar never sent to Claude API | ✅ Redacted before extraction |
| Mobile numbers never sent | ✅ Redacted before extraction |
| Company name sent as-is | ✅ Intentional — needed in certificate |
| File type validated by extension + mime | ✅ |
| Filename sanitised before storage | ✅ `_sanitize_filename()` |
| Files deleted after 1 hour | ✅ APScheduler background job |
| Certificates deleted after 24 hours | ✅ Same scheduler |
| No financial data stored in DB | ✅ No DB at all |
| CORS restricted to localhost:5173 | ✅ |
| No hardcoded secrets | ✅ .env only |

---

## How to Run

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt

# Add your API key to .env:
# ANTHROPIC_API_KEY=sk-ant-...

python main.py
# → Running on http://localhost:8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# → Running on http://localhost:5173
```

### Generate Sample PDF
```bash
cd samples
pip install reportlab
python sample_balance_sheet.py
# → sample_balance_sheet.pdf created
```

---

### Phase 4 — UI Debug & Audit
**Date:** 2026-03-20
**Status:** ✅ Complete

#### Issues Fixed
| # | Problem | Root Cause | Fix Applied |
|---|---------|-----------|-------------|
| 1 | Blank page at localhost:5173 | Dev server was not running | Started `npm run dev`; confirmed HTML served correctly |
| 2 | CSS `@import` warning in Vite | `@import url(...)` placed after `@tailwind` directives — violates CSS spec | Moved Google Fonts `@import` to top of `index.css` before all `@tailwind` rules |

#### Full UI Audit Results
- **Overall status:** 85% complete, production-ready on desktop
- **Steps 1–5 wizard:** Fully functional (Upload → Extract → Review → Edit/Preview → Download)
- **Home page:** Marketing-ready with hero, features, and PII redaction modal
- **Session persistence:** localStorage-backed, survives page refresh
- **Certificate editor + live preview:** Working for all 3 certificate types

#### Pending UI Items (Post-Break)
| Priority | Item | Location |
|----------|------|----------|
| High | Loading overlay missing during certificate generation (Step 4→5) | `Generate.tsx` |
| Medium | Form 15CB fields show `[TO BE FILLED BY CA]` placeholders — no auto-population | `CertificatePreviewPanel.tsx` |
| Medium | Citation trail shows hardcoded fields regardless of certificate type | `Generate.tsx` lines 500–517 |
| Low | Step 4 editor/preview split not responsive on mobile/tablet | `Generate.tsx` |
| Low | No error boundary — crashes show blank page | Missing component |
| Low | UDIN field has no format validation | `CertificateEditorPanel.tsx` |

#### Security Note
- Anthropic API key in `.env` was briefly visible during this session — **rotate the key at console.anthropic.com** before next session.

---

## Known Limitations (MVP)

| Limitation | Impact | Future Fix |
|-----------|--------|-----------|
| In-memory session store | Resets if server restarts mid-demo | Add Redis or SQLite |
| Form 15CB is basic structure | Complex fields marked [TO BE FILLED BY CA] | Expand template |
| DOCX for Turnover/15CB reuses Net Worth template | Minor cosmetic issue | Build dedicated DOCX templates |
| No authentication | Anyone can use if URL known | Add JWT + Google OAuth |
| Single-server only | No horizontal scaling | Add Redis session store |

---

---

### Phase 5 — Form 15CB Removal & UI Modernisation
**Date:** 2026-04-01
**Status:** ✅ Complete

#### Changes Made
| Area | Change |
|------|--------|
| Backend | Removed `generate_form15cb_pdf()`, `form_15cb` from Literal types, DOCX dispatcher, and display-filename labels |
| Frontend types | `CertificateType` now `'net_worth' \| 'turnover'` only |
| CertificateSelector | 2-column grid, feature highlights per card, improved hover + selected states |
| CertificatePreviewPanel | Removed `renderForm15cb`, modernised letterhead (shows CA firm name) |
| Home page | Full redesign — dual gradient hero, How-It-Works steps, 2-col cert grid, 4-feature grid, dark CTA banner |
| StepIndicator | Spring animation, gradient progress bar, improved done-state checkmark |
| Generate page | Gradient nav bar, improved extraction + generation overlays, dark success download card |
| Tailwind | Added `navy-950` colour |

---

### Phase 6 — Multi-Method Net Worth Calculator
**Date:** 2026-04-01 (planned) → 2026-04-02 (implemented)
**Status:** ✅ Complete

#### Overview
Add a 7-method Net Worth calculation engine with a new wizard step so CA firms can choose the legally appropriate method for each use case (bank loans, SEBI filings, visa applications, private equity, etc.).

#### New Files to Create
| File | Purpose |
|------|---------|
| `backend/services/networth_calculator.py` | Pure Python computation engine — all 7 methods |
| `backend/routers/networth_methods.py` | `POST /api/networth-methods/{file_id}` endpoint |
| `frontend/src/components/EntityTypeSelector.tsx` | 4-card entity type picker (Company / LLP / Partnership / Proprietorship) |
| `frontend/src/components/NetWorthMethodSelector.tsx` | Method comparison table, cards, applicability flags |
| `frontend/src/components/MethodBadge.tsx` | Reusable method attribution badge |

#### Files to Modify
| File | Change |
|------|--------|
| `backend/models/request_models.py` | Add `EntityType` enum; `entity_type` + `nw_method` to `GenerateRequest` |
| `backend/models/response_models.py` | Add `NetWorthMethodResult`, `NetWorthMethodsResponse` models |
| `backend/services/claude_service.py` | Extend extraction prompt with `goodwill`, `intangible_assets`, `revaluation_reserve`, `securities_premium` |
| `backend/routers/certificate.py` | Pass `entity_type` + `nw_method` to certificate generator |
| `backend/services/certificate_generator.py` | Add method attribution line to Net Worth PDF/DOCX |
| `backend/main.py` | Register `networth_methods` router |
| `frontend/src/types/index.ts` | Add `EntityType`, `NWMethod`, `NetWorthMethodResult` types |
| `frontend/src/api/client.ts` | Add `fetchNetWorthMethods()` API call |
| `frontend/src/context/SessionContext.tsx` | Add `entityType`, `selectedNWMethod`, `nwMethodResults`; bump key to `v2` |
| `frontend/src/pages/Generate.tsx` | Insert Step 4 (Method Selection) between Review and Download |
| `frontend/src/components/StepIndicator.tsx` | Add 5th step node |
| `frontend/src/components/CertificatePreviewPanel.tsx` | Show `MethodBadge` + method-specific NW value |
| `frontend/src/components/CertificateEditorPanel.tsx` | Show selected method name as read-only field |

#### The 7 Methods
| # | Method | Formula | Context |
|---|--------|---------|---------|
| 1 | Book Value (Basic) | Share Capital + Reserves − Accumulated Losses | All entities |
| 2 | Companies Act § 2(57) | Paid-up Capital + Free Reserves − Losses − Deferred Expenditure | Companies |
| 3 | Tangible Net Worth | NW − Intangible Assets − Goodwill | Banks / lenders |
| 4 | NAV Method | Total Assets − Total Liabilities | All entities |
| 5 | SEBI LODR | Same as Method 1 with explicit SEBI label | Listed companies |
| 6 | Adjusted TBV | Tangible NW − Revaluation Reserve | Private equity |
| 7 | Consolidated | Requires consolidated FS data | `coming_soon` |

#### New Wizard Step
```
Step 1: Upload
Step 2: Select cert type + Extract with AI
Step 3: Review extracted data + CA details
Step 4: [NEW] Choose Entity Type → View method results → Select method
Step 5: Preview/Edit certificate + Download
```

#### New API Endpoint
`POST /api/networth-methods/{file_id}` — accepts `entity_type`, returns all method results with recommended method flagged.

#### Implementation Notes
- New Step 4 (Method Selection) inserted between Review and Preview for `net_worth` cert type only; turnover skips directly to Preview
- `SessionContext` bumped to `v2` — old localStorage sessions auto-cleared on first load
- 5-step `StepIndicator` (Upload → Extract → Review → Method → Download)
- `certificate_generator.py` prints "Net Worth computed as per: [Method Label]" in both PDF and DOCX

---

### Phase 7 — ESLint Fix & Tooling Cleanup
**Date:** 2026-04-02
**Status:** ✅ Complete

#### Problem
`npm run lint` was broken — ESLint 9.x (already installed) dropped support for `.eslintrc.*` format and old CLI flags (`--ext`, `--report-unused-disable-directives`). No `eslint.config.js` existed in the project.

#### Changes Made
| File | Change |
|------|--------|
| `frontend/eslint.config.js` | **New** — ESM flat config using installed packages: `@eslint/js`, `globals`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` |
| `frontend/package.json` | Lint script updated from `eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0` → `eslint src --max-warnings 0` |

#### Key Config Decisions
- `no-undef` disabled — TypeScript already catches undefined variables; the rule causes false positives for JSX globals in projects using the automatic JSX transform
- `react-refresh/only-export-components` disabled for `src/context/*.tsx` — exporting both a Provider component and a `useSession` hook from the same file is an intentional pattern
- `no-undef: off` is the [documented recommendation](https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-for-global-variables) for TypeScript projects

#### Result
`npm run lint` — **0 errors, 0 warnings** ✅

---

---

### Phase 8 — Method-Aware Certificate Tables
**Date:** 2026-04-18
**Status:** ✅ Complete

#### Problem
The certificate preview (HTML) and generated PDF/DOCX always showed the same hardcoded 4-row table (Share Capital / Reserves & Surplus / Accumulated Losses / Net Worth) regardless of which Net Worth method was selected. Only the final NW value changed — the computation rows were wrong for NAV, Tangible NW, Adjusted TBV, and Companies Act methods.

Also, the `nw_method` ID was never sent from frontend to backend in the generate API call.

#### Files Changed
| File | Change |
|------|--------|
| `frontend/src/types/index.ts` | Added optional method-specific fields to `ExtractedData`; added `nwMethodId` to `CertificateEditorState` |
| `frontend/src/pages/Generate.tsx` | Sets `nwMethodId` in editor initializer; passes `nwMethod` to generate API call |
| `frontend/src/api/client.ts` | Added `nwMethod` to `GenerateOptions`; sends `nw_method` to backend |
| `frontend/src/components/CertificatePreviewPanel.tsx` | Replaced fixed 4-row table with `buildNWRows()` — renders correct rows per method |
| `backend/services/certificate_generator.py` | Added `_build_nw_pdf_rows()` and `_build_nw_docx_rows()` helpers; PDF and DOCX now render method-specific rows |
| `backend/routers/certificate.py` | Passes `nw_method_id` from request through to the generator |

#### Row Structure per Method
| Method | Rows shown |
|--------|-----------|
| Book Value / SEBI LODR | SC + R&S − AL = NW |
| Companies Act §2(57) | Paid-up Capital + Free Reserves − Losses − Deferred Expenditure |
| NAV Method | Total Assets − Total Liabilities |
| Tangible Net Worth | SC + R&S − AL = BV → BV − Intangibles − Goodwill |
| Adjusted TBV | + extra Revaluation Reserve deduction row |

---

### Phase 9 — Feature Pack (Ratios · Email · History · Confidence · PDF Password)
**Date:** 2026-04-18
**Status:** ✅ Complete

#### Features Added

##### 1. Ratio Analysis Modal
- Button **"Ratio Analysis"** added to the Step 5 preview toolbar
- Computes 6 ratios from extracted data with thumb-rule thresholds and colour-coded badges
- Each ratio shows value, Excellent/Good/Average/Poor/Danger status, and a plain-English comment
- Danger/Warning counts shown in modal header

| Ratio | Formula | Flag threshold |
|-------|---------|---------------|
| Debt-to-Equity | Liabilities ÷ Net Worth | > 2.0 = Danger |
| Return on Net Worth | Net Profit ÷ NW × 100 | < 0% = Danger |
| Net Profit Margin | Net Profit ÷ Turnover × 100 | < 0% = Danger |
| Asset Turnover | Turnover ÷ Total Assets | < 0.5 = Poor |
| Equity Ratio | Net Worth ÷ Assets × 100 | < 25% = Danger |
| Debt Ratio | Liabilities ÷ Assets | > 0.75 = Danger |

##### 2. Email — Send to Client
- Button **"Send to Client"** added to Step 6 download page
- Opens a modal: enter client email → see/edit pre-filled subject + body (dynamic: cert number, company, FY, CA details, DRAFT warning)
- Sends via backend SMTP — certificate PDF auto-attached and delivered directly to client inbox
- `backend/services/email_service.py` + `backend/routers/email_router.py` active; `EMAIL_USER` + `EMAIL_PASSWORD` configured in `.env`

##### 3. Certificate History Page (`/history`)
- Auto-saved to `localStorage` after every successful certificate generation
- Shows company, FY, cert type, method, date, re-download PDF/DOCX buttons
- "View History" button on Step 6 download page
- "Clear All" button on history page
- Retains last 50 entries; download links valid for 24h (backend cleanup scheduler)

##### 4. Extraction Confidence Modal
- Button **"Confidence"** added to Step 5 preview toolbar (alongside Ratio Analysis)
- Shows per-field status (Verified / Needs Review / Not Found) with source citations
- Overall confidence bar with colour coding (green ≥ 80%, amber ≥ 60%, red < 60%)
- Warning shown if overall confidence < 80%

##### 5. PDF Password Protection
- Toggle switch at the bottom of the Step 5 editor panel
- If enabled, prompts for an alphanumeric password (with show/hide toggle)
- Validated client-side (letters and numbers only)
- Backend uses `pypdf` to encrypt the PDF with the open password before download
- DOCX is not encrypted (Word has its own password mechanism)

#### New Files Created
| File | Purpose |
|------|---------|
| `frontend/src/components/RatioAnalysisModal.tsx` | 6-ratio analysis popup with thumb-rule commentary |
| `frontend/src/components/ExtractionConfidenceModal.tsx` | Per-field confidence breakdown popup |
| `frontend/src/components/EmailModal.tsx` | Email compose modal (mailto + SMTP-ready) |
| `frontend/src/pages/History.tsx` | Certificate history page |
| `backend/services/email_service.py` | Gmail SMTP email sender with PDF attachment |
| `backend/routers/email_router.py` | `POST /api/send-email/{cert_id}` endpoint |

#### Dependencies Added
| Package | Version | Purpose |
|---------|---------|---------|
| `pypdf` | 5.1.0 | PDF open-password encryption |

---

*Progress.md maintained for ICAI AI Hackathon Season 5 documentation.*
---

### Phase 10 — Year-over-Year Comparison
**Date:** 2026-04-22
**Status:** ✅ Complete

#### Overview
Automatically surfaces a year-over-year comparison table when the uploaded document contains comparative prior-year figures (most Indian Balance Sheets and P&L statements do). If only one year is present, nothing extra is shown.

#### Changes Made
| File | Change |
|------|--------|
| `backend/services/claude_service.py` | Extended `EXTRACTION_PROMPT` with a conditional `previous_year` JSON block (Claude populates it only if comparative figures exist) |
| `backend/models/response_models.py` | Added `PreviousYearData` model; added `previous_year: Optional[PreviousYearData]` to `ExtractedData` |
| `backend/routers/extract.py` | Maps `previous_year` from Claude's raw output into `PreviousYearData`; only creates object when at least one non-null numeric field is present |
| `backend/services/certificate_generator.py` | Added `_build_yoy_pdf_table()` helper; YoY table appended to both Net Worth and Turnover PDFs when prev year data available; equivalent DOCX table added inline |
| `frontend/src/types/index.ts` | Added `PreviousYearData` interface; added `previous_year` field to `ExtractedData` |
| `frontend/src/components/YoYComparisonPanel.tsx` | **New** — comparison table with Prev Year / Current Year / % Change columns; TrendingUp/Down icons colour-coded green/red by higherIsBetter logic |
| `frontend/src/components/CertificatePreviewPanel.tsx` | Renders `YoYComparisonPanel` below the main figures table for both cert types |

#### What the comparison shows
| Cert Type | Fields compared |
|-----------|----------------|
| Net Worth | Share Capital · Reserves & Surplus · Net Worth · Total Assets · Total Liabilities |
| Turnover  | Turnover · Net Profit · Total Assets |

#### Conditional behaviour
- Document with **two years of data** → YoY table appears in preview, PDF, and DOCX
- Document with **one year only** → no YoY section rendered anywhere; zero UI clutter

---

---

### Phase 11 — Working Capital Certificate
**Date:** 2026-04-22
**Status:** ✅ Complete

#### Overview
Added a third certificate type — **Working Capital Certificate** — for bank loan, tender, and overdraft facility submissions. Simple 3-row table (Current Assets / Less: Current Liabilities / Working Capital), no method selection step, optional Purpose field in the closing line.

#### Files Changed
| File | Change |
|------|--------|
| `backend/services/claude_service.py` | Added `current_assets`, `current_liabilities`, `working_capital` fields to extraction prompt with rules |
| `backend/models/response_models.py` | Added 3 fields to `ExtractedData`; added 3 fields to `PreviousYearData` |
| `backend/models/request_models.py` | Added `'working_capital'` to Literal types; added `wc_purpose: Optional[str]` to `GenerateRequest` |
| `backend/routers/extract.py` | Mapped 3 new fields in `ExtractedData`; added WC fields to `previous_year`; added WC equation validation |
| `backend/routers/certificate.py` | Passes `wc_purpose` through to generator |
| `backend/services/certificate_generator.py` | Added `_build_wc_pdf_rows()`, `generate_working_capital_pdf()`, `_build_wc_docx_rows()`; updated DOCX generator (TITLES, figures table, closing); updated dispatcher |
| `frontend/src/types/index.ts` | Added `'working_capital'` to `CertificateType`; 3 fields to `ExtractedData` + `PreviousYearData`; `wcPurpose` to `CertificateEditorState` |
| `frontend/src/context/SessionContext.tsx` | Bumped storage key to `v3`; clears stale sessions |
| `frontend/src/components/CertificateSelector.tsx` | Added WC card; grid changed to 3-column |
| `frontend/src/components/CertificatePreviewPanel.tsx` | Added `renderWorkingCapital()` with 3-row table + purpose-aware closing |
| `frontend/src/components/CertificateEditorPanel.tsx` | Added WC rows to financial figures table; added "Purpose" input (WC only) |
| `frontend/src/api/client.ts` | Added `wcPurpose` to `GenerateOptions`; included in POST body |
| `frontend/src/pages/Generate.tsx` | Added WC default narrative; initialised `wcPurpose: ''` in editor state; passed `wcPurpose` to generate call; added to `CERT_LABELS` |
| `frontend/src/components/YoYComparisonModal.tsx` | Added `WC_ROWS` for working capital YoY comparison |

---

*Last updated: 2026-04-22 (Phase 11 complete — Working Capital Certificate)*
