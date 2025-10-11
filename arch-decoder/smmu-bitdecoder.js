export class BitStructDecoder {
  constructor({ words=null, bytes=null, totalBits, wordBits=64, littleEndianPerWord=true }){
    if(!totalBits) throw new Error('totalBits is required');
    this.totalBits = totalBits;
    this.wordBits  = wordBits;
    this.littleEndianPerWord = littleEndianPerWord;
    if(words){
      this.W = words.slice();
    }else if(bytes){
      this.W = bytesToWords(bytes, wordBits, littleEndianPerWord);
    }else{
      // Default zeroed structure
      const nwords = Math.ceil(totalBits/wordBits);
      this.W = Array.from({length:nwords}, ()=>0n);
    }
  }

  // Absolute bit slice: inclusive [lo..hi]
  absBits(hi, lo){
    if(hi<lo) throw new Error(`hi<lo (${hi}<${lo})`);
    const wbits=this.wordBits;
    const wLo = Math.floor(lo/wbits), wHi = Math.floor(hi/wbits);
    const oLo = BigInt(lo%wbits), oHi = BigInt(hi%wbits);
    if(wLo===wHi){
      const mask = (1n << (oHi-oLo+1n)) - 1n;
      return (this.W[wLo] >> oLo) & mask;
    }
    let val=0n, shift=0n;
    for(let w=wLo; w<=wHi; w++){
      const start = (w===wLo)? oLo : 0n;
      const end   = (w===wHi)? oHi : BigInt(wbits-1);
      const mask  = (1n << (end-start+1n)) - 1n;
      const piece = (this.W[w] >> start) & mask;
      val |= (piece << shift);
      shift += (end-start+1n);
    }
    return val;
  }

  // Decode with a declarative format
  decode(format){
    if(!format || !Array.isArray(format.fields)) throw new Error('format.fields[] required');
    let vals = [];
    for(const f of format.fields){
      const {k, h, t} = f;
      if(k==null || h==null || t==null) throw new Error('field requires k, h, l');
      const l = f.l||h;
      const pos = f.l ? `${h}:${l}` : `${h}`;
      const raw = this.absBits(h, l);
      const num = Number(raw);
      let text, x;
      switch(t){
        case 'u': text = num < 10 ? num : `${num} (0x${num.toString(16)})`; break;
        case 'i': text = signExtend(raw, (h-l+1)); break;
        case 'e': text = `${num}: ${f.enum[num] ? f.enum[num] : 'unknown'}`; break;
        case 'b': text = `0b${num.toString(2)}`; break;
        case 'a': x = f.lshift ? num << f.lshift : num; text = `0x${x.toString(16)}`; break;
        default: text = raw; break;
      }
      vals.push([pos, k, text]);
    }
    return vals;
  }
}

// ---------------- helpers ----------------
export const helpers = {
  fmtHex(v, width){
    const s = (typeof v==='bigint'? v : BigInt(v)).toString(16).padStart(width||0,'0');
    return '0x'+s;
  },
  parseHexWords(input, {accept0x=true, maxWords=8}={}){
    let t = input.replace(/W[0-7]:/gi,' ').replace(/[\,\n\r\t]/g,' ').replace(/\s+/g,' ').trim();
    if(!t) return [];
    const parts = t.split(' ').filter(Boolean);
    if(parts.length>maxWords) throw new Error(`Provide at most ${maxWords} words; got ${parts.length}`);
    return parts.map(p=>{
      if(accept0x && /^0x/i.test(p)) p=p.slice(2);
      if(!/^[0-9a-fA-F]{1,16}$/.test(p)) throw new Error(`Bad u64 '${p}'`);
      return BigInt('0x'+p);
    });
  },
  parseHexBytes(input, {accept0x=true}={}){
    let t = input.trim().replace(/[\,\n\r\t]/g,' ').replace(/\s+/g,' ');
    if(!t) return new Uint8Array();
    const out=[]; const parts=t.split(' ').filter(Boolean);
    for(let p of parts){
      if(accept0x && /^0x/i.test(p)) p=p.slice(2);
      if(p.length===1) p='0'+p;
      if(!/^[0-9a-fA-F]{2}$/.test(p)) throw new Error(`Bad byte '${p}'`);
      out.push(parseInt(p,16));
    }
    return new Uint8Array(out);
  }
};

// ---------------- internals ----------------
function bytesToWords(bytes, wordBits=64, littleEndianPerWord=true){
  if(wordBits!==64) throw new Error('Only 64-bit words supported right now');
  if(bytes.length%8!==0) throw new Error('bytes length must be a multiple of 8');
  const words=[];
  for(let i=0;i<bytes.length;i+=8){
    let w=0n;
    if(littleEndianPerWord){
      for(let b=0;b<8;b++) w |= BigInt(bytes[i+b]) << BigInt(8*b);
    }else{
      for(let b=0;b<8;b++) w = (w<<8n) | BigInt(bytes[i+b]);
    }
    words.push(w);
  }
  return words;
}

function signExtend(raw, width){
  const W = BigInt(width);
  const sign = 1n << (W-1n);
  const mask = (1n << W) - 1n;
  let v = raw & mask;
  if(v & sign) v = v - (1n<<W);
  return Number(v);
}
