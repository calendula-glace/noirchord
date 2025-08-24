import type { ChordToken, Settings, Candidate, LogEntry } from './types'
import { diatonicRoman } from './Roman'

function classifyTD(roman:string){
  const base = roman.split('/')[0].replace(/maj7|m7|7|6|add9|11|13|sus[24]|°|dim|aug|\+|♭5|b5/g,'')
  const T = new Set(['I','i','iii','III','vi','VI'])
  const SD = new Set(['ii','ii°','iv','IV'])
  const D = new Set(['V','v','vii°','VII'])
  if (T.has(base)) return 'T'
  if (SD.has(base)) return 'SD'
  if (D.has(base)) return 'D'
  return '?'
}

function moodBias(mood: Settings['mood']){
  const bias: Record<string, number> = {}
  if (mood==='-') return bias
  if (mood==='おしゃれ'){ bias['ii']=0.6; bias['IV']=0.4 }
  if (mood==='感動的'){ bias['vi']=0.6; bias['IV']=0.5 }
  if (mood==='淡泊'){ bias['I']=0.7 }
  if (mood==='悲壮'){ bias['iv']=0.6; bias['bVI']=0.5 }
  if (mood==='楽しい'){ bias['I']=0.6; bias['IV']=0.5; bias['V']=0.4 }
  if (mood==='怪しい'){ bias['bII']=0.7; bias['bVI']=0.6 }
  return bias
}

export function predictNext(settings: Settings, log: LogEntry[]): Candidate[]{
  const diat = diatonicRoman(settings.key)
  const prev = log.length? log[log.length-1].t : 'I'
  const bar = settings.sectionCtx.barIndex
  const lastBar = settings.sectionCtx.phraseLen
  const out: Record<string, {score:number; badges:string[]}> = {}
  const add = (t:ChordToken, s:number, badge?:string)=>{
    if (!out[t]) out[t] = { score:0, badges:[] }
    out[t].score += s
    if (badge) out[t].badges.push(badge)
  }
  if (prev==='I'){ add('vi', 1.2); add('IV', 1.0); add('V', .8) }
  if (/^V/.test(prev)){ add('I', 1.5, '解決'); add('vi', 0.6) }
  if (prev==='vi'){ add('IV', 1.1); add('ii', .8) }
  if (prev==='IV'){ add('V', 1.2, 'DM'); add('I', .9) }
  if (prev==='ii'){ add('V', 1.2, 'DM') }
  if (bar===lastBar-1) add('V', 1.3, 'DM')
  if (bar===lastBar) add('I', 1.6, '解決')
  ;['bVI','bVII','bIII','iv'].forEach((b,i)=> add(b,0.25-i*0.02,'借用'))
  const mb = moodBias(settings.mood); for (const k in mb) add(k, mb[k])
  settings.styles.forEach(s=>{ if (s.includes('Jazz')) add('ii', .2)})
  const items = Object.entries(out).map(([k,v])=>{
    const tdPrev = classifyTD(prev); const tdNext = classifyTD(k)
    const reason = `${Math.min(bar+1,lastBar)}小節目：${tdPrev}→${tdNext}`
    return { token:k, reason, badges: Array.from(new Set(v.badges)) } as Candidate
  })
  items.sort((a,b)=> (out[b.token].score - out[a.token].score))
  return items.slice(0,8)
}
