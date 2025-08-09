// === CONFIG ===
const SHEET_ID  = "1agyu31GI2YGD-42in3P7hZytsKNO-kg-JDdfvlJL7q0";
const SHEET_TABS = ["000","100","200","300","400","500","600","700","800","900"];

// === Helpers ===
const $ = (id) => document.getElementById(id);
const els = {
  pageTitle: $("page-title"),
  bookSection: $("book-section"),
  error: $("error"),
  debug: $("debug"),
  cover: $("cover"),
  title: $("title"),
  author: $("author"),
  category: $("category"),
  description: $("description"),
  score: $("score"),
  audio: $("audio"),
};

function showError(msg){
  if(els.pageTitle) els.pageTitle.textContent = "เกิดข้อผิดพลาด";
  if(els.error){
    els.error.style.display = "block";
    els.error.innerHTML = msg;
  }
}

function showDebug(obj){
  const params = new URLSearchParams(location.search);
  if(params.get("debug") !== "1") return;
  els.debug.style.display = "block";
  els.debug.textContent = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
}

// — ล้างตัวซ่อน/ช่องว่างออกจากชื่อคอลัมน์
function normKey(s){
  return (s||"")
    .replace(/[\u200B-\u200D\uFEFF]/g,"") // zero-width & BOM
    .replace(/\s+/g,"")                   // remove all whitespace
    .trim();
}
// — map ชื่อคอลัมน์ให้เป็นมาตรฐาน
function remapRowKeys(row){
  const want = {
    "ลำดับ":"ลำดับ",
    "ชื่อหนังสือ":"ชื่อหนังสือ",
    "ผู้แต่ง":"ผู้แต่ง",
    "เลขหมวดหมู่":"เลขหมวดหมู่",
    "คำอธิบาย":"คำอธิบาย",
    "รูปปก":"รูปปก",
    "audio_url":"audio_url",
    "คะแนน":"คะแนน"
  };
  const out = {}, wantNorm = {};
  Object.keys(want).forEach(k => wantNorm[normKey(k)] = want[k]);
  for(const k in row){
    const kn = normKey(k);
    const target = wantNorm[kn];
    if(target) out[target] = (row[k] ?? "").toString().trim();
  }
  return out;
}

// — แปลงเลขไทยเป็นอารบิก + เก็บเฉพาะตัวเลข
function toArabicDigits(str){
  const th="๐๑๒๓๔๕๖๗๘๙", ar="0123456789";
  return String(str||"").replace(/[๐-๙]/g, d => ar[th.indexOf(d)]);
}
function normId(x){
  return toArabicDigits(x).replace(/[^\d]/g,"");
}

// === โหลดแบบ “ให้ Google Sheets กรองให้ตั้งแต่ต้นทาง” ===
//   ใช้ query: select * where A = <id>   (A = คอลัมน์ลำดับ)
const csvUrlById = (tab, wantId) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq` +
  `?tqx=out:csv` +
  `&sheet=${encodeURIComponent(tab)}` +
  `&tq=${encodeURIComponent(`select * where A = ${Number(wantId)}`)}` +
  `&cachebust=${Date.now()}`;

// โหลด “เฉพาะแถวของ id” จากแท็บที่กำหนด (ผลลัพธ์ 0 หรือ 1 แถว)
function loadRowById(tab, wantId){
  return new Promise((resolve, reject) => {
    Papa.parse(csvUrlById(tab, wantId), {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = (res.data || []).map(remapRowKeys);
        showDebug({ tab, rows: rows.length, sample: rows[0] || null });
        resolve(rows[0] || null);
      },
      error: (err) => reject(err)
    });
  });
}

// === Main ===
(function(){
  const params = new URLSearchParams(location.search);
  const rawId  = (params.get("id")  || "").trim();
  const cat    = (params.get("cat") || "").trim();  // 000/100/.../900
  if(!rawId) return showError('กรุณาระบุ <code>?id=เลขลำดับ</code> เช่น <code>?id=1</code>');
  const wantId = normId(rawId);

  (async () => {
    try{
      if(cat){
        // ระบุแท็บ: โหลดเฉพาะแท็บนั้น
        const row = await loadRowById(cat, wantId);
        if(!row) return showError(`ไม่พบลำดับ ${rawId} ในแท็บ ${cat}`);
        return render(row);
      }

      // ไม่ระบุแท็บ: ค้นทุกแท็บ แต่โหลดแบบ “เฉพาะ id” จากแต่ละแท็บ
      const hits = [];
      for(const tab of SHEET_TABS){
        const row = await loadRowById(tab, wantId);
        if(row) hits.push({tab, row});
      }
      if(hits.length === 0){
        return showError(`ไม่พบลำดับ ${rawId} ในแท็บใด ๆ`);
      }
      if(hits.length > 1){
        const list = hits.map(h => h.tab).join(", ");
        return showError(`พบลำดับ ${rawId} หลายแท็บ (${list}) — โปรดระบุ &cat= ที่ต้องการ`);
      }
      render(hits[0].row);
    }catch(e){
      showError("โหลดข้อมูลผิดพลาด: " + e);
    }
  })();
})();

function render(b){
  if(els.pageTitle) els.pageTitle.textContent = b["ชื่อหนังสือ"] || "ไม่ทราบชื่อ";
  if(els.title)      els.title.textContent      = b["ชื่อหนังสือ"] || "";
  if(els.author)     els.author.textContent     = b["ผู้แต่ง"]      || "";
  if(els.category)   els.category.textContent   = b["เลขหมวดหมู่"]  || "";
  if(els.description)els.description.textContent= b["คำอธิบาย"]     || "";
  if(els.score)      els.score.textContent      = b["คะแนน"]        || "-";

  if(els.cover && b["รูปปก"])     els.cover.src = b["รูปปก"];
  if(els.audio && b["audio_url"]) els.audio.src = b["audio_url"];

  if(els.bookSection) els.bookSection.style.display = "grid";
}
