# Changelog

All notable changes to this plugin are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versions use
[SemVer](https://semver.org/).

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
