import { test } from "node:test";
import assert from "node:assert/strict";
import { loadGame, plain } from "./helpers.js";

const game = loadGame();
const call = (fn, ...args) => plain(game.run(`${fn}(...${JSON.stringify(args)})`));
const s = (val, looser = false) => ({ val, looser });

test("parseLimit: empty means 51, below 11 or not a whole number is refused", () => {
  assert.equal(call("parseLimit", ""), 51);
  assert.equal(call("parseLimit", " 101 "), 101);
  assert.equal(call("parseLimit", "11"), 11);
  assert.equal(call("parseLimit", "10"), null);
  assert.equal(call("parseLimit", "20.5"), null);
  assert.equal(call("parseLimit", "abc"), null);
});

test("runningTotals records a šuster round, then resets", () => {
  const r = call("runningTotals", [s(5), s(4), s(0, true), s(3)]);
  assert.deepEqual(r.perRound.map((x) => x.cumulative), [5, 9, 9, 3]);
  assert.equal(r.total, 3);
});

test("findGameEnd: nobody at the limit means the game goes on", () => {
  assert.equal(call("findGameEnd", [[5, 30, 50], [4, 20, 25]], 51), null);
  assert.equal(call("findGameEnd", [[], []], 51), null);
});

test("findGameEnd: reaching the limit exactly loses", () => {
  assert.deepEqual(call("findGameEnd", [[45, 51], [4, 7]], 51), { round: 1, losers: [0], total: 51 });
});

test("findGameEnd: several cross in the same round, the highest total loses", () => {
  assert.deepEqual(call("findGameEnd", [[48, 53], [47, 52], [1, 2]], 51), { round: 1, losers: [0], total: 53 });
});

test("findGameEnd: a tie at the top shares the loss", () => {
  assert.deepEqual(call("findGameEnd", [[48, 52], [47, 52], [1, 2]], 51), { round: 1, losers: [0, 1], total: 52 });
});

test("findGameEnd: the first round over the limit decides, later rounds don't matter", () => {
  assert.deepEqual(call("findGameEnd", [[50, 55, 60], [10, 20, 70]], 51), { round: 1, losers: [0], total: 55 });
});

test("šuster: a reset keeps a player under the limit that the old total would have crossed", () => {
  const ana = call("runningTotals", [s(9), s(9), s(9), s(9), s(9), s(0, true), s(9)]).perRound.map((x) => x.cumulative);
  const marko = call("runningTotals", [s(0), s(0), s(0), s(0), s(0), s(9), s(0)]).perRound.map((x) => x.cumulative);
  assert.deepEqual(ana, [9, 18, 27, 36, 45, 45, 9]);
  assert.equal(call("findGameEnd", [ana, marko], 51), null);
});

test("šuster: the šuster's 0 can't push them over, but the others can still lose that round", () => {
  const ana = call("runningTotals", [s(45), s(0, true)]).perRound.map((x) => x.cumulative);
  const marko = call("runningTotals", [s(44), s(9)]).perRound.map((x) => x.cumulative);
  assert.deepEqual(call("findGameEnd", [ana, marko], 51), { round: 1, losers: [1], total: 53 });
});

test("addToHistory puts the newest first, replaces the same id and keeps at most 50", () => {
  let list = [];
  for (let i = 0; i < 55; i++) list = call("addToHistory", list, { id: `g${i}` });
  assert.equal(list.length, 50);
  assert.equal(list[0].id, "g54");
  assert.equal(list.at(-1).id, "g5");
  list = call("addToHistory", list, { id: "g40", again: true });
  assert.equal(list.length, 50);
  assert.deepEqual(list[0], { id: "g40", again: true });
  assert.equal(list.filter((h) => h.id === "g40").length, 1);
});

test("playerStats counts games and losses and averages the final totals", () => {
  const history = [
    { players: [{ name: "Ana", total: 53 }, { name: "Marko", total: 20 }], losers: ["Ana"] },
    { players: [{ name: "Ana", total: 10 }, { name: "Marko", total: 52 }, { name: "Jelena", total: 30 }], losers: ["Marko"] },
    { players: [{ name: "Ana", total: 12 }, { name: "Marko", total: 13 }], losers: [] },
  ];
  assert.deepEqual(call("playerStats", history), [
    { name: "Ana", games: 3, losses: 1, average: 25 },
    { name: "Marko", games: 3, losses: 1, average: 28.3 },
    { name: "Jelena", games: 1, losses: 0, average: 30 },
  ]);
});
