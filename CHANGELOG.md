# Changelog

All notable changes to this plugin are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versions use
[SemVer](https://semver.org/).

## [Unreleased]

### Fixed

- The side panel no longer asks for a width of its own, so selecting its tab leaves the sidebar at the
  shared width like the other tabs; a width an earlier version saved for the panel no longer applies.

## [0.3.0] - 2026-11-21

### Added

- Configurable database location: the `db` plugin option (`opencode.json` → `plugins` entry
  with `options`) or the `OPENCODE_DB` environment variable. `~` and paths relative to the
  OpenCode data directory are accepted.
- Platform-aware defaults: `$XDG_DATA_HOME`/`~/.local/share` on Linux, `~/Library/Application
  Support` on macOS, `%APPDATA%` on Windows; channel builds such as `opencode-dev.db` are
  detected when `opencode.db` is absent.
- The resolved database path is shown under the table and included in the error banner.

## [0.2.0] - 2026-11-21

### Added

- Sortable columns: click a header to sort, click again to reverse. The model column sorts
  alphabetically, numeric columns start descending.
- Search field filtering rows by `provider/model`; the TOTAL row and the "fresh" figure
  follow the visible rows, and a dedicated "no matches" state replaces the empty one.

## [0.1.0] - 2026-11-21

### Added

- Side panel with per-model token usage for all sessions: messages, input, output,
  reasoning, cache read/write, total and cost, plus a TOTAL row and the "fresh"
  (input+output+reasoning) figure.
- Filters: all time, today, 7 days, and an optional current-project directory filter.
- Refresh button, empty state, and an error banner when the database cannot be read.
- RPC method `token-stats.stats` served by the plugin's server part.
- Opening the panel from the side-panel `+` menu, the command palette, and `/tokens`.
- English and Russian copy.

### Notes

- Numbers match the reference aggregator `opencode-token-stats.py`: same buckets,
  totals, "fresh" figure and row order.
- Requires OpenCode Desktop 2.3.x; the GUI plugin API is experimental.
