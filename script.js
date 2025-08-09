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
function onlyDigits(x){
  return toArabicDigits(x).replace(/[^\d]/g,""); // << แก้ตรงนี้
}

const csvUrl = (tab) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}&cachebust=${Date.now()}`;

function loadOneTab(tab){
  return new Promise((resolve, reject) => {
    Papa.parse(csvUrl(tab), {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = (res.data || []).map(remapRowKeys);
        showDebug({tab, rows: rows.length, sample: rows[0] || null});
        resolve(rows);
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
  if(!rawId) return showError('กรุณาระบุ <code>?id=เลขลำดับ</code> ใน URL เช่น <code>?id=1</code>');
  const wantId = String(parseInt(onlyDigits(rawId) || "0", 10));

  const order = (!cat) ? SHEET_TABS.slice() : [cat, ...SHEET_TABS.filter(t => t !== cat)];

  (async () => {
    try{
      let hit = null;
      for(const tab of order){
        const rows = await loadOneTab(tab);
        hit = rows.find(r => String(parseInt(onlyDigits(r["ลำดับ"]) || "0",10)) === wantId);
        if(hit) break;
      }
      if(!hit) return showError(`ไม่พบหนังสือ ลำดับ = ${rawId} ในแท็บใด ๆ`);
      render(hit);
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
