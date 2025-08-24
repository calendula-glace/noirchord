import { ChordSpec, LogItem } from "../types";

export const PC = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
export const idxToNote = (i:number) => PC[(i%12+12)%12];

const FLAT_MAP: Record<string, number> = { Db:1, Eb:3, Gb:6, Ab:8, Bb:10 };
export const noteToIdx = (s:string) => {
  const t = s.replace("♭","b").replace("＃","#");
  if (PC.includes(t)) return PC.indexOf(t);
  if (FLAT_MAP[t] != null) return FLAT_MAP[t];
  // 特殊：E#→F, B#→C, Cb→B, Fb→E
  if (t === "E#") return noteToIdx("F");
  if (t === "B#") return noteToIdx("C");
  if (t === "Cb") return noteToIdx("B");
  if (t === "Fb") return noteToIdx("E");
  return 0;
};

const KEY_ROOT: Record<string, number> = {
  C:0, G:7, F:5, D:2, A:9, E:4, B:11, "F#":6, Bb:10, Eb:3, Ab:8, Db:1
};

export function normalizeMods(spec: ChordSpec) {
  // sus のときは 3rd が消えるため "m" は無効化（メジャー扱い）
  if (spec.mods.has("sus2") || spec.mods.has("sus4")) spec.minor = false;
}

export function labelOf(spec: ChordSpec) {
  const s: ChordSpec = { ...spec, mods: new Set(spec.mods) };
  normalizeMods(s);
  const base = idxToNote(s.root) + (s.minor ? "m" : "");
  // ← 表示順を見直し：add9 と #13 を追加
  const order = [
    "maj7","7","6",
    "add9","9","b9","#9",
    "11","b11","#11",
    "13","b13","#13",
    "sus2","sus4","dim","aug","b5"
  ];
  const ext = order.filter(x => s.mods.has(x as any)).join("");
  const slash = s.bass != null ? `/${idxToNote(s.bass)}` : "";
  return base + ext + slash;
}

export function diatonic(key: string): { label: string; spec: ChordSpec }[] {
  const tonic = KEY_ROOT[key] ?? 0;
  const deg = [
    { r: tonic + 0,  min:false, mods:[] },     // I
    { r: tonic + 2,  min:true , mods:[] },     // ii
    { r: tonic + 4,  min:true , mods:[] },     // iii
    { r: tonic + 5,  min:false, mods:[] },     // IV
    { r: tonic + 7,  min:false, mods:[] },     // V
    { r: tonic + 9,  min:true , mods:[] },     // vi
    { r: tonic + 11, min:true , mods:["b5"] }, // viiø（m b5）
  ];
  return deg.map((d) => {
    const spec: ChordSpec = {
      root: (d.r%12+12)%12,
      minor: d.min,
      mods: new Set(d.mods as any),
      bass: null
    };
    const label = labelOf(spec);
    return { label, spec };
  });
}

export function reviveLog(json: any): LogItem[] {
  if (!Array.isArray(json)) return [];
  return json.map((li:any) => {
    const spec: ChordSpec = {
      root: Number(li?.spec?.root ?? 0),
      minor: !!li?.spec?.minor,
      mods: new Set<string>(Array.isArray(li?.spec?.mods) ? li.spec.mods : []),
      bass: li?.spec?.bass ?? null,
    } as any;
    return { spec, length: (li?.length === "1/2bar" ? "1/2bar" : "1bar") };
  });
}
