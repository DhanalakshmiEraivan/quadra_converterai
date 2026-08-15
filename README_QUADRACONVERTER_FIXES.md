# QuadraConverter — fixes in this build

## 1. QR-only UPI payments

Razorpay and the old payment API are removed. The payment flow is:

1. User chooses Starter / Pro / Business.
2. QuadraConverter generates a UPI QR for the exact plan amount.
3. User pays with Google Pay, PhonePe or another UPI app.
4. User enters the UTR/transaction ID.
5. The request appears immediately in the Admin → Payments tab.
6. Admin verifies the UTR and approves the request.
7. Supabase activates the subscription immediately and the user's dashboard/usage state updates through realtime.

A QR-only integration cannot independently prove that money reached a bank account without a bank/UPI payment verification API. This build therefore uses UTR + admin verification rather than pretending QR scanning itself is an automatic payment webhook.

## 2. Fixed 5-credit problem

The old frontend depended on `get_usage_status`, `can_use_conversion` and `consume_conversion` RPCs that were not present in the supplied database migration. The new migration adds them and makes usage server-authoritative.

Free users receive **5 conversions per day**. A paid active subscription is unlimited. A conversion credit is reserved atomically before conversion and refunded automatically if the conversion fails.

Run the new Supabase migration:

`supabase/migrations/20260815180000_fix_usage_and_upi_payments.sql`

## 3. Fixed Office/PDF conversions

Browser-only PDF → Word/PPT/Excel implementations have been replaced with server conversion engines:

- DOC/DOCX → PDF: LibreOffice
- PPT/PPTX → PDF: LibreOffice
- XLS/XLSX → PDF: LibreOffice
- PDF → DOCX: PyMuPDF + python-docx
- PDF → PPTX: PyMuPDF + python-pptx
- PDF → XLSX: pdfplumber + PyMuPDF + openpyxl

The server builds a new target file from the source document's structures instead of renaming extensions or putting every PDF page into a fake Office file. Scanned PDFs need OCR for best editable text extraction.

## 4. Tools

The supplied tool catalog audits to **90 tools**, with all engine dispatch cases and converter exports accounted for by `scripts/audit-tools.mjs`. Tool cards now expose detailed descriptions and the Tools page includes advanced workflow capabilities.

## 5. Start

Frontend:

`npm install`

`npm run dev`

Conversion server:

`pip install -r server/requirements.txt`

`uvicorn server.converter_api:app --host 0.0.0.0 --port 8000`

Frontend `.env` should contain:

`VITE_CONVERTER_API_URL=http://localhost:8000`

Do not put your Supabase service-role key in the frontend. The existing `VITE_SUPABASE_ANON_KEY` is intended for the browser.
