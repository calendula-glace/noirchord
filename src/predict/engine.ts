// NoirChord v1.0.0 — Phase C engine skeleton
// Uses Phase A data (corpus_v100.json, cadence_v100.json) to score candidates.
// API stays synchronous and non-breaking.

import type { PredictInput, PredictOutput, Candidate, ChordSpec, PitchClass, Quality, Section, StyleId, Mood } from "../types";
import corpus from "./data/corpus_v100.json";
import cadenceMap from "./data/cadence_v100.json";

type NGram2 = { prev: string[]; next: Record<string, number> };
type NGram3 = { prev: string[]; next: Record<string, number> };
type Row = { genre: string; section: Section; barIn8: number; n2: NGram2[]; n3: NGram3[] };

// ----- helpers: music theory (minimal, self-contained) -----
const NOTE_SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const MAJ_DEGREE_PC = [0,2,4,5,7,9,11]; // I ii iii IV V vi vii°

function pcName(pc: number): string { return NOTE_SHARP[((pc%12)+12)%12]; }

function romanDegreePc(roman: string, keyPc: PitchClass): {pc: PitchClass, quality: Quality} {
  // Handle secondary dominant V/V only (used in corpus)
  if (roman === "V/V") {
    const v_pc = (keyPc + 7) % 12;       // V of key
    const v_of_v = (v_pc + 7) % 12;      // its V
    return { pc: v_of_v, quality: "maj" };
  }
  // Borrowed with flats: bVII, bVI, bIII (maj)
  const m = roman.match(/^(b?)([iIvV]{1,3})(?:°)?$/);
  if (m) {
    const flat = m[1] === "b";
    const base = m[2];
    const upper = base.toUpperCase();
    const degIndex = ({I:0, II:1, III:2, IV:3, V:4, VI:5, VII:6} as Record<string, number>)[upper] ?? 0;
    let pc = (keyPc + MAJ_DEGREE_PC[degIndex]) % 12;
    let qual: Quality = (base === upper) ? "maj" : "min";
    if (flat) {
      // naive flat: -1 semitone
      pc = (pc + 11) % 12;
      qual = "maj"; // common borrowed are major
    }
    if (upper === "VII") qual = "dim"; // diatonic leading tone
    return { pc: pc as PitchClass, quality: qual };
  }
  // Fallback: treat as I
  return { pc: keyPc, quality: "maj" };
}

function buildSpec(pc: PitchClass, q: Quality): ChordSpec {
  return { root: pc, q, tens: [], sus: null, alt: null, on: null };
}

function labelOf(spec: ChordSpec): string {
  const root = pcName(spec.root);
  const q = spec.q === "min" ? "m" : (spec.q === "dim" ? "dim" : (spec.q === "aug" ? "aug" : ""));
  return root + (q ? q : "");
}

// ----- data lookup -----
function rowsFor(genre: string, section: Section, barIn8: number): Row[] {
  const ds: Row[] = [];
  for (const row of corpus.data as Row[]) {
    if (row.genre === genre && row.section === section && row.barIn8 === barIn8) ds.push(row);
  }
  return ds;
}

type CadRow = { genre: string; section: Section; bar: number; cadence: Record<string, number> };
function cadenceFor(genre: string, section: Section, bar: number): Record<string, number> | null {
  const arr = (cadenceMap.weights as CadRow[]).filter(r=> r.genre===genre && r.section===section && r.bar===bar);
  return arr[0]?.cadence ?? null;
}

// Rough cadence classifier using last two romans (very lightweight)
function classifyCadence(prev2: string[], next: string): "authentic"|"plagal"|"deceptive"|"half"|null {
  const a = prev2.at(-2) ?? "";
  const b = prev2.at(-1) ?? "";
  // ii–V–I
  if ((a==="ii" && b==="V" && next==="I") || (b==="V" && next==="I")) return "authentic";
  // IV–I
  if (b==="IV" && next==="I") return "plagal";
  // V–vi
  if (b==="V" && next==="vi") return "deceptive";
  // any -> V (stop)
  if (next==="V") return "half";
  return null;
}

// Theory prior (diatonic friendliness) in major
const THEORY_PRIOR: Record<string, number> = {
  "I":0.24,"V":0.18,"vi":0.16,"IV":0.16,"ii":0.12,"iii":0.08,"vii°":0.06,
  "bVII":0.06,"bVI":0.05,"bIII":0.05,"V/V":0.06
};

// Style weights (gentle). Multiple styles average (App handles selection order boost).
const STYLE_W: Record<StyleId, Record<string, number>> = {
  "J-Pop":      {"I":0.02,"vi":0.02,"IV":0.01,"V":0.01},
  "Anison(cute)": {"I":0.02,"IV":0.02,"V":0.01},
  "Anison(cool)": {"V":0.02,"vi":0.02},
  "City Pop":   {"ii":0.02,"V":0.02,"iii":0.01},
  "EDM":        {"V":0.03,"vi":0.02},
  "Rock":       {"I":0.02,"bVII":0.02},
  "Metal":      {"V":0.03,"bVI":0.02},
  "Idol":       {"I":0.02,"IV":0.02},
  "Denpa":      {"I":0.02,"V":0.02,"bVII":0.01},
  "Lo-fi":      {"vi":0.02,"IV":0.02,"ii":0.01},
  "Jazz":       {"ii":0.03,"V":0.03,"iii":0.02},
  "Halloween":  {"bVI":0.03,"bII":0.02} // bII not in corpus, ignored if unseen
};

const MOOD_W: Record<Mood, Record<string, number>> = {
  "-": {},
  "おしゃれ": {"ii":0.02,"V":0.02,"maj7":0.0},
  "感動的": {"IV":0.02,"vi":0.02},
  "淡泊": {"I":0.01,"iii":0.01},
  "悲壮": {"iv":0.0,"bVI":0.02},
  "楽しい": {"I":0.02,"IV":0.02},
  "怪しい": {"bII":0.02,"bVI":0.02}
};

// ----- core predict -----
export function predict(input: PredictInput): PredictOutput {
  const { key, section, barIn8, log, styles, mood } = input;
  const lastRomans = romanTraceFromLog(log); // best-effort roman trace (major key)
  const styleList = styles.length ? styles : (["J-Pop"] as StyleId[]);

  // Aggregate n-gram probabilities over all selected styles
  const probs: Record<string, number> = {};
  for (const g of styleList) {
    const rows = rowsFor(g, section, barIn8);
    for (const row of rows) {
      // try n3 first
      for (const r of row.n3) {
        if (endsWithSeq(lastRomans, r.prev)) {
          for (const [cand, p] of Object.entries(r.next)) probs[cand] = (probs[cand] ?? 0) + p;
        }
      }
      // fallback n2
      if (!Object.keys(probs).length) {
        for (const r of row.n2) {
          if (endsWithSeq(lastRomans.slice(-1), r.prev)) {
            for (const [cand, p] of Object.entries(r.next)) probs[cand] = (probs[cand] ?? 0) + p * 0.7; // weaker weight
          }
        }
      }
    }
  }

  // Blend with theory prior
  for (const [deg, w] of Object.entries(THEORY_PRIOR)) {
    probs[deg] = (probs[deg] ?? 0) + w * 0.5;
  }

  // Cadence emphasis at bar 4/8
  const cadPref = cadenceFor(styleList[0], section, (barIn8===4||barIn8===8)?barIn8:8); // prefer bar 8 if not 4
  if (cadPref) {
    for (const [cand, base] of Object.entries(probs)) {
      const cad = classifyCadence(lastRomans.slice(-2), cand);
      if (cad && cadPref[cad] != null) {
        probs[cand] = base * (1.0 + cadPref[cad] * 0.6);
      }
    }
  }

  // Mood/Style gentle nudges
  for (const s of styleList) {
    const w = STYLE_W[s]; if (!w) continue;
    for (const [k,v] of Object.entries(w)) probs[k] = (probs[k] ?? 0) + v;
  }
  const mw = MOOD_W[mood] || {};
  for (const [k,v] of Object.entries(mw)) probs[k] = (probs[k] ?? 0) + v;

  // Normalize → score
  const sum = Object.values(probs).reduce((a,b)=>a+b,0) || 1;
  const scored = Object.entries(probs).map(([roman, p])=>({ roman, score: p/sum }));
  scored.sort((a,b)=> b.score - a.score);

  // Build candidates (max 6)
  const cands: Candidate[] = [];
  for (const {roman, score} of scored.slice(0, 12)) { // take more then trim low fit
    const { pc, quality } = romanDegreePc(roman, key);
    const spec: ChordSpec = buildSpec(pc, quality);
    const label = labelOf(spec);
    const cad = classifyCadence(lastRomans.slice(-2), roman);
    cands.push({ spec, label, fit: Math.min(1, Math.max(0, score)), cadence: cad, reasons: cad ? tagForCadence(cad) : undefined });
  }

  // prune to 6
  cands.sort((a,b)=> b.fit - a.fit);
  return { items: cands.slice(0, 6) };
}

// ----- helpers: roman trace from log (very simple major-key classifier) -----
function romanTraceFromLog(log: {spec: ChordSpec}[]): string[] {
  // map absolute PC to scale degree (major key)
  // choose nearest degree; if not diatonic, approximate with bIII/bVI/bVII when fitting
  return log.map(it => {
    const deg = nearestDegree(it.spec.root, 0); // treat key 0 here; caller alignment not critical, we only use shape
    const isMinor = it.spec.q === "min";
    const map = ["I","II","III","IV","V","VI","VII"];
    let rn = map[deg];
    if (rn === "VII" && it.spec.q === "dim") return "vii°";
    if (!isMinor && it.spec.q === "maj") return rn;
    if (isMinor) rn = rn.toLowerCase();
    return rn;
  });
}

function nearestDegree(pc: number, keyPc: number): number {
  let best = 0, bestDist = 99;
  for (let i=0;i<7;i++){
    const degPc = (keyPc + MAJ_DEGREE_PC[i]) % 12;
    const d = Math.min((pc - degPc + 12)%12, (degPc - pc + 12)%12);
    if (d < bestDist) { bestDist = d; best = i; }
  }
  return best;
}

function endsWithSeq(arr: string[], tail: string[]): boolean {
  if (tail.length === 0) return true;
  if (arr.length < tail.length) return false;
  for (let i=0;i<tail.length;i++){
    if (arr[arr.length - tail.length + i] !== tail[i]) return false;
  }
  return true;
}

function tagForCadence(c: "authentic"|"plagal"|"deceptive"|"half"): ("解決:正格"|"解決:変格"|"解決:偽終止"|"解決:半終止")[] {
  switch(c){
    case "authentic": return ["解決:正格"];
    case "plagal": return ["解決:変格"];
    case "deceptive": return ["解決:偽終止"];
    case "half": return ["解決:半終止"];
  }
}
