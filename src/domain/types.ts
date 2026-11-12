export type UUID = string
export type ISODateString = string
export type MaterialKind = 'txt' | 'md' | 'pdf' | 'pasted'
export type MaterialParseStatus = 'queued' | 'parsing' | 'ready' | 'failed' | 'unsupported'
export type ProviderId = 'gemini' | 'cgu' | 'mock'
export type LearningStage = 'clarify' | 'locate' | 'reason' | 'challenge' | 'revise' | 'synthesize' | 'independent' | 'transfer' | 'reflection' | 'complete'
export type PedagogicalMove = 'probe_prior_knowledge' | 'ask_for_evidence' | 'compare_cases' | 'surface_assumption' | 'offer_counterexample' | 'decompose_problem' | 'point_to_material' | 'invite_revision' | 'request_synthesis' | 'request_transfer' | 'acknowledge_uncertainty'
export type ScaffoldingLevel = 0 | 1 | 2 | 3 | 4

export interface SocraticPolicy {
  version: string
  maxQuestionsPerTurn: number
  defaultScaffoldingLevel: ScaffoldingLevel
  maxScaffoldingLevel: ScaffoldingLevel
  directAnswerPolicy: 'never'
  citationsRequiredWhenGrounded: boolean
  offerIndependentCheckAfterTurns: number
  maxContextChunks: number
  latestTurnsInContext: number
}

export interface RubricDimension {
  id: 'concept' | 'reasoning' | 'revision' | 'transfer' | 'independence'
  title: string
  weight: number
  descriptors: Record<0 | 1 | 2 | 3 | 4, string>
}

export interface Rubric {
  id: UUID
  version: string
  title: string
  dimensions: RubricDimension[]
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface Course {
  id: UUID
  schemaVersion: '1.0'
  title: string
  unitTitle?: string
  description?: string
  learningObjectives: string[]
  materialIds: UUID[]
  rubricId: UUID
  socraticPolicy: SocraticPolicy
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface Material {
  id: UUID
  courseId: UUID
  filename: string
  kind: MaterialKind
  mimeType: string
  fileSizeBytes: number
  sha256: string
  pageCount?: number
  parseStatus: MaterialParseStatus
  parseError?: string
  sourceText?: string
  enabledForRetrieval: boolean
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface MaterialChunk {
  id: string
  materialId: UUID
  courseId: UUID
  sourceTitle: string
  text: string
  pageStart?: number
  pageEnd?: number
  heading?: string
  ordinal: number
  startOffset?: number
  endOffset?: number
  indexVersion: string
}

export interface LearningSession {
  id: UUID
  courseId: UUID
  studentAlias: string
  topic: string
  initialQuestion?: string
  status: 'active' | 'independent' | 'transfer' | 'reflection' | 'completed' | 'abandoned'
  currentStage: LearningStage
  currentScaffoldingLevel: ScaffoldingLevel
  provider: ProviderId
  model: string
  rubricSnapshot: Rubric
  socraticPolicySnapshot: SocraticPolicy
  materialIdsSnapshot: UUID[]
  independentAnswer?: string
  transferQuestion?: string
  transferAnswer?: string
  reflection?: string
  confidence?: number
  createdAt: ISODateString
  updatedAt: ISODateString
  completedAt?: ISODateString
}

export interface Message {
  id: UUID
  sessionId: UUID
  role: 'student' | 'assistant' | 'system_event'
  text: string
  sequence: number
  stage: LearningStage
  status: 'complete' | 'pending' | 'failed' | 'cancelled'
  createdAt: ISODateString
  scaffoldingLevel?: ScaffoldingLevel
  pedagogicalMove?: PedagogicalMove
  sourceChunkIds?: string[]
  grounding?: 'grounded' | 'insufficient' | 'not_required'
  provider?: ProviderId
  model?: string
}

export interface AssessmentDimension {
  dimensionId: RubricDimension['id']
  level: 0 | 1 | 2 | 3 | 4 | null
  status: 'assessed' | 'not_assessed'
  weight: number
  evidenceMessageIds: UUID[]
  confidence: 'low' | 'medium' | 'high'
  rationale: string
  teacherLevel?: 0 | 1 | 2 | 3 | 4 | null
  teacherNote?: string
}

export interface AssessmentReport {
  id: UUID
  sessionId: UUID
  courseId: UUID
  schemaVersion: '1.0'
  generatedAt: ISODateString
  status: 'draft' | 'needs-review' | 'reviewed'
  dimensions: AssessmentDimension[]
  suggestedTotal: number | null
  teacherTotal?: number | null
  limitations: string[]
}

export interface RetrievalResult extends MaterialChunk {
  score: number
  excerpt: string
}

export interface SocraticTurnResponse {
  assistantMessage: string
  nextStage: LearningStage
  pedagogicalMove: PedagogicalMove
  scaffoldingLevel: ScaffoldingLevel
  sourceChunkIds: string[]
  grounding: 'grounded' | 'insufficient' | 'not_required'
  askStudentToExplain: boolean
  suggestIndependentCheck: boolean
  answerLeakRisk: 'low' | 'uncertain' | 'high'
}

export const DEFAULT_POLICY: SocraticPolicy = {
  version: '1.0.0', maxQuestionsPerTurn: 2, defaultScaffoldingLevel: 1,
  maxScaffoldingLevel: 4, directAnswerPolicy: 'never', citationsRequiredWhenGrounded: true,
  offerIndependentCheckAfterTurns: 6, maxContextChunks: 6, latestTurnsInContext: 12,
}

export const DEFAULT_RUBRIC: Omit<Rubric, 'id' | 'createdAt' | 'updatedAt'> = {
  version: '1.0', title: '形成性學習規準',
  dimensions: [
    { id: 'concept', title: '概念理解', weight: 25, descriptors: { 0: '無可用證據', 1: '需高密度提示', 2: '能說明主要概念', 3: '少量提示即可合理說明', 4: '能獨立處理條件與反例' } },
    { id: 'reasoning', title: '推理與論證', weight: 25, descriptors: { 0: '無可用證據', 1: '僅指出片段理由', 2: '推理尚不完整', 3: '理由與證據大致連貫', 4: '能獨立建立完整論證' } },
    { id: 'revision', title: '反思與修正', weight: 20, descriptors: { 0: '無可用證據', 1: '需要提示才察覺問題', 2: '能在提示下嘗試修正', 3: '能主動指出並修正', 4: '能比較不同假設與限制' } },
    { id: 'transfer', title: '知識遷移', weight: 20, descriptors: { 0: '無可用證據', 1: '無法連結新情境', 2: '在提示下部分應用', 3: '能合理應用於新情境', 4: '能獨立處理變化條件' } },
    { id: 'independence', title: '獨立作答', weight: 10, descriptors: { 0: '無可用證據', 1: '高度依賴提示', 2: '需要中度提示', 3: '少量提示即可完成', 4: '無提示即可連貫說明' } },
  ],
}
