import jsPDF from 'jspdf';
import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import {
  Document, Packer, Paragraph, TextRun, ImageRun, PageOrientation,
} from 'docx';
import ExcelJS from 'exceljs';
import pptxgenjs from 'pptxgenjs';

export interface ConvertResult {
  blob: Blob;
  filename: string;
  mimeType: string;
  preview?: string;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  const buf = await file.arrayBuffer();
  return buf.slice(0);
}

async function fileToText(file: File): Promise<string> {
  return await file.text();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function loadPdfjs(): Promise<any> {
  const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/build/pdf.worker.min.mjs`;
  return pdfjs;
}

async function loadTesseract(): Promise<any> {
  return await import('tesseract.js');
}

async function renderPdfPageToPng(pdf: any, pageNumber: number, scale = 2): Promise<{ dataUrl: string; width: number; height: number; widthPt: number; heightPt: number }> {
  const page = await pdf.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Could not create PDF rendering canvas');
  await page.render({ canvasContext: ctx, viewport, background: '#ffffff' }).promise;
  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
    widthPt: baseViewport.width,
    heightPt: baseViewport.height,
  };
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}


async function serverConvert(
  file: File,
  operation: string,
  server: string,
  fields: Record<string, string> = {}
): Promise<ConvertResult> {
  let baseUrl = server.trim().replace(/\/+$/, '');

  // Accept either the API root or a URL that already ends in /convert.
  // This prevents accidental requests to /convert/convert.
  baseUrl = baseUrl.replace(/\/convert$/i, '');

  if (!/^https?:\/\//i.test(baseUrl)) {
    throw new Error(
      'Invalid VITE_CONVERTER_API_URL. It must point to your QuadraConverter FastAPI conversion server.'
    );
  }

  const form =
    new FormData();

  form.append(
    'file',
    file,
    file.name
  );

  form.append(
    'operation',
    operation
  );

  Object.entries(fields).forEach(
    ([key, value]) => {
      form.append(key, value);
    }
  );

  const controller =
    new AbortController();

  const timeout =
    window.setTimeout(
      () => controller.abort(),
      10 * 60 * 1000
    );

  let response: Response;

  try {
    response =
      await fetch(
        `${baseUrl}/convert`,
        {
          method: 'POST',
          body: form,
          signal:
            controller.signal,
        }
      );
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === 'AbortError'
    ) {
      throw new Error(
        'The conversion server timed out. Please try a smaller file.'
      );
    }

    throw new Error(
      'Cannot connect to the QuadraConverter conversion server. Check VITE_CONVERTER_API_URL and make sure the conversion server is running.'
    );
  } finally {
    window.clearTimeout(
      timeout
    );
  }

  if (!response.ok) {
    let message =
      `Conversion server returned HTTP ${response.status}.`;

    try {
      const payload =
        await response.json();

      message =
        payload?.detail ||
        payload?.error ||
        message;
    } catch {
      // Non-JSON error.
    }

    throw new Error(message);
  }
  const blob =
    await response.blob();

  if (!blob.size) {
    throw new Error(
      'The conversion server returned an empty file.'
    );
  }

  const disposition =
    response.headers.get(
      'content-disposition'
    ) || '';

  const match = disposition.match(
    /filename\*=UTF-8''([^;]+)|filename=\"?([^\";]+)\"?/i
  );

  let filename =
    response.headers.get('x-converted-filename') ||
    match?.[1] ||
    match?.[2] ||
    '';

  if (filename) {
    try {
      filename = decodeURIComponent(filename);
    } catch {
      // Keep the raw header value when it is not valid URI encoding.
    }
  }

  if (!filename) {
    const extensionMap: Record<string, string> = {
      'office-to-pdf': '.pdf',
      'html-to-pdf': '.pdf',
      'pdf-to-word': '.docx',
      'pdf-to-pptx': '.pptx',
      'pdf-to-xlsx': '.xlsx',
      'pdf-to-pdfa': '.pdf',
      'pdf-unlock': '.pdf',
      'pdf-protect': '.pdf',
      'pdf-translate': '.pdf',
    };
    filename = file.name.replace(/\.[^.]+$/, '') + (extensionMap[operation] || '.bin');
  }

  if (!filename) {
    const extensions: Record<string, string> = {
      'office-to-pdf': '.pdf',
      'html-to-pdf': '.pdf',
      'pdf-to-word': '.docx',
      'pdf-to-pptx': '.pptx',
      'pdf-to-xlsx': '.xlsx',
      'pdf-to-pdfa': '.pdf',
      'pdf-unlock': '.pdf',
      'pdf-protect': '.pdf',
      'pdf-translate': '.pdf',
    };
    filename = file.name.replace(/\.[^.]+$/, '') + (extensions[operation] || '.bin');
  }

  return {
    blob,
    filename,
    mimeType:
      blob.type ||
      'application/octet-stream',
  };
}
// ─── Merge PDFs ───
export async function mergePDFs(files: File[]): Promise<ConvertResult> {
  const merged = await PDFDocument.create();
  for (const file of files) {
    const src = await PDFDocument.load(await fileToArrayBuffer(file));
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  const bytes = await merged.save();
  return { blob: new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }), filename: 'merged.pdf', mimeType: 'application/pdf' };
}

// ─── Split PDF ───
export async function splitPDF(file: File, splitPoints = ''): Promise<ConvertResult[]> {
  const src = await PDFDocument.load(await fileToArrayBuffer(file));
  const total = src.getPageCount();
  const points = splitPoints.trim()
    ? [...new Set(splitPoints.split(',').map((v) => parseInt(v.trim(), 10)).filter((n) => Number.isInteger(n) && n >= 1 && n < total))].sort((a, b) => a - b)
    : Array.from({ length: Math.max(0, total - 1) }, (_, i) => i + 1);

  const ranges: Array<[number, number]> = [];
  let start = 1;
  for (const point of points) {
    ranges.push([start, point]);
    start = point + 1;
  }
  if (start <= total) ranges.push([start, total]);

  const results: ConvertResult[] = [];
  for (let index = 0; index < ranges.length; index++) {
    const [from, to] = ranges[index];
    const out = await PDFDocument.create();
    const copied = await out.copyPages(src, Array.from({ length: to - from + 1 }, (_, j) => from - 1 + j));
    copied.forEach((page) => out.addPage(page));
    const bytes = await out.save();
    results.push({
      blob: new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }),
      filename: `part_${index + 1}_${from}-${to}.pdf`,
      mimeType: 'application/pdf'
    });
  }
  return results;
}


// ─── Remove Pages ───
export async function removePages(file: File, pageRange: string): Promise<ConvertResult> {
  const src = await PDFDocument.load(await fileToArrayBuffer(file));
  const pagesToRemove = parsePageRange(pageRange, src.getPageCount());
  const out = await PDFDocument.create();
  for (let i = 0; i < src.getPageCount(); i++) {
    if (!pagesToRemove.includes(i)) {
      const [page] = await out.copyPages(src, [i]);
      out.addPage(page);
    }
  }
  const bytes = await out.save();
  return { blob: new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }), filename: 'pages_removed.pdf', mimeType: 'application/pdf' };
}

// ─── Extract Pages ───
export async function extractPages(file: File, pageRange: string): Promise<ConvertResult> {
  const src = await PDFDocument.load(await fileToArrayBuffer(file));
  const pagesToExtract = parsePageRange(pageRange, src.getPageCount());
  const out = await PDFDocument.create();
  for (const idx of pagesToExtract) {
    const [page] = await out.copyPages(src, [idx]);
    out.addPage(page);
  }
  const bytes = await out.save();
  return { blob: new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }), filename: 'extracted_pages.pdf', mimeType: 'application/pdf' };
}

// ─── Organize PDF (reorder pages) ───
export async function organizePDF(file: File, pageOrder: string): Promise<ConvertResult> {
  const src = await PDFDocument.load(await fileToArrayBuffer(file));
  const order = pageOrder.split(',').map((s) => parseInt(s.trim(), 10) - 1).filter((n) => n >= 0 && n < src.getPageCount());
  const out = await PDFDocument.create();
  for (const idx of order) {
    const [page] = await out.copyPages(src, [idx]);
    out.addPage(page);
  }
  const bytes = await out.save();
  return { blob: new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }), filename: 'organized.pdf', mimeType: 'application/pdf' };
}

// ─── Scan to PDF (images → PDF) ───
export async function scanToPDF(files: File[]): Promise<ConvertResult> {
  const pdf = new jsPDF();
  for (let i = 0; i < files.length; i++) {
    const img = await loadImage(files[i]);
    const imgData = getImageData(img);
    if (i > 0) pdf.addPage();
    const w = pdf.internal.pageSize.getWidth();
    const h = pdf.internal.pageSize.getHeight();
    const ratio = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    pdf.addImage(imgData, 'JPEG', (w - img.naturalWidth * ratio) / 2, (h - img.naturalHeight * ratio) / 2, img.naturalWidth * ratio, img.naturalHeight * ratio);
  }
  return { blob: pdf.output('blob'), filename: 'scanned.pdf', mimeType: 'application/pdf' };
}

// ─── Optimize PDF ───
export async function optimizePDF(file: File): Promise<ConvertResult> {
  const src = await PDFDocument.load(await fileToArrayBuffer(file));
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, src.getPageIndices());
  pages.forEach((p) => out.addPage(p));
  const bytes = await out.save({ useObjectStreams: true });
  return { blob: new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }), filename: 'optimized.pdf', mimeType: 'application/pdf' };
}

// ─── Compress PDF ───
export async function compressPDF(file: File, quality: number): Promise<ConvertResult> {
  const pdfjsLib = await loadPdfjs();
  const data = await fileToArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const outPdf = new jsPDF();
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const imgData = canvas.toDataURL('image/jpeg', quality / 100);
    if (i > 1) outPdf.addPage();
    outPdf.addImage(imgData, 'JPEG', 0, 0, outPdf.internal.pageSize.getWidth(), outPdf.internal.pageSize.getHeight());
  }
  return { blob: outPdf.output('blob'), filename: 'compressed.pdf', mimeType: 'application/pdf' };
}

// ─── Repair PDF ───
export async function repairPDF(file: File): Promise<ConvertResult> {
  const src = await PDFDocument.load(await fileToArrayBuffer(file), { ignoreEncryption: true });
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, src.getPageIndices());
  pages.forEach((p) => out.addPage(p));
  const bytes = await out.save();
  return { blob: new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }), filename: 'repaired.pdf', mimeType: 'application/pdf' };
}

// ─── OCR PDF (extract text using Tesseract) ───
export async function ocrPDF(file: File, language: string): Promise<ConvertResult> {
  const pdfjsLib = await loadPdfjs();

  const data = await fileToArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const { createWorker } = await loadTesseract();
  const worker = await createWorker(language);
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const { data: result } = await worker.recognize(canvas);
    fullText += `--- Page ${i} ---\n${result.text}\n\n`;
  }
  await worker.terminate();
  return { blob: new Blob([fullText], { type: 'text/plain' }), filename: 'ocr_result.txt', mimeType: 'text/plain' };
}

// ─── Convert to PDF (generic file → PDF) ───
export async function convertToPDF(file: File): Promise<ConvertResult> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp' || ext === 'bmp') {
    return scanToPDF([file]);
  }
  if (ext === 'txt' || ext === 'md') {
    const text = await fileToText(file);
    const pdf = new jsPDF();
    pdf.setFontSize(11);
    const lines = pdf.splitTextToSize(text, 180);
    let y = 20;
    const pageHeight = pdf.internal.pageSize.getHeight();
    for (const line of lines) {
      if (y > pageHeight - 20) { pdf.addPage(); y = 20; }
      pdf.text(line, 15, y);
      y += 7;
    }
    return { blob: pdf.output('blob'), filename: 'converted.pdf', mimeType: 'application/pdf' };
  }
  if (ext === 'doc' || ext === 'docx') {
    return wordToPDF(file);
  }
  if (ext === 'html' || ext === 'htm') {
    return htmlToPDFFile(file);
  }
  if (ext === 'xls' || ext === 'xlsx') {
    return excelToPDF(file);
  }
  if (ext === 'ppt' || ext === 'pptx') {
    return pptxToPDF(file);
  }
  throw new Error(`Unsupported file type: .${ext}`);
}

// ─── JPG to PDF ───
export async function jpgToPDF(files: File[]): Promise<ConvertResult> {
  return scanToPDF(files);
}

// ─── WORD to PDF ───
export async function wordToPDF(file: File): Promise<ConvertResult> {
  const server = import.meta.env.VITE_CONVERTER_API_URL;
  if (!server) throw new Error('Word → PDF requires the QuadraConverter conversion server. Set VITE_CONVERTER_API_URL and deploy server/.');
  return serverConvert(file, 'office-to-pdf', server);
}

export async function pptxToPDF(file: File): Promise<ConvertResult> {
  const server = import.meta.env.VITE_CONVERTER_API_URL;
  if (server) return serverConvert(file, 'office-to-pdf', server);
  throw new Error('Exact PowerPoint-to-PDF conversion requires the QuadraConverter conversion server. Set VITE_CONVERTER_API_URL.');
}

// ─── EXCEL to PDF ───
export async function excelToPDF(file: File): Promise<ConvertResult> {
  const server = import.meta.env.VITE_CONVERTER_API_URL;
  if (!server) throw new Error('Excel → PDF requires the QuadraConverter conversion server. Set VITE_CONVERTER_API_URL and deploy server/.');
  return serverConvert(file, 'office-to-pdf', server);
}

export async function htmlToPDFFile(file: File): Promise<ConvertResult> {
  const server = import.meta.env.VITE_CONVERTER_API_URL;
  if (!server) throw new Error('HTML file → PDF requires the QuadraConverter conversion server for layout-faithful rendering. Set VITE_CONVERTER_API_URL and deploy server/.');
  return serverConvert(file, 'html-to-pdf', server);
}

export async function pdfToJPG(file: File, quality: number, pageRange?: string): Promise<ConvertResult[]> {
  const pdfjsLib = await loadPdfjs();

  const data = await fileToArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  let pagesToConvert: number[] = [];
  if (!pageRange || pageRange.trim().toLowerCase() === 'all') {
    pagesToConvert = Array.from({ length: pdf.numPages }, (_, i) => i + 1);
  } else {
    const pages = new Set<number>();
    for (const part of pageRange.split(',').map((s) => s.trim())) {
      const m = part.match(/^(\d+)-(\d+)$/);
      if (m) {
        const a = parseInt(m[1]); const b = parseInt(m[2]);
        for (let p = Math.min(a, b); p <= Math.max(a, b); p++) {
          if (p >= 1 && p <= pdf.numPages) pages.add(p);
        }
      } else {
        const p = parseInt(part);
        if (p >= 1 && p <= pdf.numPages) pages.add(p);
      }
    }
    pagesToConvert = Array.from(pages).sort((a, b) => a - b);
  }
  if (pagesToConvert.length === 0) throw new Error('No valid pages in range');
  const results: ConvertResult[] = [];
  for (const i of pagesToConvert) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', quality / 100));
    results.push({ blob, filename: `page_${i}.jpg`, mimeType: 'image/jpeg', preview: canvas.toDataURL('image/jpeg', 0.5) });
  }
  return results;
}

// ─── PDF to WORD / POWERPOINT / EXCEL ───
export async function pdfToWord(
  file: File
): Promise<ConvertResult> {
  const server =
    import.meta.env
      .VITE_CONVERTER_API_URL;

  if (!server) {
    throw new Error(
      'PDF → Word requires VITE_CONVERTER_API_URL.'
    );
  }

  return serverConvert(
    file,
    'pdf-to-word',
    server,
    {
      language: 'eng',
    }
  );
}
export async function pdfToPPTX(file: File): Promise<ConvertResult> { const server=import.meta.env.VITE_CONVERTER_API_URL; if(!server) throw new Error('PDF → PowerPoint requires the conversion server.'); return serverConvert(file,'pdf-to-pptx',server); }

export async function pdfToExcel(
  file: File
): Promise<ConvertResult> {
  const server =
    import.meta.env
      .VITE_CONVERTER_API_URL;

  if (!server) {
    throw new Error(
      'PDF → Excel requires VITE_CONVERTER_API_URL.'
    );
  }

  return serverConvert(
    file,
    'pdf-to-xlsx',
    server,
    {
      language: 'eng',
    }
  );
}
// ─── PDF to PDF/A (basic) ───
export async function pdfToPDFA(file: File): Promise<ConvertResult> {
  const server = import.meta.env.VITE_CONVERTER_API_URL;
  if (!server) throw new Error('PDF/A conversion requires the QuadraConverter conversion server. Set VITE_CONVERTER_API_URL and deploy server/.');
  return serverConvert(file, 'pdf-to-pdfa', server);
}

export async function rotatePDF(file: File, rotationDegrees: number): Promise<ConvertResult> {
  const src = await PDFDocument.load(await fileToArrayBuffer(file));
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, src.getPageIndices());
  pages.forEach((p) => {
    const current = p.getRotation().angle;
    p.setRotation(degrees(current + rotationDegrees) as any);
    out.addPage(p);
  });
  const bytes = await out.save();
  return { blob: new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }), filename: 'rotated.pdf', mimeType: 'application/pdf' };
}

// ─── Add Page Numbers ───
export async function addPageNumbers(file: File, position: string): Promise<ConvertResult> {
  const src = await PDFDocument.load(await fileToArrayBuffer(file));
  const font = await src.embedFont(StandardFonts.Helvetica);
  const pages = src.getPages();
  const total = pages.length;
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const text = `${i + 1} / ${total}`;
    const w = font.widthOfTextAtSize(text, 10);
    const h = page.getHeight();
    const wd = page.getWidth();
    let x = 30, y = 20;
    if (position === 'center') x = (wd - w) / 2;
    else if (position === 'right') x = wd - w - 30;
    if (position === 'top') y = h - 20;
    page.drawText(text, { x, y, size: 10, font, color: rgb(0, 0, 0) });
  }
  const bytes = await src.save();
  return { blob: new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }), filename: 'numbered.pdf', mimeType: 'application/pdf' };
}

// ─── Add Watermark ───
export async function addWatermark(file: File, text: string, opacity: number): Promise<ConvertResult> {
  const src = await PDFDocument.load(await fileToArrayBuffer(file));
  const font = await src.embedFont(StandardFonts.HelveticaBold);
  const pages = src.getPages();
  pages.forEach((page) => {
    const { width, height } = page.getSize();
    const size = 50;
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (width - w) / 2,
      y: height / 2,
      size,
      font,
      color: rgb(0.7, 0.7, 0.7),
      opacity: opacity / 100,
      rotate: degrees(45),
    });
  });
  const bytes = await src.save();
  return { blob: new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }), filename: 'watermarked.pdf', mimeType: 'application/pdf' };
}

// ─── Crop PDF (set media box) ───
export async function cropPDF(file: File, margin: number): Promise<ConvertResult> {
  const src = await PDFDocument.load(await fileToArrayBuffer(file));
  const pages = src.getPages();
  pages.forEach((page) => {
    const { width, height } = page.getSize();
    page.setCropBox(margin, margin, width - margin * 2, height - margin * 2);
  });
  const bytes = await src.save();
  return { blob: new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }), filename: 'cropped.pdf', mimeType: 'application/pdf' };
}

// ─── Unlock PDF ───
export async function unlockPDF(file: File, password: string): Promise<ConvertResult> {
  const server = import.meta.env.VITE_CONVERTER_API_URL;
  if (!server) throw new Error('Unlock PDF requires the QuadraConverter conversion server (qpdf). Set VITE_CONVERTER_API_URL.');
  return serverConvert(file, 'pdf-unlock', server, { password });
}

export async function protectPDF(file: File, password: string): Promise<ConvertResult> {
  const server = import.meta.env.VITE_CONVERTER_API_URL;
  if (!server) throw new Error('Protect PDF requires the QuadraConverter conversion server (qpdf). Set VITE_CONVERTER_API_URL.');
  return serverConvert(file, 'pdf-protect', server, { password });
}

export async function signPDF(file: File, name: string): Promise<ConvertResult> {
  const src = await PDFDocument.load(await fileToArrayBuffer(file));
  const font = await src.embedFont(StandardFonts.HelveticaBold);
  const pages = src.getPages();
  const lastPage = pages[pages.length - 1];
  const { width } = lastPage.getSize();
  lastPage.drawText(`Signed by: ${name}`, {
    x: width - 200, y: 30, size: 12, font, color: rgb(0, 0, 0),
  });
  const now = new Date().toLocaleDateString();
  lastPage.drawText(`Date: ${now}`, { x: width - 200, y: 15, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
  const bytes = await src.save();
  return { blob: new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }), filename: 'signed.pdf', mimeType: 'application/pdf' };
}

// ─── Redact PDF (black out text) ───
export async function redactPDF(file: File, searchText: string): Promise<ConvertResult> {
  const pdfjsLib = await loadPdfjs();

  const data1 = await fileToArrayBuffer(file);
  const data2 = await fileToArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data: data1 }).promise;
  const src = await PDFDocument.load(data2);
  const pages = src.getPages();
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const pdfjsPage = await pdf.getPage(i + 1);
    const content = await pdfjsPage.getTextContent();
    for (const item of content.items as any[]) {
      if (item.str && item.str.toLowerCase().includes(searchText.toLowerCase())) {
        page.drawRectangle({
          x: item.transform[4] - 2, y: page.getSize().height - item.transform[5] - item.height,
          width: item.width + 4, height: item.height + 2,
          color: rgb(0, 0, 0),
        });
      }
    }
  }
  const bytes = await src.save();
  return { blob: new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }), filename: 'redacted.pdf', mimeType: 'application/pdf' };
}

// ─── Compare PDF ───
export async function comparePDF(file: File, file2: File): Promise<ConvertResult> {
  const pdfjsLib = await loadPdfjs();

  const [data1, data2] = await Promise.all([fileToArrayBuffer(file), fileToArrayBuffer(file2)]);
  const [pdf1, pdf2] = await Promise.all([
    pdfjsLib.getDocument({ data: data1.slice(0) }).promise,
    pdfjsLib.getDocument({ data: data2.slice(0) }).promise,
  ]);
  let report = 'PDF Comparison Report\n=====================\n\n';
  report += `File 1: ${file.name} (${pdf1.numPages} pages)\n`;
  report += `File 2: ${file2.name} (${pdf2.numPages} pages)\n\n`;
  const maxPages = Math.max(pdf1.numPages, pdf2.numPages);
  let differences = 0;
  for (let i = 1; i <= maxPages; i++) {
    let text1 = '', text2 = '';
    if (i <= pdf1.numPages) {
      const content = await (await pdf1.getPage(i)).getTextContent();
      text1 = content.items.map((item: any) => item.str).join(' ');
    }
    if (i <= pdf2.numPages) {
      const content = await (await pdf2.getPage(i)).getTextContent();
      text2 = content.items.map((item: any) => item.str).join(' ');
    }
    if (text1 !== text2) {
      differences++;
      report += `Page ${i}: DIFFERENT\n  File 1: ${text1.substring(0, 200)}\n  File 2: ${text2.substring(0, 200)}\n\n`;
    } else {
      report += `Page ${i}: Identical\n`;
    }
  }
  report += `\nTotal differences: ${differences} out of ${maxPages} pages\n`;
  return { blob: new Blob([report], { type: 'text/plain' }), filename: 'comparison_report.txt', mimeType: 'text/plain' };
}

// ─── AI Summarizer (extractive) ───
export async function summarizePDF(file: File, ratio: number): Promise<ConvertResult> {
  const pdfjsLib = await loadPdfjs();

  const data = await fileToArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map((item: any) => item.str).join(' ') + ' ';
  }
  const sentences = fullText.match(/[^.!?]+[.!?]+/g) || [fullText];
  const wordFreq: Record<string, number> = {};
  fullText.toLowerCase().split(/\s+/).forEach((w) => {
    const word = w.replace(/[^a-z]/g, '');
    if (word.length > 3) wordFreq[word] = (wordFreq[word] || 0) + 1;
  });
  const scored = sentences.map((s) => {
    const words = s.toLowerCase().split(/\s+/);
    let score = 0;
    words.forEach((w) => { score += wordFreq[w.replace(/[^a-z]/g, '')] || 0; });
    return { sentence: s, score: score / words.length };
  });
  scored.sort((a, b) => b.score - a.score);
  const keepCount = Math.max(1, Math.floor(sentences.length * ratio / 100));
  const topSentences = scored.slice(0, keepCount).map((s) => s.sentence);
  const summary = topSentences.join(' ');
  return { blob: new Blob([summary], { type: 'text/plain' }), filename: 'summary.txt', mimeType: 'text/plain' };
}

// ─── Translate PDF (basic word replacement) ───
export async function translatePDF(file: File, targetLang: string): Promise<ConvertResult> {
  const server = import.meta.env.VITE_CONVERTER_API_URL;
  if (!server) throw new Error('PDF translation requires a translation-enabled QuadraConverter backend. Configure TRANSLATION_API_URL on the server.');
  return serverConvert(file, 'pdf-translate', server, { targetLang });
}

export async function pdfToMarkdown(file: File): Promise<ConvertResult> {
  const pdfjsLib = await loadPdfjs();

  const data = await fileToArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  let markdown = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    markdown += `## Page ${i}\n\n`;
    let lastY: number | null = null;
    for (const item of content.items as any[]) {
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 5) {
        markdown += '\n';
      }
      markdown += item.str + ' ';
      lastY = y;
    }
    markdown += '\n\n---\n\n';
  }
  return { blob: new Blob([markdown], { type: 'text/markdown' }), filename: 'converted.md', mimeType: 'text/markdown' };
}

// ─── PDF Forms (flatten) ───
export async function flattenPDF(file: File): Promise<ConvertResult> {
  const pdfjsLib = await loadPdfjs();

  const data = await fileToArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const outPdf = new jsPDF();
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const imgData = canvas.toDataURL('image/jpeg', 0.8);
    if (i > 1) outPdf.addPage();
    outPdf.addImage(imgData, 'JPEG', 0, 0, outPdf.internal.pageSize.getWidth(), outPdf.internal.pageSize.getHeight());
  }
  return { blob: outPdf.output('blob'), filename: 'flattened.pdf', mimeType: 'application/pdf' };
}

// ─── Helpers ───
function parsePageRange(range: string, total: number): number[] {
  const result: number[] = [];
  for (const part of range.split(',')) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map((n) => parseInt(n, 10));
      for (let i = start; i <= end && i <= total; i++) {
        if (i >= 1) result.push(i - 1);
      }
    } else {
      const n = parseInt(trimmed, 10);
      if (n >= 1 && n <= total) result.push(n - 1);
    }
  }
  return [...new Set(result)];
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function getImageData(img: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.85);
}
