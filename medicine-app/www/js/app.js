/* واجهة التطبيق: التوجيه والصفحات */
(function () {
  const { idx, analyze, search, filterSymptoms, AGE_LABEL, herbToDiseases, oilToDiseases } = Engine;
  const $view = document.getElementById("view");
  const $title = document.getElementById("pageTitle");
  const $back = document.getElementById("backBtn");

  /* ---------- تخزين محلي آمن ---------- */
  const store = {
    get(k, def) { try { const v = localStorage.getItem("tabib:" + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem("tabib:" + k, JSON.stringify(v)); } catch (e) {} }
  };

  const state = {
    check: Object.assign({ age: "", unit: "y", sex: "", pregnant: false, duration: "", symptoms: [] }, store.get("check", {})),
    favs: store.get("favs", []),
    herbTab: "herbs",
    herbCult: "",
    diseaseCat: "",
    symQuery: ""
  };
  const saveCheck = () => store.set("check", state.check);

  /* ---------- أدوات ---------- */
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const SEV = { 1: "خفيف", 2: "متوسط", 3: "يحتاج طبيباً", 4: "طارئ" };
  const PREG = { ok: ["آمن بكميات الطعام", "sev1"], caution: ["بحذر في الحمل", "sev2"], avoid: ["يُتجنب في الحمل", "sev3"] };
  const sevBadge = s => `<span class="badge sev${s}">${SEV[s]}</span>`;
  const cultName = id => (idx.culture[id] ? idx.culture[id].flag + " " + idx.culture[id].ar : id);
  const isFav = key => state.favs.includes(key);
  function toast(msg) { const t = document.getElementById("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2200); }
  function ageYears() {
    const a = parseFloat(state.check.age);
    if (isNaN(a)) return null;
    return state.check.unit === "m" ? a / 12 : a;
  }
  function favBtn(key) { return `<button class="fav ${isFav(key) ? "on" : ""}" data-fav="${key}" aria-label="المفضلة">${isFav(key) ? "★" : "☆"}</button>`; }
  const disclaimer = `<p class="disclaimer">⚕️ هذه المعلومات تثقيفية ولا تُغني عن استشارة الطبيب أو الصيدلي. لا توقف أي دواء موصوف لتعتمد على الأعشاب.</p>`;

  function render(html, title, showBack) {
    $view.innerHTML = html;
    $title.textContent = title || "طبيب الأعشاب";
    $back.hidden = !showBack;
    window.scrollTo(0, 0);
  }

  /* ---------- الصفحة الرئيسية ---------- */
  function viewHome() {
    const n = { d: DB.diseases.length, h: DB.herbs.filter(h => !h.danger).length, o: DB.oils.length, c: DB.cultures.length, s: DB.symptoms.length };
    render(`
      <div class="card hero">
        <h1>🌿 طبيب الأعشاب</h1>
        <p>موسوعة الطب والأعشاب والزيوت من ${n.c} ثقافات حول العالم، مع محلل أعراض يرجّح المرض المحتمل ويقترح الحلول.</p>
        <a class="btn block" href="#/check" style="margin-top:8px;color:var(--primary)">🩺 ابدأ فحص الأعراض</a>
      </div>
      <form id="homeSearch" class="card tight" role="search">
        <input type="search" id="homeQ" placeholder="ابحث عن مرض، عشبة، زيت، دواء أو عرض…" aria-label="بحث">
      </form>
      <div class="grid">
        <a class="tile" href="#/check"><span class="ic">🩺</span><b>محلل الأعراض</b><small>${n.s} عرضاً — أدخل أعراضك وعمرك</small></a>
        <a class="tile" href="#/diseases"><span class="ic">📖</span><b>الأمراض</b><small>${n.d} مرضاً بأعراضها وعلاجها</small></a>
        <a class="tile" href="#/herbs"><span class="ic">🌿</span><b>الأعشاب الطبية</b><small>${n.h} عشبة بجرعاتها وتحذيراتها</small></a>
        <a class="tile" href="#/herbs/oils"><span class="ic">💧</span><b>الزيوت الطبية</b><small>${n.o} زيتاً عطرياً وناقلاً</small></a>
        <a class="tile" href="#/cultures"><span class="ic">🌍</span><b>الطب حول العالم</b><small>عربي، مغربي، صيني، هندي…</small></a>
        <a class="tile" href="#/dose"><span class="ic">🧮</span><b>حاسبة جرعات الأطفال</b><small>باراسيتامول وإيبوبروفين</small></a>
        <a class="tile" href="#/drugs"><span class="ic">💊</span><b>الأدوية الشائعة</b><small>الجرعات والتحذيرات</small></a>
        <a class="tile" href="#/danger"><span class="ic">☠️</span><b>أعشاب خطيرة</b><small>نباتات سامة شائعة الاستعمال</small></a>
      </div>
      <div class="alert warn" style="margin-top:12px"><b>🚑 في الحالات الطارئة</b>ألم صدر، صعوبة تنفس، ضعف مفاجئ في جانب الجسم، نزيف شديد، أو فقدان وعي: اتصل بالإسعاف فوراً.</div>
      ${disclaimer}
    `, "طبيب الأعشاب");
    document.getElementById("homeSearch").onsubmit = e => { e.preventDefault(); location.hash = "#/search/" + encodeURIComponent(document.getElementById("homeQ").value); };
  }

  /* ---------- محلل الأعراض ---------- */
  function viewCheck() {
    const c = state.check;
    render(`
      <div class="card">
        <h1>🩺 محلل الأعراض</h1>
        <p class="muted">أدخل عمرك وجنسك واختر كل الأعراض التي تشعر بها، وسيرجّح التطبيق الأمراض المحتملة مرتبة حسب الاحتمال مع الحلول.</p>
        <div class="row">
          <div><label class="fld" for="age">العمر</label><input type="number" id="age" min="0" max="120" inputmode="decimal" value="${esc(c.age)}" placeholder="مثال: 35"></div>
          <div><label class="fld" for="unit">الوحدة</label><select id="unit"><option value="y" ${c.unit === "y" ? "selected" : ""}>سنوات</option><option value="m" ${c.unit === "m" ? "selected" : ""}>أشهر (للرضّع)</option></select></div>
        </div>
        <label class="fld">الجنس</label>
        <div class="seg" id="sexSeg">
          <button type="button" data-v="m" class="${c.sex === "m" ? "on" : ""}">ذكر</button>
          <button type="button" data-v="f" class="${c.sex === "f" ? "on" : ""}">أنثى</button>
        </div>
        <label class="check" id="pregWrap" ${c.sex === "f" ? "" : "hidden"}><input type="checkbox" id="preg" ${c.pregnant ? "checked" : ""}> حامل أو مرضع</label>
        <label class="fld">منذ متى بدأت الأعراض؟</label>
        <div class="seg" id="durSeg">
          <button type="button" data-v="acute" class="${c.duration === "acute" ? "on" : ""}">أقل من أسبوع</button>
          <button type="button" data-v="sub" class="${c.duration === "sub" ? "on" : ""}">1–4 أسابيع</button>
          <button type="button" data-v="chronic" class="${c.duration === "chronic" ? "on" : ""}">أكثر من شهر</button>
        </div>
      </div>

      <div class="card">
        <h2 style="margin-top:0">الأعراض المختارة <span class="count" id="selCount">${c.symptoms.length}</span></h2>
        <div class="chips" id="selChips"></div>
        <label class="fld" for="symQ">ابحث عن عرض</label>
        <input type="search" id="symQ" placeholder="مثال: صداع، كحة، حرقة…" value="${esc(state.symQuery)}">
      </div>
      <div id="symList"></div>

      <div class="sticky-action">
        <div class="row">
          <button class="btn primary" id="analyzeBtn">🔎 تحليل الأعراض</button>
          <button class="btn" id="clearBtn" style="flex:0 0 auto">مسح</button>
        </div>
      </div>
      <div id="results"></div>
      ${disclaimer}
    `, "فحص الأعراض");

    const age = document.getElementById("age"), unit = document.getElementById("unit");
    age.oninput = () => { c.age = age.value; saveCheck(); };
    unit.onchange = () => { c.unit = unit.value; saveCheck(); };
    document.getElementById("sexSeg").onclick = e => {
      const b = e.target.closest("button"); if (!b) return;
      c.sex = c.sex === b.dataset.v ? "" : b.dataset.v;
      if (c.sex !== "f") c.pregnant = false;
      saveCheck(); viewCheck();
    };
    const preg = document.getElementById("preg");
    if (preg) preg.onchange = () => { c.pregnant = preg.checked; saveCheck(); };
    document.getElementById("durSeg").onclick = e => {
      const b = e.target.closest("button"); if (!b) return;
      c.duration = c.duration === b.dataset.v ? "" : b.dataset.v;
      document.querySelectorAll("#durSeg button").forEach(x => x.classList.toggle("on", x.dataset.v === c.duration));
      saveCheck();
    };
    const symQ = document.getElementById("symQ");
    symQ.oninput = () => { state.symQuery = symQ.value; drawSymList(); };
    document.getElementById("analyzeBtn").onclick = runAnalysis;
    document.getElementById("clearBtn").onclick = () => { c.symptoms = []; state.symQuery = ""; saveCheck(); viewCheck(); };
    drawSelected(); drawSymList();
  }

  function toggleSymptom(id) {
    const s = state.check.symptoms;
    const i = s.indexOf(id);
    if (i >= 0) s.splice(i, 1); else s.push(id);
    saveCheck(); drawSelected(); drawSymList(true);
  }
  function drawSelected() {
    const s = state.check.symptoms;
    document.getElementById("selCount").textContent = s.length;
    document.getElementById("selChips").innerHTML = s.length
      ? s.map(id => `<button class="chip sel" data-sym="${id}">${esc(idx.symptom[id].ar)}</button>`).join("")
      : `<span class="muted">لم تختر أي عرض بعد. اختر من القوائم أدناه.</span>`;
    document.getElementById("selChips").onclick = e => { const b = e.target.closest("[data-sym]"); if (b) toggleSymptom(b.dataset.sym); };
  }
  function drawSymList(keepOpen) {
    const box = document.getElementById("symList");
    const open = keepOpen ? Array.from(box.querySelectorAll("details[open]")).map(d => d.dataset.g) : [];
    const list = filterSymptoms(state.symQuery);
    const sel = state.check.symptoms;
    const q = state.symQuery.trim();
    let html = "";
    if (q) {
      html = list.length
        ? `<div class="card"><div class="chips">${list.map(s => `<button class="chip ${sel.includes(s.id) ? "on" : ""}" data-sym="${s.id}">${esc(s.ar)}</button>`).join("")}</div></div>`
        : `<div class="empty">لا يوجد عرض مطابق.</div>`;
    } else {
      html = DB.symptomGroups.map(g => {
        const items = list.filter(s => s.group === g.id);
        const n = items.filter(s => sel.includes(s.id)).length;
        return `<details class="group" data-g="${g.id}" ${open.includes(g.id) ? "open" : ""}>
          <summary>${g.icon} ${g.ar} ${n ? `<span class="count">${n}</span>` : ""}</summary>
          <div class="chips">${items.map(s => `<button class="chip ${sel.includes(s.id) ? "on" : ""}" data-sym="${s.id}">${esc(s.ar)}</button>`).join("")}</div>
        </details>`;
      }).join("");
    }
    box.innerHTML = html;
    box.onclick = e => { const b = e.target.closest("[data-sym]"); if (b) toggleSymptom(b.dataset.sym); };
  }

  function runAnalysis() {
    const c = state.check;
    const out = document.getElementById("results");
    if (!c.symptoms.length) { toast("اختر عرضاً واحداً على الأقل"); return; }
    const yrs = ageYears();
    const r = analyze({ symptoms: c.symptoms, ageYears: yrs, sex: c.sex || undefined, duration: c.duration || undefined, pregnant: c.pregnant });
    let html = `<h2>📋 النتائج</h2>`;
    if (yrs == null) html += `<div class="alert info">لم تُدخل العمر — تم افتراض شخص بالغ. إدخال العمر يحسّن دقة الترجيح.</div>`;
    else html += `<p class="muted">الفئة العمرية: ${AGE_LABEL[r.group]}${c.sex ? " — " + (c.sex === "m" ? "ذكر" : "أنثى") : ""}${c.pregnant ? " — حامل/مرضع" : ""}</p>`;
    r.flags.forEach(f => {
      html += `<div class="alert ${f.level >= 4 ? "danger" : "warn"}"><b>${f.level >= 4 ? "🚨 علامة خطر" : "⚠️ تنبيه"}</b>${esc(f.msg)}</div>`;
    });
    if (!r.results.length) {
      html += `<div class="empty">لم نجد مرضاً مطابقاً بشكل كافٍ لهذه الأعراض. أضف أعراضاً أخرى أو استشر الطبيب.</div>`;
    } else {
      html += `<p class="muted small">النسبة تمثل الترجيح النسبي بين الاحتمالات المعروضة وليست تشخيصاً. اضغط على أي مرض لعرض العلاج الكامل.</p>`;
      r.results.forEach((x, i) => {
        const d = x.d;
        const matched = x.matched.map(id => idx.symptom[id].ar).join("، ");
        const missing = x.missing.slice(0, 3).map(id => idx.symptom[id].ar).join("، ");
        const herbs = (d.herbs || []).slice(0, 4).map(h => idx.herb[h] && idx.herb[h].ar.split(" (")[0]).filter(Boolean).join("، ");
        const levelTxt = { high: "تطابق قوي", mid: "تطابق متوسط", low: "تطابق ضعيف" }[x.level];
        html += `<a class="result" href="#/disease/${d.id}">
          <div class="top"><span class="rank">${i + 1}</span><span class="name">${esc(d.ar)}</span><span class="pct">${x.likelihood}%</span></div>
          <div class="bar"><i style="width:${Math.max(4, x.likelihood)}%"></i></div>
          <div>${sevBadge(d.sev)} <span class="badge" style="background:var(--surface-2)">${levelTxt}</span></div>
          <div class="why">✔ يتطابق مع: ${esc(matched)}</div>
          ${missing ? `<div class="why">❔ أعراض مميزة لم تذكرها: ${esc(missing)}</div>` : ""}
          <div class="quick">💡 ${esc((d.tx || [])[0] || "")}${herbs ? `<br>🌿 ${esc(herbs)}` : ""}</div>
        </a>`;
      });
    }
    out.innerHTML = html;
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- الأمراض ---------- */
  function viewDiseases(cat) {
    state.diseaseCat = cat || "";
    const list = DB.diseases.filter(d => !state.diseaseCat || d.cat === state.diseaseCat).sort((a, b) => a.ar.localeCompare(b.ar, "ar"));
    render(`
      <input type="search" id="dq" placeholder="ابحث في الأمراض…" style="margin-bottom:10px">
      <div class="hscroll">
        <a class="chip ${!state.diseaseCat ? "on" : ""}" href="#/diseases">الكل (${DB.diseases.length})</a>
        ${DB.categories.map(c => `<a class="chip ${state.diseaseCat === c.id ? "on" : ""}" href="#/diseases/${c.id}">${c.icon} ${c.ar}</a>`).join("")}
      </div>
      <div class="list" id="dlist" style="margin-top:8px"></div>
    `, "الأمراض");
    const draw = q => {
      const nq = Engine.norm(q);
      const items = list.filter(d => !nq || Engine.norm(d.ar + " " + d.en).includes(nq));
      document.getElementById("dlist").innerHTML = items.length ? items.map(d => `
        <a class="item" href="#/disease/${d.id}"><span class="ic">${idx.category[d.cat].icon}</span>
          <span class="body"><b>${esc(d.ar)}</b><small>${esc(d.en)} · ${SEV[d.sev]}</small></span><span class="chev">‹</span></a>`).join("")
        : `<div class="empty">لا نتائج</div>`;
    };
    document.getElementById("dq").oninput = e => draw(e.target.value);
    draw("");
  }

  function viewDisease(id) {
    const d = idx.disease[id];
    if (!d) return notFound();
    const preg = state.check.pregnant;
    const yrs = ageYears();
    const child = yrs != null && yrs < 12;
    const syms = Object.entries(d.s).sort((a, b) => b[1] - a[1]);
    const herbs = (d.herbs || []).map(h => idx.herb[h]).filter(Boolean);
    const oils = (d.oils || []).map(o => idx.oil[o]).filter(Boolean);
    const drugs = (d.drugs || []).map(x => idx.drug[x]).filter(Boolean);
    render(`
      <div class="title-row"><h1>${esc(d.ar)}</h1>${favBtn("disease:" + d.id)}</div>
      <p class="latin">${esc(d.en)}</p>
      <p>${sevBadge(d.sev)} <span class="badge" style="background:var(--surface-2)">${idx.category[d.cat].icon} ${idx.category[d.cat].ar}</span></p>
      ${d.sev >= 4 ? `<div class="alert danger"><b>🚨 حالة طارئة</b>${esc(d.doc)}</div>` : ""}
      <div class="section"><h2>📝 نبذة</h2><p>${esc(d.desc)}</p><p class="muted"><b>الأسباب:</b> ${esc(d.causes)}</p></div>
      <div class="section"><h2>🔍 الأعراض</h2><div class="chips">${syms.map(([sid, w]) => idx.symptom[sid] ? `<span class="chip ${w >= 3 ? "on" : ""}">${esc(idx.symptom[sid].ar)}</span>` : "").join("")}</div>
        <p class="muted small" style="margin-top:6px">الأعراض الملوّنة هي الأكثر تمييزاً للمرض.</p></div>
      <div class="section"><h2>🏥 العلاج الطبي</h2><ul>${(d.tx || []).map(t => `<li>${esc(t)}</li>`).join("")}</ul>
        ${drugs.length ? `<h3>💊 الأدوية المستعملة</h3>${drugs.map(x => `<a class="herb-mini" href="#/drug/${x.id}"><b>${esc(x.ar)} ${x.rx ? '<span class="badge sev3">بوصفة</span>' : ""}</b><small>${esc(x.rx ? "الجرعة يحددها الطبيب" : x.adult)}${child && !x.rx ? " — أطفال: " + esc(x.child) : ""}</small></a>`).join("")}` : ""}
      </div>
      ${herbs.length ? `<div class="section"><h2>🌿 الأعشاب المفيدة</h2>
        ${preg ? `<div class="alert warn">أنتِ حامل/مرضع: الأعشاب المعلَّمة بالأحمر يجب تجنبها.</div>` : ""}
        ${herbs.map(h => `<a class="herb-mini" href="#/herb/${h.id}"><b>${esc(h.ar)} ${preg && h.preg === "avoid" ? '<span class="badge sev3">تجنّب في الحمل</span>' : ""}</b><small>📏 ${esc(h.dose)}</small>${child ? `<small>👶 ${esc(h.kids)}</small>` : ""}<small>⚠️ ${esc(h.caution)}</small></a>`).join("")}
      </div>` : ""}
      ${oils.length ? `<div class="section"><h2>💧 الزيوت</h2>
        ${oils.map(o => `<a class="herb-mini" href="#/oil/${o.id}"><b>${esc(o.ar)}</b><small>🖐️ ${esc(o.how)}</small><small>⚠️ ${esc(o.caution)}</small></a>`).join("")}
      </div>` : ""}
      ${(d.trad || []).length ? `<div class="section"><h2>🌍 العلاج التقليدي عبر الثقافات</h2>
        ${d.trad.map(([c, t]) => `<div class="trad"><b>${esc(cultName(c))}:</b> ${esc(t)}</div>`).join("")}</div>` : ""}
      ${d.life && d.life !== "—" ? `<div class="section"><h2>🥗 نمط الحياة والوقاية</h2><p>${esc(d.life)}</p></div>` : ""}
      <div class="alert ${d.sev >= 3 ? "danger" : "warn"}"><b>👨‍⚕️ متى تراجع الطبيب؟</b>${esc(d.doc)}</div>
      ${disclaimer}
    `, d.ar, true);
  }

  /* ---------- الأعشاب والزيوت ---------- */
  function viewHerbs(tab) {
    state.herbTab = tab === "oils" ? "oils" : "herbs";
    const isOils = state.herbTab === "oils";
    const source = isOils ? DB.oils : DB.herbs.filter(h => !h.danger);
    const cults = DB.cultures.filter(c => source.some(x => x.cult.includes(c.id)));
    render(`
      <div class="seg" style="margin-bottom:10px">
        <button onclick="location.hash='#/herbs'" class="${!isOils ? "on" : ""}">🌿 الأعشاب (${DB.herbs.filter(h => !h.danger).length})</button>
        <button onclick="location.hash='#/herbs/oils'" class="${isOils ? "on" : ""}">💧 الزيوت (${DB.oils.length})</button>
      </div>
      <input type="search" id="hq" placeholder="${isOils ? "ابحث في الزيوت…" : "ابحث بالاسم أو الاستعمال (مثال: سعال)…"}" style="margin-bottom:10px">
      <div class="hscroll" id="cultChips">
        <button class="chip ${!state.herbCult ? "on" : ""}" data-c="">كل الثقافات</button>
        ${cults.map(c => `<button class="chip ${state.herbCult === c.id ? "on" : ""}" data-c="${c.id}">${c.flag} ${c.ar}</button>`).join("")}
      </div>
      ${isOils ? `<details class="group" style="margin-top:8px"><summary>📌 قواعد السلامة في استعمال الزيوت</summary><ul style="padding:0 30px 12px 12px">${DB.oilRules.map(r => `<li>${esc(r)}</li>`).join("")}</ul></details>` : ""}
      <div class="list" id="hlist" style="margin-top:8px"></div>
      ${!isOils ? `<a class="item" href="#/danger" style="margin-top:10px;border-color:var(--danger)"><span class="ic">☠️</span><span class="body"><b>أعشاب خطيرة وسامة</b><small>الحرمل، الفليو، الدفلى، الداتورة</small></span><span class="chev">‹</span></a>` : ""}
    `, isOils ? "الزيوت الطبية" : "الأعشاب الطبية");
    const draw = () => {
      const nq = Engine.norm(document.getElementById("hq").value);
      const items = source.filter(x => (!state.herbCult || x.cult.includes(state.herbCult)) && (!nq || Engine.norm(x.ar + " " + x.en + " " + (x.lat || "") + " " + x.uses).includes(nq)))
        .sort((a, b) => a.ar.localeCompare(b.ar, "ar"));
      document.getElementById("hlist").innerHTML = items.length ? items.map(x => `
        <a class="item" href="#/${isOils ? "oil" : "herb"}/${x.id}"><span class="ic">${isOils ? (x.type === "essential" ? "💧" : "🫒") : "🌿"}</span>
          <span class="body"><b>${esc(x.ar)}</b><small>${esc(x.uses)}</small></span><span class="chev">‹</span></a>`).join("")
        : `<div class="empty">لا نتائج</div>`;
    };
    document.getElementById("hq").oninput = draw;
    document.getElementById("cultChips").onclick = e => {
      const b = e.target.closest("[data-c]"); if (!b) return;
      state.herbCult = b.dataset.c;
      document.querySelectorAll("#cultChips .chip").forEach(x => x.classList.toggle("on", x.dataset.c === state.herbCult));
      draw();
    };
    draw();
  }

  function relatedDiseases(ids) {
    return (ids || []).map(id => idx.disease[id]).filter(Boolean).map(d => `<a class="chip link" href="#/disease/${d.id}">${esc(d.ar)}</a>`).join("");
  }

  function viewHerb(id) {
    const h = idx.herb[id];
    if (!h) return notFound();
    const p = PREG[h.preg] || PREG.caution;
    render(`
      <div class="title-row"><h1>${esc(h.ar)}</h1>${favBtn("herb:" + h.id)}</div>
      <p class="latin">${esc(h.en)} — ${esc(h.lat)}</p>
      ${h.danger ? `<div class="alert danger"><b>☠️ نبات خطير</b>${esc(h.caution)}</div>` : ""}
      <p><span class="badge ${p[1]}">🤰 ${p[0]}</span></p>
      <div class="section"><h2>🌍 الثقافات التي تستعمله</h2><div class="chips">${h.cult.map(c => `<a class="chip link" href="#/culture/${c}">${esc(cultName(c))}</a>`).join("")}</div></div>
      <div class="section"><h2>🩹 الاستعمالات</h2><p>${esc(h.uses)}</p><p class="muted"><b>الجزء المستعمل:</b> ${esc(h.part)}</p></div>
      <div class="section"><h2>🍵 طريقة التحضير</h2><p>${esc(h.prep)}</p></div>
      <div class="section"><h2>📏 الجرعة</h2><dl class="kv"><dt>البالغون</dt><dd>${esc(h.dose)}</dd><dt>الأطفال</dt><dd>${esc(h.kids)}</dd></dl></div>
      <div class="alert warn"><b>⚠️ موانع الاستعمال والتداخلات</b>${esc(h.caution)}</div>
      ${herbToDiseases[h.id] ? `<div class="section"><h2>📖 يُستعمل في</h2><div class="chips">${relatedDiseases(herbToDiseases[h.id])}</div></div>` : ""}
      ${disclaimer}
    `, h.ar.split(" (")[0], true);
  }

  function viewOil(id) {
    const o = idx.oil[id];
    if (!o) return notFound();
    render(`
      <div class="title-row"><h1>${esc(o.ar)}</h1>${favBtn("oil:" + o.id)}</div>
      <p class="latin">${esc(o.en)}</p>
      <p><span class="badge ${o.type === "essential" ? "sev2" : "sev1"}">${o.type === "essential" ? "زيت عطري مركّز — يُخفّف ولا يُشرب" : "زيت ناقل / ثابت"}</span></p>
      <div class="section"><h2>🌍 الثقافات</h2><div class="chips">${o.cult.map(c => `<a class="chip link" href="#/culture/${c}">${esc(cultName(c))}</a>`).join("")}</div></div>
      <div class="section"><h2>🩹 الاستعمالات</h2><p>${esc(o.uses)}</p></div>
      <div class="section"><h2>🖐️ طريقة الاستعمال</h2><p>${esc(o.how)}</p><p class="muted"><b>نسبة التخفيف:</b> ${esc(o.dilution)}</p></div>
      <div class="alert warn"><b>⚠️ تحذيرات</b>${esc(o.caution)}</div>
      ${oilToDiseases[o.id] ? `<div class="section"><h2>📖 يُستعمل في</h2><div class="chips">${relatedDiseases(oilToDiseases[o.id])}</div></div>` : ""}
      ${o.type === "essential" ? `<details class="group"><summary>📌 قواعد سلامة الزيوت العطرية</summary><ul style="padding:0 30px 12px 12px">${DB.oilRules.map(r => `<li>${esc(r)}</li>`).join("")}</ul></details>` : ""}
      ${disclaimer}
    `, o.ar, true);
  }

  function viewDanger() {
    const list = DB.herbs.filter(h => h.danger);
    render(`
      <div class="alert danger"><b>☠️ تحذير</b>هذه النباتات شائعة في الطب الشعبي لكنها تسببت في حالات تسمم ووفيات. عند الاشتباه بتسمم اتصل بالإسعاف أو مركز مكافحة السموم فوراً.</div>
      <div class="list">${list.map(h => `<a class="item" href="#/herb/${h.id}"><span class="ic">☠️</span><span class="body"><b>${esc(h.ar)}</b><small>${esc(h.caution)}</small></span><span class="chev">‹</span></a>`).join("")}</div>
      <div class="section" style="margin-top:12px"><h2>⚠️ قواعد عامة لسلامة الأعشاب</h2><ul>
        <li>«طبيعي» لا يعني «آمن» — كثير من السموم القوية نباتية.</li>
        <li>أخبر طبيبك بكل الأعشاب التي تتناولها، خاصة مع أدوية السيولة والسكر والضغط والقلب ومضادات الاكتئاب وحبوب منع الحمل.</li>
        <li>الحامل والمرضع والأطفال وكبار السن ومرضى الكبد والكلى أكثر عرضة للأضرار.</li>
        <li>اشترِ من مصدر موثوق؛ الغش والتلوث بالمعادن الثقيلة والمبيدات شائع.</li>
        <li>أوقف الأعشاب قبل أي عملية جراحية بأسبوعين.</li>
        <li>توقف فوراً عند ظهور طفح أو اصفرار أو بول داكن أو ألم بطن.</li>
      </ul></div>
    `, "أعشاب خطيرة", true);
  }

  /* ---------- الأدوية ---------- */
  function viewDrugs() {
    render(`
      <div class="alert info"><b>💊 الأدوية الحديثة الشائعة</b>الأسماء العلمية العامة. الأدوية المعلَّمة «بوصفة» لا تُؤخذ دون طبيب.</div>
      <div class="list">${DB.drugs.map(d => `<a class="item" href="#/drug/${d.id}"><span class="ic">💊</span><span class="body"><b>${esc(d.ar)}</b><small>${esc(d.cls)}${d.rx ? " · بوصفة طبية" : ""}</small></span><span class="chev">‹</span></a>`).join("")}</div>
    `, "الأدوية", true);
  }
  function viewDrug(id) {
    const d = idx.drug[id];
    if (!d) return notFound();
    const used = DB.diseases.filter(x => (x.drugs || []).includes(d.id)).map(x => x.id);
    render(`
      <div class="title-row"><h1>${esc(d.ar)}</h1>${favBtn("drug:" + d.id)}</div>
      <p class="latin">${esc(d.en)}</p>
      <p><span class="badge" style="background:var(--surface-2)">${esc(d.cls)}</span> ${d.rx ? '<span class="badge sev3">بوصفة طبية فقط</span>' : '<span class="badge sev1">دون وصفة</span>'}</p>
      <div class="section"><h2>🩹 الاستعمال</h2><p>${esc(d.use)}</p></div>
      <div class="section"><h2>📏 الجرعة</h2><dl class="kv"><dt>البالغون</dt><dd>${esc(d.adult)}</dd><dt>الحد الأقصى</dt><dd>${esc(d.max)}</dd><dt>الأطفال</dt><dd>${esc(d.child)}</dd></dl>
        ${["paracetamol", "ibuprofen"].includes(d.id) ? `<a class="btn block" href="#/dose" style="margin-top:10px">🧮 احسب جرعة الطفل حسب الوزن</a>` : ""}</div>
      <div class="alert warn"><b>⚠️ تحذيرات</b>${esc(d.caution)}</div>
      ${used.length ? `<div class="section"><h2>📖 يُستعمل في</h2><div class="chips">${relatedDiseases(used)}</div></div>` : ""}
      ${disclaimer}
    `, d.ar.split(" (")[0], true);
  }

  /* ---------- الثقافات ---------- */
  function viewCultures() {
    render(`
      <p class="muted">أنظمة الطب التقليدي الكبرى في العالم ومبادئها وأشهر نباتاتها.</p>
      <div class="list">${DB.cultures.map(c => `<a class="item" href="#/culture/${c.id}"><span class="ic">${c.flag}</span><span class="body"><b>${esc(c.ar)}</b><small>${esc(c.region)}</small></span><span class="chev">‹</span></a>`).join("")}</div>
    `, "الطب حول العالم", true);
  }
  function viewCulture(id) {
    const c = idx.culture[id];
    if (!c) return notFound();
    const herbs = DB.herbs.filter(h => h.cult.includes(c.id));
    const oils = DB.oils.filter(o => o.cult.includes(c.id));
    const dz = DB.diseases.filter(d => (d.trad || []).some(t => t[0] === c.id));
    render(`
      <h1>${c.flag} ${esc(c.ar)}</h1>
      <p class="muted">📍 ${esc(c.region)}</p>
      <div class="section"><h2>📜 نبذة</h2><p>${esc(c.desc)}</p></div>
      <div class="section"><h2>⚖️ المبادئ</h2><ul>${c.principles.map(p => `<li>${esc(p)}</li>`).join("")}</ul></div>
      <div class="section"><h2>🌿 أعشابه (${herbs.length})</h2><div class="chips">${herbs.map(h => `<a class="chip ${h.danger ? "danger" : "link"}" href="#/herb/${h.id}">${esc(h.ar.split(" (")[0])}</a>`).join("")}</div></div>
      ${oils.length ? `<div class="section"><h2>💧 زيوته (${oils.length})</h2><div class="chips">${oils.map(o => `<a class="chip link" href="#/oil/${o.id}">${esc(o.ar)}</a>`).join("")}</div></div>` : ""}
      ${dz.length ? `<div class="section"><h2>📖 وصفاته للأمراض</h2>${dz.map(d => d.trad.filter(t => t[0] === c.id).map(t => `<a class="herb-mini" href="#/disease/${d.id}"><b>${esc(d.ar)}</b><small>${esc(t[1])}</small></a>`).join("")).join("")}</div>` : ""}
      ${disclaimer}
    `, c.ar, true);
  }

  /* ---------- حاسبة الجرعات ---------- */
  const SYRUPS = {
    paracetamol: { name: "باراسيتامول", lo: 10, hi: 15, every: "كل 4–6 ساعات", maxDay: 60, maxDose: 1000, perDay: 4, conc: [[120, 5, "120 ملغ / 5 مل (شراب الرضع والأطفال)"], [160, 5, "160 ملغ / 5 مل"], [250, 5, "250 ملغ / 5 مل (للأطفال الأكبر)"], [100, 1, "100 ملغ / 1 مل (نقط)"]] },
    ibuprofen: { name: "إيبوبروفين", lo: 5, hi: 10, every: "كل 6–8 ساعات", maxDay: 40, maxDose: 400, perDay: 3, conc: [[100, 5, "100 ملغ / 5 مل"], [200, 5, "200 ملغ / 5 مل (فورت)"], [40, 1, "40 ملغ / 1 مل (نقط)"]] }
  };
  function viewDose() {
    const st = store.get("dose", { drug: "paracetamol", w: "", c: 0, ageM: "" });
    render(`
      <div class="card">
        <h1>🧮 حاسبة جرعات الأطفال</h1>
        <p class="muted">تحسب الجرعة حسب الوزن (الأدق من العمر). تأكد دائماً من تركيز الدواء المكتوب على العلبة واستعمل المحقنة أو الكوب المرفق.</p>
        <label class="fld">الدواء</label>
        <div class="seg" id="drugSeg">${Object.entries(SYRUPS).map(([k, v]) => `<button data-v="${k}" class="${st.drug === k ? "on" : ""}">${v.name}</button>`).join("")}</div>
        <div class="row">
          <div><label class="fld" for="w">وزن الطفل (كغ)</label><input type="number" id="w" inputmode="decimal" min="2" max="80" value="${esc(st.w)}" placeholder="مثال: 12"></div>
          <div><label class="fld" for="am">العمر (بالأشهر)</label><input type="number" id="am" inputmode="numeric" min="0" max="216" value="${esc(st.ageM)}" placeholder="مثال: 18"></div>
        </div>
        <label class="fld" for="conc">التركيز المكتوب على العلبة</label>
        <select id="conc"></select>
      </div>
      <div id="doseOut"></div>
      ${disclaimer}
    `, "حاسبة الجرعات", true);
    const fillConc = () => { document.getElementById("conc").innerHTML = SYRUPS[st.drug].conc.map((c, i) => `<option value="${i}" ${+st.c === i ? "selected" : ""}>${c[2]}</option>`).join(""); };
    const calc = () => {
      store.set("dose", st);
      const D = SYRUPS[st.drug], w = parseFloat(st.w), am = parseFloat(st.ageM);
      const out = document.getElementById("doseOut");
      if (!(w > 0)) { out.innerHTML = `<div class="empty">أدخل وزن الطفل لحساب الجرعة.</div>`; return; }
      const warn = [];
      if (st.drug === "ibuprofen" && ((!isNaN(am) && am < 3) || w < 5)) {
        out.innerHTML = `<div class="alert danger"><b>⛔ لا يُعطى</b>الإيبوبروفين لا يُعطى للرضع أقل من 3 أشهر أو أقل من 5 كغ. استشر الطبيب.</div>`; return;
      }
      if (!isNaN(am) && am < 3) warn.push("الرضيع أقل من 3 أشهر مع حمى يحتاج تقييماً طبياً فورياً قبل أي دواء.");
      if (w > 40) warn.push("الوزن فوق 40 كغ: تُستعمل غالباً جرعة البالغين مع عدم تجاوز الحد الأقصى.");
      const lo = Math.min(D.lo * w, D.maxDose), hi = Math.min(D.hi * w, D.maxDose);
      const [mg, ml] = D.conc[+st.c] || D.conc[0];
      const r1 = v => Math.round(v * 10) / 10;
      const mlLo = r1(lo / mg * ml), mlHi = r1(hi / mg * ml);
      const maxDay = Math.min(D.maxDay * w, st.drug === "paracetamol" ? 4000 : 1200);
      out.innerHTML = `
        <div class="card dose-out">
          <p>الجرعة الواحدة لـ ${esc(D.name)}:</p>
          <p class="big">${mlLo === mlHi ? mlLo : mlLo + " – " + mlHi} مل</p>
          <p class="muted">= ${Math.round(lo)}${lo !== hi ? "–" + Math.round(hi) : ""} ملغ ${D.every}</p>
          <table class="t">
            <tr><th>الحد الأقصى اليومي</th><td>${Math.round(maxDay)} ملغ (لا تتجاوز ${D.perDay} جرعات في 24 ساعة)</td></tr>
            <tr><th>التركيز</th><td>${esc(D.conc[+st.c][2])}</td></tr>
          </table>
        </div>
        ${warn.map(x => `<div class="alert warn">${esc(x)}</div>`).join("")}
        <div class="alert info"><b>تذكير</b>لا تجمع بين دواءين يحتويان على نفس المادة. ${st.drug === "ibuprofen" ? "يُعطى مع الطعام. لا يُعطى مع الجفاف أو الجدري المائي أو الربو الحساس." : "انتبه لوجود الباراسيتامول في أدوية الزكام المركبة."} راجع الطبيب إذا استمرت الحمى أكثر من 48–72 ساعة.</div>`;
    };
    document.getElementById("drugSeg").onclick = e => {
      const b = e.target.closest("button"); if (!b) return;
      st.drug = b.dataset.v; st.c = 0;
      document.querySelectorAll("#drugSeg button").forEach(x => x.classList.toggle("on", x.dataset.v === st.drug));
      fillConc(); calc();
    };
    document.getElementById("w").oninput = e => { st.w = e.target.value; calc(); };
    document.getElementById("am").oninput = e => { st.ageM = e.target.value; calc(); };
    document.getElementById("conc").onchange = e => { st.c = +e.target.value; calc(); };
    fillConc(); calc();
  }

  /* ---------- البحث ---------- */
  const TYPE = { disease: ["📖", "مرض", "disease"], herb: ["🌿", "عشبة", "herb"], oil: ["💧", "زيت", "oil"], drug: ["💊", "دواء", "drug"], symptom: ["🩺", "عرض", null], culture: ["🌍", "ثقافة", "culture"] };
  function viewSearch(q) {
    q = decodeURIComponent(q || "");
    render(`
      <form id="sf" role="search"><input type="search" id="sq" value="${esc(q)}" placeholder="ابحث في كل التطبيق…" autofocus></form>
      <div id="sres" class="list" style="margin-top:10px"></div>
    `, "بحث", true);
    const draw = v => {
      const res = search(v);
      const box = document.getElementById("sres");
      if (!v.trim()) { box.innerHTML = `<div class="empty">اكتب كلمة للبحث في الأمراض والأعشاب والزيوت والأدوية والأعراض.</div>`; return; }
      box.innerHTML = res.length ? res.slice(0, 60).map(r => {
        const [ic, label, route] = TYPE[r.type];
        const it = r.item;
        const href = route ? `#/${route}/${it.id}` : "#";
        return `<a class="item" href="${href}" ${r.type === "symptom" ? `data-addsym="${it.id}"` : ""}><span class="ic">${ic}</span><span class="body"><b>${esc(it.ar)}</b><small>${label}${r.type === "symptom" ? " — اضغط لإضافته لمحلل الأعراض" : it.uses ? " · " + esc(it.uses) : it.en ? " · " + esc(it.en) : ""}</small></span></a>`;
      }).join("") : `<div class="empty">لا نتائج لـ «${esc(v)}»</div>`;
    };
    const sq = document.getElementById("sq");
    sq.oninput = () => { draw(sq.value); history.replaceState(null, "", "#/search/" + encodeURIComponent(sq.value)); };
    document.getElementById("sf").onsubmit = e => { e.preventDefault(); sq.blur(); };
    document.getElementById("sres").onclick = e => {
      const a = e.target.closest("[data-addsym]"); if (!a) return;
      e.preventDefault();
      if (!state.check.symptoms.includes(a.dataset.addsym)) state.check.symptoms.push(a.dataset.addsym);
      saveCheck(); location.hash = "#/check";
    };
    draw(q);
  }

  /* ---------- المزيد / المفضلة / حول ---------- */
  function viewMore() {
    render(`
      <div class="list">
        <a class="item" href="#/favs"><span class="ic">★</span><span class="body"><b>المفضلة</b><small>${state.favs.length} عنصر محفوظ</small></span><span class="chev">‹</span></a>
        <a class="item" href="#/cultures"><span class="ic">🌍</span><span class="body"><b>الطب التقليدي حول العالم</b><small>${DB.cultures.length} أنظمة طبية</small></span><span class="chev">‹</span></a>
        <a class="item" href="#/drugs"><span class="ic">💊</span><span class="body"><b>الأدوية الشائعة وجرعاتها</b><small>${DB.drugs.length} دواءً</small></span><span class="chev">‹</span></a>
        <a class="item" href="#/dose"><span class="ic">🧮</span><span class="body"><b>حاسبة جرعات الأطفال</b><small>حسب الوزن</small></span><span class="chev">‹</span></a>
        <a class="item" href="#/danger"><span class="ic">☠️</span><span class="body"><b>أعشاب خطيرة</b><small>تحذيرات السلامة</small></span><span class="chev">‹</span></a>
        <a class="item" href="#/herbs/oils"><span class="ic">💧</span><span class="body"><b>الزيوت الطبية</b><small>عطرية وناقلة</small></span><span class="chev">‹</span></a>
        <button class="item" id="themeBtn" style="text-align:start"><span class="ic">🌓</span><span class="body"><b>المظهر</b><small id="themeLbl"></small></span></button>
        <a class="item" href="#/about"><span class="ic">ℹ️</span><span class="body"><b>حول التطبيق وإخلاء المسؤولية</b><small>المصادر والحدود</small></span><span class="chev">‹</span></a>
      </div>
    `, "المزيد");
    const lbl = () => (document.getElementById("themeLbl").textContent = { "": "تلقائي حسب الجهاز", light: "فاتح", dark: "داكن" }[store.get("theme", "")]);
    lbl();
    document.getElementById("themeBtn").onclick = () => {
      const order = ["", "light", "dark"];
      const next = order[(order.indexOf(store.get("theme", "")) + 1) % 3];
      store.set("theme", next); applyTheme(); lbl();
    };
  }
  function viewFavs() {
    const items = state.favs.map(k => {
      const [type, id] = k.split(":");
      const map = { disease: idx.disease, herb: idx.herb, oil: idx.oil, drug: idx.drug }[type];
      const it = map && map[id];
      return it ? `<a class="item" href="#/${type}/${id}"><span class="ic">${TYPE[type][0]}</span><span class="body"><b>${esc(it.ar)}</b><small>${TYPE[type][1]}</small></span><span class="chev">‹</span></a>` : "";
    }).join("");
    render(items ? `<div class="list">${items}</div>` : `<div class="empty">لا توجد عناصر في المفضلة. اضغط ☆ في صفحة أي مرض أو عشبة لحفظها.</div>`, "المفضلة", true);
  }
  function viewAbout() {
    render(`
      <div class="section"><h2>🌿 عن «طبيب الأعشاب»</h2>
        <p>موسوعة عربية تعمل دون إنترنت تجمع ${DB.diseases.length} مرضاً و${DB.symptoms.length} عرضاً و${DB.herbs.length} عشبة و${DB.oils.length} زيتاً و${DB.drugs.length} دواءً من ${DB.cultures.length} أنظمة طبية تقليدية، مع محلل أعراض يرجّح الأمراض المحتملة.</p></div>
      <div class="section"><h2>⚙️ كيف يعمل محلل الأعراض؟</h2>
        <p>لكل مرض قائمة أعراض بأوزان (مميز / شائع / ممكن). يحسب التطبيق مدى تغطية أعراضك لأعراض المرض ومدى تفسير المرض لأعراضك، ثم يعدّل النتيجة حسب الفئة العمرية والجنس ومدة الأعراض، ويعرض الاحتمالات الأعلى مع نسبة ترجيح نسبية. كما يفحص «علامات الخطر» التي تستدعي الطوارئ.</p></div>
      <div class="section"><h2>📚 المصادر</h2><ul>
        <li>منظمة الصحة العالمية (WHO) — الأدلة الإرشادية والطب التقليدي</li>
        <li>الوكالة الأوروبية للأدوية (EMA) — دراسات الأعشاب الطبية (HMPC)</li>
        <li>المعهد الوطني الأمريكي للصحة التكميلية (NCCIH)</li>
        <li>اللجنة الألمانية E ومراجع العلاج بالنباتات</li>
        <li>كتب التراث: القانون في الطب لابن سينا، الجامع لمفردات الأدوية والأغذية لابن البيطار، الطب النبوي لابن القيم</li>
      </ul></div>
      <div class="alert danger"><b>⚕️ إخلاء المسؤولية</b>هذا التطبيق للتثقيف الصحي فقط وليس أداة تشخيص طبية. النتائج احتمالات تقريبية قد تكون خاطئة. لا يُغني عن الطبيب. الجرعات المذكورة عامة للبالغين الأصحاء ما لم يُذكر غير ذلك، وتختلف حسب الحالة والأدوية الأخرى. الحامل والمرضع والأطفال وأصحاب الأمراض المزمنة يستشيرون الطبيب قبل أي عشبة. في الطوارئ اتصل بالإسعاف.</div>
    `, "حول التطبيق", true);
  }
  function notFound() { render(`<div class="empty">الصفحة غير موجودة. <a href="#/">العودة للرئيسية</a></div>`, "غير موجود", true); }

  /* ---------- المظهر ---------- */
  function applyTheme() {
    const t = store.get("theme", "");
    if (t) document.documentElement.setAttribute("data-theme", t); else document.documentElement.removeAttribute("data-theme");
  }

  /* ---------- الموجّه ---------- */
  const routes = [
    [/^\/?$/, viewHome, "home"],
    [/^\/check$/, viewCheck, "check"],
    [/^\/diseases(?:\/(\w+))?$/, m => viewDiseases(m[1]), "diseases"],
    [/^\/disease\/(\w+)$/, m => viewDisease(m[1]), "diseases"],
    [/^\/herbs(?:\/(oils))?$/, m => viewHerbs(m[1]), "herbs"],
    [/^\/herb\/(\w+)$/, m => viewHerb(m[1]), "herbs"],
    [/^\/oil\/(\w+)$/, m => viewOil(m[1]), "herbs"],
    [/^\/danger$/, viewDanger, "herbs"],
    [/^\/drugs$/, viewDrugs, "more"],
    [/^\/drug\/(\w+)$/, m => viewDrug(m[1]), "more"],
    [/^\/cultures$/, viewCultures, "more"],
    [/^\/culture\/(\w+)$/, m => viewCulture(m[1]), "more"],
    [/^\/dose$/, viewDose, "more"],
    [/^\/search(?:\/(.*))?$/, m => viewSearch(m[1]), ""],
    [/^\/favs$/, viewFavs, "more"],
    [/^\/about$/, viewAbout, "more"],
    [/^\/more$/, viewMore, "more"]
  ];
  function route() {
    const path = location.hash.replace(/^#/, "") || "/";
    for (const [re, fn, tab] of routes) {
      const m = path.match(re);
      if (m) {
        fn(m);
        document.querySelectorAll("#nav a").forEach(a => a.classList.toggle("active", a.dataset.tab === tab));
        return;
      }
    }
    notFound();
  }

  // المفضلة (تفويض عام)
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-fav]"); if (!b) return;
    const k = b.dataset.fav;
    const i = state.favs.indexOf(k);
    if (i >= 0) state.favs.splice(i, 1); else state.favs.push(k);
    store.set("favs", state.favs);
    b.classList.toggle("on", i < 0); b.textContent = i < 0 ? "★" : "☆";
    toast(i < 0 ? "أُضيف إلى المفضلة" : "حُذف من المفضلة");
  });
  $back.onclick = () => (history.length > 1 ? history.back() : (location.hash = "#/"));
  document.getElementById("searchBtn").onclick = () => (location.hash = "#/search/");
  document.getElementById("brand").onclick = () => (location.hash = "#/");

  // يُستدعى من تطبيق أندرويد عند ضغط زر الرجوع
  window.tabibBack = function () {
    const path = location.hash.replace(/^#/, "") || "/";
    if (path === "/" ) return false;
    history.back();
    return true;
  };

  applyTheme();
  window.addEventListener("hashchange", route);
  route();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http") && !/TabibApp/.test(navigator.userAgent)) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
