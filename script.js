// SmartLibrary JS build v11
console.log("SmartLibrary JS build v11");

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

// === โหลดทั้งแท็บ (ไม่ใช้ tq) แล้วค่อยกรองหา id ที่หน้าเว็บ ===
const csvUrlWhole = (tab) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}&cachebust=${Date.now()}`;

function loadWholeTab(tab){
  return new Promise((resolve, reject) => {
    Papa.parse(csvUrlWhole(tab), {
      download: true, header: true, skipEmptyLines: true,
      complete: (res) => {
        const rows = (res.data || []).map(remapRowKeys);
        // โชว์ตัวอย่างลำดับ 5 แถวแรกไว้ดีบัก
        const ids = rows.slice(0,5).map(r => r["ลำดับ"]);
        showDebug({ mode:"whole", tab, rows: rows.length, sampleIds: ids, sample: rows[0]||null });
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
  const rawCat = (params.get("cat") || "").trim();
  if(!rawId) return showError('กรุณาระบุ <code>?id=เลขลำดับ</code> เช่น <code>?id=1</code>');

  const wantId = onlyDigits(rawId);
  const cat    = (rawCat.match(/\d{3}/)?.[0]) || ""; // เอาเฉพาะตัวเลข 3 หลัก

  (async () => {
    try{
      if (cat) {
        // โหลดทั้งแท็บที่ระบุ แล้วกรองหา id
        const rows = await loadWholeTab(cat);
        const hit = rows.find(r => onlyDigits(r["ลำดับ"]) === wantId);
        if (!hit) return showError(`ไม่พบลำดับ ${rawId} ในแท็บ ${cat}`);
        return render(hit);
      }
      // ไม่ระบุ cat: ค้นทุกแท็บ (แต่ละแท็บโหลดทั้งแผ่น)
      const hits = [];
      for (const tab of SHEET_TABS) {
        const rows = await loadWholeTab(tab);
        const hit = rows.find(r => onlyDigits(r["ลำดับ"]) === wantId);
        if (hit) hits.push({tab, row: hit});
      }
      if (hits.length === 0) return showError(`ไม่พบลำดับ ${rawId} ในแท็บใด ๆ`);
      if (hits.length > 1)  return showError(`พบลำดับ ${rawId} หลายแท็บ (${hits.map(h=>h.tab).join(", ")}) — โปรดระบุ &cat=`);
      render(hits[0].row);
    }catch(e){
      showError("โหลดข้อมูลผิดพลาด: " + e);
    }
  })();
})();

// ---- Autoplay ที่ชัวร์ทุกเบราว์เซอร์ ----
function enableSafeAutoplay(audioEl) {
  if (!audioEl) return;

  // บังคับโหมด autoplay แบบที่เบราว์เซอร์ยอม
  audioEl.muted = true;
  audioEl.autoplay = true;
  audioEl.setAttribute('playsinline', '');

  // พยายามเล่นแบบเงียบทันที
  const tryPlay = () => audioEl.play().catch(() => {});
  // ถ้ายังไม่พร้อม ให้รอจน canplay แล้วค่อยสั่งเล่น
  if (audioEl.readyState >= 2) tryPlay();
  else audioEl.addEventListener('canplay', tryPlay, { once: true })

  // โชว์ปุ่ม “เปิดเสียง” ให้ผู้ใช้กดครั้งแรกเพื่อปลด mute
  const wrap = document.getElementById('audioWrap') || audioEl.parentElement;
  if (wrap && !document.getElementById('unmuteBtn')) {
    const btn = document.createElement('button');
    btn.id = 'unmuteBtn';
    btn.textContent = 'เปิดเสียง';
    Object.assign(btn.style, {
      marginTop:'8px', padding:'6px 10px', borderRadius:'999px',
      border:'1px solid #cbd5e1', background:'#e2e8f0', cursor:'pointer',
      fontWeight:'600'
    });
    btn.addEventListener('click', () => {
      audioEl.muted = false;
      audioEl.play().catch(()=>{});
      btn.remove();
    });
    wrap.appendChild(btn);
  }
  // เผื่อผู้ใช้คลิกที่ไหนก็ได้บนหน้า → ปลดเสียงให้ด้วย
  const unmuteOnce = () => {
    audioEl.muted = false;
    audioEl.play().catch(()=>{});
    window.removeEventListener('click', unmuteOnce, true);
    window.removeEventListener('touchstart', unmuteOnce, true);
    const b = document.getElementById('unmuteBtn');
    if (b) b.remove();
  };
  window.addEventListener('click', unmuteOnce, { capture:true, once:true });
  window.addEventListener('touchstart', unmuteOnce, { capture:true, once:true });
}
  // ดัก “การโต้ตอบครั้งแรก”
  window.addEventListener('click', unmute, {capture:true, once:true});
  window.addEventListener('touchstart', unmute, {capture:true, once:true});
  window.addEventListener('keydown', unmute, {capture:true, once:true});

  // สร้างปุ่ม “เปิดเสียง” เล็ก ๆ ข้างเครื่องเล่น (เผื่อผู้ใช้หาไม่เจอ)
  if (!document.getElementById('unmuteBtn')) {
    const wrap = document.getElementById('audioWrap') || audioEl.parentElement;
    if (wrap) {
      const btn = document.createElement('button');
      btn.id = 'unmuteBtn';
      btn.textContent = 'เปิดเสียง';
      Object.assign(btn.style, {
        marginTop: '8px', padding: '6px 10px', borderRadius: '999px',
        border: '1px solid #cbd5e1', background:'#e2e8f0', cursor:'pointer',
        fontWeight:'600'
      });
      btn.addEventListener('click', unmute);
      wrap.appendChild(btn);
    }
  }

function unmute() {
    const audio = document.getElementById("audio");
    if (audio) {
        audio.muted = false; // ปิด mute
        audio.play().catch(err => {
            console.warn("ไม่สามารถเล่นเสียงอัตโนมัติได้:", err);
        });
    }
}

function render(b){
  if(els.pageTitle) els.pageTitle.textContent = b["ชื่อหนังสือ"] || "ไม่ทราบชื่อ";
  if(els.title)       els.title.textContent       = b["ชื่อหนังสือ"] || "";
  if(els.author)      els.author.textContent      = b["ผู้แต่ง"]      || "";
  if(els.category)    els.category.textContent    = b["เลขหมวดหมู่"]  || "";
  if(els.description) els.description.textContent = b["คำอธิบาย"]     || "";
  if(els.score)       els.score.textContent       = b["คะแนน"]        || "-";
  if(els.cover && b["รูปปก"])     els.cover.src = b["รูปปก"];
  if(els.audio && b["audio_url"]) els.audio.src = b["audio_url"];

  if (els.audio && b["audio_url"]) {
    els.audio.src = b["audio_url"];
    enableSafeAutoplay(els.audio);   // <<< เพิ่มบรรทัดนี้
  }
  if(els.bookSection) els.bookSection.style.display = "grid";
}
