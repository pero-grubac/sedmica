"use strict";

let players = []; // [{ name, scores: [], looserRounds: Set }]
let rounds = 0; // number of rounds added so far
let loosers = new Set(); // player indices currently marked as looser this round

/* ══════════════════════════════════════════
   SETUP
══════════════════════════════════════════ */
function startGame() {
  const inputs = [1, 2, 3, 4].map((i) =>
    document.getElementById(`p${i}`).value.trim(),
  );
  const names = inputs.filter((n) => n.length > 0);
  const err = document.getElementById("setup-error");

  if (names.length < 2) {
    err.textContent = "Potrebna su najmanje 2 igrača.";
    return;
  }
  if (new Set(names).size !== names.length) {
    err.textContent = "Imena moraju biti različita.";
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

  document.getElementById("setup-view").classList.add("hidden");
  document.getElementById("game-view").classList.remove("hidden");

  renderPlayerCards();
  renderTable();
}

/* ══════════════════════════════════════════
   PLAYER CARDS
══════════════════════════════════════════ */
function renderPlayerCards() {
  const container = document.getElementById("player-cards");
  container.innerHTML = players
    .map(
      (p, pi) => `
    <div class="player-card${loosers.has(pi) ? " is-looser" : ""}" id="card-${pi}">
      <div class="card-name">${p.name}</div>
      <div class="card-score-row">
        <span class="card-score-label">Bodovi</span>
        <input
          type="number"
          class="card-score-input"
          id="input-${pi}"
          value="0"
          min="0"
          placeholder="0"
        />
      </div>
      <button
        class="btn-looser${loosers.has(pi) ? " active" : ""}"
        onclick="toggleLooser(${pi})"
      >${loosers.has(pi) ? "💀 ŠUSTER" : "ŠUSTER"}</button>
    </div>
  `,
    )
    .join("");
}

/* ══════════════════════════════════════════
   LOOSER TOGGLE
══════════════════════════════════════════ */
function toggleLooser(pi) {
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
}

/* ══════════════════════════════════════════
   ADD ROUND
══════════════════════════════════════════ */
function addRound() {
  const errEl = document.getElementById("round-error");

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

  renderPlayerCards();
  renderTable();

  // Clear inputs after render
  players.forEach((_, pi) => {
    const el = document.getElementById(`input-${pi}`);
    if (el) el.value = 0;
  });
}

/* ══════════════════════════════════════════
   COMPUTE CUMULATIVE TOTALS
   — looser rounds reset the running total to 0
══════════════════════════════════════════ */
function computeTotals() {
  return players.map((p) => {
    let running = 0;
    const perRound = p.scores.map((s) => {
      running += s.val; // add this round's points
      const cumulative = running;
      if (s.looser) running = 0; // reset AFTER recording, so next round starts at 0
      return { val: s.val, looser: s.looser, cumulative };
    });
    return { total: running, perRound };
  });
}

/* ══════════════════════════════════════════
   RENDER TABLE
══════════════════════════════════════════ */
function renderTable() {
  const totals = computeTotals();

  // thead
  const thead = document.getElementById("score-thead");
  let hRow = '<tr><th style="text-align:left; min-width:70px;">Runda</th>';
  players.forEach((p) => {
    hRow += `<th>${p.name}</th>`;
  });
  hRow += "</tr>";
  thead.innerHTML = hRow;

  // tbody
  const tbody = document.getElementById("score-tbody");
  let html = "";

  for (let r = 0; r < rounds; r++) {
    html += "<tr>";
    html += `<td class="round-label">${r + 1}.</td>`;
    players.forEach((p, pi) => {
      const s = p.scores[r];
      const isLoos = s.looser;
      html += `<td class="${isLoos ? "looser-cell" : ""}">
        ${s.val}${isLoos ? " 💀" : ""}
      </td>`;
    });
    html += "</tr>";
  }

  // Sum row
  if (rounds > 0) {
    const minTotal = Math.min(...totals.map((t) => t.total));
    html += '<tr class="sum-row">';
    html += `<td>Suma</td>`;
    totals.forEach((t) => {
      const isMin = t.total === minTotal;
      html += `<td class="${isMin ? "sum-winner" : ""}">${t.total}</td>`;
    });
    html += "</tr>";
  }

  tbody.innerHTML =
    html ||
    `<tr><td colspan="${players.length + 1}" style="text-align:center; color:#8899aa; font-style:italic; padding:1.5rem;">Još nema rundi.</td></tr>`;
}

/* ══════════════════════════════════════════
   DELETE LAST ROUND (optional safety)
══════════════════════════════════════════ */
function deleteLastRound() {
  if (!rounds) return;
  players.forEach((p) => {
    p.scores.pop();
    p.looserRounds.delete(rounds - 1);
  });
  rounds--;
  loosers = new Set();
  renderPlayerCards();
  renderTable();
}

/* ══════════════════════════════════════════
   RESET
══════════════════════════════════════════ */
function resetGame() {
  if (!confirm("Resetovati cijelu igru?")) return;
  document.getElementById("game-view").classList.add("hidden");
  document.getElementById("setup-view").classList.remove("hidden");
  players = [];
  rounds = 0;
  loosers = new Set();
  [1, 2, 3, 4].forEach((i) => {
    document.getElementById(`p${i}`).value = "";
  });
}
