import { Plugin } from "@opencode/plugin"
import { TokenStats } from "./rpc.js"
import { queryStats, type Range } from "./stats.js"

const RANGES: readonly Range[] = ["all", "today", "7d"]

export default Plugin.define({
  id: "token-stats",
  async setup(ctx) {
    const registration = await ctx.rpc.register(TokenStats, {
      stats: async (input, context) => {
        const value = (input ?? {}) as { range?: string; directory?: string }
        if (!RANGES.includes(value.range as Range)) {
          return context.error("db_error", `Unknown range: ${String(value.range)}`, { message: "unknown range" })
        }
        try {
          return await queryStats({ range: value.range as Range, directory: value.directory })
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return context.error("db_error", message, { message })
        }
      },
    })

    return () => void registration.dispose()
  },
})
