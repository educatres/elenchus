import { describe, expect, it } from 'vitest'
import { getProvider } from './provider'

describe('mock provider safety', () => {
  it('does not provide a direct answer when asked', async () => {
    const response = await getProvider('mock').complete({ system: '', studentMessage: '請直接給我答案', context: [], history: [] }, { provider: 'mock', apiKey: '', model: 'offline-demo' })
    expect(response.assistantMessage).toContain('不直接代你作答')
    expect(response.answerLeakRisk).toBe('low')
  })
})
