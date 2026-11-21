import { Command, MenuItem, Panel, Plugin, Style, type PanelTab } from "@opencode/plugin/gui"
import { definition } from "./gui/definition.js"
import { TokensView, panelCss } from "./gui/panel.js"

export default Plugin.define({
  ...definition,
  setup(ctx) {
    const key = `${ctx.id}:tokens`

    const tab: PanelTab = {
      id: "tokens",
      get title() {
        return ctx.t("panel.title")
      },
      closable: "compact",
      fallback: true,
    }

    const panel: Panel = {
      id: "tokens",
      region: "side",
      width: 560,
      mobile: {
        get title() {
          return ctx.t("panel.title")
        },
        order: 60,
        kind: "menu",
        icon: "window-analytics",
      },
      list: (input) => (input.open.includes("tokens") ? [tab] : []),
      render: (props) => <TokensView session={props.session} />,
    }

    ctx.add(Panel, panel)
    ctx.add(Style, panelCss)
    ctx.add(
      MenuItem,
      (): MenuItem => {
        const session = ctx.sessions.current()
        return {
          menu: "session.panel",
          id: "open",
          title: ctx.t("menu.open"),
          icon: "window-analytics",
          keybind: `${ctx.id}.open`,
          opened: !!session && ctx.layout.state(key, session) !== "closed",
          run: () => {
            const current = ctx.sessions.current()
            if (current) ctx.layout.open(key, current)
          },
        }
      },
    )
    ctx.add(
      Command,
      (): Command => ({
        id: "open",
        title: ctx.t("command.open"),
        slash: { name: "tokens" },
        enabled: !!ctx.sessions.current(),
        run: () => {
          const session = ctx.sessions.current()
          if (session) ctx.layout.open(key, session)
        },
      }),
    )
  },
})
