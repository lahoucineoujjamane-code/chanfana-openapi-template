// التحقق من سلامة البيانات ومحرك الترجيح: node medicine-app/tests/validate.mjs
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const www = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "www", "js");
const ctx = { globalThis: null };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ["data/symptoms.js", "data/cultures.js", "data/herbs.js", "data/herbs-extra.js", "data/oils.js", "data/drugs.js", "data/diseases.js", "data/diseases-extra.js", "engine.js"])
  vm.runInContext(fs.readFileSync(path.join(www, f), "utf8"), ctx, { filename: f });
const { DB, Engine } = ctx;
const { idx } = Engine;
const errors = [];
const uniq = (arr, name) => { const s = new Set(); arr.forEach(x => { if (s.has(x.id)) errors.push(`${name} مكرر: ${x.id}`); s.add(x.id); }); };
uniq(DB.symptoms, "عرض"); uniq(DB.diseases, "مرض"); uniq(DB.herbs, "عشبة"); uniq(DB.oils, "زيت"); uniq(DB.drugs, "دواء"); uniq(DB.cultures, "ثقافة");

DB.symptoms.forEach(s => { if (!idx.group[s.group]) errors.push(`مجموعة غير معروفة ${s.group} في ${s.id}`); });
const usedSym = new Set();
DB.diseases.forEach(d => {
  if (!idx.category[d.cat]) errors.push(`فئة غير معروفة ${d.cat} في ${d.id}`);
  if (![1, 2, 3, 4].includes(d.sev)) errors.push(`خطورة غير صالحة في ${d.id}`);
  for (const k of ["ar", "en", "desc", "causes", "doc"]) if (!d[k]) errors.push(`حقل ${k} ناقص في ${d.id}`);
  Object.entries(d.s).forEach(([sid, w]) => { usedSym.add(sid); if (!idx.symptom[sid]) errors.push(`عرض غير معروف ${sid} في ${d.id}`); if (![1, 2, 3].includes(w)) errors.push(`وزن غير صالح ${sid}=${w} في ${d.id}`); });
  (d.herbs || []).forEach(h => idx.herb[h] || errors.push(`عشبة غير معروفة ${h} في ${d.id}`));
  (d.oils || []).forEach(o => idx.oil[o] || errors.push(`زيت غير معروف ${o} في ${d.id}`));
  (d.drugs || []).forEach(x => idx.drug[x] || errors.push(`دواء غير معروف ${x} في ${d.id}`));
  (d.trad || []).forEach(([c]) => idx.culture[c] || errors.push(`ثقافة غير معروفة ${c} في ${d.id}`));
});
[...DB.herbs, ...DB.oils].forEach(x => x.cult.forEach(c => idx.culture[c] || errors.push(`ثقافة غير معروفة ${c} في ${x.id}`)));
DB.herbs.forEach(h => { for (const k of ["uses", "prep", "dose", "kids", "caution", "preg"]) if (!h[k]) errors.push(`حقل ${k} ناقص في العشبة ${h.id}`); });
DB.cultures.forEach(c => c.famous.forEach(h => idx.herb[h] || idx.oil[h] || errors.push(`عنصر غير معروف ${h} في ثقافة ${c.id}`)));
DB.redFlags.forEach(r => [...r.any, ...(r.with || [])].forEach(s => idx.symptom[s] || errors.push(`عرض غير معروف ${s} في قاعدة خطر`)));
const unused = DB.symptoms.filter(s => !usedSym.has(s.id)).map(s => s.id);
if (unused.length) console.log("أعراض غير مستعملة في أي مرض (مسموح بها للتنبيهات):", unused.join(", "));

if (errors.length) { console.error("❌ أخطاء البيانات:\n" + errors.join("\n")); process.exit(1); }

// سيناريوهات الترجيح
const top = (input) => Engine.analyze(input).results[0]?.id;
const cases = [
  [{ symptoms: ["runny_nose", "sneezing", "nasal_congestion", "sore_throat"], ageYears: 30, duration: "acute" }, "cold"],
  [{ symptoms: ["high_fever", "body_aches", "chills", "fatigue", "dry_cough"], ageYears: 40, duration: "acute" }, "flu"],
  [{ symptoms: ["burning_urination", "frequent_urination", "urgency_urination"], ageYears: 28, sex: "f" }, "uti"],
  [{ symptoms: ["heartburn", "acid_reflux"], ageYears: 45 }, "gerd"],
  [{ symptoms: ["throbbing_one_side", "light_sensitivity", "nausea"], ageYears: 25, sex: "f" }, "migraine"],
  [{ symptoms: ["excessive_thirst", "frequent_urination", "blurred_vision", "fatigue"], ageYears: 55, duration: "chronic" }, "diabetes"],
  [{ symptoms: ["weak_urine_stream", "nocturia", "frequent_urination"], ageYears: 68, sex: "m", duration: "chronic" }, "bph"],
  [{ symptoms: ["ear_pain", "fever", "irritability"], ageYears: 2 }, "otitis"],
  [{ symptoms: ["big_toe_pain", "joint_swelling", "skin_red_warm"], ageYears: 50, sex: "m" }, "gout"],
  [{ symptoms: ["acne"], ageYears: 16 }, "acne"],
  [{ symptoms: ["wheezing", "shortness_breath", "chest_tightness", "dry_cough"], ageYears: 10 }, "asthma"],
  [{ symptoms: ["chest_pain", "arm_jaw_pain", "sweating", "shortness_breath"], ageYears: 60, sex: "m" }, "heart_attack"],
  [{ symptoms: ["hot_flashes", "night_sweats", "irregular_periods"], ageYears: 51, sex: "f" }, "menopause"],
  [{ symptoms: ["anal_itch", "insomnia"], ageYears: 6 }, "worms"],
  [{ symptoms: ["swollen_cheek", "fever"], ageYears: 8 }, "mumps"],
  [{ symptoms: ["infant_crying", "irritability"], ageYears: 0.2 }, "infant_colic"],
  [{ symptoms: ["tremor", "slow_movement"], ageYears: 70, sex: "m" }, "parkinson"],
  [{ symptoms: ["memory_loss", "confusion"], ageYears: 78 }, "dementia"],
  [{ symptoms: ["eye_pain", "blurred_vision", "eye_halos", "headache"], ageYears: 65 }, "glaucoma_acute"],
  [{ symptoms: ["milk_trigger", "bloating", "diarrhea"], ageYears: 30 }, "lactose_intolerance"],
  [{ symptoms: ["missed_period", "nausea", "vomiting"], ageYears: 27, sex: "f" }, "morning_sickness"],
  [{ symptoms: ["band_rash", "blisters"], ageYears: 62 }, "shingles"],
  [{ symptoms: ["fever", "night_sweats", "joint_pain", "back_pain"], ageYears: 40, duration: "sub" }, "brucellosis"],
];
let fail = 0;
for (const [input, expected] of cases) {
  const got = top(input);
  const ok = got === expected;
  if (!ok) fail++;
  console.log(`${ok ? "✔" : "✘"} ${expected.padEnd(14)} ← ${got}`);
}
// مرض خاص بجنس لا يظهر للجنس الآخر
assert.ok(!Engine.analyze({ symptoms: ["weak_urine_stream", "nocturia"], ageYears: 70, sex: "f" }).results.some(r => r.id === "bph"), "BPH ظهر لأنثى");
assert.ok(!Engine.analyze({ symptoms: ["menstrual_pain", "pelvic_pain"], ageYears: 30, sex: "m" }).results.some(r => r.d.cat === "women"), "مرض نسائي ظهر لذكر");
// علامات الخطر
assert.ok(Engine.analyze({ symptoms: ["chest_pain", "shortness_breath"], ageYears: 55 }).flags.some(f => f.level === 4), "لم تظهر علامة خطر للصدر");
assert.ok(Engine.analyze({ symptoms: ["fever"], ageYears: 0.1 }).flags.some(f => f.level === 4), "لم تظهر علامة خطر لحمى الرضيع");
// النسب مجموعها ≈ 100
const r = Engine.analyze({ symptoms: ["fever", "headache", "fatigue"], ageYears: 30 }).results;
const sum = r.reduce((s, x) => s + x.likelihood, 0);
assert.ok(sum >= 97 && sum <= 103, "مجموع النسب " + sum);
// البحث العربي مع التطبيع
assert.ok(Engine.search("زنجبيل").some(x => x.item.id === "ginger"));
assert.ok(Engine.search("السكرى").some(x => x.item.id === "diabetes"), "تطبيع الياء/الألف المقصورة");

console.log(`\nالأمراض ${DB.diseases.length} | الأعراض ${DB.symptoms.length} | الأعشاب ${DB.herbs.length} | الزيوت ${DB.oils.length} | الأدوية ${DB.drugs.length} | الثقافات ${DB.cultures.length}`);
if (fail) { console.error(`❌ ${fail} سيناريو فشل`); process.exit(1); }
console.log("✅ كل الاختبارات نجحت");
