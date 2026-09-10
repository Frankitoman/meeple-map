/* Meeple Map — quiz, finder, lists and the game dialog, in English and Spanish.
   Vanilla JS, no build step. Data lives in data/games.json and data/editorial.json;
   interface strings in assets/js/i18n.js. */
(() => {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Config below is language-free — ids only. Labels come from t(). The quiz
   simulator evaluates this block verbatim, so keep it self-contained. */
const CATS = ['family', 'party', 'strategy', 'thematic', 'abstract'];
const overlaps = ([a, b], lo, hi) => a <= hi && b >= lo;

/* Filter groups. Within a group chips are OR'd, across groups AND'd. */
const GROUPS = [
  { key: 'p', chips: [
    { id: '1',   test: g => g.players[0] <= 1 },
    { id: '2',   test: g => g.players[0] <= 2 && g.players[1] >= 2 },
    { id: '3-4', test: g => g.players[0] <= 4 && g.players[1] >= 3 },
    { id: '5-6', test: g => g.players[0] <= 6 && g.players[1] >= 5 },
    { id: '7+',  test: g => g.players[1] >= 7 },
  ]},
  // Overlap, not containment: a 30-minute game still counts as "about an hour",
  // and Catan's 60–90 does too. Only "Under 30" is strict — it's a promise.
  { key: 't', chips: [
    { id: 'u30',   test: g => g.minutes[1] <= 30 },
    { id: '30-60', test: g => overlaps(g.minutes, 30, 60) },
    { id: '1-2h',  test: g => overlaps(g.minutes, 60, 120) },
    { id: 'eve',   test: g => g.minutes[1] >= 120 },
  ]},
  { key: 'm', chips: [
    { id: 'coop',        test: g => g.mode === 'coop' },
    { id: 'competitive', test: g => g.mode === 'competitive' },
    { id: 'teams',       test: g => g.mode === 'teams' },
    { id: 'hidden',      test: g => g.mode === 'hidden' },
  ]},
  { key: 'b', chips: [
    { id: 'light',  test: g => g.complexity <= 2 },
    { id: 'medium', test: g => g.complexity === 3 },
    { id: 'heavy',  test: g => g.complexity >= 4 },
  ]},
  { key: 'g', chips: [
    { id: 'new',  test: g => g.complexity === 1 },
    { id: 'kids', test: g => g.age <= 8 },
  ]},
  { key: 'c', chips: CATS.map(id => ({ id, test: g => g.category === id })) },
];
const GROUP = Object.fromEntries(GROUPS.map(gr => [gr.key, gr]));

/* Quiz steps 2–5 map straight onto finder chips, so the quiz never
   invents a filter the finder can't show you. Labels: 'opt.<key>.<i>' in i18n.js. */
const STEPS = [
  { key: 'a' },
  { key: 'p', options: [ { v: ['1'], mark: '1' }, { v: ['2'], mark: '2' }, { v: ['3-4'], mark: '3–4' }, { v: ['5-6', '7+'], mark: '5+' } ]},
  { key: 't', options: [ { v: ['u30'], mark: '½ h' }, { v: ['30-60'], mark: '1 h' }, { v: ['1-2h'], mark: '2 h' }, { v: ['eve'], mark: '3 h+' } ]},
  // Two answers, not four: free-for-all, teams and hidden roles are all "against each other".
  { key: 'm', options: [ { v: ['coop'], mark: 'We' }, { v: ['competitive', 'teams', 'hidden'], mark: 'vs' } ]},
  { key: 'b', options: [ { v: ['light'], bars: 2 }, { v: ['medium'], bars: 3 }, { v: ['heavy'], bars: 5 } ]},
];
const ANCHOR_MARK = { aoe: 'AoE', amongus: 'AU', darksouls: 'DS', stardew: 'SV', wow: 'WoW', lol: 'LoL', ark: 'ARK' };
// Each video game gets a colour from the palette; steps 2–5 cycle through it.
const ANCHOR_COLOR = { aoe: '--c-strategy', amongus: '--c-party', darksouls: '--c-thematic', stardew: '--c-abstract', wow: '--sun', lol: '--c-family', ark: '--c-survival' };
const STEP_COLORS = ['--c-family', '--c-party', '--c-strategy', '--c-thematic'];
const RELAX_ORDER = ['b', 't', 'm', 'p'];   // least to most important for a beginner

/* ---------- State ---------- */
let games = [], bySlug = {}, editorial = {}, played = new Set(), luchi = new Set();
const sel = Object.fromEntries(GROUPS.map(g => [g.key, new Set()]));
const state = { anchor: null, q: '', sort: 'easy', relaxed: [], quizDone: false };
const quiz = { step: 0, answers: {} };
let filtersOpen = false, openSlug = null;

/* ---------- Language ----------
   1. an explicit choice (the EN/ES switch, remembered)
   2. ?lang=es in the link (for this visit only)
   3. the browser's language: any Spanish variant → Spanish, everything else → English.
   Browser language beats location: an Argentine in Denmark gets Spanish,
   an English tourist in Madrid gets English. */
const I18N = window.MM_I18N || { en: {} };
const LANGS = ['en', 'es'];
const STORE = 'meeplemap.lang';
let lang = 'en', langInURL = false;   // ?lang= links keep their language while you filter
const t = (k, v = {}) => { v = { total: games.length || '', ...v };
  return String(I18N[lang]?.[k] ?? I18N.en[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? ''); };
const L = (obj, f) => (lang !== 'en' && obj[`${f}_${lang}`]) || obj[f];   // localized data field

function detectLang() {
  const p = new URLSearchParams(location.search).get('lang');
  if (LANGS.includes(p)) { langInURL = true; return p; }
  try { const s = localStorage.getItem(STORE); if (LANGS.includes(s)) return s; } catch (e) { /* storage blocked */ }
  const prefs = navigator.languages?.length ? navigator.languages : [navigator.language || 'en'];
  for (const l of prefs) { const base = String(l).toLowerCase().split('-')[0]; if (LANGS.includes(base)) return base; }
  return 'en';
}
function applyStatic() {
  document.documentElement.lang = lang;
  document.title = t('meta.title');
  $('meta[name="description"]')?.setAttribute('content', t('meta.desc'));
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });   // our own strings only
  document.querySelectorAll('[data-i18n-attr]').forEach(el => el.dataset.i18nAttr.split(',').forEach(pair => {
    const [attr, key] = pair.split(':'); el.setAttribute(attr.trim(), t(key.trim()));
  }));
  document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
}
function setLang(l, remember) {
  if (!LANGS.includes(l) || l === lang) return;
  lang = l;
  if (remember) { langInURL = false; try { localStorage.setItem(STORE, l); } catch (e) { /* storage blocked */ } }
  applyStatic();
  renderThe20(); renderCats(); renderPicks(); renderQuiz(); renderFinder();
  if (dlg.open && openSlug) openGame(openSlug);
}

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
  if (langInURL) u.set('lang', lang);
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
const chipLabel = (key, id) => key === 'c' ? t(`cat.${id}`) : t(`chip.${id}`);
const cover = g => `<img src="assets/covers/${g.slug}.webp" alt="${esc(t('card.box', { x: g.name }))}" loading="lazy" decoding="async" width="400" height="400">`;
const range = ([a, b]) => a === b ? `${a}` : `${a}–${b}`;
const players = g => g.players[0] === g.players[1]
  ? t(g.players[0] === 1 ? 'card.player1' : 'card.playersSame', { n: g.players[0] })
  : t('card.players', { a: g.players[0], b: g.players[1] });
const minutes = g => `${range(g.minutes)} ${t('card.min')}`;
const bars = n => `<span class="weight__bars" aria-hidden="true">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
const weight = g => `<span class="weight" title="${esc(t('weight.title', { n: g.complexity }))}">${bars(g.complexity)}<span class="weight__txt">${t(`weight.${g.complexity}`)}</span></span>`;

/* "Feels like…" — bold the thing the reader already knows; if it's another
   game on this site, make it a door into that game. */
function likeHTML(g) {
  const a = g.analogy; if (!a) return '';
  let s = esc(L(a, 'text'));
  if (a.kind === 'board' && bySlug[a.ref]) {
    const ref = bySlug[a.ref], nm = esc(ref.name), i = s.indexOf(nm);
    if (i >= 0) s = `${s.slice(0, i)}<button class="like__ref" type="button" data-open="${ref.slug}">${nm}</button>${s.slice(i + nm.length)}`;
  } else {
    const r = L(a, 'ref');
    const keys = [r, r.replace(/s$/, ''), r.split(' ')[0]].filter(k => k.length >= 3);
    for (const k of keys) {
      const i = s.toLowerCase().indexOf(esc(k).toLowerCase());
      if (i >= 0) { s = `${s.slice(0, i)}<b>${s.slice(i, i + esc(k).length)}</b>${s.slice(i + esc(k).length)}`; break; }
    }
  }
  return `<p class="like">${s}</p>`;
}

const luchiHTML = () => `<span class="tag-luchi">${t('twenty.luchi')}</span>`;
const marksHTML = slug => (played.has(slug) ? `<span class="tag-played">${t('twenty.played')}</span>` : '')
  + (luchi.has(slug) ? luchiHTML() : '');

function cardHTML(g) {
  const feels = state.anchor && g.anchors.includes(state.anchor)
    ? `<span class="tag tag--feels">${esc(t('card.feels', { x: editorial.anchors[state.anchor].name }))}</span>` : '';
  const marks = marksHTML(g.slug);
  return `<article class="game" id="g-${g.slug}">
    ${marks ? `<div class="marks">${marks}</div>` : ''}
    <div class="cover cover--${g.category}">${cover(g)}</div>
    <button class="game__open" type="button" data-open="${g.slug}"><span class="sr-only">${esc(t('card.open', { x: g.name }))}</span></button>
    <div class="game__head">
      <h3 class="game__title">${esc(g.name)}</h3>
      <p class="game__meta">${g.year} · ${t(`mode.${g.mode}`)}</p>
    </div>
    <div class="game__tags"><span class="tag tag--${g.category}">${t(`cat.${g.category}`)}</span>${feels}</div>
    ${likeHTML(g)}
    <p class="facts"><span>${players(g)}</span><span>${minutes(g)}</span><span>${t('card.age', { n: g.age })}</span></p>
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
      <span class="fgroup__label" id="fl-${gr.key}">${t(`group.${gr.key}`)}</span>
      <div class="chips">${gr.chips.map(c => {
        const on = sel[gr.key].has(c.id);
        // Would adding this chip leave nothing? Then say so before they click.
        const dead = !on && !matching({ key: gr.key, set: new Set([...sel[gr.key], c.id]) }).length;
        return `<button class="chip${gr.key === 'c' ? ' chip--' + c.id : ''}" type="button" data-g="${gr.key}" data-c="${c.id}" aria-pressed="${on}"${dead ? ` disabled title="${esc(t('chip.dead'))}"` : ''}>${chipLabel(gr.key, c.id)}</button>`;
      }).join('')}</div>
    </div>`).join('');
}

function renderActive() {
  const bits = [];
  if (state.q) bits.push(`<button class="chip chip--x" type="button" data-x="q">“${esc(state.q)}”</button>`);
  for (const gr of GROUPS) for (const id of sel[gr.key]) {
    const lbl = chipLabel(gr.key, id);
    bits.push(`<button class="chip chip--x" type="button" data-x="${gr.key}:${id}" aria-label="${esc(t('chip.remove', { x: lbl }))}">${esc(lbl)}</button>`);
  }
  $('#active').innerHTML = bits.join('');
  const n = bits.length;
  $('#clear').disabled = !n && !state.anchor;
  $('#filters-toggle').textContent = n ? t('filters.toggleN', { n }) : t('filters.toggle');
}

function feelsCount(an) {
  const n = matching().filter(g => g.anchors.includes(state.anchor)).length;
  if (!n) return t('because.feels0', { x: esc(an.name) });
  return n === 1 ? t('because.feels1') : t('because.feelsN', { n });
}
function renderBecause() {
  const el = $('#because');
  if (!state.anchor && !state.quizDone) { el.innerHTML = ''; return; }
  const an = state.anchor && editorial.anchors[state.anchor];
  const loose = state.relaxed.length
    ? `<span class="because__loose">${t('because.loose', { labels: state.relaxed.map(k => t(`group.${k}`).toLowerCase()).join(t('because.and')) })}</span>` : '';
  el.innerHTML = `<div class="because">
    <p class="because__txt">${an
      ? t('because.anchor', { x: esc(an.name), why: esc(L(an, 'why')), feels: feelsCount(an) })
      : t('because.based')}${loose}</p>
    <button class="chip" type="button" data-reset-quiz>${t('quiz.restart')}</button>
  </div>`;
}

function renderGrid() {
  const list = sorted(matching());
  const total = games.length;
  $('#count').innerHTML = list.length === total ? t('count.all', { n: total }) : t('count.some', { n: list.length, total });
  if (!list.length) {
    const notOnShelf = state.q && !games.some(g => norm(g.name).includes(norm(state.q)));
    $('#grid').innerHTML = `<div class="empty" style="grid-column:1/-1">
      ${notOnShelf
        ? `<h3>${t('shelf.title', { q: esc(state.q) })}</h3><p>${t('shelf.lead')}</p>`
        : `<h3>${t('empty.title')}</h3><p>${t('empty.lead')}</p>`}
      <div class="chips">${$('#active').innerHTML}</div>
      <button class="btn btn--ghost btn--sm" type="button" data-clear>${t('empty.clear')}</button>
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
  if (step.key === 'a') {
    return Object.entries(editorial.anchors).map(([k, a]) =>
      ({ v: k, mark: ANCHOR_MARK[k] || a.name[0], label: a.name, kind: L(a, 'kind'), color: ANCHOR_COLOR[k] }));
  }
  return step.options.map((o, i) => { const [label, kind] = t(`opt.${step.key}.${i}`).split('|'); return { ...o, label, kind }; });
}
function renderQuiz() {
  const el = $('#quiz');
  if (state.quizDone) {
    const n = matching().length, an = state.anchor && editorial.anchors[state.anchor];
    el.innerHTML = `<div class="quiz__done quiz__step">
      <span class="quiz__label">${t('quiz.done')}</span>
      <h2>${t(n === 1 ? 'quiz.done1' : 'quiz.doneN', { n })}${an ? t('quiz.doneAnchor', { x: esc(an.name) }) : ''}.</h2>
      <p>${t('quiz.doneLead')}</p>
      <div class="btns">
        <a class="btn btn--primary" href="#finder">${t('quiz.see')}</a>
        <button class="btn btn--ghost" type="button" data-reset-quiz>${t('quiz.restart')}</button>
      </div>
    </div>`;
    return;
  }
  const step = STEPS[quiz.step], opts = stepOptions(step), n = opts.length;
  const w = n >= 6 ? Math.min(n * 165, 1150) : n * 190;
  const hint = step.key === 'a' ? t('step.a.hint') : '';
  el.innerHTML = `<div class="quiz__step" style="--n:${n};--w:${w}px">
    <div class="quiz__head">
      ${quiz.step ? `<button class="quiz__back" type="button" data-back>${t('quiz.back')}</button>` : ''}
      <div class="quiz__top">
        <span class="quiz__label">${t('quiz.step', { i: quiz.step + 1, n: STEPS.length })}</span>
        <span class="quiz__dots" aria-hidden="true">${STEPS.map((_, i) => `<i class="${i <= quiz.step ? 'on' : ''}"></i>`).join('')}</span>
      </div>
      <h2 class="quiz__q">${esc(t(`step.${step.key}.q`))}</h2>
      ${hint ? `<p class="quiz__hint">${esc(hint)}</p>` : ''}
    </div>
    <div class="quiz__grid${step.key === 'a' ? ' quiz__grid--a' : ''}">${opts.map(optHTML).join('')}</div>
    <button class="link-btn quiz__skip" type="button" data-skip>${esc(step.key === 'a' ? t('step.a.skip') : t('quiz.skip'))}</button>
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
const countCat = c => games.filter(g => g.category === c).length;
function renderCats() {
  $('#cats').innerHTML = CATS.map(id => `
    <button class="cat cat--${id}" type="button" data-cat="${id}">
      <div><div class="cat__title">${t(`cat.${id}`)}</div><p class="cat__desc">${t(`catd.${id}`)}</p></div>
      <div class="cat__panel"><span>${t('cats.games', { n: countCat(id) })}</span><span>${t('cats.browse')}</span></div>
    </button>`).join('');
  $('#foot-cats').innerHTML = CATS.map(id =>
    `<li><button class="link-btn" type="button" data-cat="${id}">${t(`cat.${id}`)}</button></li>`).join('');
}
function showCategory(id) {
  sel.c.clear(); sel.c.add(id);
  renderFinder(); scrollToEl($('#finder'));
}

let picksBound = false;
function renderPicks() {
  $('#picks-list').innerHTML = editorial.picks.map(p => {
    const gs = p.games.map(s => bySlug[s]).filter(Boolean);
    return `<div class="pick pick--${p.category}">
      <h3>${esc(L(p, 'title'))}</h3>
      <p class="pick__note">${t('picks.top', { n: gs.length, cat: t(`cat.${p.category}`) })}</p>
      <div class="pick__panel"><ol class="pick__list">${gs.map((g, i) => `<li class="pick__item">
        <button class="pick__row" type="button" data-open="${g.slug}">
          <span class="pick__n">${String(i + 1).padStart(2, '0')}</span>
          <span class="pick__thumb cover--${g.category}">${cover(g)}</span>
          <span><span class="pick__name">${esc(g.name)}</span><br><span class="pick__sub">${players(g)} · ${minutes(g)}</span></span>
        </button></li>`).join('')}</ol>
      <button class="link-btn pick__all" type="button" data-cat="${p.category}">${t('picks.all', { n: countCat(p.category), cat: t(`catp.${p.category}`) })}</button></div>
    </div>`;
  }).join('');
  if (picksBound) return;                           // re-render on language change: listeners already in place
  picksBound = true;
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
  luchi = new Set(entries.filter(e => e.luchi && bySlug[e.slug]).map(e => e.slug));   // a friend's seal of approval
  const num = i => String(i + 1).padStart(2, '0');
  const rec = (e, i) => {
    const g = e.slug && bySlug[e.slug];
    const standout = L(e, 'standout'), note = L(e, 'note');
    return `<article class="rec">
      <div class="rec__n">${num(i)}</div>
      <div class="rec__cover">${g ? cover(g) : ''}</div>
      <div>
        <h3 class="rec__title">${esc(e.name || (g && g.name) || '')}</h3>
        <p class="rec__meta">${esc(e.year || (g && g.year) || '')}</p>
        ${standout ? `<span class="standout">${esc(t('twenty.standout', { x: standout }))}</span>` : ''}
        ${e.luchi ? luchiHTML() : ''}
        ${note ? `<p class="rec__note">${esc(note)}</p>` : ''}
      </div>
    </article>`;
  };
  const example = i => `<article class="rec">
      <div class="rec__n">${num(i)}</div>
      <div class="rec__cover" aria-hidden="true"></div>
      <div>
        <h3 class="rec__title">${t('twenty.soon')}</h3>
        <p class="rec__meta">${t('twenty.reserved')}</p>
        <span class="standout">${esc(t('twenty.standout', { x: t('twenty.standoutPh') }))}</span>
        <p class="rec__note rec__note--empty">${t(i === 0 ? 'twenty.note0' : 'twenty.note1')}</p>
      </div>
    </article>`;
  const shown = entries.length ? entries.map(rec) : [example(0), example(1)];
  const from = shown.length;
  const slots = Array.from({ length: 20 - from }, (_, i) =>
    `<div class="slot"><span class="slot__n">${num(from + i)}</span><span class="slot__txt">${t('twenty.slot')}</span></div>`);
  $('#the20').innerHTML = `<div class="twenty">${shown.join('')}</div>${slots.length ? `<div class="slots">${slots.join('')}</div>` : ''}`;
}

/* ---------- Dialog ---------- */
const dlg = $('#dlg');
function openGame(slug) {
  const g = bySlug[slug]; if (!g) return;
  openSlug = slug;
  dlg.innerHTML = `
    <button class="dlg__x" type="button" data-close aria-label="${esc(t('dlg.close'))}">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M1 1l10 10M11 1 1 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
    </button>
    <div class="dlg__in">
      <div class="dlg__cover cover--${g.category}">${cover(g).replace('loading="lazy"', 'loading="eager"')}</div>
      <div>
        <div class="game__tags"><span class="tag tag--${g.category}">${t(`cat.${g.category}`)}</span><span class="tag tag--feels">${t(`mode.${g.mode}`)}</span></div>
        <h2 id="dlg-title" style="margin-top:12px">${esc(g.name)}</h2>
        <p class="dlg__meta">${g.year}${played.has(g.slug) ? ` · <span class="tag-played">${t('twenty.played')}</span>` : ''}${luchi.has(g.slug) ? ` ${luchiHTML()}` : ''}</p>
        ${likeHTML(g)}
        <dl class="dlg__facts">
          <div class="fact"><dt>${t('dlg.players')}</dt><dd>${range(g.players)}</dd></div>
          <div class="fact"><dt>${t('dlg.time')}</dt><dd>${minutes(g)}</dd></div>
          <div class="fact"><dt>${t('dlg.age')}</dt><dd>${g.age}+</dd></div>
          <div class="fact"><dt>${t('dlg.diff')}</dt><dd>${weight(g)}</dd></div>
        </dl>
        <div class="dlg__cta">
          <a class="btn btn--primary" href="https://boardgamegeek.com/boardgame/${g.bgg}" target="_blank" rel="noopener">${t('dlg.bgg')}</a>
        </div>
      </div>
    </div>`;
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
}

/* ---------- Events (delegated) ---------- */
function onClick(e) {
  const tg = e.target.closest('button, a'); if (!tg) return;
  const d = tg.dataset;
  if (d.lang) { setLang(d.lang, true); return; }
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
  if (d.clear !== undefined || tg.id === 'clear') { clearAll(); quiz.step = 0; quiz.answers = {}; renderQuiz(); renderFinder(); return; }
  if (d.cat) { if (dlg.open) dlg.close(); showCategory(d.cat); return; }
  if (d.opt !== undefined) {
    const step = STEPS[quiz.step], o = stepOptions(step)[+d.opt];
    answer(o.v); return;
  }
  if (d.skip !== undefined) { answer(STEPS[quiz.step].key === 'a' ? null : []); return; }
  if (d.back !== undefined) { quiz.step = Math.max(0, quiz.step - 1); renderQuiz(); focusQuiz(); return; }
  if (d.resetQuiz !== undefined) { resetQuiz(); return; }
  if (tg.getAttribute('href') === '#finder' && state.quizDone) { e.preventDefault(); scrollToEl($('#finder')); }
}

function bind() {
  document.addEventListener('click', onClick);
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });   // backdrop
  dlg.addEventListener('close', () => { openSlug = null; });
  $('#sort').addEventListener('change', e => { state.sort = e.target.value; renderFinder(); });
  // No debounce: filtering 50 games takes under 5ms. Coalesce to one render per frame instead.
  let raf = 0;
  $('#search').addEventListener('input', e => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => { state.q = e.target.value.trim().slice(0, 60); renderFinder(); });
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
  lang = detectLang();
  applyStatic();                                    // before the fetch, so the shell is already in the right language
  try {
    const [gd, ed] = await Promise.all(['data/games.json', 'data/editorial.json'].map(u =>
      fetch(u).then(r => { if (!r.ok) throw new Error(`${u}: ${r.status}`); return r.json(); })));
    games = gd.games; editorial = ed;
    bySlug = Object.fromEntries(games.map(g => [g.slug, g]));
  } catch (err) {
    console.error(err);
    $('#grid').innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>${t('err.title')}</h3>
      <p>${t('err.lead')}</p>
      <button class="btn btn--ghost btn--sm" type="button" onclick="location.reload()">${t('err.retry')}</button></div>`;
    $('#count').textContent = '';
    $('#quiz').innerHTML = '';
    return;
  }
  applyStatic();                                    // again, now {total} is known
  readURL();
  if (state.q) $('#search').value = state.q;
  renderThe20();      // before cards: sets which games carry the "played" mark
  const grid = $('#grid');
  grid.classList.add('is-entering');                // first paint only — see .grid.is-entering
  renderCats(); renderPicks(); renderQuiz(); renderFinder();
  setTimeout(() => grid.classList.remove('is-entering'), 600);
  bind();
}
boot();
})();
