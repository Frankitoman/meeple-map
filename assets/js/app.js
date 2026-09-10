/* Meeple Map — quiz, finder, lists and the game dialog.
   Vanilla JS, no build step. Data lives in data/games.json and data/editorial.json. */
(() => {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const CATS = {
  family:   { name: 'Family',   desc: "Easy rules, no reading required, works with people who don't play games." },
  party:    { name: 'Party',    desc: 'Loud, fast, six or more people. Nobody sits and thinks for five minutes.' },
  strategy: { name: 'Strategy', desc: 'Long games with real decisions. The ones people write spreadsheets about.' },
  thematic: { name: 'Thematic', desc: "You're a character in a story. Monsters, betrayal, campaigns." },
  abstract: { name: 'Abstract', desc: "Pure puzzle, no story. Chess's modern descendants — beautiful and mean." },
};
const WEIGHT = ['', 'Very light', 'Light', 'Medium', 'Heavy', 'Very heavy'];
const MODE = { competitive: 'Competitive', coop: 'Co-op', teams: 'Teams', hidden: 'Hidden roles' };

const overlaps = ([a, b], lo, hi) => a <= hi && b >= lo;

/* Filter groups. Within a group chips are OR'd, across groups AND'd. */
const GROUPS = [
  { key: 'p', label: 'How many people', chips: [
    { id: '1',   label: 'Solo',   test: g => g.players[0] <= 1 },
    { id: '2',   label: 'Just 2', test: g => g.players[0] <= 2 && g.players[1] >= 2 },
    { id: '3-4', label: '3–4',    test: g => g.players[0] <= 4 && g.players[1] >= 3 },
    { id: '5-6', label: '5–6',    test: g => g.players[0] <= 6 && g.players[1] >= 5 },
    { id: '7+',  label: '7+',     test: g => g.players[1] >= 7 },
  ]},
  // Overlap, not containment: a 30-minute game still counts as "about an hour",
  // and Catan's 60–90 does too. Only "Under 30" is strict — it's a promise.
  { key: 't', label: 'How long', chips: [
    { id: 'u30',   label: 'Under 30 min', test: g => g.minutes[1] <= 30 },
    { id: '30-60', label: '30–60 min',    test: g => overlaps(g.minutes, 30, 60) },
    { id: '1-2h',  label: '1–2 h',        test: g => overlaps(g.minutes, 60, 120) },
    { id: 'eve',   label: 'All evening',  test: g => g.minutes[1] >= 120 },
  ]},
  { key: 'm', label: 'Together or against', chips: [
    { id: 'coop',        label: 'Co-operative', test: g => g.mode === 'coop' },
    { id: 'competitive', label: 'Competitive',  test: g => g.mode === 'competitive' },
    { id: 'teams',       label: 'Teams',        test: g => g.mode === 'teams' },
    { id: 'hidden',      label: 'Hidden roles', test: g => g.mode === 'hidden' },
  ]},
  { key: 'b', label: 'How much brain', chips: [
    { id: 'light',  label: 'Light',  test: g => g.complexity <= 2 },
    { id: 'medium', label: 'Medium', test: g => g.complexity === 3 },
    { id: 'heavy',  label: 'Heavy',  test: g => g.complexity >= 4 },
  ]},
  { key: 'g', label: 'Good for', chips: [
    { id: 'new',  label: 'Non-gamers', test: g => g.complexity === 1 },
    { id: 'kids', label: 'Kids (8+)',  test: g => g.age <= 8 },
  ]},
  { key: 'c', label: 'Kind of game', chips: Object.entries(CATS).map(([id, c]) => (
    { id, label: c.name, test: g => g.category === id }
  ))},
];
const GROUP = Object.fromEntries(GROUPS.map(gr => [gr.key, gr]));

/* Quiz steps 2–5 map straight onto finder chips, so the quiz never
   invents a filter the finder can't show you. */
const STEPS = [
  { key: 'a', q: 'What do you already play?', hint: 'Pick the one that feels closest. There are no wrong answers.', skip: 'None of these — skip' },
  { key: 'p', q: "Who's usually playing?", options: [
    { v: ['1'],        mark: '1',   label: 'Just me',        kind: 'Solo' },
    { v: ['2'],        mark: '2',   label: 'The two of us',  kind: 'Partner, roommate' },
    { v: ['3-4'],      mark: '3–4', label: 'Three or four',  kind: 'A few friends' },
    { v: ['5-6','7+'], mark: '5+',  label: 'A big group',    kind: 'Five or more' },
  ]},
  { key: 't', q: 'How long have you got?', options: [
    { v: ['u30'],   mark: '½ h', label: 'Half an hour',       kind: 'Under 30 min' },
    { v: ['30-60'], mark: '1 h', label: 'About an hour',      kind: '30–60 min' },
    { v: ['1-2h'],  mark: '2 h', label: 'A couple of hours',  kind: '1–2 h' },
    { v: ['eve'],   mark: '3 h+', label: 'All evening',       kind: 'Bring snacks' },
  ]},
  { key: 'm', q: 'Together, or against each other?', options: [
    { v: ['coop'],        mark: 'We', label: 'Team up',               kind: 'Everyone vs the game' },
    { v: ['competitive'], mark: 'Me', label: 'Every player for themselves', kind: 'Competitive' },
    { v: ['teams'],       mark: 'vs', label: 'Split into teams',      kind: 'Team vs team' },
    { v: ['hidden'],      mark: '?',  label: 'Lie and bluff',         kind: 'Hidden roles' },
  ]},
  { key: 'b', q: 'How much thinking?', options: [
    { v: ['light'],  bars: 2, label: 'Keep it light',       kind: 'Talk while you play' },
    { v: ['medium'], bars: 3, label: 'Some thinking',       kind: 'Real decisions' },
    { v: ['heavy'],  bars: 5, label: 'Give me a challenge', kind: 'Brain hurts, in a good way' },
  ]},
];
const ANCHOR_MARK = { aoe: 'AoE', amongus: 'AU', darksouls: 'DS', stardew: 'SV', wow: 'WoW', lol: 'LoL' };
// Each video game gets a colour from the palette; steps 2–5 cycle through it.
const ANCHOR_COLOR = { aoe: '--c-strategy', amongus: '--c-party', darksouls: '--c-thematic', stardew: '--c-abstract', wow: '--sun', lol: '--c-family' };
const STEP_COLORS = ['--c-family', '--c-party', '--c-strategy', '--c-thematic'];
const RELAX_ORDER = ['b', 't', 'm', 'p'];   // least to most important for a beginner

/* ---------- State ---------- */
let games = [], bySlug = {}, editorial = {}, played = new Set();
const sel = Object.fromEntries(GROUPS.map(g => [g.key, new Set()]));
const state = { anchor: null, q: '', sort: 'easy', relaxed: [], quizDone: false };
const quiz = { step: 0, answers: {} };
let filtersOpen = false;

/* ---------- Matching ---------- */
const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
function passes(g, override) {
  for (const gr of GROUPS) {
    const set = override && override.key === gr.key ? override.set : sel[gr.key];
    if (set.size && !gr.chips.some(c => set.has(c.id) && c.test(g))) return false;
  }
  if (state.q && !norm(g.name).includes(norm(state.q))) return false;
  return true;
}
const matching = override => games.filter(g => passes(g, override));

function sorted(list) {
  const byName = (a, b) => a.name.replace(/^The /, '').localeCompare(b.name.replace(/^The /, ''));
  const easy = (a, b) => a.complexity - b.complexity || a.minutes[0] - b.minutes[0] || byName(a, b);
  const cmp = {
    match: (a, b) => (state.anchor ? (b.anchors.includes(state.anchor) - a.anchors.includes(state.anchor)) : 0) || easy(a, b),
    easy, az: byName,
    short: (a, b) => a.minutes[1] - b.minutes[1] || easy(a, b),
  }[state.sort] || easy;
  return [...list].sort(cmp);
}

/* ---------- URL state: ?p=2&t=u30&a=aoe — hashes stay free for #finder links ---------- */
function writeURL() {
  const u = new URLSearchParams();
  for (const gr of GROUPS) if (sel[gr.key].size) u.set(gr.key, [...sel[gr.key]].join(','));
  if (state.anchor) u.set('a', state.anchor);
  if (state.q) u.set('q', state.q);
  if (state.sort !== 'easy') u.set('s', state.sort);
  const qs = u.toString();
  history.replaceState(null, '', (qs ? '?' + qs : location.pathname) + location.hash);
}
function readURL() {
  const u = new URLSearchParams(location.search);
  for (const gr of GROUPS) {
    const ids = new Set(gr.chips.map(c => c.id));
    (u.get(gr.key) || '').split(',').filter(id => ids.has(id)).forEach(id => sel[gr.key].add(id));
  }
  const a = u.get('a'); if (a && editorial.anchors[a]) state.anchor = a;
  state.q = (u.get('q') || '').slice(0, 60);
  const s = u.get('s'); if (['match', 'easy', 'short', 'az'].includes(s)) state.sort = s;
  else if (state.anchor) state.sort = 'match';
}

/* ---------- Small render helpers ---------- */
const cover = (g, cls = '') => `<img class="${cls}" src="assets/covers/${g.slug}.webp" alt="Box of ${esc(g.name)}" loading="lazy" decoding="async" width="400" height="400">`;
const range = ([a, b], unit = '') => a === b ? `${a}${unit}` : `${a}–${b}${unit}`;
const players = g => g.players[0] === g.players[1] ? `${g.players[0]} player${g.players[0] > 1 ? 's' : ''}` : `${range(g.players)} players`;
const minutes = g => `${range(g.minutes)} min`;
const bars = n => `<span class="weight__bars" aria-hidden="true">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
const weight = g => `<span class="weight" title="Difficulty ${g.complexity} of 5">${bars(g.complexity)}<span class="weight__txt">${WEIGHT[g.complexity]}</span></span>`;

/* "Feels like…" — bold the thing the reader already knows; if it's another
   game on this site, make it a door into that game. */
function likeHTML(g) {
  const a = g.analogy; if (!a) return '';
  let t = esc(a.text);
  if (a.kind === 'board' && bySlug[a.ref]) {
    const ref = bySlug[a.ref], nm = esc(ref.name), i = t.indexOf(nm);
    if (i >= 0) t = `${t.slice(0, i)}<button class="like__ref" type="button" data-open="${ref.slug}">${nm}</button>${t.slice(i + nm.length)}`;
  } else {
    const keys = [a.ref, a.ref.replace(/s$/, ''), a.ref.split(' ')[0]].filter(k => k.length >= 3);
    for (const k of keys) {
      const i = t.toLowerCase().indexOf(esc(k).toLowerCase());
      if (i >= 0) { t = `${t.slice(0, i)}<b>${t.slice(i, i + esc(k).length)}</b>${t.slice(i + esc(k).length)}`; break; }
    }
  }
  return `<p class="like">${t}</p>`;
}

function cardHTML(g) {
  const feels = state.anchor && g.anchors.includes(state.anchor)
    ? `<span class="tag tag--feels">Feels like ${esc(editorial.anchors[state.anchor].name)}</span>` : '';
  return `<article class="game" id="g-${g.slug}">
    ${played.has(g.slug) ? '<span class="tag-played">I played this</span>' : ''}
    <div class="cover cover--${g.category}">${cover(g)}</div>
    <button class="game__open" type="button" data-open="${g.slug}"><span class="sr-only">Open ${esc(g.name)}</span></button>
    <div class="game__head">
      <h3 class="game__title">${esc(g.name)}</h3>
      <p class="game__meta">${g.year} · ${MODE[g.mode]}</p>
    </div>
    <div class="game__tags"><span class="tag tag--${g.category}">${CATS[g.category].name}</span>${feels}</div>
    ${likeHTML(g)}
    <p class="facts"><span>${players(g)}</span><span>${minutes(g)}</span><span>Age ${g.age}+</span></p>
    <div class="game__foot">
      ${weight(g)}
      <a class="bgg" href="https://boardgamegeek.com/boardgame/${g.bgg}" target="_blank" rel="noopener">BGG ↗</a>
    </div>
  </article>`;
}

/* ---------- Finder ---------- */
function renderGroups() {
  $('#groups').innerHTML = GROUPS.map(gr => `
    <div class="fgroup" role="group" aria-labelledby="fl-${gr.key}">
      <span class="fgroup__label" id="fl-${gr.key}">${gr.label}</span>
      <div class="chips">${gr.chips.map(c => {
        const on = sel[gr.key].has(c.id);
        // Would adding this chip leave nothing? Then say so before they click.
        const dead = !on && !matching({ key: gr.key, set: new Set([...sel[gr.key], c.id]) }).length;
        return `<button class="chip${gr.key === 'c' ? ' chip--' + c.id : ''}" type="button" data-g="${gr.key}" data-c="${c.id}" aria-pressed="${on}"${dead ? ' disabled title="No games left with this"' : ''}>${c.label}</button>`;
      }).join('')}</div>
    </div>`).join('');
}

function renderActive() {
  const bits = [];
  if (state.q) bits.push(`<button class="chip chip--x" type="button" data-x="q">“${esc(state.q)}”</button>`);
  for (const gr of GROUPS) for (const id of sel[gr.key]) {
    const c = gr.chips.find(c => c.id === id);
    bits.push(`<button class="chip chip--x" type="button" data-x="${gr.key}:${id}" aria-label="Remove ${esc(c.label)}">${esc(c.label)}</button>`);
  }
  $('#active').innerHTML = bits.join('');
  const n = bits.length;
  $('#clear').disabled = !n && !state.anchor;
  $('#filters-toggle').textContent = n ? `Filters (${n})` : 'Filters';
}

function feelsCount(an) {
  const n = matching().filter(g => g.anchors.includes(state.anchor)).length;
  if (!n) return `Nothing here feels much like ${esc(an.name)} with these filters — loosen one and they'll show up.`;
  return n === 1 ? 'The one that feels most like it comes first.' : `The ${n} that feel most like it come first.`;
}
function renderBecause() {
  const el = $('#because');
  if (!state.anchor && !state.quizDone) { el.innerHTML = ''; return; }
  const an = state.anchor && editorial.anchors[state.anchor];
  const loose = state.relaxed.length
    ? `<span class="because__loose">We loosened “${state.relaxed.map(k => GROUP[k].label.toLowerCase()).join('” and “')}” so you'd have more than a couple to choose from.</span>` : '';
  el.innerHTML = `<div class="because">
    <p class="because__txt">${an
      ? `Because <b>you play ${esc(an.name)}</b> — ${esc(an.why)}. ${feelsCount(an)}`
      : '<b>Based on your answers.</b> Easiest games first.'}${loose}</p>
    <button class="chip" type="button" data-reset-quiz>Start over</button>
  </div>`;
}

function renderGrid() {
  const list = sorted(matching());
  const total = games.length;
  $('#count').innerHTML = list.length === total
    ? `<b>${total}</b> games`
    : `<b>${list.length}</b> of ${total} games match`;
  if (!list.length) {
    const notOnShelf = state.q && !games.some(g => norm(g.name).includes(norm(state.q)));
    $('#grid').innerHTML = `<div class="empty" style="grid-column:1/-1">
      ${notOnShelf
        ? `<h3>“${esc(state.q)}” isn't on our shelf</h3>
      <p>We keep this list to 50 games we'd hand to a beginner. Try another name, or clear the search and browse.</p>`
        : `<h3>Nothing fits all of that</h3>
      <p>No game on our shelf ticks every box you've picked. Drop one of these and see what comes back.</p>`}
      <div class="chips">${$('#active').innerHTML}</div>
      <button class="btn btn--ghost btn--sm" type="button" data-clear>Clear all filters</button>
    </div>`;
    return;
  }
  $('#grid').innerHTML = list.map(cardHTML).join('');
}

function renderFinder() {
  renderGroups(); renderActive(); renderBecause(); renderGrid();
  $('#sort').value = state.sort;
  writeURL();
}

function clearAll() {
  for (const k in sel) sel[k].clear();
  state.q = ''; state.anchor = null; state.relaxed = []; state.quizDone = false;
  if (state.sort === 'match') state.sort = 'easy';
  $('#search').value = '';
}

/* ---------- Quiz ---------- */
function optHTML(o, i) {
  const mark = o.bars ? `<span class="weight__bars" style="transform:scale(1.9)">${bars(o.bars).replace(/^<span[^>]*>|<\/span>$/g, '')}</span>` : esc(o.mark);
  return `<button class="opt" type="button" data-opt="${i}" style="--c:var(${o.color || STEP_COLORS[i % STEP_COLORS.length]})">
    <span class="opt__mark" aria-hidden="true">${mark}</span>
    <span class="opt__name">${esc(o.label)}</span>
    <span class="opt__kind">${esc(o.kind)}</span>
  </button>`;
}
function stepOptions(step) {
  if (step.key !== 'a') return step.options;
  return Object.entries(editorial.anchors).map(([k, a]) => ({ v: k, mark: ANCHOR_MARK[k] || a.name[0], label: a.name, kind: a.kind, color: ANCHOR_COLOR[k] }));
}
function renderQuiz() {
  const el = $('#quiz');
  if (state.quizDone) {
    const n = matching().length, an = state.anchor && editorial.anchors[state.anchor];
    el.innerHTML = `<div class="quiz__done quiz__step">
      <span class="quiz__label">Done</span>
      <h2>${n} game${n === 1 ? '' : 's'} for you${an ? `, starting with the ones that feel like ${esc(an.name)}` : ''}.</h2>
      <p>They're in the finder below, with your answers already filled in. Change anything you like.</p>
      <div class="btns">
        <a class="btn btn--primary" href="#finder">See my games</a>
        <button class="btn btn--ghost" type="button" data-reset-quiz>Start over</button>
      </div>
    </div>`;
    return;
  }
  const step = STEPS[quiz.step], opts = stepOptions(step), n = opts.length;
  const w = n >= 6 ? 980 : n * 190;
  el.innerHTML = `<div class="quiz__step" style="--n:${n};--w:${w}px">
    <div class="quiz__head">
      ${quiz.step ? '<button class="quiz__back" type="button" data-back>← Back</button>' : ''}
      <div class="quiz__top">
        <span class="quiz__label">Step ${quiz.step + 1} of ${STEPS.length}</span>
        <span class="quiz__dots" aria-hidden="true">${STEPS.map((_, i) => `<i class="${i <= quiz.step ? 'on' : ''}"></i>`).join('')}</span>
      </div>
      <h2 class="quiz__q">${esc(step.q)}</h2>
      ${step.hint ? `<p class="quiz__hint">${esc(step.hint)}</p>` : ''}
    </div>
    <div class="quiz__grid">${opts.map(optHTML).join('')}</div>
    <button class="link-btn quiz__skip" type="button" data-skip>${esc(step.skip || "Doesn't matter — skip")}</button>
  </div>`;
}
function answer(value) {
  quiz.answers[STEPS[quiz.step].key] = value;
  if (quiz.step < STEPS.length - 1) { quiz.step++; renderQuiz(); focusQuiz(); return; }
  finishQuiz();
}
function focusQuiz() { const b = $('#quiz .opt'); if (b) b.focus({ preventScroll: true }); }

function finishQuiz() {
  for (const k in sel) sel[k].clear();
  state.q = ''; $('#search').value = '';
  state.anchor = quiz.answers.a || null;
  for (const k of ['p', 't', 'm', 'b']) (quiz.answers[k] || []).forEach(id => sel[k].add(id));
  // Loosen the least important answers until there's a real choice — and say which.
  // The video game is the question the whole site hangs on, so it has to show up
  // in the results: at least one game that actually feels like it.
  const enough = () => {
    const m = matching();
    return m.length >= 3 && (!state.anchor || m.some(g => g.anchors.includes(state.anchor)));
  };
  // Drop the fewest answers possible; RELAX_ORDER only breaks ties.
  state.relaxed = [];
  const answered = RELAX_ORDER.filter(k => sel[k].size);
  const saved = Object.fromEntries(answered.map(k => [k, new Set(sel[k])]));
  const combos = size => size === 0 ? [[]] : answered.flatMap((k, i) =>
    combos(size - 1).filter(c => c.every(x => answered.indexOf(x) > i)).map(c => [k, ...c]));
  outer: for (let size = 0; size <= answered.length; size++) {
    for (const drop of combos(size)) {
      answered.forEach(k => { sel[k] = new Set(drop.includes(k) ? [] : saved[k]); });
      if (enough()) { state.relaxed = drop; break outer; }
    }
  }
  state.sort = 'match'; state.quizDone = true;
  renderQuiz(); renderFinder();
  scrollToEl($('#finder'));
}
function resetQuiz() {
  quiz.step = 0; quiz.answers = {};
  clearAll(); renderQuiz(); renderFinder();
  scrollToEl($('#quiz'));
}

function scrollToEl(el) {
  const navH = $('.nav').offsetHeight;
  window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - navH - 16, behavior: reduceMotion ? 'auto' : 'smooth' });
}

/* ---------- Categories, picks, The 20 ---------- */
function renderCats() {
  const count = c => games.filter(g => g.category === c).length;
  $('#cats').innerHTML = Object.entries(CATS).map(([id, c]) => `
    <button class="cat cat--${id}" type="button" data-cat="${id}">
      <div><div class="cat__title">${c.name}</div><p class="cat__desc">${c.desc}</p></div>
      <div class="cat__panel"><span>${count(id)} games</span><span>Browse →</span></div>
    </button>`).join('');
  $('#foot-cats').innerHTML = Object.entries(CATS).map(([id, c]) =>
    `<li><button class="link-btn" type="button" data-cat="${id}">${c.name}</button></li>`).join('');
}
function showCategory(id) {
  sel.c.clear(); sel.c.add(id);
  renderFinder(); scrollToEl($('#finder'));
}

function renderPicks() {
  $('#picks-list').innerHTML = editorial.picks.map(p => {
    const gs = p.games.map(s => bySlug[s]).filter(Boolean);
    return `<div class="pick pick--${p.category}">
      <h3>${esc(p.title)}</h3>
      <p class="pick__note">Top ${gs.length} · ${CATS[p.category].name}</p>
      <div class="pick__panel"><ol class="pick__list">${gs.map((g, i) => `<li class="pick__item">
        <button class="pick__row" type="button" data-open="${g.slug}">
          <span class="pick__n">${String(i + 1).padStart(2, '0')}</span>
          <span class="pick__thumb cover--${g.category}">${cover(g)}</span>
          <span><span class="pick__name">${esc(g.name)}</span><br><span class="pick__sub">${players(g)} · ${minutes(g)}</span></span>
        </button></li>`).join('')}</ol>
      <button class="link-btn pick__all" type="button" data-cat="${p.category}">All ${count(p.category)} ${CATS[p.category].name.toLowerCase()} games →</button></div>
    </div>`;
  }).join('');
  function count(c) { return games.filter(g => g.category === c).length; }
  const list = $('#picks-list'), prev = $('#picks-prev'), next = $('#picks-next');
  const sync = () => {
    prev.disabled = list.scrollLeft < 8;
    next.disabled = list.scrollLeft + list.clientWidth >= list.scrollWidth - 8;
  };
  const step = dir => list.scrollBy({ left: dir * (list.querySelector('.pick').offsetWidth + 24), behavior: reduceMotion ? 'auto' : 'smooth' });
  prev.onclick = () => step(-1); next.onclick = () => step(1);
  list.addEventListener('scroll', sync, { passive: true });
  addEventListener('resize', sync); sync();
}

function renderThe20() {
  const entries = (editorial.the20 || []).slice(0, 20);
  played = new Set(entries.map(e => e.slug).filter(s => bySlug[s]));
  const rec = (e, i) => {
    const g = e.slug && bySlug[e.slug];
    return `<article class="rec">
      <div class="rec__n">${String(i + 1).padStart(2, '0')}</div>
      <div class="rec__cover">${g ? cover(g) : ''}</div>
      <div>
        <h3 class="rec__title">${esc(e.name || (g && g.name) || '')}</h3>
        <p class="rec__meta">${esc(e.year || (g && g.year) || '')}</p>
        ${e.standout ? `<span class="standout">Stands out for: ${esc(e.standout)}</span>` : ''}
        ${e.note ? `<p class="rec__note">${esc(e.note)}</p>` : ''}
      </div>
    </article>`;
  };
  const example = i => `<article class="rec">
      <div class="rec__n">${String(i + 1).padStart(2, '0')}</div>
      <div class="rec__cover" aria-hidden="true"></div>
      <div>
        <h3 class="rec__title">Coming soon</h3>
        <p class="rec__meta">Reserved for one of my twenty</p>
        <span class="standout">Stands out for: the one thing</span>
        <p class="rec__note rec__note--empty">${i === 0
          ? "Why I play it, what I think about it, and what it does that nothing else does."
          : "What I think — coming soon."}</p>
      </div>
    </article>`;
  const shown = entries.length ? entries.map(rec) : [example(0), example(1)];
  const from = shown.length;
  const slots = Array.from({ length: 20 - from }, (_, i) =>
    `<div class="slot"><span class="slot__n">${String(from + i + 1).padStart(2, '0')}</span><span class="slot__txt">Reserved</span></div>`);
  $('#the20').innerHTML = `<div class="twenty">${shown.join('')}</div>${slots.length ? `<div class="slots">${slots.join('')}</div>` : ''}`;
}

/* ---------- Dialog ---------- */
const dlg = $('#dlg');
function openGame(slug) {
  const g = bySlug[slug]; if (!g) return;
  dlg.innerHTML = `
    <button class="dlg__x" type="button" data-close aria-label="Close">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M1 1l10 10M11 1 1 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
    </button>
    <div class="dlg__in">
      <div class="dlg__cover cover--${g.category}">${cover(g).replace('loading="lazy"', 'loading="eager"')}</div>
      <div>
        <div class="game__tags"><span class="tag tag--${g.category}">${CATS[g.category].name}</span><span class="tag tag--feels">${MODE[g.mode]}</span></div>
        <h2 id="dlg-title" style="margin-top:12px">${esc(g.name)}</h2>
        <p class="dlg__meta">${g.year}${played.has(g.slug) ? ' · <span class="tag-played">I played this</span>' : ''}</p>
        ${likeHTML(g)}
        <dl class="dlg__facts">
          <div class="fact"><dt>Players</dt><dd>${range(g.players)}</dd></div>
          <div class="fact"><dt>Time</dt><dd>${minutes(g)}</dd></div>
          <div class="fact"><dt>Age</dt><dd>${g.age}+</dd></div>
          <div class="fact"><dt>Difficulty</dt><dd>${weight(g)}</dd></div>
        </dl>
        <div class="dlg__cta">
          <a class="btn btn--primary" href="https://boardgamegeek.com/boardgame/${g.bgg}" target="_blank" rel="noopener">Read more on BGG ↗</a>
        </div>
      </div>
    </div>`;
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
}

/* ---------- Events (delegated) ---------- */
function onClick(e) {
  const t = e.target.closest('button, a'); if (!t) return;
  const d = t.dataset;
  if (d.open) { openGame(d.open); return; }
  if (d.close !== undefined) { dlg.close(); return; }
  if (d.g) {                                         // filter chip
    const set = sel[d.g]; set.has(d.c) ? set.delete(d.c) : set.add(d.c);
    state.relaxed = state.relaxed.filter(k => k !== d.g);
    renderFinder(); return;
  }
  if (d.x) {                                         // remove an active chip
    if (d.x === 'q') { state.q = ''; $('#search').value = ''; }
    else { const [k, id] = d.x.split(':'); sel[k].delete(id); }
    renderFinder(); return;
  }
  if (d.clear !== undefined || t.id === 'clear') { clearAll(); quiz.step = 0; quiz.answers = {}; renderQuiz(); renderFinder(); return; }
  if (d.cat) { if (dlg.open) dlg.close(); showCategory(d.cat); return; }
  if (d.opt !== undefined) {
    const step = STEPS[quiz.step], o = stepOptions(step)[+d.opt];
    answer(o.v); return;
  }
  if (d.skip !== undefined) { answer(STEPS[quiz.step].key === 'a' ? null : []); return; }
  if (d.back !== undefined) { quiz.step = Math.max(0, quiz.step - 1); renderQuiz(); focusQuiz(); return; }
  if (d.resetQuiz !== undefined) { resetQuiz(); return; }
  if (t.getAttribute('href') === '#finder' && state.quizDone) { e.preventDefault(); scrollToEl($('#finder')); }
}

function bind() {
  document.addEventListener('click', onClick);
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });   // backdrop
  $('#sort').addEventListener('change', e => { state.sort = e.target.value; renderFinder(); });
  let tmr;
  $('#search').addEventListener('input', e => {
    clearTimeout(tmr);
    tmr = setTimeout(() => { state.q = e.target.value.trim().slice(0, 60); renderFinder(); }, 120);
  });
  $('#search').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); state.q = e.target.value.trim().slice(0, 60); renderFinder(); scrollToEl($('#finder')); }
  });
  const mq = matchMedia('(max-width: 900px)');
  const syncFilters = () => {
    $('#filters').hidden = mq.matches && !filtersOpen;
    $('#filters-toggle').setAttribute('aria-expanded', String(mq.matches ? filtersOpen : true));
  };
  $('#filters-toggle').addEventListener('click', () => { filtersOpen = !filtersOpen; syncFilters(); });
  mq.addEventListener('change', syncFilters); syncFilters();
}

/* ---------- Boot ---------- */
async function boot() {
  try {
    const [gd, ed] = await Promise.all(['data/games.json', 'data/editorial.json'].map(u =>
      fetch(u).then(r => { if (!r.ok) throw new Error(`${u}: ${r.status}`); return r.json(); })));
    games = gd.games; editorial = ed;
    bySlug = Object.fromEntries(games.map(g => [g.slug, g]));
  } catch (err) {
    console.error(err);
    $('#grid').innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>The games didn't load</h3>
      <p>Something went wrong fetching the list. If you opened this file straight from your computer, serve the folder instead — browsers block local data files.</p>
      <button class="btn btn--ghost btn--sm" type="button" onclick="location.reload()">Try again</button></div>`;
    $('#count').textContent = '';
    $('#quiz').innerHTML = '';
    return;
  }
  readURL();
  if (state.q) $('#search').value = state.q;
  renderThe20();      // before cards: sets which games carry the "played" mark
  renderCats(); renderPicks(); renderQuiz(); renderFinder();
  bind();
}
boot();
})();
