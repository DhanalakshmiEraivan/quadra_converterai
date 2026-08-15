// Real conversion engines — all run client-side using browser APIs + libraries
import jsPDF from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import QRCode from 'qrcode';

export interface ConvertResult {
  blob: Blob;
  filename: string;
  mimeType: string;
  preview?: string;
}

// ─── Helpers ───

async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function dataURLToBlob(dataURL: string): Blob {
  const [meta, base64] = dataURL.split(',');
  const mime = meta.match(/:(.*?);/)?.[1] ?? 'application/octet-stream';
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b!), type, quality);
  });
}

// ─── Image Conversions ───

export async function imageToImage(file: File, targetFormat: string): Promise<ConvertResult> {
  const dataURL = await fileToDataURL(file);
  const img = await loadImage(dataURL);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const mimeMap: Record<string, string> = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    webp: 'image/webp',
    bmp: 'image/bmp',
  };
  const mime = mimeMap[targetFormat] ?? 'image/png';
  const blob = targetFormat === 'bmp'
    ? encodeCanvasAsBMP(canvas)
    : await canvasToBlob(canvas, mime, 0.92);
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const preview = canvas.toDataURL('image/jpeg', 0.5);
  return { blob, filename: `${baseName}.${targetFormat}`, mimeType: mime, preview };
}

export async function imageToPDF(file: File): Promise<ConvertResult> {
  const dataURL = await fileToDataURL(file);
  const img = await loadImage(dataURL);
  const isPng = file.type === 'image/png';
  const fmt = isPng ? 'PNG' : 'JPEG';
  const orientation = img.naturalWidth > img.naturalHeight ? 'l' : 'p';
  const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 2;
  const ratio = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
  const w = img.naturalWidth * ratio;
  const h = img.naturalHeight * ratio;
  const x = (pageW - w) / 2;
  const y = (pageH - h) / 2;
  pdf.addImage(dataURL, fmt, x, y, w, h);
  const blob = pdf.output('blob');
  return { blob, filename: file.name.replace(/\.[^.]+$/, '') + '.pdf', mimeType: 'application/pdf' };
}

export interface ImageCompressOptions {
  mode: 'target-size' | 'quality' | 'balanced';
  targetSize: number;
  targetUnit: 'KB' | 'MB';
  quality: number;
  format: 'auto' | 'jpg' | 'webp' | 'png';
  preserveDimensions: boolean;
}

export async function imageCompress(
  file: File,
  options: ImageCompressOptions
): Promise<ConvertResult> {
  const dataURL = await fileToDataURL(file);
  const img = await loadImage(dataURL);

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  let mimeType: string;

  if (options.format === 'webp') {
    mimeType = 'image/webp';
  } else if (options.format === 'png') {
    mimeType = 'image/png';
  } else {
    mimeType = 'image/jpeg';
  }

  const targetBytes =
    options.targetUnit === 'MB'
      ? options.targetSize * 1024 * 1024
      : options.targetSize * 1024;

  let blob: Blob;

  if (options.mode === 'quality') {
    blob = await canvasToBlob(
      canvas,
      mimeType,
      options.quality / 100
    );
  } else if (mimeType === 'image/png') {
    blob = await canvasToBlob(canvas, mimeType, 1);
  } else {
    let low = 0.05;
    let high = Math.max(0.1, options.quality / 100);
    let best: Blob | null = null;

    for (let i = 0; i < 12; i++) {
      const quality = (low + high) / 2;

      const candidate = await canvasToBlob(
        canvas,
        mimeType,
        quality
      );

      if (candidate.size <= targetBytes) {
        best = candidate;
        low = quality;
      } else {
        high = quality;
      }
    }

    blob =
      best ||
      await canvasToBlob(
        canvas,
        mimeType,
        Math.max(0.05, options.quality / 100)
      );
  }

  const extension =
    mimeType === 'image/webp'
      ? 'webp'
      : mimeType === 'image/png'
      ? 'png'
      : 'jpg';

  const baseName = file.name.replace(/\.[^.]+$/, '');

  return {
    blob,
    filename: `${baseName}_compressed.${extension}`,
    mimeType: blob.type,
    preview: canvas.toDataURL('image/jpeg', 0.5)
  };
}



export interface ImageResizeOptions {
  mode: 'dimensions' | 'percentage' | 'long-edge';
  width: number;
  height: number;
  percentage: number;
  longEdge: number;
  fitMode: 'fit' | 'fill' | 'stretch';
  preserveAspectRatio: boolean;
}

export async function imageResize(
  file: File,
  options: ImageResizeOptions
): Promise<ConvertResult> {
  const dataURL = await fileToDataURL(file);
  const img = await loadImage(dataURL);

  const originalWidth = img.naturalWidth;
  const originalHeight = img.naturalHeight;

  let targetWidth = options.width;
  let targetHeight = options.height;

  if (options.mode === 'percentage') {
    const scale = options.percentage / 100;
    targetWidth = Math.max(1, Math.round(originalWidth * scale));
    targetHeight = Math.max(1, Math.round(originalHeight * scale));
  }

  if (options.mode === 'long-edge') {
    const scale = options.longEdge / Math.max(originalWidth, originalHeight);
    targetWidth = Math.max(1, Math.round(originalWidth * scale));
    targetHeight = Math.max(1, Math.round(originalHeight * scale));
  }

  if (
    options.preserveAspectRatio &&
    options.fitMode === 'fit' &&
    options.mode === 'dimensions'
  ) {
    const scale = Math.min(
      targetWidth / originalWidth,
      targetHeight / originalHeight
    );

    targetWidth = Math.max(1, Math.round(originalWidth * scale));
    targetHeight = Math.max(1, Math.round(originalHeight * scale));
  }

  const canvas = document.createElement('canvas');

  if (options.fitMode === 'fill' && options.mode === 'dimensions') {
    canvas.width = options.width;
    canvas.height = options.height;

    const ctx = canvas.getContext('2d')!;

    const srcRatio = originalWidth / originalHeight;
    const dstRatio = options.width / options.height;

    let sx = 0;
    let sy = 0;
    let sw = originalWidth;
    let sh = originalHeight;

    if (srcRatio > dstRatio) {
      sw = originalHeight * dstRatio;
      sx = (originalWidth - sw) / 2;
    } else {
      sh = originalWidth / dstRatio;
      sy = (originalHeight - sh) / 2;
    }

    ctx.drawImage(
      img,
      sx,
      sy,
      sw,
      sh,
      0,
      0,
      options.width,
      options.height
    );
  } else {
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d')!;

    if (options.fitMode === 'stretch') {
      ctx.drawImage(
        img,
        0,
        0,
        targetWidth,
        targetHeight
      );
    } else {
      ctx.drawImage(
        img,
        0,
        0,
        targetWidth,
        targetHeight
      );
    }
  }

  const mimeType =
    file.type === 'image/png'
      ? 'image/png'
      : file.type === 'image/webp'
      ? 'image/webp'
      : 'image/jpeg';

  const blob = await canvasToBlob(
    canvas,
    mimeType,
    0.92
  );

  const baseName = file.name.replace(/\.[^.]+$/, '');

  return {
    blob,
    filename: `${baseName}_${canvas.width}x${canvas.height}.${mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'}`,
    mimeType: blob.type,
    preview: canvas.toDataURL('image/jpeg', 0.5)
  };
}
export interface ImageRotateOptions { degrees: number; direction: 'clockwise' | 'counterclockwise'; expand: boolean; } export async function imageRotate( file: File, options: ImageRotateOptions ): Promise<ConvertResult> { const dataURL = await fileToDataURL(file); const img = await loadImage(dataURL); const degrees = options.direction === 'counterclockwise' ? -options.degrees : options.degrees; const rad = (degrees * Math.PI) / 180; const sin = Math.abs(Math.sin(rad)); const cos = Math.abs(Math.cos(rad)); const width = img.naturalWidth; const height = img.naturalHeight; const canvas = document.createElement('canvas'); if (options.expand) { canvas.width = Math.ceil( width * cos + height * sin ); canvas.height = Math.ceil( width * sin + height * cos ); } else { canvas.width = width; canvas.height = height; } const ctx = canvas.getContext('2d')!; ctx.translate( canvas.width / 2, canvas.height / 2 ); ctx.rotate(rad); ctx.drawImage( img, -width / 2, -height / 2 ); const mimeType = file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg'; const blob = await canvasToBlob( canvas, mimeType, 0.92 ); const baseName = file.name.replace(/\.[^.]+$/, ''); return { blob, filename: `${baseName}_rotated_${Math.round(options.degrees)}.${mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'}`, mimeType: blob.type, preview: canvas.toDataURL('image/jpeg', 0.5) }; }
export async function imageGrayscale(file: File): Promise<ConvertResult> {
  const dataURL = await fileToDataURL(file);
  const img = await loadImage(dataURL);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    d[i] = d[i + 1] = d[i + 2] = gray;
  }
  ctx.putImageData(imageData, 0, 0);
  const blob = await canvasToBlob(canvas, file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.92);
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const preview = canvas.toDataURL('image/jpeg', 0.5);
  return { blob, filename: `${baseName}_grayscale.${file.type === 'image/png' ? 'png' : 'jpg'}`, mimeType: blob.type, preview };
}

export async function imageFlip(file: File, axis: 'h' | 'v'): Promise<ConvertResult> {
  const dataURL = await fileToDataURL(file);
  const img = await loadImage(dataURL);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  if (axis === 'h') {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(0, canvas.height);
    ctx.scale(1, -1);
  }
  ctx.drawImage(img, 0, 0);
  const blob = await canvasToBlob(canvas, file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.92);
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const preview = canvas.toDataURL('image/jpeg', 0.5);
  return { blob, filename: `${baseName}_flipped${axis}.${file.type === 'image/png' ? 'png' : 'jpg'}`, mimeType: blob.type, preview };
}

export async function imageToBase64(file: File): Promise<ConvertResult> {
  const dataURL = await fileToDataURL(file);
  const text = dataURL;
  const blob = new Blob([text], { type: 'text/plain' });
  return { blob, filename: file.name.replace(/\.[^.]+$/, '') + '_base64.txt', mimeType: 'text/plain' };
}

export interface ImageCropSquareOptions { position: 'center' | 'top' | 'bottom' | 'left' | 'right'; size: number; } export async function imageCropToSquare( file: File, options: ImageCropSquareOptions ): Promise<ConvertResult> { const dataURL = await fileToDataURL(file); const img = await loadImage(dataURL); const cropSize = Math.min( img.naturalWidth, img.naturalHeight ); let sx = (img.naturalWidth - cropSize) / 2; let sy = (img.naturalHeight - cropSize) / 2; if (options.position === 'top') { sy = 0; } if (options.position === 'bottom') { sy = img.naturalHeight - cropSize; } if (options.position === 'left') { sx = 0; } if (options.position === 'right') { sx = img.naturalWidth - cropSize; } const outputSize = Math.max( 1, Math.min(options.size, 20000) ); const canvas = document.createElement('canvas'); canvas.width = outputSize; canvas.height = outputSize; const ctx = canvas.getContext('2d')!; ctx.drawImage( img, sx, sy, cropSize, cropSize, 0, 0, outputSize, outputSize ); const mimeType = file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg'; const blob = await canvasToBlob( canvas, mimeType, 0.92 ); const baseName = file.name.replace(/\.[^.]+$/, ''); return { blob, filename: `${baseName}_square_${outputSize}x${outputSize}.${mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'}`, mimeType: blob.type, preview: canvas.toDataURL('image/jpeg', 0.5) }; }
// ─── PDF Conversions ───

function parsePageRange(range: string, totalPages: number): number[] {
  if (!range || range.trim().toLowerCase() === 'all') {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = new Set<number>();
  for (const part of range.split(',').map((s) => s.trim())) {
    const m = part.match(/^(\d+)-(\d+)$/);
    if (m) {
      const a = parseInt(m[1]);
      const b = parseInt(m[2]);
      for (let p = Math.min(a, b); p <= Math.max(a, b); p++) {
        if (p >= 1 && p <= totalPages) pages.add(p);
      }
    } else {
      const p = parseInt(part);
      if (p >= 1 && p <= totalPages) pages.add(p);
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
}

export async function pdfToImages(file: File, pageRange?: string): Promise<ConvertResult[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/build/pdf.worker.min.mjs`;
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = parsePageRange(pageRange || 'all', pdf.numPages);
  if (pages.length === 0) throw new Error('No valid pages in range');
  const results: ConvertResult[] = [];
  for (const i of pages) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92);
    const preview = canvas.toDataURL('image/jpeg', 0.5);
    results.push({
      blob,
      filename: `${file.name.replace(/\.pdf$/, '')}_page${i}.jpg`,
      mimeType: 'image/jpeg',
      preview,
    });
  }
  return results;
}

export async function imagesToPDF(files: File[]): Promise<ConvertResult> {
  const pdf = new jsPDF();
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;
  for (let i = 0; i < files.length; i++) {
    const dataURL = await fileToDataURL(files[i]);
    const img = await loadImage(dataURL);
    const isPng = files[i].type === 'image/png';
    const fmt = isPng ? 'PNG' : 'JPEG';
    if (i > 0) pdf.addPage();
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2;
    const ratio = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
    const w = img.naturalWidth * ratio;
    const h = img.naturalHeight * ratio;
    const x = (pageW - w) / 2;
    const y = (pageH - h) / 2;
    pdf.addImage(dataURL, fmt, x, y, w, h);
  }
  const blob = pdf.output('blob');
  return { blob, filename: 'combined.pdf', mimeType: 'application/pdf' };
}

export async function mergePDFs(files: File[]): Promise<ConvertResult> {
  const merged = await PDFDocument.create();
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  const bytes = await merged.save();
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
  return { blob, filename: 'merged.pdf', mimeType: 'application/pdf' };
}

export async function splitPDF(file: File, splitPoints?: string): Promise<ConvertResult[]> {
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes);
  const pageCount = src.getPageCount();
  const baseName = file.name.replace(/\.pdf$/, '');

  const points = (splitPoints || '')
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0 && n < pageCount)
    .sort((a, b) => a - b);

  const uniquePoints = [...new Set(points)];

  if (uniquePoints.length === 0) {
    const results: ConvertResult[] = [];
    for (let i = 0; i < pageCount; i++) {
      const doc = await PDFDocument.create();
      const [page] = await doc.copyPages(src, [i]);
      doc.addPage(page);
      const out = await doc.save();
      results.push({
        blob: new Blob([out as unknown as BlobPart], { type: 'application/pdf' }),
        filename: `${baseName}_page${i + 1}.pdf`,
        mimeType: 'application/pdf',
      });
    }
    return results;
  }

  const boundaries: number[] = [0, ...uniquePoints, pageCount];
  const results: ConvertResult[] = [];
  for (let s = 0; s < boundaries.length - 1; s++) {
    const start = boundaries[s];
    const end = boundaries[s + 1];
    const doc = await PDFDocument.create();
    const indices: number[] = [];
    for (let i = start; i < end; i++) indices.push(i);
    const pages = await doc.copyPages(src, indices);
    pages.forEach((p) => doc.addPage(p));
    const out = await doc.save();
    results.push({
      blob: new Blob([out as unknown as BlobPart], { type: 'application/pdf' }),
      filename: `${baseName}_pages_${start + 1}-${end}.pdf`,
      mimeType: 'application/pdf',
    });
  }
  return results;
}

export async function textToPDF(text: string, filename: string): Promise<ConvertResult> {
  const pdf = new jsPDF();
  const lines = pdf.splitTextToSize(text, 180);
  let y = 20;
  const pageHeight = pdf.internal.pageSize.height;
  for (const line of lines) {
    if (y > pageHeight - 20) {
      pdf.addPage();
      y = 20;
    }
    pdf.text(line, 15, y);
    y += 7;
  }
  const blob = pdf.output('blob');
  return { blob, filename: filename.replace(/\.[^.]+$/, '') + '.pdf', mimeType: 'application/pdf' };
}

export async function htmlToPDF(html: string, filename: string): Promise<ConvertResult> {
  if (!html.trim()) throw new Error('HTML content is empty.');
  const [{ default: html2canvas }] = await Promise.all([
    import('html2canvas'),
  ]);

  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-100000px';
  wrapper.style.top = '0';
  wrapper.style.width = '794px';
  wrapper.style.background = '#fff';
  wrapper.style.padding = '0';
  wrapper.style.zIndex = '-1';
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);

  try {
    const canvas = await html2canvas(wrapper, {
      backgroundColor: '#ffffff',
      scale: Math.min(2, window.devicePixelRatio || 1),
      useCORS: true,
      allowTaint: false,
      logging: false,
      windowWidth: 794,
    });

    const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: canvas.width > canvas.height ? 'landscape' : 'portrait' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const ratio = pageW / canvas.width;
    const sliceHeightPx = Math.floor(pageH / ratio);
    let offset = 0;
    let pageIndex = 0;

    while (offset < canvas.height) {
      const sliceHeight = Math.min(sliceHeightPx, canvas.height - offset);
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = sliceHeight;
      const ctx = slice.getContext('2d');
      if (!ctx) throw new Error('Could not create HTML rendering canvas.');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, offset, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageW, sliceHeight * ratio);
      offset += sliceHeight;
      pageIndex++;
    }

    return {
      blob: pdf.output('blob'),
      filename: filename.replace(/\.[^.]+$/, '') + '.pdf',
      mimeType: 'application/pdf',
    };
  } finally {
    wrapper.remove();
  }
}


// ─── Text Conversions ───

export async function textCaseConvert(text: string, mode: string): Promise<ConvertResult> {
  let result = text;
  switch (mode) {
    case 'upper': result = text.toUpperCase(); break;
    case 'lower': result = text.toLowerCase(); break;
    case 'title': result = text.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()); break;
    case 'sentence': result = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase(); break;
    case 'camel': result = text.replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()).replace(/^./, (c) => c.toLowerCase()); break;
    case 'snake': result = text.trim().toLowerCase().replace(/\s+/g, '_'); break;
    case 'kebab': result = text.trim().toLowerCase().replace(/\s+/g, '-'); break;
    case 'reverse': result = text.split('').reverse().join(''); break;
  default: result = text;
  }
  const blob = new Blob([result], { type: 'text/plain' });
  return { blob, filename: 'converted.txt', mimeType: 'text/plain' };
}

export async function textToBase64(text: string): Promise<ConvertResult> {
  const encoded = btoa(unescape(encodeURIComponent(text)));
  const blob = new Blob([encoded], { type: 'text/plain' });
  return { blob, filename: 'base64.txt', mimeType: 'text/plain' };
}

export async function base64ToText(b64: string): Promise<ConvertResult> {
  const decoded = decodeURIComponent(escape(atob(b64.trim())));
  const blob = new Blob([decoded], { type: 'text/plain' });
  return { blob, filename: 'decoded.txt', mimeType: 'text/plain' };
}

export async function textToBinary(text: string): Promise<ConvertResult> {
  const binary = text.split('').map((c) => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
  const blob = new Blob([binary], { type: 'text/plain' });
  return { blob, filename: 'binary.txt', mimeType: 'text/plain' };
}

export async function binaryToText(binary: string): Promise<ConvertResult> {
  const text = binary.trim().split(/\s+/).map((b) => String.fromCharCode(parseInt(b, 2))).join('');
  const blob = new Blob([text], { type: 'text/plain' });
  return { blob, filename: 'text.txt', mimeType: 'text/plain' };
}

export async function textToHex(text: string): Promise<ConvertResult> {
  const hex = text.split('').map((c) => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
  const blob = new Blob([hex], { type: 'text/plain' });
  return { blob, filename: 'hex.txt', mimeType: 'text/plain' };
}

export async function hexToText(hex: string): Promise<ConvertResult> {
  const text = hex.trim().split(/\s+/).map((h) => String.fromCharCode(parseInt(h, 16))).join('');
  const blob = new Blob([text], { type: 'text/plain' });
  return { blob, filename: 'text.txt', mimeType: 'text/plain' };
}

export async function textToMorse(text: string): Promise<ConvertResult> {
  const morseMap: Record<string, string> = {
    A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
    I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
    Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
    Y: '-.--', Z: '--..', '0': '-----', '1': '.----', '2': '..---', '3': '...--',
    '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
    ' ': '/',
  };
  const morse = text.toUpperCase().split('').map((c) => morseMap[c] || '').join(' ');
  const blob = new Blob([morse], { type: 'text/plain' });
  return { blob, filename: 'morse.txt', mimeType: 'text/plain' };
}

export async function morseToText(morse: string): Promise<ConvertResult> {
  const reverseMorse: Record<string, string> = {
    '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D', '.': 'E', '..-.': 'F', '--.': 'G',
    '....': 'H', '..': 'I', '.---': 'J', '-.-': 'K', '.-..': 'L', '--': 'M', '-.': 'N',
    '---': 'O', '.--.': 'P', '--.-': 'Q', '.-.': 'R', '...': 'S', '-': 'T', '..-': 'U',
    '...-': 'V', '.--': 'W', '-..-': 'X', '-.--': 'Y', '--..': 'Z', '-----': '0',
    '.----': '1', '..---': '2', '...--': '3', '....-': '4', '.....': '5',
    '-....': '6', '--...': '7', '---..': '8', '----..': '9', '/': ' ',
  };
  const text = morse.trim().split(/\s+/).map((m) => reverseMorse[m] || '').join('');
  const blob = new Blob([text], { type: 'text/plain' });
  return { blob, filename: 'text.txt', mimeType: 'text/plain' };
}

export async function textToLeet(text: string): Promise<ConvertResult> {
  const leetMap: Record<string, string> = {
    a: '4', e: '3', i: '1', o: '0', s: '5', t: '7', l: '1', b: '8', g: '9',
  };
  const leet = text.split('').map((c) => leetMap[c.toLowerCase()] || c).join('');
  const blob = new Blob([leet], { type: 'text/plain' });
  return { blob, filename: 'leet.txt', mimeType: 'text/plain' };
}

export async function textRemoveDuplicates(lines: string): Promise<ConvertResult> {
  const seen = new Set<string>();
  const result = lines.split('\n').filter((line) => {
    if (seen.has(line)) return false;
    seen.add(line);
    return true;
  }).join('\n');
  const blob = new Blob([result], { type: 'text/plain' });
  return { blob, filename: 'unique.txt', mimeType: 'text/plain' };
}

export async function textWordCount(text: string): Promise<ConvertResult> {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const chars = text.length;
  const charsNoSpace = text.replace(/\s/g, '').length;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim()).length;
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
  const lines = text.split('\n').length;
  const report = `Word Count Report\n==================\n\nWords: ${words}\nCharacters: ${chars}\nCharacters (no spaces): ${charsNoSpace}\nSentences: ${sentences}\nParagraphs: ${paragraphs}\nLines: ${lines}\n\nReading time: ~${Math.ceil(words / 200)} min\nSpeaking time: ~${Math.ceil(words / 130)} min`;
  const blob = new Blob([report], { type: 'text/plain' });
  return { blob, filename: 'wordcount.txt', mimeType: 'text/plain' };
}

export async function textFindReplace(text: string, find: string, replace: string): Promise<ConvertResult> {
  const result = text.split(find).join(replace);
  const blob = new Blob([result], { type: 'text/plain' });
  return { blob, filename: 'replaced.txt', mimeType: 'text/plain' };
}

export async function textSortLines(text: string, mode: string): Promise<ConvertResult> {
  let lines = text.split('\n');
  switch (mode) {
    case 'asc': lines.sort(); break;
    case 'desc': lines.sort().reverse(); break;
    case 'length': lines.sort((a, b) => a.length - b.length); break;
    case 'shuffle': lines = lines.sort(() => Math.random() - 0.5); break;
    case 'reverse': lines = lines.reverse(); break;
    default: lines.sort();
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  return { blob, filename: 'sorted.txt', mimeType: 'text/plain' };
}

export async function textTrimLines(text: string): Promise<ConvertResult> {
  const result = text.split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
  const blob = new Blob([result], { type: 'text/plain' });
  return { blob, filename: 'trimmed.txt', mimeType: 'text/plain' };
}

export async function textAddLineNumbers(text: string): Promise<ConvertResult> {
  const result = text.split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n');
  const blob = new Blob([result], { type: 'text/plain' });
  return { blob, filename: 'numbered.txt', mimeType: 'text/plain' };
}

export async function textSlugify(text: string): Promise<ConvertResult> {
  const slug = text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
  const blob = new Blob([slug], { type: 'text/plain' });
  return { blob, filename: 'slug.txt', mimeType: 'text/plain' };
}

export async function textLoremIpsum(paragraphs: number): Promise<ConvertResult> {
  const words = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum'.split(' ');
  const paras: string[] = [];
  for (let p = 0; p < paragraphs; p++) {
    const sentences: string[] = [];
    for (let s = 0; s < 5; s++) {
      const sw: string[] = [];
      for (let w = 0; w < Math.floor(Math.random() * 10) + 8; w++) {
        sw.push(words[Math.floor(Math.random() * words.length)]);
      }
      sentences.push(sw.join(' '));
    }
    paras.push(sentences.join('. ') + '.');
  }
  const blob = new Blob([paras.join('\n\n')], { type: 'text/plain' });
  return { blob, filename: 'lorem.txt', mimeType: 'text/plain' };
}

// ─── JSON / CSV / Dev Tools ───

export async function jsonBeautify(json: string, indent: number): Promise<ConvertResult> {
  const parsed = JSON.parse(json);
  const result = JSON.stringify(parsed, null, indent);
  const blob = new Blob([result], { type: 'application/json' });
  return { blob, filename: 'beautified.json', mimeType: 'application/json' };
}

export async function jsonMinify(json: string): Promise<ConvertResult> {
  const parsed = JSON.parse(json);
  const result = JSON.stringify(parsed);
  const blob = new Blob([result], { type: 'application/json' });
  return { blob, filename: 'minified.json', mimeType: 'application/json' };
}

export async function jsonToCSV(json: string): Promise<ConvertResult> {
  const data = JSON.parse(json);
  const arr = Array.isArray(data) ? data : [data];
  if (arr.length === 0) throw new Error('Empty data');
  const headers = Object.keys(arr[0]);
  const csv = [
    headers.join(','),
    ...arr.map((row: Record<string, unknown>) => headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  return { blob, filename: 'data.csv', mimeType: 'text/csv' };
}

export async function csvToJSON(csv: string): Promise<ConvertResult> {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const data = lines.slice(1).map((line) => {
    const vals = line.match(/("([^"]*)"|([^,]*)),?/g)?.map((v) => v.replace(/,$/, '').replace(/^"|"$/g, '')) ?? [];
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  return { blob, filename: 'data.json', mimeType: 'application/json' };
}

export async function jsonToYAML(json: string): Promise<ConvertResult> {
  const data = JSON.parse(json);
  const yaml = objectToYAML(data, 0);
  const blob = new Blob([yaml], { type: 'text/plain' });
  return { blob, filename: 'data.yaml', mimeType: 'text/plain' };
}

function objectToYAML(obj: Record<string, unknown>, indent: number): string {
  const pad = '  '.repeat(indent);
  let result = '';
  for (const [key, val] of Object.entries(obj)) {
    if (val === null) result += `${pad}${key}: null\n`;
    else if (typeof val === 'object' && !Array.isArray(val)) {
      result += `${pad}${key}:\n${objectToYAML(val as Record<string, unknown>, indent + 1)}`;
    } else if (Array.isArray(val)) {
      result += `${pad}${key}:\n`;
      for (const item of val) {
        if (typeof item === 'object') result += `${pad}- ${objectToYAML(item as Record<string, unknown>, indent + 1).trimStart()}`;
        else result += `${pad}- ${item}\n`;
      }
    } else {
      result += `${pad}${key}: ${val}\n`;
    }
  }
  return result;
}

export async function urlEncode(text: string): Promise<ConvertResult> {
  const blob = new Blob([encodeURIComponent(text)], { type: 'text/plain' });
  return { blob, filename: 'encoded.txt', mimeType: 'text/plain' };
}

export async function urlDecode(text: string): Promise<ConvertResult> {
  const blob = new Blob([decodeURIComponent(text)], { type: 'text/plain' });
  return { blob, filename: 'decoded.txt', mimeType: 'text/plain' };
}

export async function htmlEncode(text: string): Promise<ConvertResult> {
  const div = document.createElement('div');
  div.textContent = text;
  const encoded = div.innerHTML;
  const blob = new Blob([encoded], { type: 'text/plain' });
  return { blob, filename: 'encoded.txt', mimeType: 'text/plain' };
}

export async function htmlDecode(text: string): Promise<ConvertResult> {
  const div = document.createElement('div');
  div.innerHTML = text;
  const decoded = div.textContent || '';
  const blob = new Blob([decoded], { type: 'text/plain' });
  return { blob, filename: 'decoded.txt', mimeType: 'text/plain' };
}

export async function htmlToMarkdown(html: string): Promise<ConvertResult> {
  let md = html;
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n');
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n');
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
  md = md.replace(/<a[^>]*href="(.*?)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  md = md.replace(/<img[^>]*src="(.*?)"[^>]*alt="(.*?)"[^>]*\/?>/gi, '![$2]($1)');
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<ul[^>]*>(.*?)<\/ul>/gis, '$1\n');
  md = md.replace(/<ol[^>]*>(.*?)<\/ol>/gis, '$1\n');
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n');
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<[^>]+>/g, '');
  md = md.replace(/\n{3,}/g, '\n\n');
  const blob = new Blob([md.trim()], { type: 'text/plain' });
  return { blob, filename: 'converted.md', mimeType: 'text/markdown' };
}

export async function markdownToHTML(md: string): Promise<ConvertResult> {
  let html = md;
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  html = html.replace(/^!\[([^\]]*)\]\(([^)]+)\)/gm, '<img src="$2" alt="$1" />');
  html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  html = html.replace(/\n\n/g, '</p><p>');
  html = `<p>${html}</p>`;
  html = html.replace(/<p><h/g, '<h').replace(/<\/h(\d)><\/p>/g, '</h$1>');
  const blob = new Blob([html], { type: 'text/html' });
  return { blob, filename: 'converted.html', mimeType: 'text/html' };
}

// ─── QR Code / Barcode ───

export async function generateQRCode(text: string, size: number): Promise<ConvertResult> {
  const dataUrl = await QRCode.toDataURL(text, { width: size, margin: 2 });
  const blob = dataURLToBlob(dataUrl);
  return { blob, filename: 'qrcode.png', mimeType: 'image/png', preview: dataUrl };
}

export async function generateQRCodeSVG(text: string): Promise<ConvertResult> {
  const svg = await QRCode.toString(text, { type: 'svg' });
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  return { blob, filename: 'qrcode.svg', mimeType: 'image/svg+xml' };
}

// ─── Color Tools ───

export async function colorConverter(input: string): Promise<ConvertResult> {
  const hex = input.trim();
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const rgb = `rgb(${r}, ${g}, ${b})`;
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r / 255) h = ((g / 255 - b / 255) / d + (g < b ? 6 : 0));
    else if (max === g / 255) h = (b / 255 - r / 255) / d + 2;
    else h = (r / 255 - g / 255) / d + 4;
    h *= 60;
  }
  const hsl = `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
  const report = `Color Conversion\n================\n\nHEX: ${hex}\nRGB: ${rgb}\nHSL: ${hsl}\n\nR: ${r}\nG: ${g}\nB: ${b}\nHue: ${Math.round(h)}°\nSaturation: ${Math.round(s * 100)}%\nLightness: ${Math.round(l * 100)}%`;
  const blob = new Blob([report], { type: 'text/plain' });
  return { blob, filename: 'color.txt', mimeType: 'text/plain' };
}

// ─── Hash / Crypto ───

export async function generateHash(text: string, algorithm: string): Promise<ConvertResult> {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  const blob = new Blob([hashHex], { type: 'text/plain' });
  return { blob, filename: `hash_${algorithm}.txt`, mimeType: 'text/plain' };
}

export async function generateUUID(): Promise<ConvertResult> {
  const uuid = crypto.randomUUID();
  const blob = new Blob([uuid], { type: 'text/plain' });
  return { blob, filename: 'uuid.txt', mimeType: 'text/plain' };
}

export async function generatePassword(length: number, options: { upper: boolean; lower: boolean; numbers: boolean; symbols: boolean }): Promise<ConvertResult> {
  let chars = '';
  if (options.upper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (options.lower) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (options.numbers) chars += '0123456789';
  if (options.symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  const password = Array.from(arr, (n) => chars[n % chars.length]).join('');
  const blob = new Blob([password], { type: 'text/plain' });
  return { blob, filename: 'password.txt', mimeType: 'text/plain' };
}

// ─── Calculators ───

export async function calculatePercentage(value: string, total: string): Promise<ConvertResult> {
  const v = parseFloat(value);
  const t = parseFloat(total);
  const pct = (v / t) * 100;
  const report = `Percentage Calculator\n======================\n\n${v} is ${pct.toFixed(2)}% of ${t}\n\nValue: ${v}\nTotal: ${t}\nPercentage: ${pct.toFixed(2)}%`;
  const blob = new Blob([report], { type: 'text/plain' });
  return { blob, filename: 'percentage.txt', mimeType: 'text/plain' };
}

export async function calculateBMI(weight: string, height: string): Promise<ConvertResult> {
  const w = parseFloat(weight);
  const h = parseFloat(height) / 100;
  const bmi = w / (h * h);
  let category = '';
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi < 25) category = 'Normal weight';
  else if (bmi < 30) category = 'Overweight';
  else category = 'Obese';
  const report = `BMI Calculator\n===============\n\nBMI: ${bmi.toFixed(1)}\nCategory: ${category}\n\nWeight: ${weight} kg\nHeight: ${height} cm`;
  const blob = new Blob([report], { type: 'text/plain' });
  return { blob, filename: 'bmi.txt', mimeType: 'text/plain' };
}

export async function calculateAge(birthDate: string): Promise<ConvertResult> {
  const birth = new Date(birthDate);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  const days = now.getDate() - birth.getDate();
  const totalDays = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
  const report = `Age Calculator\n===============\n\nAge: ${years} years, ${months} months, ${days} days\nTotal days: ${totalDays}\nTotal hours: ${totalDays * 24}\n\nBirth date: ${birthDate}\nCurrent date: ${now.toDateString()}`;
  const blob = new Blob([report], { type: 'text/plain' });
  return { blob, filename: 'age.txt', mimeType: 'text/plain' };
}

export async function calculateLoan(principal: string, rate: string, years: string): Promise<ConvertResult> {
  const p = parseFloat(principal);
  const r = parseFloat(rate) / 100 / 12;
  const n = parseFloat(years) * 12;
  const monthly = r === 0 ? p / n : (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const total = monthly * n;
  const interest = total - p;
  const report = `Loan Calculator\n================\n\nMonthly payment: $${monthly.toFixed(2)}\nTotal payment: $${total.toFixed(2)}\nTotal interest: $${interest.toFixed(2)}\n\nPrincipal: $${principal}\nRate: ${rate}%\nTerm: ${years} years`;
  const blob = new Blob([report], { type: 'text/plain' });
  return { blob, filename: 'loan.txt', mimeType: 'text/plain' };
}

export async function calculateUnit(value: string, from: string, to: string, type: string): Promise<ConvertResult> {
  const v = parseFloat(value);
  const conversions: Record<string, Record<string, number>> = {
    length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.34, yd: 0.9144, ft: 0.3048, in: 0.0254 },
    weight: { kg: 1, g: 0.001, lb: 0.453592, oz: 0.0283495, ton: 1000 },
    temperature: { C: 1, F: 1, K: 1 },
    volume: { l: 1, ml: 0.001, gal: 3.78541, qt: 0.946353, pt: 0.473176, cup: 0.236588 },
    area: { m2: 1, km2: 1000000, ft2: 0.092903, acre: 4046.86, ha: 10000 },
    speed: { ms: 1, kmh: 0.277778, mph: 0.44704, knot: 0.514444 },
  };
  let result: number;
  if (type === 'temperature') {
    let c: number;
    if (from === 'C') c = v;
    else if (from === 'F') c = (v - 32) * 5 / 9;
    else c = v - 273.15;
    if (to === 'C') result = c;
    else if (to === 'F') result = c * 9 / 5 + 32;
    else result = c + 273.15;
  } else {
    const factors = conversions[type] || conversions.length;
    result = (v * factors[from]) / factors[to];
  }
  const report = `Unit Conversion\n================\n\n${v} ${from} = ${result.toFixed(4)} ${to}\n\nType: ${type}`;
  const blob = new Blob([report], { type: 'text/plain' });
  return { blob, filename: 'conversion.txt', mimeType: 'text/plain' };
}

export async function calculateTimezones(timezone: string): Promise<ConvertResult> {
  const now = new Date();
  const report = `Timezone Info\n==============\n\nUTC time: ${now.toUTCString()}\nLocal time: ${now.toString()}\nSelected: ${timezone}\nTime: ${now.toLocaleTimeString('en-US', { timeZone: timezone })}\nDate: ${now.toLocaleDateString('en-US', { timeZone: timezone })}`;
  const blob = new Blob([report], { type: 'text/plain' });
  return { blob, filename: 'timezone.txt', mimeType: 'text/plain' };
}

// ─── Export helper ───

export { downloadBlob };

function encodeCanvasAsBMP(canvas: HTMLCanvasElement): Blob {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not read image pixels.');
  const rgba = ctx.getImageData(0, 0, width, height).data;
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelSize = rowSize * height;
  const fileSize = 54 + pixelSize;
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  view.setUint8(0, 0x42); view.setUint8(1, 0x4D);
  view.setUint32(2, fileSize, true);
  view.setUint32(10, 54, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(34, pixelSize, true);
  view.setInt32(38, 2835, true);
  view.setInt32(42, 2835, true);

  let offset = 54;
  const padding = rowSize - width * 3;
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      view.setUint8(offset++, rgba[src + 2]);
      view.setUint8(offset++, rgba[src + 1]);
      view.setUint8(offset++, rgba[src]);
    }
    for (let i = 0; i < padding; i++) view.setUint8(offset++, 0);
  }
  return new Blob([buffer], { type: 'image/bmp' });
}

