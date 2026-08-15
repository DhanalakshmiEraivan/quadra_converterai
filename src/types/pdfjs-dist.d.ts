declare module 'pdfjs-dist/build/pdf.mjs' {
  export interface PDFPageProxy {
    getViewport(opts: { scale: number }): { width: number; height: number };
    render(opts: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }): { promise: Promise<void> };
    getTextContent(): Promise<{ items: Array<{ str: string; transform: number[]; width: number; height: number }> }>;
  }
  export interface PDFDocumentProxy {
    numPages: number;
    getPage(n: number): Promise<PDFPageProxy>;
  }
  export const GlobalWorkerOptions: { workerSrc: string };
  export function getDocument(opts: { data: ArrayBuffer; password?: string }): { promise: Promise<PDFDocumentProxy> };
}
