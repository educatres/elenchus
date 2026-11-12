import { describe, expect, it } from 'vitest'
import { buildStudyQuestionGroups } from './studyQuestions'
import type { Material, MaterialChunk } from '../domain/types'

describe('study question groups', () => {
  it('creates several grouped questions from material axes', () => {
    const material: Material = { id: 'm1', courseId: 'c1', filename: 'lesson.md', kind: 'md', mimeType: 'text/markdown', fileSizeBytes: 30, sha256: 'hash', parseStatus: 'ready', sourceText: '# 概念\n內容一\n# 應用\n內容二', enabledForRetrieval: true, createdAt: '', updatedAt: '' }
    const chunks: MaterialChunk[] = [1, 2].map((ordinal) => ({ id: `m1:${ordinal}`, materialId: 'm1', courseId: 'c1', sourceTitle: 'lesson.md', text: `教材內容 ${ordinal}`, ordinal, indexVersion: 'test' }))
    const groups = buildStudyQuestionGroups('c1', [material], chunks)
    expect(groups).toHaveLength(2)
    expect(groups[0].questions).toHaveLength(3)
    expect(groups[0].questions[0].question).toContain('概念')
  })
})
