import { Plugin } from "@opencode/plugin"
import { TokenStats } from "./rpc.js"
import { queryStats, resolveDbPath, type Range } from "./stats.js"

const RANGES: readonly Range[] = ["all", "today", "7d"]

export default Plugin.define({
  id: "token-stats",
  async setup(ctx) {
    // opencode.json: {"plugins": [{"package": "...", "options": {"db": "/path/opencode.db"}}]}
    const option = ctx.options.db ?? ctx.options.database
    const configured = typeof option === "string" && option.trim() ? option.trim() : undefined

    const registration = await ctx.rpc.register(TokenStats, {
      stats: async (input, context) => {
        const value = (input ?? {}) as { range?: string; directory?: string; db?: string }
        if (!RANGES.includes(value.range as Range)) {
          return context.error("db_error", `Unknown range: ${String(value.range)}`, { message: "unknown range" })
        }
        try {
          return await queryStats({ range: value.range as Range, directory: value.directory, db: value.db ?? configured })
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error)
          const path = resolveDbPath(value.db ?? configured)
          const message = `${reason} (${path})`
          return context.error("db_error", message, { message })
        }
      },
    })

    return () => void registration.dispose()
  },
})
