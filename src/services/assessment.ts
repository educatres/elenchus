import type { AssessmentDimension, AssessmentReport, LearningSession, Message, Rubric } from '../domain/types'
import { newId, now } from '../db'

const studentMessages = (messages: Message[]) => messages.filter((message) => message.role === 'student' && message.status === 'complete')

export function calculateMetrics(messages: Message[]) {
  const turns = messages.filter((message) => message.role === 'assistant' && message.status === 'complete')
  const students = studentMessages(messages)
  return {
    turnCount: turns.length,
    directAnswerRequests: students.filter((m) => /直接|答案|完整作業|代寫/.test(m.text)).length,
    helpRequests: students.filter((m) => /提示|不知道|不會|卡住/.test(m.text)).length,
    highScaffoldTurns: turns.filter((m) => (m.scaffoldingLevel ?? 0) >= 3).length,
    unpromptedReasoningTurns: students.filter((m) => /因為|所以|因此|證據|理由/.test(m.text)).length,
  }
}

export function assessSession(session: LearningSession, messages: Message[], rubric: Rubric): AssessmentReport {
  const students = studentMessages(messages)
  const hasIndependent = Boolean(session.independentAnswer?.trim())
  const hasTransfer = Boolean(session.transferAnswer?.trim())
  const firstStudent = students[0]
  const evidence = (id: string) => students.filter((m) => m.text.length >= 20).slice(0, id === 'concept' ? 2 : 1).map((m) => m.id)
  const dimensions: AssessmentDimension[] = rubric.dimensions.map((dimension) => {
    const isNotAssessed = (dimension.id === 'independence' && !hasIndependent) || (dimension.id === 'transfer' && !hasTransfer) || students.length === 0
    const ids = isNotAssessed ? [] : evidence(dimension.id)
    const level = isNotAssessed ? null : Math.min(4, Math.max(1, ids.length + (students.some((m) => /因為|因此|證據|理由/.test(m.text)) ? 1 : 0))) as 0 | 1 | 2 | 3 | 4
    return { dimensionId: dimension.id, level, status: isNotAssessed ? 'not_assessed' : 'assessed', weight: dimension.weight, evidenceMessageIds: ids, confidence: ids.length > 1 ? 'medium' : 'low', rationale: isNotAssessed ? '本次沒有足夠的學生作答證據。' : `依據學生訊息${firstStudent ? `（${firstStudent.id}）` : ''}的可觀察表現。` }
  })
  const suggestedTotal = dimensions.every((d) => d.level !== null) ? Math.round(dimensions.reduce((sum, d) => sum + ((d.level ?? 0) / 4) * d.weight, 0) * 10) / 10 : null
  return { id: newId(), sessionId: session.id, courseId: session.courseId, schemaVersion: '1.0', generatedAt: now(), status: 'needs-review', dimensions, suggestedTotal, limitations: ['本報告只描述本機對話中可觀察的證據，不能判定學生是否使用其他 AI。', '純前端資料可以被使用者修改，建議教師結合課堂表現覆核。'] }
}
