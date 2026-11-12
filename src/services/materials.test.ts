import { describe, expect, it } from 'vitest'
import { buildChunks, normalizeText, retrieveChunks } from './materials'

describe('material indexing', () => {
  it('normalizes text and creates stable chunks', () => {
    const text = normalizeText('\uFEFF第一段  \n\n\n第二段')
    expect(text).toBe('第一段\n\n第二段')
    const chunks = buildChunks({ materialId: 'doc', courseId: 'course', sourceTitle: '講義', text })
    expect(chunks[0]?.id).toBe('doc:p0:0001')
  })
  it('retrieves Chinese bigram matches', () => {
    const chunks = buildChunks({ materialId: 'doc', courseId: 'course', sourceTitle: '講義', text: '過度擬合是模型記住訓練資料的現象。\n\n正則化可降低過度擬合。' })
    expect(retrieveChunks('什麼是過度擬合', chunks)[0]?.text).toContain('過度擬合')
  })
})
