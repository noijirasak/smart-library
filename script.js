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
  `&tq=${encodeURIComponent(`select * where A = ${Number(wantId)}`)}`*
