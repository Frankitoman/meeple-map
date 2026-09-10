# Meeple Map — where we are

_Last updated: 2026-09-10_

## Status: live

**https://meeple-map.francojmansilla.workers.dev** — deployed 2026-09-10 as a Cloudflare Worker with
static assets, from Franco's logged-in wrangler session (OAuth, no token needed on this machine).
Redeploy after any change: `npx wrangler deploy` from this folder. It uploads 70 files; dev files
return 404 in production (checked).

Open `index.html` through the preview server (`.claude/launch.json` → `meeple-map`, port 4173).
Browsers block `fetch()` of local JSON, so double-clicking the file shows the error state on purpose.

- **Quiz** — five steps ("What do you like to play?" → players → time → together/against → brain), back button,
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

## The 20 — in progress (15 of 20)

Paleo, Catan, Coffee Rush, Unstable Unicorns, Sleeping Gods, Eldritch Horror, Keep the Heroes Out!,
Décorum, Earthborne Rangers, Heroes of Barcadia, D&D: The Yawning Portal, Flamecraft, Stonesaga, Valheim: The Board Game, Casting Shadows (2026-09-10).
The byline is just "Games I've played" — no role line, at Franco's request. Facts Franco asks to check get checked: Sleeping Gods has 13 endings (not ~20);
Keep the Heroes Out! has 20 scenarios and 3 difficulties; Décorum has 30 scenarios (20 for two, 10 for 3–4). Franco sends each game
with a long description; it gets condensed to 3–4 first-person sentences in EN and ES, keeping his
most characteristic lines and his honest complaints. Entries live in `the20` in
`data/editorial.json`:

```json
{ "slug": "paleo", "standout": "…", "standout_es": "…", "note": "…", "note_es": "…" }
```

**Every game of The 20 also goes into `games.json`** (so it can come up in the quiz and carries the
"I played this" mark in the finder). That's why the catalogue is 64, not 50: fourteen of his games were added; Catan was already there. Copy that mentions the size
uses `{total}`, so it updates itself. For a new game: verify the BGG id with a web search (BGG's own
search is behind a Cloudflare challenge now), players/time/age from retail listings, cover from the
Shopify retailers below, checked by eye at full size.

**Static HTML fallbacks** (what crawlers and link previews read) are generated from the EN
dictionary by `sync_fallbacks.js` (session scratchpad). Re-run it whenever EN copy or the game count changes.

**Luchi approves.** A friend of Franco's; the joke is that nobody knows who he is, so the site never
explains. Add `"luchi": true` to an entry in `the20` and a crooked pink stamp shows on that entry, on its
finder card (under "I played this") and in its dialog. Built 2026-09-10, no games flagged yet — Franco
is sending the list.

**Quiz step 4 has two answers** (Team up / Compete), not four: Franco's call — free-for-all, teams and
hidden roles are all "against each other". "Compete" sets three finder chips at once; the finder keeps
all four, since there you're refining, not answering.

## Quiz anchors

Seven: Age of Empires, Among Us, Dark Souls, Stardew Valley, World of Warcraft, League of Legends,
**ARK** (survival — Paleo, Sleeping Gods, Nemesis, Stonesaga, Valheim). Franco plans more survival games; tag them
`"anchors": ["ark"]` in `games.json`. Simulator: 2,400 combinations, none empty, median 12.

## Portfolio and repo

- **Listed on tierra.dk** (2026-09-10) as the fifth name in the projects act of the hub
  (`Frankitoman/web-portfolio`, `index.html`). A fifth row overflowed that pinned one-viewport
  section, so the hub commit also re-fits it — measured at 12 viewport sizes.
- **GitHub:** https://github.com/Frankitoman/meeple-map (public, like the other project repos).
  `_source/` stays out of git (`.gitignore`); OneDrive backs it up. Deploys are still manual —
  pushing does not deploy; run `npx wrangler deploy`.
- `.assetsignore` must keep listing `.git` — for a few minutes on 2026-09-10 the `.git` folder was
  published with the site, because the repo was created after the first deploy. Nothing sensitive
  was in it (no remote, no credentials), but check the "Uploaded N files" count on every deploy:
  it should be 70.

## Languages

English and Spanish (neutral "tú", readable in Spain and Latin America). Priority: the EN/ES switch
(saved in localStorage) → `?lang=` in the URL (that visit only, and kept in the URL while filtering) →
the browser language. Browser language rather than geolocation on purpose — it's the better signal
(an Argentine in Denmark gets Spanish) and needs no server code. Tested with Edge set to es-MX and
es-ES (Spanish) and da-DK and en-US (English).

- Interface strings: `assets/js/i18n.js` — 180 keys per language, same keys in both.
- Content: `text_es` / `ref_es` on each analogy, `kind_es` / `why_es` on quiz anchors, `title_es` on
  lists. Board comparisons keep the other game's exact name, or the internal link breaks.
- Game names stay as published (Codenames, Ticket to Ride…), matching BGG.

## How the quiz decides

Steps 2–5 map onto finder chips, so the quiz can't invent a filter the finder can't show.
Step 1 (the video game) doesn't filter — it sorts, and tags matching cards "Feels like …".

If the answers leave fewer than 3 games, or none that feel like the chosen video game, the quiz
drops the **fewest answers possible** (tie-break order: brain → time → together → players) and the
results banner says which ones it dropped.

Tested against every combination — 2,400 of them since step 4 went down to two answers — with a simulator that evaluates the real
config block from `app.js`: zero dead ends, median 12 results, only 9 combinations need three
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
