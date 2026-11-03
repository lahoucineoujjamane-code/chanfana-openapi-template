/* محرك التحليل: البحث، الفهارس، وترجيح الأمراض حسب الأعراض والعمر والجنس */
(function (root) {
  const DB = root.DB;

  /* ---------- أدوات النص العربي ---------- */
  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[ً-ْٰـ]/g, "") // تشكيل وتطويل
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /* ---------- الفهارس ---------- */
  const idx = { symptom: {}, disease: {}, herb: {}, oil: {}, drug: {}, culture: {}, group: {}, category: {} };
  DB.symptoms = DB.symptoms.map(([id, ar, group, kw]) => ({ id, ar, group, kw: kw || "" }));
  DB.symptoms.forEach(s => (idx.symptom[s.id] = s));
  DB.diseases.forEach(d => (idx.disease[d.id] = d));
  DB.herbs.forEach(h => (idx.herb[h.id] = h));
  DB.oils.forEach(o => (idx.oil[o.id] = o));
  DB.drugs.forEach(d => (idx.drug[d.id] = d));
  DB.cultures.forEach(c => (idx.culture[c.id] = c));
  DB.symptomGroups.forEach(g => (idx.group[g.id] = g));
  DB.categories.forEach(c => (idx.category[c.id] = c));

  // ربط عكسي: الأعشاب والزيوت ← الأمراض
  const herbToDiseases = {}, oilToDiseases = {};
  DB.diseases.forEach(d => {
    (d.herbs || []).forEach(h => (herbToDiseases[h] = herbToDiseases[h] || []).push(d.id));
    (d.oils || []).forEach(o => (oilToDiseases[o] = oilToDiseases[o] || []).push(d.id));
  });

  /* ---------- الفئة العمرية ---------- */
  function ageGroup(years) {
    if (years == null || isNaN(years)) return "a";
    if (years < 2) return "b";
    if (years < 13) return "c";
    if (years < 18) return "t";
    if (years < 60) return "a";
    return "e";
  }
  const AGE_LABEL = { b: "رضيع", c: "طفل", t: "مراهق", a: "بالغ", e: "مسنّ" };

  /* ---------- خوارزمية الترجيح ----------
     لكل مرض:
       التغطية = مجموع أوزان الأعراض المتطابقة ÷ مجموع أوزان أعراض المرض
       الدقة   = عدد أعراض المستخدم التي يفسرها المرض ÷ عدد أعراض المستخدم
       الدرجة  = (0.55×التغطية + 0.45×الدقة) × معامل العمر × معامل الجنس × معامل المدة
     ثم تُحوّل الدرجات إلى نسب ترجيح نسبية بين المرشحين. */
  function analyze(input) {
    const sel = Array.from(new Set(input.symptoms || [])).filter(id => idx.symptom[id]);
    const years = input.ageYears;
    const g = ageGroup(years);
    const sex = input.sex; // "m" | "f" | undefined
    const dur = input.duration; // "acute" | "sub" | "chronic" | undefined
    if (!sel.length) return { group: g, results: [], flags: redFlags(sel, years) };

    const scored = [];
    for (const d of DB.diseases) {
      const entries = Object.entries(d.s);
      let total = 0, matchedW = 0, strong = 0;
      const matched = [];
      for (const [sid, w] of entries) {
        total += w;
        if (sel.includes(sid)) { matchedW += w; matched.push(sid); if (w >= 2) strong++; }
      }
      if (!matched.length) continue;
      if (matched.length === 1 && strong === 0) continue; // عرض ثانوي واحد غير كافٍ
      const coverage = matchedW / total;
      const precision = matched.length / sel.length;
      let score = 0.55 * coverage + 0.45 * precision;

      // العمر
      const am = d.ages && d.ages[g] != null ? d.ages[g] : 1;
      if (am === 0) continue;
      score *= am;
      // الجنس
      if (d.sex && sex) {
        const onlyOther = (d.sex === "f" && sex === "m" && d.cat === "women") || (d.sex === "m" && sex === "f" && ["bph", "ed"].includes(d.id));
        if (onlyOther) continue;
        score *= d.sex === sex ? 1.15 : 0.8;
      }
      // المدة
      if (dur && d.dur && d.dur !== "both") {
        const fit = (dur === "acute" && d.dur === "acute") || (dur === "chronic" && d.dur === "chronic") || dur === "sub";
        score *= fit ? 1.1 : 0.7;
      }
      // الحمل: يرفع احتمال بعض الحالات قليلاً (الارتجاع، الإمساك، المسالك)
      if (input.pregnant && ["gerd", "constipation", "uti", "hemorrhoids", "varicose", "anemia"].includes(d.id)) score *= 1.15;

      scored.push({ id: d.id, d, score, coverage, precision, matched, missing: entries.filter(([sid, w]) => w >= 3 && !sel.includes(sid)).map(([sid]) => sid) });
    }
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 8);
    const sum = top.reduce((s, r) => s + r.score * r.score, 0) || 1;
    top.forEach(r => {
      r.likelihood = Math.round((r.score * r.score / sum) * 100);
      r.level = r.score >= 0.6 ? "high" : r.score >= 0.38 ? "mid" : "low";
    });
    return { group: g, results: top, flags: redFlags(sel, years, input) };
  }

  function redFlags(sel, years, input) {
    const out = [];
    for (const rule of DB.redFlags) {
      const hasAny = rule.any.some(s => sel.includes(s));
      if (!hasAny) continue;
      if (rule.with && !rule.with.some(s => sel.includes(s))) continue;
      out.push(rule);
    }
    const fever = sel.includes("fever") || sel.includes("high_fever");
    if (fever && years != null && years < 0.25)
      out.unshift({ level: 4, msg: "أي حمى (38° أو أكثر) عند رضيع عمره أقل من 3 أشهر حالة طارئة — توجّه للطبيب أو الطوارئ فوراً." });
    if (sel.includes("high_fever") && sel.includes("rash"))
      out.push({ level: 4, msg: "الحمى العالية مع طفح جلدي لا يختفي عند الضغط عليه بكأس زجاجي قد تكون علامة خطيرة — راجع الطوارئ." });
    if (input && input.pregnant && (sel.includes("pelvic_pain") || sel.includes("heavy_periods") || sel.includes("severe_headache") || sel.includes("blurred_vision")))
      out.push({ level: 4, msg: "أثناء الحمل: النزيف أو ألم الحوض الشديد أو الصداع الشديد مع تشوش الرؤية تحتاج مراجعة الطوارئ فوراً." });
    if (years != null && years < 2 && (sel.includes("diarrhea") || sel.includes("vomiting")))
      out.push({ level: 3, msg: "الرضّع يُصابون بالجفاف بسرعة: أعطِ محلول الإرواء وراقب البول والنشاط، وراجع الطبيب إذا قلّ البول أو خمل الطفل." });
    out.sort((a, b) => b.level - a.level);
    return out;
  }

  /* ---------- البحث الشامل ---------- */
  function search(q) {
    const nq = norm(q);
    if (!nq) return [];
    const terms = nq.split(" ");
    const hit = (...fields) => {
      const hay = norm(fields.join(" "));
      return terms.every(t => hay.includes(t));
    };
    const res = [];
    DB.diseases.forEach(d => { if (hit(d.ar, d.en, d.desc)) res.push({ type: "disease", item: d, rank: norm(d.ar).includes(nq) ? 0 : 2 }); });
    DB.herbs.forEach(h => { if (hit(h.ar, h.en, h.lat, h.uses)) res.push({ type: "herb", item: h, rank: norm(h.ar).includes(nq) ? 0 : 2 }); });
    DB.oils.forEach(o => { if (hit(o.ar, o.en, o.uses)) res.push({ type: "oil", item: o, rank: norm(o.ar).includes(nq) ? 0 : 2 }); });
    DB.drugs.forEach(d => { if (hit(d.ar, d.en, d.use, d.cls)) res.push({ type: "drug", item: d, rank: norm(d.ar).includes(nq) ? 1 : 3 }); });
    DB.symptoms.forEach(s => { if (hit(s.ar, s.kw)) res.push({ type: "symptom", item: s, rank: 1 }); });
    DB.cultures.forEach(c => { if (hit(c.ar, c.desc)) res.push({ type: "culture", item: c, rank: 2 }); });
    res.sort((a, b) => a.rank - b.rank);
    return res;
  }

  function filterSymptoms(q) {
    const nq = norm(q);
    if (!nq) return DB.symptoms;
    return DB.symptoms.filter(s => norm(s.ar + " " + s.kw).includes(nq));
  }

  root.Engine = { norm, idx, analyze, search, filterSymptoms, ageGroup, AGE_LABEL, herbToDiseases, oilToDiseases };
})(typeof window !== "undefined" ? window : globalThis);
