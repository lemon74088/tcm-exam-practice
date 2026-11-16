
(function(){
  "use strict";
  const LS = {
    get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
    set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  };
  const SUBJECTS = window.TCM_SUBJECTS || [];
  const ALL = window.TCM_QUESTIONS || [];

  const CHAPTER_MAP = {
    diagnosis: ["緒論","望診","聞診","問診","切診","八綱辨證","病性辨證","病位辨證","診斷思維與應用","醫案與病歷"],
    internal: ["肺系病證","心腦系病證","脾胃系病證","肝膽系病證","腎系病證","氣血津液病證","肢體經絡病證"]
  };
  let ACTIVE = "diagnosis";
  let Q = [];
  let chapters = [];

  function useSubject(sid){
    ACTIVE = sid;
    Q = ALL.filter(q => q.sub === sid);
    const order = CHAPTER_MAP[sid] || [];
    chapters = order.filter(c => Q.some(q => q.ch === c))
      .concat([...new Set(Q.map(q => q.ch))].filter(c => !order.includes(c)));
    state.chapters = new Set(chapters);
  }

  const $ = s => document.querySelector(s);
  const state = {
    chapters: new Set(chapters),
    limit: 0,
    shuffle: true,
    wrongOnly: false,
    queue: [], idx: 0, answered: false, results: []
  };
  let wrongPool = LS.get("tcm_wrong_v1", {});   // {id: times}

  /* ── 設定畫面 ── */
  function renderSubjects(){
    $("#subjectList").innerHTML = SUBJECTS.map(s => {
      const on = s.id === ACTIVE;
      const cnt = ALL.filter(q => q.sub === s.id).length;
      return `<button class="subj ${on?'on':''} ${s.open?'':'lock'}" ${s.open?'':'disabled'} data-sid="${s.id}">
        <div class="n">${s.name}</div>
        <div class="m">${s.open ? s.base : '題庫待建'}</div>
        <div class="cnt">${cnt ? cnt + ' 題' : '—'}</div>
      </button>`;
    }).join("");
    $("#subjectList").querySelectorAll(".subj").forEach(el=>{
      el.onclick = () => selectSubject(el.dataset.sid);
    });
  }

  function selectSubject(sid){
    if(sid === ACTIVE) return;
    useSubject(sid);
    renderSubjects();
    renderChips();
    renderOptionToggles();
    refreshInfo();
    updateBadge();
  }

  function updateBadge(){
    const s = SUBJECTS.find(x => x.id === ACTIVE) || {name:""};
    $("#totalBadge").textContent = `${s.name} ${Q.length} 題`;
  }

  function renderChips(){
    $("#chapterChips").innerHTML = chapters.map(c => {
      const n = Q.filter(q => q.ch === c).length;
      const on = state.chapters.has(c);
      return `<button class="chip ${on?'on':''}" data-ch="${c}">${c}<span class="c">${n}</span></button>`;
    }).join("");
    $("#chapterChips").querySelectorAll(".chip").forEach(el=>{
      el.onclick = () => {
        const c = el.dataset.ch;
        state.chapters.has(c) ? state.chapters.delete(c) : state.chapters.add(c);
        renderChips(); refreshInfo();
      };
    });
    $("#chHint").textContent = `已選 ${state.chapters.size} / ${chapters.length} 章`;
  }

  function selectedQuestions(){
    let pool = Q.filter(q => state.chapters.has(q.ch));
    if(state.wrongOnly){
      const ids = new Set(Object.keys(wrongPool));
      pool = pool.filter(q => ids.has(q.id));
    }
    return pool;
  }

  function refreshInfo(){
    const pool = selectedQuestions();
    const n = state.limit ? Math.min(state.limit, pool.length) : pool.length;
    $("#pickInfo").textContent = `本次可練 ${n} 題 · 錯題池 ${Object.keys(wrongPool).length} 題`;
    $("#btnStart").disabled = n === 0;
    $("#btnStart").style.opacity = n === 0 ? .45 : 1;
  }

  function renderOptionToggles(){
    $("#optRow").querySelectorAll("[data-limit]").forEach(b=>{
      b.classList.toggle("on", Number(b.dataset.limit) === state.limit);
    });
    $("#btnShuffle").classList.toggle("on", state.shuffle);
    $("#btnWrongOnly").classList.toggle("on", state.wrongOnly);
  }

  $("#optRow").addEventListener("click", e=>{
    const b = e.target.closest("[data-limit]");
    if(b){ state.limit = Number(b.dataset.limit); renderOptionToggles(); refreshInfo(); }
  });
  $("#btnShuffle").onclick = () => { state.shuffle = !state.shuffle; renderOptionToggles(); };
  $("#btnWrongOnly").onclick = () => { state.wrongOnly = !state.wrongOnly; renderOptionToggles(); refreshInfo(); };

  $("#btnReset").onclick = () => {
    wrongPool = {}; LS.set("tcm_wrong_v1", wrongPool); refreshInfo();
    const btn = $("#btnReset");
    btn.textContent = "已清除";
    setTimeout(()=>{ btn.textContent = "清除紀錄"; }, 1400);
  };

  /* ── 開始 ── */
  $("#btnStart").onclick = () => {
    let pool = selectedQuestions().slice();
    if(state.shuffle){
      for(let i = pool.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
    }
    if(state.limit) pool = pool.slice(0, state.limit);
    if(!pool.length) return;
    state.queue = pool; state.idx = 0; state.results = [];
    $("#setup").classList.add("hidden");
    $("#result").classList.add("hidden");
    $("#quiz").classList.remove("hidden");
    $("#quiz").scrollIntoView({behavior:"smooth", block:"start"});
    renderQuestion();
  };

  /* ── 作答 ── */
  function renderQuestion(){
    const q = state.queue[state.idx];
    state.answered = false;
    $("#qcount").textContent = `${String(state.idx+1).padStart(2,"0")} / ${String(state.queue.length).padStart(2,"0")}`;
    $("#bar").style.width = ((state.idx) / state.queue.length * 100) + "%";
    const acc = state.results.length ? Math.round(state.results.filter(r=>r.ok).length / state.results.length * 100) : null;
    $("#accLive").textContent = acc === null ? "正確率 —" : `正確率 ${acc}%`;

    const TYPE_LABEL = {A1:"A1 單選", A2:"A2 病案", B1:"B1 配伍", A3:"A3 病例組"};
    $("#qTags").innerHTML =
      `<span class="tag gold">${q.ch}</span>` +
      `<span class="tag">${TYPE_LABEL[q.type] || q.type}</span>` +
      `<span class="tag">難度 ${"◆".repeat(q.diff)}${"◇".repeat(3-q.diff)}</span>` +
      `<span class="tag">${q.id}</span>`;
    $("#caseBox").innerHTML =
      (q.case ? `<div class="casebox">${q.case}</div>` : "") +
      (q.groupLabel ? `<div class="grouplabel">${q.groupLabel}</div>` : "");
    $("#stem").textContent = q.stem;
    $("#opts").innerHTML = q.opts.map((o,i)=>
      `<button class="opt" data-i="${i}"><span class="k">${"ABCD"[i]}</span><span>${o}</span></button>`).join("");
    $("#opts").querySelectorAll(".opt").forEach(el=>{
      el.onclick = () => answer(Number(el.dataset.i));
    });
    $("#explain").classList.remove("show");
    $("#btnNext").textContent = state.idx === state.queue.length - 1 ? "看 成 績" : "下 一 題";
    $("#btnNext").disabled = true;
    $("#btnNext").style.opacity = .45;
  }

  let lastQueue = [];

  function answer(i){
    if(state.answered) return;
    const q = state.queue[state.idx];
    state.answered = true;
    const right = "ABCD".indexOf(q.ans);
    const ok = i === right;
    lastQueue = state.queue.slice(state.idx, state.idx + 5);

    $("#opts").querySelectorAll(".opt").forEach((el,k)=>{
      el.classList.add("done");
      if(k === right) el.classList.add("right");
      if(k === i && !ok) el.classList.add("wrong");
    });

    const v = $("#verdict");
    v.className = "verdict " + (ok ? "ok" : "no");
    v.textContent = ok ? "答對" : `答錯 · 正確答案 ${q.ans}`;
    $("#expText").textContent = q.exp;
    $("#explain").classList.add("show");

    state.results.push({id:q.id, ch:q.ch, ok});
    if(!ok) wrongPool[q.id] = (wrongPool[q.id] || 0) + 1;
    else if(wrongPool[q.id]) delete wrongPool[q.id];
    LS.set("tcm_wrong_v1", wrongPool);

    const acc = Math.round(state.results.filter(r=>r.ok).length / state.results.length * 100);
    $("#accLive").textContent = `正確率 ${acc}%`;
    $("#bar").style.width = ((state.idx + 1) / state.queue.length * 100) + "%";

    $("#btnNext").disabled = false;
    $("#btnNext").style.opacity = 1;
  }

  $("#btnNext").onclick = () => {
    if(!state.answered) return;
    if(state.idx + 1 >= state.queue.length) return showResult();
    state.idx++; renderQuestion();
  };

  document.addEventListener("keydown", e=>{
    if($("#quiz").classList.contains("hidden")) return;
    const q = state.queue[state.idx];
    if(!q) return;
    const k = e.key.toUpperCase();
    const map = {"1":0,"2":1,"3":2,"4":3,"A":0,"B":1,"C":2,"D":3};
    if(map.hasOwnProperty(k) && !state.answered){ answer(map[k]); }
    else if((e.key === "Enter" || e.key === " ") && state.answered){ e.preventDefault(); $("#btnNext").click(); }
  });

  /* ── 成績 ── */
  function showResult(){
    const total = state.results.length;
    const okN = state.results.filter(r=>r.ok).length;
    const pct = total ? Math.round(okN / total * 100) : 0;

    $("#quiz").classList.add("hidden");
    $("#result").classList.remove("hidden");
    $("#result").scrollIntoView({behavior:"smooth", block:"start"});

    $("#scoreNum").textContent = pct + "%";
    const arc = $("#ringArc");
    arc.style.transition = "stroke-dashoffset 1s cubic-bezier(.22,.61,.36,1)";
    arc.style.strokeDashoffset = String(326.7 * (1 - pct/100));
    $("#sTotal").textContent = total + " 題";
    $("#sRight").textContent = okN + " 題";
    $("#sWrong").textContent = (total - okN) + " 題";
    $("#sPool").textContent = Object.keys(wrongPool).length + " 題";
    $("#resHint").textContent = pct >= 80 ? "水準以上" : pct >= 60 ? "尚可，補強弱章" : "基礎章節需重讀";

    const byCh = {};
    state.results.forEach(r=>{
      byCh[r.ch] = byCh[r.ch] || {n:0, ok:0};
      byCh[r.ch].n++; if(r.ok) byCh[r.ch].ok++;
    });
    $("#bars").innerHTML = Object.keys(byCh).map(c=>{
      const {n, ok} = byCh[c];
      const p = Math.round(ok/n*100);
      return `<div class="bar-row"><span class="lb">${c}</span>
        <span class="bar"><i data-w="${p}"></i></span>
        <span class="v">${ok}/${n}</span></div>`;
    }).join("") || `<div class="bar-row" style="opacity:.6">本回無資料</div>`;
    requestAnimationFrame(()=>{
      $("#bars").querySelectorAll("i[data-w]").forEach(el=>{ el.style.width = el.dataset.w + "%"; });
    });

    const wrongs = state.results.filter(r=>!r.ok).map(r=>Q.find(q=>q.id===r.id));
    $("#wrongList").innerHTML = wrongs.length ? wrongs.map(q=>{
      return `<div class="wrong-item">
        <div class="meta">${q.ch} · ${q.id}</div>
        ${q.case ? `<div class="exp" style="color:#d8cdb9">病案：${q.case}</div>` : ""}
        <div class="q">${q.stem}</div>
        <div class="ans">正解 ${q.ans} · ${q.opts["ABCD".indexOf(q.ans)]}</div>
        <div class="exp">${q.exp}</div>
      </div>`;
    }).join("") : `<div class="wrong-item" style="border-color:rgba(95,174,140,.35);background:rgba(95,174,140,.08)">
        <div class="q">本回全對，沒有錯題。</div></div>`;

    $("#btnAgainWrong").style.display = wrongs.length ? "" : "none";
    $("#btnAgainWrong").onclick = () => {
      $("#setup").classList.remove("hidden");
      $("#result").classList.add("hidden");
      state.wrongOnly = true; renderOptionToggles(); refreshInfo();
      $("#btnStart").click();
    };
  }

  $("#btnRestart").onclick = () => {
    $("#result").classList.add("hidden");
    $("#setup").classList.remove("hidden");
    refreshInfo();
    $("#setup").scrollIntoView({behavior:"smooth", block:"start"});
  };

  /* ── init ── */
  useSubject("diagnosis");
  renderSubjects();
  renderChips();
  renderOptionToggles();
  refreshInfo();
  updateBadge();
})();
