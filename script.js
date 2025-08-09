// SmartLibrary JS build v10  (ควรเห็นบรรทัดนี้ใน Console)
console.log("SmartLibrary JS build v10");

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
  if(els.error){ els.error.style.display = "block"; els.error.innerHTML = msg; }
}
function showDebug(obj){
  const p = new URLSearchParams(location.search);
  if(p.get("debug") !== "1") return;
  els.debug.style.display = "block";
  els.debug.textContent = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
}

// ล้างหัวคอลัมน์
function normKey(s){ return (s||"").replace(/[\u200B-\u200D\uFEFF]/g,"").replace(/\s+/g,"").trim(); }
function remapRowKeys(row){
  const want = {"ลำดับ":"ลำดับ","ชื่อหนังสือ":"ชื่อหนังสือ","ผู้แต่ง":"ผู้แต่ง","เลขหมวดหมู่":"เลขหมวดหมู่","คำอธิบาย":"คำอธิบาย","รูปปก":"รูปปก","audio_url":"audio_url","คะแนน":"คะแนน"};
  const out = {}, wantNorm = {}; Object.keys(want).forEach(k => wantNorm[normKey(k)] = want[k]);
  for(const k in row){ const kn = normKey(k); const t = wantNorm[kn]; if(t) out[t] = (row[k] ?? "").toString().trim(); }
  return out;
}
// เลขไทย -> อารบิก และเก็บเฉพาะตัวเลข
function toArabicDigits(str){ const th="๐๑๒๓๔๕๖๗๘๙", ar="0123456789"; return String(str||"").replace(/[๐-๙]/g, d => ar[th.indexOf(d)]); }
function onlyDigits(x){ return toArabicDigits(x).replace(/[^\d]/g,""); }

// === ใช้ Google Sheets กรองตั้งแต่ต้นทาง — รองรับทั้งเลขและสตริง ===
const csvUrlById = (tab, wantId) => {
  const id = String(wantId).trim().replace(/'/g, "\\'");
  const tq = `select * where A = '${id}'`;
  return (
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq`
    + `?tqx=out:csv`
    + `&sheet=${encodeURIComponent(tab)}`
    + `&tq=${encodeURIComponent(tq)}`
    + `&cachebust=${Date.now()}`
  );
};


function loadRowById(tab, wantId){
  return new Promise((resolve, reject) => {
    const url = csvUrlById(tab, wantId);
    Papa.parse(url, {
      download: true, header: true, skipEmptyLines: true,
      complete: (res) => {
        const rows = (res.data || []).map(remapRowKeys);
        showDebug({ mode:"byId", tab, wantId, url, rows: rows.length, sample: rows[0]||null });
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
  const rawCat = (params.get("cat") || "").trim();
  if(!rawId) return showError('กรุณาระบุ <code>?id=เลขลำดับ</code> เช่น <code>?id=1</code>');

  // เก็บเฉพาะตัวเลขจาก id/cat (กันพิมพ์พ่วงคำไทย/ช่องว่าง)
  const wantId = onlyDigits(rawId);
  const cat    = (rawCat.match(/\d{3}/)?.[0]) || "";

  (async () => {
    try{
      if (cat) {
        const row = await loadRowById(cat, wantId);
        if (!row) return showError(`ไม่พบลำดับ ${rawId} ในแท็บ ${cat}`);
        return render(row);
      }
      const hits = [];
      for (const tab of SHEET_TABS) {
        const row = await loadRowById(tab, wantId);
        if (row) hits.push({tab, row});
      }
      if (hits.length === 0) return showError(`ไม่พบลำดับ ${rawId} ในแท็บใด ๆ`);
      if (hits.length > 1)  return showError(`พบลำดับ ${rawId} หลายแท็บ (${hits.map(h=>h.tab).join(", ")}) — โปรดระบุ &cat=`);
      render(hits[0].row);
    }catch(e){
      showError("โหลดข้อมูลผิดพลาด: " + e);
    }
  })();
})();

function render(b){
  if(els.pageTitle) els.pageTitle.textContent = b["ชื่อหนังสือ"] || "ไม่ทราบชื่อ";
  if(els.title)       els.title.textContent       = b["ชื่อหนังสือ"] || "";
  if(els.author)      els.author.textContent      = b["ผู้แต่ง"]      || "";
  if(els.category)    els.category.textContent    = b["เลขหมวดหมู่"]  || "";
  if(els.description) els.description.textContent = b["คำอธิบาย"]     || "";
  if(els.score)       els.score.textContent       = b["คะแนน"]        || "-";
  if(els.cover && b["รูปปก"])     els.cover.src = b["รูปปก"];
  if(els.audio && b["audio_url"]) els.audio.src = b["audio_url"];
  if(els.bookSection) els.bookSection.style.display = "grid";
}
