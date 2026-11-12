import Dexie, { type Table } from 'dexie'
import type { AssessmentReport, Course, LearningSession, Material, MaterialChunk, Message, Rubric } from './domain/types'

export class ElenchusDB extends Dexie {
  courses!: Table<Course, string>
  rubrics!: Table<Rubric, string>
  materials!: Table<Material, string>
  chunks!: Table<MaterialChunk, string>
  sessions!: Table<LearningSession, string>
  messages!: Table<Message, string>
  reports!: Table<AssessmentReport, string>

  constructor() {
    super('elenchus-local')
    this.version(1).stores({
      courses: 'id, updatedAt', rubrics: 'id, version', materials: 'id, courseId, sha256, updatedAt',
      chunks: 'id, materialId, courseId, ordinal', sessions: 'id, courseId, updatedAt, status',
      messages: 'id, sessionId, sequence, createdAt', reports: 'id, sessionId, courseId, generatedAt',
    })
  }
}

export const db = new ElenchusDB()

export const newId = () => {
  try { return crypto.randomUUID() } catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}` }
}
export const now = () => new Date().toISOString()

export async function deleteCourseData(courseId: string) {
  await db.transaction('rw', [db.courses, db.rubrics, db.materials, db.chunks, db.sessions, db.messages, db.reports], async () => {
    const materials = await db.materials.where('courseId').equals(courseId).toArray()
    const sessions = await db.sessions.where('courseId').equals(courseId).toArray()
    await db.chunks.where('courseId').equals(courseId).delete()
    await db.materials.where('courseId').equals(courseId).delete()
    await db.messages.where('sessionId').anyOf(sessions.map((s) => s.id)).delete()
    await db.reports.where('courseId').equals(courseId).delete()
    await db.sessions.where('courseId').equals(courseId).delete()
    await db.rubrics.where('id').anyOf((await db.courses.get(courseId))?.rubricId ?? '').delete()
    await db.courses.delete(courseId)
    void materials
  })
}

export const prefs = {
  get<T>(key: string, fallback: T): T {
    try { const raw = localStorage.getItem(`elenchus.${key}`); return raw ? JSON.parse(raw) as T : fallback } catch { return fallback }
  },
  set<T>(key: string, value: T) {
    try { localStorage.setItem(`elenchus.${key}`, JSON.stringify(value)) } catch { /* private browsing */ }
  },
}
