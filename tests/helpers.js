// Runs script.js in a sandbox with a minimal DOM stub so its game logic can be
// tested in Node. Top-level `let` bindings (players, rounds…) stay reachable
// through run() because every call shares the same context.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../script.js", import.meta.url), "utf8");

function element() {
  return {
    value: "",
    innerHTML: "",
    textContent: "",
    classList: { add() {}, remove() {}, toggle() {} },
    focus() {},
  };
}

export function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

export function loadGame({ localStorage = memoryStorage() } = {}) {
  const elements = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, element());
      return elements.get(id);
    },
  };
  const context = vm.createContext({ document, localStorage, confirm: () => true });
  vm.runInContext(source, context, { filename: "script.js" });
  const run = (code) => vm.runInContext(code, context);
  return { run, document, localStorage };
}

export const plain = (v) => JSON.parse(JSON.stringify(v));
