import { For, Show, createMemo, createSignal, onMount } from "solid-js"
import { usePlugin, type MountedSession } from "@opencode/plugin/gui"
import { TokenStats } from "../rpc.js"
import type { ModelStats, Range, StatsResult, Totals } from "../stats.js"
import type { definition } from "./definition.js"

const ranges: readonly Range[] = ["all", "today", "7d"]

const int = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })
const money = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

type NumericKey = "msgs" | "input" | "output" | "reasoning" | "cacheRead" | "cacheWrite" | "total" | "cost"
type SortKey = "model" | NumericKey
type Sort = { key: SortKey; dir: "asc" | "desc" }

type State =
  | { kind: "loading" }
  | { kind: "ready"; result: StatsResult }
  | { kind: "error"; message: string }

function message(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "object" && error && "message" in error) return String(error.message)
  return String(error)
}

const label = (row: ModelStats) => `${row.providerID}/${row.modelID}`

export function TokensView(props: { session: MountedSession }) {
  const ctx = usePlugin<typeof definition>()
  const [range, setRange] = createSignal<Range>("all")
  const [project, setProject] = createSignal(false)
  const [search, setSearch] = createSignal("")
  const [sort, setSort] = createSignal<Sort>()
  const [state, setState] = createSignal<State>({ kind: "loading" })
  let seq = 0

  async function load() {
    const id = ++seq
    setState({ kind: "loading" })
    try {
      const result = (await ctx.client.rpc(TokenStats).stats({
        range: range(),
        ...(project() ? { directory: props.session.directory } : {}),
      })) as StatsResult
      if (id === seq) setState({ kind: "ready", result })
    } catch (error) {
      if (id === seq) setState({ kind: "error", message: message(error) })
    }
  }

  onMount(() => void load())

  const result = () => {
    const current = state()
    return current.kind === "ready" ? current.result : undefined
  }

  // Visible rows: search filter, then the chosen sort; totals follow what is shown.
  const view = createMemo(() => {
    const current = result()
    if (!current) return undefined
    const query = search().trim().toLowerCase()
    const rows = query
      ? current.rows.filter((row) => label(row).toLowerCase().includes(query))
      : current.rows.slice()

    const order = sort()
    if (order) {
      const sign = order.dir === "asc" ? 1 : -1
      rows.sort((a, b) =>
        order.key === "model" ? sign * label(a).localeCompare(label(b)) : sign * (a[order.key] - b[order.key]),
      )
    }

    const totals: Totals = { msgs: 0, input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0, total: 0, cost: 0 }
    for (const row of rows) {
      totals.msgs += row.msgs
      totals.input += row.input
      totals.output += row.output
      totals.reasoning += row.reasoning
      totals.cacheRead += row.cacheRead
      totals.cacheWrite += row.cacheWrite
      totals.total += row.total
      totals.cost += row.cost
    }
    return { rows, totals, fresh: totals.input + totals.output + totals.reasoning }
  })

  function toggleSort(key: SortKey) {
    const current = sort()
    setSort({
      key,
      dir: current?.key === key ? (current.dir === "asc" ? "desc" : "asc") : key === "model" ? "asc" : "desc",
    })
  }

  const columns = (): { key: SortKey; title: string }[] => [
    { key: "model", title: ctx.t("column.model") },
    { key: "msgs", title: ctx.t("column.msgs") },
    { key: "input", title: ctx.t("column.input") },
    { key: "output", title: ctx.t("column.output") },
    { key: "reasoning", title: ctx.t("column.reasoning") },
    { key: "cacheRead", title: ctx.t("column.cacheRead") },
    { key: "cacheWrite", title: ctx.t("column.cacheWrite") },
    { key: "total", title: ctx.t("column.total") },
    { key: "cost", title: ctx.t("column.cost") },
  ]

  const ariaSort = (key: SortKey) => {
    const current = sort()
    if (!current || current.key !== key) return "none" as const
    return current.dir === "asc" ? ("ascending" as const) : ("descending" as const)
  }

  const totalsRow = (totals: Totals) => (
    <>
      <td class="ts-model">{ctx.t("row.total")}</td>
      <td>{int.format(totals.msgs)}</td>
      <td>{int.format(totals.input)}</td>
      <td>{int.format(totals.output)}</td>
      <td>{int.format(totals.reasoning)}</td>
      <td>{int.format(totals.cacheRead)}</td>
      <td>{int.format(totals.cacheWrite)}</td>
      <td>{int.format(totals.total)}</td>
      <td>{money.format(totals.cost)}</td>
    </>
  )

  const modelRow = (row: ModelStats) => (
    <>
      <td class="ts-model" title={label(row)}>
        <span class="ts-provider">{row.providerID}/</span>
        {row.modelID}
      </td>
      <td>{int.format(row.msgs)}</td>
      <td>{int.format(row.input)}</td>
      <td>{int.format(row.output)}</td>
      <td>{int.format(row.reasoning)}</td>
      <td>{int.format(row.cacheRead)}</td>
      <td>{int.format(row.cacheWrite)}</td>
      <td class="ts-strong">{int.format(row.total)}</td>
      <td>{money.format(row.cost)}</td>
    </>
  )

  return (
    <div class="ts-root">
      <div class="ts-toolbar">
        <ctx.ui.Select
          label={ctx.t("range.label")}
          options={ranges.map((value) => ({ value, label: ctx.t(`range.${value}`) }))}
          value={range()}
          onChange={(value) => {
            setRange(value)
            void load()
          }}
        />
        <span class="ts-switch">
          <ctx.ui.Switch
            label={ctx.t("filter.project")}
            hideLabel
            checked={project()}
            onChange={(checked) => {
              setProject(checked)
              void load()
            }}
          />
          {ctx.t("filter.project")}
        </span>
        <ctx.ui.TextInput
          class="ts-search"
          type="search"
          label={ctx.t("filter.search")}
          placeholder={ctx.t("filter.search")}
          value={search()}
          onInput={setSearch}
        />
        <ctx.ui.Button
          variant="neutral"
          size="small"
          icon="refresh"
          disabled={state().kind === "loading"}
          onClick={() => void load()}
        >
          {ctx.t("action.refresh")}
        </ctx.ui.Button>
      </div>

      <Show when={state().kind === "error" ? (state() as { message: string }).message : undefined}>
        {(text) => <div class="ts-error">{ctx.t("state.error", { message: text() })}</div>}
      </Show>

      <Show when={state().kind === "loading"}>
        <div class="ts-hint">{ctx.t("state.loading")}</div>
      </Show>

      <Show when={result() && view()?.rows.length === 0}>
        <div class="ts-hint">{result()!.rows.length === 0 ? ctx.t("state.empty") : ctx.t("state.noMatch")}</div>
      </Show>

      <Show when={view()?.rows.length ? view() : undefined}>
        {(shown) => (
          <div class="ts-scroll">
            <table class="ts-table">
              <thead>
                <tr>
                  <For each={columns()}>
                    {(column) => (
                      <th class={column.key === "model" ? "ts-model" : undefined} aria-sort={ariaSort(column.key)}>
                        <button class="ts-sort" onClick={() => toggleSort(column.key)}>
                          {column.title}
                          <Show when={sort()?.key === column.key}>
                            <span class="ts-arrow">{sort()!.dir === "asc" ? "▲" : "▼"}</span>
                          </Show>
                        </button>
                      </th>
                    )}
                  </For>
                </tr>
              </thead>
              <tbody>
                <For each={shown().rows}>{(row) => <tr>{modelRow(row)}</tr>}</For>
              </tbody>
              <tfoot>
                <tr class="ts-total">{totalsRow(shown().totals)}</tr>
              </tfoot>
            </table>
            <div class="ts-fresh">{ctx.t("row.fresh", { value: int.format(shown().fresh) })}</div>
          </div>
        )}
      </Show>
    </div>
  )
}

export const panelCss = `
.ts-root { display: flex; flex-direction: column; gap: 8px; height: 100%; padding: 8px; font-size: 12px; }
.ts-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ts-switch { display: inline-flex; align-items: center; gap: 6px; }
.ts-search { width: 170px; }
.ts-scroll { overflow: auto; flex: 1; }
.ts-table { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
.ts-table th, .ts-table td { padding: 2px 6px; text-align: right; white-space: nowrap; }
.ts-table th:first-child, .ts-table td:first-child { text-align: left; }
.ts-table thead th { position: sticky; top: 0; background: var(--v2-background-bg-base, #1b1b1b); font-weight: 500; z-index: 1; }
.ts-sort { all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: 2px; }
.ts-table th:not(:first-child) .ts-sort { justify-content: flex-end; }
.ts-sort:hover, .ts-sort:focus-visible { color: var(--v2-text-text-base, inherit); }
.ts-arrow { font-size: 9px; opacity: .8; }
.ts-table tbody tr:nth-child(even) { background: rgba(127,127,127,.06); }
.ts-table tfoot .ts-total td { border-top: 1px solid var(--v2-border-border-base, rgba(127,127,127,.35)); font-weight: 600; }
.ts-model { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ts-provider { color: var(--v2-text-text-muted, rgba(127,127,127,.9)); }
.ts-strong { font-weight: 600; }
.ts-fresh, .ts-hint { color: var(--v2-text-text-muted, rgba(127,127,127,.9)); }
.ts-error { color: var(--v2-red, #e5484d); }
`
