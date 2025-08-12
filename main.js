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
const elGrid = document.getElementById('links-grid');
function youtubeId(url){ try{ const u=new URL(url); if(u.hostname.includes('youtu.be')) return u.pathname.slice(1); if(u.searchParams.get('v')) return u.searchParams.get('v'); const p=u.pathname.split('/'); const i=p.indexOf('embed'); if(i>=0&&p[i+1]) return p[i+1]; return ''; } catch { return ''; } }
function renderLinks(){
  let items=[...state.links];
  items.sort((a,b)=>b.createdAt-a.createdAt);
  elGrid.innerHTML = items.map(it=>{
    const id=youtubeId(it.url);
    const thumb=id?`https://img.youtube.com/vi/${id}/hqdefault.jpg`:'';
    const title = it.title || 'Video';
    return `<article class=\"link-card fade-in\"><div class=\"font-medium mb-2\">${title}</div><img class=\"thumb mb-2\" src=\"${thumb}\" alt=\"${title}\"/><div class=\"flex items-start justify-between gap-3\"><div class=\"min-w-0\"><div class=\"text-sm muted truncate\">${new URL(it.url).hostname}</div></div><div class=\"shrink-0 flex gap-2\"><button class=\"p-2 rounded-md border btn\" style=\"border-color: var(--border)\" data-act=\"open\" data-id=\"${it.id}\" title=\"Abrir\"><i data-lucide=\"external-link\"></i></button><button class=\"p-2 rounded-md border btn\" style=\"border-color: var(--border)\" data-act=\"copy\" data-id=\"${it.id}\" title=\"Copiar URL\"><i data-lucide=\"copy\"></i></button><button class=\"p-2 rounded-md border btn\" style=\"border-color: var(--border)\" data-act=\"del\" data-id=\"${it.id}\" title=\"Eliminar\"><i data-lucide=\"trash-2\"></i></button></div></div></article>`;
  }).join('');
  window.lucide?.createIcons();
  // Ya no se edita el nombre inline, solo se muestra
  elGrid.querySelectorAll('button[data-act]').forEach(btn=>{
    const id=btn.getAttribute('data-id');
    const act=btn.getAttribute('data-act');
    const item=state.links.find(x=>String(x.id)===String(id));
    if(!item) return;
    btn.addEventListener('click', async()=>{
      if(act==='open') window.open(item.url,'_blank');
      if(act==='copy') await navigator.clipboard.writeText(item.url);
      if(act==='del'){
        const input = prompt('Ingrese clave para borrar:');
        if (input == null) return;
        const enteredHash = await sha256Hex(input.trim());
        const stored = localStorage.getItem('admin_key_hash')||'';
        const ADMIN_DEFAULT_HASH = 'e5df1f6c87fb7efb1f0b32e2b2043614c0f8ea4b5ddfbc89d4b6ff94a639a6a0';
        const candidates = [item.owner||'', stored||'', ADMIN_DEFAULT_HASH];
        const authorized = candidates.filter(Boolean).includes(enteredHash);
        if (!authorized) { alert('No autorizado para borrar'); return; }
        if (!stored) localStorage.setItem('admin_key_hash', enteredHash);
        state.links=state.links.filter(x=>x.id!==item.id);
        localStorage.setItem('yt_links', JSON.stringify(state.links));
        renderLinks();
      }
    });
  });
}
// Configuración de clave de administrador (guardada localmente)
async function sha256Hex(str){
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
window.setAdminKey = async function(pwd){
  const hash = await sha256Hex(String(pwd||''));
  localStorage.setItem('admin_key_hash', hash);
  console.log('[links] admin key hash set');
};

document.getElementById('btn-add-link').addEventListener('click', async()=>{
  const stored = localStorage.getItem('admin_key_hash');
  if (!stored) { alert('Clave no configurada. Desde este navegador, ejecutá en consola: setAdminKey("5991")'); return; }
  const input = prompt('Ingrese clave para añadir videos:');
  if (input == null) return; // cancelado
  try {
    const hash = await sha256Hex(input.trim());
    if (hash !== stored) { alert('Clave incorrecta'); return; }
  } catch { alert('Error validando clave'); return; }
  const title=document.getElementById('yt-title').value.trim();
  const url=document.getElementById('yt-url').value.trim();
  const id=youtubeId(url);
  if(!id){ alert('URL de YouTube inválida'); return; }
  state.links.unshift({ id: Date.now(), url, title, tags:[], createdAt: Date.now(), owner: localStorage.getItem('admin_key_hash')||'' });
  localStorage.setItem('yt_links', JSON.stringify(state.links));
  document.getElementById('yt-title').value='';
  document.getElementById('yt-url').value='';
  renderLinks();
});
renderLinks();

// QR
function getQrCanvas(){ return document.getElementById('qr-canvas'); }
function getQrLib(){
  if (window.QRCode && typeof window.QRCode.toCanvas === 'function') return window.QRCode;
  if (window.qrcode && typeof window.qrcode.toCanvas === 'function') return window.qrcode;
  return null;
}
function ensureQRCode(){
  return new Promise((resolve)=>{
    if (getQrLib()) { console.log('[qr] QRCode ya disponible'); return resolve(); }
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/qrcode@1.5.3/build/qrcode.min.js';
    s.onload = () => { console.log('[qr] librería QRCode cargada por unpkg'); resolve(); };
    s.onerror = () => { console.error('[qr] error cargando librería QRCode'); resolve(); };
    document.head.appendChild(s);
  });
}
function qrToCanvas(canvas, text, opts){
  return new Promise((resolve, reject)=>{
    try { const lib = getQrLib(); lib.toCanvas(canvas, text, opts, (err)=>{ if (err) reject(err); else resolve(); }); }
    catch(e){ reject(e); }
  });
}
async function drawQR(){
  console.log('[qr] drawQR start');
  try { await ensureQRCode(); } catch(e){ console.error('[qr] ensure error', e); }
  const text=document.getElementById('qr-url')?.value?.trim() || '';
  const size=256;
  const margin=2;
  const canvas = getQrCanvas();
  if (!canvas) { console.error('[qr] canvas no encontrado'); return; }
  canvas.width=size; canvas.height=size;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  canvas.style.zIndex = '2';
  const lib = getQrLib();
  console.log('[qr] libs', { QRCode: typeof window.QRCode, qrcode: typeof window.qrcode, hasLib: !!lib });
  if (!lib) {
    console.warn('[qr] librería QR no disponible; uso fallback imagen');
    await drawQrViaImage(canvas, text, size, margin);
    return;
  }
  console.log('[qr] drawing to canvas', { text, size, margin, canvas: !!canvas, lib: !!lib });
  try {
    await qrToCanvas(canvas, text, { width:size, margin, color:{ dark:'#e5e7eb', light:'#0b1020' } });
    console.log('[qr] drawQR done');
  }
  catch(err){ console.error('[qr] error', err); }
}

async function drawQrViaImage(canvas, text, size, margin){
  try {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=${margin}&data=${encodeURIComponent(text)}`;
    console.log('[qr] fallback url', url);
    await new Promise((resolve, reject)=>{
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,size,size); ctx.drawImage(img,0,0,size,size); console.log('[qr] fallback draw done'); resolve(); };
      img.onerror = (e) => { console.error('[qr] fallback image error', e); reject(e); };
      img.src = url;
    });
  } catch (e) {
    console.error('[qr] fallback failed', e);
  }
}
document.getElementById('btn-gen-qr').addEventListener('click', () => { console.log('[qr] click generar'); drawQR(); });
window.addEventListener('load', () => { drawQR(); });

// Changelog modal
(function initChangelog(){
  const btn = document.getElementById('btn-changelog');
  const modal = document.getElementById('modal-changelog');
  const overlay = document.getElementById('modal-changelog-overlay');
  const btnClose = document.getElementById('btn-close-changelog');
  if (!btn || !modal) return;
  function open(){ modal.classList.remove('hidden'); window.lucide?.createIcons(); }
  function close(){ modal.classList.add('hidden'); }
  btn.addEventListener('click', open);
  overlay?.addEventListener('click', close);
  btnClose?.addEventListener('click', close);
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') close(); });
})();
