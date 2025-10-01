// ===== Config =====
const SHEET_ID  = "1agyu31GI2YGD-42in3P7hZytsKNO-kg-JDdfvlJL7q0";
const TABS      = ["000","100","200","300","400","500","600","700","800","900"];
const LABELS    = {
  "000":"ความรู้ทั่วไป","100":"จิตวิทยา","200":"ศาสนา","300":"สังคมศาสตร์","400":"ภาษา",
  "500":"วิทยาศาสตร์","600":"วิทยาศาสตร์ประยุกต์","700":"ศิลปะและนันทนาการ","800":"วรรณกรรม","900":"ภูมิศาสตร์/ประวัติศาสตร์"
};
const ICONS = {
  "REC":"🌟",
  "NEW":"🆕",
  "000":"📘",  // ความรู้ทั่วไป
  "100":"🧠",  // จิตวิทยา
  "200":"🛕",  // ศาสนา
  "300":"🌐",  // สังคมศาสตร์
  "400":"🔤",  // ภาษา
  "500":"🔬",  // วิทยาศาสตร์
  "600":"🛠️",  // วิทยาศาสตร์ประยุกต์
  "700":"🎨",  // ศิลปะและนันทนาการ
  "800":"📖",  // วรรณกรรม
  "900":"🗺️"   // ภูมิศาสตร์/ประวัติศาสตร์
};

// สีจุดหัวเรื่องแยกหมวดนิด ๆ
const DOTS = {
  "REC":"gold","NEW":"#ffd166",
  "000":"#06b6d4",   // ➜ ฟ้าอมเขียว (teal)
  "100":"#8b5cf6",   // ➜ ม่วง (violet) << เปลี่ยนจากฟ้าเดิม
  "200":"#f59e0b","300":"#10b981","400":"#fb7185",
  "500":"#3b82f6","600":"#f43f5e","700":"#fbbf24",
  "800":"#a78bfa","900":"#84cc16"
};

// ===== UTIL =====
const q = (s, el=document)=>el.querySelector(s);
const el = (tag, attrs={}) => Object.assign(document.createElement(tag), attrs);

// ทำสีเข้ม/อ่อนได้จาก hex เช่น shade('#60a5fa', -20)
function shade(hex, percent){
  try{
    const f = parseInt(hex.replace('#',''),16);
    const t = percent < 0 ? 0 : 255;
    const p = Math.abs(percent)/100;
    const R = f>>16, G = f>>8 & 0x00FF, B = f & 0x0000FF;
    const to = (c)=>Math.round((t-c)*p)+c;
    return "#" + (0x1000000 + (to(R))*0x10000 + (to(G))*0x100 + (to(B))).toString(16).slice(1);
  }catch(e){ return hex; }
}

function shuffle(arr){
  // Fisher–Yates
  for(let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function csvUrl(tab){
  // endpoint มาตรฐานของ Google Sheets CSV
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}&cache=${Date.now()}`;
}
function normKey(s){ return (s||"").replace(/[\u200B-\u200D\uFEFF]/g,"").replace(/\s+/g,"").trim(); }
function mapRow(row){
  const want = {
    "ลำดับ":"ลำดับ","ชื่อหนังสือ":"ชื่อหนังสือ","ผู้แต่ง":"ผู้แต่ง",
    "เลขหมวดหมู่":"เลขหมวดหมู่","คำอธิบาย":"คำอธิบาย",
    "รูปปก":"รูปปก","audio_url":"audio_url","คะแนน":"คะแนน","สถานะ":"สถานะ"
  };
  const out = {}, wn = {};
  Object.keys(want).forEach(k => wn[normKey(k)] = want[k]);
  for(const k in row){ 
    if (/สถานะ/.test(k)) { 
      out["สถานะ"] = (row[k] ?? "").toString().trim(); 
      continue; 
    }
    const kn = normKey(k);
    const t  = wn[kn];
    if (t) out[t] = (row[k] ?? "").toString().trim();
  }
  return out;
}
function statusInfo(v){
  const s = String(v||"").trim();
  if (s==="1") return { text:"ว่าง", cls:"ok" };
  if (s==="0") return { text:"ยืม", cls:"busy" };
  if (s==="3") return { text:"ซ่อม", cls:"repair" };
  return { text:"-", cls:"na" };
}

const star = n => "★".repeat(Number(n||0)).padEnd(5, "☆");

// ===== HERO demo banners (จะใช้ปกหนังสือท็อปจากบางหมวดก็ได้) =====
/* ใช้เป็นสำรอง ถ้าโหลดจากชีต post ไม่ได้ */
const HERO_FALLBACK = [
  {img:"img/bgtest.jpg", title:""},
  {img:"img/post2.jpg", title:""},
  {img:"https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1400&auto=format&fit=crop", title:""}
];


// ===== RENDER HERO =====
function renderHero(HERO){
  const wrap    = q("#heroSlides");
  const dots    = q("#heroDots");
  const titleEl = q("#heroTitle");
  const subEl   = q(".hero__subtitle");

  // เคลียร์ของเดิม (กันซ้ำเวลารีเฟรชสคริปต์)
  if (wrap) wrap.innerHTML = "";
  if (dots) dots.innerHTML = "";

  HERO.forEach((h,i)=>{
    const slide = el("div", { className:"hero__slide" });

    // ถ้ามีลิงก์ -> ห่อรูปด้วย <a> ให้คลิกได้; ถ้าไม่มี -> วางรูปตรง ๆ
    let host = slide;
    if (h.href){
      const a = el("a", { href:h.href, target:"_blank", rel:"noopener noreferrer", className:"hero__link", draggable:"false" });
      slide.appendChild(a);
      host = a;
  }

    const img = el("img", {
      src: h.img,
      alt: h.title || "",
      loading: "eager",
      referrerPolicy: "no-referrer",
      draggable: "false"
    });

    host.appendChild(img);
    wrap.appendChild(slide);

    const d = el("span"); if(i===0) d.classList.add("active");
    dots.appendChild(d);
  });

  let idx = 0, timer = null;

  function goto(i){
    idx = (i + HERO.length) % HERO.length;
    wrap.style.transform = `translateX(-${idx*100}%)`;
    if (titleEl) titleEl.textContent = HERO[idx].title || "";
    if (subEl)   subEl.textContent   = HERO[idx].subtitle || "";
    dots.querySelectorAll("span").forEach((n,k)=>n.classList.toggle("active", k===idx));
  }

  // ปุ่มเลื่อน
  q("#prevHero").onclick = ()=>{ goto(idx-1); resetTimer(); };
  q("#nextHero").onclick = ()=>{ goto(idx+1); resetTimer(); };

  // คลิกพื้นที่ตัวหนังสือฮีโร่ -> เปิดลิงก์ของสไลด์ปัจจุบัน (ถ้ามี)
  const overlay = q(".hero__overlay");
  if (overlay){
    overlay.addEventListener("click",(e)=>{
      if (e.target.closest("#prevHero, #nextHero")) return; // ไม่ทับปุ่ม
      const h = HERO[idx];
      if (h && h.href) window.open(h.href, "_blank", "noopener");
    });
  }

  function resetTimer(){
    if (timer) clearInterval(timer);
    timer = setInterval(()=>goto(idx+1), 6000);
  }

  resetTimer();
  goto(0);
}



// ===== แทนที่ฟังก์ชันเดิมทั้งหมด =====
async function loadHeroFromPost(){
  const clean = s => String(s ?? "").replace(/[\u200B-\u200D\uFEFF]/g,"").trim();
  const kNorm = s => clean(s).toLowerCase().replace(/\s+/g,"");

  const csv = await fetch(csvUrl("post")).then(r=>r.text());

  // -------- pass 1: มี header ปกติ --------
  const p1 = Papa.parse(csv, { header:true, skipEmptyLines:true });
  let items = (p1.data || []).map(scanRow).filter(Boolean);
  if (items.length){
    console.log("HERO items:", items);
    return items;
  }

  // -------- pass 2: ไม่มี/เพี้ยน header -> หาแถวหัวเอง --------
  const p2 = Papa.parse(csv, { header:false, skipEmptyLines:true });
  const rows = p2.data || [];

  // หา index แถวที่ดูเหมือนหัวคอลัมน์ที่สุด
  let headIdx = rows.findIndex(row => {
    const cells = (row || []).map(kNorm);
    return cells.some(s =>
      (s.includes("url") && (s.includes("ปก") || s.includes("cover"))) ||
      s.includes("รูป") || s.includes("ภาพ") || s === "cover"
    );
  });
  if (headIdx < 0) headIdx = 0;

  const headers = (rows[headIdx] || []).map(x => kNorm(x));
  for (let i = headIdx + 1; i < rows.length; i++){
    const obj = {};
    (rows[i] || []).forEach((v, idx) => obj[headers[idx] || `c${idx}`] = v);
    const one = scanRow(obj);
    if (one) items.push(one);
  }

  console.log("HERO items:", items);
  return items;

  // ---------- helper: ดึงค่าด้วย fuzzy key ----------
  function scanRow(row){
    if (!row) return null;
    const entries = Object.entries(row);

    const pick = (pred) => {
      for (const [k, v] of entries){
        const kk = kNorm(k);
        if (pred(kk)) return clean(v);
      }
      return "";
    };

    // รูป: ยอมรับหัวที่มี "url"+"ปก" หรือ "รูป"/"ภาพ"/"cover"
    const img = pick(kk =>
      (kk.includes("url") && (kk.includes("ปก") || kk.includes("cover"))) ||
      kk.includes("รูป") || kk.includes("ภาพ") || kk === "cover"
    );

    if (!/^https?:\/\//i.test(img)) return null; // ต้องเป็นลิงก์จริงเท่านั้น

    // ข้อความ: ยืดหยุ่นชื่อหัว
    const title = pick(kk =>kk.includes("ข้อความประกาศ") || kk.startsWith("ประกาศ") || kk.includes("title") || kk.includes("หัวข้อ"));
    const sub1  = pick(kk => /(ข้อความรอง1|รอง1|subtitle1|sub1)/.test(kk));
    const sub2  = pick(kk => /(ข้อความรอง2|รอง2|subtitle2|sub2)/.test(kk));
    
    const hrefRaw = pick(kk => /(ลิ้ง|ลิงก์|ลิงค์|link|href|ไปที่|target|ไปยัง)/.test(kk));
    const href    = (/^https?:\/\//i.test(hrefRaw) && hrefRaw !== img) ? hrefRaw : ""; 

    return { img, title, subtitle: [sub1, sub2].filter(Boolean).join("   "), href };
  }
}



// ===== LOAD ONE TAB =====
function loadTab(tab){
  return new Promise((res, rej)=>{
    Papa.parse(csvUrl(tab), {
      download:true, header:true, skipEmptyLines:true,
      complete: r => res((r.data||[]).map(mapRow)),
      error: rej
    });
  });
}

// ===== SECTION RENDER =====
function section(title, code){
  const sec = el("section", {className:"section"});
  if(code === 'NEW') sec.classList.add('section--featured'); 
  

  const head = el("div", {className:"section__head"});
  const cap  = el("div", {className:"section__title"});

  // สีอ้างอิงตามหมวด
  const base = DOTS[code] || "var(--accent)";
  const dark = shade(base, -28);

  // ไล่สีพื้นหลัง + ตัวอักษรขาว
  cap.style.background = `linear-gradient(90deg, ${base}, ${dark})`;
  cap.style.color = "#fff";
  cap.style.border = "none";

  // จุดสี
  const dot = el("span", {className:"section__dot"});
  dot.style.background = base;

  // ไอคอนหมวด
  const ico = el("span", {className:"section__ico", textContent: ICONS[code] || "📚"});

  // ป้ายชื่อ (โชว์ code เฉพาะ 000–900)
  const isNumCat = /^\d{3}$/.test(code);
  const label = el("span", {className:"section__label"});
  label.textContent = ` ${isNumCat ? code + ' ' : ''}${title}`;

  cap.append(dot, ico, label);

  const more = el("a", {
  className:"section__more",
  href:`cat.html?cat=${code}`,
  textContent:"More ›"
});
  head.append(cap, more);

  const rail = el("div", {className:"rail", id:`rail-${code}`});
  sec.append(head, rail);
  return {sec, rail};
}


function card(book){
  const href = `book.html?id=${encodeURIComponent(book["ลำดับ"])}&cat=${encodeURIComponent(getCatCode(book["เลขหมวดหมู่"]))}`;
  const a = el("a", { className:"card", href, title:book["ชื่อหนังสือ"] });

  // ห่อรูปด้วย div เพื่อวาง badge ซ้อน
  const imgWrap = el("div", { style:"position:relative" });
  const img = el("img", {
    className:"card__cover",
    src:book["รูปปก"]||"",
    alt:book["ชื่อหนังสือ"],
    loading:"lazy"
  });

  // ป้ายสถานะ
  const st = statusInfo(book["สถานะ"]);
  const badge = el("span", { className:`badge badge--${st.cls}`, textContent: st.text });
  imgWrap.append(img, badge);

  const box = el("div", { className:"card__meta" });
  box.innerHTML = `
    <div class="card__title">${book["ชื่อหนังสือ"]||"ไม่ทราบชื่อ"}</div>
    <div class="card__author">${book["ผู้แต่ง"]||""}</div>
    
  `;
// ── ป้ายหมวด + ดาว (แถวเดียวกัน) ──
  const code = getCatCode(book["เลขหมวดหมู่"]);
  const base = DOTS[code] || "#94a3b8";

  const row   = el("div",  { className:"card__row" });
  const chip  = el("span", { className:"card__chip", textContent:`หมวด ${code}` });
  const dot   = el("span", { className:"card__chip-dot" });
  dot.style.background = base;
  chip.prepend(dot);

  // แต่งสี chip ตามหมวด (โทนอ่อนอ่านง่าย)
  chip.style.borderColor = base + "55";
  chip.style.background  = base + "14";

  const stars = el("div", { className:"card__stars", textContent: star(book["คะแนน"]) });

  row.append(chip, stars);
  box.append(row);
  a.append(imgWrap, box);

  return a;
}


// ดึงหลักร้อยจากเลขหมวด
function getCatCode(callNumber){
  const m = String(callNumber||"").match(/\d+(\.\d+)?/);
  if(!m) return "000";
  const n = Math.floor(parseFloat(m[0]));
  return String(Math.floor(n/100)*100).padStart(3,"0");
}

// ===== MAIN =====
(async function(){
  document.getElementById("year").textContent = new Date().getFullYear();
  let heroes = [];
  try { heroes = await loadHeroFromPost(); } catch(e) {}
  renderHero(heroes.length ? heroes : HERO_FALLBACK);
  const main = document.getElementById("sections");

  const {sec, rail} = section('หนังสือมาใหม่', 'NEW');
  main.appendChild(sec);
  try{
    const rows = await loadTab("newbook");
    rows.slice(0, 16).forEach(b => rail.appendChild(card(b)));
  }catch(e){ 
    const err = el("div", {style:"color:#f87171;padding:6px 2px"});
      err.textContent = "โหลด ‘หนังสือมาใหม่’ ไม่ได้";
      sec.appendChild(err);
  }

  {
    const {sec, rail} = section("แนะนำ", "REC");
    main.appendChild(sec);
    try{
      const rows = await loadTab("rec");     // << ชี้ไปที่ชีตใหม่
      rows.slice(0, 16).forEach(b => rail.appendChild(card(b)));
    }catch(e){
      const err = el("div", {style:"color:#f87171;padding:6px 2px"});
      err.textContent = "โหลด ‘หนังสือ’ ไม่ได้";
      sec.appendChild(err);
    }
  }

  for (const tab of TABS){
    // header + rail
    const {sec, rail} = section(LABELS[tab]||tab, tab);
    main.appendChild(sec);

    try{
      const rows = await loadTab(tab);
      // เลือกมาโชว์ 12–16 เล่มแรก (ถ้าอยากสุ่มให้เปลี่ยน logic ได้)
      shuffle(rows);
      rows.slice(0, 16).forEach(b => rail.appendChild(card(b)));
    }catch(e){
      const err = el("div", {style:"color:#f87171;padding:6px 2px"}); 
      err.textContent = "โหลดข้อมูลไม่ได้";
      sec.appendChild(err);
    }
  }
})();
