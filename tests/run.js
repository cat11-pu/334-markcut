import assert from "node:assert";
import { addMark, doneOf } from "../cut.js";
import { step, close } from "../cutrun.js";
import { render } from "../app.js";

const base = {
  budget: 1, processes: ["p1", "p2"],
  state: { marks: [["p1", []], ["p2", []]], done: [], snaps: 0, ledger: [], applied: [] },
  events: [{ id: 1, kind: "mark", from: "p1", to: "p2" }],
  process_error_code: "E_NO_PROCESS", dup_error_code: "E_DUP_MARK",
  self_error_code: "E_SELF_MARK", event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("addMark returns rows", () => {
  assert.ok(Array.isArray(addMark([], "z", "y")));
});

check("doneOf returns names", () => {
  assert.ok(Array.isArray(doneOf([], ["z"])));
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
