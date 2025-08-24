// src/mascot/mari.ts
// NoirChord マスコット「マリ」ユーティリティ（Pages対応の画像パス＆発話）
// App 側の期待ズレを吸収するため、image/src, line/text を両方提供します。

export type MariExpression = 'normal' | 'smile' | 'idea' | 'sweat' | 'sad';
export const MARI_NAME = 'マリ';

// Vite: ローカル = "/", Pages = "/noirchord/"
const BASE: string = (import.meta as any).env?.BASE_URL ?? '/';

// 画像は public/mascot/*.png に配置
export const MARI_IMAGES: Record<MariExpression, string> = {
  normal: `${BASE}mascot/normal.png`,
  smile:  `${BASE}mascot/smile.png`,
  idea:   `${BASE}mascot/idea.png`,
  sweat:  `${BASE}mascot/sweat.png`,
  sad:    `${BASE}mascot/sad.png`,
};

export type MariContext = {
  event?:
    | 'idle' | 'picked-key' | 'added-chord' | 'modified-chord'
    | 'predicted' | 'play' | 'stop' | 'export' | 'share' | 'error';
  sectionLabel?: string;
  lastChordLabel?: string;
  predictedLabel?: string;
  tags?: string[];
};

export function pickMariFace(ctx?: MariContext): MariExpression {
  if (!ctx) return 'normal';
  switch (ctx.event) {
    case 'picked-key':  return 'idea';
    case 'added-chord':
    case 'modified-chord':
    case 'play':
    case 'share':
    case 'export':      return 'smile';
    case 'predicted':   return 'idea';
    case 'error':       return 'sweat';
    case 'stop':
    default:            return 'normal';
  }
}

const LINES = {
  idle: ['今日も良い進行つくってこー！', '迷ったら王道進行もアリだよ！'],
  'picked-key': (key: string) => [`キー「${key}」了解っ！ダイアトニック出すね！`],
  'added-chord': (ch: string) => [`「${ch}」入れたよ！次はどうする？`],
  'modified-chord': (from: string, to: string) => [`「${from}」を「${to}」に変えたよ！`],
  predicted: (from?: string, to?: string, tags?: string[]) =>
    [`「${from ?? '？'}→${to ?? '？'}」はイイ感じ！${tags?.length ? `（${tags.join('／')}）` : ''}`],
  play: ['いくよー！カウント入るね！'],
  stop: ['ストップ！次どうする？'],
  export: ['テキスト出力してコピペOKだよ！'],
  share: ['共有リンクできたよ！見てみて！'],
  error: ['あわわ…エラー出ちゃった。もう一回試してみよ！'],
} as const;

function rand(arr: readonly string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getMariLine(ctx?: MariContext): string {
  if (!ctx?.event) return rand(LINES.idle);
  switch (ctx.event) {
    case 'picked-key':     return rand(LINES['picked-key'](ctx.sectionLabel ?? ''));
    case 'added-chord':    return rand(LINES['added-chord'](ctx.lastChordLabel ?? ''));
    case 'modified-chord': return rand(LINES['modified-chord'](ctx.lastChordLabel ?? '？', ctx.predictedLabel ?? '？'));
    case 'predicted':      return rand(LINES['predicted'](ctx.lastChordLabel, ctx.predictedLabel, ctx.tags));
    case 'play':           return rand(LINES.play);
    case 'stop':           return rand(LINES.stop);
    case 'export':         return rand(LINES.export);
    case 'share':          return rand(LINES.share);
    case 'error':          return rand(LINES.error);
    default:               return rand(LINES.idle);
  }
}

export type MascotPayload = {
  name: string;
  image: string;      // 画像URL（互換: src と同じ）
  src: string;        // 画像URL（互換用）
  line: string;       // セリフ（互換: text と同じ）
  text: string;       // セリフ（互換用）
  expression: MariExpression;
};

// App 側から呼ばれる想定のエントリポイント
export function getMascot(ctx?: MariContext): MascotPayload {
  const expression = pickMariFace(ctx);
  const image = MARI_IMAGES[expression];
  const line = getMariLine(ctx);
  return {
    name: MARI_NAME,
    image,
    src: image,     // 互換
    line,
    text: line,     // 互換
    expression,
  };
}

// 既存互換の default export
export const MARI = {
  name: MARI_NAME,
  images: MARI_IMAGES,
  pathOf: (exp: MariExpression) => MARI_IMAGES[exp],
  face: pickMariFace,
  say: getMariLine,
  get: getMascot,
};
export default MARI;
