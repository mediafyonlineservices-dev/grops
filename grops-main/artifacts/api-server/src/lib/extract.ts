import type { Buffer } from "node:buffer";

export const MAX_PAGES_PER_DOC = 50;
export const MAX_DOCS_PER_GRAPH = 3;
const MAX_TEXT_CHARS_PER_DOC = 50_000;

export interface ExtractedDoc {
  id: string;
  name: string;
  text: string;
  pages: number;
  charCount: number;
}

function truncate(text: string, max = MAX_TEXT_CHARS_PER_DOC): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "\n\n[…truncated…]";
}

function isPdfBuffer(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;
  return (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  );
}

function isDocxBuffer(buffer: Buffer): boolean {
  // DOCX files are ZIP archives — start with PK\x03\x04
  if (buffer.length < 4) return false;
  return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
}

function estimatePages(text: string): number {
  // Rough estimate: ~2000 chars per page
  return Math.max(1, Math.ceil(text.length / 2000));
}

async function extractFromPdf(buffer: Buffer, originalName: string): Promise<{ text: string; pages: number }> {
  const mod = await import("pdf-parse");
  const pdfParse =
    (mod as unknown as { default: (b: Buffer) => Promise<{ text: string; numpages: number }> }).default ??
    (mod as unknown as (b: Buffer) => Promise<{ text: string; numpages: number }>);
  const result = await pdfParse(buffer);
  const pages = result.numpages ?? 0;
  if (pages > MAX_PAGES_PER_DOC) {
    throw new Error(
      `"${originalName}" is ${pages} pages — limit is ${MAX_PAGES_PER_DOC} pages per document.`,
    );
  }
  return { text: (result.text || "").trim(), pages };
}

async function extractFromDocx(buffer: Buffer): Promise<{ text: string; pages: number }> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: buffer as unknown as ArrayBuffer });
  const text = (result.value || "").trim();
  return { text, pages: estimatePages(text) };
}

function extractPlainText(buffer: Buffer): { text: string; pages: number } {
  const text = buffer.toString("utf-8").trim();
  return { text, pages: estimatePages(text) };
}

/**
 * Extracts text from any supported document type.
 * Supported: PDF, DOCX, TXT, MD, CSV, JSON, and any UTF-8 text file.
 */
export async function extractDocument(
  buffer: Buffer,
  originalName: string,
  docId: string,
): Promise<ExtractedDoc> {
  const lower = (originalName || "").toLowerCase();

  let extracted: { text: string; pages: number };

  if (lower.endsWith(".pdf") || isPdfBuffer(buffer)) {
    extracted = await extractFromPdf(buffer, originalName);
  } else if (lower.endsWith(".docx") || isDocxBuffer(buffer)) {
    extracted = await extractFromDocx(buffer);
    if (extracted.pages > MAX_PAGES_PER_DOC) {
      throw new Error(
        `"${originalName}" is too long (estimated ${extracted.pages} pages) — limit is ${MAX_PAGES_PER_DOC} pages.`,
      );
    }
  } else {
    // TXT, MD, CSV, JSON, RTF, or any UTF-8 text file
    extracted = extractPlainText(buffer);
    if (extracted.pages > MAX_PAGES_PER_DOC) {
      throw new Error(
        `"${originalName}" is too long (estimated ${extracted.pages} pages) — limit is ${MAX_PAGES_PER_DOC} pages.`,
      );
    }
  }

  const text = extracted.text;
  if (text.length === 0) {
    throw new Error(`No readable text could be extracted from "${originalName}".`);
  }

  return {
    id: docId,
    name: originalName,
    text: truncate(text),
    pages: extracted.pages,
    charCount: text.length,
  };
}

// Legacy alias kept for any existing imports
export const extractPdf = extractDocument;
