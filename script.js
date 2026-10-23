"use strict";

let players = []; // [{ name, scores: [], looserRounds: Set }]
let rounds = 0; // number of rounds added so far
let loosers = new Set(); // player indices currently marked as looser this round
let limit = 51; // the game ends when a running total reaches this
let gameId = ""; // ties the game to its history entry

const STORAGE_KEY = "sedmica.game.v1";
const HISTORY_KEY = "sedmica.history.v1";
const DEFAULT_LIMIT = 51;
const MIN_LIMIT = 11;
const HISTORY_CAP = 50;

// Player names end up in innerHTML, so they are escaped first.
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

/* ══════════════════════════════════════════
   RULES — pure functions, no DOM
══════════════════════════════════════════ */

// "Igra do" field: empty means the default, anything below the minimum is refused.
function parseLimit(raw) {
  const text = String(raw ?? "").trim();
  if (text === "") return DEFAULT_LIMIT;
  const n = Number(text);
  return Number.isInteger(n) && n >= MIN_LIMIT ? n : null;
}

// Running total after every round; a šuster round is recorded, then resets to 0.
function runningTotals(scores) {
  let running = 0;
  const perRound = scores.map((s) => {
    running += s.val; // add this round's points
    const cumulative = running;
    if (s.looser) running = 0; // reset AFTER recording, so next round starts at 0
    return { val: s.val, looser: s.looser, cumulative };
  });
  return { total: running, perRound };
}

// cumulatives[player][round] → the first round where anyone reaches the limit,
// and who loses there: the highest total (ties share the loss). null while playing.
function findGameEnd(cumulatives, lim) {
  const roundCount = Math.max(0, ...cumulatives.map((c) => c.length));
  for (let r = 0; r < roundCount; r++) {
    const atRound = cumulatives.map((c) => c[r] ?? 0);
    const top = Math.max(...atRound);
    if (top >= lim) {
      const losers = atRound.flatMap((v, pi) => (v === top ? [pi] : []));
      return { round: r, losers, total: top };
    }
  }
  return null;
}

// Newest first; an entry with the same id is replaced instead of duplicated.
function addToHistory(history, entry, cap = HISTORY_CAP) {
  return [entry, ...history.filter((h) => h.id !== entry.id)].slice(0, cap);
}

// Per player: games played, games lost and the average final total.
function playerStats(history) {
  const byName = new Map();
  history.forEach((h) => {
    h.players.forEach((p) => {
      const s = byName.get(p.name) || { name: p.name, games: 0, losses: 0, sum: 0 };
      s.games++;
      s.sum += p.total;
      if (h.losers.includes(p.name)) s.losses++;
      byName.set(p.name, s);
    });
  });
  return [...byName.values()]
    .map(({ name, games, losses, sum }) => ({
      name,
      games,
      losses,
      average: Math.round((sum / games) * 10) / 10,
    }))
    .sort((a, b) => b.games - a.games || a.name.localeCompare(b.name));
}

/* ══════════════════════════════════════════
   PERSISTENCE — survive a refresh or a closed tab
══════════════════════════════════════════ */
function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        id: gameId,
        limit,
        players: players.map((p) => ({ name: p.name, scores: p.scores })),
        rounds,
      }),
    );
  } catch {
    // Storage blocked or full: the game still works for this session.
  }
}

function loadState() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (
      data &&
      Array.isArray(data.players) &&
      data.players.length >= 2 &&
      data.players.every((p) => Array.isArray(p.scores) && p.scores.length === data.rounds)
    ) {
      return data;
    }
  } catch {
    // Corrupt data: start fresh.
  }
  return null;
}

function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

function loadHistory() {
  try {
    const list = JSON.parse(localStorage.getItem(HISTORY_KEY));
    if (Array.isArray(list)) {
      return list.filter((h) => h && Array.isArray(h.players) && Array.isArray(h.losers));
    }
  } catch {
    // Corrupt history: start a new one.
  }
  return [];
}

function saveHistory(list) {
  try {
    if (list.length) localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    else localStorage.removeItem(HISTORY_KEY);
  } catch {
    // Storage blocked or full: history is skipped.
  }
}

function newGameId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function showGame() {
  document.getElementById("setup-view").classList.add("hidden");
  document.getElementById("game-view").classList.remove("hidden");
  document.getElementById("subtitle").textContent = `8 ili 9 bodova po rundi · igra do ${limit}`;
  document.getElementById("limit-label").textContent = `do ${limit}`;
  renderPlayerCards();
  renderTable();
}

/* ══════════════════════════════════════════
   SETUP
══════════════════════════════════════════ */
function startGame() {
  const inputs = [1, 2, 3, 4].map((i) =>
    document.getElementById(`p${i}`).value.trim(),
  );
  const names = inputs.filter((n) => n.length > 0);
  const err = document.getElementById("setup-error");
  const lim = parseLimit(document.getElementById("limit").value);

  if (names.length < 2) {
    err.textContent = "Potrebna su najmanje 2 igrača.";
    return;
  }
  if (new Set(names).size !== names.length) {
    err.textContent = "Imena moraju biti različita.";
    return;
  }
  if (lim === null) {
    err.textContent = `Igra do: cijeli broj, najmanje ${MIN_LIMIT}.`;
    return;
  }
  err.textContent = "";

  players = names.map((name) => ({
    name,
    scores: [],
    looserRounds: new Set(),
  }));
  rounds = 0;
  loosers = new Set();
  limit = lim;
  gameId = newGameId();

  saveState();
  showGame();
}

/* ══════════════════════════════════════════
   GAME END
══════════════════════════════════════════ */
function gameResult() {
  return findGameEnd(
    computeTotals().map((t) => t.perRound.map((r) => r.cumulative)),
    limit,
  );
}

function recordHistory(result) {
  const totals = computeTotals();
  const entry = {
    id: gameId,
    date: new Date().toISOString(),
    limit,
    rounds,
    players: players.map((p, pi) => ({ name: p.name, total: totals[pi].total })),
    losers: result ? result.losers.map((pi) => players[pi].name) : [],
    finished: !!result,
  };
  saveHistory(addToHistory(loadHistory(), entry));
}

function removeHistoryEntry(id) {
  saveHistory(loadHistory().filter((h) => h.id !== id));
}

function renderGameOver(result) {
  const banner = document.getElementById("game-over");
  banner.classList.toggle("hidden", !result);
  if (!result) return;
  const names = result.losers.map((pi) => `<b>${esc(players[pi].name)}</b>`);
  const who = names.length > 1 ? "Gubitnici" : "Gubitnik";
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} i ${names.at(-1)}` : names[0];
  document.getElementById("game-over-text").innerHTML =
    `${who}: ${list} — ${result.total} / ${limit} u ${result.round + 1}. rundi.`;
}

/* ══════════════════════════════════════════
   PLAYER CARDS
══════════════════════════════════════════ */
function renderPlayerCards() {
  const over = !!gameResult();
  const off = over ? " disabled" : "";
  const container = document.getElementById("player-cards");
  container.innerHTML = players
    .map(
      (p, pi) => `
    <div class="player-card${loosers.has(pi) ? " is-looser" : ""}" id="card-${pi}">
      <div class="card-name">${esc(p.name)}</div>
      <div class="card-score-row">
        <span class="card-score-label">Bodovi</span>
        <input
          type="number"
          class="card-score-input"
          id="input-${pi}"
          aria-label="Bodovi: ${esc(p.name)}"
          value="0"
          min="0"
          placeholder="0"
          inputmode="numeric"${off}
          onfocus="this.select()"
          oninput="updateRoundSum()"
          onkeydown="if (event.key === 'Enter') addRound()"
        />
      </div>
      <button
        class="btn-looser${loosers.has(pi) ? " active" : ""}"${off}
        onclick="toggleLooser(${pi})"
      >${loosers.has(pi) ? "💀 ŠUSTER" : "ŠUSTER"}</button>
    </div>
  `,
    )
    .join("");
  document.getElementById("add-btn").disabled = over;
  updateRoundSum();
}

/* ══════════════════════════════════════════
   LIVE SUM — shows whether the round adds up to 8 or 9
══════════════════════════════════════════ */
function updateRoundSum() {
  const el = document.getElementById("round-sum");
  if (!el) return;
  const total = players.reduce((sum, _, pi) => {
    if (loosers.has(pi)) return sum;
    const input = document.getElementById(`input-${pi}`);
    return sum + (parseInt(input ? input.value : "0") || 0);
  }, 0);
  el.textContent = `Zbir: ${total} / 8–9`;
  el.classList.toggle("ok", total === 8 || total === 9);
}

/* ══════════════════════════════════════════
   LOOSER TOGGLE
══════════════════════════════════════════ */
function toggleLooser(pi) {
  if (gameResult()) return;

  // Save all current input values before re-render
  const savedVals = players.map((_, i) => {
    const el = document.getElementById(`input-${i}`);
    return el ? el.value : "0";
  });

  if (loosers.has(pi)) {
    loosers.delete(pi);
  } else {
    loosers.add(pi);
  }

  renderPlayerCards();

  // Restore input values after re-render
  players.forEach((_, i) => {
    const el = document.getElementById(`input-${i}`);
    if (el) el.value = savedVals[i];
  });
  updateRoundSum();
}

/* ══════════════════════════════════════════
   ADD ROUND
══════════════════════════════════════════ */
function addRound() {
  const errEl = document.getElementById("round-error");
  if (gameResult()) return; // the game is over: undo or start a new one

  // Read ALL values first, before any DOM changes
  const vals = players.map((_, pi) => {
    const el = document.getElementById(`input-${pi}`);
    return parseInt(el ? el.value : "0") || 0;
  });

  // Validation: non-looser scores must sum to exactly 8 or 9
  const nonLooserVals = vals.filter((_, pi) => !loosers.has(pi));
  const total = nonLooserVals.reduce((a, b) => a + b, 0);

  if (total !== 8 && total !== 9) {
    errEl.textContent = `Greška: bodovi moraju biti 8 ili 9 (trenutno: ${total}).`;
    return;
  }
  errEl.textContent = "";

  // Save scores — looser gets 0 for this round, others get their value
  players.forEach((p, pi) => {
    const isLooser = loosers.has(pi);
    if (isLooser) p.looserRounds.add(rounds);
    p.scores.push({ val: isLooser ? 0 : vals[pi], looser: isLooser });
  });

  rounds++;
  loosers = new Set();
  saveState();

  const result = gameResult();
  if (result) recordHistory(result);

  renderPlayerCards();
  renderTable();

  // Clear inputs after render
  players.forEach((_, pi) => {
    const el = document.getElementById(`input-${pi}`);
    if (el) el.value = 0;
  });
  updateRoundSum();
}

/* ══════════════════════════════════════════
   COMPUTE CUMULATIVE TOTALS
   — looser rounds reset the running total to 0
══════════════════════════════════════════ */
function computeTotals() {
  return players.map((p) => runningTotals(p.scores));
}

/* ══════════════════════════════════════════
   RENDER TABLE
══════════════════════════════════════════ */
function renderTable() {
  const totals = computeTotals();
  const result = gameResult();

  // thead
  const thead = document.getElementById("score-thead");
  let hRow = '<tr><th class="round-head">Runda</th>';
  players.forEach((p) => {
    hRow += `<th>${esc(p.name)}</th>`;
  });
  hRow += "</tr>";
  thead.innerHTML = hRow;

  // tbody — round points, and smaller beneath them the running total after the round
  const tbody = document.getElementById("score-tbody");
  let html = "";

  for (let r = 0; r < rounds; r++) {
    html += "<tr>";
    html += `<td class="round-label">${r + 1}.</td>`;
    totals.forEach((t) => {
      const s = t.perRound[r];
      const isLoos = s.looser;
      const over = s.cumulative >= limit;
      const run = isLoos ? "↺ 0" : `Σ ${s.cumulative}`;
      html += `<td class="${isLoos ? "looser-cell" : ""}${over ? " over-cell" : ""}">
        <span class="cell-pts">${s.val}${isLoos ? " 💀" : ""}</span>
        <span class="cell-run">${run}</span>
      </td>`;
    });
    html += "</tr>";
  }

  // Sum row
  if (rounds > 0) {
    const minTotal = Math.min(...totals.map((t) => t.total));
    const lost = result ? result.losers : [];
    html += '<tr class="sum-row">';
    html += `<td>Suma</td>`;
    totals.forEach((t, pi) => {
      const cls = lost.includes(pi) ? "sum-loser" : t.total === minTotal ? "sum-winner" : "";
      html += `<td class="${cls}">${t.total}</td>`;
    });
    html += "</tr>";
  }

  tbody.innerHTML =
    html ||
    `<tr><td colspan="${players.length + 1}" style="text-align:center; color:#8899aa; font-style:italic; padding:1.5rem;">Još nema rundi.</td></tr>`;

  const undo = document.getElementById("undo-btn");
  if (undo) undo.disabled = rounds === 0;
  renderGameOver(result);
}

/* ══════════════════════════════════════════
   DELETE LAST ROUND (optional safety)
══════════════════════════════════════════ */
function deleteLastRound() {
  if (!rounds) return;
  const wasOver = !!gameResult();
  players.forEach((p) => {
    p.scores.pop();
    p.looserRounds.delete(rounds - 1);
  });
  rounds--;
  loosers = new Set();
  saveState();
  // Undoing the deciding round reopens the game, so it leaves the history too.
  if (wasOver && !gameResult()) removeHistoryEntry(gameId);
  renderPlayerCards();
  renderTable();
}

/* ══════════════════════════════════════════
   RESET
══════════════════════════════════════════ */
function resetGame() {
  document.getElementById("reset-body").textContent = rounds
    ? "Tabela se briše, a igra ostaje zapisana u istoriji."
    : "Svi bodovi i runde bit će obrisani. Ova akcija se ne može poništiti.";
  document.getElementById("reset-modal").classList.remove("hidden");
}

function confirmReset() {
  // A finished game is already in the history; an unfinished one is saved now.
  if (rounds > 0 && !gameResult()) recordHistory(null);
  document.getElementById("reset-modal").classList.add("hidden");
  document.getElementById("game-view").classList.add("hidden");
  document.getElementById("setup-view").classList.remove("hidden");
  document.getElementById("subtitle").textContent = "scorecard — 8 ili 9 bodova po rundi";
  players = [];
  rounds = 0;
  loosers = new Set();
  gameId = "";
  clearState();
  [1, 2, 3, 4].forEach((i) => {
    document.getElementById(`p${i}`).value = "";
  });
  renderHistory();
}

function cancelReset() {
  document.getElementById("reset-modal").classList.add("hidden");
}

/* ══════════════════════════════════════════
   HISTORY — past games and per-player stats on the setup view
══════════════════════════════════════════ */
function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}. ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 1 runda, 2 runde, 5 rundi, 21 runda…
function roundWord(n) {
  if (n % 10 === 1 && n % 100 !== 11) return "runda";
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) return "runde";
  return "rundi";
}

function renderHistory() {
  const history = loadHistory();
  document.getElementById("history-section").classList.toggle("hidden", history.length === 0);

  const stats = playerStats(history);
  document.getElementById("stats-tbody").innerHTML = stats
    .map(
      (s) => `<tr>
        <td class="stats-name">${esc(s.name)}</td>
        <td>${s.games}</td>
        <td>${s.losses}</td>
        <td>${s.average.toLocaleString("bs-BA")}</td>
      </tr>`,
    )
    .join("");

  document.getElementById("history-list").innerHTML = history
    .map((h) => {
      const scores = h.players
        .map((p) => {
          const lost = h.losers.includes(p.name);
          return `<span class="${lost ? "h-loser" : ""}">${lost ? "💀 " : ""}${esc(p.name)} ${p.total}</span>`;
        })
        .join('<span class="h-sep"> · </span>');
      const state = `${h.rounds} ${roundWord(h.rounds)}${h.finished ? "" : " · nedovršena"}`;
      return `<li class="history-item">
        <div class="h-meta">${formatDate(h.date)} · do ${h.limit} · ${state}</div>
        <div class="h-scores">${scores}</div>
      </li>`;
    })
    .join("");
}

function askClearHistory() {
  document.getElementById("history-modal").classList.remove("hidden");
}

function confirmClearHistory() {
  document.getElementById("history-modal").classList.add("hidden");
  saveHistory([]);
  renderHistory();
}

function cancelClearHistory() {
  document.getElementById("history-modal").classList.add("hidden");
}

/* ══════════════════════════════════════════
   RESTORE — continue a game after a reload
══════════════════════════════════════════ */
renderHistory();
const saved = loadState();
if (saved) {
  players = saved.players.map((p) => ({
    name: p.name,
    scores: p.scores,
    looserRounds: new Set(
      p.scores.flatMap((score, r) => (score.looser ? [r] : [])),
    ),
  }));
  rounds = saved.rounds;
  // Games saved before "Igra do" existed play to the default.
  limit = parseLimit(saved.limit) ?? DEFAULT_LIMIT;
  gameId = typeof saved.id === "string" && saved.id ? saved.id : newGameId();
  showGame();
}
