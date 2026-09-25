/**
 * Eng sodda ZIP yig'uvchi (faqat "store" — siqishsiz).
 * Bir necha Excel faylni bitta arxivga solib berish uchun ishlatiladi;
 * .xlsx fayllar ichidan allaqachon siqilgani uchun siqishga hojat yo'q.
 * Tashqi paketga bog'liq emas — brauzerda ishlaydi.
 */

export interface ZipEntry {
  /** arxiv ichidagi yo'l, masalan "Kimyo testi/8-A.xlsx" */
  name: string;
  data: Uint8Array;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Sana/vaqtni MS-DOS formatiga o'tkazadi (ZIP sarlavhasi uchun). */
function dosDateTime(d: Date): { time: number; date: number } {
  return {
    time:
      (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2)),
    date:
      ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

class ByteWriter {
  private parts: Uint8Array[] = [];
  length = 0;

  push(b: Uint8Array) {
    this.parts.push(b);
    this.length += b.length;
  }

  /** little-endian sonlar */
  num(value: number, bytes: 2 | 4) {
    const b = new Uint8Array(bytes);
    for (let i = 0; i < bytes; i++) b[i] = (value >>> (i * 8)) & 0xff;
    this.push(b);
  }

  merge(): Uint8Array {
    const out = new Uint8Array(this.length);
    let off = 0;
    for (const p of this.parts) {
      out.set(p, off);
      off += p.length;
    }
    return out;
  }
}

/** Fayllarni ZIP arxivga yig'adi va Blob qaytaradi. */
export function makeZip(entries: ZipEntry[]): Blob {
  const enc = new TextEncoder();
  const { time, date } = dosDateTime(new Date());
  const out = new ByteWriter();
  const central: { header: Uint8Array; offset: number }[] = [];

  for (const e of entries) {
    const nameBytes = enc.encode(e.name);
    const crc = crc32(e.data);
    const offset = out.length;

    // local file header
    out.num(0x04034b50, 4);
    out.num(20, 2); // version needed
    out.num(0x0800, 2); // UTF-8 nomlar
    out.num(0, 2); // method: store
    out.num(time, 2);
    out.num(date, 2);
    out.num(crc, 4);
    out.num(e.data.length, 4);
    out.num(e.data.length, 4);
    out.num(nameBytes.length, 2);
    out.num(0, 2); // extra field yo'q
    out.push(nameBytes);
    out.push(e.data);

    const c = new ByteWriter();
    c.num(0x02014b50, 4);
    c.num(20, 2); // version made by
    c.num(20, 2); // version needed
    c.num(0x0800, 2);
    c.num(0, 2);
    c.num(time, 2);
    c.num(date, 2);
    c.num(crc, 4);
    c.num(e.data.length, 4);
    c.num(e.data.length, 4);
    c.num(nameBytes.length, 2);
    c.num(0, 2); // extra
    c.num(0, 2); // comment
    c.num(0, 2); // disk
    c.num(0, 2); // internal attrs
    c.num(0, 4); // external attrs
    c.num(offset, 4);
    c.push(nameBytes);
    central.push({ header: c.merge(), offset });
  }

  const centralStart = out.length;
  for (const c of central) out.push(c.header);
  const centralSize = out.length - centralStart;

  // end of central directory
  out.num(0x06054b50, 4);
  out.num(0, 2);
  out.num(0, 2);
  out.num(central.length, 2);
  out.num(central.length, 2);
  out.num(centralSize, 4);
  out.num(centralStart, 4);
  out.num(0, 2); // izoh yo'q

  return new Blob([out.merge()], { type: "application/zip" });
}

/** Blob'ni brauzerda yuklab olishga beradi. */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
