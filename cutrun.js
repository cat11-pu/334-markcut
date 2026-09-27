// cutrun.js：按处理预算处理并留账
import { addMark, doneOf } from "./cut.js";

function codesOf(spec) {
  return {
    process: spec.process_error_code || "E_NO_PROCESS",
    dup: spec.dup_error_code || "E_DUP_MARK",
    self: spec.self_error_code || "E_SELF_MARK",
    event: spec.event_error_code || "E_BAD_EVENT"
  };
}

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function isMarkEvent(event) {
  return event !== null && typeof event === "object" && !Array.isArray(event)
    && event.kind === "mark"
    && typeof event.from === "string" && typeof event.to === "string";
}

export function step(spec) {
  const processes = (spec.processes || []).slice();
  const events = spec.events || [];
  const codes = codesOf(spec);
  events.forEach(function (event) {
    if (!isMarkEvent(event)) fail(codes.event, "事件结构不合法");
  });
  const state = spec.state || {};
  let marks = (state.marks || []).map(function (row) { return [row[0], row[1].slice()]; });
  const done = (state.done || []).slice();
  let snaps = state.snaps || 0;
  let ledger = (state.ledger || []).map(function (entry) { return entry.slice(); });
  const applied = (state.applied || []).slice();
  const judged_bound = ledger.length + events.length;
  let budget = Math.max(0, spec.budget || 0);
  let served = 0;
  let judged = 0;

  function applyMark(from, to) {
    if (processes.indexOf(from) < 0 || processes.indexOf(to) < 0) {
      fail(codes.process, "进程不在名单: " + from + " -> " + to);
    }
    if (from === to) fail(codes.self, "自己发给自己: " + from);
    let row = null;
    marks.forEach(function (entry) { if (entry[0] === to) row = entry; });
    if (row && row[1].indexOf(from) >= 0) {
      fail(codes.dup, "同一来源重复流转: " + from + " -> " + to);
    }
    marks = addMark(marks, to, from);
    doneOf(marks, processes).forEach(function (name) {
      if (done.indexOf(name) < 0) done.push(name);
    });
    if (processes.length > 0 && done.length === processes.length && snaps === 0) snaps += 1;
  }

  const pending = [];
  ledger.forEach(function (entry) {
    judged += 1;
    if (budget > 0) {
      budget -= 1;
      applyMark(entry[1], entry[2]);
      served += 1;
    } else {
      pending.push(entry);
    }
  });
  ledger = pending;

  events.forEach(function (event) {
    judged += 1;
    const key = event.id === undefined ? null : event.id;
    if (key !== null && applied.indexOf(key) >= 0) return;
    if (budget > 0) {
      budget -= 1;
      applyMark(event.from, event.to);
      served += 1;
    } else {
      ledger.push([event.kind, event.from, event.to]);
    }
    if (key !== null) applied.push(key);
  });

  return {
    state: { marks: marks, done: done, snaps: snaps, ledger: ledger, applied: applied },
    served: served,
    ledger_before: ledger.length,
    ledger: ledger.map(function (entry) { return entry.slice(); }),
    judged: judged,
    judged_bound: judged_bound
  };
}

export function close(spec) {
  const ledger = (spec.state && spec.state.ledger) || [];
  const ran = step(Object.assign({}, spec, { events: [], budget: ledger.length }));
  return { state: ran.state, catchup: ran.served };
}
