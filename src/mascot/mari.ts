// src/mascot/mari.ts
// NoirChord マスコット「マリ」表示/セリフユーティリティ
// 画像パスは BASE_URL を用いて GitHub Pages (/noirchord/) でも壊れないように解決します。

export type MariExpression = 'normal' | 'smile' | 'idea' | 'sweat' | 'sad';

export const MARI_NAME = 'マリ';

// Vite がビルド時に /（ローカル）や /noirchord/（Pages）に自動展開
const BASE = (import.meta as any).env?.BASE_URL ?? '/';

// 画像の実体は public/mascot/*.png に配置
export const MARI_IMAGES: Record<MariExpression, string> = {
  normal: `${BASE}mascot/normal.png`,
  smile:  `${BASE}mascot/smile.png`,
  idea:   `${BASE}mascot/idea.png`,
  sweat:  `${BASE}mascot/sweat.png`,
  sad:    `${BASE}mascot/sad.png`,
};

// 使い方に幅を持たせるための型（必要な情報だけ渡してOK）
export type MariContext = {
  event?:
    | 'idle'
    | 'picked-key'
    | 'added-chord'
    | 'modified-chord'
    | 'predicted'
    | 'play'
    | 'stop'
    | 'export'
    | 'share'
    | 'error';
  sectionLabel?: string;           // Verse / Pre / Cho / D など
  lastChordLabel?: string;         // 直前のコード表示用
  predictedLabel?: string;         // 予測コード表示用
  tags?: string[];                 // ["借用","DM","解決","転調: G"] 等
};

// 表情の簡易決定（context が無ければ normal）
export function pickMariFace(ctx?: MariContext): MariExpression {
  if (!ctx) return 'normal';
  switch (ctx.event) {
    case 'picked-key':
      return 'idea';
    case 'added-chord':
    case 'modified-chord':
      return 'smile';
    case 'predicted':
      return 'idea';
    case 'play':
      return 'smile';
    case 'stop':
      return 'normal';
    case 'export':
    case 'share':
      return 'smile';
    case 'error':
      return 'sweat';
    default:
      return 'normal';
  }
}

// セリフ候補（口調は元気なですます調）
const LINES = {
  idle: [
    '今日も良い進行つくってこー！',
    '迷ったら王道進行もアリだよ！',
  ],
  'picked-key': (key: string) => [
    `キー「${key}」了解っ！ダイアトニック出すね！`,
  ],
  'added-chord': (ch: string) => [
    `「${ch}」入れたよ！次はどうする？`,
  ],
  'modified-chord': (from: string, to: string) => [
    `「${from}」を「${to}」に変えたよ！`,
  ],
  predicted: (from?: string, to?: string, tags?: string[]) => [
    `「${from ?? '？'}→${to ?? '？'}」はイイ感じ！${tags && tags.length ? `（${tags.join('／')}）` : ''}`,
  ],
  play: ['いくよー！カウント入るね！'],
  stop: ['ストップ！次どうする？'],
  export: ['テキスト出力してコピペOKだよ！'],
  share: ['共有リンクできたよ！見てみて！'],
  error: ['あわわ…エラー出ちゃった。もう一回試してみよ！'],
} as const;

// セリフを選んで返す
export function getMariLine(ctx?: MariContext): string {
  if (!ctx?.event) return rand(LINES.idle);

  switch (ctx.event) {
    case 'picked-key':
      return rand(LINES['picked-key'](ctx.sectionLabel ?? ''));
    case 'added-chord':
      return rand(LINES['added-chord'](ctx.lastChordLabel ?? ''));
    case 'modified-chord':
      return rand(LINES['modified-chord'](ctx.lastChordLabel ?? '？', ctx.predictedLabel ?? '？'));
    case 'predicted':
      return rand(LINES['predicted'](ctx.lastChordLabel, ctx.predictedLabel, ctx.tags));
    case 'play':
      return rand(LINES.play);
    case 'stop':
      return rand(LINES.stop);
    case 'export':
      return rand(LINES.export);
    case 'share':
      return rand(LINES.share);
    case 'error':
      return rand(LINES.error);
    default:
      return rand(LINES.idle);
  }
}

function rand(arr: readonly string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 既存コードとの互換を高めるための便利エクスポート
export const MARI = {
  name: MARI_NAME,
  images: MARI_IMAGES,
  pathOf: (exp: MariExpression) => MARI_IMAGES[exp],
  face: pickMariFace,
  say: getMariLine,
};

export default MARI;
