/* 由知識點表產生複習卡片：node tools/build-cards.js
   產出 data/20-cards.js；卡片與題庫共用同一份知識點表，改表後重跑即可 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const FACTS = path.join(__dirname, "facts");

const CFG = [
  { sub: "diagnosis", prefix: "DX", src: "diagnosis",
    front: f => f.n, back: f => f.g + (f.i ? "。" + f.i : "") },
  { sub: "internal", prefix: "NK", src: "internal",
    front: f => f.n, back: f => "主症：" + f.g + "。治法：" + f.i },
  { sub: "basic", prefix: "JC", src: "basic",
    front: f => f.n, back: f => f.g + (f.i ? "。" + f.i : "") },
  { sub: "materia", prefix: "ZY", src: "materia",
    front: f => f.n, back: f => "功效：" + f.g + (f.i ? "。主治：" + f.i : "") + (f.s ? "。用法：" + f.s : "") },
  { sub: "formula", prefix: "FJ", src: "formula",
    front: f => f.n, back: f => "功用：" + f.g + (f.i ? "。主治：" + f.i : "") + (f.s ? "。組成：" + f.s : "") },
  { sub: "acupuncture", prefix: "ZJ", src: "acupuncture",
    front: f => (f.k === "case" ? "針灸治療：" + f.n : f.n),
    back: f => (f.k === "case" ? "取穴：" + f.g + "。" + f.i : "定位：" + f.g + (f.i ? "。主治：" + f.i : "") + (f.s ? "。" + f.s : "")) },
  { sub: "surgery", prefix: "WK", src: "surgery",
    front: f => f.n, back: f => f.g + "。" + f.i },
  { sub: "pediatrics", prefix: "EK", src: "pediatrics",
    front: f => f.n, back: f => f.g + "。" + f.i },
  { sub: "gynecology", prefix: "FK", src: "gynecology",
    front: f => f.n, back: f => f.g + "。" + f.i }
];

let all = [];
const report = [];
CFG.forEach(cfg => {
  const facts = require(path.join(FACTS, cfg.src + ".js"));
  const cards = facts.map((f, i) => ({
    id: cfg.prefix + "-C" + String(i + 1).padStart(3, "0"),
    sub: cfg.sub, ch: f.t,
    front: cfg.front(f), back: cfg.back(f),
    tags: [f.t]
  })).filter(c => c.front && c.back);
  all = all.concat(cards);
  report.push(cfg.sub + ": " + cards.length);
});

const body = "/* 複習卡片 —— 由 tools/build-cards.js 自知識點表產生，重跑即覆寫 */\n" +
  "window.TCM_CARDS = (window.TCM_CARDS || []).concat([\n" +
  all.map(c => "  " + JSON.stringify(c)).join(",\n") + "\n]);\n";
fs.writeFileSync(path.join(ROOT, "data", "20-cards.js"), body, "utf8");
console.log(report.join("\n"));
console.log("卡片合計:", all.length);
