// src/mascot/mari.ts
// BASE_URL対応＋表情ごとキャッシュバスター付与＋スタイル複数読み上げ対応

export type MariExpression = 'normal' | 'smile' | 'idea' | 'sweat' | 'sad';
export const MARI_NAME = 'マリ';

// 相対→絶対URL（GitHub Pagesの /noirchord/ ベースにも対応）
function withBase(relative: string): string {
  const fb = (import.meta as any).env?.BASE_URL ?? '/';
  try {
    return new URL(relative, (typeof document !== 'undefined' && document.baseURI) || fb).toString();
  } catch {
    return `${fb}${relative.replace(/^\/+/, '')}`;
  }
}

// 画像URL（表情名でキャッシュ分離）
function img(exp: MariExpression): string {
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
    | 'predicted' | 'predict-fail'
    | 'play' | 'stop' | 'export' | 'share' | 'error'
    | 'style-changed' | 'mood-changed'
    | 'onchord-start' | 'onchord-apply'
    | 'batch-insert';
  sectionLabel?: string;
  lastChordLabel?: string;
  predictedLabel?: string;
  tags?: string[];         // 例: ["借用","DM","解決","転調: G"]
  styleNames?: string[];   // ★ 選択中スタイルの“全部”を入れてね
  moodName?: string;
};

function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random()*arr.length)]; }

// スタイル名の読み上げ整形（全部言う）
function fmtStyles(names?: string[] | string): { quoted: string; slash: string } {
  const arr = Array.isArray(names) ? names : names ? [names] : [];
  if (!arr.length) return { quoted: '（未選択）', slash: '-' };
  const quoted = arr.map(n => `「${n}」`).join(' ');
  const slash  = arr.join(' / ');
  return { quoted, slash };
}

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
  idle: [
    '今日も良い進行つくってこー！',
    '迷ったら王道進行もアリだよ！',
    '耳が気持ちいい進行、探そ！',
    'ちょっとだけ冒険してみない？',
    'カノンも良いけどスパイスもね！',
  ],
  pickedKey: (key: string) => [
    `キー「${key}」了解っ！ダイアトニック出すね！`,
    `「${key}」でいこう！セクションにも合わせていこー！`,
  ],
  addedChord: (ch: string) => [
    `「${ch}」入れたよ！次はどうする？`,
    `ナイス！「${ch}」で流れが生きたね！`,
    `その「${ch}」、良い表情してる！`,
  ],
  modifiedChord: (from: string, to: string) => [
    `「${from}」を「${to}」に変えたよ！`,
    `うんうん、「${to}」の方が今はしっくりかも！`,
  ],
  predicted: (from?: string, to?: string, tags?: string[]) => {
    const tagNote = tags?.length ? `（${tags.join('／')}）` : '';
    return [
      `「${from ?? '？'}→${to ?? '？'}」はイイ感じ！${tagNote}`,
      `この流れ、耳馴染みよし！「${from ?? '？'}→${to ?? '？'}」${tagNote}`,
      `行っちゃお！「${from ?? '？'}→${to ?? '？'}」${tagNote}`,
    ];
  },
  predictFail: [
    'うーん…今はちょっと難しいかも。もう1コード欲しいな！',
    '今回は保留にしよっか！別アイデアで攻めよ！',
  ],
  play: ['いくよー！カウント入るね！', '再生スタート！ノってこ！'],
  stop: ['ストップ！次どうする？', '一旦停止〜。修正いってみよ！'],
  export: ['テキスト出力したよ！コピペOK！', '書き出し完了！DAWに貼っちゃお！'],
  share: ['共有リンクできたよ！見てみて！', 'シェア準備OK！お披露目しよ！'],
  error: ['あわわ…エラー出ちゃった。もう一回試してみよ！', 'うぅ…何か引っかかったみたい。直すね！'],

  // ★ スタイル複数対応
  styleChanged: (names: string[] | string) => {
    const { quoted, slash } = fmtStyles(names);
    return [
      `スタイル${quoted}に切り替え！テイスト変わるよ！`,
      `${slash} のテイストでいくよ！進行のクセ、ちょっと変化！`,
    ];
  },

  moodChanged: (name: string) => [
    `ムード「${name}」了解！空気感を少し寄せるね！`,
    `「${name}」の雰囲気で提案していくよ！`,
  ],
  onchordStart: ['オンコード選択モードだよ！ベース変えて雰囲気出そ！', 'ルート差し替えいこ！響きがキュッと締まるよ！'],
  onchordApply: (to: string) => [`オンコード適用！「${to}」に変えたよ！`, `OK！低音だけ「${to}」で彩ったよ！`],
  batchInsert: ['一括入力ドン！一気に骨格できちゃった！', 'ズバッと入れたよ！ここから味付けしよ！'],
} as const;

function pickLine(arrOrFn: any, ...args: any[]): string {
  const arr: string[] = Array.isArray(arrOrFn) ? arrOrFn : arrOrFn(...args);
  return pick(arr);
}

export function getMariLine(ctx?: MariContext): string {
  if (!ctx?.event) return pickLine(LINES.idle);
  switch (ctx.event) {
    case 'picked-key':     return pickLine(LINES.pickedKey, ctx.sectionLabel ?? '');
    case 'added-chord':    return pickLine(LINES.addedChord, ctx.lastChordLabel ?? '');
    case 'modified-chord': return pickLine(LINES.modifiedChord, ctx.lastChordLabel ?? '？', ctx.predictedLabel ?? '？');
    case 'predicted':      return pickLine(LINES.predicted, ctx.lastChordLabel, ctx.predictedLabel, ctx.tags);
    case 'predict-fail':   return pickLine(LINES.predictFail);
    case 'play':           return pickLine(LINES.play);
    case 'stop':           return pickLine(LINES.stop);
    case 'export':         return pickLine(LINES.export);
    case 'share':          return pickLine(LINES.share);
    case 'error':          return pickLine(LINES.error);
    case 'style-changed':  return pickLine(LINES.styleChanged, ctx.styleNames ?? []);
    case 'mood-changed':   return pickLine(LINES.moodChanged, ctx.moodName ?? 'ムード');
    case 'onchord-start':  return pickLine(LINES.onchordStart);
    case 'onchord-apply':  return pickLine(LINES.onchordApply, ctx.predictedLabel ?? 'ベース');
    case 'batch-insert':   return pickLine(LINES.batchInsert);
    default:               return pickLine(LINES.idle);
  }
}

export type MascotPayload = {
  name: string;
  image: string;  // 互換フィールド
  src: string;
  img: string;
  line: string;   // 互換フィールド
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
