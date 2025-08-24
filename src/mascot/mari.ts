// src/mascot/mari.ts
// 表情差分の画像URLを document.baseURI で絶対化し、
// さらに各表情ごとにバージョン文字列 (?v=exp) を付与して確実に再読込させます。

export type MariExpression = 'normal' | 'smile' | 'idea' | 'sweat' | 'sad';
export const MARI_NAME = 'マリ';

// 相対→絶対URL
function withBase(relative: string): string {
  const fb = (import.meta as any).env?.BASE_URL ?? '/';
  try {
    return new URL(relative, (typeof document !== 'undefined' && document.baseURI) || fb).toString();
  } catch {
    return `${fb}${relative.replace(/^\/+/, '')}`;
  }
}

// 画像（public/mascot/*.png）に表情別のクエリを付与してキャッシュを分離
function img(exp: MariExpression): string {
  // 例: https://.../noirchord/mascot/smile.png?v=smile
  return `${withBase(`mascot/${exp}.png`)}?v=${exp}`;
}

export const MARI_IMAGES: Record<MariExpression, string> = {
  normal: img('normal'),
  smile : img('smile'),
  idea  : img('idea'),
  sweat : img('sweat'),
  sad   : img('sad'),
};

export type MariContext = {
  event?:
    | 'idle' | 'picked-key' | 'added-chord' | 'modified-chord'
    | 'predicted' | 'play' | 'stop' | 'export' | 'share' | 'error'
    | 'style-changed' | 'mood-changed' | 'onchord-start' | 'onchord-apply'
    | 'batch-insert' | 'preview' | 'predict-fail';
  sectionLabel?: string;
  lastChordLabel?: string;
  predictedLabel?: string;
  tags?: string[];
  styleNames?: string[];
  moodName?: string;
};

function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random()*arr.length)]; }
function any<T>(v?: T|T[]): T|undefined { return Array.isArray(v) ? v[0] : v; }

export function pickMariFace(ctx?: MariContext): MariExpression {
  if (!ctx) return 'normal';
  const has = (k: string) => (ctx.tags || []).some(t => t.includes(k));

  if (ctx.event === 'error' || ctx.event === 'predict-fail') return pick(['sweat','sad']);
  if (has('解決')) return 'smile';
  if (has('転調') || has('借用') || has('DM')) return 'idea';

  switch (ctx.event) {
    case 'picked-key':    return 'idea';
    case 'added-chord':   return pick(['smile','idea']);
    case 'modified-chord':return pick(['idea','smile']);
    case 'predicted':     return pick(['idea','smile']);
    case 'onchord-start': return 'idea';
    case 'onchord-apply': return 'smile';
    case 'play':          return 'smile';
    case 'stop':          return 'normal';
    case 'export':
    case 'share':         return 'smile';
    case 'style-changed':
    case 'mood-changed':  return pick(['idea','smile']);
    default:              return 'normal';
  }
}

const LINES = {
  idle: ['今日も良い進行つくってこー！', '迷ったら王道進行もアリだよ！', '耳が気持ちいい進行、探そ！', 'ちょっとだけ冒険してみない？', 'カノンも良いけどスパイスもね！'],
  'picked-key': (key: string) => [`キー「${key}」了解っ！ダイアトニック出すね！`, `「${key}」でいこう！セクションにも合わせていこー！`],
  'added-chord': (ch: string) => [`「${ch}」入れたよ！次はどうする？`, `ナイス！「${ch}」で流れが生きたね！`, `その「${ch}」、良い表情してる！`],
  'modified-chord': (from: string, to: string) => [`「${from}」を「${to}」に変えたよ！`, `うんうん、「${to}」の方が今はしっくりかも！`],
  predicted: (from?: string, to?: string, tags?: string[]) => {
    const tagNote = tags?.length ? `（${tags.join('／')}）` : '';
    return [`「${from ?? '？'}→${to ?? '？'}」はイイ感じ！${tagNote}`, `この流れ、耳馴染みよし！「${from ?? '？'}→${to ?? '？'}」${tagNote}`, `行っちゃお！「${from ?? '？'}→${to ?? '？'}」${tagNote}`];
  },
  'predict-fail': ['うーん…今はちょっと難しいかも。もう1コード欲しいな！', '今回は保留にしよっか！別アイデアで攻めよ！'],
  play: ['いくよー！カウント入るね！', '再生スタート！ノってこ！'],
  stop: ['ストップ！次どうする？', '一旦停止〜。修正いってみよ！'],
  export: ['テキスト出力したよ！コピペOK！', '書き出し完了！DAWに貼っちゃお！'],
  share: ['共有リンクできたよ！見てみて！', 'シェア準備OK！お披露目しよ！'],
  error: ['あわわ…エラー出ちゃった。もう一回試してみよ！', 'うぅ…何か引っかかったみたい。直すね！'],
  'style-changed': (name: string) => [`スタイル「${name}」に切り替え！テイスト変わるよ！`, `「${name}」モードへ！進行のクセがちょっと変わるね！`],
  'mood-changed': (name: string) => [`ムード「${name}」了解！空気感を少し寄せるね！`, `「${name}」の雰囲気で提案していくよ！`],
  'onchord-start': ['オンコード選択モードだよ！ベース変えて雰囲気出そ！', 'ルート差し替えいこ！響きがキュッと締まるよ！'],
  'onchord-apply': (to: string) => [`オンコード適用！「${to}」に変えたよ！`, `OK！低音だけ「${to}」で彩ったよ！`],
  'batch-insert': ['一括入力ドン！一気に骨格できちゃった！', 'ズバッと入れたよ！ここから味付けしよ！'],
} as const;

function pickLine(arrOrFn: any, ...args: any[]): string {
  const arr: string[] = Array.isArray(arrOrFn) ? arrOrFn : arrOrFn(...args);
  return pick(arr);
}

export function getMariLine(ctx?: MariContext): string {
  if (!ctx?.event) return pickLine(LINES.idle);
  switch (ctx.event) {
    case 'picked-key':     return pickLine(LINES['picked-key'], ctx.sectionLabel ?? '');
    case 'added-chord':    return pickLine(LINES['added-chord'], ctx.lastChordLabel ?? '');
    case 'modified-chord': return pickLine(LINES['modified-chord'], ctx.lastChordLabel ?? '？', ctx.predictedLabel ?? '？');
    case 'predicted':      return pickLine(LINES['predicted'], ctx.lastChordLabel, ctx.predictedLabel, ctx.tags);
    case 'predict-fail':   return pickLine(LINES['predict-fail']);
    case 'play':           return pickLine(LINES.play);
    case 'stop':           return pickLine(LINES.stop);
    case 'export':         return pickLine(LINES.export);
    case 'share':          return pickLine(LINES.share);
    case 'error':          return pickLine(LINES.error);
    case 'style-changed':  return pickLine(LINES['style-changed'], any(ctx?.styleNames) ?? 'スタイル');
    case 'mood-changed':   return pickLine(LINES['mood-changed'], ctx?.moodName ?? 'ムード');
    case 'onchord-start':  return pickLine(LINES['onchord-start']);
    case 'onchord-apply':  return pickLine(LINES['onchord-apply'], ctx?.predictedLabel ?? 'ベース');
    case 'batch-insert':   return pickLine(LINES['batch-insert']);
    default:               return pickLine(LINES.idle);
  }
}

export type MascotPayload = {
  name: string;
  image: string;  // 互換: src/img と同じ
  src: string;
  img: string;
  line: string;   // 互換: text と同じ
  text: string;
  expression: MariExpression;
};

export function getMascot(ctx?: MariContext): MascotPayload {
  const expression = pickMariFace(ctx);
  const image = MARI_IMAGES[expression];
  const line = getMariLine(ctx);
  return { name: MARI_NAME, image, src: image, img: image, line, text: line, expression };
}

export const MARI = {
  name: MARI_NAME,
  images: MARI_IMAGES,
  pathOf: (exp: MariExpression) => MARI_IMAGES[exp],
  face: pickMariFace,
  say: getMariLine,
  get: getMascot,
};
export default MARI;
