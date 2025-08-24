// src/mascot/mari.ts
// NoirChord マスコット「マリ」— 表情差分の活用とセリフを強化
// 画像パスは document.baseURI を使って /noirchord/ 配下でも確実に解決。
// App 側の期待に合わせ、image/src/img と line/text をすべて返します。

export type MariExpression = 'normal' | 'smile' | 'idea' | 'sweat' | 'sad';
export const MARI_NAME = 'マリ';

// 相対パス → 絶対URL（<base href="%BASE_URL%"> を活用）
function withBase(relative: string): string {
  const fb = (import.meta as any).env?.BASE_URL ?? '/';
  try {
    return new URL(relative, (typeof document !== 'undefined' && document.baseURI) || fb).toString();
  } catch {
    return `${fb}${relative.replace(/^\/+/, '')}`;
  }
}

// 画像は public/mascot/*.png に配置
export const MARI_IMAGES: Record<MariExpression, string> = {
  normal: withBase('mascot/normal.png'),
  smile : withBase('mascot/smile.png'),
  idea  : withBase('mascot/idea.png'),
  sweat : withBase('mascot/sweat.png'),
  sad   : withBase('mascot/sad.png'),
};

export type MariContext = {
  // 既存イベントはそのまま + 追加イベントも受け付ける（後方互換）
  event?:
    | 'idle' | 'picked-key' | 'added-chord' | 'modified-chord'
    | 'predicted' | 'play' | 'stop' | 'export' | 'share' | 'error'
    // 拡張イベント（任意）
    | 'style-changed' | 'mood-changed' | 'onchord-start' | 'onchord-apply'
    | 'batch-insert' | 'preview' | 'predict-fail';

  // 任意の補助情報
  sectionLabel?: string;       // Verse / Pre / Cho / D など
  lastChordLabel?: string;     // 直前コード
  predictedLabel?: string;     // 予測コード
  tags?: string[];             // ["借用","DM","解決","転調: G"] など
  styleNames?: string[];       // 選択中スタイル
  moodName?: string;           // ムード名
};

// 乱択ユーティリティ
function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function any<T>(v?: T | T[]): T | undefined {
  if (!v) return undefined;
  return Array.isArray(v) ? (v.length ? v[0] : undefined) : v;
}

// 表情の決定（イベント＋タグで差分を活用）
export function pickMariFace(ctx?: MariContext): MariExpression {
  if (!ctx) return 'normal';

  // タグで強い意味があるものを優先
  const has = (k: string) => (ctx.tags || []).some(t => t.includes(k));
  if (ctx.event === 'error' || ctx.event === 'predict-fail') return pick(['sweat','sad']);
  if (has('解決')) return 'smile';
  if (has('転調') || has('借用') || has('DM')) return 'idea';

  // イベント別
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

// セリフ辞書（元気なですます調）— レパートリー増量
const LINES = {
  idle: [
    '今日も良い進行つくってこー！',
    '迷ったら王道進行もアリだよ！',
    '耳が気持ちいい進行、探そ！',
    'ちょっとだけ冒険してみない？',
    'カノンも良いけどスパイスもね！',
  ],
  'picked-key': (key: string) => [
    `キー「${key}」了解っ！ダイアトニック出すね！`,
    `「${key}」でいこう！セクションにも合わせていこー！`,
  ],
  'added-chord': (ch: string) => [
    `「${ch}」入れたよ！次はどうする？`,
    `ナイス！「${ch}」で流れが生きたね！`,
    `その「${ch}」、良い表情してる！`,
  ],
  'modified-chord': (from: string, to: string) => [
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
  'predict-fail': [
    'うーん…今はちょっと難しいかも。もう1コード欲しいな！',
    '今回は保留にしよっか！別アイデアで攻めよ！',
  ],
  play: [
    'いくよー！カウント入るね！',
    '再生スタート！ノってこ！',
  ],
  stop: [
    'ストップ！次どうする？',
    '一旦停止〜。修正いってみよ！',
  ],
  export: [
    'テキスト出力したよ！コピペOK！',
    '書き出し完了！DAWに貼っちゃお！',
  ],
  share: [
    '共有リンクできたよ！見てみて！',
    'シェア準備OK！お披露目しよ！',
  ],
  error: [
    'あわわ…エラー出ちゃった。もう一回試してみよ！',
    'うぅ…何か引っかかったみたい。直すね！',
  ],
  'style-changed': (name: string) => [
    `スタイル「${name}」に切り替え！テイスト変わるよ！`,
    `「${name}」モードへ！進行のクセがちょっと変わるね！`,
  ],
  'mood-changed': (name: string) => [
    `ムード「${name}」了解！空気感を少し寄せるね！`,
    `「${name}」の雰囲気で提案していくよ！`,
  ],
  'onchord-start': [
    'オンコード選択モードだよ！ベース変えて雰囲気出そ！',
    'ルート差し替えいこ！響きがキュッと締まるよ！',
  ],
  'onchord-apply': (to: string) => [
    `オンコード適用！「${to}」に変えたよ！`,
    `OK！低音だけ「${to}」で彩ったよ！`,
  ],
  'batch-insert': [
    '一括入力ドン！一気に骨格できちゃった！',
    'ズバッと入れたよ！ここから味付けしよ！',
  ],
} as const;

function linesFor(ctx?: MariContext): string[] {
  if (!ctx?.event) return LINES.idle;
  switch (ctx.event) {
    case 'picked-key':
      return LINES['picked-key'](ctx.sectionLabel ?? '');
    case 'added-chord':
      return LINES['added-chord'](ctx.lastChordLabel ?? '');
    case 'modified-chord':
      return LINES['modified-chord'](ctx.lastChordLabel ?? '？', ctx.predictedLabel ?? '？');
    case 'predicted':
      return LINES['predicted'](ctx.lastChordLabel, ctx.predictedLabel, ctx.tags);
    case 'predict-fail':
      return LINES['predict-fail'];
    case 'play':
      return LINES.play;
    case 'stop':
      return LINES.stop;
    case 'export':
      return LINES.export;
    case 'share':
      return LINES.share;
    case 'error':
      return LINES.error;
    case 'style-changed':
      return LINES['style-changed'](any(ctx.styleNames) ?? 'スタイル');
    case 'mood-changed':
      return LINES['mood-changed'](ctx.moodName ?? 'ムード');
    case 'onchord-start':
      return LINES['onchord-start'];
    case 'onchord-apply':
      return LINES['onchord-apply'](ctx.predictedLabel ?? 'ベース');
    case 'batch-insert':
      return LINES['batch-insert'];
    default:
      return LINES.idle;
  }
}

export function getMariLine(ctx?: MariContext): string {
  return pick(linesFor(ctx));
}

// App.tsx が参照するエントリ（互換プロパティも提供）
export type MascotPayload = {
  name: string;
  image: string;  // 互換: src/img と同じ
  src: string;    // 互換
  img: string;    // 互換（古い App 用）
  line: string;   // 互換: text と同じ
  text: string;   // 互換
  expression: MariExpression;
};

export function getMascot(ctx?: MariContext): MascotPayload {
  const expression = pickMariFace(ctx);
  const image = MARI_IMAGES[expression];
  const line = getMariLine(ctx);
  return {
    name: MARI_NAME,
    image,
    src: image,
    img: image,
    line,
    text: line,
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
