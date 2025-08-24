// src/mascot/mari.ts
// NoirChord マスコット「マリ」ユーティリティ
// 画像パスは document.baseURI を用いて /noirchord/ 配下でも確実に解決します。
// App.tsx が参照する getMascot() もエクスポートしています。

export type MariExpression = 'normal' | 'smile' | 'idea' | 'sweat' | 'sad';

export const MARI_NAME = 'マリ';

// 相対パスを baseURI から絶対URLに変換（<base href="%BASE_URL%"> を利用）
function withBase(relative: string): string {
  // document.baseURI が存在しないケースはほぼ無いが、念のため import.meta.env.BASE_URL で補完
  const fallbackBase = (import.meta as any).env?.BASE_URL ?? '/';
  try {
    return new URL(relative, (typeof document !== 'undefined' && document.baseURI) || fallbackBase).toString();
  } catch {
    return `${fallbackBase}${relative.replace(/^\/+/, '')}`;
  }
}

// 画像の実体は public/mascot/*.png に配置
export const MARI_IMAGES: Record<MariExpression, string> = {
  normal: withBase('mascot/normal.png'),
  smile:  withBase('mascot/smile.png'),
  idea:   withBase('mascot/idea.png'),
  sweat:  withBase('mascot/sweat.png'),
  sad:    withBase('mascot/sad.png'),
};

// 呼び出し側から渡せる文脈
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
  sectionLabel?: string;    // Verse / Pre / Cho / D など（任意）
  lastChordLabel?: string;  // 直前コードの表示用（任意）
  predictedLabel?: string;  // 予測コードの表示用（任意）
  tags?: string[];          // ["借用","DM","解決","転調: G"] 等（任意）
};

// 表情の決定
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

// 元気なですます調のセリフ
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

// App.tsx が参照する getMascot を提供（image/src, line/text の互換も確保）
export type MascotPayload = {
  name: string;
  image: string;      // 画像URL（互換: src と同じ）
  src: string;        // 画像URL（互換用）
  line: string;       // セリフ（互換: text と同じ）
  text: string;       // セリフ（互換用）
  expression: MariExpression;
};

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

// 既存互換の default export も残す
export const MARI = {
  name: MARI_NAME,
  images: MARI_IMAGES,
  pathOf: (exp: MariExpression) => MARI_IMAGES[exp],
  face: pickMariFace,
  say: getMariLine,
  get: getMascot,
};

export default MARI;
