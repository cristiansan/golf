// ===== GOLF APP - ARCHIVO PRINCIPAL =====
// Este archivo contiene toda la lógica de la aplicación:
// - Inicialización de Firebase y autenticación
// - Sistema de navegación y secciones
// - Manejo del formulario de registro
// - Sistema de videos y links
// - Generador de QR
// - Funcionalidades de administrador

// Inicialización de iconos Lucide
document.addEventListener('DOMContentLoaded', () => { 
  window.lucide?.createIcons(); 
  console.log('[app] DOMContentLoaded');
  
  // Event listener inmediato para el botón de login del overlay
  const btnLoginRequired = document.getElementById('btn-login-required');
  if (btnLoginRequired) {
    console.log('[app] botón login del overlay encontrado en DOMContentLoaded');
    btnLoginRequired.addEventListener('click', () => {
      console.log('[app] click en botón login del overlay');
      const loginModal = document.getElementById('modal-login');
      if (loginModal) {
        loginModal.classList.remove('hidden');
        console.log('[app] modal de login mostrado desde overlay');
        window.lucide?.createIcons();
      } else {
        console.warn('[app] modal de login no encontrado desde overlay');
      }
    });
  } else {
    console.warn('[app] botón login del overlay no encontrado en DOMContentLoaded');
  }
});

// ===== CONFIGURACIÓN DE FIREBASE =====
// Importaciones de Firebase (ESM)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc, getDocs, query, orderBy, updateDoc, setDoc, where, arrayUnion } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: 'AIzaSyCSbupnAd-CH5aCi9b5CvILnIIE74D5M34',
  authDomain: 'golf-f3b84.firebaseapp.com',
  projectId: 'golf-f3b84',
  storageBucket: 'golf-f3b84.appspot.com',
  messagingSenderId: '179642241287',
  appId: '1:179642241287:web:c43bdb3d2a1dd37e95b5a2',
  measurementId: 'G-TXFF1RSFEG'
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
try { getAnalytics(app); } catch(e) { console.warn('[firebase] analytics no disponible', e?.message||e); }
const db = getFirestore(app);
const auth = getAuth(app);

// Configurar persistencia local
setPersistence(auth, browserLocalPersistence);

// ===== VARIABLES GLOBALES =====
let currentUser = null;        // Usuario actual autenticado
let isUserAdmin = false;       // Si el usuario tiene permisos de administrador

// ===== FUNCIONES DE VISIBILIDAD DE LA APP =====
// Función para mostrar/ocultar la app según el estado de auth
function toggleAppVisibility(isLoggedIn) {
  const loginOverlay = document.getElementById('login-overlay');
  const mainContent = document.querySelector('main');
  const header = document.querySelector('header');
  
  if (isLoggedIn) {
    // Usuario logueado - mostrar app
    if (loginOverlay) loginOverlay.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
    if (header) header.style.display = 'flex';
  } else {
    // Usuario no logueado - mostrar overlay de login
    if (loginOverlay) loginOverlay.style.display = 'flex';
    if (mainContent) mainContent.style.display = 'none';
    if (header) header.style.display = 'none';
    
    // Ocultar modales si están abiertos
    const loginModal = document.getElementById('modal-login');
    const registerModal = document.getElementById('modal-register');
    if (loginModal) loginModal.classList.add('hidden');
    if (registerModal) registerModal.classList.add('hidden');
  }
}

// ===== SISTEMA DE NAVEGACIÓN Y SECCIONES =====
// Helpers de secciones
const sections = { formulario: sec('formulario'), videos: sec('videos'), links: sec('links'), qr: sec('qr') };
function sec(id){ return document.getElementById('sec-' + id); }

// Función para cambiar entre secciones con animación
function switchTo(target){
  Object.keys(sections).forEach(k => sections[k].classList.toggle('hidden', k!==target));
  const active = sections[target];
  if (active) {
    active.classList.remove('fade-in');
    void active.offsetWidth;
    active.classList.add('fade-in');
  }
  
  // Renderizar videos cuando se cambie a la sección de videos
  if (target === 'videos') {
    console.log('[switchTo] 🎬 cambiando a sección videos, renderizando videos');
    setTimeout(() => {
      renderVideos();
    }, 100);
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

// ===== SISTEMA DE DRAWER LATERAL =====
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

// ===== SISTEMA DE ADMINISTRADOR =====
// UI: botón Alumnos solo para admin
function ensureAlumnosNav(){
  try {
    const group = document.getElementById('nav-admin');
    if (!group) return;
    
    let btn = document.getElementById('nav-alumnos');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'nav-alumnos';
      btn.className = 'w-full text-left px-3 py-2 rounded-md hover:bg-black/20';
      btn.textContent = 'Alumnos';
      btn.addEventListener('click', ()=>{ window.location.href = './alumnos.html'; });
      group.appendChild(btn);
    }
  } catch {}
}

// ===== MANEJO DEL FORMULARIO =====
// Función para completar datos del formulario desde localStorage
// Se usa cuando se selecciona un alumno desde la página de Alumnos
function fillFormFromLocalStorage() {
  try {
    const formData = localStorage.getItem('fill_form_data');
    if (formData) {
      const data = JSON.parse(formData);
      console.log('[formulario] datos cargados desde localStorage:', data);
      
      // Obtener y establecer el ID del alumno actual
      const alumnoId = localStorage.getItem('current_alumno_id');
      if (alumnoId) {
        window.currentAlumnoId = alumnoId;
        console.log('[formulario] ID del alumno establecido:', alumnoId);
        // Limpiar el ID del localStorage después de usarlo
        localStorage.removeItem('current_alumno_id');
      }
      
      // Helpers de seteo seguro
      const setVal = (selector, value) => {
        const el = document.querySelector(selector);
        if (el && value !== undefined && value !== null && value !== '') {
          el.value = value;
        }
      };
      const setTextArea = (name, value) => {
        const el = document.querySelector(`textarea[name="${name}"]`) || document.querySelector(`input[name="${name}"]`);
        if (el && value != null) el.value = value;
      };

      // Datos personales
      setVal('input[name="nombre"]', data.nombre);
      setVal('input[name="nacimiento"]', data.nacimiento);
      // Edad: usar la guardada o calcular desde nacimiento
      const edadInput = document.querySelector('input[name="edad"]');
      if (edadInput) {
        if (data.edad) {
          edadInput.value = data.edad;
        } else if (data.nacimiento) {
          try {
            const d = new Date(data.nacimiento);
            if (!isNaN(d)) {
              const diff = Date.now() - d.getTime();
              const age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
              edadInput.value = String(age);
            }
          } catch {}
        }
      }
      setVal('input[name="domicilio"]', data.domicilio);
      setVal('input[name="ciudad"]', data.ciudad);
      setVal('input[name="nacionalidad"]', data.nacionalidad);
      setVal('input[name="telefono"]', data.telefono);
      setVal('input[name="email"]', data.email);
      setVal('input[name="ocupacion"]', data.ocupacion);

      // Info médica
      setTextArea('alergias', data.alergias);
      setTextArea('lesiones', data.lesiones);
      setTextArea('condicion', data.condicion);
      const aptoSelect = document.querySelector('select[name="apto"]');
      if (aptoSelect && data.apto) aptoSelect.value = data.apto;
      setVal('input[name="apto_vto"]', data.apto_vto);

      // Experiencia
      setVal('input[name="anios"]', data.anios);
      setVal('input[name="handicap"]', data.handicap);
      const frecuenciaSelect = document.querySelector('select[name="frecuencia"]');
      if (frecuenciaSelect && data.frecuencia) frecuenciaSelect.value = String(data.frecuencia);
      setVal('input[name="club"]', data.club);
      const modalidadSelect = document.querySelector('select[name="modalidad"]');
      if (modalidadSelect && data.modalidad) modalidadSelect.value = data.modalidad;
      const modalidadOtroRow = document.getElementById('modalidad-otro-row');
      if (modalidadSelect && modalidadOtroRow) {
        const showOtro = modalidadSelect.value === 'Otro';
        modalidadOtroRow.classList.toggle('hidden', !showOtro);
        if (showOtro) setVal('input[name="modalidad_otro"]', data.modalidad_otro || '');
      }
      const clasesPreviasSelect = document.querySelector('select[name="clases_previas"]');
      if (clasesPreviasSelect && data.clases_previas) clasesPreviasSelect.value = data.clases_previas;
      
      // Limpiar localStorage después de usar
      localStorage.removeItem('fill_form_data');
      
      console.log('[formulario] formulario completado con datos del alumno');
      
      // Actualizar notas del alumno si es admin
      if (isUserAdmin) {
        actualizarNotasAlumno();
      }
    }
  } catch (error) {
    console.warn('[formulario] error cargando datos:', error);
  }
}

// ===== SISTEMA DE NOTAS PARA ADMINISTRADORES =====
// Función para actualizar notas del alumno actual
function actualizarNotasAlumno() {
  const historialNotas = document.getElementById('historial-notas');
  if (!historialNotas) return;
  
  try {
    const alumnoId = window.currentAlumnoId;
    if (!alumnoId) {
      historialNotas.innerHTML = '<p class="text-sm muted">Selecciona un alumno para ver sus notas</p>';
      return;
    }
    
    const notas = JSON.parse(localStorage.getItem(`notas_alumno_${alumnoId}`) || '[]');
    console.log('[notas] actualizando notas para alumno', alumnoId, 'notas encontradas:', notas.length);
    
    if (notas.length === 0) {
      historialNotas.innerHTML = '<p class="text-sm muted">No hay notas guardadas para este alumno</p>';
      return;
    }
    
    const notasHTML = notas.map(nota => {
      const fecha = new Date(nota.fecha).toLocaleString('es-ES');
      return `
        <div class="p-3 border rounded-md mb-2" style="border-color: var(--border)">
          <div class="text-sm font-medium">${nota.adminEmail}</div>
          <div class="text-sm mt-1">${nota.texto}</div>
          <div class="text-xs muted mt-2">${fecha}</div>
        </div>
      `;
    }).join('');
    
    historialNotas.innerHTML = notasHTML;
    
  } catch (error) {
    console.warn('[notas] error actualizando notas:', error);
    historialNotas.innerHTML = '<p class="text-sm text-red-500">Error al cargar notas</p>';
  }
}

// Funcionalidad de notas para admin
function initNotasFunctionality() {
  console.log('[notas] 🔍 INICIANDO FUNCIONALIDAD DE NOTAS...');
  
  const btnGuardarNotas = document.getElementById('btn-guardar-notas');
  const textareaNotas = document.getElementById('notas-alumno');
  const historialNotas = document.getElementById('historial-notas');
  
  console.log('[notas] 🔍 elementos encontrados:', {
    btnGuardarNotas: !!btnGuardarNotas,
    textareaNotas: !!textareaNotas,
    historialNotas: !!historialNotas
  });
  
  if (!btnGuardarNotas || !textareaNotas) {
    console.warn('[notas] ❌ elementos de notas no encontrados');
    console.warn('[notas] 🔍 btnGuardarNotas:', btnGuardarNotas);
    console.warn('[notas] 🔍 textareaNotas:', textareaNotas);
    return;
  }
  
  console.log('[notas] ✅ elementos encontrados, agregando event listener al botón de guardar notas');
  
  // Event listener para guardar notas
  btnGuardarNotas.addEventListener('click', async () => {
    console.log('[notas] 🎯 CLICK EN BOTÓN GUARDAR NOTAS');
    console.log('[notas] 🔍 isUserAdmin:', isUserAdmin);
    console.log('[notas] 🔍 currentUser:', currentUser);
    
    if (!isUserAdmin) {
      console.warn('[notas] ❌ usuario no es admin');
      alert('Solo los administradores pueden guardar notas');
      return;
    }
    
    const notaTexto = textareaNotas.value.trim();
    console.log('[notas] 🔍 texto de la nota:', notaTexto);
    
    if (!notaTexto) {
      console.warn('[notas] ❌ nota vacía');
      alert('Por favor ingresa una nota antes de guardar');
      return;
    }
    
    try {
      btnGuardarNotas.disabled = true;
      btnGuardarNotas.textContent = 'Guardando...';
      
      // Obtener el ID del alumno actual
      const alumnoId = window.currentAlumnoId;
      if (!alumnoId) {
        alert('Error: No se pudo identificar al alumno');
        return;
      }
      
      console.log('[notas] 🔍 guardando nota para alumno:', alumnoId);
      
      // Crear nueva nota
      const nuevaNota = {
        texto: notaTexto,
        fecha: new Date().toISOString(),
        adminEmail: currentUser?.email || 'admin',
        alumnoId: alumnoId
      };
      
      console.log('[notas] ✅ nueva nota creada:', nuevaNota);
      
      // Guardar en localStorage por alumno
      const notasAlumno = JSON.parse(localStorage.getItem(`notas_alumno_${alumnoId}`) || '[]');
      console.log('[notas] 🔍 notas existentes del alumno antes:', notasAlumno.length);
      
      notasAlumno.push(nuevaNota);
      localStorage.setItem(`notas_alumno_${alumnoId}`, JSON.stringify(notasAlumno));
      
      console.log('[notas] ✅ nota guardada en localStorage para alumno, total:', notasAlumno.length);
      
      // Limpiar textarea
      textareaNotas.value = '';
      
      // Actualizar historial
      mostrarHistorialNotas();
      
      alert('Nota guardada exitosamente');
      
    } catch (error) {
      console.error('[notas] ❌ error guardando:', error);
      alert('Error al guardar la nota');
    } finally {
      btnGuardarNotas.disabled = false;
      btnGuardarNotas.textContent = 'Guardar Notas';
    }
  });
  
  // Función para mostrar historial de notas del alumno actual
  function mostrarHistorialNotas() {
    if (!historialNotas) return;
    
    try {
      const alumnoId = window.currentAlumnoId;
      if (!alumnoId) {
        historialNotas.innerHTML = '<p class="text-sm muted">Selecciona un alumno para ver sus notas</p>';
        return;
      }
      
      const notas = JSON.parse(localStorage.getItem(`notas_alumno_${alumnoId}`) || '[]');
      console.log('[notas] mostrando historial para alumno', alumnoId, 'notas encontradas:', notas.length);
      
      if (notas.length === 0) {
        historialNotas.innerHTML = '<p class="text-sm muted">No hay notas guardadas para este alumno</p>';
        return;
      }
      
      const notasHTML = notas.map(nota => {
        const fecha = new Date(nota.fecha).toLocaleString('es-ES');
        return `
          <div class="p-3 border rounded-md mb-2" style="border-color: var(--border)">
            <div class="text-sm font-medium">${nota.adminEmail}</div>
            <div class="text-sm mt-1">${nota.texto}</div>
            <div class="text-xs muted mt-2">${fecha}</div>
          </div>
        `;
      }).join('');
      
      historialNotas.innerHTML = notasHTML;
      
    } catch (error) {
      console.warn('[notas] error mostrando historial:', error);
      historialNotas.innerHTML = '<p class="text-sm text-red-500">Error al cargar notas</p>';
    }
  }
  
  // Mostrar historial inicial
  mostrarHistorialNotas();
  
  console.log('[notas] funcionalidad de notas inicializada correctamente');
}

// ===== GESTIÓN DE ADMINISTRADORES =====
// Actualizar UI de admin
function updateAdminUI(isAdmin) {
  console.log('[admin] 🔍 updateAdminUI llamado con isAdmin:', isAdmin);
  
  isUserAdmin = isAdmin;
  console.log('[admin] 🔍 isUserAdmin actualizado a:', isUserAdmin);
  
  const header = document.getElementById('nav-admin-header');
  const group = document.getElementById('nav-admin');
  
  console.log('[admin] 🔍 elementos encontrados:', {
    header: !!header,
    group: !!group
  });
  
  if (header && group) {
    header.style.display = isAdmin ? '' : 'none';
    group.style.display = isAdmin ? '' : 'none';
    console.log('[admin] ✅ UI de admin actualizada');
  }
  
  // Asegurar que el botón de Alumnos esté disponible
  if (isAdmin) {
    console.log('[admin] 🔍 llamando ensureAlumnosNav');
    ensureAlumnosNav();
  }
  
  // Mostrar/ocultar pestaña de Notas en el formulario
  const notasTabBtn = document.getElementById('tab-notas-btn');
  console.log('[admin] 🔍 pestaña notas encontrada:', !!notasTabBtn);
  
  if (notasTabBtn) {
    notasTabBtn.classList.toggle('hidden', !isAdmin);
    console.log('[admin] ✅ pestaña notas mostrada/ocultada');
  }
  
  // Inicializar funcionalidad de notas solo si es admin
  if (isAdmin) {
    console.log('[admin] 🎯 INICIALIZANDO FUNCIONALIDAD DE NOTAS...');
    initNotasFunctionality();
  } else {
    console.log('[admin] ❌ usuario no es admin, no se inicializa funcionalidad de notas');
  }
}

// Verificar si el usuario es admin
async function checkUserAdminStatus(user) {
  console.log('[auth] 🔍 checkUserAdminStatus llamado para usuario:', user?.email);
  
  if (!user) {
    console.log('[auth] ❌ no hay usuario');
    return false;
  }
  
  try {
    console.log('[auth] 🔍 consultando Firestore para uid:', user.uid);
    const userRef = doc(db, 'usuarios', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const isAdmin = userData.admin === true;
      console.log('[auth] ✅ usuario encontrado en Firestore, admin:', isAdmin);
      console.log('[auth] 🔍 datos del usuario:', userData);
      
      // Actualizar UI de admin
      console.log('[auth] 🔍 llamando updateAdminUI con isAdmin:', isAdmin);
      updateAdminUI(isAdmin);
      return isAdmin;
    } else {
      console.log('[auth] ❌ usuario no encontrado en Firestore');
      updateAdminUI(false);
      return false;
    }
  } catch (error) {
    console.error('[auth] ❌ error verificando admin:', error);
    updateAdminUI(false);
    return false;
  }
}

// Verificar si el usuario ya tiene formulario
async function checkUserHasForm(user) {
  if (!user) return false;
  
  try {
    const formQuery = query(
      collection(db, 'formularios'),
      where('ownerUid', '==', user.uid)
    );
    const formSnapshot = await getDocs(formQuery);
    return !formSnapshot.empty;
  } catch (error) {
    console.warn('[auth] error verificando formulario:', error);
    return false;
  }
}

// ===== ESTADO DE AUTENTICACIÓN =====
// Estado de autenticación
async function updateAuthUI(user) {
  currentUser = user;

  if (user) {
    // Usuario logueado
    const btnLogin = document.getElementById('btn-login');
    const userInfo = document.getElementById('user-info');
    const userEmail = document.getElementById('user-email');
    
    if (btnLogin) btnLogin.style.display = 'none';
    if (userInfo) userInfo.style.display = 'flex';
    
    // Mostrar solo el nombre del usuario sin el dominio del email
    if (userEmail) {
      const displayName = user.displayName || user.email?.split('@')[0] || 'Usuario';
      userEmail.textContent = displayName;
    }
    
    // Mostrar la app
    toggleAppVisibility(true);
    
    // Verificar si es admin
    await checkUserAdminStatus(user);

    // Si se viene de la página de alumnos, ir directo al formulario
    if (localStorage.getItem('go_to_form') === 'true') {
      localStorage.removeItem('go_to_form');
      switchTo('formulario');
    } else {
      // Verificar si ya tiene formulario y cambiar sección por defecto
      const hasForm = await checkUserHasForm(user);
      if (hasForm) {
        // Si ya tiene formulario, mostrar Videos por defecto
        switchTo('videos');
      } else {
        // Si no tiene formulario, mostrar Formulario por defecto
        switchTo('formulario');
      }
    }
    
  } else {
    // Usuario no logueado
    const btnLogin = document.getElementById('btn-login');
    const userInfo = document.getElementById('user-info');
    const userEmail = document.getElementById('user-email');
    
    if (btnLogin) btnLogin.style.display = 'block';
    if (userInfo) userInfo.style.display = 'none';
    if (userEmail) userEmail.textContent = '';
    
    isUserAdmin = false;
    updateAdminUI(false);
    
    // Ocultar la app
    toggleAppVisibility(false);
  }
}

// Observar cambios en el estado de autenticación
onAuthStateChanged(auth, async (user) => {
  await updateAuthUI(user);
  console.log('[auth] estado cambiado:', user ? user.email : 'no logueado');
});

// ===== SISTEMA DE AUTENTICACIÓN =====
// Sistema de autenticación
(function initAuth() {
  const loginModal = document.getElementById('modal-login');
  const registerModal = document.getElementById('modal-register');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const btnLogin = document.getElementById('btn-login');
  const btnLoginRequired = document.getElementById('btn-login-required');
  const btnLogout = document.getElementById('btn-logout');
  
  // Debug: verificar que los elementos se encuentren
  console.log('[auth] elementos encontrados:', {
    loginModal: !!loginModal,
    registerModal: !!registerModal,
    loginForm: !!loginForm,
    registerForm: !!registerForm,
    btnLogin: !!btnLogin,
    btnLoginRequired: !!btnLoginRequired,
    btnLogout: !!btnLogout
  });
  
  // Función para mostrar modal de login
  function showLoginModal() {
    console.log('[auth] mostrando modal de login');
    if (loginModal) {
      loginModal.classList.remove('hidden');
      console.log('[auth] modal de login mostrado');
    } else {
      console.warn('[auth] modal de login no encontrado');
    }
    window.lucide?.createIcons();
  }
  
  // Event listener para botón login del header
  if (btnLogin) {
    console.log('[auth] botón login del header encontrado, agregando event listener');
    btnLogin.addEventListener('click', showLoginModal);
  } else {
    console.warn('[auth] botón login del header no encontrado');
  }
  
  // Event listener para botón login del overlay
  if (btnLoginRequired) {
    console.log('[auth] botón login del overlay encontrado, agregando event listener');
    btnLoginRequired.addEventListener('click', showLoginModal);
  } else {
    console.warn('[auth] botón login del overlay no encontrado');
  }

  // Cerrar modales
  function closeModals() {
    if (loginModal) loginModal.classList.add('hidden');
    if (registerModal) registerModal.classList.add('hidden');
    if (modalChangelog) modalChangelog.classList.add('hidden');
  }

  // Cerrar con overlay
  document.getElementById('modal-login-overlay')?.addEventListener('click', closeModals);
  document.getElementById('modal-register-overlay')?.addEventListener('click', closeModals);

  // Cerrar con botones X
  document.getElementById('btn-close-login')?.addEventListener('click', closeModals);
  document.getElementById('btn-close-register')?.addEventListener('click', closeModals);

  // Cerrar con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModals();
  });

  // Navegación entre modales
  document.getElementById('btn-show-register')?.addEventListener('click', () => {
    if (loginModal) loginModal.classList.add('hidden');
    if (registerModal) registerModal.classList.remove('hidden');
    window.lucide?.createIcons();
  });

  document.getElementById('btn-show-login')?.addEventListener('click', () => {
    if (registerModal) registerModal.classList.add('hidden');
    if (loginModal) loginModal.classList.remove('hidden');
    window.lucide?.createIcons();
  });

  // ===== LOGIN CON EMAIL/PASSWORD =====
  // Login con email/password
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Iniciando...';
      
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      
      await signInWithEmailAndPassword(auth, email, password);
      console.log('[auth] login exitoso:', email);
      
      closeModals();
    } catch (error) {
      console.error('[auth] error login:', error);
      let message = 'Error al iniciar sesión';
      
      switch (error.code) {
        case 'auth/user-not-found':
          message = 'Usuario no encontrado';
          break;
        case 'auth/wrong-password':
          message = 'Contraseña incorrecta';
          break;
        case 'auth/invalid-email':
          message = 'Email inválido';
          break;
        case 'auth/too-many-requests':
          message = 'Demasiados intentos. Intenta más tarde';
          break;
      }
      
      alert(message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  // ===== REGISTRO CON EMAIL/PASSWORD =====
  // Registro con email/password
  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creando...';
      
      const email = document.getElementById('register-email').value.trim();
      const password = document.getElementById('register-password').value;
      const confirmPassword = document.getElementById('register-confirm-password').value;
      
      if (password !== confirmPassword) {
        alert('Las contraseñas no coinciden');
        return;
      }
      
      if (password.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres');
        return;
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Crear documento de usuario en Firestore
      try {
        const userDoc = doc(db, 'usuarios', userCredential.user.uid);
        await setDoc(userDoc, {
          uid: userCredential.user.uid,
          email: email,
          createdAt: serverTimestamp(),
          admin: false // Por defecto no es admin
        });
      } catch (e) {
        console.warn('[auth] error guardando perfil:', e);
      }
      
      closeModals();
      alert('¡Cuenta creada exitosamente!');
      
    } catch (error) {
      console.error('[auth] error registro:', error);
      let message = 'Error al crear la cuenta';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'Ya existe una cuenta con este email';
          break;
        case 'auth/invalid-email':
          message = 'Email inválido';
          break;
        case 'auth/weak-password':
          message = 'La contraseña es muy débil';
          break;
      }
      
      alert(message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  // ===== LOGIN CON GOOGLE =====
  // Login con Google
  document.getElementById('btn-login-google')?.addEventListener('click', async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Crear documento de usuario en Firestore si no existe
      try {
        const userDoc = doc(db, 'usuarios', result.user.uid);
        const userSnap = await getDoc(userDoc);
        
        if (!userSnap.exists()) {
          await setDoc(userDoc, {
            uid: result.user.uid,
            email: result.user.email,
            nombre: result.user.displayName || '',
            createdAt: serverTimestamp(),
            admin: false // Por defecto no es admin
          });
        }
        
        closeModals();
        console.log('[auth] login con Google exitoso');
      } catch (error) {
        console.error('[auth] error google login:', error);
        if (error.code === 'auth/popup-closed-by-user') {
          return;
        }
        alert('Error al iniciar sesión con Google');
      }
    } catch (error) {
      console.error('[auth] error google login:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        return;
      }
      alert('Error al iniciar sesión con Google');
    }
  });

  // ===== LOGOUT Y RECUPERACIÓN =====
  // Logout
  btnLogout?.addEventListener('click', async () => {
    try {
      await signOut(auth);
      alert('Sesión cerrada');
    } catch (error) {
      console.error('[auth] error logout:', error);
      alert('Error al cerrar sesión');
    }
  });

  // Recuperar contraseña
  document.getElementById('btn-forgot-password')?.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim();
    if (!email) {
      alert('Por favor ingresa tu email primero');
      return;
    }
    
    try {
      await sendPasswordResetEmail(auth, email);
      alert('Se envió un email para restablecer tu contraseña');
    } catch (error) {
      console.error('[auth] error reset password:', error);
      alert('Error al enviar email de recuperación');
    }
  });

  // Limpiar formularios al cerrar modales
  function clearForms() {
    if (loginForm) loginForm.reset();
    if (registerForm) registerForm.reset();
  }
  
  // Limpiar al cerrar
  document.getElementById('btn-close-login')?.addEventListener('click', clearForms);
  document.getElementById('btn-close-register')?.addEventListener('click', clearForms);
  document.getElementById('modal-login-overlay')?.addEventListener('click', clearForms);
  document.getElementById('modal-register-overlay')?.addEventListener('click', clearForms);
  
  // ===== MODAL DE CHANGELOG =====
  // Modal de changelog
  const btnChangelog = document.getElementById('btn-changelog');
  const modalChangelog = document.getElementById('modal-changelog');
  
  if (btnChangelog && modalChangelog) {
    btnChangelog.addEventListener('click', () => {
      modalChangelog.classList.remove('hidden');
      window.lucide?.createIcons();
    });
    
    // Cerrar modal de changelog
    document.getElementById('btn-close-changelog')?.addEventListener('click', () => {
      modalChangelog.classList.add('hidden');
    });
    
    document.getElementById('modal-changelog-overlay')?.addEventListener('click', () => {
      modalChangelog.classList.add('hidden');
    });
  }

  console.log('[auth] sistema inicializado');
})();

// ===== SISTEMA DE PESTAÑAS DEL FORMULARARIO =====
// Tabs con animación
const tabs = ['tab-personales','tab-medica','tab-experiencia','tab-notas'];
let currentTabIndex = 0;

function showTab(i){
  currentTabIndex = Math.max(0, Math.min(tabs.length-1, i));
  tabs.forEach((id,idx)=>{ 
    const tabElement = document.getElementById(id);
    if (tabElement) {
      tabElement.classList.toggle('hidden', idx!==currentTabIndex);
    }
  });
  document.querySelectorAll('.tab-btn').forEach((b,idx)=>b.setAttribute('aria-selected', String(idx===currentTabIndex)));
  const shown=document.getElementById(tabs[currentTabIndex]);
  if (shown) { shown.classList.remove('fade-in'); void shown.offsetWidth; shown.classList.add('fade-in'); }
  
  // Mostrar/ocultar botones según la pestaña
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnGuardar = document.getElementById('btn-guardar');
  
  if (btnPrev && btnNext && btnGuardar) {
    if (currentTabIndex === 0) {
      // Primera pestaña: solo Siguiente
      btnPrev.style.display = 'none';
      btnNext.style.display = 'block';
      btnGuardar.style.display = 'none';
    } else if (currentTabIndex === 1) {
      // Segunda pestaña: Anterior y Siguiente
      btnPrev.style.display = 'block';
      btnNext.style.display = 'block';
      btnGuardar.style.display = 'none';
    } else if (currentTabIndex === 2) {
      // Tercera pestaña: Anterior y Guardar
      btnPrev.style.display = 'block';
      btnNext.style.display = 'none';
      btnGuardar.style.display = 'block';
    } else if (currentTabIndex === 3) {
      // Pestaña de Notas: solo Anterior
      btnPrev.style.display = 'block';
      btnNext.style.display = 'none';
      btnGuardar.style.display = 'none';
    }
  }
}

// Hacer funciones globalmente accesibles
window.showTab = showTab;
window.actualizarNotasAlumno = actualizarNotasAlumno;
window.renderVideos = renderVideos;

// Event listeners para navegación entre pestañas
document.querySelectorAll('.tab-btn').forEach((b,i)=>b.addEventListener('click',()=>showTab(i)));
document.getElementById('btn-prev')?.addEventListener('click',()=>showTab(currentTabIndex-1));
document.getElementById('btn-next')?.addEventListener('click',()=>showTab(currentTabIndex+1));

// ===== SISTEMA DE LINKS Y VIDEOS DE YOUTUBE =====
// Links YouTube
const state = { links: JSON.parse(localStorage.getItem('yt_links')||'[]') };
const elGrid = document.getElementById('links-grid');
const elSearch = document.getElementById('links-search');
const elTag = document.getElementById('links-tag');
const elOrder = document.getElementById('links-order');

// Función para extraer ID de video de YouTube desde URL
function youtubeId(url){ 
  try{ 
    const u=new URL(url); 
    if(u.hostname.includes('youtu.be')) return u.pathname.slice(1); 
    if(u.searchParams.get('v')) return u.searchParams.get('v'); 
    const p=u.pathname.split('/'); 
    const i=p.indexOf('embed'); 
    if(i>=0&&p[i+1]) return p[i+1]; 
    return ''; 
  } catch { 
    return ''; 
  } 
}

// Función para renderizar la lista de links/videos
function renderLinks(){
  // Verificar que los elementos existen antes de usarlos
  if (!elGrid) {
    console.warn('[links] elementos de links no encontrados');
    return;
  }
  
  let items=[...state.links];
  
  // Solo procesar búsqueda si el elemento existe
  if (elSearch) {
    const q = elSearch.value.trim().toLowerCase();
    if(q) items = items.filter(it => (it.title||'').toLowerCase().includes(q) || (it.url||'').toLowerCase().includes(q));
  }
  
  // Solo procesar filtro por tag si el elemento existe
  if (elTag) {
    const tag = elTag.value;
    if(tag) items = items.filter(it => (it.tags||[]).includes(tag));
  }
  
  // Solo procesar orden si el elemento existe
  if (elOrder) {
    if(elOrder.value==='date_desc') {
      items.sort((a,b)=>b.createdAt-a.createdAt); 
    } else {
      items.sort((a,b)=>a.createdAt-b.createdAt);
    }
  }
  
  // Actualizar tags solo si el elemento existe
  if (elTag) {
    const tags = new Set(items.flatMap(it=>it.tags||[]));
    const prev = elTag.value;
    elTag.innerHTML = '<option value="">Todas las etiquetas</option>' + 
      [...tags].map(t=>`<option ${t===prev?'selected':''} value="${t}">${t}</option>`).join('');
  }
  
  // Renderizar grid
  elGrid.innerHTML = items.map(it=>{
    const id = youtubeId(it.url);
    const thumb = id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
    return `<article class="link-card fade-in">
      <img class="thumb mb-2" src="${thumb}" alt="${it.title||'Video'}"/>
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="font-medium truncate">${it.title||'Video de YouTube'}</div>
          <div class="text-sm muted truncate">${new URL(it.url).hostname}</div>
          ${it.tags?.length ? `<div class="mt-1">${it.tags.map(t=>`<span class="chip">${t}</span>`).join(' ')}</div>` : ''}
        </div>
        <div class="shrink-0 flex gap-2">
          <button class="p-2 rounded-md border btn" style="border-color: var(--border)" data-act="open" data-id="${it.id}" title="Abrir">
            <i data-lucide="external-link"></i>
          </button>
          <button class="p-2 rounded-md border btn" style="border-color: var(--border)" data-act="copy" data-id="${it.id}" title="Copiar URL">
            <i data-lucide="copy"></i>
          </button>
          <button class="p-2 rounded-md border btn" style="border-color: var(--border)" data-act="del" data-id="${it.id}" title="Eliminar">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    </article>`;
  }).join('');
  
  window.lucide?.createIcons();
  
  // Agregar event listeners a los botones
  elGrid.querySelectorAll('button[data-act]').forEach(btn=>{
    const id = btn.getAttribute('data-id');
    const act = btn.getAttribute('data-act');
    const item = state.links.find(x=>String(x.id)===String(id));
    if(!item) return;
    
    btn.addEventListener('click', async()=>{
      if(act==='open') window.open(item.url,'_blank');
      if(act==='copy') await navigator.clipboard.writeText(item.url);
      if(act==='del'){
        state.links = state.links.filter(x=>x.id!==item.id);
        localStorage.setItem('yt_links', JSON.stringify(state.links));
        renderLinks();
      }
    });
  });
}

// ===== AGREGAR NUEVOS LINKS (solo para admin) =====
// Agregar nuevo link (solo para admin)
const btnAddLink = document.getElementById('btn-add-link');
if (btnAddLink) {
  btnAddLink.addEventListener('click', () => {
    if (!isUserAdmin) {
      alert('Solo los administradores pueden agregar videos');
      return;
    }
    
    const url = prompt('Ingresa la URL del video de YouTube:');
    if (!url) return;
    
    const title = prompt('Ingresa el título del video:');
    if (!title) return;
    
    const tags = prompt('Ingresa las etiquetas separadas por coma:');
    const tagsArray = tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [];
    
    const newLink = {
      id: Date.now(),
      url: url,
      title: title,
      tags: tagsArray,
      createdAt: Date.now()
    };
    
    state.links.push(newLink);
    localStorage.setItem('yt_links', JSON.stringify(state.links));
    renderLinks();
  });
}

// ===== INICIALIZACIÓN Y CONFIGURACIÓN =====
// Inicializar
showTab(0);

// Solo inicializar links si los elementos existen
if (elGrid) {
  renderLinks();
  
  // Agregar event listeners solo si los elementos existen
  if (elSearch) elSearch.addEventListener('input', renderLinks);
  if (elTag) elSearch.addEventListener('change', renderLinks);
  if (elOrder) elOrder.addEventListener('change', renderLinks);
}

// Inicializar videos para usuarios comunes
setTimeout(() => {
  initVideosSection();
}, 100);

// Completar formulario si hay datos
fillFormFromLocalStorage();

// ===== GUARDADO DE FORMULARIO EN FIRESTORE =====
// Función para obtener valores de inputs de forma segura
function getInputValue(selector) {
  const el = document.querySelector(selector);
  return el ? (el.value ?? '').toString().trim() : '';
}

// Función para recolectar todos los datos del formulario
function collectFormData() {
  const modalidad = getInputValue('select[name="modalidad"]');
  const modalidadOtro = getInputValue('input[name="modalidad_otro"]');
  const base = {
    nombre: getInputValue('input[name="nombre"]'),
    nacimiento: getInputValue('input[name="nacimiento"]'),
    edad: getInputValue('input[name="edad"]'),
    domicilio: getInputValue('input[name="domicilio"]'),
    ciudad: getInputValue('input[name="ciudad"]'),
    nacionalidad: getInputValue('input[name="nacionalidad"]'),
    telefono: getInputValue('input[name="telefono"]'),
    email: getInputValue('input[name="email"]'),
    ocupacion: getInputValue('input[name="ocupacion"]'),
    alergias: getInputValue('textarea[name="alergias"]') || getInputValue('input[name="alergias"]'),
    lesiones: getInputValue('textarea[name="lesiones"]') || getInputValue('input[name="lesiones"]'),
    condicion: getInputValue('textarea[name="condicion"]') || getInputValue('input[name="condicion"]'),
    apto: getInputValue('select[name="apto"]'),
    apto_vto: getInputValue('input[name="apto_vto"]'),
    anios: getInputValue('input[name="anios"]'),
    handicap: getInputValue('input[name="handicap"]'),
    frecuencia: getInputValue('select[name="frecuencia"]'),
    club: getInputValue('input[name="club"]'),
    modalidad,
    clases_previas: getInputValue('select[name="clases_previas"]')
  };
  if (modalidad === 'Otro') {
    base.modalidad_otro = modalidadOtro;
  }
  return base;
}

// Función para obtener el ID del formulario existente del usuario
async function getUserFormDocId(uid) {
  try {
    const formQuery = query(
      collection(db, 'formularios'),
      where('ownerUid', '==', uid)
    );
    const snap = await getDocs(formQuery);
    if (!snap.empty) return snap.docs[0].id;
  } catch (e) {
    console.warn('[formulario] error buscando formulario del usuario:', e);
  }
  return null;
}

// ===== BIND DEL SUBMIT DEL FORMULARARIO =====
// Bind submit del formulario
const formRegistro = document.getElementById('form-registro');
if (formRegistro) {
  formRegistro.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validación manual: asegurar campos requeridos y mostrar la pestaña correspondiente
    const requiredFields = [
      { selector: 'input[name="nombre"]', tabIndex: 0, label: 'Nombre completo' },
      { selector: 'input[name="nacimiento"]', tabIndex: 0, label: 'Fecha de Nacimiento' },
      { selector: 'input[name="edad"]', tabIndex: 0, label: 'Edad' }
    ];
    for (const f of requiredFields) {
      const el = document.querySelector(f.selector);
      if (el && el.hasAttribute('required')) {
        if (!el.value) {
          showTab(f.tabIndex);
          setTimeout(() => { el.focus(); }, 0);
          alert(`Completa el campo requerido: ${f.label}`);
          return;
        }
      }
    }
    const btnGuardar = document.getElementById('btn-guardar');
    const originalText = btnGuardar ? btnGuardar.textContent : '';
    try {
      if (!currentUser) {
        alert('Debes iniciar sesión para guardar el formulario');
        return;
      }

      if (btnGuardar) { btnGuardar.disabled = true; btnGuardar.textContent = 'Guardando...'; }

      const data = collectFormData();
      // Campos de auditoría/propiedad
      data.ownerUid = currentUser.uid;

      // Crear o actualizar
      let didCreate = false;
      const alumnoIdEdicion = window.currentAlumnoId;
      if (alumnoIdEdicion && isUserAdmin) {
        // Admin actualiza un alumno existente
        const ref = doc(db, 'formularios', alumnoIdEdicion);
        await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
      } else {
        // Usuario crea/actualiza su propio formulario
        const existingId = await getUserFormDocId(currentUser.uid);
        if (existingId) {
          const ref = doc(db, 'formularios', existingId);
          await updateDoc(ref, { ...data, updatedAt: serverTimestamp(), ownerUid: currentUser.uid });
        } else {
          await addDoc(collection(db, 'formularios'), { ...data, createdAt: serverTimestamp(), ownerUid: currentUser.uid });
          didCreate = true;
        }
      }

      alert(didCreate ? 'Datos guardados correctamente (nuevo formulario)' : 'Datos guardados correctamente');
    } catch (error) {
      console.error('[formulario] error guardando:', error);
      alert('Error al guardar el formulario');
    } finally {
      if (btnGuardar) { btnGuardar.disabled = false; btnGuardar.textContent = originalText || 'Guardar'; }
    }
  });
}

// ===== SISTEMA DE VIDEOS =====
// Función para inicializar la sección de videos
function initVideosSection() {
  console.log('[videos] 🔍 initVideosSection llamado');
  
  const videosGrid = document.getElementById('videos-grid');
  console.log('[videos] 🔍 videosGrid encontrado:', !!videosGrid);
  
  if (videosGrid) {
    console.log('[videos] ✅ videosGrid encontrado, llamando renderVideos');
    renderVideos();
  } else {
    console.warn('[videos] ❌ videosGrid no encontrado, no se pueden renderizar videos');
  }
}

// Función para renderizar videos (solo lectura para usuarios comunes)
function renderVideos() {
  console.log('[videos] 🔍 renderVideos llamado');
  
  const videosGrid = document.getElementById('videos-grid');
  console.log('[videos] 🔍 videosGrid encontrado:', !!videosGrid);
  
  if (!videosGrid) {
    console.warn('[videos] ❌ videosGrid no encontrado');
    return;
  }
  
  try {
    const videos = JSON.parse(localStorage.getItem('yt_links') || '[]');
    console.log('[videos] ✅ videos encontrados en localStorage:', videos.length);
    console.log('[videos] 🔍 contenido de videos:', videos);
    
    if (videos.length === 0) {
      console.log('[videos] 📝 no hay videos, mostrando mensaje');
      videosGrid.innerHTML = '<p class="text-sm muted text-center py-8">No hay videos disponibles</p>';
      return;
    }
    
    console.log('[videos] 🎬 renderizando', videos.length, 'videos');
    
    const videosHTML = videos.map(video => {
      const id = youtubeId(video.url);
      const thumb = id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
      console.log('[videos] 🔍 video:', { title: video.title, url: video.url, id: id, thumb: thumb });
      
      return `<article class="link-card fade-in">
        <img class="thumb mb-2" src="${thumb}" alt="${video.title || 'Video'}" />
        <div class="min-w-0">
          <div class="font-medium truncate mb-2">${video.title || 'Video de YouTube'}</div>
          <div class="text-sm muted truncate mb-2">${new URL(video.url).hostname}</div>
          ${video.tags?.length ? `<div class="mb-2">${video.tags.map(t => `<span class="chip">${t}</span>`).join(' ')}</div>` : ''}
          <button class="w-full px-3 py-2 rounded-md border btn text-sm" style="border-color: var(--border)" onclick="window.open('${video.url}', '_blank')">
            <i data-lucide="play" class="w-4 h-4 inline mr-2"></i>Ver Video
          </button>
        </div>
      </article>`;
    }).join('');
    
    videosGrid.innerHTML = videosHTML;
    console.log('[videos] ✅ HTML renderizado en videosGrid');
    
    // Crear iconos Lucide
    window.lucide?.createIcons();
    console.log('[videos] ✅ iconos Lucide creados');
    
  } catch (error) {
    console.error('[videos] ❌ error renderizando videos:', error);
    videosGrid.innerHTML = '<p class="text-sm text-red-500 text-center py-8">Error al cargar videos: ' + error.message + '</p>';
  }
}

console.log('[app] sistema inicializado');

// Sistema de videos para usuarios comunes funcionando correctamente

// ===== GENERADOR DE CÓDIGOS QR =====
// Generador de QR
(function initQR() {
  const btnGenQR = document.getElementById('btn-gen-qr');
  const qrCanvas = document.getElementById('qr-canvas');
  const qrUrlInput = document.getElementById('qr-url');
  const btnShareQR = document.getElementById('btn-share-qr');
  
  if (!btnGenQR || !qrCanvas || !qrUrlInput) {
    console.warn('[qr] elementos de QR no encontrados');
    return;
  }
  
  console.log('[qr] inicializando generador de QR');
  
  // Función para generar QR
  function generateQR() {
    const url = qrUrlInput.value.trim();
    if (!url) {
      alert('Por favor ingresa una URL válida');
      return;
    }
    
    try {
      // Calcular tamaño cuadrado según el contenedor
      const parent = qrCanvas.parentElement || qrCanvas;
      const parentWidth = parent.getBoundingClientRect().width || 300;
      const size = Math.max(180, Math.min(360, Math.floor(parentWidth - 24)));

      // Ajustar canvas a cuadrado exacto
      qrCanvas.width = size;
      qrCanvas.height = size;
      qrCanvas.style.width = size + 'px';
      qrCanvas.style.height = size + 'px';

      // Limpiar canvas
      const ctx = qrCanvas.getContext('2d');
      ctx.clearRect(0, 0, size, size);
      
      // Generar QR usando la librería QRCode
      QRCode.toCanvas(qrCanvas, url, {
        width: size,
        margin: 4,
        color: {
          dark: '#22c55e',  // Color verde del tema
          light: '#0b1020'  // Color de fondo del tema
        }
      }, function (error) {
        if (error) {
          console.error('[qr] error generando QR:', error);
          alert('Error al generar el código QR');
        } else {
          console.log('[qr] QR generado exitosamente para:', url);
          // Habilitar botón de compartir
          if (btnShareQR) {
            btnShareQR.disabled = false;
          }
        }
      });
      
    } catch (error) {
      console.error('[qr] error inesperado:', error);
      alert('Error inesperado al generar QR');
    }
  }
  
  // Event listener para generar QR
  btnGenQR.addEventListener('click', generateQR);
  
  // Event listener para generar QR con Enter
  qrUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      generateQR();
    }
  });
  
  // Función para compartir QR
  if (btnShareQR) {
    btnShareQR.addEventListener('click', async () => {
      try {
        // Convertir canvas a blob
        qrCanvas.toBlob(async (blob) => {
          if (navigator.share && blob) {
            // Usar Web Share API si está disponible
            const file = new File([blob], 'qr-code.png', { type: 'image/png' });
            await navigator.share({
              title: 'Código QR',
              text: 'Código QR generado',
              files: [file]
            });
          } else {
            // Fallback: descargar imagen
            const link = document.createElement('a');
            link.download = 'qr-code.png';
            link.href = qrCanvas.toDataURL();
            link.click();
          }
        }, 'image/png');
      } catch (error) {
        console.error('[qr] error compartiendo:', error);
        alert('Error al compartir el código QR');
      }
    });
    
    // Deshabilitar botón inicialmente
    btnShareQR.disabled = true;
  }
  
  // Generar QR inicial con la URL por defecto
  setTimeout(() => {
    if (qrUrlInput.value) {
      generateQR();
    }
  }, 500);
  
  console.log('[qr] generador de QR inicializado');
})();
