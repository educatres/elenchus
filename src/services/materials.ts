import type { MaterialChunk, MaterialKind, RetrievalResult } from '../domain/types'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

// Vite bundles the worker as a same-origin asset, so PDF parsing does not need a remote worker.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString()

export function materialKind(filename: string): MaterialKind | null {
  const ext = filename.toLowerCase().split('.').pop()
  return ext === 'txt' ? 'txt' : ext === 'md' || ext === 'markdown' ? 'md' : ext === 'pdf' ? 'pdf' : null
}

export async function sha256(value: string | ArrayBuffer): Promise<string> {
  const data = typeof value === 'string' ? new TextEncoder().encode(value) : value
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function normalizeText(text: string) {
  return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/[ \t]+/g, ' ').replace(/ +\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

function tokens(value: string) {
  const normalized = value.toLocaleLowerCase('zh-Hant').normalize('NFKC')
  const words = normalized.match(/[a-z0-9+#.-]+|[\u3400-\u9fff]/gi) ?? []
  const compact = normalized.replace(/[^\u3400-\u9fff]/g, '')
  const bigrams = Array.from({ length: Math.max(0, compact.length - 1) }, (_, i) => compact.slice(i, i + 2))
  return [...new Set([...words, ...bigrams])]
}

export function buildChunks(input: { materialId: string; courseId: string; sourceTitle: string; text: string; pageStart?: number; pageEnd?: number }, size = 900, overlap = 150): MaterialChunk[] {
  const text = normalizeText(input.text)
  if (!text) return []
  const result: MaterialChunk[] = []
  let start = 0; let ordinal = 1
  while (start < text.length) {
    let end = Math.min(text.length, start + size)
    if (end < text.length) {
      const boundary = text.lastIndexOf('\n', end)
      if (boundary > start + size * 0.55) end = boundary
    }
    const chunkText = text.slice(start, end).trim()
    if (chunkText) result.push({ id: `${input.materialId}:p${input.pageStart ?? 0}:${String(ordinal).padStart(4, '0')}`, materialId: input.materialId, courseId: input.courseId, sourceTitle: input.sourceTitle, text: chunkText, pageStart: input.pageStart, pageEnd: input.pageEnd, ordinal, startOffset: start, endOffset: end, indexVersion: 'bm25-1' })
    if (end >= text.length) break
    start = Math.max(start + 1, end - overlap); ordinal += 1
  }
  return result
}

export function retrieveChunks(query: string, chunks: MaterialChunk[], topK = 6): RetrievalResult[] {
  const queryTokens = tokens(query)
  if (!queryTokens.length) return []
  const scored = chunks.map((chunk) => {
    const chunkTokens = tokens(chunk.text)
    const frequency = new Map<string, number>()
    chunkTokens.forEach((token) => frequency.set(token, (frequency.get(token) ?? 0) + 1))
    const score = queryTokens.reduce((sum, token) => sum + (frequency.get(token) ? 1 + Math.min(frequency.get(token)! / 8, 1) : 0), 0) / queryTokens.length
    return { ...chunk, score, excerpt: chunk.text.slice(0, 360) }
  }).filter((chunk) => chunk.score > 0).sort((a, b) => b.score - a.score)
  return scored.slice(0, topK)
}

export async function readMaterialFile(file: File) {
  if (file.size > 20 * 1024 * 1024) throw new Error('單一教材上限為 20 MB。')
  const kind = materialKind(file.name)
  if (!kind) throw new Error('目前支援 TXT、Markdown 與文字型 PDF。')
  if (kind !== 'pdf') return { kind, text: normalizeText(await file.text()), pages: [] as { page: number; text: string }[] }
  try {
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise
    const pages: { page: number; text: string }[] = []
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      const text = normalizeText(content.items.map((item) => 'str' in item ? item.str : '').join(' '))
      if (text) pages.push({ page: pageNumber, text })
    }
    if (!pages.length) throw new Error('此 PDF 沒有可擷取的文字層，目前不支援掃描型 PDF／OCR。')
    return { kind, text: pages.map((page) => page.text).join('\n\n'), pages }
  } catch (error) {
    if (error instanceof Error && error.message.includes('沒有可擷取')) throw error
    throw new Error('PDF 解析失敗，可能是加密、損毀或不支援的檔案。')
  }
}
