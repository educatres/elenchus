import { turnResponseSchema } from '../domain/schemas'
import type { ProviderId, RetrievalResult, ScaffoldingLevel, SocraticTurnResponse } from '../domain/types'
import { SOCRATIC_SYSTEM_PROMPT } from '../prompts/socratic-system.zh-TW'

export interface ProviderConfig { provider: ProviderId; apiKey: string; model: string }
export interface CompletionRequest { system: string; studentMessage: string; context: RetrievalResult[]; history: { role: 'student' | 'assistant'; text: string }[]; signal?: AbortSignal }
export interface ProviderAdapter { id: ProviderId; name: string; complete(request: CompletionRequest, config: ProviderConfig): Promise<SocraticTurnResponse>; testConnection(config: ProviderConfig): Promise<void> }

function fallback(question: string, context: RetrievalResult[], level: 0 | 1 | 2 | 3 | 4): SocraticTurnResponse {
  const sourceChunkIds = context.map((item) => item.id)
  const citation = sourceChunkIds[0] ? `（可先查看教材「${context[0].sourceTitle}」${context[0].pageStart ? `第 ${context[0].pageStart} 頁` : ''}）` : ''
  const answer = /直接|答案|完整/.test(question) ? `我先不直接代你作答；${citation}你目前的猜測是什麼？請說出一個理由或你卡住的步驟。` : context.length ? `你提到「${question.slice(0, 42)}」；${citation}你能用自己的話指出這段資料中的關鍵條件，並說明它如何支持你的想法嗎？` : '目前教材沒有足夠的相關段落。你願意補充教材內容，或先說說自己已知的概念與疑問嗎？'
  return { assistantMessage: answer, nextStage: context.length ? level >= 2 ? 'reason' : 'locate' : 'clarify', pedagogicalMove: context.length ? 'ask_for_evidence' : 'acknowledge_uncertainty', scaffoldingLevel: level, sourceChunkIds, grounding: context.length ? 'grounded' : 'insufficient', askStudentToExplain: true, suggestIndependentCheck: false, answerLeakRisk: 'low' }
}

const mockAdapter: ProviderAdapter = {
  id: 'mock', name: '離線示範（Mock）',
  async complete(request) { await new Promise((resolve) => setTimeout(resolve, 180)); const level = /不知道|不會|卡住/.test(request.studentMessage) ? 2 : 1; return fallback(request.studentMessage, request.context, level) },
  async testConnection() { return Promise.resolve() },
}

const endpoint = (provider: ProviderId) => provider === 'cgu' ? 'https://air.cgu.edu.tw/cgullmapi/v1' : 'https://generativelanguage.googleapis.com/v1beta/openai'

async function callOpenAICompatible(request: CompletionRequest, config: ProviderConfig) {
  if (!config.apiKey.trim()) throw new Error('請先輸入 API Key。')
  const controller = new AbortController(); const timer = window.setTimeout(() => controller.abort(), 60_000)
  const onAbort = () => controller.abort(); request.signal?.addEventListener('abort', onAbort, { once: true })
  try {
    const response = await fetch(`${endpoint(config.provider)}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${config.apiKey.trim()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: config.model, temperature: 0.2, messages: [{ role: 'system', content: `${SOCRATIC_SYSTEM_PROMPT}\n請依此 JSON 格式回覆：{\"assistantMessage\":\"…\",\"nextStage\":\"locate\",\"pedagogicalMove\":\"ask_for_evidence\",\"scaffoldingLevel\":1,\"sourceChunkIds\":[],\"grounding\":\"insufficient\",\"askStudentToExplain\":true,\"suggestIndependentCheck\":false,\"answerLeakRisk\":\"low\"}` }, { role: 'user', content: JSON.stringify({ question: request.studentMessage, context: request.context.map(({ id, text, pageStart, sourceTitle }) => ({ sourceChunkId: id, sourceTitle, pageStart, text })), history: request.history.slice(-12) }) }], response_format: { type: 'json_object' } }), signal: controller.signal })
    if (!response.ok) { if (response.status === 401 || response.status === 403) throw new Error('API Key 無效或沒有模型權限。'); if (response.status === 404) throw new Error('找不到模型，請檢查模型 ID。'); if (response.status === 429) throw new Error('API 配額或速率限制已達上限，請稍後重試。'); throw new Error(`AI 服務回應失敗（${response.status}）。`) }
    const body = await response.json() as { choices?: { message?: { content?: string } }[] }
    const text = body.choices?.[0]?.message?.content
    if (!text) throw new Error('AI 回應沒有可讀取的內容。')
    const cleanedText = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    const raw = JSON.parse(cleanedText) as unknown
    let parsed: ReturnType<typeof turnResponseSchema.parse>
    try {
      parsed = turnResponseSchema.parse(raw)
    } catch {
      // A model response is untrusted data. Never surface a raw Zod error to the learner;
      // use a deterministic Socratic prompt that does not claim unsupported evidence.
      return fallback(request.studentMessage, request.context, 1)
    }
    const sourceChunkIds = parsed.sourceChunkIds.filter((id) => request.context.some((chunk) => chunk.id === id))
    const unsafeMarkup = /<script|javascript:|onerror\s*=|<iframe/i.test(parsed.assistantMessage)
    const likelyDirectAnswer = /答案是|完整解法|以下是你可以直接繳交|```(?:python|javascript|typescript|sql)/i.test(parsed.assistantMessage)
    if (unsafeMarkup || likelyDirectAnswer || parsed.answerLeakRisk === 'high') return fallback(request.studentMessage, request.context, Math.min(4, Math.max(1, parsed.scaffoldingLevel)) as ScaffoldingLevel)
    if (parsed.grounding === 'grounded' && sourceChunkIds.length === 0) return fallback(request.studentMessage, request.context, 1)
    return { ...parsed, scaffoldingLevel: Math.min(4, Math.max(0, parsed.scaffoldingLevel)) as ScaffoldingLevel, sourceChunkIds }
  } catch (error) {
    if (request.signal?.aborted) throw new Error('已取消這次 AI 請求。')
    if (error instanceof TypeError) throw new Error('無法連線到 AI 服務，可能是網路或瀏覽器 CORS 限制。')
    if (error instanceof SyntaxError) throw new Error('AI 回應格式無法解析，請重試。')
    throw error
  } finally { window.clearTimeout(timer); request.signal?.removeEventListener('abort', onAbort) }
}

const realAdapter = (id: 'gemini' | 'cgu'): ProviderAdapter => ({ id, name: id === 'gemini' ? 'Google Gemini' : 'CGU API', complete: (request, config) => callOpenAICompatible(request, config), async testConnection(config) { await callOpenAICompatible({ system: SOCRATIC_SYSTEM_PROMPT, studentMessage: '請只回覆一個簡短問題。', context: [], history: [] }, config) } })
const adapters: Record<ProviderId, ProviderAdapter> = { mock: mockAdapter, gemini: realAdapter('gemini'), cgu: realAdapter('cgu') }
export function getProvider(id: ProviderId) { return adapters[id] }
export const DEFAULT_MODELS: Record<ProviderId, string> = { mock: 'offline-demo', gemini: 'gemini-2.0-flash', cgu: 'gpt-oss-120b' }
