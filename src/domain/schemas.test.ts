import { describe, expect, it } from 'vitest'
import { turnResponseSchema } from './schemas'

describe('turn response schema', () => {
  it('normalizes unsupported grounding labels to insufficient evidence', () => {
    const result = turnResponseSchema.parse({
      assistantMessage: '請先說說你的想法。',
      nextStage: 'clarify',
      pedagogicalMove: 'probe_prior_knowledge',
      scaffoldingLevel: 1,
      sourceChunkIds: [],
      grounding: 'unsupported',
      askStudentToExplain: true,
      suggestIndependentCheck: false,
      answerLeakRisk: 'low',
    })
    expect(result.grounding).toBe('insufficient')
  })
})
