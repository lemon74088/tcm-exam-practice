/* 中醫考題練習 — 題庫核心（科目登錄表）
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
