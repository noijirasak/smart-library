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

// ===== Category map (สี + ชื่อหมวด) =====
const CATEGORY = {
  colors: {
    "000": "#355E3B", // ความรู้ทั่วไป (เขียวเข้ม)
    "100": "#00AEEF", // จิตวิทยา (ฟ้า)
    "200": "#FFC300", // ศาสนา (เหลือง)
    "300": "#00FF66", // สังคมศาสตร์ (เขียวมินท์)
    "400": "#FF66CC", // ภาษา (ชมพู)
    "500": "#0033CC", // วิทยาศาสตร์ (น้ำเงิน)
    "600": "#FF0000", // วิทยาศาสตร์ประยุกต์ (แดง)
    "700": "#8B4513", // ศิลปะ/นันทนาการ (น้ำตาล)
    "800": "#800080", // วรรณคดี (ม่วง)
    "900": "#FFFF00"  // ภูมิศาสตร์/ประวัติศาสตร์ (เหลืองสด)
  },
  labels: {
    "000": "ความรู้ทั่วไป",
    "100": "จิตวิทยา",
    "200": "ศาสนา",
    "300": "สังคมศาสตร์",
    "400": "ภาษาศาสตร์",
    "500": "วิทยาศาสตร์",
    "600": "วิทยาศาสตร์ประยุกต์",
    "700": "ศิลปะและนันทนาการ",
    "800": "วรรณกรรม",
    "900": "ภูมิศาสตร์และประวัติศาสตร์"
  }
};

// แปลงเลขไทย → อารบิก
function toArabicDigits(str){
  const th="๐๑๒๓๔๕๖๗๘๙", ar="0123456789";
  return String(str||"").replace(/[๐-๙]/g, d => ar[th.indexOf(d)]);
}

// เอา “เลขหมวดหลักร้อย” จากเลขเรียกหนังสือ
// เช่น "895.911" -> "800", "523" -> "500"
function getCatCode(callNumber){
  const s = toArabicDigits(callNumber);
  const m = s.match(/\d+(\.\d+)?/);         // จับเลขก้อนแรก
  if(!m) return "000";
  const n = Math.floor(parseFloat(m[0]));   // ตัดทศนิยม
  const base = Math.floor(n/100)*100;       // ปัดลงหลักร้อย
  return String(base).padStart(3,"0");
}


// เซ็ตสีให้แถบ + ชิปหมวด
function applyCategoryUI(code){
  const color = CATEGORY.colors[code] || "#cbd5e1";
  // แถบหัวการ์ด
  const bar = document.getElementById("catBar");
  if (bar) bar.style.backgroundColor = color;

  // จุดสีบนชิป
  const dot = document.querySelector(".chip.primary .dot");
  if (dot) dot.style.backgroundColor = color;

  // ไล่โทนสีพื้น/กรอบชิปให้เข้ากับสีหมวด (จาง ๆ)
  const chip = document.querySelector(".chip.primary");
  if (chip){
    chip.style.borderColor = color + "55";     // โปร่ง 33%
    chip.style.background  = color + "14";     // โปร่ง 8%
  }

  // ตั้งค่าตัวแปร CSS ให้ทั้งหน้าใช้สีตามหมวด
  const root = document.documentElement.style;
  root.setProperty('--cat', color);
  root.setProperty('--grad-start', color);
  root.setProperty('--grad-end',   shadeColor(color, -20));

  // ทำให้หัวเรื่องคมชัด: ไม่ใช้ clip-to-text/transparent
  const pageTitle = document.getElementById("page-title");
  if (pageTitle) {
    pageTitle.style.removeProperty('-webkit-background-clip');
    pageTitle.style.removeProperty('-webkit-text-fill-color');
    pageTitle.style.background = 'none';
    pageTitle.style.color = color;        // ใช้สีทึบ คมชัด
  }
}

// ฟังก์ชันช่วยทำสีอ่อน/เข้มขึ้น
function shadeColor(color, percent) {
  const f = parseInt(color.slice(1),16),
        t = percent < 0 ? 0 : 255,
        p = percent < 0 ? percent*-1 : percent;
  const R = f>>16, G = f>>8&0x00FF, B = f&0x0000FF;
  return "#" + (
    0x1000000 +
    (Math.round((t-R)*p)+R)*0x10000 +
    (Math.round((t-G)*p)+G)*0x100 +
    (Math.round((t-B)*p)+B)
  ).toString(16).slice(1);
}


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
  const crumbCat   = document.getElementById('crumbCat');
  const crumbTitle = document.getElementById('crumbTitle');
  const btnBack    = document.getElementById('btnBackCat');
  const wantId = onlyDigits(rawId);
  const cat    = (rawCat.match(/\d{3}/)?.[0]) || ""; // เอาเฉพาะตัวเลข 3 หลัก

   // ตั้งชื่อหมวดบน breadcrumb
  if (crumbCat && cat){
    const label = (typeof LABELS !== 'undefined' && LABELS[cat])
      ? `หมวด ${cat} (${LABELS[cat]})` : `หมวด ${cat}`;
    crumbCat.textContent = label;
    crumbCat.href = `cat.html?cat=${cat}`;
  }

  // ปุ่มกลับไปดูทั้งหมดในหมวด
  if (btnBack && cat) btnBack.href = `cat.html?cat=${cat}`;

  // อัปเดตชื่อหนังสือบน breadcrumb เมื่อโหลดข้อมูลเสร็จ
  const updateTitle = () => {
    const t = document.getElementById('title')?.textContent?.trim();
    if (t && crumbTitle){ crumbTitle.textContent = t; return true; }
    return false;
  };
  if (!updateTitle()){
    const timer = setInterval(()=>{ if(updateTitle()) clearInterval(timer); }, 200);
    setTimeout(()=>clearInterval(timer), 5000);
  }
  const shareUrl  = encodeURIComponent(location.href);
  const sLine = document.getElementById('shareLine');
  const sFb   = document.getElementById('shareFb');
  const sCopy = document.getElementById('shareCopy');
  const titleNow = document.getElementById('title')?.textContent || document.title;
  const shareText = encodeURIComponent(titleNow);

  if (sLine) sLine.href = `https://line.me/R/msg/text/?${shareText}%20${shareUrl}`;
  if (sFb)   sFb.href   = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;
  if (sCopy) sCopy.addEventListener('click', e=>{
    e.preventDefault();
    navigator.clipboard.writeText(location.href);
    sCopy.textContent = 'คัดลอกแล้ว ✓';
    setTimeout(()=> sCopy.textContent = 'คัดลอกลิงก์', 1500);
  });


  (async () => {
    try{
      if (cat) {
        // โหลดทั้งแท็บที่ระบุ แล้วกรองหา id
        const rows = await loadWholeTab(cat);
        const idNum = Number(wantId);
        const hit = rows.find(r => Number(onlyDigits(r["ลำดับ"])) === idNum);
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

// สุ่ม array แบบง่าย ๆ
function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

// เรนเดอร์การ์ดแนะนำ
function renderRecommendations(rows, catCode, currentId, count=3){
  const wrap = document.getElementById('reco-grid');
  if(!wrap) return;
  wrap.innerHTML = '';

  // กรอง: ต้องมีปก/ชื่อ และไม่ใช่เล่มปัจจุบัน
  const usable = rows.filter(r =>
    (r['รูปปก'] || '').trim() &&
    (r['ชื่อหนังสือ'] || '').trim() &&
    (r['ลำดับ'] || '').trim() !== currentId
  );

  const picks = shuffle(usable).slice(0, count);

  for(const b of picks){
    const id = (b['ลำดับ'] || '').trim();
    const title = (b['ชื่อหนังสือ'] || '').trim();
    const author = (b['ผู้แต่ง'] || '').trim();
    const cover = (b['รูปปก'] || '').trim();
    const score = Number(b['คะแนน'] || 0);
    const stars = '★'.repeat(score).padEnd(5, '☆');

    const card = document.createElement('a');
    card.href = `?id=${encodeURIComponent(id)}&cat=${catCode}`;
    card.className = 'reco-link';
    card.innerHTML = `
      <article class="reco-card">
        <img class="reco-cover" src="${cover}" alt="">
        <h3 class="reco-title-text">${title}</h3>
        <p class="reco-author">${author ? 'ผู้แต่ง: '+author : '&nbsp;'}</p>
        <div class="reco-chips">
          <span class="reco-chip"><span class="reco-dot"></span> หมวด ${catCode}</span>
          <span class="reco-star">${stars}</span>
        </div>
      </article>
    `;
    wrap.appendChild(card);
  }
}

// โหลดหมวดเดียว แล้วสร้างแนะนำ
async function buildRecommendations(catCode, currentId){
  try{
    const rows = await loadWholeTab(catCode);
    renderRecommendations(rows, catCode, currentId, 4);
  }catch(e){
    console.warn('recommendations failed:', e);
  }
}

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

   // --- หมวด & แถบสี ---
  const code = getCatCode(b["เลขหมวดหมู่"]);
  const label = CATEGORY.labels[code] || "";
  const catChip = document.getElementById("catChip");
  if (catChip) catChip.textContent = label ? `หมวด ${code} (${label})` : `หมวด ${code}`;
  applyCategoryUI(code);

  // คะแนนดาว (ถ้ายังไม่ได้ทำ)
  const scoreChip = document.getElementById("scoreChip");
  if (scoreChip) scoreChip.textContent =
      "★".repeat(Number(b["คะแนน"]||0)).padEnd(5,"☆");

  // >>> เรียกสร้าง "หนังสือแนะนำ"
  const params = new URLSearchParams(location.search);
  const currentId = (params.get('id') || '').replace(/[^\d]/g,''); // ใช้เลขอย่างเดียว
  buildRecommendations(code, currentId);
  
}
