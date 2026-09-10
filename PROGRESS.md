# Meeple Map — where we are

_Last updated: 2026-09-10_

## Status: live

**https://meeple-map.francojmansilla.workers.dev** — deployed 2026-09-10 as a Cloudflare Worker with
static assets, from Franco's logged-in wrangler session (OAuth, no token needed on this machine).
Redeploy after any change: `npx wrangler deploy` from this folder. It uploads 111 files; dev files
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

## The 20 — in progress (16 of 20)

Paleo, Catan, Coffee Rush, Unstable Unicorns, Sleeping Gods, Eldritch Horror, Keep the Heroes Out!,
Décorum, Earthborne Rangers, Heroes of Barcadia, D&D: The Yawning Portal, Flamecraft, Stonesaga, Valheim: The Board Game, Casting Shadows, Not Enough Mana (2026-09-10).
The byline is just "Games I've played" — no role line, at Franco's request. Facts Franco asks to check get checked: Sleeping Gods has 13 endings (not ~20);
Keep the Heroes Out! has 20 scenarios and 3 difficulties; Décorum has 30 scenarios (20 for two, 10 for 3–4). Franco sends each game
with a long description; it gets condensed to 3–4 first-person sentences in EN and ES, keeping his
most characteristic lines and his honest complaints. Entries live in `the20` in
`data/editorial.json`:

```json
{ "slug": "paleo", "standout": "…", "standout_es": "…", "note": "…", "note_es": "…" }
```

**Every game of The 20 also goes into `games.json`** (so it can come up in the quiz and carries the
"I played this" mark in the finder). That's why the catalogue grew past 50: fifteen of his games were added; Catan was already there. Copy that mentions the size
uses `{total}`, so it updates itself. For a new game: verify the BGG id with a web search (BGG's own
search is behind a Cloudflare challenge now), players/time/age from retail listings, cover from the
Shopify retailers below, checked by eye at full size.

**Static HTML fallbacks** (what crawlers and link previews read) are generated from the EN
dictionary by `sync_fallbacks.js` (session scratchpad). Re-run it whenever EN copy or the game count changes.

**Luchi approves.** A friend of Franco's; the joke is that nobody knows who he is, so the site never
explains. Add `"luchi": true` to an entry in `the20` and a crooked pink stamp shows on that entry, on its
finder card (under "I played this") and in its dialog. Luchi approves Flamecraft, Valheim, Eldritch Horror,
Unstable Unicorns, Not Enough Mana and Heroes of Barcadia (2026-09-10).

**Quiz step 4 has two answers** (Team up / Compete), not four: Franco's call — free-for-all, teams and
hidden roles are all "against each other". "Compete" sets three finder chips at once; the finder keeps
all four, since there you're refining, not answering.

## Growing the catalogue to 100 (started 2026-09-10)

Franco asked to go from the top 50 to the top 100, ten at a time. 105 games now: the original 50, 15 from
The 20, **batch 4 (81–90)**: Small World, Marvel Champions, Unmatched, Zombicide (2nd ed.), The Witcher:
Old World, Tsuro, Harmonies, Dorfromantik, Cartographers, Lost Cities — **batch 3 (71–80)**: Deception, Werewords, The Mind, Captain Sonar, Tokaido (Stonemaier new edition),
Photosynthesis, Calico, Quoridor, Stone Age, Blood Rage — **batch 2 (61–70)**: Love Letter, Mysterium, Takenoko, Machi Koro, Century: Spice Road, Horrified,
Mansions of Madness: Second Edition, Qwirkle, Clank!, Sheriff of Nottingham (2nd ed.) — and **batch 1 (51–60)**: King of Tokyo, Exploding Kittens, Coup, Forbidden Island, Lords of
Waterdeep, Viticulture Essential Edition, Dead of Winter, Slay the Spire: The Board Game, Stardew
Valley: The Board Game, Blokus. Facts come from Board Game Bliss product pages (their body lists the BGG
id, players, time and age); covers from the Shopify retailers below, checked on rendered cards.
Video-game adaptations (Slay the Spire, Stardew Valley — and Valheim in The 20) suit the site's
premise, so the plan leans on them where the game is good. Small World was never in the first 50 — its cover was downloaded by accident from the publisher's site and
deleted as an orphan. Added in batch 4.

Still to add (proposed): 91–100 Minecraft: Builders & Biomes, Deep Rock Galactic, This War of Mine, Hues and
Cues, Sea Salt & Paper, Cthulhu: Death May Die, Wits & Wagers, Great Western Trail + two light picks. Star Wars:
Rebellion, Robinson Crusoe and Too Many Bones were dropped as too heavy for beginners (Franco agreed).
Watch the retailer's BGG id: it can point at an old edition (Mansions of Madness listed the 1st edition's).

## Animation review (2026-09-10, review-animations skill)

Applied: quiz step 320 → 220 ms; dialog backdrop fades only its tint (the 2px blur is static — animating
it repainted the page every frame); the card grid's first-paint entrance is gone (it played below the
fold, unseen); the loading shimmer moves a pseudo-element with `transform` instead of
`background-position`; game cards no longer lift on hover (shadow + border only); all hover motion lives
in one `@media (hover: hover) and (pointer: fine)` block instead of being reset for touch. Checked by
forcing :hover/:active through DevTools on desktop and touch (`motion_check.js`).

## Phone and tablet audit (2026-09-10)

`audit.js` + `cdp.js` in the session scratchpad drive headless Edge over the DevTools protocol:
8 viewports (360–1024, portrait and landscape) × EN/ES × every state (each quiz step, done panel,
finder with filters open, The 20, picks, footer, dialog). It reports sideways scroll, clipped text and
overlaps, and saves section clips. Fixed from it: difficulty bars were 0×0 everywhere (`.weight i`
needed the wrapper — quiz step 5 showed empty boxes), odd last quiz option centred, four options in one
row on tablets, The 20 note at full width on phones, landscape dialog side by side, "30–60 min" no
longer splits, shorter Spanish sort labels. All 16 combinations come back clean.

"Find my game" (nav) and "Take the quiz" (footer) go through `goQuiz()`: a finished quiz restarts at
step 1 (finder results stay until new answers replace them) and the step is centred on screen.

## Quiz anchors

Seven: Age of Empires, Among Us, Dark Souls, Stardew Valley, World of Warcraft, League of Legends,
**ARK** (survival — Paleo, Sleeping Gods, Nemesis, Stonesaga, Valheim). Franco plans more survival games; tag them
`"anchors": ["ark"]` in `games.json`. Simulator: 2,400 combinations, none empty, median 18.

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
  it should be 111.

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
