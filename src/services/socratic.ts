import type { LearningStage, Message, RetrievalResult, ScaffoldingLevel, SocraticPolicy } from '../domain/types'

export function nextScaffoldingLevel(messages: Message[], policy: SocraticPolicy): ScaffoldingLevel {
  const recent = messages.filter((message) => message.role === 'student').slice(-3)
  const stuck = recent.filter((message) => /不知道|不會|卡住|直接給|答案/.test(message.text)).length
  return Math.min(policy.maxScaffoldingLevel, policy.defaultScaffoldingLevel + Math.max(0, stuck - 1)) as ScaffoldingLevel
}

export function suggestedStage(messages: Message[]): LearningStage {
  const turns = messages.filter((message) => message.role === 'assistant').length
  if (turns === 0) return 'clarify'
  if (turns < 2) return 'locate'
  if (turns < 4) return 'reason'
  if (turns < 6) return 'challenge'
  return 'synthesize'
}

export function contextForPrompt(history: Message[], chunks: RetrievalResult[], policy: SocraticPolicy) {
  return { history: history.filter((message) => message.role !== 'system_event').slice(-policy.latestTurnsInContext).map((message) => ({ role: message.role === 'student' ? 'student' as const : 'assistant' as const, text: message.text })), context: chunks.slice(0, policy.maxContextChunks) }
}
