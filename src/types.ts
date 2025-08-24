export type Tension =
  | "maj7" | "7" | "6"
  | "add9" | "9" | "b9" | "#9"
  | "11" | "b11" | "#11"
  | "13" | "b13" | "#13";

export type Shape = "sus2" | "sus4" | "dim" | "aug" | "b5";

export type LogLen = "1bar" | "1/2bar";

export type ChordSpec = {
  root: number;              // 0..11 (C=0)
  minor: boolean;            // true=マイナー
  mods: Set<Tension | Shape>;
  bass: number | null;       // onコードのベース(0..11) or null
};

export type LogItem = {
  spec: ChordSpec;
  length: LogLen;
};

export type Settings = {
  key: string;               // "C","G","F","Bb"...
  bpm: number;               // 80..200 等
  unit: LogLen;              // 1bar / 1/2bar
  octave: "normal" | "high"; // 普通 / 高い
};
