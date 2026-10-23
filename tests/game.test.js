import { test } from "node:test";
import assert from "node:assert/strict";
import { loadGame, memoryStorage, plain } from "./helpers.js";

function start(game, names) {
  [1, 2, 3, 4].forEach((i) => (game.document.getElementById(`p${i}`).value = names[i - 1] ?? ""));
  game.run("startGame()");
}

function round(game, values, shuster = []) {
  values.forEach((v, i) => (game.document.getElementById(`input-${i}`).value = String(v)));
  shuster.forEach((i) => game.run(`loosers.add(${i})`));
  game.run("addRound()");
}

const totals = (game) => plain(game.run("computeTotals().map((t) => t.total)"));

test("setup needs at least two different names; blanks are skipped", () => {
  const game = loadGame();
  start(game, ["Ana"]);
  assert.match(game.document.getElementById("setup-error").textContent, /najmanje 2/);
  start(game, ["Ana", "Ana"]);
  assert.match(game.document.getElementById("setup-error").textContent, /različita/);
  start(game, ["Ana", "", "Marko"]);
  assert.deepEqual(plain(game.run("players.map((p) => p.name)")), ["Ana", "Marko"]);
});

test("a round must add up to 8 or 9", () => {
  const game = loadGame();
  start(game, ["Ana", "Marko", "Jelena"]);
  round(game, [1, 1, 1]);
  assert.equal(game.run("rounds"), 0);
  assert.match(game.document.getElementById("round-error").textContent, /8 ili 9/);
  round(game, [3, 4, 2]);
  assert.equal(game.run("rounds"), 1);
  round(game, [4, 4, 0]);
  assert.equal(game.run("rounds"), 2);
  assert.deepEqual(totals(game), [7, 8, 2]);
});

test("šuster scores 0, is left out of the 8/9 check and resets the running total", () => {
  const game = loadGame();
  start(game, ["Ana", "Marko", "Jelena"]);
  round(game, [3, 4, 2]);
  round(game, [5, 4, 7], [2]); // Jelena is šuster: 5 + 4 = 9
  assert.deepEqual(totals(game), [8, 8, 0]);
  round(game, [3, 3, 2]);
  assert.deepEqual(totals(game), [11, 11, 2]);
});

test("undo removes the last round", () => {
  const game = loadGame();
  start(game, ["Ana", "Marko"]);
  round(game, [4, 4]);
  round(game, [5, 4]);
  game.run("deleteLastRound()");
  assert.equal(game.run("rounds"), 1);
  assert.deepEqual(totals(game), [4, 4]);
});

test("the live sum follows the inputs and ignores šuster players", () => {
  const game = loadGame();
  start(game, ["Ana", "Marko", "Jelena"]);
  [5, 4, 6].forEach((v, i) => (game.document.getElementById(`input-${i}`).value = String(v)));
  game.run("loosers.add(2); updateRoundSum()");
  assert.equal(game.document.getElementById("round-sum").textContent, "Zbir: 9 / 8–9");
});

test("a game in progress survives a reload, and a reset clears it", () => {
  const storage = memoryStorage();
  const first = loadGame({ localStorage: storage });
  start(first, ["Ana", "Marko", "Jelena"]);
  round(first, [3, 4, 2]);
  round(first, [5, 4, 0], [2]);

  const reloaded = loadGame({ localStorage: storage });
  assert.equal(reloaded.run("rounds"), 2);
  assert.deepEqual(totals(reloaded), [8, 8, 0]);
  assert.equal(reloaded.run("players[2].looserRounds.has(1)"), true);

  reloaded.run("confirmReset()");
  assert.equal(loadGame({ localStorage: storage }).run("players.length"), 0);
});

test("saved data that doesn't match is ignored", () => {
  const bad = JSON.stringify({ players: [{ name: "A", scores: [] }, { name: "B", scores: [{ val: 1 }] }], rounds: 0 });
  const game = loadGame({ localStorage: memoryStorage({ "sedmica.game.v1": bad }) });
  assert.equal(game.run("players.length"), 0);
});

test("player names are escaped", () => {
  const game = loadGame();
  start(game, ["<img src=x onerror=alert(1)>", "B"]);
  round(game, [4, 4]);
  const html =
    game.document.getElementById("player-cards").innerHTML +
    game.document.getElementById("score-thead").innerHTML;
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes("&lt;img"));
});

const history = (storage) => JSON.parse(storage.getItem("sedmica.history.v1") ?? "[]");

test("Igra do: defaults to 51, is saved with the game and refuses less than 11", () => {
  const storage = memoryStorage();
  const game = loadGame({ localStorage: storage });
  game.document.getElementById("limit").value = "9";
  start(game, ["Ana", "Marko"]);
  assert.match(game.document.getElementById("setup-error").textContent, /najmanje 11/);
  game.document.getElementById("limit").value = "21";
  start(game, ["Ana", "Marko"]);
  assert.equal(game.run("limit"), 21);
  assert.equal(JSON.parse(storage.getItem("sedmica.game.v1")).limit, 21);
  assert.match(game.document.getElementById("subtitle").textContent, /igra do 21/);
  assert.equal(loadGame({ localStorage: storage }).run("limit"), 21);
});

test("an old saved game without a limit plays to 51", () => {
  const old = JSON.stringify({ players: [{ name: "A", scores: [{ val: 4, looser: false }] }, { name: "B", scores: [{ val: 4, looser: false }] }], rounds: 1 });
  const game = loadGame({ localStorage: memoryStorage({ "sedmica.game.v1": old }) });
  assert.equal(game.run("limit"), 51);
  assert.equal(game.run("rounds"), 1);
});

test("the table shows each round's points and the running total beneath", () => {
  const game = loadGame();
  start(game, ["Ana", "Marko", "Jelena"]);
  round(game, [3, 4, 2]);
  round(game, [5, 4, 7], [2]);
  const html = game.document.getElementById("score-tbody").innerHTML;
  assert.match(html, /cell-pts">5<\/span>\s*<span class="cell-run">Σ 8</);
  assert.match(html, /cell-pts">0 💀<\/span>\s*<span class="cell-run">↺ 0</);
});

test("reaching the limit ends the game, locks round entry and is written to the history", () => {
  const storage = memoryStorage();
  const game = loadGame({ localStorage: storage });
  game.document.getElementById("limit").value = "11";
  start(game, ["Ana", "Marko"]);
  round(game, [5, 4]);
  assert.equal(game.run("gameResult()"), null);
  round(game, [6, 3]); // Ana 11
  assert.deepEqual(plain(game.run("gameResult()")), { round: 1, losers: [0], total: 11 });
  assert.match(game.document.getElementById("game-over-text").innerHTML, /Gubitnik: <b>Ana<\/b> — 11 \/ 11/);
  assert.equal(game.document.getElementById("add-btn").disabled, true);
  assert.match(game.document.getElementById("player-cards").innerHTML, /disabled/);

  round(game, [4, 4]); // ignored
  assert.equal(game.run("rounds"), 2);

  const [entry] = history(storage);
  assert.deepEqual(entry.losers, ["Ana"]);
  assert.deepEqual(entry.players, [{ name: "Ana", total: 11 }, { name: "Marko", total: 7 }]);
  assert.equal(entry.limit, 11);
  assert.equal(entry.finished, true);

  // Starting a new game doesn't add the finished game twice.
  game.run("confirmReset()");
  assert.equal(history(storage).length, 1);
});

test("players crossing together: the highest loses, a tie shares the loss", () => {
  const game = loadGame();
  game.document.getElementById("limit").value = "11";
  start(game, ["Ana", "Marko", "Jelena"]);
  round(game, [4, 4, 0]);
  round(game, [4, 4, 0]); // both 8
  round(game, [4, 4, 0]); // both 12
  assert.match(game.document.getElementById("game-over-text").innerHTML, /Gubitnici: <b>Ana<\/b> i <b>Marko<\/b> — 12/);
});

test("undo of the deciding round reopens the game and takes it out of the history", () => {
  const storage = memoryStorage();
  const game = loadGame({ localStorage: storage });
  game.document.getElementById("limit").value = "11";
  start(game, ["Ana", "Marko"]);
  round(game, [5, 4]);
  round(game, [6, 3]);
  assert.equal(history(storage).length, 1);
  game.run("deleteLastRound()");
  assert.equal(game.run("gameResult()"), null);
  assert.equal(game.document.getElementById("add-btn").disabled, false);
  assert.equal(history(storage).length, 0);
  round(game, [3, 6]);
  assert.equal(game.run("rounds"), 2);
});

test("a šuster reset can keep a player in the game", () => {
  const game = loadGame();
  game.document.getElementById("limit").value = "11";
  start(game, ["Ana", "Marko", "Jelena"]);
  round(game, [5, 4, 0]);
  round(game, [0, 5, 4], [0]); // Ana šuster: 5 → 0
  round(game, [5, 0, 4]);
  assert.deepEqual(totals(game), [5, 9, 8]);
  assert.equal(game.run("gameResult()"), null);
});

test("an unfinished game with rounds is saved to the history on reset, an empty one isn't", () => {
  const storage = memoryStorage();
  const game = loadGame({ localStorage: storage });
  start(game, ["Ana", "Marko"]);
  game.run("confirmReset()");
  assert.equal(history(storage).length, 0);
  start(game, ["Ana", "Marko"]);
  round(game, [5, 4]);
  game.run("confirmReset()");
  const [entry] = history(storage);
  assert.equal(entry.finished, false);
  assert.deepEqual(entry.losers, []);
  assert.match(game.document.getElementById("history-list").innerHTML, /nedovršena/);
  assert.match(game.document.getElementById("stats-tbody").innerHTML, /Ana/);
});

test("clearing the history empties it", () => {
  const storage = memoryStorage();
  const game = loadGame({ localStorage: storage });
  start(game, ["Ana", "<b>x</b>"]);
  round(game, [5, 4]);
  game.run("confirmReset()");
  assert.ok(!game.document.getElementById("history-list").innerHTML.includes("<b>x"));
  game.run("confirmClearHistory()");
  assert.equal(storage.getItem("sedmica.history.v1"), null);
  assert.equal(game.document.getElementById("history-list").innerHTML, "");
});
