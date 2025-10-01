// ===== Config (ใช้ SHEET_ID เดียวกับโปรเจกต์หลัก) =====
const SHEET_ID  = "1agyu31GI2YGD-42in3P7hZytsKNO-kg-JDdfvlJL7q0";
const LABELS = {
  "000":"ความรู้ทั่วไป","100":"จิตวิทยา","200":"ศาสนา","300":"สังคมศาสตร์","400":"ภาษา",
  "500":"วิทยาศาสตร์","600":"วิทยาศาสตร์ประยุกต์","700":"ศิลปะและนันทนาการ","800":"วรรณกรรม","900":"ภูมิศาสตร์/ประวัติศาสตร์",
  "NEW":"หนังสือมาใหม่","REC":"แนะนำ"
};
const DOTS = {
  "REC":"gold","NEW":"#ffd166",
  "000":"#06b6d4","100":"#8b5cf6","200":"#f59e0b","300":"#10b981","400":"#fb7185",
  "500":"#3b82f6","600":"#f43f5e","700":"#fbbf24","800":"#a78bfa","900":"#84cc16"
};

const q = (s, el=document)=>el.querySelector(s);
const el = (t, attrs={}) => Object.assign(document.createElement(t), attrs);

function csvUrl(tab){
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}&cachebust=${Date.now()}`;
}
function normKey(s){ return (s||"").replace(/[\u200B-\u200D\uFEFF]/g,"").replace(/\s+/g,"").trim(); }
function mapRow(row){
  const want = {"ลำดับ":"ลำดับ","ชื่อหนังสือ":"ชื่อหนังสือ","ผู้แต่ง":"ผู้แต่ง","เลขหมวดหมู่":"เลขหมวดหมู่","คำอธิบาย":"คำอธิบาย","รูปปก":"รูปปก","audio_url":"audio_url","คะแนน":"คะแนน","สถานะ":"สถานะ"};
  const out = {}, wn = {}; Object.keys(want).forEach(k => wn[normKey(k)] = want[k]);
  for(const k in row){
    if (/สถานะ/.test(k)) { out["สถานะ"] = (row[k]??"").toString().trim(); continue; }
    const kn = normKey(k); const t = wn[kn]; if(t) out[t] = (row[k] ?? "").toString().trim();
  }
  return out;
}
const star = n => "★".repeat(Number(n||0)).padEnd(5,"☆");
function statusInfo(v){
  const s = String(v||"").trim();
  if (s==="1") return { text:"ว่าง", cls:"ok" };
  if (s==="0") return { text:"ยืม", cls:"busy" };
  if (s==="3") return { text:"ซ่อม", cls:"repair" };
  return { text:"-", cls:"na" };
}
function getCatCode(callNumber){
  const m = String(callNumber||"").match(/\d+(\.\d+)?/); if(!m) return "000";
  const n = Math.floor(parseFloat(m[0])); return String(Math.floor(n/100)*100).padStart(3,"0");
}
function loadTab(tab){
  return new Promise((res, rej)=>{
    Papa.parse(csvUrl(tab), {
      download:true, header:true, skipEmptyLines:true,
      complete: r => res((r.data||[]).map(mapRow)),
      error: rej
    });
  });
}
function card(book){
  const code = getCatCode(book["เลขหมวดหมู่"]);
  const href = `book.html?id=${encodeURIComponent(book["ลำดับ"])}&cat=${code}`;
  const a = el("a", { className:"card", href, title: book["ชื่อหนังสือ"] || "" });

  const wrap = el("div", { style:"position:relative" });
  const img = el("img", { className:"card__cover", src:book["รูปปก"]||"", alt:book["ชื่อหนังสือ"]||"", loading:"lazy" });

  // สถานะ
  const st = statusInfo(book["สถานะ"]);
  const badge = el("span", { className:`badge badge--${st.cls}`, textContent: st.text });
  if (st.cls==="busy" || st.cls==="repair"){ badge.classList.add("badge--center"); wrap.classList.add(`tint--${st.cls}`); }
  wrap.append(img, badge);

  const meta = el("div", { className:"card__meta" });
  meta.innerHTML = `
    <div class="card__title">${book["ชื่อหนังสือ"]||"ไม่ทราบชื่อ"}</div>
    <div class="card__author">${book["ผู้แต่ง"]||""}</div>
  `;

  // ชิปหมวด + ดาว
  const row  = el("div", { className:"card__row" });
  const chip = el("span", { className:"card__chip", textContent:`หมวด ${code}` });
  const dot  = el("span", { className:"card__chip-dot" });
  const base = DOTS[code] || "#94a3b8";
  dot.style.background = base;
  chip.prepend(dot);
  chip.style.borderColor = base + "55";
  chip.style.background  = base + "14";
  row.append(chip, el("div", { className:"card__stars", textContent: star(book["คะแนน"]) }));
  meta.append(row);

  a.append(wrap, meta);
  return a;
}

(async function(){
  const p = new URLSearchParams(location.search);
  const code = (p.get("cat") || "").toUpperCase();

  // ตั้งหัวเรื่องตามหมวด
  const title = document.getElementById("catTitle");
  const sub   = document.getElementById("catSub");
  const color = DOTS[code] || "#6b7280";
  title.style.color = color;
  if ((/^\d{3}$/.test(code)) || LABELS[code]){
    const label = LABELS[code] || "";
    title.textContent = `หมวด ${code}${label?` (${label})`:''}`;
    sub.textContent   = "ค้นหา กรอง และเรียงหนังสือในหมวดนี้";
  }else{
    title.textContent = "รวมหนังสือตามหมวด";
    sub.textContent   = "ระบุ ?cat=000,100,... หรือคลิกหมวดจากหน้าแรก";
  }

  // เลือกแท็บจากพารามิเตอร์
  let tab = null;
  if (code==="NEW") tab = "newbook";
  else if (code==="REC") tab = "rec";
  else if (/^\d{3}$/.test(code)) tab = code;

  const grid   = q("#grid");
  const empty  = q("#empty");
  const count  = q("#count");
  const qInput = q("#q");
  const selStatus = q("#status");
  const selSort   = q("#sort");
  const pager     = q("#pager");
  const btnSearch = q("#btnSearch");

  let rows = [];
  let current = [];
  let page = 1;
  const PER = 24;

  function buildPager(maxPage){
    if (!pager) return;
    pager.innerHTML = "";
    if (maxPage <= 1) return;

    const btn = (label, target, opts={})=>{
      const b = el("button", {className:"page-btn", textContent:label});
      if (opts.disabled) b.disabled = true;
      if (opts.active)   b.classList.add("active");
      b.onclick = ()=>{ page = target; renderPage(); };
      return b;
    };

    pager.appendChild(btn("‹", Math.max(1, page-1), {disabled: page===1}));
    for (let i=1; i<=maxPage; i++){
      pager.appendChild(btn(String(i), i, {active:i===page}));
    }
    pager.appendChild(btn("›", Math.min(maxPage, page+1), {disabled: page===maxPage}));
  }

  function renderPage(){
    const total = current.length;
    const maxPage = Math.max(1, Math.ceil(total / PER));
    page = Math.max(1, Math.min(page, maxPage));

    const start = (page-1) * PER;
    const end   = Math.min(start + PER, total);

    grid.innerHTML = "";
    current.slice(start, end).forEach(b => grid.appendChild(card(b)));

    count.textContent = total ? `${start+1}–${end} จาก ${total} รายการ` : "0 รายการ";
    empty.style.display = total ? "none" : "block";
    buildPager(maxPage);
  }

  async function apply(){
    const kw = (qInput.value || "").trim().toLowerCase();
    const stWant = selStatus.value;

    const matchRow = (r) => {
      const hay = [
        r["ชื่อหนังสือ"]||"", r["ผู้แต่ง"]||"", r["เลขหมวดหมู่"]||"", r["คำอธิบาย"]||""
      ].join(" ").toLowerCase();
      if (kw && !hay.includes(kw)) return false;
      if (stWant !== "" && String(r["สถานะ"]||"") !== stWant) return false;
      return true;
    };

    // กรองจากผลที่โหลดไว้
    current = rows.filter(matchRow);

    // เรียง
    if (selSort.value === "title"){
      current.sort((a,b)=> (a["ชื่อหนังสือ"]||"").localeCompare(b["ชื่อหนังสือ"]||""));
    }else if (selSort.value === "author"){
      current.sort((a,b)=> (a["ผู้แต่ง"]||"").localeCompare(b["ผู้แต่ง"]||""));
    }else{
      current.sort((a,b)=> Number(b["คะแนน"]||0) - Number(a["คะแนน"]||0));
    }

    page = 1; 
    renderPage();
  }

  // โหลดหมวด (ถ้ามี)
  if (!tab){
    q("#error").style.display = "block";
    q("#error").textContent = "โปรดระบุ ?cat=000 … 900 / NEW / REC";
  }else{
    try{
      rows = await loadTab(tab);
    }catch(e){
      q("#error").style.display = "block";
      q("#error").textContent = "โหลดข้อมูลไม่ได้";
      rows = [];
    }
    await apply();
  }

  // กด Enter / ปุ่มค้นหา / เปลี่ยนตัวกรอง
  qInput.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); apply(); }});
  btnSearch && btnSearch.addEventListener("click", apply);
  qInput.addEventListener("input", ()=>{ if (!qInput.value) apply(); });
  selStatus.addEventListener("change", apply);
  selSort.addEventListener("change", apply);
})();
