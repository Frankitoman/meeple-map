# Meeple Map — where we are

_Last updated: 2026-09-10_

## Status: live

**https://meeple-map.francojmansilla.workers.dev** — deployed 2026-09-10 as a Cloudflare Worker with
static assets, from Franco's logged-in wrangler session (OAuth, no token needed on this machine).
Redeploy after any change: `npx wrangler deploy` from this folder. It uploads 55 files; dev files
return 404 in production (checked).

Open `index.html` through the preview server (`.claude/launch.json` → `meeple-map`, port 4173).
Browsers block `fetch()` of local JSON, so double-clicking the file shows the error state on purpose.

- **Quiz** — five steps (video game → players → time → together/against → brain), back button,
  skip on every step. Hands off to the finder with the answers already set as filters.
- **Finder** — six filter groups, live search, four sort orders, removable active-filter chips,
  empty state that says *why* it's empty. Chips that would leave zero games are disabled up front.
- **Shareable results** — filter state lives in the query string (`?p=2&t=u30&a=aoe`).
  Hashes stay free for the `#finder` / `#quiz` nav links.
- **Game dialog** — opens from any card, pick row or cross-reference. "Codenames, but…" in
  Decrypto's analogy opens Codenames without touching your filters.
- **Our picks** — five category lists in a Quizlet-style carousel.
- **The 20** — renders 20 reserved slots from `data/editorial.json` until Franco's list exists.
- **50 of 50 covers**, eye-checked twice (small contact sheet, then a large-format pass).
- Responsive to 375px; on phones game cards switch to a horizontal layout.

## Waiting on Franco

**The 20.** Add entries to `the20` in `data/editorial.json`:

```json
{ "slug": "patchwork", "name": "Patchwork", "year": 2014,
  "standout": "a two-player game that fits in a lunch break",
  "note": "Two to four sentences, first person." }
```

`slug` is optional. If it matches a game in `games.json`, the cover is pulled in automatically and
that game's card in the finder gets the "Franco played this" mark. Games outside the 50 work too —
leave `slug` out and they render with an empty cover slot.

## Not done yet

- **Git repo** — not initialised; the other portfolio sites each have one on GitHub.
- **Portfolio entry** on the hub site.

## How the quiz decides

Steps 2–5 map onto finder chips, so the quiz can't invent a filter the finder can't show.
Step 1 (the video game) doesn't filter — it sorts, and tags matching cards "Feels like …".

If the answers leave fewer than 3 games, or none that feel like the chosen video game, the quiz
drops the **fewest answers possible** (tie-break order: brain → time → together → players) and the
results banner says which ones it dropped.

Tested against every combination — 3,500 of them — with a simulator that evaluates the real
config block from `app.js`: zero dead ends, median 9 results, only 56 combinations need three
answers dropped. (It was 960 with the first greedy version.) The simulator is in the session
scratchpad as `quizsim.js`; it's worth re-running after any change to filters or anchors.

## Data changes worth knowing

- **Betrayal** and **7 Wonders** point at their current in-print editions (3rd, 2022 and 2nd, 2020).
  Shops only sell those, and the covers show them, so the BGG links now match the box.
- `games.json` gained `mode` (competitive / coop / teams / hidden) and `anchors` (which quiz video
  games each game feels like). Nine games, mostly abstracts, have no anchor on purpose — there's no
  honest video-game twin for Hive.

## Covers — what finally worked

Publisher sites got 23 of 50 over two sessions. Shopify retailers got the other 27 in one pass:
`/search/suggest.json?q=…&resources[type]=product` returns titles and images, and requiring an
**exact title match** is what filters out the variants. Good sources: tabletopmerchant.com,
gamesparadise.com.au, gameology.com.au, boardgamebliss.com.

Covers are 800px WebP (~72 KB each). Originals are in `_source/covers-original/`.
On the page, `mix-blend-mode: multiply` melts the white backgrounds retailers bake into photos into
the tile colour. It can't do that for grey, so Arkham Horror's grey backdrop was flood-filled to white.

## Wrong covers caught by looking — 10 in total

Hive → **VektoRace** · Cascadia → **Ready Set Bet** · Onitama → **Europa** · Splendor → **Marvel**,
then **Duel** · Arnak → **Expedition Leaders** (the expansion) · **Codenames → Codenames XXL** ·
Pandemic, Heat, Small World → key art · Decrypto, Sky Team → component spreads.

None of them are detectable from the URL or filename. Codenames XXL also got past the first
contact sheet — the "XXL" badge is unreadable at 100px — and only showed up once the real page
rendered it at card size. **Audit covers at the size they're displayed, not as thumbnails.**

## Dev-only files (all excluded from deploy)

| File | Use |
|---|---|
| `_covers-check.html` | All 50 slots with resolution, flags missing |
| `_audit-big.html?a=0` | Ten covers at a time, large — the pass that caught Codenames XXL |
| `_source/covers-original/` | Full-size originals, for re-processing |
| `Meeple Map v0.html` | The approved v0, kept for reference |
