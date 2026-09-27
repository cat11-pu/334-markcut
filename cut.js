// cut.js：标记表与完成判定
export function addMark(marks, to, from) {
  const next = marks.map(function (row) { return [row[0], row[1].slice()]; });
  let row = null;
  next.forEach(function (entry) { if (entry[0] === to) row = entry; });
  if (!row) {
    row = [to, []];
    next.push(row);
    next.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
  }
  if (row[1].indexOf(from) < 0) {
    row[1].push(from);
    row[1].sort();
  }
  return next;
}

export function doneOf(marks, processes) {
  return processes.slice().sort().filter(function (name) {
    let sources = [];
    marks.forEach(function (row) { if (row[0] === name) sources = row[1]; });
    return processes.every(function (other) {
      return other === name || sources.indexOf(other) >= 0;
    });
  });
}
