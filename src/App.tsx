import React, { useEffect, useMemo, useRef, useState } from "react";
import "./content.css";
import { getMascot, type MariContext } from "./mascot/mari";
import { ChordSpec, LogItem, Settings, Shape, Tension } from "./types";
import { PC, diatonic, labelOf, noteToIdx, reviveLog, normalizeMods } from "./utils/music";
import { audio } from "./audio";
import { STYLE_OPTIONS, KUSE_OPTIONS } from "./config/styles";
import { predict } from "./predict/engine";

/* ====== minimal css injection (fail-safe) ====== */
const injectCSS = () => {
  if (document.getElementById("noir-failsafe")) return;
  const css = `
  :root{--bg:#0e1116;--panel:#0f1724;--bd:#24324b;--fg:#e9eef8;--acc:#6a8cff}
  body{margin:0;background:var(--bg);color:var(--fg);font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,"Noto Sans JP","Hiragino Kaku Gothic ProN",Meiryo,sans-serif}
  .wrap{padding:10px 12px}
  header{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
  .btn{background:#1b2432;border:1px solid var(--bd);color:var(--fg);border-radius:10px;padding:8px 12px;cursor:pointer}
  .btn:hover{background:#223049}
  .btn.play{background:#1f7a2d;border-color:#2aa146;color:#eaffea;width:40px;height:40px}
  .btn.stop{background:#b31d1d;border-color:#e04545;color:#ffefef;width:40px;height:40px}
  .select{height:38px;padding:0 10px;border-radius:10px;background:#121a26;border:1px solid var(--bd);color:var(--fg)}
  .panel{background:var(--panel);border:1px solid var(--bd);border-radius:12px;padding:10px}
  .title{font-weight:700;margin-bottom:6px}
  .flex{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .log{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 10px}
  .chip{padding:6px 10px;background:#111827;border:1px solid var(--bd);border-radius:8px;cursor:pointer}
  .chip.sel{background:#1d2d4b;border-color:var(--acc);box-shadow:0 0 0 2px rgba(106,140,255,.35) inset}
  .bar{opacity:.65;padding:0 4px}
  .pills{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}
  .pill{background:#1b2332;border:1px solid var(--bd);padding:6px 10px;border-radius:999px;cursor:pointer}
  .gridTop{display:grid;grid-template-columns:1.3fr 1fr 1fr 1.1fr 0.9fr;gap:12px;margin:10px 0}
  .diaGrid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}
  .diaGrid .btn{min-height:44px;font-size:1.05rem}
  .stylesGrid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
  .sharebar{position:fixed;right:10px;top:8px;display:flex;gap:8px;z-index:10}
  .sharebar .btn{width:42px;height:36px;display:flex;align-items:center;justify-content:center}
  .cards{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}
  .card{background:var(--panel);border:1px solid #27334d;border-radius:10px;padding:10px}
  .mascot{display:flex;gap:12px;align-items:flex-start;margin-top:14px}
  .bubble{background:#0f1828;border:1px solid var(--bd);border-radius:10px;padding:10px 12px;max-width:680px;min-height:128px;display:flex;flex-direction:column;justify-content:center}
  .name{font-weight:800;font-size:18px;margin-bottom:4px}
  `;
  const s = document.createElement("style"); s.id="noir-failsafe"; s.textContent = css; document.head.appendChild(s);
};

const DEFAULT: Settings = { key:"C", bpm:120, unit:"1bar", octave:"normal" };
const T_GROUP:Tension[]=["maj7","7","6","add9","9","b9","#9","11","b11","#11","13","b13","#13"];
const S_GROUP:Shape[]  =["sus2","sus4","dim","aug","b5"];

const SECTIONS = ["Verse","Pre","Cho","D"] as const;
const MOODS = ["-","おしゃれ","感動的","淡泊","悲壮","楽しい","怪しい"] as const;

const midiToHz = (m:number)=> 440 * Math.pow(2,(m-69)/12);

/** コード → 周波数配列（bass + 上もの） */
function freqsFor(spec: ChordSpec, octave: "normal" | "high"): number[] {
  const base = (octave === "high" ? 60 : 48); // C4 / C3
  const rootMidi = base + spec.root;

  const iv = new Set<number>();
  // 形状優先
  if (spec.mods.has("sus2")) { iv.add(0); iv.add(2); iv.add(7); }
  else if (spec.mods.has("sus4")) { iv.add(0); iv.add(5); iv.add(7); }
  else if (spec.mods.has("dim")) { iv.add(0); iv.add(3); iv.add(6); iv.add(9); } // 4和音（減七）
  else {
    const third = spec.minor ? 3 : 4;
    let fifth = 7; if (spec.mods.has("b5")) fifth=6; if (spec.mods.has("aug")) fifth=8;
    iv.add(0); iv.add(third); iv.add(fifth);
  }
  const ensure7 = ()=>{ if (![10,11].some(v=>iv.has(v))) iv.add(10); };
  if (spec.mods.has("maj7")) iv.add(11);
  if (spec.mods.has("7"))    iv.add(10);
  if (spec.mods.has("6"))    iv.add(9);

  if (spec.mods.has("add9")) iv.add(14);
  if (spec.mods.has("9"))  { ensure7(); iv.add(14); }
  if (spec.mods.has("b9")) { ensure7(); iv.add(13); }
  if (spec.mods.has("#9")) { ensure7(); iv.add(15); }

  if (spec.mods.has("11"))  { ensure7(); iv.add(17); }
  if (spec.mods.has("b11")) { ensure7(); iv.add(16); }
  if (spec.mods.has("#11")) { ensure7(); iv.add(18); }

  if (spec.mods.has("13"))  { ensure7(); iv.add(21); }
  if (spec.mods.has("b13")) { ensure7(); iv.add(20); }
  if (spec.mods.has("#13")) { ensure7(); iv.add(22); }

  const mids = [...iv].sort((a,b)=>a-b).map(x=>rootMidi+x);
  if (spec.bass!=null) mids.unshift((octave==="high"?48:36)+spec.bass);
  return mids.map(midiToHz);
}

/** 現在の小節位置（0 または 0.5） */
const accPos = (log:LogItem[]) => {
  let acc=0; for(const li of log){ acc += li.length==="1bar"?1:0.5; if(acc>=1) acc-=1; }
  return acc;
};

type Cand = { title:string; spec:ChordSpec; why:string[] };

export default function App(){
  injectCSS();

  const [settings,setSettings]=useState<Settings>(()=>{ try{const s=localStorage.getItem("noir-fs-settings"); return s?JSON.parse(s):DEFAULT;}catch{return DEFAULT;}});
  const [log,setLog]=useState<LogItem[]>(()=>{ try{const s=localStorage.getItem("noir-fs-log"); return s?reviveLog(JSON.parse(s)):[];}catch{return [];} });
  const [editMode,setEditMode]=useState(false);
  const [sel,setSel]==useState<number|null>(null);
  const [showOn,setShowOn]=useState(false);

  const [styles,setStyles]=useState<string[]>(["J-Pop","Anison(cute)"]);
  const [kuse,setKuse]=useState<"none"|"mod"|"aug"|"canon">("none");

  // ★ 新規：セクション＆ムード（ローカルに保持）
  const [section,setSection]=useState<typeof SECTIONS[number]>(()=> (localStorage.getItem("noir-fs-section") as any) || "Verse");
  const [mood,setMood]=useState<typeof MOODS[number]>(()=> (localStorage.getItem("noir-fs-mood") as any) || "-");

  // === マスコット：イベント駆動の表情切替 ===
  const [mariCtx, setMariCtx] = useState<MariContext>({ event: "idle" });
  const mark = (event: MariContext["event"], extra?: Partial<MariContext>) =>
    setMariCtx(prev => ({ ...prev, ...extra, event }));
  const mascot = useMemo(() => getMascot(mariCtx), [JSON.stringify(mariCtx)]);

  useEffect(()=>localStorage.setItem("noir-fs-settings",JSON.stringify(settings)),[settings]);
  useEffect(()=>{
    const serial = log.map(li=>({length:li.length,spec:{root:li.spec.root,minor:li.spec.minor,mods:Array.from(li.spec.mods),bass:li.spec.bass}}));
    localStorage.setItem("noir-fs-log",JSON.stringify(serial));
  },[log]);
  useEffect(()=>localStorage.setItem("noir-fs-section", section),[section]);
  useEffect(()=>localStorage.setItem("noir-fs-mood", mood),[mood]);

  const dia = useMemo(()=>diatonic(settings.key),[settings.key]);
  const cands:Cand[] = useMemo(()=>predict({ key:settings.key, log, styles, modeId:kuse }),[settings.key,log,styles,kuse]);

  /* ====== audio ====== */
  const preview = (s: ChordSpec) => { audio.playChord(freqsFor(s, settings.octave), 0.5); };

  /* ====== add / replace ====== */
  const addOrReplace = (spec:ChordSpec, silent=false) => {
    const wasEdit = (editMode && sel!=null);
    if (wasEdit) {
      setLog(prev => { const n=[...prev]; n[sel!] ={...n[sel!],spec:{...spec,mods:new Set(spec.mods)}}; return n; });
      if(!silent) preview(spec);
      mark("modified-chord", { lastChordLabel: labelOf(spec), predictedLabel: labelOf(spec) });
      return;
    }
    const curAcc = accPos(log);
    if (settings.unit==="1bar" && curAcc===0.5) {
      const a:LogItem = { spec:{...spec,mods:new Set(spec.mods)}, length:"1/2bar" };
      const b:LogItem = { spec:{...spec,mods:new Set(spec.mods)}, length:"1/2bar" };
      setLog(p=>[...p,a,b]); if(!silent) preview(spec);
      mark("added-chord", { lastChordLabel: labelOf(spec) });
      return;
    }
    const li:LogItem = { spec:{...spec,mods:new Set(spec.mods)}, length:settings.unit };
    setLog(p=>[...p,li]); if(!silent) preview(spec);
    mark("added-chord", { lastChordLabel: labelOf(spec) });
  };

  /* ====== transforms（直前のコード変更） ====== */
  const apply = (fn:(s:ChordSpec)=>void) => {
    if (sel==null && !log.length) return;
    const idx = sel ?? (log.length-1);
    const before = (sel!=null? log[sel].spec : log[log.length-1]?.spec) || dia[0].spec;
    setLog(prev=>{
      const n=[...prev];
      const s={...n[idx].spec,mods:new Set(n[idx].spec.mods)};
      normalizeMods(s); fn(s); n[idx]={...n[idx],spec:s}; return n;
    });
    const s2={...before,mods:new Set(before.mods)}; normalizeMods(s2); fn(s2); preview(s2);
    try {
      mark("modified-chord", { lastChordLabel: labelOf(before), predictedLabel: labelOf(s2) });
    } catch {}
  };

  // ★ メジャー/マイナー切替：sus2/sus4/dim/aug の時は無効
  const toggleMajMin = () =>
    apply(s => {
      if (s.mods.has("sus2") || s.mods.has("sus4") || s.mods.has("dim") || s.mods.has("aug")) return;
      s.minor = !s.minor;
    });

  // ★ テンション付与：dim/aug の時は無効（付けない）
  const setTension = (t: Tension) =>
    apply(s => {
      if (s.mods.has("dim") || s.mods.has("aug")) return;
      ["maj7","7","6","add9","9","b9","#9","11","b11","#11","13","b13","#13"]
        .forEach(x => s.mods.delete(x as any));
      s.mods.add(t);
    });

  // ★ 和音変形：dim/aug 選択時はテンションを全除去し minor=false に
  const setShape = (m: Shape) =>
    apply(s => {
      ["sus2","sus4","dim","aug","b5"].forEach(x => s.mods.delete(x as any));
      s.mods.add(m);
      if (m === "dim" || m === "aug") {
        ["maj7","7","6","add9","9","b9","#9","11","b11","#11","13","b13","#13"]
          .forEach(x => s.mods.delete(x as any));
        s.minor = false;
      }
    });

  // ★ 戻す：基本トライアドへ（dim/aug/b5 の場合もメジャートライアドへ、オンコード解除）
  const resetTriad = () =>
    apply(s => {
      const odd = s.mods.has("dim") || s.mods.has("aug") || s.mods.has("b5");
      ["maj7","7","6","add9","9","b9","#9","11","b11","#11","13","b13","#13","sus2","sus4","dim","aug","b5"].forEach(x=>s.mods.delete(x as any));
      if (odd) s.minor = false;
      s.bass = null;
    });

  /* ====== share/x ====== */
  const textOut=()=>{
    let s="",acc=0;
    log.forEach((li,i)=>{
      if(acc===0 && i!==0) s+="| ";
      s+=labelOf(li.spec)+" ";
      acc+=li.length==="1bar"?1:0.5; if(acc>=1) acc-=1;
    });
    return s.trim();
  };
  const copyText=async()=>{
    const t=textOut();
    try{ await navigator.clipboard.writeText(t); alert("コピーしました"); }
    catch{ const ta=document.createElement("textarea"); ta.value=t; document.body.appendChild(ta);
           ta.select(); document.execCommand("copy"); document.body.removeChild(ta); alert("コピーしました"); }
    mark("export");
  };
  const shareLink=()=>{ navigator.clipboard.writeText(location.href); alert("ページのURLをコピーしました"); mark("share"); };
  const shareX=()=>{ const text=`NoirChordでコード進行を作成したよ！\n${textOut()}\n${location.origin}${location.pathname}`;
                     window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,"_blank");
                     mark("share"); };

  /* ====== transport ====== */
  const playRef=useRef(false);
  const stop =()=>{ playRef.current=false; audio.stop(); mark("stop"); };
  const play =async()=>{
    if(!log.length) return;
    stop(); playRef.current=true; mark("play");
    const beat=60/settings.bpm;
    for(let i=0;i<log.length && playRef.current;i++){
      const li=log[i];
      const dur=(li.length==="1bar"?4:2)*beat;
      audio.playChord(freqsFor(li.spec,settings.octave), dur);
      await new Promise(r=>setTimeout(r,dur*1000));
    }
  };

  /* ====== custom input ====== */
  const onCustomAdd=()=>{
    const el=document.getElementById("custom") as HTMLInputElement;
    const v=(el?.value||"").trim(); if(!v) return;
    const m=v.replace(/♭/g,"b").match(/^([A-Ga-g])([+-])?(m)?$/);
    if(!m){ alert("A / Am / A+ / A- / A+m / A-m の形式で入力してください。"); return; }
    const base=m[1].toUpperCase(); const sign=m[2]==="+"?"#":m[2]==="-"?"b":""; const minor=!!m[3];
    const spec:ChordSpec={ root:noteToIdx(base+sign), minor, mods:new Set(), bass:null };
    addOrReplace(spec);
    el.value="";
  };

  return (
    <div className="wrap">
      {/* 右上：共有/X */}
      <div className="sharebar">
        <button className="btn" title="共有リンク" onClick={shareLink}>🔗</button>
        <button className="btn" title="Xにポスト" onClick={shareX}>𝕏</button>
      </div>

      <header>
        <div className="flex">
          <div style={{fontWeight:800}}>NoirChord</div>
          <select className="select" value={settings.bpm} onChange={e=>setSettings(s=>({...s,bpm:parseInt(e.target.value)||120}))}>
            {[80,100,110,120,130,140,150,160,180,200].map(v=><option key={v} value={v}>{v} BPM</option>)}
          </select>
          <select className="select" value={settings.octave} onChange={e=>setSettings(s=>({...s,octave:e.target.value as any}))}>
            <option value="normal">普通</option><option value="high">高い</option>
          </select>
          <button className="btn play" onClick={play}>▶</button>
          <button className="btn stop" onClick={stop}>■</button>
          <button className="btn" onClick={copyText}>テキスト出力</button>
          <button className="btn" onClick={()=>{ if(confirm("ログをクリアします。")){ setLog([]); setSel(null);} }}>リセット</button>
        </div>
        <div/>
      </header>

      {/* ログ */}
      <div className="panel">
        <div className="title">ログ</div>
        <div className="log">
          {(()=>{
            const arr:JSX.Element[]=[]; let acc=0;
            log.forEach((li,i)=>{
              if(acc===0 && i!==0) arr.push(<span key={"bar"+i} className="bar">|</span>);
              arr.push(
                <span
                  key={"c"+i}
                  className={"chip "+(editMode&&sel===i?"sel":"")}
                  onClick={()=>{ if(editMode){ setSel(sel===i?null:i); } }}
                >
                  {labelOf(li.spec)}
                </span>
              );
              acc += li.length==="1bar"?1:0.5; if(acc>=1) acc-=1;
            });
            return arr.length?arr:<span style={{opacity:.65}}>（ここにコードが並びます）</span>;
          })()}
        </div>
      </div>

      {/* 直前のコード変更 */}
      <div className="pills">
        {T_GROUP.map(t=><span key={t} className="pill" onClick={()=>setTension(t)}>{t}</span>)}
        <span style={{width:6}}/>
        {S_GROUP.map(m=><span key={m} className="pill" onClick={()=>setShape(m)}>{m}</span>)}
        <span style={{width:6}}/>
        <span className="pill" onClick={()=>{ setShowOn(v=>{ const nv=!v; if(nv) mark("onchord-start"); return nv; }); }}>オンコード</span>
        <span className="pill" onClick={toggleMajMin}>メジャー/マイナー切替</span>
        <span className="pill" onClick={resetTriad}>戻す</span>
        <label className="pill" style={{cursor:"pointer"}}>
          <input type="checkbox" onChange={e=>{ setEditMode(e.target.checked); if(!e.target.checked) setSel(null); }}/> 指定変更
        </label>
      </div>
      {showOn && (
        <div className="pills">
          {PC.map(p=><span key={p} className="pill" onClick={()=>apply(s=>{ s.bass=noteToIdx(p); mark("onchord-apply",{ predictedLabel:p }); })}>{p}</span>)}
          <span className="pill" onClick={()=>apply(s=>{ s.bass=null; })}>解除</span>
        </div>
      )}

      {/* 上段 5カラム */}
      <div className="gridTop">
        <div className="panel">
          <div className="title">コード選択</div>
          <div className="flex" style={{marginBottom:6}}>
            <label style={{opacity:.85}}>Key：</label>
            <select className="select" value={settings.key} onChange={e=>{ const k=e.target.value; setSettings(s=>({...s,key:k})); mark("picked-key",{ sectionLabel:k }); }}>
              {["C","G","F","D","A","E","B","F#","Bb","Eb","Ab","Db"].map(k=><option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="flex" style={{marginBottom:6}}>
            <label><input type="radio" name="u" defaultChecked onChange={()=>setSettings(s=>({...s,unit:"1bar"}))}/> 1小節</label>
            <label><input type="radio" name="u" onChange={()=>setSettings(s=>({...s,unit:"1/2bar"}))}/> 1/2小節</label>
          </div>
          <div className="diaGrid">
            {dia.map(({label,spec})=><button key={label} className="btn" onClick={()=>addOrReplace(spec)}>{label}</button>)}
          </div>
          <div className="flex" style={{marginTop:8}}>
            <input id="custom" className="select" placeholder="カスタム: A / Am / A+ / A- / A+m / A-m"/>
            <button className="btn" onClick={()=>{ onCustomAdd(); }}>{`追加`}</button>
          </div>
          <div style={{opacity:.8,fontSize:13,marginTop:6}}>
            例: A+→A#、G-→Gb、E+→F、F-→E、B+→C、C-→B
          </div>
        </div>

        <div className="panel">
          <div className="title">一括入力（4）</div>
          <div className="flex" style={{flexDirection:"column",alignItems:"stretch"}}>
            {[
              ['カノン軸(I-V-vi-IV)',['I','V','vi','IV']],
              ['I-vi-ii-V',['I','vi','ii','V']],
              ['ii-V-I-vi',['ii','V','I','vi']],
              ['I-IV-V-IV',['I','IV','V','IV']],
              ['I-V-IV-V',['I','V','IV','V']],
              ['50s(I-vi-IV-V)',['I','vi','IV','V']],
              ['ロイヤル(IV-V-iii-vi)',['IV','V','iii','vi']],
              ['Komuro(vi-IV-V-I)',['vi','IV','V','I']],
            ].map(([name,seq]:any)=>(
              <button key={name} className="btn" onClick={()=>{
                (seq as string[]).forEach(rn=>{
                  const d2=diatonic(settings.key);
                  const idx=['I','ii','iii','IV','V','vi','vii'].indexOf(rn);
                  const sp= idx>=0? d2[idx].spec : d2[0].spec;
                  addOrReplace(sp,true);
                });
                mark("batch-insert");
              }}>{name}</button>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="title">一括入力（8）</div>
          <div className="flex" style={{flexDirection:"column",alignItems:"stretch"}}>
            {[
              ['カノン完全',['I','V','vi','iii','IV','I','IV','V']],
              ['循環進行(iii→)',['iii','vi','ii','V','I','IV','ii','V']],
              ['ロイヤル拡張',['IV','V','iii','vi','IV','V','I','I']],
              ['バラード系',['I','V','vi','IV','ii','V','iii','vi']],
            ].map(([name,seq]:any)=>(
              <button key={name} className="btn" onClick={()=>{
                (seq as string[]).forEach(rn=>{
                  const d2=diatonic(settings.key);
                  const idx=['I','ii','iii','IV','V','vi','vii'].indexOf(rn);
                  const sp= idx>=0? d2[idx].spec : d2[0].spec;
                  addOrReplace(sp,true);
                });
                mark("batch-insert");
              }}>{name}</button>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="title">スタイル</div>

          {/* ★ 追加：セクション＆ムードのプルダウン（このブロックに統合） */}
          <div className="flex" style={{marginBottom:8}}>
            <label>セクション：
              <select className="select" value={section} onChange={e=>setSection(e.target.value as any)}>
                {SECTIONS.map(s=> <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label>ムード：
              <select className="select" value={mood} onChange={e=>{ const v=e.target.value as any; setMood(v); mark("mood-changed",{ moodName:v }); }}>
                {MOODS.map(m=> <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
          </div>

          <div className="stylesGrid">
            {STYLE_OPTIONS.map(id=>{
              const checked = styles.includes(id);
              return (
                <label key={id}>
                  <input type="checkbox" checked={checked}
                    onChange={e=>{
                      const next = e.target.checked ? [...new Set([...styles,id])] : styles.filter(x=>x!==id);
                      setStyles(next);
                      mark("style-changed", { styleNames: next });
                    }}/> {id}
                </label>
              );
            })}
          </div>
        </div>

        <div className="panel">
          <div className="title">くせつよモード</div>
          {KUSE_OPTIONS.map(k=>(
            <label key={k.id} style={{display:"block",padding:"2px 0"}}>
              <input type="radio" name="kuse" checked={kuse===k.id}
                onChange={()=>{ setKuse(k.id); /* ここは mood-changed ではなく style 系に含めない */ }} /> {k.label}
            </label>
          ))}
          <div style={{opacity:.8,marginTop:6}}>説明：{KUSE_OPTIONS.find(x=>x.id===kuse)?.description}</div>
        </div>
      </div>

      {/* おすすめ */}
      <div className="cards">
        {cands.map((c,i)=>(
          <div className="card" key={i}>
            <div style={{fontWeight:700,marginBottom:6}}>{c.title}</div>
            <div style={{fontSize:18,marginBottom:6}}>{labelOf(c.spec)}</div>
            <div className="flex" style={{opacity:.85}}>
              {c.why.map((w,j)=><span key={j} className="pill">{w}</span>)}
            </div>
            <div style={{marginTop:8}}>
              <button className="btn" onClick={()=>{
                addOrReplace(c.spec);
                mark("predicted", {
                  lastChordLabel: log.length ? labelOf(log[log.length - 1].spec) : "",
                  predictedLabel: labelOf(c.spec),
                  tags: c.why,
                });
              }}>挿入</button>
            </div>
          </div>
        ))}
      </div>

      {/* マスコット */}
      <div className="mascot">
        <img
            key={mascot.expression}
            src={(mascot as any).image || (mascot as any).src || (mascot as any).img}
            alt="マリ"
            style={{ width: 128, height: 128, objectFit: "cover", borderRadius: 12 }}
            onError={(e) => {
                console.warn("Mascot image failed:", (e.target as HTMLImageElement).src);
            }}
        />
        <div className="bubble">
          <div className="name">マリ</div>
          <div>{mascot.text}</div>
        </div>
      </div>
    </div>
  );
}
