const KEY="motors_inventory_v1";
const THEME="motors_theme_v1";
let motors=JSON.parse(localStorage.getItem(KEY)||"[]");
let selected=new Set();
let activeScreen="home";

const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(n)||0);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const save=()=>localStorage.setItem(KEY,JSON.stringify(motors));
const toast=msg=>{const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1700)};

function showScreen(id){
  activeScreen=id;
  document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("active",s.id===id));
  document.querySelector(".nav-home").classList.toggle("active",id==="home");
  refresh();
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("[data-screen]").forEach(b=>b.addEventListener("click",()=>showScreen(b.dataset.screen)));
document.querySelectorAll(".back").forEach(b=>b.addEventListener("click",()=>showScreen("home")));
$("themeBtn").addEventListener("click",()=>{
  document.body.classList.toggle("dark");
  localStorage.setItem(THEME,document.body.classList.contains("dark")?"dark":"light");
});
if(localStorage.getItem(THEME)==="dark")document.body.classList.add("dark");

$("motorForm").addEventListener("submit",e=>{
  e.preventDefault();
  const motor={
    id:crypto.randomUUID?crypto.randomUUID():Date.now().toString(),
    make:$("make").value.trim(),
    model:$("model").value.trim(),
    year:$("year").value.trim(),
    description:$("description").value.trim(),
    buy:Number($("buyPrice").value)||0,
    sale:Number($("salePrice").value)||0
  };
  motors.push(motor);save();e.target.reset();refresh();toast("Motor saved");
  showScreen("home");
});

function makes(){
  return [...new Set(motors.map(m=>m.make.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
}
function fillSelect(id){
  const el=$(id), current=el.value;
  el.innerHTML='<option value="">ALL MAKES</option>'+makes().map(m=>`<option value="${esc(m)}">${esc(m)}</option>`).join("");
  el.value=makes().includes(current)?current:"";
}
function card(m,check=false){
  return `<article class="motor-card">
    <div class="motor-main">
      ${check?`<input class="motor-check" type="checkbox" data-check="${m.id}" ${selected.has(m.id)?"checked":""}>`:""}
      <div style="flex:1">
        <div class="motor-title">${esc(m.make)} ${esc(m.model)}</div>
        <div class="motor-meta">${esc(m.year||"Year not set")}</div>
        ${m.description?`<div class="motor-desc">${esc(m.description)}</div>`:""}
        <div class="prices">
          <span>BUY <b>${money(m.buy)}</b></span>
          <span>SALE <b>${money(m.sale)}</b></span>
        </div>
      </div>
    </div>
  </article>`;
}
function filtered(search,make){
  const q=(search||"").toLowerCase().trim();
  return motors.filter(m=>(!make||m.make===make)&&(!q||[m.make,m.model,m.year,m.description].join(" ").toLowerCase().includes(q)));
}
function renderList(id,items,check=false){
  $(id).innerHTML=items.length?items.map(m=>card(m,check)).join(""):`<div class="empty">NO MOTORS FOUND</div>`;
  if(check)document.querySelectorAll("[data-check]").forEach(x=>x.addEventListener("change",()=>{
    x.checked?selected.add(x.dataset.check):selected.delete(x.dataset.check);renderTicket();
  }));
}
function refresh(){
  $("motorCount").textContent=motors.length;
  $("inventoryValue").textContent=money(motors.reduce((a,m)=>a+m.sale,0));
  ["searchMake","buyMake","salesMake"].forEach(fillSelect);
  renderList("searchList",filtered($("searchInput").value,$("searchMake").value));
  const buys=filtered($("buySearch").value,$("buyMake").value);
  renderList("buyList",buys);$("buyTotal").textContent=money(buys.reduce((a,m)=>a+m.buy,0));
  const sales=filtered($("salesSearch").value,$("salesMake").value);
  renderList("salesList",sales);$("salesTotal").textContent=money(sales.reduce((a,m)=>a+m.sale,0));
  renderTicket();
}
["searchInput","searchMake","buySearch","buyMake","salesSearch","salesMake"].forEach(id=>$(id).addEventListener("input",refresh));

function renderTicket(){
  selected=new Set([...selected].filter(id=>motors.some(m=>m.id===id)));
  const byMake={};motors.forEach(m=>(byMake[m.make]??=[]).push(m));
  $("brandGroups").innerHTML=Object.keys(byMake).sort().map(make=>{
    const all=byMake[make].every(m=>selected.has(m.id));
    return `<div class="brand-group"><div class="brand-title">${esc(make)}</div><button class="brand-toggle ${all?"selected":""}" data-brand="${esc(make)}">${all?"✓ ":""}SELECT ${esc(make.toUpperCase())} (${byMake[make].length})</button></div>`;
  }).join("") || "";
  document.querySelectorAll("[data-brand]").forEach(b=>b.addEventListener("click",()=>{
    const list=byMake[b.dataset.brand], all=list.every(m=>selected.has(m.id));
    list.forEach(m=>all?selected.delete(m.id):selected.add(m.id));renderTicket();
  }));
  const items=motors.filter(m=>selected.has(m.id));
  renderList("ticketList",items,true);
  $("ticketCount").textContent=`${items.length} MOTOR${items.length===1?"":"S"}`;
  $("ticketTotal").textContent=money(items.reduce((a,m)=>a+m.sale,0));
}
$("selectAll").addEventListener("click",()=>{motors.forEach(m=>selected.add(m.id));renderTicket()});
$("clearTicket").addEventListener("click",()=>{selected.clear();renderTicket()});
$("previewBtn").addEventListener("click",()=>{
  const items=motors.filter(m=>selected.has(m.id));
  if(!items.length){toast("Select at least one motor");return}
  $("receipt").classList.toggle("hidden");
  $("receipt").innerHTML=`<h3>MOTORS</h3><div class="center">SALES TICKET</div><hr>
    ${items.map(m=>`<div class="receipt-row"><span>${esc(m.make)} ${esc(m.model)} x1</span><span>${money(m.sale)}</span></div>`).join("")}
    <hr><div class="receipt-row"><span>ITEMS</span><span>${items.length}</span></div>
    <div class="receipt-row receipt-total"><span>TOTAL</span><span>${money(items.reduce((a,m)=>a+m.sale,0))}</span></div>`;
});
refresh();
