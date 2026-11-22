# WORKFLOW_STATE

## Goal
Same bug as opencode-subagent-dashboard `6bf61b7`: the tokens side panel declares `width: 560`, and the app has a
stored per-panel width, so the region keeps its own size and switching sidebar tabs resizes the sidebar.

## Facts (verified in the installed Desktop app)
- Host width: `panelWidths[`${pluginId}:${panel.id}`] ?? (panel.width === "narrow" ? 320 : panel.width)`; with both
  absent it falls back to the shared `layout.session.width` (same as the other tabs).
- The app stores `{"panelWidths":{"token-stats:tokens":938.15234375}}` in
  `~/.config/ai.opencode.desktop/drafts.sqlite` (`opencode.global.dat / layout`). No API deletes it; while it exists,
  dragging writes that per-panel value instead of the shared width.
- Tab keys are `${pluginId}:${tab.id}`; the width key and the mobile view key are `${pluginId}:${panel.id}`.

## Plan
1. dev: drop `width: 560`; rename `Panel.id` `tokens` -> `tokens-side` (keeps `PanelTab.id` `tokens` and the
   `${ctx.id}:tokens` tab key), comment the reason; rebuild `dist`; CHANGELOG `Unreleased / Fixed`.
2. reviewer, then tester.
3. Commit after user confirmation.

## Status
In progress on branch `fix/sidebar-width-sync`.
