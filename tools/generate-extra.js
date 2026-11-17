/* 補充題源：緒論補強 + 古籍原文／典籍醫家
   node tools/generate-extra.js → data/19-gen-extra.js
   題號：DX-E###（診斷緒論）、JC-E###（基礎緒論）、JC-Q###（古籍）
   每題附 why[]（與 opts 對齊，正解為 null） */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const FACTS = path.join(__dirname, "facts");

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let x = seed || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
function shuffle(arr, seed) {
  const a = arr.slice(), r = rng(hash(seed));
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
function pick(list, selfVal, seed, need, valOf) {
  const out = [], seen = new Set([selfVal]);
  for (const f of shuffle(list, seed)) {
    if (out.length >= need) break;
    const v = valOf(f);
    if (!v || seen.has(v)) continue;
    seen.add(v); out.push({ v, f });
  }
  return out;
}

const items = [];
let nDx = 0, nJc = 0, nQ = 0;

function push(id, sub, ch, stem, correct, dist, exp, why, tags, diff) {
  if (dist.length < 3) return false;
  const picked = dist.slice(0, 3);
  const opts = shuffle([correct].concat(picked.map(d => d.v)), stem + correct);
  const whyArr = opts.map(o => {
    if (o === correct) return null;
    const d = picked.find(x => x.v === o);
    return d ? why(d.f) : null;
  });
  items.push({ id, sub, ch, type: "A1", diff: diff || 3, stem, opts,
    ans: "ABCD"[opts.indexOf(correct)], exp,
    why: whyArr.some(Boolean) ? whyArr : undefined, tags });
  return true;
}

/* ── 1. 緒論補強（診斷 / 基礎）── */
[
  { sub: "diagnosis", prefix: "DX-E", src: "intro-diagnosis", fw: n => "中醫診斷學緒論中「" + n + "」是指：", lbl: "內涵" },
  { sub: "basic",     prefix: "JC-E", src: "intro-basic",     fw: n => "中醫基礎理論緒論中「" + n + "」是指：", lbl: "內涵" }
].forEach(cfg => {
  const facts = require(path.join(FACTS, cfg.src + ".js"));
  const rows = facts.map(f => ({ n: f.n, g: f.g, i: f.i, t: f.t, v: f.g }));
  let seq = 0;
  rows.forEach(f => {
    const ok = push(cfg.prefix + String(++seq).padStart(3, "0"), cfg.sub, f.t,
      cfg.fw(f.n), f.g,
      pick(rows, f.g, cfg.prefix + f.n, 3, x => x.v),
      f.n + "：" + f.g + "。" + (f.i || ""),
      g => "此為「" + g.n + "」的" + cfg.lbl,
      [f.t, "緒論補強"]);
    if (!ok) seq--;
  });
  // 反向：敘述 → 名
  rows.forEach(f => {
    const names = pick(rows, f.n, cfg.prefix + f.n + "R", 3, x => x.n);
    const ok = push(cfg.prefix + String(++seq).padStart(3, "0"), cfg.sub, f.t,
      "下列說明「" + f.i + "」所對應的概念是：", f.n, names,
      "正確為 " + f.n + "：" + f.g,
      g => "此為「" + g.n + "」：" + g.g,
      [f.t, "緒論補強"]);
    if (!ok) seq--;
  });
});

/* ── 2. 古籍原文 ── */
const CL = require(path.join(FACTS, "classics.js"));
const quotes = CL.filter(f => f.k === "quote");
const books = CL.filter(f => f.k === "book");

/* 書名 → 作者年代（干擾項辨析用） */
const bookMeta = new Map();
books.forEach(b => bookMeta.set(b.n, b.g));
quotes.forEach(q => { if (!bookMeta.has(q.b)) bookMeta.set(q.b, q.g); });
const bookList = [...bookMeta.entries()].map(([n, g]) => ({ n, g, v: n }));

/* 2-1 原文 → 出處 */
quotes.forEach(q => {
  const dist = pick(bookList, q.b, "BK" + q.n, 3, x => x.v);
  push("JC-Q" + String(++nQ).padStart(3, "0"), "basic", "古籍原文與應用",
    "「" + q.n + "」出自哪部典籍？", "《" + q.b + "》", dist,
    "出自" + q.g + "：" + q.i,
    d => "《" + d.n + "》——" + d.g,
    ["古籍原文與應用", "原文出處"]);
});

/* 2-2 原文 → 闡釋 */
quotes.forEach(q => {
  const pool = quotes.map(x => ({ n: x.n, i: x.i, v: x.i }));
  const dist = pick(pool, q.i, "EX" + q.n, 3, x => x.v);
  push("JC-Q" + String(++nQ).padStart(3, "0"), "basic", "古籍原文與應用",
    "「" + q.n + "」主要說明的是：", q.i, dist,
    q.g + "：" + q.i,
    d => "此為「" + d.n.slice(0, 10) + (d.n.length > 10 ? "…" : "") + "」之義",
    ["古籍原文與應用", "原文闡釋"]);
});

/* ── 3. 典籍與醫家 ── */
books.forEach(b => {
  const pool = books.map(x => ({ n: x.n, i: x.i, v: x.i }));
  const dist = pick(pool, b.i, "CT" + b.n, 3, x => x.v);
  push("JC-Q" + String(++nQ).padStart(3, "0"), "basic", "典籍與醫家",
    "《" + b.n + "》的主要學術貢獻是：", b.i, dist,
    b.n + "（" + b.g + "）：" + b.i,
    d => "此為《" + d.n + "》之貢獻",
    ["典籍與醫家", "典籍貢獻"]);
});
books.forEach(b => {
  const pool = books.map(x => ({ n: x.n, g: x.g, v: x.n }));
  const dist = pick(pool, b.n, "CB" + b.n, 3, x => x.v);
  push("JC-Q" + String(++nQ).padStart(3, "0"), "basic", "典籍與醫家",
    "「" + b.i + "」是哪部典籍的學術貢獻？", "《" + b.n + "》", dist,
    "《" + b.n + "》（" + b.g + "）：" + b.i,
    d => "《" + d.n + "》——" + d.g,
    ["典籍與醫家", "典籍對應"]);
});

const body = "window.TCM_QUESTIONS.push(...[\n" + items.map(q => "  " + JSON.stringify(q)).join(",\n") + "\n]);\n";
fs.writeFileSync(path.join(ROOT, "data", "19-gen-extra.js"), body, "utf8");

const byCh = {};
items.forEach(q => { byCh[q.ch] = (byCh[q.ch] || 0) + 1; });
const ans = {};
items.forEach(q => { ans[q.ans] = (ans[q.ans] || 0) + 1; });
console.log("補充題:", items.length, byCh, "答案分布", ans);
