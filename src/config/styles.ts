export const STYLE_OPTIONS: string[] = [
  "J-Pop","Anison(cute)","Anison(cool)","City Pop","EDM","Rock","Metal",
  "Idol","Denpa","Lo-fi","Jazz","Halloween"
];

export const KUSE_OPTIONS = [
  { id:"none"  as const, label:"-",        description:"通常のバランスで提案します。" },
  { id:"mod"   as const, label:"転調大好き", description:"部分転調/モーダルインターチェンジ/セカンダリを強めに提案。" },
  { id:"aug"   as const, label:"aug狂い",   description:"音楽的に破綻しない範囲でaugを積極的に使用。" },
  { id:"canon" as const, label:"カノンの使徒", description:"基本的にカノン（派生含む）から選びます。" },
];
