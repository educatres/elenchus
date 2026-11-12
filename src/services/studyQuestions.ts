import type { Material, MaterialChunk } from '../domain/types'

export interface StudyQuestion {
  id: string
  courseId: string
  title: string
  focus: string
  question: string
  sourceChunkIds: string[]
}

export interface StudyQuestionGroup {
  id: string
  courseId: string
  title: string
  sourceTitle: string
  questions: StudyQuestion[]
}

function focusFromText(text: string) {
  const compact = text.replace(/[#>*_`\[\](){}]/g, '').replace(/\s+/g, ' ').trim()
  return compact.length > 34 ? `${compact.slice(0, 34)}…` : compact
}

function headingsFromMaterial(material: Material) {
  return (material.sourceText ?? '').split(/\r?\n/).map((line) => line.match(/^#{1,3}\s+(.+)$/)?.[1]?.trim()).filter((heading): heading is string => Boolean(heading)).slice(0, 4)
}

/** Build deterministic, local-only opening questions that cover the material in order. */
export function buildStudyQuestionGroups(courseId: string, materials: Material[], chunks: MaterialChunk[]): StudyQuestionGroup[] {
  const groups: StudyQuestionGroup[] = []
  materials.filter((material) => material.courseId === courseId && material.enabledForRetrieval).forEach((material) => {
    const materialChunks = chunks.filter((chunk) => chunk.materialId === material.id).sort((a, b) => a.ordinal - b.ordinal)
    if (!materialChunks.length) return
    const headings = headingsFromMaterial(material)
    const groupCount = Math.min(4, Math.max(1, headings.length || Math.ceil(materialChunks.length / 3)))
    const chunkGroups = Array.from({ length: groupCount }, (_, index) => materialChunks.slice(Math.floor(index * materialChunks.length / groupCount), Math.floor((index + 1) * materialChunks.length / groupCount)))
    chunkGroups.forEach((groupChunks, index) => {
      if (!groupChunks.length) return
      const focus = focusFromText(groupChunks[0].text)
      const title = headings[index] ?? `主軸 ${index + 1}`
      const sourceChunkIds = groupChunks.map((chunk) => chunk.id)
      const base = `${title}：${focus}`
      groups.push({
        id: `${material.id}:axis:${index + 1}`,
        courseId,
        title,
        sourceTitle: material.filename,
        questions: [
          { id: `${material.id}:axis:${index + 1}:concept`, courseId, title, focus, sourceChunkIds, question: `先用自己的話說說看，${base}主要在討論什麼？你目前的理解是什麼？` },
          { id: `${material.id}:axis:${index + 1}:evidence`, courseId, title, focus, sourceChunkIds, question: `在「${title}」這個主軸裡，教材提供了哪些條件、例子或證據？哪一項最能支持你的想法？` },
          { id: `${material.id}:axis:${index + 1}:transfer`, courseId, title, focus, sourceChunkIds, question: `如果把「${title}」的概念放到一個不同但相關的情境，你會先檢查哪些條件？為什麼？` },
        ],
      })
    })
  })
  return groups
}
