type Params = { suggestions: number; modeId: "none"|"mod"|"aug"|"canon" };
export function getMascot(p: Params){
  let img = "/mascot/normal.png";
  let text = "今日もがんばっていこう！";
  if (p.suggestions === 0) { img="/mascot/sad.png"; text="うーん…いまは良い候補が出せないみたい。"; }
  else if (p.modeId === "mod") { img="/mascot/idea.png"; text="転調で彩りを足してみよっか！"; }
  else if (p.modeId === "aug") { img="/mascot/sweat.png"; text="augをキレイに効かせるポイント、狙っていこう！"; }
  else if (p.modeId === "canon") { img="/mascot/smile.png"; text="カノン軸で映えを作ろ～！"; }

  return { name:"マリ", img, text };
}
