/* واجهة التطبيق: التوجيه والصفحات — ثلاث لغات (ar / en / fr) */
(function () {
  const { idx, analyze, search, filterSymptoms, herbToDiseases, oilToDiseases } = Engine;
  const $view = document.getElementById("view");
  const $title = document.getElementById("pageTitle");
  const $back = document.getElementById("backBtn");

  /* ---------- تخزين محلي آمن ---------- */
  const store = {
    get(k, def) { try { const v = localStorage.getItem("tabib:" + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem("tabib:" + k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- اللغة ---------- */
  const LANGS = ["ar", "fr", "en"];
  function detectLang() {
    const saved = store.get("lang", "");
    if (LANGS.includes(saved)) return saved;
    const nav = (navigator.language || "ar").slice(0, 2).toLowerCase();
    return LANGS.includes(nav) ? nav : "ar";
  }
  let LANG = detectLang();
  const UI = () => I18N[LANG].ui;
  function t(key, vars) {
    let s = (I18N[LANG].ui[key] != null ? I18N[LANG].ui[key] : I18N.ar.ui[key]);
    if (s == null) return key;
    if (vars && typeof s === "string") for (const k in vars) s = s.split("{" + k + "}").join(vars[k]);
    return s;
  }
  // ترجمة حقل من عنصر بيانات، مع الرجوع للعربية إن لم تتوفر الترجمة
  function tr(kind, item, field) {
    const arField = field === "name" ? "ar" : field;
    if (LANG === "ar" || !item) return item ? item[arField] : "";
    const d = I18N[LANG][kind] && I18N[LANG][kind][item.id];
    if (d == null) return item[arField];
    if (typeof d === "string") return field === "name" ? d : item[arField];
    return d[field] != null ? d[field] : item[arField];
  }
  const nm = (kind, item) => tr(kind, item, "name");
  const shortName = (kind, item) => (LANG === "ar" ? item.ar.split(" (")[0] : nm(kind, item));
  const symName = id => nm("symptoms", idx.symptom[id]);
  const catName = id => nm("categories", idx.category[id]);
  const groupName = id => nm("groups", idx.group[id]);
  const cultName = id => (idx.culture[id] ? idx.culture[id].flag + " " + nm("cultures", idx.culture[id]) : id);
  const tradText = (d, i) => {
    if (LANG === "ar") return d.trad[i][1];
    const x = I18N[LANG].diseases && I18N[LANG].diseases[d.id];
    return (x && x.trad && x.trad[i]) || d.trad[i][1];
  };
  const oilRules = () => (LANG !== "ar" && I18N[LANG].oilRules) || DB.oilRules;
  const flagMsg = f => (f.key ? t(f.key) : (LANG !== "ar" && I18N[LANG].redFlags && I18N[LANG].redFlags[f.idx]) || f.msg);
  const BACK = () => (UI().dir === "rtl" ? "→" : "←");
  const CHEV = () => (UI().dir === "rtl" ? "‹" : "›");

  function applyLang() {
    const html = document.documentElement;
    html.lang = LANG;
    html.dir = UI().dir;
    $back.textContent = BACK();
    const labels = { home: "nav_home", check: "nav_check", diseases: "nav_diseases", herbs: "nav_herbs", more: "nav_more" };
    document.querySelectorAll("#nav a").forEach(a => (a.querySelector("b").textContent = t(labels[a.dataset.tab])));
    document.getElementById("langBtn").textContent = { ar: "ع", en: "EN", fr: "FR" }[LANG];
    document.title = t("app_name");
  }
  function setLang(l) { LANG = l; store.set("lang", l); applyLang(); route(); }

  const state = {
    check: Object.assign({ age: "", unit: "y", sex: "", pregnant: false, duration: "", symptoms: [] }, store.get("check", {})),
    favs: store.get("favs", []),
    herbCult: "",
    symQuery: ""
  };
  const saveCheck = () => store.set("check", state.check);

  /* ---------- أدوات ---------- */
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const sevBadge = s => `<span class="badge sev${s}">${t("sev" + s)}</span>`;
  const PREG_CLS = { ok: "sev1", caution: "sev2", avoid: "sev3" };
  const isFav = key => state.favs.includes(key);
  function toast(msg) { const el = document.getElementById("toast"); el.textContent = msg; el.classList.add("show"); clearTimeout(el._h); el._h = setTimeout(() => el.classList.remove("show"), 2200); }
  function ageYears() {
    const a = parseFloat(state.check.age);
    if (isNaN(a)) return null;
    return state.check.unit === "m" ? a / 12 : a;
  }
  const favBtn = key => `<button class="fav ${isFav(key) ? "on" : ""}" data-fav="${key}" aria-label="${t("fav_label")}">${isFav(key) ? "★" : "☆"}</button>`;
  const disclaimer = () => `<p class="disclaimer">${t("disclaimer")}</p>`;
  const item = (href, ic, title, sub) => `<a class="item" href="${href}"><span class="ic">${ic}</span><span class="body"><b>${esc(title)}</b><small>${esc(sub)}</small></span><span class="chev">${CHEV()}</span></a>`;
  const ulist = arr => `<ul class="ul-pad">${arr.map(r => `<li>${esc(r)}</li>`).join("")}</ul>`;

  function render(html, title, showBack) {
    $view.innerHTML = html;
    $title.textContent = title || t("app_name");
    $back.hidden = !showBack;
    window.scrollTo(0, 0);
  }

  /* ---------- الصفحة الرئيسية ---------- */
  function viewHome() {
    const n = { d: DB.diseases.length, h: DB.herbs.filter(h => !h.danger).length, o: DB.oils.length, c: DB.cultures.length, s: DB.symptoms.length };
    render(`
      <div class="card hero">
        <h1>🌿 ${t("app_name")}</h1>
        <p>${t("home_intro", { c: n.c })}</p>
        <a class="btn block" href="#/check" style="margin-top:8px;color:var(--primary)">${t("home_start")}</a>
      </div>
      <div class="seg" id="langSeg" style="margin-bottom:12px">${LANGS.map(l => `<button data-l="${l}" class="${l === LANG ? "on" : ""}">${I18N[l].ui.lang_name}</button>`).join("")}</div>
      <form id="homeSearch" class="card tight" role="search">
        <input type="search" id="homeQ" placeholder="${t("home_search_ph")}" aria-label="${t("search_title")}">
      </form>
      <div class="grid">
        <a class="tile" href="#/check"><span class="ic">🩺</span><b>${t("tile_check")}</b><small>${t("tile_check_sub", { n: n.s })}</small></a>
        <a class="tile" href="#/diseases"><span class="ic">📖</span><b>${t("tile_diseases")}</b><small>${t("tile_diseases_sub", { n: n.d })}</small></a>
        <a class="tile" href="#/herbs"><span class="ic">🌿</span><b>${t("tile_herbs")}</b><small>${t("tile_herbs_sub", { n: n.h })}</small></a>
        <a class="tile" href="#/herbs/oils"><span class="ic">💧</span><b>${t("tile_oils")}</b><small>${t("tile_oils_sub", { n: n.o })}</small></a>
        <a class="tile" href="#/cultures"><span class="ic">🌍</span><b>${t("tile_cultures")}</b><small>${t("tile_cultures_sub")}</small></a>
        <a class="tile" href="#/dose"><span class="ic">🧮</span><b>${t("tile_dose")}</b><small>${t("tile_dose_sub")}</small></a>
        <a class="tile" href="#/drugs"><span class="ic">💊</span><b>${t("tile_drugs")}</b><small>${t("tile_drugs_sub")}</small></a>
        <a class="tile" href="#/danger"><span class="ic">☠️</span><b>${t("tile_danger")}</b><small>${t("tile_danger_sub")}</small></a>
      </div>
      <div class="alert warn" style="margin-top:12px"><b>${t("emergency_title")}</b>${t("emergency_text")}</div>
      ${disclaimer()}
    `, t("app_name"));
    document.getElementById("homeSearch").onsubmit = e => { e.preventDefault(); location.hash = "#/search/" + encodeURIComponent(document.getElementById("homeQ").value); };
    document.getElementById("langSeg").onclick = e => { const b = e.target.closest("[data-l]"); if (b) setLang(b.dataset.l); };
  }

  /* ---------- محلل الأعراض ---------- */
  function viewCheck() {
    const c = state.check;
    render(`
      <div class="card">
        <h1>${t("check_title")}</h1>
        <p class="muted">${t("check_intro")}</p>
        <div class="row">
          <div><label class="fld" for="age">${t("age")}</label><input type="number" id="age" min="0" max="120" inputmode="decimal" value="${esc(c.age)}" placeholder="${t("age_ph")}"></div>
          <div><label class="fld" for="unit">${t("unit")}</label><select id="unit"><option value="y" ${c.unit === "y" ? "selected" : ""}>${t("years")}</option><option value="m" ${c.unit === "m" ? "selected" : ""}>${t("months")}</option></select></div>
        </div>
        <label class="fld">${t("sex")}</label>
        <div class="seg" id="sexSeg">
          <button type="button" data-v="m" class="${c.sex === "m" ? "on" : ""}">${t("male")}</button>
          <button type="button" data-v="f" class="${c.sex === "f" ? "on" : ""}">${t("female")}</button>
        </div>
        <label class="check" id="pregWrap" ${c.sex === "f" ? "" : "hidden"}><input type="checkbox" id="preg" ${c.pregnant ? "checked" : ""}> ${t("pregnant")}</label>
        <label class="fld">${t("duration_q")}</label>
        <div class="seg" id="durSeg">
          <button type="button" data-v="acute" class="${c.duration === "acute" ? "on" : ""}">${t("dur_acute")}</button>
          <button type="button" data-v="sub" class="${c.duration === "sub" ? "on" : ""}">${t("dur_sub")}</button>
          <button type="button" data-v="chronic" class="${c.duration === "chronic" ? "on" : ""}">${t("dur_chronic")}</button>
        </div>
      </div>
      <div class="card">
        <h2 style="margin-top:0">${t("selected_symptoms")} <span class="count" id="selCount">${c.symptoms.length}</span></h2>
        <div class="chips" id="selChips"></div>
        <label class="fld" for="symQ">${t("search_symptom")}</label>
        <input type="search" id="symQ" placeholder="${t("symptom_ph")}" value="${esc(state.symQuery)}">
      </div>
      <div id="symList"></div>
      <div class="sticky-action">
        <div class="row">
          <button class="btn primary" id="analyzeBtn">${t("analyze")}</button>
          <button class="btn" id="clearBtn" style="flex:0 0 auto">${t("clear")}</button>
        </div>
      </div>
      <div id="results"></div>
      ${disclaimer()}
    `, t("nav_check"));

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
    const s = state.check.symptoms.filter(id => idx.symptom[id]);
    document.getElementById("selCount").textContent = s.length;
    const box = document.getElementById("selChips");
    box.innerHTML = s.length ? s.map(id => `<button class="chip sel" data-sym="${id}">${esc(symName(id))}</button>`).join("") : `<span class="muted">${t("none_selected")}</span>`;
    box.onclick = e => { const b = e.target.closest("[data-sym]"); if (b) toggleSymptom(b.dataset.sym); };
  }
  function drawSymList(keepOpen) {
    const box = document.getElementById("symList");
    const open = keepOpen ? Array.from(box.querySelectorAll("details[open]")).map(d => d.dataset.g) : [];
    const list = filterSymptoms(state.symQuery);
    const sel = state.check.symptoms;
    const chip = s => `<button class="chip ${sel.includes(s.id) ? "on" : ""}" data-sym="${s.id}">${esc(symName(s.id))}</button>`;
    let html;
    if (state.symQuery.trim()) {
      html = list.length ? `<div class="card"><div class="chips">${list.map(chip).join("")}</div></div>` : `<div class="empty">${t("no_symptom_match")}</div>`;
    } else {
      html = DB.symptomGroups.map(g => {
        const items = list.filter(s => s.group === g.id);
        const n = items.filter(s => sel.includes(s.id)).length;
        return `<details class="group" data-g="${g.id}" ${open.includes(g.id) ? "open" : ""}>
          <summary>${g.icon} ${esc(groupName(g.id))} ${n ? `<span class="count">${n}</span>` : ""}</summary>
          <div class="chips">${items.map(chip).join("")}</div></details>`;
      }).join("");
    }
    box.innerHTML = html;
    box.onclick = e => { const b = e.target.closest("[data-sym]"); if (b) toggleSymptom(b.dataset.sym); };
  }

  function runAnalysis() {
    const c = state.check;
    const out = document.getElementById("results");
    if (!c.symptoms.length) { toast(t("need_symptom")); return; }
    const yrs = ageYears();
    const r = analyze({ symptoms: c.symptoms, ageYears: yrs, sex: c.sex || undefined, duration: c.duration || undefined, pregnant: c.pregnant });
    let html = `<h2>${t("results")}</h2>`;
    if (yrs == null) html += `<div class="alert info">${t("no_age")}</div>`;
    else html += `<p class="muted">${t("age_group")}: ${t("age_" + r.group)}${c.sex ? " — " + t(c.sex === "m" ? "male" : "female") : ""}${c.pregnant ? " — " + t("pregnant_short") : ""}</p>`;
    r.flags.forEach(f => { html += `<div class="alert ${f.level >= 4 ? "danger" : "warn"}"><b>${t(f.level >= 4 ? "flag_danger" : "flag_warn")}</b>${esc(flagMsg(f))}</div>`; });
    if (!r.results.length) {
      html += `<div class="empty">${t("no_results")}</div>`;
    } else {
      html += `<p class="muted small">${t("results_note")}</p>`;
      const sep = LANG === "ar" ? "، " : ", ";
      r.results.forEach((x, i) => {
        const d = x.d;
        const matched = x.matched.map(symName).join(sep);
        const missing = x.missing.slice(0, 3).map(symName).join(sep);
        const herbs = (d.herbs || []).slice(0, 4).map(h => idx.herb[h] && shortName("herbs", idx.herb[h])).filter(Boolean).join(sep);
        const tx = tr("diseases", d, "tx") || [];
        html += `<a class="result" href="#/disease/${d.id}">
          <div class="top"><span class="rank">${i + 1}</span><span class="name">${esc(nm("diseases", d))}</span><span class="pct">${x.likelihood}%</span></div>
          <div class="bar"><i style="width:${Math.max(4, x.likelihood)}%"></i></div>
          <div>${sevBadge(d.sev)} <span class="badge" style="background:var(--surface-2)">${t("match_" + x.level)}</span></div>
          <div class="why">${t("matches")} ${esc(matched)}</div>
          ${missing ? `<div class="why">${t("missing")} ${esc(missing)}</div>` : ""}
          <div class="quick">💡 ${esc(tx[0] || "")}${herbs ? `<br>🌿 ${esc(herbs)}` : ""}</div>
        </a>`;
      });
    }
    out.innerHTML = html;
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- الأمراض ---------- */
  function viewDiseases(cat) {
    const list = DB.diseases.filter(d => !cat || d.cat === cat).sort((a, b) => nm("diseases", a).localeCompare(nm("diseases", b), LANG));
    render(`
      <input type="search" id="dq" placeholder="${t("diseases_search_ph")}" style="margin-bottom:10px">
      <div class="hscroll">
        <a class="chip ${!cat ? "on" : ""}" href="#/diseases">${t("all")} (${DB.diseases.length})</a>
        ${DB.categories.map(c => `<a class="chip ${cat === c.id ? "on" : ""}" href="#/diseases/${c.id}">${c.icon} ${esc(catName(c.id))} (${DB.diseases.filter(d => d.cat === c.id).length})</a>`).join("")}
      </div>
      <div class="list" id="dlist" style="margin-top:8px"></div>
    `, t("nav_diseases"));
    const draw = q => {
      const nq = Engine.norm(q);
      const items = list.filter(d => !nq || Engine.norm(d.ar + " " + d.en + " " + nm("diseases", d)).includes(nq));
      document.getElementById("dlist").innerHTML = items.length
        ? items.map(d => item(`#/disease/${d.id}`, idx.category[d.cat].icon, nm("diseases", d), (LANG === "ar" ? d.en : catName(d.cat)) + " · " + t("sev" + d.sev))).join("")
        : `<div class="empty">${t("no_results_short")}</div>`;
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
    const T = f => tr("diseases", d, f);
    const life = T("life");
    render(`
      <div class="title-row"><h1>${esc(nm("diseases", d))}</h1>${favBtn("disease:" + d.id)}</div>
      <p class="latin">${esc(LANG === "en" ? (I18N.fr.diseases && I18N.fr.diseases[d.id] && I18N.fr.diseases[d.id].name) || "" : d.en)}</p>
      <p>${sevBadge(d.sev)} <span class="badge" style="background:var(--surface-2)">${idx.category[d.cat].icon} ${esc(catName(d.cat))}</span></p>
      ${d.sev >= 4 ? `<div class="alert danger"><b>${t("emergency_case")}</b>${esc(T("doc"))}</div>` : ""}
      <div class="section"><h2>${t("sec_overview")}</h2><p>${esc(T("desc"))}</p><p class="muted"><b>${t("causes")}</b> ${esc(T("causes"))}</p></div>
      ${syms.length ? `<div class="section"><h2>${t("sec_symptoms")}</h2><div class="chips">${syms.map(([sid, w]) => idx.symptom[sid] ? `<span class="chip ${w >= 3 ? "on" : ""}">${esc(symName(sid))}</span>` : "").join("")}</div>
        <p class="muted small" style="margin-top:6px">${t("sym_note")}</p></div>` : ""}
      <div class="section"><h2>${t("sec_medical")}</h2>${ulist(T("tx") || [])}
        ${drugs.length ? `<h3>${t("sec_drugs")}</h3>${drugs.map(x => `<a class="herb-mini" href="#/drug/${x.id}"><b>${esc(nm("drugs", x))} ${x.rx ? `<span class="badge sev3">${t("rx")}</span>` : ""}</b><small>${esc(x.rx ? t("rx_dose") : tr("drugs", x, "adult"))}${child && !x.rx ? " — " + t("kids_prefix") + " " + esc(tr("drugs", x, "child")) : ""}</small></a>`).join("")}` : ""}
      </div>
      ${herbs.length ? `<div class="section"><h2>${t("sec_herbs")}</h2>
        ${preg ? `<div class="alert warn">${t("preg_warn")}</div>` : ""}
        ${herbs.map(h => `<a class="herb-mini" href="#/herb/${h.id}"><b>${esc(nm("herbs", h))} ${preg && h.preg === "avoid" ? `<span class="badge sev3">${t("avoid_preg")}</span>` : ""}</b><small>📏 ${esc(tr("herbs", h, "dose"))}</small>${child ? `<small>👶 ${esc(tr("herbs", h, "kids"))}</small>` : ""}<small>⚠️ ${esc(tr("herbs", h, "caution"))}</small></a>`).join("")}
      </div>` : ""}
      ${oils.length ? `<div class="section"><h2>${t("sec_oils")}</h2>
        ${oils.map(o => `<a class="herb-mini" href="#/oil/${o.id}"><b>${esc(nm("oils", o))}</b><small>🖐️ ${esc(tr("oils", o, "how"))}</small><small>⚠️ ${esc(tr("oils", o, "caution"))}</small></a>`).join("")}
      </div>` : ""}
      ${(d.trad || []).length ? `<div class="section"><h2>${t("sec_trad")}</h2>
        ${d.trad.map(([c], i) => `<div class="trad"><b>${esc(cultName(c))}:</b> ${esc(tradText(d, i))}</div>`).join("")}</div>` : ""}
      ${life && life !== "—" ? `<div class="section"><h2>${t("sec_life")}</h2><p>${esc(life)}</p></div>` : ""}
      <div class="alert ${d.sev >= 3 ? "danger" : "warn"}"><b>${t("sec_doctor")}</b>${esc(T("doc"))}</div>
      ${disclaimer()}
    `, nm("diseases", d), true);
  }

  /* ---------- الأعشاب والزيوت ---------- */
  function viewHerbs(tab) {
    const isOils = tab === "oils";
    const kind = isOils ? "oils" : "herbs";
    const source = isOils ? DB.oils : DB.herbs.filter(h => !h.danger);
    const cults = DB.cultures.filter(c => source.some(x => x.cult.includes(c.id)));
    render(`
      <div class="seg" style="margin-bottom:10px">
        <button onclick="location.hash='#/herbs'" class="${!isOils ? "on" : ""}">${t("herbs_tab")} (${DB.herbs.filter(h => !h.danger).length})</button>
        <button onclick="location.hash='#/herbs/oils'" class="${isOils ? "on" : ""}">${t("oils_tab")} (${DB.oils.length})</button>
      </div>
      <input type="search" id="hq" placeholder="${t(isOils ? "oils_search_ph" : "herbs_search_ph")}" style="margin-bottom:10px">
      <div class="hscroll" id="cultChips">
        <button class="chip ${!state.herbCult ? "on" : ""}" data-c="">${t("all_cultures")}</button>
        ${cults.map(c => `<button class="chip ${state.herbCult === c.id ? "on" : ""}" data-c="${c.id}">${esc(cultName(c.id))}</button>`).join("")}
      </div>
      ${isOils ? `<details class="group" style="margin-top:8px"><summary>${t("oil_rules_title")}</summary>${ulist(oilRules())}</details>` : ""}
      <p class="muted small" id="hcount" style="margin-top:8px"></p>
      <div class="list" id="hlist"></div>
      ${!isOils ? `<div style="margin-top:10px">${item("#/danger", "☠️", t("danger_title"), DB.herbs.filter(h => h.danger).map(h => shortName("herbs", h).replace(" ⚠️", "")).join(LANG === "ar" ? "، " : ", "))}</div>` : ""}
    `, t(isOils ? "oils_title" : "herbs_title"));
    const draw = () => {
      const nq = Engine.norm(document.getElementById("hq").value);
      const items = source.filter(x => (!state.herbCult || x.cult.includes(state.herbCult)) &&
        (!nq || Engine.norm([x.ar, x.en, x.lat || "", x.uses, nm(kind, x), tr(kind, x, "uses")].join(" ")).includes(nq)))
        .sort((a, b) => nm(kind, a).localeCompare(nm(kind, b), LANG));
      document.getElementById("hcount").textContent = items.length + " / " + source.length;
      document.getElementById("hlist").innerHTML = items.length
        ? items.map(x => item(`#/${isOils ? "oil" : "herb"}/${x.id}`, isOils ? (x.type === "essential" ? "💧" : "🫒") : "🌿", nm(kind, x), tr(kind, x, "uses"))).join("")
        : `<div class="empty">${t("no_results_short")}</div>`;
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

  const relatedDiseases = ids => (ids || []).map(id => idx.disease[id]).filter(Boolean).map(d => `<a class="chip link" href="#/disease/${d.id}">${esc(nm("diseases", d))}</a>`).join("");
  const cultChips = ids => ids.map(c => `<a class="chip link" href="#/culture/${c}">${esc(cultName(c))}</a>`).join("");

  function viewHerb(id) {
    const h = idx.herb[id];
    if (!h) return notFound();
    const T = f => tr("herbs", h, f);
    render(`
      <div class="title-row"><h1>${esc(nm("herbs", h))}</h1>${favBtn("herb:" + h.id)}</div>
      <p class="latin">${esc(LANG === "ar" ? h.en + " — " : "")}${esc(h.lat)}</p>
      ${h.danger ? `<div class="alert danger"><b>${t("dangerous_plant")}</b>${esc(T("caution"))}</div>` : ""}
      <p><span class="badge ${PREG_CLS[h.preg] || "sev2"}">🤰 ${t("preg_" + (h.preg || "caution"))}</span></p>
      <div class="section"><h2>${t("cultures_used")}</h2><div class="chips">${cultChips(h.cult)}</div></div>
      <div class="section"><h2>${t("uses")}</h2><p>${esc(T("uses"))}</p><p class="muted"><b>${t("part")}</b> ${esc(T("part"))}</p></div>
      <div class="section"><h2>${t("prep")}</h2><p>${esc(T("prep"))}</p></div>
      <div class="section"><h2>${t("dose")}</h2><dl class="kv"><dt>${t("adults")}</dt><dd>${esc(T("dose"))}</dd><dt>${t("children")}</dt><dd>${esc(T("kids"))}</dd></dl></div>
      <div class="alert warn"><b>${t("cautions_title")}</b>${esc(T("caution"))}</div>
      ${herbToDiseases[h.id] ? `<div class="section"><h2>${t("used_in")}</h2><div class="chips">${relatedDiseases(herbToDiseases[h.id])}</div></div>` : ""}
      ${disclaimer()}
    `, shortName("herbs", h), true);
  }

  function viewOil(id) {
    const o = idx.oil[id];
    if (!o) return notFound();
    const T = f => tr("oils", o, f);
    render(`
      <div class="title-row"><h1>${esc(nm("oils", o))}</h1>${favBtn("oil:" + o.id)}</div>
      ${LANG === "ar" ? `<p class="latin">${esc(o.en)}</p>` : ""}
      <p><span class="badge ${o.type === "essential" ? "sev2" : "sev1"}">${t(o.type === "essential" ? "oil_essential" : "oil_carrier")}</span></p>
      <div class="section"><h2>${t("cultures_short")}</h2><div class="chips">${cultChips(o.cult)}</div></div>
      <div class="section"><h2>${t("uses")}</h2><p>${esc(T("uses"))}</p></div>
      <div class="section"><h2>${t("how_use")}</h2><p>${esc(T("how"))}</p><p class="muted"><b>${t("dilution")}</b> ${esc(T("dilution"))}</p></div>
      <div class="alert warn"><b>${t("warnings")}</b>${esc(T("caution"))}</div>
      ${oilToDiseases[o.id] ? `<div class="section"><h2>${t("used_in")}</h2><div class="chips">${relatedDiseases(oilToDiseases[o.id])}</div></div>` : ""}
      ${o.type === "essential" ? `<details class="group"><summary>${t("oil_rules_short")}</summary>${ulist(oilRules())}</details>` : ""}
      ${disclaimer()}
    `, nm("oils", o), true);
  }

  function viewDanger() {
    const list = DB.herbs.filter(h => h.danger);
    render(`
      <div class="alert danger"><b>${t("danger_alert_title")}</b>${t("danger_alert")}</div>
      <div class="list">${list.map(h => item(`#/herb/${h.id}`, "☠️", nm("herbs", h), tr("herbs", h, "caution"))).join("")}</div>
      <div class="section" style="margin-top:12px"><h2>${t("herb_safety_title")}</h2>${ulist(t("herb_safety"))}</div>
    `, t("tile_danger"), true);
  }

  /* ---------- الأدوية ---------- */
  function viewDrugs() {
    render(`
      <div class="alert info"><b>${t("drugs_intro_title")}</b>${t("drugs_intro")}</div>
      <div class="list">${DB.drugs.map(d => item(`#/drug/${d.id}`, "💊", nm("drugs", d), tr("drugs", d, "cls") + (d.rx ? t("rx_tag") : ""))).join("")}</div>
    `, t("drugs_page"), true);
  }
  function viewDrug(id) {
    const d = idx.drug[id];
    if (!d) return notFound();
    const T = f => tr("drugs", d, f);
    const used = DB.diseases.filter(x => (x.drugs || []).includes(d.id)).map(x => x.id);
    render(`
      <div class="title-row"><h1>${esc(nm("drugs", d))}</h1>${favBtn("drug:" + d.id)}</div>
      ${LANG === "ar" ? `<p class="latin">${esc(d.en)}</p>` : ""}
      <p><span class="badge" style="background:var(--surface-2)">${esc(T("cls"))}</span> <span class="badge ${d.rx ? "sev3" : "sev1"}">${t(d.rx ? "rx_only" : "otc")}</span></p>
      <div class="section"><h2>${t("use")}</h2><p>${esc(T("use"))}</p></div>
      <div class="section"><h2>${t("dose")}</h2><dl class="kv"><dt>${t("adults")}</dt><dd>${esc(T("adult"))}</dd><dt>${t("max")}</dt><dd>${esc(T("max"))}</dd><dt>${t("children")}</dt><dd>${esc(T("child"))}</dd></dl>
        ${["paracetamol", "ibuprofen"].includes(d.id) ? `<a class="btn block" href="#/dose" style="margin-top:10px">${t("calc_btn")}</a>` : ""}</div>
      <div class="alert warn"><b>${t("warnings")}</b>${esc(T("caution"))}</div>
      ${used.length ? `<div class="section"><h2>${t("used_in")}</h2><div class="chips">${relatedDiseases(used)}</div></div>` : ""}
      ${disclaimer()}
    `, shortName("drugs", d), true);
  }

  /* ---------- الثقافات ---------- */
  function viewCultures() {
    render(`
      <p class="muted">${t("cultures_intro")}</p>
      <div class="list">${DB.cultures.map(c => item(`#/culture/${c.id}`, c.flag, nm("cultures", c), tr("cultures", c, "region"))).join("")}</div>
    `, t("cultures_page"), true);
  }
  function viewCulture(id) {
    const c = idx.culture[id];
    if (!c) return notFound();
    const herbs = DB.herbs.filter(h => h.cult.includes(c.id));
    const oils = DB.oils.filter(o => o.cult.includes(c.id));
    const dz = DB.diseases.filter(d => (d.trad || []).some(x => x[0] === c.id));
    render(`
      <h1>${c.flag} ${esc(nm("cultures", c))}</h1>
      <p class="muted">📍 ${esc(tr("cultures", c, "region"))}</p>
      <div class="section"><h2>${t("history")}</h2><p>${esc(tr("cultures", c, "desc"))}</p></div>
      <div class="section"><h2>${t("principles")}</h2>${ulist(tr("cultures", c, "principles"))}</div>
      <div class="section"><h2>${t("its_herbs")} (${herbs.length})</h2><div class="chips">${herbs.map(h => `<a class="chip ${h.danger ? "danger" : "link"}" href="#/herb/${h.id}">${esc(shortName("herbs", h))}</a>`).join("")}</div></div>
      ${oils.length ? `<div class="section"><h2>${t("its_oils")} (${oils.length})</h2><div class="chips">${oils.map(o => `<a class="chip link" href="#/oil/${o.id}">${esc(nm("oils", o))}</a>`).join("")}</div></div>` : ""}
      ${dz.length ? `<div class="section"><h2>${t("its_recipes")}</h2>${dz.map(d => d.trad.map((x, i) => x[0] === c.id ? `<a class="herb-mini" href="#/disease/${d.id}"><b>${esc(nm("diseases", d))}</b><small>${esc(tradText(d, i))}</small></a>` : "").join("")).join("")}</div>` : ""}
      ${disclaimer()}
    `, nm("cultures", c), true);
  }

  /* ---------- حاسبة الجرعات ---------- */
  const SYRUPS = {
    paracetamol: { nameKey: "para_name", lo: 10, hi: 15, everyKey: "every_para", maxDay: 60, maxDose: 1000, perDay: 4, dayCap: 4000, conc: [[120, 5, "conc_p120"], [160, 5, "conc_p160"], [250, 5, "conc_p250"], [100, 1, "conc_p100d"]] },
    ibuprofen: { nameKey: "ibu_name", lo: 5, hi: 10, everyKey: "every_ibu", maxDay: 40, maxDose: 400, perDay: 3, dayCap: 1200, conc: [[100, 5, "conc_i100"], [200, 5, "conc_i200"], [40, 1, "conc_i40d"]] }
  };
  function viewDose() {
    const st = store.get("dose", { drug: "paracetamol", w: "", c: 0, ageM: "" });
    render(`
      <div class="card">
        <h1>${t("dose_title")}</h1>
        <p class="muted">${t("dose_intro")}</p>
        <label class="fld">${t("drug")}</label>
        <div class="seg" id="drugSeg">${Object.entries(SYRUPS).map(([k, v]) => `<button data-v="${k}" class="${st.drug === k ? "on" : ""}">${t(v.nameKey)}</button>`).join("")}</div>
        <div class="row">
          <div><label class="fld" for="w">${t("weight")}</label><input type="number" id="w" inputmode="decimal" min="2" max="80" value="${esc(st.w)}" placeholder="${t("weight_ph")}"></div>
          <div><label class="fld" for="am">${t("age_months")}</label><input type="number" id="am" inputmode="numeric" min="0" max="216" value="${esc(st.ageM)}" placeholder="${t("age_m_ph")}"></div>
        </div>
        <label class="fld" for="conc">${t("concentration")}</label>
        <select id="conc"></select>
      </div>
      <div id="doseOut"></div>
      ${disclaimer()}
    `, t("dose_page"), true);
    const fillConc = () => { document.getElementById("conc").innerHTML = SYRUPS[st.drug].conc.map((c, i) => `<option value="${i}" ${+st.c === i ? "selected" : ""}>${t(c[2])}</option>`).join(""); };
    const calc = () => {
      store.set("dose", st);
      const D = SYRUPS[st.drug], w = parseFloat(st.w), am = parseFloat(st.ageM);
      const out = document.getElementById("doseOut");
      if (!(w > 0)) { out.innerHTML = `<div class="empty">${t("dose_enter_weight")}</div>`; return; }
      if (st.drug === "ibuprofen" && ((!isNaN(am) && am < 3) || w < 5)) {
        out.innerHTML = `<div class="alert danger"><b>${t("ibu_no_title")}</b>${t("ibu_no")}</div>`; return;
      }
      const warn = [];
      if (!isNaN(am) && am < 3) warn.push(t("warn_infant"));
      if (w > 40) warn.push(t("warn_heavy"));
      const lo = Math.min(D.lo * w, D.maxDose), hi = Math.min(D.hi * w, D.maxDose);
      const conc = D.conc[+st.c] || D.conc[0];
      const r1 = v => Math.round(v * 10) / 10;
      const mlLo = r1(lo / conc[0] * conc[1]), mlHi = r1(hi / conc[0] * conc[1]);
      const maxDay = Math.min(D.maxDay * w, D.dayCap);
      out.innerHTML = `
        <div class="card dose-out">
          <p>${t("single_dose", { d: t(D.nameKey) })}</p>
          <p class="big">${mlLo === mlHi ? mlLo : mlLo + " – " + mlHi} ${t("ml")}</p>
          <p class="muted">= ${Math.round(lo)}${lo !== hi ? "–" + Math.round(hi) : ""} ${t("mg")} ${t(D.everyKey)}</p>
          <table class="t">
            <tr><th>${t("max_daily")}</th><td>${t("max_daily_v", { mg: Math.round(maxDay), n: D.perDay })}</td></tr>
            <tr><th>${t("conc")}</th><td>${t(conc[2])}</td></tr>
          </table>
        </div>
        ${warn.map(x => `<div class="alert warn">${esc(x)}</div>`).join("")}
        <div class="alert info"><b>${t("reminder")}</b>${t("remind_same")} ${t(st.drug === "ibuprofen" ? "remind_ibu" : "remind_para")} ${t("remind_tail")}</div>`;
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
  const TYPE = { disease: ["📖", "type_disease", "disease", "diseases"], herb: ["🌿", "type_herb", "herb", "herbs"], oil: ["💧", "type_oil", "oil", "oils"], drug: ["💊", "type_drug", "drug", "drugs"], symptom: ["🩺", "type_symptom", null, "symptoms"], culture: ["🌍", "type_culture", "culture", "cultures"] };
  function viewSearch(q) {
    try { q = decodeURIComponent(q || ""); } catch (e) { q = q || ""; }
    render(`
      <form id="sf" role="search"><input type="search" id="sq" value="${esc(q)}" placeholder="${t("search_ph")}" autofocus></form>
      <div id="sres" class="list" style="margin-top:10px"></div>
    `, t("search_title"), true);
    const draw = v => {
      const res = search(v);
      const box = document.getElementById("sres");
      if (!v.trim()) { box.innerHTML = `<div class="empty">${t("search_hint")}</div>`; return; }
      box.innerHTML = res.length ? res.slice(0, 60).map(r => {
        const [ic, label, route, kind] = TYPE[r.type];
        const it = r.item;
        const href = route ? `#/${route}/${it.id}` : "#";
        const sub = r.type === "symptom" ? t(label) + t("add_symptom_hint") : t(label) + (it.uses ? " · " + tr(kind, it, "uses") : "");
        return `<a class="item" href="${href}" ${r.type === "symptom" ? `data-addsym="${it.id}"` : ""}><span class="ic">${ic}</span><span class="body"><b>${esc(nm(kind, it))}</b><small>${esc(sub)}</small></span></a>`;
      }).join("") : `<div class="empty">${esc(t("no_results_for", { q: v }))}</div>`;
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
      <div class="card tight"><label class="fld" style="margin-top:0">🌐 ${t("language")}</label>
        <div class="seg" id="langSeg">${LANGS.map(l => `<button data-l="${l}" class="${l === LANG ? "on" : ""}">${I18N[l].ui.lang_name}</button>`).join("")}</div></div>
      <div class="list">
        ${item("#/favs", "★", t("favs"), t("favs_sub", { n: state.favs.length }))}
        ${item("#/cultures", "🌍", t("cultures_menu"), t("cultures_sub", { n: DB.cultures.length }))}
        ${item("#/drugs", "💊", t("drugs_menu"), t("drugs_sub", { n: DB.drugs.length }))}
        ${item("#/dose", "🧮", t("dose_menu"), t("dose_sub"))}
        ${item("#/danger", "☠️", t("danger_menu"), t("danger_sub"))}
        ${item("#/herbs/oils", "💧", t("oils_menu"), t("oils_sub"))}
        <button class="item" id="themeBtn" style="text-align:start"><span class="ic">🌓</span><span class="body"><b>${t("appearance")}</b><small id="themeLbl"></small></span></button>
        ${item("#/about", "ℹ️", t("about_menu"), t("about_sub"))}
      </div>
    `, t("more_title"));
    const lbl = () => (document.getElementById("themeLbl").textContent = t({ "": "theme_auto", light: "theme_light", dark: "theme_dark" }[store.get("theme", "")]));
    lbl();
    document.getElementById("themeBtn").onclick = () => {
      const order = ["", "light", "dark"];
      store.set("theme", order[(order.indexOf(store.get("theme", "")) + 1) % 3]); applyTheme(); lbl();
    };
    document.getElementById("langSeg").onclick = e => { const b = e.target.closest("[data-l]"); if (b) setLang(b.dataset.l); };
  }
  function viewFavs() {
    const maps = { disease: idx.disease, herb: idx.herb, oil: idx.oil, drug: idx.drug };
    const items = state.favs.map(k => {
      const [type, id] = k.split(":");
      const it = maps[type] && maps[type][id];
      return it ? item(`#/${type}/${id}`, TYPE[type][0], nm(TYPE[type][3], it), t(TYPE[type][1])) : "";
    }).join("");
    render(items ? `<div class="list">${items}</div>` : `<div class="empty">${t("favs_empty")}</div>`, t("favs"), true);
  }
  function viewAbout() {
    render(`
      <div class="section"><h2>${t("about_title")}</h2><p>${t("about_text", { d: DB.diseases.length, s: DB.symptoms.length, h: DB.herbs.length, o: DB.oils.length, r: DB.drugs.length, c: DB.cultures.length })}</p></div>
      <div class="section"><h2>${t("how_title")}</h2><p>${t("how_text")}</p></div>
      <div class="section"><h2>${t("sources_title")}</h2>${ulist(t("sources"))}</div>
      <div class="alert danger"><b>${t("disclaimer_title")}</b>${t("disclaimer_full")}</div>
    `, t("about_page"), true);
  }
  function notFound() { render(`<div class="empty">${t("not_found")} <a href="#/">${t("back_home")}</a></div>`, t("page_not_found"), true); }

  /* ---------- المظهر ---------- */
  function applyTheme() {
    const th = store.get("theme", "");
    if (th) document.documentElement.setAttribute("data-theme", th); else document.documentElement.removeAttribute("data-theme");
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

  // المفضلة
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-fav]"); if (!b) return;
    const k = b.dataset.fav;
    const i = state.favs.indexOf(k);
    if (i >= 0) state.favs.splice(i, 1); else state.favs.push(k);
    store.set("favs", state.favs);
    b.classList.toggle("on", i < 0); b.textContent = i < 0 ? "★" : "☆";
    toast(t(i < 0 ? "fav_added" : "fav_removed"));
  });
  $back.onclick = () => (history.length > 1 ? history.back() : (location.hash = "#/"));
  document.getElementById("searchBtn").onclick = () => (location.hash = "#/search/");
  document.getElementById("brand").onclick = () => (location.hash = "#/");
  document.getElementById("langBtn").onclick = () => {
    const next = LANGS[(LANGS.indexOf(LANG) + 1) % LANGS.length];
    setLang(next); toast(I18N[next].ui.lang_name);
  };

  // يُستدعى من تطبيق أندرويد عند ضغط زر الرجوع
  window.tabibBack = function () {
    const path = location.hash.replace(/^#/, "") || "/";
    if (path === "/") return false;
    history.back();
    return true;
  };

  applyTheme();
  applyLang();
  window.addEventListener("hashchange", route);
  route();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http") && !/TabibApp/.test(navigator.userAgent)) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
