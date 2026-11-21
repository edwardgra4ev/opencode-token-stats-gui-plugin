import { For, Show, createSignal, onMount } from "solid-js"
import { usePlugin, type MountedSession } from "@opencode/plugin/gui"
import { TokenStats } from "../rpc.js"
import type { ModelStats, Range, StatsResult, Totals } from "../stats.js"
import type { definition } from "./definition.js"

const ranges: readonly Range[] = ["all", "today", "7d"]

const int = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })
const money = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

type State =
  | { kind: "loading" }
  | { kind: "ready"; result: StatsResult }
  | { kind: "error"; message: string }

function message(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "object" && error && "message" in error) return String(error.message)
  return String(error)
}

export function TokensView(props: { session: MountedSession }) {
  const ctx = usePlugin<typeof definition>()
  const [range, setRange] = createSignal<Range>("all")
  const [project, setProject] = createSignal(false)
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

  const totalCell = () => {
    const current = state()
    return current.kind === "ready" ? current.result.totals : undefined
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
      <td class="ts-model" title={`${row.providerID}/${row.modelID}`}>
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

      <Show when={state().kind === "ready" && (state() as { result: StatsResult }).result.rows.length === 0}>
        <div class="ts-hint">{ctx.t("state.empty")}</div>
      </Show>

      <Show when={state().kind === "ready" ? (state() as { result: StatsResult }).result : undefined}>
        {(result) => (
          <div class="ts-scroll">
            <table class="ts-table">
              <thead>
                <tr>
                  <th class="ts-model">{ctx.t("column.model")}</th>
                  <th>{ctx.t("column.msgs")}</th>
                  <th>{ctx.t("column.input")}</th>
                  <th>{ctx.t("column.output")}</th>
                  <th>{ctx.t("column.reasoning")}</th>
                  <th>{ctx.t("column.cacheRead")}</th>
                  <th>{ctx.t("column.cacheWrite")}</th>
                  <th>{ctx.t("column.total")}</th>
                  <th>{ctx.t("column.cost")}</th>
                </tr>
              </thead>
              <tbody>
                <For each={result().rows}>{(row) => <tr>{modelRow(row)}</tr>}</For>
              </tbody>
              <Show when={totalCell()}>{(totals) => <tfoot><tr class="ts-total">{totalsRow(totals())}</tr></tfoot>}</Show>
            </table>
            <div class="ts-fresh">
              {ctx.t("row.fresh", { value: int.format(result().fresh) })}
            </div>
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
.ts-scroll { overflow: auto; flex: 1; }
.ts-table { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
.ts-table th, .ts-table td { padding: 2px 6px; text-align: right; white-space: nowrap; }
.ts-table th:first-child, .ts-table td:first-child { text-align: left; }
.ts-table thead th { position: sticky; top: 0; background: var(--v2-background-bg-base, #1b1b1b); font-weight: 500; z-index: 1; }
.ts-table tbody tr:nth-child(even) { background: rgba(127,127,127,.06); }
.ts-table tfoot .ts-total td { border-top: 1px solid var(--v2-border-border-base, rgba(127,127,127,.35)); font-weight: 600; }
.ts-model { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ts-provider { color: var(--v2-text-text-muted, rgba(127,127,127,.9)); }
.ts-strong { font-weight: 600; }
.ts-fresh, .ts-hint { color: var(--v2-text-text-muted, rgba(127,127,127,.9)); }
.ts-error { color: var(--v2-red, #e5484d); }
`
