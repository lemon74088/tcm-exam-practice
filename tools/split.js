/* 一次性重構：把 data.js 內的題目依科目拆成 data/NN-*.js
   執行：node tools/split.js */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
global.window = {};
require(path.join(ROOT, "data.js"));
const Q = window.TCM_QUESTIONS;
const S = window.TCM_SUBJECTS;

const order = ["diagnosis", "internal", "basic", "materia", "formula", "acupuncture", "surgery", "pediatrics", "gynecology"];
const nameMap = {
  diagnosis: "01-diagnosis", internal: "02-internal", basic: "03-basic", materia: "04-materia",
  formula: "05-formula", acupuncture: "06-acupuncture", surgery: "07-surgery",
  pediatrics: "08-pediatrics", gynecology: "09-gynecology"
};
const dir = path.join(ROOT, "data");
fs.mkdirSync(dir, { recursive: true });

order.forEach(sid => {
  const list = Q.filter(q => q.sub === sid);
  if (!list.length) return;
  const body = "window.TCM_QUESTIONS.push(...[\n" +
    list.map(q => "  " + JSON.stringify(q)).join(",\n") + "\n]);\n";
  fs.writeFileSync(path.join(dir, nameMap[sid] + ".js"), body, "utf8");
  console.log(nameMap[sid], list.length);
});

const core = `/* 中醫考題練習 — 題庫核心（科目登錄表）
   題目依科目拆在 data/NN-*.js，各自 push 進 TCM_QUESTIONS。
   新增科目：於 TCM_SUBJECTS 登錄 → 建 data/NN-xxx.js → index.html 加 script → CHAPTER_MAP 加章節順序。 */
window.TCM_SCHEMA = "tcm-bank-v1";
window.TCM_UPDATED = "2026-11-16";

window.TCM_SUBJECTS = [
  { id: "diagnosis",  name: "中醫診斷學", open: true,  base: "十二五／十五五 共通", n: 0 },
  { id: "internal",   name: "中醫內科學", open: true,  base: "十二五／十五五 共通", n: 0 },
  { id: "basic",      name: "中醫基礎理論", open: true, base: "十二五／十五五 共通", n: 0 },
  { id: "materia",    name: "中藥學",     open: true, base: "十二五／十五五 共通", n: 0 },
  { id: "formula",    name: "方劑學",     open: true, base: "十二五／十五五 共通", n: 0 },
  { id: "acupuncture",name: "針灸學",     open: true, base: "十二五／十五五 共通", n: 0 },
  { id: "surgery",    name: "中醫外科學", open: true, base: "十二五／十五五 共通", n: 0 },
  { id: "pediatrics", name: "中醫兒科學", open: true, base: "十二五／十五五 共通", n: 0 },
  { id: "gynecology", name: "中醫婦科學", open: true, base: "十二五／十五五 共通", n: 0 }
];

window.TCM_QUESTIONS = [];
`;
fs.writeFileSync(path.join(ROOT, "data.js"), core, "utf8");
console.log("core rewritten");
