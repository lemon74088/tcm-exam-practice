/* 題庫檢驗與匯出：node tools/build.js
   1) 讀 data.js 與 data/NN-*.js（以 window 假物件載入，依檔名順序）  2) 檢驗結構  3) 匯出 JSON / CSV */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
global.window = {};
require(path.join(ROOT, "data.js"));

const DATA_DIR = path.join(ROOT, "data");
const files = fs.readdirSync(DATA_DIR).filter(f => /^\d{2}-.*\.js$/.test(f)).sort();
files.forEach(f => require(path.join(DATA_DIR, f)));

const Q = global.window.TCM_QUESTIONS;
const S = global.window.TCM_SUBJECTS;
console.log("已載入:", files.join(" "));

let bad = [];
const seen = new Set();
const stemSeen = new Map();
Q.forEach((q, i) => {
  if (seen.has(q.id)) bad.push(`${q.id}: 重複 ID`);
  seen.add(q.id);
  ["id","sub","ch","type","diff","stem","opts","ans","exp","tags"].forEach(k => {
    if (q[k] === undefined || q[k] === "") bad.push(`${q.id}: 缺欄位 ${k}`);
  });
  if (!Array.isArray(q.opts) || q.opts.length !== 4) bad.push(`${q.id}: 選項數 ${q.opts && q.opts.length}`);
  if (new Set(q.opts).size !== q.opts.length) bad.push(`${q.id}: 選項重複`);
  if (!"ABCD".includes(q.ans) || "ABCD".indexOf(q.ans) >= q.opts.length) bad.push(`${q.id}: 答案 ${q.ans} 越界`);
  if (!Array.isArray(q.tags) || !q.tags.length) bad.push(`${q.id}: tags 空`);
  const key = [q.sub, q.stem, q.case || "", q.groupLabel || ""].join("|");
  if (stemSeen.has(key)) bad.push(`${q.id}: 題幹與 ${stemSeen.get(key)} 重複`);
  else stemSeen.set(key, q.id);
});

const byCh = {};
Q.forEach(q => { byCh[q.ch] = (byCh[q.ch] || 0) + 1; });

console.log("總題數:", Q.length);
console.log("異常:", bad.length ? bad.join("\n  ") : "無");
console.log("章節分布:", byCh);
console.log("題型:", Q.reduce((a,q)=>(a[q.type]=(a[q.type]||0)+1,a),{}));

/* ---- 匯出 JSON（供 App 以外的程式／未來匯入資料庫用） ---- */
fs.writeFileSync(
  path.join(ROOT, "exports", "bank.json"),
  JSON.stringify({ schema: global.window.TCM_SCHEMA, updated: global.window.TCM_UPDATED, subjects: S, questions: Q }, null, 2),
  "utf8"
);

/* ---- 匯出 CSV（UTF-8 BOM，Excel / 飛書可直接開） ---- */
const esc = v => `"${String(v).replace(/"/g, '""')}"`;
const head = ["題號","科目","章節","題型","難度","題幹","A","B","C","D","答案","解析","其他選項辨析","標籤"];
const whyText = q => (q.why || []).map((w, i) => w ? "ABCD"[i] + "：" + w : "").filter(Boolean).join("｜");
const rows = Q.map(q => [
  q.id, q.sub, q.ch, q.type, q.diff, q.stem, ...q.opts, q.ans, q.exp, whyText(q), q.tags.join("／")
].map(esc).join(","));
fs.writeFileSync(
  path.join(ROOT, "exports", "題庫_匯總.csv"),
  "\uFEFF" + [head.map(esc).join(","), ...rows].join("\r\n"),
  "utf8"
);

S.forEach(s => { s.n = Q.filter(q => q.sub === s.id).length; });
console.log("科目題數:", S.map(s => `${s.name}=${s.n}`).join(" "));
