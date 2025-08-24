// Roman & key utilities
const MAJOR_SCALE = [0,2,4,5,7,9,11];
const MINOR_SCALE = [0,2,3,5,7,8,10];
const NOTE_INDEX: Record<string, number> = {'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11};

export function keyToPitch(key: string){
  key = key.trim();
  let tonic = key, mode = 'major';
  if (/minor$/i.test(key)){ tonic = key.split(' ')[0]; mode = 'minor' }
  else if (/major$/i.test(key)){ tonic = key.split(' ')[0]; mode = 'major' }
  else if (/m$/.test(key)){ tonic = key.slice(0,-1); mode = 'minor' }
  const base = NOTE_INDEX[tonic] ?? 0;
  const scale = (mode==='minor') ? MINOR_SCALE : MAJOR_SCALE;
  return { base, scale, mode };
}

const ROMANS = ['VII','VI','IV','III','II','I','vii','vi','iv','iii','ii','i'];
function parseRoman(token:string){
  let t = token.trim();
  let slash: string | null = null;
  if (t.includes('/')){ const [a,b] = t.split('/'); t=a; slash=b }
  const roman = ROMANS.find(r=> t.startsWith(r)) || t;
  let qual = t.slice(roman.length);
  const map:any = { 'I':0,'II':1,'III':2,'IV':3,'V':4,'VI':5,'VII':6,'i':0,'ii':1,'iii':2,'iv':3,'v':4,'vi':5,'vii':6 };
  const degree = map[roman] ?? 0;
  const isMinor = roman === roman.toLowerCase();
  const isDim = /°/.test(qual) || /dim/.test(qual);
  const hasFlat5 = /-5|b5|♭5/.test(qual);
  const isAug = /aug|\+/.test(qual);
  const maj7 = /maj7/.test(qual);
  const sev7 = /(^|[^a-zA-Z])7/.test(qual) || /m7/.test(qual);
  return { degree, roman, qual, slash, isMinor, isDim, isAug, hasFlat5, maj7, sev7 };
}

function degreeToSemitone(deg:number, accidental:number, keyInfo:ReturnType<typeof keyToPitch>){
  return (keyInfo.base + keyInfo.scale[deg] + accidental + 12*5);
}

export function chordToNotes(token:string, key: string, octave:'low'|'normal'|'high'){
  if (token.startsWith('RAW:')){
    const name = token.slice(4); // e.g., A#m or Ab
    const root = name.replace('m','').replace('♭','b');
    const minor = /m$/.test(name);
    const steps: Record<string, number> = {
      'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11,
      'E#':5,'B#':0,'Fb':4,'Cb':11
    };
    const base = steps[root] ?? 0;
    const midiRoot = 60 + base;
    const third = midiRoot + (minor?3:4);
    const fifth = midiRoot + 7;
    const octShift = (octave==='low'?-12:(octave==='high'?+12:0));
    const bass = (midiRoot - 24) + octShift;
    const chord = [midiRoot, third, fifth].map(n => n + octShift);
    return { bass, chord };
  }
  const info = keyToPitch(key); const p = parseRoman(token);
  const map:any = { 'I':0,'II':1,'III':2,'IV':3,'V':4,'VI':5,'VII':6,'i':0,'ii':1,'iii':2,'iv':3,'v':4,'vi':5,'vii':6 };
  let bassDeg = p.slash ? (map[p.slash] ?? p.degree) : p.degree;
  const bass = degreeToSemitone(bassDeg, 0, info) + (octave==='low'?-12:(octave==='high'?+12:0)) - 24;
  const root = degreeToSemitone(p.degree, 0, info);
  let third = root + (p.isMinor ? 3 : 4);
  let fifth = root + (p.isAug ? 8 : (p.hasFlat5 || p.isDim ? 6 : 7));
  let notes = [root, third, fifth];
  notes = notes.map(n => n + (octave==='low'?-12:(octave==='high'?+12:0)));
  return { bass, chord: notes };
}

export function romanToChordName(token:string, key:string){
  if (token.startsWith('RAW:')) return token.slice(4);
  const info = keyToPitch(key); const p = parseRoman(token);
  const degSemitone = degreeToSemitone(p.degree, 0, info) % 12;
  const NOTE_NAME = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
  const rootName = NOTE_NAME[(degSemitone+12)%12];
  let name = rootName;
  if (/m/.test(p.roman)) name += 'm';
  if (p.isDim) name += 'dim';
  else if (p.hasFlat5) name += '♭5';
  if (p.maj7) name += 'maj7';
  else if (p.sev7){
    if (p.isMinor) name += 'm7'; else name += '7';
  }
  if (/aug|\+/.test(p.qual)) name += 'aug';
  if (p.slash){
    const map:any = { 'I':0,'II':1,'III':2,'IV':3,'V':4,'VI':5,'VII':6,'i':0,'ii':1,'iii':2,'iv':3,'v':4,'vi':5,'vii':6, 'bII':1,'bIII':3,'bVI':8,'bVII':10 };
    const deg = map[p.slash] ?? 0;
    const bassNote = NOTE_NAME[(degreeToSemitone(deg,0,info)%12+12)%12];
    name += '/' + bassNote;
  }
  return name;
}

export function diatonicRoman(key:string){
  const isMinor = /m(inor)?$/i.test(key) || /[A-G]m$/.test(key);
  return isMinor ? ['i','ii°','III','iv','v','VI','VII'] : ['I','ii','iii','IV','V','vi','vii°'];
}

export function noteNameToDegree(key: string, note: string){
  const steps: Record<string, number> = {'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11};
  const maj = [0,2,4,5,7,9,11];
  const base = steps[key.replace('m','')] ?? 0;
  const modeMinor = /m$/.test(key);
  const scale = modeMinor ? [0,2,3,5,7,8,10] : maj;
  const target = steps[note] ?? 0;
  const rel = ((target - base) % 12 + 12) % 12;
  const romans = ['I','II','III','IV','V','VI','VII'];
  for (let i=0;i<7;i++){ if (scale[i]===rel) return romans[i] }
  if ([1,3,8,10].includes(rel)){
    const map:any = {1:'bII',3:'bIII',8:'bVI',10:'bVII'};
    return map[rel];
  }
  return romans[0];
}
