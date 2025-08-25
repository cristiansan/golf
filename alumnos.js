// Página de Alumnos: lista documentos de 'formularios' ordenados por nombre
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
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

// Variables globales para el estado de admin
let currentUser = null;
let isUserAdmin = false;

// Verificar si el usuario es admin desde Firestore
async function checkUserAdminStatus(user) {
  if (!user) return false;
  
  try {
    const userRef = doc(db, 'usuarios', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const isAdmin = userData.admin === true;
      console.log('[alumnos] usuario admin desde Firebase:', isAdmin);
      return isAdmin;
    } else {
      console.log('[alumnos] usuario no encontrado en Firestore');
      return false;
    }
  } catch (error) {
    console.warn('[alumnos] error verificando admin:', error);
    return false;
  }
}

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
      try {
        localStorage.setItem('fill_form_data', JSON.stringify(selected||{}));
        // Guardar también el ID del alumno para las notas
        if (selected && selected.id) {
          localStorage.setItem('current_alumno_id', selected.id);
        }
        // Indicar que se debe ir al formulario
        localStorage.setItem('go_to_form', 'true');
      } catch {}
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
  // Si ya verificamos que es admin, retornar true
  if (isUserAdmin) return true;
  
  // Si no hay usuario logueado, redirigir al login
  if (!currentUser) {
    alert('Debes iniciar sesión para acceder a esta página');
    window.location.href = './';
    return false;
  }
  
  // Verificar si es admin desde Firestore
  const isAdmin = await checkUserAdminStatus(currentUser);
  if (!isAdmin) {
    alert('No tienes permisos de administrador para acceder a esta página');
    window.location.href = './';
    return false;
  }
  
  // Actualizar estado global
  isUserAdmin = true;
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

// Observar cambios en el estado de autenticación
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  
  if (user) {
    // Usuario logueado - verificar si es admin
    console.log('[alumnos] usuario logueado:', user.email);
    isUserAdmin = await checkUserAdminStatus(user);
    
    if (isUserAdmin) {
      // Si es admin, cargar alumnos
      loadAlumnos();
    } else {
      // Si no es admin, mostrar error
      alert('No tienes permisos de administrador para acceder a esta página');
      window.location.href = './';
    }
  } else {
    // Usuario no logueado - redirigir al login
    console.log('[alumnos] usuario no logueado, redirigiendo');
    window.location.href = './';
  }
});

document.addEventListener('DOMContentLoaded', ()=>{
  window.lucide?.createIcons();
  
  // Si ya hay un usuario logueado, verificar admin
  if (auth.currentUser) {
    currentUser = auth.currentUser;
    checkUserAdminStatus(auth.currentUser).then(isAdmin => {
      isUserAdmin = isAdmin;
      if (isAdmin) {
        loadAlumnos();
      }
    });
  }
});


