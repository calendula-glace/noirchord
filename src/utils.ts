import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
export function lzCompress(obj:any){ return compressToEncodedURIComponent(JSON.stringify(obj)) }
export function lzDecompress(s:string){ const j = decompressFromEncodedURIComponent(s); return j ? JSON.parse(j) : null }
