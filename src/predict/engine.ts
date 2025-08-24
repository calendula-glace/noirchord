import { ChordSpec, LogItem } from "../types";
import { diatonic, labelOf } from "../utils/music";

type PredictArgs = { key: string; log: LogItem[]; styles: string[]; modeId: "none"|"mod"|"aug"|"canon" };
type Suggestion = { title:string; spec:ChordSpec; why:string[] };

export function predict(args: PredictArgs): Suggestion[] {
  const d = diatonic(args.key).map(x=>x.spec);
  const I=d[0], ii=d[1], iii=d[2], IV=d[3], V=d[4], vi=d[5];

  const last = args.log.at(-1)?.spec ?? I;

  const isT =(s:ChordSpec)=> sameRoot(s,I) || sameRoot(s,vi) || (s.mods.has("maj7") && sameRoot(s,I));
  const isD =(s:ChordSpec)=> sameRoot(s,V);
  const isSD=(s:ChordSpec)=> sameRoot(s,IV) || sameRoot(s,ii);

  let base: Suggestion[] = [
    mk("おすすめ1", nextFrom(last, {I,ii,IV,V,vi})),
    mk("おすすめ2", nextFrom(last, {I,ii,IV,V,vi}, true)),
  ].filter(Boolean) as Suggestion[];

  if (args.modeId === "canon") {
    const canon = [I,V,vi,IV].map((s,i)=>({ title:`カノン${i+1}`, spec:s, why:[move(last,s)] }));
    return pad(uniqBy([...canon, ...base], s=>labelOf(s.spec)));
  }
  if (args.modeId === "aug") {
    const a = cloneWithMod(V,"aug"); a.why.push("DM");
    const b = cloneWithMod(I,"aug");
    return pad(uniqBy([a,b,...base], s=>labelOf(s.spec)));
  }
  if (args.modeId === "mod") {
    const secV = cloneAsDominant(vi); secV.why.push("DM");
    const modal = cloneWithBorrow(IV,"借用");
    return pad(uniqBy([secV, modal, ...base], s=>labelOf(s.spec)));
  }

  return pad(uniqBy(base, s=>labelOf(s.spec)));

  // ---- helpers ----
  function sameRoot(a:ChordSpec, b:ChordSpec){ return a.root===b.root && a.minor===b.minor; }
  function mk(title:string, spec:ChordSpec|null): Suggestion|null {
    if (!spec) return null;
    return { title, spec, why:[ move(last,spec) ] };
  }
  function move(a:ChordSpec,b:ChordSpec){
    const f = (x:ChordSpec)=> isT(x)?"T":isD(x)?"D":isSD(x)?"SD":"?";
    return `${f(a)}→${f(b)}`;
  }
  function nextFrom(prev:ChordSpec, pool:any, alternate=false): ChordSpec|null {
    const pick = (arr:ChordSpec[]) => arr[alternate?1:0] ?? arr[0];
    if (isT(prev))  return pick([IV,V,ii,vi]);
    if (isSD(prev)) return pick([V,I,vi]);
    if (isD(prev))  return pick([I,vi,IV]);
    return I;
  }
  function cloneWithMod(base:ChordSpec, mod:string): Suggestion {
    const s:ChordSpec = { ...base, mods:new Set(base.mods) };
    s.mods.add(mod);
    return { title:`${labelOf(base)}→${mod}`, spec:s, why:[move(last,s)] };
  }
  function cloneAsDominant(to:ChordSpec): Suggestion {
    const root = (to.root + 7) % 12;
    const s:ChordSpec = { root, minor:false, mods:new Set(["7"]), bass:null };
    return { title:`SecV→${labelOf(to)}`, spec:s, why:["DM"] };
  }
  function cloneWithBorrow(base:ChordSpec, tag:string): Suggestion {
    if (base.minor) return { title:`借用`, spec:base, why:[tag] };
    const s:ChordSpec = { ...base, minor:true, mods:new Set(base.mods) };
    return { title:`借用`, spec:s, why:[tag] };
  }
  function uniqBy<T>(arr:T[], key:(x:T)=>string){ const seen=new Set<string>(); return arr.filter(x=>{const k=key(x); if(seen.has(k)) return false; seen.add(k); return true;}); }
  function pad(list: Suggestion[]): Suggestion[] {
    if (list.length >= 6) return list.slice(0,6);
    const pool=[I,ii,iii,IV,V,vi];
    for(const s of pool){
      if (list.length >= 6) break;
      const key = labelOf(s);
      if (!list.some(x=>labelOf(x.spec)===key)) {
        list.push({ title:`おすすめ${list.length+1}`, spec:s, why:[move(last,s)] });
      }
    }
    return list;
  }
}
