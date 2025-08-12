// Inicialización de iconos Lucide
document.addEventListener('DOMContentLoaded', () => { window.lucide?.createIcons(); console.log('[app] DOMContentLoaded'); });

// Helpers de secciones
const sections = { formulario: sec('formulario'), links: sec('links'), qr: sec('qr') };
function sec(id){ return document.getElementById('sec-' + id); }
function switchTo(target){
  Object.keys(sections).forEach(k => sections[k].classList.toggle('hidden', k!==target));
  const active = sections[target];
  if (active) {
    active.classList.remove('fade-in');
    void active.offsetWidth;
    active.classList.add('fade-in');
  }
  closeDrawer();
}

// Navegación en drawer
const navEl = document.querySelector('#app-drawer nav');
navEl?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-section]');
  if (!btn) return;
  const target = btn.getAttribute('data-section');
  switchTo(target);
  closeDrawer();
});

document.querySelectorAll('#app-drawer [data-section]')
  .forEach(b => b.addEventListener('click', () => { closeDrawer(); }));

// Drawer: un solo botón en el header que alterna entre menu/x
const drawerEl = document.getElementById('app-drawer');
const drawerBtn = document.getElementById('btn-drawer');

function isDrawerOpen(){ return !drawerEl.classList.contains('translate-x-full'); }
function setDrawerIcon(){
  if (!drawerBtn) return;
  const iconName = isDrawerOpen() ? 'x' : 'menu';
  drawerBtn.innerHTML = '';
  const i = document.createElement('i');
  i.setAttribute('data-lucide', iconName);
  drawerBtn.appendChild(i);
  window.lucide?.createIcons();
}
function openDrawer(){ drawerEl.classList.remove('translate-x-full'); setDrawerIcon(); }
function closeDrawer(){ drawerEl.classList.add('translate-x-full'); setDrawerIcon(); }

drawerBtn?.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); isDrawerOpen() ? closeDrawer() : openDrawer(); });

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
new MutationObserver(setDrawerIcon).observe(drawerEl, { attributes: true, attributeFilter: ['class'] });
setDrawerIcon();

// Tabs con animación
const tabs = ['tab-personales','tab-medica','tab-experiencia'];
let currentTabIndex = 0;
function showTab(i){
  currentTabIndex = Math.max(0, Math.min(tabs.length-1, i));
  tabs.forEach((id,idx)=>{ document.getElementById(id).classList.toggle('hidden', idx!==currentTabIndex) });
  document.querySelectorAll('.tab-btn').forEach((b,idx)=>b.setAttribute('aria-selected', String(idx===currentTabIndex)));
  const shown=document.getElementById(tabs[currentTabIndex]);
  if (shown) { shown.classList.remove('fade-in'); void shown.offsetWidth; shown.classList.add('fade-in'); }
}
document.querySelectorAll('.tab-btn').forEach((b,i)=>b.addEventListener('click',()=>showTab(i)));
document.getElementById('btn-prev').addEventListener('click',()=>showTab(currentTabIndex-1));
document.getElementById('btn-next').addEventListener('click',()=>showTab(currentTabIndex+1));
showTab(0);

// Links YouTube
const state = { links: JSON.parse(localStorage.getItem('yt_links')||'[]') };
const elGrid = document.getElementById('links-grid'), elSearch = document.getElementById('links-search'), elTag = document.getElementById('links-tag'), elOrder = document.getElementById('links-order');
function youtubeId(url){ try{ const u=new URL(url); if(u.hostname.includes('youtu.be')) return u.pathname.slice(1); if(u.searchParams.get('v')) return u.searchParams.get('v'); const p=u.pathname.split('/'); const i=p.indexOf('embed'); if(i>=0&&p[i+1]) return p[i+1]; return ''; } catch { return ''; } }
function renderLinks(){
  let items=[...state.links];
  const q=elSearch.value.trim().toLowerCase();
  if(q) items = items.filter(it => (it.title||'').toLowerCase().includes(q) || (it.url||'').toLowerCase().includes(q));
  const tag=elTag.value;
  if(tag) items = items.filter(it => (it.tags||[]).includes(tag));
  if(elOrder.value==='date_desc') items.sort((a,b)=>b.createdAt-a.createdAt); else items.sort((a,b)=>a.createdAt-b.createdAt);
  const tags=new Set(items.flatMap(it=>it.tags||[]));
  const prev=elTag.value;
  elTag.innerHTML='<option value="">Todas las etiquetas</option>'+[...tags].map(t=>`<option ${t===prev?'selected':''} value="${t}">${t}</option>`).join('');
  elGrid.innerHTML = items.map(it=>{
    const id=youtubeId(it.url);
    const thumb=id?`https://img.youtube.com/vi/${id}/hqdefault.jpg`:'';
    return `<article class="link-card fade-in"><img class="thumb mb-2" src="${thumb}" alt="${it.title||'Video'}"/><div class="flex items-start justify-between gap-3"><div class="min-w-0"><div class="font-medium truncate">${it.title||'Video de YouTube'}</div><div class="text-sm muted truncate">${new URL(it.url).hostname}</div>${it.tags?.length?`<div class="mt-1">${it.tags.map(t=>`<span class="chip">${t}</span>`).join(' ')}</div>`:''}</div><div class="shrink-0 flex gap-2"><button class="p-2 rounded-md border btn" style="border-color: var(--border)" data-act="open" data-id="${it.id}" title="Abrir"><i data-lucide="external-link"></i></button><button class="p-2 rounded-md border btn" style="border-color: var(--border)" data-act="copy" data-id="${it.id}" title="Copiar URL"><i data-lucide="copy"></i></button><button class="p-2 rounded-md border btn" style="border-color: var(--border)" data-act="del" data-id="${it.id}" title="Eliminar"><i data-lucide="trash-2"></i></button></div></div></article>`;
  }).join('');
  window.lucide?.createIcons();
  elGrid.querySelectorAll('button[data-act]').forEach(btn=>{
    const id=btn.getAttribute('data-id');
    const act=btn.getAttribute('data-act');
    const item=state.links.find(x=>String(x.id)===String(id));
    if(!item) return;
    btn.addEventListener('click', async()=>{
      if(act==='open') window.open(item.url,'_blank');
      if(act==='copy') await navigator.clipboard.writeText(item.url);
      if(act==='del'){
        state.links=state.links.filter(x=>x.id!==item.id);
        localStorage.setItem('yt_links', JSON.stringify(state.links));
        renderLinks();
      }
    });
  });
}
document.getElementById('btn-add-link').addEventListener('click', async()=>{
  const url=document.getElementById('yt-url').value.trim();
  const id=youtubeId(url);
  if(!id){ alert('URL de YouTube inválida'); return; }
  state.links.unshift({ id: Date.now(), url, title:'', tags:[], createdAt: Date.now() });
  localStorage.setItem('yt_links', JSON.stringify(state.links));
  document.getElementById('yt-url').value='';
  renderLinks();
});
elSearch.addEventListener('input', renderLinks); elTag.addEventListener('change', renderLinks); elOrder.addEventListener('change', renderLinks); renderLinks();

// QR
const qrCanvas=document.getElementById('qr-canvas');
function ensureQRCode(){
  return new Promise((resolve)=>{
    if (window.QRCode || window.qrcode) { console.log('[qr] QRCode ya disponible', typeof window.QRCode); return resolve(); }
    const startedAt = Date.now();
    const check = () => {
      if (window.QRCode || window.qrcode) { console.log('[qr] QRCode detectado tras', Date.now()-startedAt, 'ms'); return resolve(); }
      if (Date.now() - startedAt > 4000) {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
        s.onload = () => { console.log('[qr] librería QRCode cargada por inyección'); resolve(); };
        document.head.appendChild(s);
        return;
      }
      requestAnimationFrame(check);
    };
    check();
  });
}
function qrToCanvas(canvas, text, opts){
  return new Promise((resolve, reject)=>{
    try { (window.QRCode || window.qrcode).toCanvas(canvas, text, opts, (err)=>{ if (err) reject(err); else resolve(); }); }
    catch(e){ reject(e); }
  });
}
async function drawQR(){
  console.log('[qr] drawQR start');
  try { await ensureQRCode(); } catch(e){ console.error('[qr] ensure error', e); }
  const text=document.getElementById('qr-url').value.trim();
  const size=256;
  const margin=2;
  qrCanvas.width=size; qrCanvas.height=size;
  qrCanvas.style.width = size + 'px';
  qrCanvas.style.height = size + 'px';
  qrCanvas.style.zIndex = '2';
  const lib = window.QRCode || window.qrcode;
  console.log('[qr] libs', { QRCode: typeof window.QRCode, qrcode: typeof window.qrcode });
  if (!lib) { console.error('[qr] librería QR no disponible'); return; }
  console.log('[qr] drawing to canvas', { text, size, margin, canvas: !!qrCanvas, lib: !!lib });
  try { 
    await qrToCanvas(qrCanvas, text, { width:size, margin, color:{ dark:'#e5e7eb', light:'#0b1020' } });
    console.log('[qr] drawQR done');
  }
  catch(err){ console.error('[qr] error', err); }
}
document.getElementById('btn-gen-qr').addEventListener('click', () => { console.log('[qr] click generar'); drawQR(); });
window.addEventListener('load', () => { drawQR(); });
