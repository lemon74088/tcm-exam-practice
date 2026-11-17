/* 由知識點表批量產生題目：node tools/generate.js
   產出 data/1N-gen-*.js（每次重跑覆寫，不動手寫題庫）
   規則：一知識點一題、選項不重複、描述相同者視為歧義略過、答案位置以種子打散
   每題附 why[]：與 opts 對齊，干擾項寫「該項其實屬於哪個知識點」，正解為 null */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const FACTS = path.join(__dirname, "facts");

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let x = seed || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
function shuffle(arr, seed) {
  const a = arr.slice(), r = rng(hash(seed));
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const tmp = a[i]; a[i] = a[j]; a[j] = tmp; }
  return a;
}

/* 挑干擾項：dir="same" 同章優先（貼近真題難度），dir="diff" 他章優先（避免同章近義）
   getVal 決定要比對的值（正向比描述、反向比名稱），同一值只出現一次
   回傳 [{ v, f }]：v 選項文字、f 來源知識點（用於逐項解析） */
function pickVals(rows, self, seed, t, dir, need, getVal) {
  const sameT = rows.filter(f => f.t === t), diffT = rows.filter(f => f.t !== t);
  const pool = shuffle(dir === "same" ? sameT.concat(diffT) : diffT.concat(sameT), seed);
  const out = [], seen = new Set([getVal(self)]);
  for (const f of pool) {
    if (out.length >= need) break;
    if (f.n === self.n) continue;
    const v = getVal(f);
    if (!v || seen.has(v)) continue;
    seen.add(v); out.push({ v, f });
  }
  return out;
}

/* lbl：該科各欄位在題目裡叫什麼（用來寫逐項解析） */
const CFG = [
  { sub: "diagnosis", prefix: "DX", file: "17-gen-diagnosis.js", src: "diagnosis",
    lbl: { g: "表現特點", i: "主病意義" },
    fw: n => "中醫診斷學中「" + n + "」是指：",
    rv: i => "「" + i + "」是哪一症候或體徵的特點？",
    ex: null,
    expF: f => f.n + "：" + f.g + "。" + (f.i || ""),
    expR: f => "正確為 " + f.n + "：" + f.g },
  { sub: "internal", prefix: "NK", file: "18-gen-internal.js", src: "internal",
    lbl: { g: "主症特點", i: "治法" },
    fw: n => "「" + n + "」的主症特點是：",
    rv: i => "「" + i + "」對應的內科證型是：",
    ex: null,
    expF: f => f.n + "：" + f.g + "。治法：" + (f.i || ""),
    expR: f => "正確為 " + f.n + "：" + f.g },
  { sub: "basic", prefix: "JC", file: "16-gen-basic.js", src: "basic",
    lbl: { g: "內涵", i: "補充說明" },
    fw: n => "中醫基礎理論中「" + n + "」的內涵是：",
    rv: i => "下列說明「" + i + "」所對應的概念是：",
    ex: null,
    expF: f => f.n + "：" + f.g + "。" + (f.i || ""),
    expR: f => "正確為 " + f.n + "：" + f.g },
  { sub: "materia", prefix: "ZY", file: "10-gen-materia.js", src: "materia",
    lbl: { g: "功效", i: "主治", s: "用法" },
    fw: n => "中藥「" + n + "」的功效是：",
    rv: i => "治療「" + i + "」宜選用的藥物是：",
    ex: n => "中藥「" + n + "」的用法或使用注意是：",
    expF: f => f.n + "：" + f.g + "。主治：" + (f.i || ""),
    expR: f => "正確為 " + f.n + "，功效：" + f.g },
  { sub: "formula", prefix: "FJ", file: "11-gen-formula.js", src: "formula",
    lbl: { g: "功用", i: "主治", s: "組成" },
    fw: n => "方劑「" + n + "」的功用是：",
    rv: i => "主治「" + i + "」的方劑是：",
    ex: n => "方劑「" + n + "」的組成是：",
    expF: f => f.n + "：" + f.g + "。主治：" + (f.i || "") + "。組成：" + (f.s || ""),
    expR: f => "正確為 " + f.n + "，功用：" + f.g },
  { sub: "acupuncture", prefix: "ZJ", file: "12-gen-acupuncture.js", src: "acupuncture",
    lbl: { g: "定位", i: "主治", s: "特定穴屬性" },
    fw: n => "腧穴「" + n + "」的定位是：",
    rv: i => "針灸臨床主治「" + i + "」的腧穴是：",
    ex: n => "腧穴「" + n + "」的特定穴屬性（或操作注意）是：",
    expF: f => f.n + "：" + f.g + (f.s ? "；" + f.s : ""),
    expR: f => "正確為 " + f.n + "。主治：" + f.i },
  { sub: "surgery", prefix: "WK", file: "13-gen-surgery.js", src: "surgery",
    lbl: { g: "臨床特點", i: "治法" },
    fw: n => "外科「" + n + "」的臨床特點是：",
    rv: i => "具有「" + i + "」之治法或代表方的外科病證是：",
    ex: null,
    expF: f => f.n + "：" + f.g + "。" + f.i,
    expR: f => "正確為 " + f.n + "：" + f.i },
  { sub: "pediatrics", prefix: "EK", file: "14-gen-pediatrics.js", src: "pediatrics",
    lbl: { g: "要點", i: "治法" },
    fw: n => "兒科「" + n + "」的要點是：",
    rv: i => "具有「" + i + "」之特點或治法的兒科病證是：",
    ex: null,
    expF: f => f.n + "：" + f.g + "。" + f.i,
    expR: f => "正確為 " + f.n + "：" + f.i },
  { sub: "gynecology", prefix: "FK", file: "15-gen-gynecology.js", src: "gynecology",
    lbl: { g: "要點", i: "治法" },
    fw: n => "婦科「" + n + "」的要點是：",
    rv: i => "具有「" + i + "」之特點或治法的婦科病證是：",
    ex: null,
    expF: f => f.n + "：" + f.g + "。" + f.i,
    expR: f => "正確為 " + f.n + "：" + f.i },
  /* 中藥學總論補強：獨立檔，不動 10-gen-materia.js 的既有題號 */
  { sub: "materia", prefix: "ZY-T", file: "20-gen-materia-total.js", src: "materia-total",
    lbl: { g: "內涵", i: "要點" },
    fw: n => "中藥學總論中「" + n + "」是指：",
    rv: i => "下列說明「" + i + "」所對應的中藥學總論概念是：",
    ex: null,
    expF: f => f.n + "：" + f.g + "。" + (f.i || ""),
    expR: f => "正確為 " + f.n + "：" + f.g },
  /* 中藥基本理論（本草備要·藥性總義條理）：第三檔 */
  { sub: "materia", prefix: "ZY-U", file: "21-gen-materia-basic.js", src: "materia-total2",
    lbl: { g: "內容", i: "要點" },
    fw: n => "中藥基本理論中「" + n + "」是指：",
    rv: i => "本草論「" + i + "」，所對應的藥性理論是：",
    ex: null,
    expF: f => f.n + "：" + f.g + "。" + (f.i || ""),
    expR: f => "正確為 " + f.n + "：" + f.g },
  /* 方劑學總論補強：獨立檔，不動 11-gen-formula.js 的既有題號 */
  { sub: "formula", prefix: "FJ-T", file: "22-gen-formula-total.js", src: "formula-total",
    lbl: { g: "內涵", i: "要點" },
    fw: n => "方劑學總論中「" + n + "」是指：",
    rv: i => "下列說明「" + i + "」所對應的方劑學概念是：",
    ex: null,
    expF: f => f.n + "：" + f.g + "。" + (f.i || ""),
    expR: f => "正確為 " + f.n + "：" + f.g },
  /* 方劑學「消食與其他」應用原則與配伍特點（另池） */
  { sub: "formula", prefix: "FJ-V", file: "24-gen-formula-misc2.js", src: "formula-misc2",
    lbl: { g: "要點", i: "補充" },
    fw: n => "關於「" + n + "」，正確的是：",
    rv: i => "下列說明「" + i + "」所對應的方劑學原則或特點是：",
    ex: null,
    expF: f => f.n + "：" + f.g + "。" + (f.i || ""),
    expR: f => "正確為 " + f.n + "：" + f.g },
  /* 方劑學「消食與其他」方劑本體補強 */
  { sub: "formula", prefix: "FJ-U", file: "23-gen-formula-misc.js", src: "formula-misc",
    lbl: { g: "功用", i: "主治與要點" },
    fw: n => "方劑「" + n + "」的功用是：",
    rv: i => "下列說明「" + i + "」所對應的方劑或原則是：",
    ex: null,
    expF: f => f.n + "：" + f.g + "。" + (f.i || ""),
    expR: f => "正確為 " + f.n + "：" + f.g },
  /* 針灸學三張薄章節補強：總論／治療總論／治療各論 */
  { sub: "acupuncture", prefix: "ZJ-T", file: "25-gen-acu-total.js", src: "acu-total",
    lbl: { g: "內容", i: "要點" },
    fw: n => "針灸學經絡腧穴總論中「" + n + "」是指：",
    rv: i => "下列說明「" + i + "」所對應的經絡腧穴概念是：",
    ex: null,
    expF: f => f.n + "：" + f.g + "。" + (f.i || ""),
    expR: f => "正確為 " + f.n + "：" + f.g },
  { sub: "acupuncture", prefix: "ZJ-U", file: "26-gen-acu-theory.js", src: "acu-theory",
    lbl: { g: "內容", i: "要點" },
    fw: n => "針灸治療總論中「" + n + "」是指：",
    rv: i => "下列說明「" + i + "」所對應的針灸治療原則是：",
    ex: null,
    expF: f => f.n + "：" + f.g + "。" + (f.i || ""),
    expR: f => "正確為 " + f.n + "：" + f.g },
  { sub: "acupuncture", prefix: "ZJ-V", file: "27-gen-acu-spec.js", src: "acu-spec",
    lbl: { g: "取穴", i: "加減" },
    fw: n => "針灸治療「" + n + "」的取穴是：",
    rv: i => "下列「" + i + "」所屬病證是：",
    ex: null,
    expF: f => f.n + "：" + f.g + "（" + f.i + "）",
    expR: f => "正確為 " + f.n + "：" + f.g }
];

let total = 0;
const report = [];

CFG.forEach(cfg => {
  const facts = require(path.join(FACTS, cfg.src + ".js"));
  const isAcu = cfg.sub === "acupuncture";
  let seqN = 0, skipped = 0;
  const items = [];
  const cnt = {};
  facts.forEach(f => [f.g, f.i, f.s].forEach(v => { if (v) cnt[v] = (cnt[v] || 0) + 1; }));

  /* 依欄位建列；針灸病案（k:"case"）與腧穴分開，避免選項混入處方 */
  const rows = (key, onlyPoint) => facts
    .filter(f => f[key] && (!onlyPoint || f.k !== "case"))
    .map(f => ({ n: f.n, t: f.t, k: f.k || "", v: f[key], g: f.g, i: f.i }));

  /* correct：正解文字；dist：干擾項 [{v,f}]；noteOf：把來源知識點寫成一句辨析 */
  function push(stem, correct, dist, meta, exp, tag, noteOf) {
    if (dist.length < 3) { skipped++; return; }
    const picked = dist.slice(0, 3);
    const opts = shuffle([correct].concat(picked.map(d => d.v)), stem + correct);
    const why = opts.map(o => {
      if (o === correct) return null;
      const d = picked.find(x => x.v === o);
      return d && noteOf ? noteOf(d.f) : null;
    });
    items.push({
      id: cfg.prefix + "-G" + String(++seqN).padStart(3, "0"),
      sub: cfg.sub, ch: meta.t, type: "A1", diff: meta.diff || 2,
      stem: stem, opts: opts, ans: "ABCD"[opts.indexOf(correct)], exp: exp,
      why: why.some(Boolean) ? why : undefined,
      tags: [meta.t, tag]
    });
  }

  /* 正向：名 → 敘述 */
  const grow = rows("g", isAcu);
  grow.forEach(f => {
    push(cfg.fw(f.n), f.v, pickVals(grow, f, cfg.prefix + f.n + "G", f.t, "same", 3, x => x.v),
      { t: f.t }, cfg.expF(f), "內涵定位", g => "此為「" + g.n + "」的" + cfg.lbl.g);
  });

  /* 反向：敘述 → 名（針灸主治多重複，不做反向，避免多個穴位皆可選） */
  if (!isAcu) {
    const irow = rows("i", false);
    irow.forEach(f => {
      if (cnt[f.v] > 1) { skipped++; return; }
      const names = pickVals(irow, f, cfg.prefix + f.n + "R", f.t, "diff", 3, x => x.n);
      push(cfg.rv(f.v), f.n, names, { t: f.t }, cfg.expR(f), "反向對應",
        g => "此為「" + g.n + "」的" + cfg.lbl.i + "：" + g.v);
    });
  }

  /* 附加：用法注意／方劑組成／特定穴屬性 */
  if (cfg.ex) {
    const srow = rows("s", isAcu);
    srow.forEach(f => {
      if (cnt[f.v] > 1) { skipped++; return; }
      push(cfg.ex(f.n), f.v, pickVals(srow, f, cfg.prefix + f.n + "S", f.t, "same", 3, x => x.v),
        { t: f.t, diff: 3 }, f.n + "：" + f.v, "屬性組成",
        g => "此為「" + g.n + "」的" + cfg.lbl.s);
    });
  }

  /* 針灸：病症 → 取穴（選項皆為處方，才不會混入單穴） */
  if (isAcu) {
    const cases = facts.filter(f => f.k === "case");
    const crows = cases.map(f => ({ n: f.n, t: f.t, k: "case", v: f.g, g: f.g, i: f.i }));
    cases.forEach(f => {
      push("針灸治療「" + f.n + "」的取穴是：", f.g, pickVals(crows, { n: f.n, v: f.g }, "ZJ" + f.n, f.t, "same", 3, x => x.v),
        { t: f.t, diff: 3 }, f.n + "：" + f.g + "（" + f.i + "）", "治療取穴",
        g => "此為「" + g.n + "」病的取穴");
    });
  }

  const body = "window.TCM_QUESTIONS.push(...[\n" + items.map(q => "  " + JSON.stringify(q)).join(",\n") + "\n]);\n";
  fs.writeFileSync(path.join(ROOT, "data", cfg.file), body, "utf8");
  total += items.length;
  report.push(cfg.sub + ": " + items.length + " 題（知識點 " + facts.length + "，歧義略過 " + skipped + "）");
});

console.log(report.join("\n"));
console.log("產生合計:", total);
