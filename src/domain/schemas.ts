import { z } from 'zod'

export const turnResponseSchema = z.object({
  assistantMessage: z.string().min(1).max(4000),
  nextStage: z.enum(['clarify', 'locate', 'reason', 'challenge', 'revise', 'synthesize', 'independent', 'transfer', 'reflection', 'complete']),
  pedagogicalMove: z.enum(['probe_prior_knowledge', 'ask_for_evidence', 'compare_cases', 'surface_assumption', 'offer_counterexample', 'decompose_problem', 'point_to_material', 'invite_revision', 'request_synthesis', 'request_transfer', 'acknowledge_uncertainty']),
  scaffoldingLevel: z.number().int().min(0).max(4),
  sourceChunkIds: z.array(z.string()),
  grounding: z.enum(['grounded', 'insufficient', 'not_required']),
  askStudentToExplain: z.boolean(),
  suggestIndependentCheck: z.boolean(),
  answerLeakRisk: z.enum(['low', 'uncertain', 'high']),
})

export const reportExportSchema = z.object({
  format: z.literal('elenchus-learning-report'), schemaVersion: z.literal('1.0'), generator: z.literal('elenchus'),
  exportedAt: z.string(), course: z.object({ id: z.string(), title: z.string() }), session: z.record(z.string(), z.unknown()),
  rubric: z.record(z.string(), z.unknown()), messages: z.array(z.record(z.string(), z.unknown())), metrics: z.record(z.string(), z.unknown()), report: z.record(z.string(), z.unknown()),
})
