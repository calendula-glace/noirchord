// NoirChord v1.0.0 — types (Phase B)
// Keeping types broad to avoid breaking existing code. Extend as needed safely.

export type Section = 'Verse' | 'Pre' | 'Cho' | 'D';

export type Mood =
  | '-'
  | 'おしゃれ'
  | '感動的'
  | '淡泊'
  | '悲壮'
  | '楽しい'
  | '怪しい';

export type StyleId =
  | 'J-Pop'
  | 'Anison(cute)'
  | 'Anison(cool)'
  | 'City Pop'
  | 'EDM'
  | 'Rock'
  | 'Metal'
  | 'Idol'
  | 'Denpa'
  | 'Lo-fi'
  | 'Jazz'
  | 'Halloween';

// くせつよモード（単一選択）
export type KuseId = 'modulationLover' | 'augLover' | 'canonApostle' | null;

// Roman is intentionally permissive to avoid compile issues with unseen tokens.
export type Roman = string;

// 0-11 (C=0, C#=1, ... B=11)
export type PitchClass = number;

export type Quality = 'maj' | 'min' | 'dim' | 'aug';

export type Sus = 'sus2' | 'sus4' | null;

export type Alteration = 'b5' | 'aug' | 'dim' | null;

export type Tension =
  | '7'
  | 'maj7'
  | '9' | '11' | '13'
  | 'b9' | '#9'
  | 'b11' | '#11'
  | 'b13' | '#13';

export interface ChordSpec {
  root: PitchClass;     // 0..11
  q: Quality;           // triad quality
  tens?: Tension[];     // optional tensions (no duplicates)
  sus?: Sus;            // sus2/sus4
  alt?: Alteration;     // b5/aug/dim triad modifications
  on?: PitchClass | null; // on-bass (slash chord). null if none
  label?: string;       // display label cache (optional)
}

export interface LogItem {
  spec: ChordSpec;
  len?: number;          // 1 (bar) or 0.5 (half bar). optional for back-compat
  beats?: number;        // optional legacy
  section?: Section;     // which section it belongs to
  text?: string;         // display string (optional)
}

export type CadenceKind = 'authentic' | 'plagal' | 'deceptive' | 'half';

export type ReasonTag =
  | 'DM'                 // Dominant Motion
  | '借用'               // Borrowed chord
  | '転調'               // Modulation
  | '解決:正格'
  | '解決:変格'
  | '解決:偽終止'
  | '解決:半終止';

export interface Candidate {
  spec: ChordSpec;
  label: string;           // printable label for UI
  fit: number;             // 0..1
  reasons?: ReasonTag[];
  cadence?: CadenceKind | null;
  lowFit?: boolean;        // UI hint when filled from low-fit pool
}

export interface PredictInput {
  key: PitchClass;        // current key tonic (C=0)
  section: Section;
  barIn8: number;         // 1..8
  log: LogItem[];         // current progression
  styles: StyleId[];      // selected styles (multi)
  mood: Mood | '-';       // current mood flavor
  kuse: Exclude<KuseId, null> | null;
}

export interface PredictOutput {
  items: Candidate[];     // up to 6
}

export interface UserSettings {
  showLowFit: boolean;                         // 低適合の補充
  hideMascot: boolean;                         // キャラ非表示
  character: 'mari' | 'kana' | 'emi' | 'sara' | 'miki'; // 現状はUIのみ
}

export const USER_KEYS = {
  showLowFit: 'noir-user-showLowFit',
  hideMascot: 'noir-user-hideMascot',
  character:  'noir-user-character',
} as const;

export const DEFAULT_SETTINGS: UserSettings = {
  showLowFit: false,
  hideMascot: false,
  character: 'mari',
};
