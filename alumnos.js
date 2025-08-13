// Página de Alumnos: lista documentos de 'formularios' ordenados por nombre
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, collection, getDocs, query, orderBy, doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCSbupnAd-CH5aCi9b5CvILnIIE74D5M34',
  authDomain: 'golf-f3b84.firebaseapp.com',
  projectId: 'golf-f3b84',
  storageBucket: 'golf-f3b84.appspot.com',
  messagingSenderId: '179642241287',
  appId: '1:179642241287:web:c43bdb3d2a1dd37e95b5a2',
  measurementId: 'G-TXFF1RSFEG'
};

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);

async function ensureAuth(){
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
}

const ADMIN_CONFIG_REF = doc(db, 'config', 'admin');
function isSha256Hex(s){ return typeof s === 'string' && /^[a-f0-9]{64}$/i.test(String(s).trim()); }
async function fetchAdminKeyFromFirebase(){
  try {
    const snap = await getDoc(ADMIN_CONFIG_REF);
    if (!snap.exists()) return '';
    const data = snap.data() || {};
    return String((data.admin_key_hash ?? data.admin_key ?? '') || '').trim();
  } catch { return ''; }
}
function isAdminLocal(){ try { return localStorage.getItem('is_admin') === '1'; } catch { return false; } }
function setIsAdminLocal(flag){ try { localStorage.setItem('is_admin', flag ? '1' : ''); } catch {} }

function normalizeName(name){
  return String(name||'').trim();
}

function renderList(items){
  const ul = document.getElementById('alumnos-list');
  const count = document.getElementById('count');
  if (!ul) return;
  const rows = items.map((it, idx)=>{
    const nombre = normalizeName(it.nombre) || 'Sin nombre';
    return `<li><button class="w-full text-left font-medium" data-idx="${idx}">${nombre}</button></li>`;
  });
  ul.innerHTML = rows.join('');
  if (count) count.textContent = `${items.length} alumno${items.length===1?'':'s'}`;
  // Click: enviar datos al formulario en index
  ul.querySelectorAll('button[data-idx]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const idx = Number(btn.getAttribute('data-idx'));
      const selected = items[idx];
      try { localStorage.setItem('fill_form_data', JSON.stringify(selected||{})); } catch {}
      window.location.href = './';
    });
  });
}

function sortByNombreAsc(items){
  return [...items].sort((a,b)=>{
    const an = normalizeName(a.nombre).toLocaleLowerCase();
    const bn = normalizeName(b.nombre).toLocaleLowerCase();
    if (an < bn) return -1;
    if (an > bn) return 1;
    return 0;
  });
}

async function loadAlumnos(){
  try {
    // Guard: solo admin
    const ok = await ensureAdmin();
    if (!ok) return;
    await ensureAuth();
    // Intentar ordenar por campo 'nombre' desde Firestore (si el índice lo permite)
    let docsSnap;
    try {
      const q = query(collection(db, 'formularios'), orderBy('nombre'));
      docsSnap = await getDocs(q);
    } catch {
      docsSnap = await getDocs(collection(db, 'formularios'));
    }
    const items = docsSnap.docs.map(d=>({ id: d.id, ...(d.data()||{}) }));
    const sorted = sortByNombreAsc(items);
    renderList(sorted);
    initFilter(sorted);
  } catch (e) {
    console.error('[alumnos] error cargando', e);
    alert('No se pudo cargar el listado de alumnos');
  }
}

async function ensureAdmin(){
  if (isAdminLocal()) return true;
  await ensureAuth();
  const storedVal = await fetchAdminKeyFromFirebase();
  if (!storedVal) { alert('No está configurada la clave de administrador en Firebase'); window.location.href = './'; return false; }
  const input = prompt('Ingrese clave de administrador:');
  if (input == null) { window.location.href = './'; return false; }
  const plain = String(input).trim();
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain));
  const hex = Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  const ok = isSha256Hex(storedVal) ? (hex === storedVal) : (plain === storedVal);
  if (!ok) { alert('Clave incorrecta'); window.location.href = './'; return false; }
  try { localStorage.setItem('admin_key_hash', storedVal); } catch {}
  setIsAdminLocal(true);
  return true;
}

function initFilter(allItems){
  const inp = document.getElementById('filtro');
  if (!inp) return;
  const apply = () => {
    const q = String(inp.value||'').toLocaleLowerCase().trim();
    if (!q) { renderList(allItems); return; }
    const filtered = allItems.filter(it => normalizeName(it.nombre).toLocaleLowerCase().includes(q));
    renderList(filtered);
  };
  inp.addEventListener('input', apply);
}

document.addEventListener('DOMContentLoaded', ()=>{
  window.lucide?.createIcons();
  loadAlumnos();
});


