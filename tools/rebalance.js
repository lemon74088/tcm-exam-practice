/* 打散手寫題的答案位置：node tools/rebalance.js
   只處理非生成題（id 不含 -G0xx）；同組 B1 題共用同一種打散，維持共用備選答案 */
const fs = require("fs");
const path = require("path");
global.window = { TCM_QUESTIONS: [] };
const ROOT = path.join(__dirname, "..");
const DIR = path.join(ROOT, "data");
const files = fs.readdirSync(DIR).filter(f => f.endsWith(".js")).sort();

const from = {}; // id -> file
files.forEach(f => {
  const before = global.window.TCM_QUESTIONS.length;
  require(path.join(DIR, f));
  global.window.TCM_QUESTIONS.slice(before).forEach(q => { from[q.id] = f; });
});

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function perm(n, seed) {
  let x = seed || 1;
  const r = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

let changed = 0;
const Q = global.window.TCM_QUESTIONS;
Q.forEach(q => {
  if (/-G\d+/.test(q.id)) return;
  // 同 sub 同類型且選項組完全相同者（B1 題組）用同一 seed
  const key = /\|/.test(q.groupLabel || "") || q.groupLabel ? q.sub + "|" + q.type + "|" + q.groupLabel : q.id;
  const order = perm(q.opts.length, hash(key));
  const newOpts = order.map(i => q.opts[i]);
  const correctText = q.opts["ABCD".indexOf(q.ans)];
  q.opts = newOpts;
  q.ans = "ABCD"[newOpts.indexOf(correctText)];
  changed++;
});

files.forEach(f => {
  const list = Q.filter(q => from[q.id] === f);
  if (!list.length) return;
  const body = "/* " + f.replace(".js", "") + " —— " + list.length + " 題（選項位置已重排） */\n" +
    "window.TCM_QUESTIONS.push(...[\n" + list.map(q => "  " + JSON.stringify(q)).join(",\n") + "\n]);\n";
  fs.writeFileSync(path.join(DIR, f), body, "utf8");
});
console.log("重排題數:", changed);
