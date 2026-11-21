import { Rpc } from "@opencode/plugin/rpc"

const statsRow = {
  type: "object",
  properties: {
    providerID: { type: "string" },
    modelID: { type: "string" },
    msgs: { type: "number" },
    input: { type: "number" },
    output: { type: "number" },
    reasoning: { type: "number" },
    cacheRead: { type: "number" },
    cacheWrite: { type: "number" },
    total: { type: "number" },
    cost: { type: "number" },
  },
  required: ["providerID", "modelID", "msgs", "input", "output", "reasoning", "cacheRead", "cacheWrite", "total", "cost"],
  additionalProperties: false,
} as const

const totals = {
  type: "object",
  properties: {
    msgs: { type: "number" },
    input: { type: "number" },
    output: { type: "number" },
    reasoning: { type: "number" },
    cacheRead: { type: "number" },
    cacheWrite: { type: "number" },
    total: { type: "number" },
    cost: { type: "number" },
  },
  required: ["msgs", "input", "output", "reasoning", "cacheRead", "cacheWrite", "total", "cost"],
  additionalProperties: false,
} as const

export const TokenStats = Rpc.define({
  id: "token-stats",
  methods: {
    stats: {
      input: {
        type: "object",
        properties: {
          range: { type: "string", enum: ["all", "today", "7d"] },
          directory: { type: "string" },
        },
        required: ["range"],
        additionalProperties: false,
      },
      output: {
        type: "object",
        properties: {
          range: { type: "string" },
          directory: { type: "string" },
          rows: { type: "array", items: statsRow },
          totals,
          fresh: { type: "number" },
        },
        required: ["range", "rows", "totals", "fresh"],
        additionalProperties: false,
      },
      errors: {
        db_error: {
          type: "object",
          properties: { message: { type: "string" } },
          required: ["message"],
          additionalProperties: false,
        },
      },
    },
  },
  events: {},
})
