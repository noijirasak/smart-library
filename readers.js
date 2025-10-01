// readers.js — จัดอันดับรวมทุกห้อง (no grade filter)
"use strict";

// === CONFIG ===
const SHEET_ID  = "1agyu31GI2YGD-42in3P7hZytsKNO-kg-JDdfvlJL7q0"; // ของคุณเดิม
const SHEET_TAB = "readers";

// คีย์ที่รองรับ (ยืดหยุ่นหัวคอลัมน์)
const WANT = {
  "ลำดับ": "ลำดับ",
  "ชื่อ": "ชื่อ",
  "ห้อง": "ห้อง",
  "ชั้น": "ห้อง",                // ถ้าใช้คำว่า "ชั้น" ให้แม็ปเป็น "ห้อง"
  "รูป": "รูป",

  // << เพิ่มรองรับหัวคอลัมน์ยอดยืมทุกรูปแบบ >>
  "เล่ม": "เล่ม",
  "ยอดยืม(เล่ม)": "เล่ม",
  "ยอดยืมเล่ม": "เล่ม",          // หลังตัดวงเล็บ/ช่องว่างจะเหลือแบบนี้
  "ยอดยืม": "เล่ม",

  "เวลาฟังนาที": "เวลาฟังนาที",
  "แต้ม": "แต้ม",
  "เหรียญ": "เหรียญ",
  "อัปเดต": "อัปเดต"
};


// ===== Helpers =====
const $ = id => document.getElementById(id);
const els = { grid: $("grid"), tbody: $("tbody"), tableWrap: $("tableWrap"), err: $("error") };

// --- แทนที่ฟังก์ชันเดิม ---
const normKey = s =>
  String(s || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")   // ลบอักขระซ่อน
    .replace(/[()\s._\-\/\\]/g, "")          // ลบวงเล็บ/ช่องว่าง/ขีด/จุด/สแลช
    .trim()
    .toLowerCase();

function remapRowKeys(row){
  const out = {}, wantNorm = {};
  Object.keys(WANT).forEach(k => wantNorm[normKey(k)] = WANT[k]);
  for (const k in row) {
    const kn = normKey(k);
    const t = wantNorm[kn];
    if (t) out[t] = (row[k] ?? "").toString().trim();
  }
  return out;
}
const csvUrl = (tab) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}&cachebust=${Date.now()}`;

function loadTab(tab){
  return new Promise((resolve, reject) => {
    Papa.parse(csvUrl(tab), {
      download:true, header:true, skipEmptyLines:true,
      complete: res => resolve((res.data||[]).map(remapRowKeys)),
      error: err => reject(err)
    });
  });
}

// ตัวอย่างถ้าดึงชีตไม่สำเร็จ
function sample(){
  return [
    {ลำดับ:"1",ชื่อ:"กานต์ ชาญฉลาด",ห้อง:"ม.3/1",รูป:"",เล่ม:"42",แต้ม:"1280",เหรียญ:"ทอง",อัปเดต:"2025-08-01"},
    {ลำดับ:"2",ชื่อ:"พลอย พิชิตปัญญา",ห้อง:"ม.2/3",รูป:"",เล่ม:"37",แต้ม:"1105",เหรียญ:"เงิน",อัปเดต:"2025-08-01"},
    {ลำดับ:"3",ชื่อ:"ภาคิน รักอ่าน",ห้อง:"ม.5/2",รูป:"",เล่ม:"33",แต้ม:"980",เหรียญ:"ทองแดง",อัปเดต:"2025-08-01"},
    {ลำดับ:"4",ชื่อ:"มิว นิษฐา",ห้อง:"ม.1/1",รูป:"",เล่ม:"28",แต้ม:"840",เหรียญ:"",อัปเดต:"2025-08-01"},
    {ลำดับ:"5",ชื่อ:"เจ เจตริน",ห้อง:"ม.6/1",รูป:"",เล่ม:"25",แต้ม:"790",เหรียญ:"",อัปเดต:"2025-08-01"},
  ];
}

function makeInitial(name){
  const parts = (name||"").split(/\s+/);
  const a = parts[0]?.[0]||"?", b = parts[1]?.[0]||"";
  return (a+b).toUpperCase();
}

const toNum = v => {
  const n = Number(String(v).replace(/[^\d.-]/g,""));
  return Number.isFinite(n) ? n : 0;
};
const scoreOf = r => toNum(r.แต้ม ?? r["เวลาฟังนาที"] ?? 0); // ใช้แต้มถ้ามี ไม่งั้นใช้เวลาฟัง
const hasPoint = rows => rows.some(r => String(r.แต้ม||"").trim() !== "");

// ===== Render =====
function renderGrid(rows){
  els.grid.innerHTML = "";
  const maxBooks = Math.max(...rows.map(r=>toNum(r.เล่ม)), 1);
  const scoreName = hasPoint(rows) ? "แต้ม" : "เวลาฟัง";
  rows.forEach((r,i)=>{
    const rank = i+1;
    const medal = rank===1?'rank-1':rank===2?'rank-2':rank===3?'rank-3':'';
    const cover = r.รูป
      ? `<img class="avatar" src="${r.รูป}" alt="${r.ชื่อ}">`
      : `<div class="avatar" style="display:flex;align-items:center;justify-content:center;font-weight:900">${makeInitial(r.ชื่อ)}</div>`;
    const p = Math.round((toNum(r.เล่ม)/maxBooks)*100);
    const badge = r.เหรียญ ? `<span class="badge gold">${r.เหรียญ}</span>` : "";
    const scoreVal = scoreOf(r);
    const scoreUnit = hasPoint(rows) ? "" : " นาที";

    const card = document.createElement("article");
    card.className = "lb-card";
    card.innerHTML = `
      <span class="rank-badge ${medal}">#${rank}</span>
      <div class="row">
        ${cover}
        <div class="info">
          <h3 class="name">${r.ชื่อ||"-"}</h3>
          <div class="meta">${r.ห้อง||""}</div>
          <div class="badges">
            <span class="pill-small">เล่ม: <strong>${toNum(r.เล่ม)}</strong></span>
            <span class="pill-small">${scoreName}: <strong>${scoreVal.toLocaleString("th-TH")}</strong>${scoreUnit}</span>
            ${badge}
          </div>
        </div>
      </div>
      <div class="bar" title="${p}% ของผู้ที่มากที่สุด"><span style="width:${p}%"></span></div>
    `;
    els.grid.appendChild(card);
  });
}

function renderTable(rows){
  const scoreName = hasPoint(rows) ? "แต้ม" : "เวลาฟัง (นาที)";
  $("tbody").innerHTML = rows.map((r,i)=>`
    <tr>
      <td>${i+1}</td>
      <td>${r.ชื่อ||"-"}</td>
      <td>${r.ห้อง||""}</td>
      <td style="font-weight:800">${toNum(r.เล่ม)}</td>
      <td>${scoreOf(r).toLocaleString("th-TH")}</td>
      <td>${r.เหรียญ||""}</td>
    </tr>`).join("");
  // ปรับหัวคอลัมน์คอลัมน์ที่ 5 ให้ตรงชนิดคะแนน
  const ths = document.querySelectorAll("thead th");
  if (ths[4]) ths[4].textContent = scoreName;
}

function updateStats(rows){
  const totalBooks = rows.reduce((s,r)=>s+toNum(r.เล่ม),0);
  const totalScore = rows.reduce((s,r)=>s+scoreOf(r),0);
  $("stat-people").textContent = rows.length.toLocaleString("th-TH");
  $("stat-books").textContent  = totalBooks.toLocaleString("th-TH");
  $("stat-min").textContent    = totalScore.toLocaleString("th-TH");
  // สลับ label สถิติช่องที่ 3
  const lbl = document.querySelector(".stats .stat:nth-child(3) .lbl");
  if (lbl) lbl.textContent = hasPoint(rows) ? "แต้มรวม" : "เวลาฟังรวม (นาที)";
}

// ===== View model =====
function applyFilters(rows){
  const q = $("q").value.trim().toLowerCase();
  let out = rows.slice();
  if(q) out = out.filter(r => (`${r.ชื่อ||""} ${r.ห้อง||""}`).toLowerCase().includes(q));
  // จัดอันดับรวม: เล่ม (desc) → แต้ม/เวลาฟัง (desc)
  out.sort((a,b)=> toNum(b.เล่ม) - toNum(a.เล่ม) || scoreOf(b) - scoreOf(a));
  return out;
}

async function refresh(){
  try{
    let rows = await loadTab(SHEET_TAB);
    if(!rows.length) rows = sample();
    const view = applyFilters(rows);
    renderGrid(view);
    renderTable(view);
    updateStats(view);
    els.err.hidden = true;
  }catch(e){
    const view = applyFilters(sample());
    renderGrid(view); renderTable(view); updateStats(view);
    els.err.hidden = false; els.err.textContent = "โหลดข้อมูลจากชีตไม่สำเร็จ แสดงข้อมูลตัวอย่างแทน";
  }
}

// === Events ===
window.addEventListener("DOMContentLoaded", ()=>{
  $("q").addEventListener("input", refresh);
  $("viewCard").addEventListener("click", ()=>{
    els.tableWrap.hidden = true; $("grid").style.display = ""; refresh();
    $("viewCard").classList.remove("btn-ghost");
    $("viewTable").classList.add("btn-ghost");
  });
  $("viewTable").addEventListener("click", ()=>{
    els.tableWrap.hidden = false; $("grid").style.display = "none"; refresh();
    $("viewTable").classList.remove("btn-ghost");
    $("viewCard").classList.add("btn-ghost");
  });
  $("btnPrint").addEventListener("click", e=>{ e.preventDefault(); window.print(); });
  refresh();
});
