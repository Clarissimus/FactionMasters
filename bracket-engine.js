/**
 * bracket-engine.js — Faction Masters shared bracket engine
 *
 * Each season page must define before loading this script:
 *   SEASON  – display title, e.g. "Faction Masters Season 4"
 *   NAV     – array of { label, href, active? }
 *   F       – faction abbreviation map  { XX: 'Full Name', ... }
 *   MATCHES – match data object
 *   CHAMPION– p(seed, name, fac) result
 *   render  – function() that calls buildMatch / buildCol / addToCol
 *             and mounts everything to #bracket
 *
 * Exported globals (available to render()):
 *   p(seed, name, fac)
 *   buildMatch(matchId, topSource, botSource, topRevealed, botRevealed)
 *   buildCol(label, height)
 *   addToCol(col, matchWrap, topPx)
 *   mountBracket(leftCols, rightCols, w_final, sideHeight)
 *   SLOT_H, SEP_H, YT_H, MATCH_H, CELL_H, GAP, LABEL_H, BAND, SIDE_H
 */

// ─── Inject shared CSS ────────────────────────────────────────────────────────
(function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
  :root {
    --gold:       #d4a843;
    --gold-light: #f0d878;
    --gold-dim:   #a07830;
    --crimson:    #c0392b;
    --green:      #4a9e6a;
    --bg-deep:    #1c1a14;
    --bg-card:    #2a2620;
    --bg-card2:   #343028;
    --bg-winner:  #1e2a1a;
    --text:       #f0e8d0;
    --text-dim:   #b0a080;
    --bye-color:  #242018;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    background: var(--bg-deep);
    color: var(--text);
    font-family: 'Crimson Pro', serif;
  }
  .page-wrap { padding: 1rem 1rem 1.5rem; }
  nav {
    text-align: center; margin-bottom: 0.75rem;
    font-family: 'Cinzel', serif; font-size: 0.75rem; letter-spacing: 0.15em;
  }
  nav a { color: var(--gold-dim); text-decoration: none; margin: 0 0.75rem; }
  nav a:hover { color: var(--gold); }
  nav a.active { color: var(--gold); border-bottom: 1px solid var(--gold); }
  header { text-align: center; margin-bottom: 0.75rem; }
  .crest { font-size: 1.8rem; line-height: 1; margin-bottom: 0.3rem; }
  h1 {
    font-family: 'Cinzel Decorative', cursive;
    font-size: clamp(1.2rem, 3vw, 2rem);
    color: var(--gold); letter-spacing: 0.05em; line-height: 1.2;
  }
  .divider {
    width: 200px; height: 1px;
    background: linear-gradient(90deg, transparent, var(--gold-dim), transparent);
    margin: 0.5rem auto;
  }
  .controls { display: flex; justify-content: center; gap: 1rem; margin-bottom: 1rem; }
  .btn {
    font-family: 'Cinzel', serif; font-size: 0.7rem; letter-spacing: 0.15em;
    text-transform: uppercase; padding: 0.4rem 1.2rem; border-radius: 3px;
    border: 1px solid var(--gold-dim); background: transparent; color: var(--gold-dim);
    cursor: pointer; transition: all 0.2s;
  }
  .btn:hover { background: var(--gold-dim); color: var(--bg-deep); }
  .bracket-outer {
    display: flex; align-items: flex-start; justify-content: center; width: 100%;
  }
  .bracket-side       { display: flex; flex-direction: row; }
  .bracket-side.right { flex-direction: row-reverse; }
  .bracket-round { display: flex; flex-direction: column; flex-shrink: 0; padding: 0 6px; }
  .round-label {
    font-family: 'Cinzel', serif; font-size: 0.65rem; color: var(--gold);
    letter-spacing: 0.15em; text-transform: uppercase; text-align: center;
    height: 28px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .round-body { position: relative; }
  .match { position: absolute; left: 6px; display: flex; flex-direction: column; }
  .slot {
    display: flex; align-items: center; gap: 8px;
    background: var(--bg-card); border: 2px solid #4a4030;
    border-radius: 4px; padding: 6px 10px; width: 164px;
    position: relative; overflow: hidden;
    transition: border-color 0.2s, background 0.2s;
  }
  .slot::before {
    content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
    background: var(--gold-dim); opacity: 0; transition: opacity 0.2s;
  }
  .slot:hover { border-color: var(--gold-dim); background: var(--bg-card2); }
  .slot:hover::before { opacity: 1; }
  .slot.winner { background: var(--bg-winner); border-color: var(--green); }
  .slot.winner::before { background: var(--green); opacity: 1; }
  .slot.winner:hover { background: var(--bg-winner); border-color: var(--green); }
  .slot.bye { background: var(--bye-color); border-color: #2e2a20; }
  .slot.bye:hover { border-color: #2e2a20; background: var(--bye-color); }
  .slot.bye:hover::before { opacity: 0; }
  .seed {
    font-family: 'Cinzel', serif; font-size: 0.7rem; color: var(--gold);
    min-width: 18px; text-align: right; flex-shrink: 0; font-weight: 600;
  }
  .slot-info { display: flex; flex-direction: column; overflow: hidden; flex: 1; }
  .player-name {
    font-family: 'Cinzel', serif; font-size: 0.72rem; font-weight: 600;
    color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3;
  }
  .faction-name {
    font-size: 0.65rem; color: var(--text-dim); white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis; line-height: 1.2; font-style: italic;
  }
  .slot.bye .player-name { color: var(--text-dim); font-style: italic; }
  .slot.bye .seed { color: var(--text-dim); }
  .match-sep { height: 2px; background: #5a5040; margin: 0 2px; }
  .match-yt {
    height: 16px; display: flex; align-items: center;
    justify-content: flex-end; padding-right: 2px; margin-bottom: 2px;
  }
  .yt-link {
    font-size: 0.58rem; color: #e05050; text-decoration: none;
    font-family: 'Cinzel', serif; letter-spacing: 0.05em; opacity: 0.85;
    transition: opacity 0.2s; white-space: nowrap;
  }
  .yt-link:hover { opacity: 1; text-decoration: underline; }
  .yt-link::before { content: '▶ '; }
  .match-note { font-size: 0.58rem; color: var(--text-dim); font-style: italic; font-family: 'Crimson Pro', serif; }
  .match-note.alliance { color: var(--gold-dim); font-style: normal; font-family: 'Cinzel', serif; font-size: 0.52rem; letter-spacing: 0.04em; }
  .slot-overlay {
    position: absolute; inset: 0; background: #1c1a14f4;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; z-index: 2; border-radius: 2px; transition: background 0.15s;
  }
  .slot-overlay:hover { background: #2a2018f4; }
  .slot-overlay span {
    font-family: 'Cinzel', serif; font-size: 0.55rem;
    color: var(--text-dim); letter-spacing: 0.08em; pointer-events: none; text-transform: uppercase;
  }
  .champion-col {
    display: flex; flex-direction: column; align-items: center;
    flex-shrink: 0; padding: 0 14px; align-self: flex-start;
  }
  .champion-label {
    font-family: 'Cinzel', serif; font-size: 0.65rem; color: var(--gold);
    letter-spacing: 0.25em; text-transform: uppercase; height: 28px;
    display: flex; align-items: center; justify-content: center;
  }
  .final-match-wrap {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 12px;
  }
  .champion-crown-wrap { text-align: center; }
  .champion-crown { font-size: 1.8rem; display: block; margin-bottom: 4px; }
  .champion-slot {
    background: linear-gradient(135deg, #22180a, #2e2010);
    border: 2px solid var(--gold-dim); border-radius: 4px;
    padding: 10px 14px; text-align: center; width: 164px;
    box-shadow: 0 0 20px rgba(201,168,76,0.15); position: relative; overflow: hidden;
  }
  .champion-name { font-family: 'Cinzel', serif; font-size: 0.85rem; color: var(--gold-light); font-weight: 600; }
  .champion-faction { font-size: 0.72rem; color: var(--gold-dim); font-style: italic; margin-top: 2px; }
  .match-spoiler {
    position: absolute; inset: 0; background: #1c1a14f4;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; z-index: 2; border-radius: 4px; transition: background 0.15s;
  }
  .match-spoiler:hover { background: #2a2018f4; }
  .match-spoiler span {
    font-family: 'Cinzel', serif; font-size: 0.6rem;
    color: var(--text-dim); letter-spacing: 0.1em; pointer-events: none;
  }
  `;
  document.head.appendChild(style);
})();

// ─── Inject nav, header, controls into the page shell ─────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  // Nav
  const navEl = document.querySelector('nav');
  if (navEl && typeof NAV !== 'undefined') {
    navEl.innerHTML = NAV.map(n =>
      `<a href="${n.href}"${n.active ? ' class="active"' : ''}>${n.label}</a>`
    ).join('');
  }

  // Title
  if (typeof SEASON !== 'undefined') {
    document.title = SEASON + ' Results';
    const h1 = document.querySelector('h1');
    if (h1) h1.textContent = SEASON;
  }

  // Run the season's render function
  if (typeof render === 'function') render();
});

// ─── Layout constants ─────────────────────────────────────────────────────────
const SLOT_H  = 46;
const SEP_H   = 2;
const YT_H    = 18;
const MATCH_H = SLOT_H * 2 + SEP_H;
const CELL_H  = YT_H + MATCH_H;
const GAP     = 14;
const LABEL_H = 28;
const BAND    = MATCH_H + GAP;
const SIDE_H  = 4 * BAND; // default anchor size (Round of 16, 4 matches/side) — season files may override

// ─── Player helper ────────────────────────────────────────────────────────────
function p(seed, name, fac) {
  return { seed, name, faction: (typeof F !== 'undefined' && F[fac]) ? F[fac] : fac };
}

// ─── Spoiler / reveal engine ──────────────────────────────────────────────────
const slotRegistry = [];

function registerSlot(slotEl, seed, sourceSlotEl, startRevealed) {
  const entry = { slotEl, seed, sourceSlotEl, revealed: startRevealed, startRevealed };
  slotRegistry.push(entry);
  if (!startRevealed) addOverlay(slotEl, entry);
  return entry;
}

function addOverlay(slotEl, entry) {
  const old = slotEl.querySelector('.slot-overlay');
  if (old) old.remove();
  const ov = document.createElement('div');
  ov.className = 'slot-overlay';
  ov.innerHTML = '<span>Reveal</span>';
  ov.addEventListener('click', e => { e.stopPropagation(); revealSlot(entry); });
  slotEl.appendChild(ov);
  entry._overlay = ov;
}

function revealSlot(entry) {
  entry.revealed = true;
  if (entry._overlay) { entry._overlay.remove(); entry._overlay = null; }
  if (entry.sourceSlotEl) entry.sourceSlotEl.classList.add('winner');
}

function hideSlot(entry) {
  entry.revealed = false;
  if (entry.sourceSlotEl) entry.sourceSlotEl.classList.remove('winner');
  if (!entry._overlay) addOverlay(entry.slotEl, entry);
}

function revealAll() {
  slotRegistry.forEach(e => { if (!e.revealed) revealSlot(e); });
  const co = document.getElementById('champ-ov');
  if (co) co.style.display = 'none';
  const cc = document.getElementById('champ-content');
  if (cc) cc.style.visibility = 'visible';
  if (window._finalTopEl) window._finalTopEl.classList.add('winner');
}

function hideAll() {
  slotRegistry.forEach(e => { if (!e.startRevealed && e.revealed) hideSlot(e); });
  const co = document.getElementById('champ-ov');
  if (co) co.style.display = '';
  const cc = document.getElementById('champ-content');
  if (cc) cc.style.visibility = 'hidden';
  if (window._finalTopEl) window._finalTopEl.classList.remove('winner');
}

// ─── DOM builders ─────────────────────────────────────────────────────────────
function makeSlotEl(player) {
  const div = document.createElement('div');
  div.className = 'slot';
  div.__seed = player.seed;
  const seedEl = document.createElement('span');
  seedEl.className = 'seed';
  seedEl.textContent = player.seed;
  const info = document.createElement('div');
  info.className = 'slot-info';
  const nameEl = document.createElement('span');
  nameEl.className = 'player-name';
  nameEl.textContent = player.name;
  const factEl = document.createElement('span');
  factEl.className = 'faction-name';
  factEl.textContent = player.faction;
  info.appendChild(nameEl);
  info.appendChild(factEl);
  div.appendChild(seedEl);
  div.appendChild(info);
  return div;
}

function makeYtRow(m) {
  const row = document.createElement('div');
  row.className = 'match-yt';
  if (m.yt) {
    const a = document.createElement('a');
    a.className = 'yt-link'; a.href = m.yt; a.target = '_blank'; a.rel = 'noopener';
    a.textContent = 'Watch'; row.appendChild(a);
  } else if (m.type === 'alliance') {
    const s = document.createElement('span');
    s.className = 'match-note alliance';
    s.textContent = 'faction alliance';
    row.appendChild(s);
  } else if (m.type === 'forfeit') {
    const s = document.createElement('span');
    s.className = 'match-note';
    s.textContent = 'forfeit — no video';
    row.appendChild(s);
  }
  return row;
}

function buildMatch(matchId, topSource, botSource, topStartRevealed, botStartRevealed) {
  const m = MATCHES[matchId];
  const wrap = document.createElement('div');
  wrap.className = 'match';
  wrap.appendChild(makeYtRow(m));
  const topEl = makeSlotEl(m.top);
  const botEl = makeSlotEl(m.bot);
  const sep = document.createElement('div'); sep.className = 'match-sep';
  wrap.appendChild(topEl);
  wrap.appendChild(sep);
  wrap.appendChild(botEl);
  const topEntry = registerSlot(topEl, m.top.seed, topSource, topStartRevealed);
  const botEntry = registerSlot(botEl, m.bot.seed, botSource, botStartRevealed);
  wrap._topEl = topEl;
  wrap._botEl = botEl;
  wrap._topEntry = topEntry;
  wrap._botEntry = botEntry;
  return wrap;
}

function buildCol(label, height) {
  const col = document.createElement('div');
  col.className = 'bracket-round';
  const lbl = document.createElement('div');
  lbl.className = 'round-label';
  lbl.textContent = label;
  col.appendChild(lbl);
  const body = document.createElement('div');
  body.className = 'round-body';
  body.style.height = height + 'px';
  body.style.width = (164 + 12) + 'px';
  col.appendChild(body);
  col._body = body;
  return col;
}

function addToCol(col, matchWrap, topPx) {
  matchWrap.style.position = 'absolute';
  matchWrap.style.left = '6px';
  matchWrap.style.top = topPx + 'px';
  col._body.appendChild(matchWrap);
}

/**
 * mountBracket(leftCols, rightCols, w_final, sideHeight)
 *
 * Handles the champion column and final bracket assembly so render()
 * doesn't have to repeat this boilerplate every season.
 *
 * leftCols   – array of column elements, innermost last  [pi, r16, qf, sf]
 * rightCols  – same order as leftCols (engine will reverse for display)
 * w_final    – the final match element from buildMatch()
 * sideHeight – (optional) actual height of the bracket sides for this season.
 *              Defaults to SIDE_H (4-match anchor round) for back-compat with
 *              season files that don't pass it. Seasons with a bigger anchor
 *              round (e.g. Round of 32) should pass their own computed height.
 */
function mountBracket(leftCols, rightCols, w_final, sideHeight) {
  const colH = sideHeight || SIDE_H;

  const leftSide = document.createElement('div');
  leftSide.className = 'bracket-side';
  leftCols.forEach(c => leftSide.appendChild(c));

  const rightSide = document.createElement('div');
  rightSide.className = 'bracket-side right';
  rightCols.forEach(c => rightSide.appendChild(c));

  // Champion column
  const champCol = document.createElement('div');
  champCol.className = 'champion-col';
  const champLbl = document.createElement('div');
  champLbl.className = 'champion-label';
  champLbl.textContent = 'Final';
  champCol.appendChild(champLbl);

  const finalWrap = document.createElement('div');
  finalWrap.className = 'final-match-wrap';
  finalWrap.style.height = colH + 'px';

  const crownWrap = document.createElement('div');
  crownWrap.className = 'champion-crown-wrap';
  const crownSpan = document.createElement('span');
  crownSpan.className = 'champion-crown';
  crownSpan.textContent = '👑';
  crownWrap.appendChild(crownSpan);

  const champSlot = document.createElement('div');
  champSlot.className = 'champion-slot';

  const champContent = document.createElement('div');
  champContent.id = 'champ-content';
  champContent.style.visibility = 'hidden';
  champContent.innerHTML =
    '<div class="champion-name">' + CHAMPION.name + '</div>' +
    '<div class="champion-faction">' + CHAMPION.faction + '</div>';
  champSlot.appendChild(champContent);

  const champOv = document.createElement('div');
  champOv.id = 'champ-ov';
  champOv.className = 'match-spoiler';
  champOv.innerHTML = '<span>click to reveal</span>';
  champOv.addEventListener('click', () => {
    champContent.style.visibility = 'visible';
    champOv.style.display = 'none';
    if (window._finalTopEl) window._finalTopEl.classList.add('winner');
  });
  champSlot.appendChild(champOv);
  crownWrap.appendChild(champSlot);
  finalWrap.appendChild(crownWrap);

  // Keep w_final as normal flow (Firefox fix — see original comments)
  w_final.style.position = 'static';
  finalWrap.appendChild(w_final);
  champCol.appendChild(finalWrap);

  const bracket = document.getElementById('bracket');
  bracket.appendChild(leftSide);
  bracket.appendChild(champCol);
  bracket.appendChild(rightSide);
  bracket.style.display = 'flex';
  bracket.style.alignItems = 'flex-start';

  window._finalTopEl = w_final._topEl;
}

// ─── Shared position helpers ──────────────────────────────────────────────────

/**
 * Top-px positions for the anchor round rows (the fixed convergence round
 * that play-in matches feed into — "Round of 16" by default, 4 matches/side).
 * Pass a different numMatches for seasons whose anchor round is bigger
 * (e.g. 8 for a "Round of 32").
 */
function anchorTopPx(numMatches) {
  const n = numMatches || 4;
  return Array.from({ length: n }, (_, i) => i * BAND + (BAND - CELL_H) / 2);
}

// Back-compat alias — existing season files call r16TopPx() with no args
// and get the original 4-row behavior unchanged.
function r16TopPx() {
  return anchorTopPx(4);
}

/** Centre (px from col top) of the top or bottom slot in a given anchor-round row */
function r16SlotCentre(r2Tops, row, isTop) {
  return r2Tops[row] + YT_H + (isTop ? SLOT_H / 2 : SLOT_H + SEP_H + SLOT_H / 2);
}

/** Top-px for a play-in match that should centre on a given pixel */
function playInTopFromCentre(c) {
  return c - YT_H - SLOT_H - SEP_H / 2;
}

/** Top-px for a match centred between two pixel centres */
function centredBetween(c1, c2) {
  return (c1 + c2) / 2 - YT_H - MATCH_H / 2;
}

/** Top-px for a QF/SF match centred between two earlier matches by their top-px */
function centredBetweenMatches(topA, topB) {
  const cA = topA + YT_H + MATCH_H / 2;
  const cB = topB + YT_H + MATCH_H / 2;
  return centredBetween(cA, cB);
}
