import { homedir } from "node:os"
import { join } from "node:path"

export type Range = "all" | "today" | "7d"

export interface ModelStats {
  providerID: string
  modelID: string
  msgs: number
  input: number
  output: number
  reasoning: number
  cacheRead: number
  cacheWrite: number
  total: number
  cost: number
}

export type Totals = Omit<ModelStats, "providerID" | "modelID">

export interface StatsResult {
  range: Range
  directory?: string
  rows: ModelStats[]
  totals: Totals
  fresh: number
}

interface Entry {
  time_created: number
  data: string
}

const DAY = 24 * 60 * 60 * 1000

export function dbPath(): string {
  const base = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share")
  return join(base, "opencode", "opencode.db")
}

export function since(range: Range, now = Date.now()): number | undefined {
  if (range === "today") {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    return start.getTime()
  }
  return range === "7d" ? now - 7 * DAY : undefined
}

/** Same buckets and ordering as ~/.opencode/plan/opencode-token-stats.py. */
export function aggregate(entries: readonly Entry[]): { rows: ModelStats[]; totals: Totals; fresh: number } {
  const byModel = new Map<string, ModelStats>()
  const totals: Totals = { msgs: 0, input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0, total: 0, cost: 0 }

  for (const entry of entries) {
    let message: Record<string, unknown>
    try {
      message = JSON.parse(entry.data)
    } catch {
      continue
    }
    const model = (message.model ?? {}) as { providerID?: string; id?: string }
    const providerID = model.providerID ?? "?"
    const modelID = model.id ?? "?"
    const key = `${providerID}/${modelID}`
    const tokens = (message.tokens ?? {}) as {
      input?: number
      output?: number
      reasoning?: number
      cache?: { read?: number; write?: number }
    }
    const cache = tokens.cache ?? {}

    let row = byModel.get(key)
    if (!row) {
      row = {
        providerID,
        modelID,
        msgs: 0,
        input: 0,
        output: 0,
        reasoning: 0,
        cacheRead: 0,
        cacheWrite: 0,
        total: 0,
        cost: 0,
      }
      byModel.set(key, row)
    }

    row.msgs += 1
    row.input += tokens.input ?? 0
    row.output += tokens.output ?? 0
    row.reasoning += tokens.reasoning ?? 0
    row.cacheRead += cache.read ?? 0
    row.cacheWrite += cache.write ?? 0
    row.cost += typeof message.cost === "number" ? message.cost : 0
  }

  for (const row of byModel.values()) {
    row.total = row.input + row.output + row.reasoning + row.cacheRead + row.cacheWrite
    totals.msgs += row.msgs
    totals.input += row.input
    totals.output += row.output
    totals.reasoning += row.reasoning
    totals.cacheRead += row.cacheRead
    totals.cacheWrite += row.cacheWrite
    totals.total += row.total
    totals.cost += row.cost
  }

  const rows = [...byModel.values()].sort((a, b) => b.input + b.output + b.cacheRead - (a.input + a.output + a.cacheRead))

  return { rows, totals, fresh: totals.input + totals.output + totals.reasoning }
}

interface Database {
  all(sql: string, params: readonly unknown[]): Record<string, unknown>[]
  close(): void
}

async function openDb(path: string): Promise<Database> {
  const bun = await import("bun:sqlite").catch(() => undefined)
  if (bun) {
    const db = new bun.Database(path, { readonly: true })
    return {
      all: (sql, params) => db.query(sql).all(...params) as Record<string, unknown>[],
      close: () => db.close(),
    }
  }

  const node = await import("node:sqlite")
  const db = new node.DatabaseSync(path, { readOnly: true })
  return {
    all: (sql, params) => db.prepare(sql).all(...(params as never[])) as Record<string, unknown>[],
    close: () => db.close(),
  }
}

export async function queryStats(input: { range: Range; directory?: string }, now = Date.now()): Promise<StatsResult> {
  const from = since(input.range, now)
  const where = ["m.type = 'assistant'"]
  const params: unknown[] = []
  if (from !== undefined) {
    where.push("m.time_created >= ?")
    params.push(from)
  }
  if (input.directory) {
    where.push("s.directory = ?")
    params.push(input.directory)
  }

  const db = await openDb(dbPath())
  try {
    const entries = db.all(
      `select m.time_created as time_created, m.data as data
         from session_message m
         left join session_v2 s on s.id = m.session_id
        where ${where.join(" and ")}`,
      params,
    ) as unknown as Entry[]

    const { rows, totals, fresh } = aggregate(entries)
    return {
      range: input.range,
      ...(input.directory ? { directory: input.directory } : {}),
      rows,
      totals,
      fresh,
    }
  } finally {
    db.close()
  }
}
