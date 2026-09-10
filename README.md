# Meeple Map

**Never played a board game? Start with one you already know.**

A board game finder for complete beginners. Instead of asking about "worker placement" or "game weight", it asks what you already play — Age of Empires, Among Us, Dark Souls, Stardew Valley, World of Warcraft, League of Legends, ARK — and points you to the board games that feel like it. Every game carries a one-line comparison: *Catan is Age of Empires, but everyone shares one map and you have to ask your rivals for wood.*

**Live:** https://meeple-map.francojmansilla.workers.dev

## What's in it

- **A five-step quiz** — video game, players, time, co-op or competitive, how much thinking. It hands off to the finder with your answers already set as filters. If your answers leave too few games, it loosens the fewest answers it can and tells you which.
- **A finder** — six filter groups, search, four sort orders. Chips that would empty the list are disabled before you click them. Filter state lives in the URL, so any result can be shared.
- **105 hand-picked games** in five families: Family, Party, Strategy, Thematic, Abstract.
- **Editorial top-five lists** per family.
- **The 20** — a personal list of games I've actually played, each with the one thing it does that nothing else does.
- **English and Spanish.** The page opens in Spanish for any Spanish-language browser (Spain and Latin America alike) and in English otherwise; an EN/ES switch in the nav overrides it and is remembered. `?lang=es` forces it for a link.

## Stack

Plain HTML, CSS and JavaScript. No framework, no build step. Content lives in two JSON files:

- `data/games.json` — the games: players, time, age, difficulty, mode, and the video-game comparison
- `data/editorial.json` — quiz anchors, the category lists, and The 20
- `assets/js/i18n.js` — every interface string, in English and Spanish (content fields in the JSON carry a `_es` twin)

Hosted as a Cloudflare Worker with static assets.

## Run it locally

The page fetches its JSON, and browsers block that from `file://`. Serve the folder:

```bash
python -m http.server 4173
```

Then open http://localhost:4173.

## Deploy

```bash
npx wrangler deploy
```

`.assetsignore` keeps the dev-only files (`_*.html`, `PROGRESS.md`, the v0 draft) out of the upload.

## Where the data comes from

Player counts, times and ages are the publishers' own figures. Categories, difficulty ratings, the video-game comparisons and every list are editorial judgement — not BoardGameGeek's. This site isn't affiliated with BoardGameGeek; it links to their pages for further reading.

Cover art © the respective publishers, used to identify each game.

---

A project by [Tierra](https://tierra.dk).
