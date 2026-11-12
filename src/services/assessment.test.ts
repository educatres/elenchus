import { describe, expect, it } from 'vitest'
import { assessSession, calculateMetrics } from './assessment'
import { DEFAULT_POLICY, DEFAULT_RUBRIC, type LearningSession, type Message, type Rubric } from '../domain/types'

const rubric: Rubric = { ...DEFAULT_RUBRIC, id: 'r', createdAt: '2026-01-01', updatedAt: '2026-01-01' }
const session: LearningSession = { id: 's', courseId: 'c', studentAlias: 'S01', topic: '概念', status: 'active', currentStage: 'reason', currentScaffoldingLevel: 1, provider: 'mock', model: 'offline-demo', rubricSnapshot: rubric, socraticPolicySnapshot: DEFAULT_POLICY, materialIdsSnapshot: [], createdAt: '2026-01-01', updatedAt: '2026-01-01' }
const messages: Message[] = [{ id: 'm1', sessionId: 's', role: 'student', text: '我認為因為訓練資料太少，所以模型只記住例子，理由是資料上的表現差很多。', sequence: 1, stage: 'clarify', status: 'complete', createdAt: '2026-01-01' }]

describe('assessment', () => {
  it('calculates observable metrics', () => expect(calculateMetrics(messages).unpromptedReasoningTurns).toBe(1))
  it('keeps missing transfer as not_assessed rather than zero', () => {
    const report = assessSession(session, messages, rubric)
    expect(report.dimensions.find((item) => item.dimensionId === 'transfer')?.status).toBe('not_assessed')
    expect(report.suggestedTotal).toBeNull()
  })
})
