// cutrun.js：按处理预算处理并留账
import { addMark } from "./cut.js";

function copyState(state) {
  const s = state || {};
  return {
    marks: (s.marks || []).map(function (row) { return [row[0], row[1].slice()]; }),
    done: (s.done || []).slice(),
    snaps: s.snaps || 0,
    ledger: (s.ledger || []).map(function (entry) { return entry.slice(); }),
    applied: (s.applied || []).slice()
  };
}

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function codesOf(spec) {
  return {
    process: spec.process_error_code || "E_NO_PROCESS",
    dup: spec.dup_error_code || "E_DUP_MARK",
    self: spec.self_error_code || "E_SELF_MARK",
    event: spec.event_error_code || "E_BAD_EVENT"
  };
}

function keyOf(from, to) {
  return from + " " + to;
}

function checkShape(event, codes) {
  if (!event || typeof event !== "object"
      || typeof event.from !== "string" || typeof event.to !== "string") {
    fail(codes.event, "事件结构不合法");
  }
}

function applyMark(state, processes, from, to) {
  state.marks = addMark(state.marks, to, from);
  state.applied.push(keyOf(from, to));
  if (state.done.indexOf(to) < 0) {
    let sources = [];
    for (const row of state.marks) { if (row[0] === to) { sources = row[1]; break; } }
    const complete = processes.every(function (name) {
      return name === to || sources.indexOf(name) >= 0;
    });
    if (complete) { state.done.push(to); }
  }
  if (state.snaps === 0 && processes.length > 0 && state.done.length === processes.length) {
    state.snaps = 1;
  }
}

function judgeOne(state, processes, codes, from, to) {
  if (processes.indexOf(from) < 0 || processes.indexOf(to) < 0) {
    fail(codes.process, "发方或收方不在进程名单里");
  }
  if (from === to) {
    fail(codes.self, "不能自己发给自己");
  }
  for (const row of state.marks) {
    if (row[0] === to && row[1].indexOf(from) >= 0) {
      fail(codes.dup, "同一来源对同一收方重复流转");
    }
  }
  applyMark(state, processes, from, to);
}

export function step(spec) {
  const processes = spec.processes || [];
  const events = spec.events || [];
  const codes = codesOf(spec);
  const state = copyState(spec.state);
  for (const event of events) { checkShape(event, codes); }
  const carried = state.ledger.length;
  const budget = typeof spec.budget === "number" ? spec.budget : carried + events.length;
  let remaining = budget;
  let served = 0;
  const queue = state.ledger.map(function (entry) {
    return { kind: entry[0], from: entry[1], to: entry[2], carried: true };
  }).concat(events);
  state.ledger = [];
  for (const item of queue) {
    if (!item.carried && state.applied.indexOf(keyOf(item.from, item.to)) >= 0) { continue; }
    if (remaining <= 0) {
      state.ledger.push([item.kind || "mark", item.from, item.to]);
      continue;
    }
    judgeOne(state, processes, codes, item.from, item.to);
    remaining -= 1;
    served += 1;
  }
  return { state: state, served: served, ledger_before: state.ledger.length,
           ledger: state.ledger, judged: served, judged_bound: carried + events.length };
}

export function close(spec) {
  const processes = spec.processes || [];
  const codes = codesOf(spec);
  const state = copyState(spec.state);
  const pending = state.ledger;
  state.ledger = [];
  let catchup = 0;
  for (const entry of pending) {
    const from = entry[1];
    const to = entry[2];
    if (state.applied.indexOf(keyOf(from, to)) >= 0) { continue; }
    judgeOne(state, processes, codes, from, to);
    catchup += 1;
  }
  return { state: state, catchup: catchup };
}
