// src/mascot/mari.ts
export type MariExpression = 'normal' | 'smile' | 'idea' | 'sweat' | 'sad';
export const MARI_NAME = 'マリ';

// Vite が /（ローカル）や /noirchord/（Pages）を自動注入
const BASE = (import.meta as any).env?.BASE_URL ?? '/';

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

export function getMariLine(ctx?: MariContext): string {
  if (!ctx?.event) return rand(LINES.idle);
  switch (ctx.event) {
    case 'picked-key':    return rand(LINES['picked-key'](ctx.sectionLabel ?? ''));
    case 'added-chord':   return rand(LINES['added-chord'](ctx.lastChordLabel ?? ''));
    case 'modified-chord':return rand(LINES['modified-chord'](ctx.lastChordLabel ?? '？', ctx.predictedLabel ?? '？'));
    case 'predicted':     return rand(LINES['predicted'](ctx.lastChordLabel, ctx.predictedLabel, ctx.tags));
    case 'play':          return rand(LINES.play);
    case 'stop':          return rand(LINES.stop);
    case 'export':        return rand(LINES.export);
    case 'share':         return rand(LINES.share);
    case 'error':         return rand(LINES.error);
    default:              return rand(LINES.idle);
  }
}
function rand(arr: readonly string[]): string { return arr[Math.floor(Math.random()*arr.length)]; }

export const MARI = {
  name: MARI_NAME,
  images: MARI_IMAGES,
  pathOf: (exp: MariExpression) => MARI_IMAGES[exp],
  face: pickMariFace,
  say: getMariLine,
};
export default MARI;
