// cut.js：标记表与完成判定
export function addMark(marks, to, from) {
  const rows = (marks || []).map(function (row) { return [row[0], row[1].slice()]; });
  let hit = null;
  for (const row of rows) { if (row[0] === to) { hit = row; break; } }
  if (!hit) { hit = [to, []]; rows.push(hit); }
  if (hit[1].indexOf(from) < 0) {
    hit[1].push(from);
    hit[1].sort();
  }
  rows.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
  return rows;
}

export function doneOf(marks, processes) {
  const names = (processes || []).slice().sort();
  return names.filter(function (name) {
    let sources = [];
    for (const row of marks || []) { if (row[0] === name) { sources = row[1]; break; } }
    return names.every(function (other) {
      return other === name || sources.indexOf(other) >= 0;
    });
  });
}
