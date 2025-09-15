// ===== GOLF APP v1.5 - ARCHIVO PRINCIPAL =====
// Este archivo contiene toda la lógica de la aplicación:
// - Inicialización de Firebase y autenticación
// - Sistema de navegación y secciones
// - Manejo del formulario de registro
// - Sistema de videos y links
// - Sistema de reservas con calendario
// - Generador de QR
// - Funcionalidades de administrador
//
// === CHANGELOG v1.5 ===
// ✅ CORRECCIÓN CRÍTICA: Sincronización de reservas entre administradores
//    - Migración completa de localStorage a Firestore para reservas
//    - Sincronización automática en tiempo real entre todos los administradores
//    - Eliminación del problema de "no ver las mismas reservas"
//    - Ya no es necesario tocar el botón "actualizar" para ver nuevas reservas
//    - Migración automática de reservas existentes de localStorage a Firestore
//    - Sistema de respaldo híbrido (Firestore + localStorage) para mayor confiabilidad
//    - Eliminación sincronizada desde panel administrativo
//
// === CHANGELOG v1.4 ===
// 🚀 NUEVA FUNCIONALIDAD: Sistema de reservas completo
//    - Calendario interactivo responsive (móvil/tablet/desktop)
//    - Selección de fechas con días pasados deshabilitados
//    - 8 horarios disponibles (09:00-18:00) con visualización de ocupados
//    - Modal de pago con QR para transferencia bancaria (seña 50% - $7.500)
//    - Persistencia en localStorage con IDs únicos y limpieza automática
//    - Modal responsive optimizado para móviles con scroll
//    - Nueva opción "Reserva" en menú de navegación
//
// === CHANGELOG v1.3 ===
// ✅ CORRECCIÓN CRÍTICA: Videos admin - Solucionado problema de persistencia
//    - Videos aparecían y desaparecían después de refrescar página
//    - Eliminación mejorada con sincronización forzada desde Firebase
//    - Resueltas condiciones de carrera entre autenticación y carga de videos
//    - Videos eliminados ya no reaparecen por conflictos de sincronización
//
// ✅ MEJORA: Exportación de alumnos (CSV)
//    - Agregado botón de descarga CSV en listado de alumnos (/alumnos.html)
//    - Exporta todos los campos del formulario (20 campos completos)
//    - Formato CSV compatible con Excel con codificación UTF-8
//    - Escapado correcto de caracteres especiales y comas
//
// ✅ UX: Removido modal molesto después de agregar videos
//    - Ya no aparece ventana con instrucciones de consola
//    - Código de sincronización sigue disponible en consola para desarrolladores
//    - Flujo más limpio: agregar video → mensaje de éxito → listo

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
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc, getDocs, query, orderBy, updateDoc, setDoc, where, arrayUnion, deleteDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

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
const sections = { formulario: sec('formulario'), videos: sec('videos'), reserva: sec('reserva'), links: sec('links'), qr: sec('qr'), reservas: sec('reservas') };
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
    console.log('[switchTo] 🎬 cambiando a sección videos');
    console.log('[switchTo] 🔍 estado actual - usuario:', !!currentUser, 'admin:', isUserAdmin);
    
    // Renderizar videos con un pequeño delay para asegurar que el DOM esté listo
    // y que el estado admin se haya determinado
    setTimeout(() => {
      console.log('[switchTo] 🎬 renderizando videos desde switchTo');
      renderVideos();
    }, 100);
  }
  
  // Actualizar calendario cuando se cambie a la sección de reservas
  if (target === 'reserva') {
    console.log('[switchTo] 📅 cambiando a sección reserva');
    
    // Recrear iconos Lucide para los botones del calendario
    setTimeout(() => {
      console.log('[switchTo] 📅 actualizando iconos en sección reserva');
      window.lucide?.createIcons();
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
  
  // CRÍTICO: Re-renderizar videos después de determinar el estado admin
  // Esto evita el problema de que los videos aparezcan y desaparezcan
  console.log('[admin] 🎬 Re-renderizando videos con nuevo estado admin:', isAdmin);
  const videosGrid = document.getElementById('videos-grid');
  if (videosGrid && document.getElementById('sec-videos')?.classList.contains('active')) {
    console.log('[admin] 🔄 videos-grid visible, re-renderizando videos...');
    setTimeout(() => {
      renderVideos();
    }, 100);
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
const state = { links: [] };
const elGrid = document.getElementById('links-grid');
const elSearch = document.getElementById('links-search');
const elTag = document.getElementById('links-tag');
const elOrder = document.getElementById('links-order');

// Función para cargar videos desde Firebase usando múltiples enfoques
async function loadVideosFromFirebase() {
  try {
    console.log('[videos] 🔍 iniciando carga de videos desde Firebase...');
    console.log('[videos] 👤 usuario actual:', currentUser?.email);
    console.log('[videos] 🔐 es admin:', isUserAdmin);
    
    let allVideosFound = [];
    
    // Método 1: Intentar cargar desde colección formularios con tipo video
    try {
      console.log('[videos] 📋 método 1: buscando en colección formularios...');
      const videosQuery = query(
        collection(db, 'formularios'),
        where('tipo', '==', 'video')
      );
      
      const querySnapshot = await getDocs(videosQuery);
      const videos = [];
      
      console.log('[videos] 📄 documentos encontrados en formularios:', querySnapshot.docs.length);
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('[videos] 📝 documento formulario:', doc.id, data);
        
        // Si es un documento normal de video
        if (data.tipo === 'video' && !data.deleted) {
          videos.push({ 
            id: doc.id, 
            url: data.url,
            title: data.title,
            tags: data.tags || [],
            addedBy: data.addedBy,
            addedByEmail: data.addedByEmail,
            createdAt: data.createdAt,
            source: 'formularios'
          });
        }
        
        // Si es un documento de videos_compartidos
        if (data.tipo === 'videos_compartidos' && data.videos && Array.isArray(data.videos)) {
          console.log('[videos] 📦 documento videos_compartidos encontrado con', data.videos.length, 'videos');
          const sharedVideos = data.videos.filter(video => !video.deleted);
          sharedVideos.forEach(video => {
            video.source = 'videos_compartidos';
            console.log('[videos] 🔗 video compartido:', video);
            videos.push(video);
          });
        }
      });
      
      if (videos.length > 0) {
        console.log('[videos] ✅ videos encontrados en formularios:', videos.length);
        allVideosFound = [...allVideosFound, ...videos];
      } else {
        console.log('[videos] ❌ no hay videos en formularios');
      }
      
      // NO hacer return aquí - siempre revisar todos los métodos
    } catch (error1) {
      console.log('[videos] ❌ método formularios falló:', error1.message);
    }
    
    // Método 2A: Si soy admin, leer desde mi propio documento Y desde localStorage
    if (currentUser && isUserAdmin) {
      try {
        console.log('[videos] 👤 método 2A: leyendo mi propio documento de usuario admin...');
        const myUserDoc = doc(db, 'usuarios', currentUser.uid);
        const myUserSnap = await getDoc(myUserDoc);
        
        if (myUserSnap.exists()) {
          const myUserData = myUserSnap.data();
          console.log('[videos] 📄 mi documento existe, videos:', myUserData.videos?.length || 0);
          
          if (myUserData.videos && Array.isArray(myUserData.videos)) {
            const myVideos = myUserData.videos.filter(video => !video.deleted);
            console.log('[videos] 🎬 mis videos válidos de Firebase:', myVideos.length);
            myVideos.forEach(video => {
              video.source = 'mi_documento_admin';
              console.log('[videos] 📹 mi video de Firebase:', video);
            });
            allVideosFound = [...allVideosFound, ...myVideos];
          }
        } else {
          console.log('[videos] 📄 mi documento no existe');
        }
        
        // ADEMÁS, como admin también cargar desde localStorage (por si hay videos recientes)
        console.log('[videos] 💾 como admin, también revisando localStorage...');
        const myLocalVideos = JSON.parse(localStorage.getItem('yt_links') || '[]');
        console.log('[videos] 📱 videos en mi localStorage:', myLocalVideos.length);
        
        myLocalVideos.forEach(video => {
          // Solo agregar si no está duplicado por URL
          if (!allVideosFound.some(v => v.url === video.url)) {
            video.source = 'mi_localStorage';
            console.log('[videos] 🏠 mi video local:', video);
            allVideosFound.push(video);
          }
        });
        
      } catch (error2A) {
        console.log('[videos] ❌ error leyendo mi documento:', error2A.message);
        
        // Si falla Firebase, al menos usar localStorage
        console.log('[videos] 💾 fallback: usando solo localStorage para admin...');
        try {
          const localVideos = JSON.parse(localStorage.getItem('yt_links') || '[]');
          localVideos.forEach(video => {
            video.source = 'localStorage_fallback';
            allVideosFound.push(video);
          });
          console.log('[videos] 📱 videos cargados desde localStorage fallback:', localVideos.length);
        } catch (localError) {
          console.log('[videos] ❌ error también con localStorage fallback:', localError.message);
        }
      }
    }
    
    // Método 2B: Intentar leer desde colección videos_publicos
    try {
      console.log('[videos] 🌍 método 2B: buscando en colección videos_publicos...');
      const publicQuery = query(collection(db, 'videos_publicos'));
      const publicSnapshot = await getDocs(publicQuery);
      
      console.log('[videos] 📢 videos públicos encontrados:', publicSnapshot.docs.length);
      
      publicSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('[videos] 📝 video público:', doc.id, data);
        
        if (!data.deleted) {
          const publicVideo = {
            id: data.publicId || doc.id, // Usar el ID original si está disponible
            url: data.url,
            title: data.title,
            tags: data.tags || [],
            addedBy: data.addedBy,
            addedByEmail: data.addedByEmail,
            createdAt: data.createdAt,
            source: 'videos_publicos'
          };
          
          console.log('[videos] 📹 video público procesado:', publicVideo);
          allVideosFound = [...allVideosFound, publicVideo];
        }
      });
    } catch (error2B) {
      console.log('[videos] ❌ método videos_publicos falló:', error2B.message);
      
      // Fallback: Para usuarios regulares, intentar leer documentos conocidos de admin
      if (currentUser && !isUserAdmin) {
        try {
          console.log('[videos] 👥 fallback: usuario regular buscando documentos admin...');
          const knownAdminUIDs = ['xdn0qepExUdXehb2PNrjzEn0nAj1']; // Tu UID de admin
          
          for (const adminUID of knownAdminUIDs) {
            try {
              const adminDoc = doc(db, 'usuarios', adminUID);
              const adminSnap = await getDoc(adminDoc);
              
              if (adminSnap.exists()) {
                const adminData = adminSnap.data();
                console.log('[videos] 📄 documento admin encontrado:', {
                  uid: adminUID,
                  email: adminData.email,
                  hasVideos: !!adminData.videos,
                  videosCount: adminData.videos?.length || 0
                });
                
                if (adminData.videos && Array.isArray(adminData.videos)) {
                  const adminVideos = adminData.videos.filter(video => !video.deleted);
                  console.log('[videos] 🎬 videos de admin válidos:', adminVideos.length);
                  adminVideos.forEach(video => {
                    video.source = 'documento_admin';
                    console.log('[videos] 📹 video de admin:', video);
                  });
                  allVideosFound = [...allVideosFound, ...adminVideos];
                }
              }
            } catch (docError) {
              console.log('[videos] ❌ error leyendo documento admin:', adminUID, docError.message);
            }
          }
        } catch (fallbackError) {
          console.log('[videos] ❌ fallback también falló:', fallbackError.message);
        }
      }
    }
    
    // Método 3: Cargar desde localStorage
    try {
      console.log('[videos] 💾 método 3: buscando en localStorage...');
      const localVideos = JSON.parse(localStorage.getItem('yt_links') || '[]');
      console.log('[videos] 📱 videos en localStorage:', localVideos.length);
      
      localVideos.forEach(video => {
        video.source = 'localStorage';
        console.log('[videos] 🏠 video local:', video);
      });
      
      allVideosFound = [...allVideosFound, ...localVideos];
    } catch (error3) {
      console.log('[videos] ❌ método localStorage falló:', error3.message);
    }
    
    // Eliminar duplicados basados en URL
    const uniqueVideos = allVideosFound.reduce((acc, video) => {
      if (!acc.some(v => v.url === video.url)) {
        acc.push(video);
      }
      return acc;
    }, []);
    
    state.links = uniqueVideos;
    console.log('[videos] 🎯 total de videos únicos cargados:', uniqueVideos.length);
    console.log('[videos] 📊 fuentes:', uniqueVideos.map(v => v.source));
    
    return uniqueVideos;
    
  } catch (error) {
    console.error('[videos] error general cargando videos:', error);
    return [];
  }
}

// Función para guardar video en Firebase usando múltiples métodos
async function saveVideoToFirebase(videoData) {
  try {
    console.log('[videos] guardando video en Firebase:', videoData);
    console.log('[videos] currentUser:', currentUser);
    
    // Verificar que tenemos usuario autenticado
    if (!currentUser) {
      throw new Error('No hay usuario autenticado');
    }
    
    // Método 1: Intentar guardar en colección formularios
    try {
      console.log('[videos] 📋 método 1: intentando guardar en colección formularios...');
      const videoDoc = {
        tipo: 'video',
        url: videoData.url,
        title: videoData.title,
        tags: videoData.tags || [],
        addedBy: videoData.addedBy || currentUser.uid,
        addedByEmail: videoData.addedByEmail || currentUser.email,
        ownerUid: currentUser.uid,
        createdAt: serverTimestamp(),
        deleted: false
      };
      
      console.log('[videos] 📝 documento a guardar en formularios:', videoDoc);
      const docRef = await addDoc(collection(db, 'formularios'), videoDoc);
      
      const newVideo = {
        id: docRef.id,
        ...videoData,
        createdAt: new Date().toISOString(),
        source: 'formularios'
      };
      
      state.links.push(newVideo);
      console.log('[videos] ✅ video guardado exitosamente en formularios con ID:', docRef.id);
      return docRef.id;
      
    } catch (formularioError) {
      console.log('[videos] error en formularios, intentando documento usuario...', formularioError.message);
      
      // Método 2: Guardar en el documento del usuario admin
      try {
        console.log('[videos] 👤 método 2: intentando guardar en documento de usuario...');
        const userDocRef = doc(db, 'usuarios', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        const newVideo = {
          id: Date.now().toString(),
          url: videoData.url,
          title: videoData.title,
          tags: videoData.tags || [],
          addedBy: currentUser.uid,
          addedByEmail: currentUser.email,
          createdAt: new Date().toISOString(),
          deleted: false
        };
        
        let existingVideos = [];
        if (userDoc.exists()) {
          const userData = userDoc.data();
          existingVideos = userData.videos || [];
          console.log('[videos] 📊 videos existentes en documento usuario:', existingVideos.length);
        } else {
          console.log('[videos] 📄 documento de usuario no existe, se creará');
        }
        
        existingVideos.push(newVideo);
        console.log('[videos] 📝 guardando video en documento usuario:', newVideo);
        
        await updateDoc(userDocRef, { videos: existingVideos });
        
        // ADEMÁS, sincronizar con un documento especial en formularios
        try {
          console.log('[videos] 🔄 sincronizando con documento videos_compartidos...');
          
          // Buscar el documento especial de videos compartidos
          const videosSharedQuery = query(
            collection(db, 'formularios'), 
            where('tipo', '==', 'videos_compartidos'),
            where('ownerUid', '==', currentUser.uid)
          );
          
          const videosSharedSnapshot = await getDocs(videosSharedQuery);
          
          let sharedVideos = [];
          let sharedDocRef = null;
          
          if (!videosSharedSnapshot.empty) {
            // Ya existe el documento de videos compartidos
            const sharedDoc = videosSharedSnapshot.docs[0];
            sharedDocRef = sharedDoc.ref;
            const sharedData = sharedDoc.data();
            sharedVideos = sharedData.videos || [];
            console.log('[videos] 📄 documento videos_compartidos encontrado, videos actuales:', sharedVideos.length);
          }
          
          // Agregar el nuevo video a la lista
          const videoForShared = {
            id: newVideo.id,
            url: newVideo.url,
            title: newVideo.title,
            tags: newVideo.tags,
            addedBy: currentUser.uid,
            addedByEmail: currentUser.email,
            createdAt: newVideo.createdAt,
            deleted: false
          };
          
          sharedVideos.push(videoForShared);
          
          if (sharedDocRef) {
            // Actualizar documento existente
            await updateDoc(sharedDocRef, { videos: sharedVideos, updatedAt: serverTimestamp() });
            console.log('[videos] 🔄 documento videos_compartidos actualizado');
          } else {
            // Crear nuevo documento
            const newSharedDoc = {
              tipo: 'videos_compartidos',
              ownerUid: currentUser.uid,
              videos: sharedVideos,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };
            
            await addDoc(collection(db, 'formularios'), newSharedDoc);
            console.log('[videos] 📄 nuevo documento videos_compartidos creado');
          }
          
        } catch (sharedError) {
          console.log('[videos] ⚠️ error sincronizando con videos_compartidos:', sharedError.message);
          // No es crítico, el video ya se guardó en el documento usuario
        }
        
        newVideo.source = 'usuario_admin';
        state.links.push(newVideo);
        console.log('[videos] ✅ video guardado exitosamente en documento usuario con ID:', newVideo.id);
        
        // FORZAR sincronización: Guardar TODOS los videos del documento en localStorage
        try {
          console.log('[videos] 🔄 sincronizando TODOS mis videos a localStorage...');
          
          // Tomar todos los videos del documento usuario como fuente de verdad
          const allMyVideos = existingVideos.filter(video => !video.deleted);
          
          // Reemplazar completamente el localStorage con los videos de Firebase
          localStorage.setItem('yt_links', JSON.stringify(allMyVideos));
          console.log('[videos] 📱 localStorage actualizado con', allMyVideos.length, 'videos desde Firebase');
          
          // Actualizar también el estado local
          state.links = [...allMyVideos];
          
        } catch (localError) {
          console.log('[videos] ⚠️ no se pudo sincronizar localStorage:', localError.message);
        }
        
        return newVideo.id;
        
      } catch (userError) {
        console.log('[videos] error también en documento usuario:', userError.message);
        throw userError; // Pasar al fallback de localStorage
      }
    }
    
  } catch (error) {
    console.error('[videos] todos los métodos Firebase fallaron:', error.message);
    
    // Fallback: Guardar en localStorage
    try {
      console.log('[videos] guardando en localStorage como fallback...');
      const localVideos = JSON.parse(localStorage.getItem('yt_links') || '[]');
      const newLocalVideo = {
        id: Date.now().toString(),
        ...videoData,
        createdAt: new Date().toISOString(),
        savedLocally: true
      };
      
      localVideos.push(newLocalVideo);
      localStorage.setItem('yt_links', JSON.stringify(localVideos));
      state.links.push(newLocalVideo);
      
      console.log('[videos] video guardado en localStorage con ID:', newLocalVideo.id);
      alert('Video guardado localmente. Será sincronizado cuando se resuelvan los permisos.');
      return newLocalVideo.id;
      
    } catch (localError) {
      console.error('[videos] error también en localStorage:', localError);
      throw new Error('No se pudo guardar el video en ningún lado');
    }
  }
}

// Función para eliminar video usando múltiples métodos
async function deleteVideoFromFirebase(videoId) {
  let firebaseDeletedSuccessfully = false;
  
  try {
    console.log('[videos] eliminando video:', videoId);
    
    // Encontrar el video en el estado local para ver su origen
    const videoToDelete = state.links.find(v => v.id === videoId);
    if (!videoToDelete) {
      throw new Error('Video no encontrado en estado local');
    }
    
    console.log('[videos] video a eliminar:', videoToDelete);
    
    // Método 1: Si el video viene de la colección formularios (ID de Firestore)
    if (videoToDelete.id && videoToDelete.id.length > 15 && !videoToDelete.savedLocally) {
      try {
        console.log('[videos] intentando eliminar de formularios...');
        const videoDoc = doc(db, 'formularios', videoId);
        await updateDoc(videoDoc, { deleted: true });
        console.log('[videos] ✅ video eliminado de formularios');
        firebaseDeletedSuccessfully = true;
      } catch (formularioError) {
        console.log('[videos] ❌ error eliminando de formularios:', formularioError.message);
        // Continuar con otros métodos
      }
    }
    
    // Método 2: Buscar y eliminar de documentos de usuarios admin
    if (!firebaseDeletedSuccessfully) {
      try {
        console.log('[videos] intentando eliminar de mi documento de usuario...');
        
        // Solo intentar eliminar de MI documento de usuario (más eficiente y seguro)
        if (currentUser) {
          const myUserDoc = doc(db, 'usuarios', currentUser.uid);
          const myUserSnap = await getDoc(myUserDoc);
          
          if (myUserSnap.exists()) {
            const myUserData = myUserSnap.data();
            if (myUserData.videos && Array.isArray(myUserData.videos)) {
              const videoIndex = myUserData.videos.findIndex(v => v.id === videoId);
              if (videoIndex !== -1) {
                console.log('[videos] video encontrado en mi documento');
                
                // Marcar como eliminado en lugar de borrar
                myUserData.videos[videoIndex].deleted = true;
                
                await updateDoc(myUserDoc, {
                  videos: myUserData.videos
                });
                
                console.log('[videos] ✅ video eliminado de mi documento usuario');
                firebaseDeletedSuccessfully = true;
              }
            }
          }
        }
      } catch (userError) {
        console.log('[videos] ❌ error eliminando de mi documento usuario:', userError.message);
      }
    }
    
    // Método 3: Eliminar de localStorage si existe
    try {
      const localVideos = JSON.parse(localStorage.getItem('yt_links') || '[]');
      const filteredVideos = localVideos.filter(v => v.id !== videoId);
      
      if (localVideos.length !== filteredVideos.length) {
        localStorage.setItem('yt_links', JSON.stringify(filteredVideos));
        console.log('[videos] video eliminado de localStorage');
      }
    } catch (localError) {
      console.log('[videos] error eliminando de localStorage:', localError.message);
    }
    
    // Actualizar estado local
    state.links = state.links.filter(v => v.id !== videoId);
    console.log('[videos] video eliminado del estado local');
    
    // IMPORTANTE: Solo sincronizar con Firebase si se pudo eliminar allí
    // Si no se pudo eliminar de Firebase, mantener el localStorage como está (sin el video)
    if (firebaseDeletedSuccessfully && currentUser && isUserAdmin) {
      try {
        console.log('[videos] 🔄 eliminación exitosa en Firebase, sincronizando...');
        const myUserDoc = doc(db, 'usuarios', currentUser.uid);
        const myUserSnap = await getDoc(myUserDoc);
        
        if (myUserSnap.exists()) {
          const myUserData = myUserSnap.data();
          if (myUserData.videos && Array.isArray(myUserData.videos)) {
            const validVideos = myUserData.videos.filter(video => !video.deleted);
            
            // Reemplazar completamente localStorage y estado con la fuente de verdad de Firebase
            localStorage.setItem('yt_links', JSON.stringify(validVideos));
            state.links = [...validVideos];
            
            console.log('[videos] 🔄 sincronización post-eliminación: localStorage actualizado con', validVideos.length, 'videos desde Firebase');
          }
        }
      } catch (syncError) {
        console.log('[videos] ⚠️ no se pudo sincronizar después de eliminar:', syncError.message);
      }
    } else if (!firebaseDeletedSuccessfully) {
      console.log('[videos] 🚫 no se pudo eliminar de Firebase, manteniendo eliminación solo local');
      console.log('[videos] 📱 localStorage y estado mantienen la eliminación local del video');
    }
    
  } catch (error) {
    console.error('[videos] error eliminando video:', error);
    
    // Como último recurso, al menos eliminarlo del estado local
    state.links = state.links.filter(v => v.id !== videoId);
    console.log('[videos] video eliminado solo del estado local como fallback');
    
    throw error;
  }
}

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
      if(act==='del' && isUserAdmin){
        if(confirm('¿Estás seguro de que quieres eliminar este video?')) {
          try {
            await deleteVideoFromFirebase(item.id);
            renderLinks();
            console.log('[videos] video eliminado y lista actualizada');
          } catch (error) {
            console.error('[videos] error en el proceso de eliminación:', error);
            // Intentar actualizar la lista de todos modos por si se eliminó parcialmente
            renderLinks();
            alert('El video fue eliminado localmente. Puede que persista en Firebase debido a permisos.');
          }
        }
      }
    });
  });
}

// ===== AGREGAR NUEVOS LINKS (solo para admin) =====
// Agregar nuevo link (solo para admin)
const btnAddLink = document.getElementById('btn-add-link');
if (btnAddLink) {
  btnAddLink.addEventListener('click', async () => {
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
    
    const newVideo = {
      url: url,
      title: title,
      tags: tagsArray,
      addedBy: currentUser.uid,
      addedByEmail: currentUser.email
    };
    
    try {
      btnAddLink.disabled = true;
      btnAddLink.textContent = 'Guardando...';
      
      await saveVideoToFirebase(newVideo);
      renderLinks();
      
      // Generar código de sincronización para usuarios regulares
      if (isUserAdmin) {
        generateSyncCode();
      }
      
      alert('Video agregado exitosamente');
    } catch (error) {
      alert('Error al guardar el video');
    } finally {
      btnAddLink.disabled = false;
      btnAddLink.textContent = 'Agregar Video';
    }
  });
}

// Función para generar código de sincronización para usuarios
function generateSyncCode() {
  try {
    console.log('[videos] 🔗 generando código de sincronización...');
    
    // Obtener todos los videos del admin desde localStorage
    const adminVideos = JSON.parse(localStorage.getItem('yt_links') || '[]');
    
    if (adminVideos.length === 0) {
      console.log('[videos] ⚠️ no hay videos para sincronizar');
      return;
    }
    
    // Crear código de sincronización compacto
    const syncCode = `localStorage.setItem('yt_links',JSON.stringify(${JSON.stringify(adminVideos)}));alert('Videos sincronizados! Refresca la página.');`;

    console.log('[videos] 📋 código de sincronización generado');
    console.log('%c🔗 CÓDIGO PARA USUARIOS REGULARES (copia y pega en su consola):', 'font-weight: bold; color: #22c55e; font-size: 14px;');
    console.log('%c' + syncCode, 'background: #1f2937; color: #22c55e; padding: 10px; border-radius: 5px; font-family: monospace;');
    
  } catch (error) {
    console.error('[videos] ❌ error generando código de sincronización:', error);
  }
}

// ===== INICIALIZACIÓN Y CONFIGURACIÓN =====
// Inicializar
showTab(0);

// Solo inicializar links si los elementos existen
if (elGrid) {
  // Cargar videos desde Firebase al inicializar
  loadVideosFromFirebase().then(() => {
    renderLinks();
  });
  
  // Agregar event listeners solo si los elementos existen
  if (elSearch) elSearch.addEventListener('input', renderLinks);
  if (elTag) elTag.addEventListener('change', renderLinks);
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
async function renderVideos() {
  console.log('[videos] 🔍 renderVideos llamado');
  
  const videosGrid = document.getElementById('videos-grid');
  console.log('[videos] 🔍 videosGrid encontrado:', !!videosGrid);
  
  if (!videosGrid) {
    console.warn('[videos] ❌ videosGrid no encontrado');
    return;
  }
  
  try {
    // Cargar videos desde Firebase
    console.log('[videos] 📥 cargando videos desde Firebase...');
    const videos = await loadVideosFromFirebase();
    console.log('[videos] ✅ videos cargados desde Firebase:', videos.length);
    
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

// ===== SISTEMA DE RESERVAS =====
// Sistema de reserva de clases con calendario y pago
(function initBookingSystem() {
  console.log('[booking] inicializando sistema de reservas...');
  
  // Verificar que la sección existe
  const reservaSection = document.getElementById('sec-reserva');
  console.log('[booking] 🔍 sección reserva encontrada:', !!reservaSection);
  
  // Variables globales del sistema de reservas
  let currentDate = new Date();
  let selectedDate = null;
  let selectedTime = null;
  let bookedSlots = []; // Horarios ya reservados
  
  // Horarios disponibles (formato 24h)
  const availableTimes = [
    '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'
  ];
  
  // Elementos del DOM
  const prevMonthBtn = document.getElementById('prev-month');
  const nextMonthBtn = document.getElementById('next-month');
  const currentMonthEl = document.getElementById('current-month');
  const calendarGrid = document.getElementById('calendar-grid');
  const timeSlotsSection = document.getElementById('time-slots');
  const timeGrid = document.getElementById('time-grid');
  const bookingSummary = document.getElementById('booking-summary');
  const bookingDetails = document.getElementById('booking-details');
  const confirmBookingBtn = document.getElementById('btn-confirm-booking');
  
  // Modal de pago
  const paymentModal = document.getElementById('modal-payment');
  const paymentDetails = document.getElementById('payment-details');
  const paymentQR = document.getElementById('payment-qr');
  const closePaymentBtn = document.getElementById('btn-close-payment');
  const cancelPaymentBtn = document.getElementById('btn-cancel-payment');
  const paymentDoneBtn = document.getElementById('btn-payment-done');
  const paymentOverlay = document.getElementById('modal-payment-overlay');
  
  if (!prevMonthBtn || !nextMonthBtn || !currentMonthEl || !calendarGrid) {
    console.warn('[booking] elementos del calendario no encontrados');
    console.warn('[booking] 🔍 elementos:', {
      prevMonthBtn: !!prevMonthBtn,
      nextMonthBtn: !!nextMonthBtn,
      currentMonthEl: !!currentMonthEl,
      calendarGrid: !!calendarGrid
    });
    return;
  }
  
  console.log('[booking] elementos encontrados, iniciando...');

  // Función para migrar reservas de localStorage a Firestore (solo se ejecuta una vez)
  async function migrateLocalReservationsToFirestore() {
    try {
      // Verificar si ya se migró anteriormente
      const migrationKey = 'golf_reservas_migrated_to_firestore';
      if (localStorage.getItem(migrationKey) === 'true') {
        console.log('[migration] ✅ migración ya realizada anteriormente');
        return;
      }

      console.log('[migration] 🔄 iniciando migración de localStorage a Firestore...');

      const localBookings = JSON.parse(localStorage.getItem('golf_reservas') || '[]');

      if (localBookings.length === 0) {
        console.log('[migration] ✅ no hay reservas locales para migrar');
        localStorage.setItem(migrationKey, 'true');
        return;
      }

      console.log('[migration] 📦 migrando', localBookings.length, 'reservas a Firestore...');

      let migratedCount = 0;
      const batch = [];

      for (const booking of localBookings) {
        try {
          // Verificar si la reserva ya existe en Firestore (por fecha, hora y email)
          const existingQuery = query(
            collection(db, 'reservas'),
            where('date', '==', booking.date),
            where('time', '==', booking.time),
            where('studentEmail', '==', booking.studentEmail || '')
          );
          const existingSnapshot = await getDocs(existingQuery);

          if (existingSnapshot.empty) {
            // La reserva no existe, migrarla
            const reservaDocument = {
              ...booking,
              createdAt: serverTimestamp(),
              migratedFromLocal: true
            };

            // Remover el ID local antes de guardar en Firestore
            delete reservaDocument.id;

            const docRef = await addDoc(collection(db, 'reservas'), reservaDocument);
            migratedCount++;
            console.log('[migration] ✅ reserva migrada:', docRef.id);
          } else {
            console.log('[migration] ⏭️ reserva ya existe, omitiendo:', booking.date, booking.time);
          }
        } catch (bookingError) {
          console.error('[migration] ❌ error migrando reserva individual:', bookingError);
        }
      }

      // Marcar migración como completa
      localStorage.setItem(migrationKey, 'true');
      console.log('[migration] ✅ migración completada:', migratedCount, 'de', localBookings.length, 'reservas migradas');

    } catch (error) {
      console.error('[migration] ❌ error durante migración:', error);
      // No marcar como completada si falló
    }
  }

  // Cargar reservas existentes desde Firestore (sincronización en tiempo real)
  async function loadBookedSlots() {
    try {
      console.log('[booking] 📥 cargando reservas desde Firestore...');

      // Migrar reservas existentes de localStorage a Firestore (solo una vez)
      await migrateLocalReservationsToFirestore();

      // Cargar reservas desde Firestore
      const reservasQuery = query(
        collection(db, 'reservas'),
        where('status', '==', 'confirmed')
      );
      const querySnapshot = await getDocs(reservasQuery);

      bookedSlots = [];
      const now = new Date();

      querySnapshot.forEach((doc) => {
        const booking = doc.data();
        const bookingDate = new Date(booking.date + 'T' + booking.time);

        // Solo considerar reservas confirmadas (pagadas) y no expiradas
        if (bookingDate >= now) {
          bookedSlots.push({
            date: booking.date,
            time: booking.time,
            id: doc.id
          });
        }
      });

      console.log('[booking] ✅ reservas cargadas desde Firestore:', bookedSlots.length);
    } catch (error) {
      console.error('[booking] ❌ error cargando reservas desde Firestore:', error);
      console.log('[booking] 🔄 intentando cargar desde localStorage como respaldo...');

      // Respaldo: cargar desde localStorage si Firestore falla
      try {
        const localBookings = JSON.parse(localStorage.getItem('golf_reservas') || '[]');
        bookedSlots = [];
        const now = new Date();

        localBookings.forEach((booking) => {
          const bookingDate = new Date(booking.date + 'T' + booking.time);
          if (booking.status === 'confirmed' && bookingDate >= now) {
            bookedSlots.push({
              date: booking.date,
              time: booking.time,
              id: booking.id
            });
          }
        });

        console.log('[booking] ✅ reservas cargadas desde localStorage (respaldo):', bookedSlots.length);
      } catch (localError) {
        console.error('[booking] ❌ error también en localStorage:', localError);
      }
    }
  }
  
  // Guardar reserva en Firestore (sincronización automática)
  async function saveBooking(bookingData) {
    try {
      console.log('[booking] 💾 guardando reserva en Firestore...');
      console.log('[booking] 🔍 datos a guardar:', bookingData);

      const reservaDocument = {
        ...bookingData,
        createdAt: serverTimestamp(),
        ownerUid: currentUser?.uid || 'anonymous',
        ownerEmail: currentUser?.email || 'anonymous'
      };

      console.log('[booking] 📝 documento final a guardar:', reservaDocument);

      // Guardar en Firestore
      const docRef = await addDoc(collection(db, 'reservas'), reservaDocument);
      const reservaId = docRef.id;

      console.log('[booking] ✅ reserva guardada en Firestore con ID:', reservaId);

      // También guardar en localStorage como respaldo
      try {
        const existingBookings = JSON.parse(localStorage.getItem('golf_reservas') || '[]');
        const localReserva = {
          ...reservaDocument,
          id: reservaId,
          createdAt: new Date().toISOString()
        };
        existingBookings.push(localReserva);
        localStorage.setItem('golf_reservas', JSON.stringify(existingBookings));
        console.log('[booking] 📦 reserva también guardada en localStorage como respaldo');
      } catch (localError) {
        console.warn('[booking] ⚠️ no se pudo guardar respaldo local:', localError);
      }

      return reservaId;
    } catch (error) {
      console.error('[booking] ❌ error guardando reserva en Firestore:', error);
      console.log('[booking] 🔄 intentando guardar solo en localStorage...');

      // Respaldo: guardar solo en localStorage si Firestore falla
      try {
        const reservaId = 'res_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const reservaDocument = {
          ...bookingData,
          id: reservaId,
          createdAt: new Date().toISOString(),
          ownerUid: currentUser?.uid || 'anonymous',
          ownerEmail: currentUser?.email || 'anonymous'
        };

        const existingBookings = JSON.parse(localStorage.getItem('golf_reservas') || '[]');
        existingBookings.push(reservaDocument);
        localStorage.setItem('golf_reservas', JSON.stringify(existingBookings));

        console.log('[booking] ✅ reserva guardada en localStorage (respaldo) con ID:', reservaId);
        return reservaId;
      } catch (localError) {
        console.error('[booking] ❌ error también en localStorage:', localError);
        throw error;
      }
    }
  }
  
  // Verificar si un horario está ocupado
  function isSlotBooked(date, time) {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    return bookedSlots.some(slot => 
      slot.date === dateStr && slot.time === time
    );
  }
  
  // Generar calendario
  function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Actualizar header del mes
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    currentMonthEl.textContent = `${monthNames[month]} ${year}`;
    
    // Limpiar grid (mantener headers de días)
    const dayHeaders = calendarGrid.querySelectorAll('.text-sm.font-medium');
    calendarGrid.innerHTML = '';
    dayHeaders.forEach(header => calendarGrid.appendChild(header));
    
    // Re-agregar headers si no existen
    if (dayHeaders.length === 0) {
      const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      daysOfWeek.forEach(day => {
        const dayEl = document.createElement('div');
        dayEl.className = 'text-center text-sm font-medium p-2 muted';
        dayEl.textContent = day;
        calendarGrid.appendChild(dayEl);
      });
    }
    
    // Calcular días
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    // Agregar días vacíos al inicio
    for (let i = 0; i < startingDay; i++) {
      const emptyDay = document.createElement('div');
      emptyDay.className = 'p-2';
      calendarGrid.appendChild(emptyDay);
    }
    
    // Agregar días del mes
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      const isPast = dayDate < today.setHours(0, 0, 0, 0);
      const isToday = dayDate.toDateString() === new Date().toDateString();
      const isSelected = selectedDate && dayDate.toDateString() === selectedDate.toDateString();
      
      const dayEl = document.createElement('button');
      dayEl.className = `p-2 text-center rounded-md transition-colors ${
        isPast 
          ? 'text-gray-500 cursor-not-allowed' 
          : isSelected
            ? 'bg-green-600 text-white font-medium'
            : isToday
              ? 'bg-blue-600 text-white font-medium hover:bg-blue-700'
              : 'hover:bg-gray-700 border border-transparent hover:border-gray-600'
      }`;
      dayEl.textContent = day;
      dayEl.disabled = isPast;
      
      if (!isPast) {
        dayEl.addEventListener('click', () => selectDate(dayDate));
      }
      
      calendarGrid.appendChild(dayEl);
    }
  }
  
  // Seleccionar fecha
  async function selectDate(date) {
    selectedDate = date;
    selectedTime = null;
    renderCalendar();
    
    // Recargar reservas para la nueva fecha seleccionada
    await loadBookedSlots();
    showTimeSlots();
    updateBookingSummary();
  }
  
  // Mostrar horarios disponibles
  function showTimeSlots() {
    if (!selectedDate) {
      timeSlotsSection.classList.add('hidden');
      return;
    }
    
    timeSlotsSection.classList.remove('hidden');
    timeGrid.innerHTML = '';
    
    availableTimes.forEach(time => {
      const isBooked = isSlotBooked(selectedDate, time);
      const isSelected = selectedTime === time;
      
      const timeBtn = document.createElement('button');
      timeBtn.className = `p-3 text-center rounded-md border transition-colors ${
        isBooked
          ? 'bg-red-600 text-white border-red-600 cursor-not-allowed opacity-75'
          : isSelected
            ? 'bg-green-600 text-white border-green-600 font-medium'
            : 'border-gray-600 hover:border-green-600 hover:bg-green-600/20'
      }`;
      timeBtn.textContent = isBooked ? `${time} (Ocupado)` : time;
      timeBtn.disabled = isBooked;
      
      if (!isBooked) {
        timeBtn.addEventListener('click', () => selectTime(time));
      }
      
      timeGrid.appendChild(timeBtn);
    });
  }
  
  // Seleccionar hora
  function selectTime(time) {
    selectedTime = time;
    showTimeSlots();
    updateBookingSummary();
  }
  
  // Actualizar resumen de reserva
  function updateBookingSummary() {
    if (!selectedDate || !selectedTime) {
      bookingSummary.classList.add('hidden');
      confirmBookingBtn.classList.add('hidden');
      return;
    }
    
    const dateStr = selectedDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    bookingDetails.innerHTML = `
      <div><strong>Fecha:</strong> ${dateStr}</div>
      <div><strong>Hora:</strong> ${selectedTime}</div>
      <div><strong>Duración:</strong> 1 hora</div>
      <div><strong>Instructor:</strong> Luciano Sancho</div>
    `;
    
    bookingSummary.classList.remove('hidden');
    confirmBookingBtn.classList.remove('hidden');
  }
  
  // Confirmar reserva (mostrar modal de pago)
  function confirmBooking() {
    if (!selectedDate || !selectedTime) return;
    
    const dateStr = selectedDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Actualizar detalles en el modal de pago
    paymentDetails.innerHTML = `
      <div><strong>Fecha:</strong> ${dateStr}</div>
      <div><strong>Hora:</strong> ${selectedTime}</div>
      <div><strong>Duración:</strong> 1 hora</div>
      <div><strong>Instructor:</strong> Luciano Sancho</div>
    `;
    
    // Generar QR para pago
    generatePaymentQR();
    
    // Mostrar modal
    paymentModal.classList.remove('hidden');
    window.lucide?.createIcons();
  }
  
  // Generar QR para pago
  function generatePaymentQR() {
    try {
      const paymentData = `CVU: 0000003100041354955291
Alias: lucianosancho22
Nombre: Luciano Joaquin Sancho
Monto: $20000
Concepto: Seña clase golf ${selectedDate.toLocaleDateString()} ${selectedTime}
Instructor: Luciano Sancho Golf`;
      
      // Ajustar tamaño del canvas
      paymentQR.width = 200;
      paymentQR.height = 200;
      
      // Generar QR
      if (window.QRCode) {
        QRCode.toCanvas(paymentQR, paymentData, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        }, (error) => {
          if (error) {
            console.error('[booking] error generando QR de pago:', error);
          } else {
            console.log('[booking] QR de pago generado exitosamente');
          }
        });
      }
    } catch (error) {
      console.error('[booking] error generando QR de pago:', error);
    }
  }
  
  // Confirmar pago realizado
  async function confirmPayment() {
    try {
      // Verificar que tengamos los datos necesarios
      if (!selectedDate || !selectedTime) {
        alert('Error: No se pudieron obtener los datos de la reserva');
        return;
      }
      
      // Verificar que el horario no haya sido reservado mientras tanto
      await loadBookedSlots(); // Recargar para estar seguros
      if (isSlotBooked(selectedDate, selectedTime)) {
        alert('Lo siento, este horario acaba de ser reservado. Por favor selecciona otro horario.');
        paymentModal.classList.add('hidden');
        showTimeSlots(); // Actualizar horarios disponibles
        return;
      }
      
      // Preparar datos de la reserva (campos simples para evitar errores)
      const bookingData = {
        date: selectedDate.toISOString().split('T')[0], // YYYY-MM-DD
        time: selectedTime,
        status: 'confirmed',
        amount: 15000,
        deposit: 7500,
        studentName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Usuario',
        studentEmail: currentUser?.email || 'sin-email',
        instructor: 'Luciano Sancho',
        duration: '1 hora',
        paymentDate: new Date().toISOString()
      };
      
      console.log('[booking] 💾 guardando reserva confirmada:', bookingData);
      
      // Guardar en Firebase
      const reservationId = await saveBooking(bookingData);
      
      // Agregar a la lista local de reservas
      bookedSlots.push({
        date: bookingData.date,
        time: bookingData.time,
        id: reservationId
      });
      
      // Mostrar confirmación
      const fechaFormateada = selectedDate.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      alert(`¡Reserva confirmada exitosamente!
      
Detalles de tu reserva:
• Fecha: ${fechaFormateada}
• Hora: ${selectedTime}
• Instructor: Luciano Sancho
• ID de reserva: ${reservationId}

Tu clase ha sido reservada y el pago de la seña confirmado.

IMPORTANTE: Esta reserva se ha guardado localmente en tu dispositivo. Para cancelar o modificar la reserva, contacta directamente con el instructor.`);
      
      // Limpiar selección
      selectedDate = null;
      selectedTime = null;
      
      // Actualizar UI
      renderCalendar();
      timeSlotsSection.classList.add('hidden');
      bookingSummary.classList.add('hidden');
      confirmBookingBtn.classList.add('hidden');
      
      // Cerrar modal
      paymentModal.classList.add('hidden');
      
    } catch (error) {
      console.error('[booking] ❌ error confirmando pago:', error);
      alert('Error al confirmar la reserva. Por favor intenta nuevamente.');
    }
  }
  
  // Event listeners
  prevMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
  
  nextMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });
  
  confirmBookingBtn.addEventListener('click', confirmBooking);
  
  // Event listeners del modal de pago
  if (closePaymentBtn) {
    closePaymentBtn.addEventListener('click', () => {
      paymentModal.classList.add('hidden');
    });
  }
  
  if (cancelPaymentBtn) {
    cancelPaymentBtn.addEventListener('click', () => {
      paymentModal.classList.add('hidden');
    });
  }
  
  if (paymentDoneBtn) {
    paymentDoneBtn.addEventListener('click', confirmPayment);
  }
  
  if (paymentOverlay) {
    paymentOverlay.addEventListener('click', () => {
      paymentModal.classList.add('hidden');
    });
  }
  
  // Inicializar calendario y cargar reservas existentes
  renderCalendar();
  
  // Cargar reservas existentes al inicializar
  loadBookedSlots().then(() => {
    console.log('[booking] sistema de reservas inicializado correctamente con', bookedSlots.length, 'reservas existentes');
  }).catch(error => {
    console.error('[booking] error inicial cargando reservas:', error);
    console.log('[booking] sistema de reservas inicializado sin reservas previas');
  });
})();

// ===== SISTEMA DE GESTIÓN DE RESERVAS (ADMIN) =====
// Panel administrativo para ver y gestionar reservas
(function initReservasManagement() {
  console.log('[reservas] inicializando sistema de gestión de reservas...');
  
  const reservasList = document.getElementById('reservas-list');
  const noReservasMessage = document.getElementById('no-reservas-message');
  const refreshBtn = document.getElementById('btn-refresh-reservas');
  
  if (!reservasList || !noReservasMessage) {
    console.warn('[reservas] elementos no encontrados');
    return;
  }
  
  // Función para cargar y mostrar todas las reservas desde Firestore
  async function loadReservas() {
    try {
      console.log('[reservas] cargando reservas desde Firestore...');

      // Migrar reservas existentes de localStorage a Firestore (solo una vez)
      await migrateLocalReservationsToFirestore();

      // Obtener todas las reservas desde Firestore
      const reservasQuery = query(
        collection(db, 'reservas'),
        orderBy('date', 'desc'),
        orderBy('time', 'desc')
      );
      const querySnapshot = await getDocs(reservasQuery);

      const reservas = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        reservas.push({
          ...data,
          id: doc.id,
          // Convertir timestamp de Firestore a string para compatibilidad
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
        });
      });

      console.log('[reservas] reservas encontradas en Firestore:', reservas.length);

      // Limpiar lista actual
      reservasList.innerHTML = '';

      if (reservas.length === 0) {
        noReservasMessage.classList.remove('hidden');
        return;
      } else {
        noReservasMessage.classList.add('hidden');
      }

      // Ordenar reservas por fecha y hora (más recientes primero)
      const reservasOrdenadas = reservas.sort((a, b) => {
        const dateA = new Date(a.date + 'T' + a.time);
        const dateB = new Date(b.date + 'T' + b.time);
        return dateB - dateA; // Orden descendente (más recientes primero)
      });

      // Crear elementos para cada reserva
      reservasOrdenadas.forEach(reserva => {
        const reservaElement = createReservaElement(reserva);
        reservasList.appendChild(reservaElement);
      });

      // Actualizar iconos de Lucide
      window.lucide?.createIcons();
      
    } catch (error) {
      console.error('[reservas] error cargando reservas desde Firestore:', error);
      console.log('[reservas] 🔄 intentando cargar desde localStorage como respaldo...');

      // Respaldo: cargar desde localStorage si Firestore falla
      try {
        const reservas = JSON.parse(localStorage.getItem('golf_reservas') || '[]');
        console.log('[reservas] reservas encontradas en localStorage (respaldo):', reservas.length);

        reservasList.innerHTML = '';

        if (reservas.length === 0) {
          noReservasMessage.classList.remove('hidden');
          return;
        } else {
          noReservasMessage.classList.add('hidden');
        }

        const reservasOrdenadas = reservas.sort((a, b) => {
          const dateA = new Date(a.date + 'T' + a.time);
          const dateB = new Date(b.date + 'T' + b.time);
          return dateB - dateA;
        });

        reservasOrdenadas.forEach(reserva => {
          const reservaElement = createReservaElement(reserva);
          reservasList.appendChild(reservaElement);
        });

        window.lucide?.createIcons();
        console.log('[reservas] ✅ reservas cargadas desde localStorage (respaldo)');
      } catch (localError) {
        console.error('[reservas] ❌ error también en localStorage:', localError);
        alert('Error al cargar las reservas desde Firestore y localStorage');
      }
    }
  }
  
  // Función para crear elemento HTML de una reserva
  function createReservaElement(reserva) {
    const div = document.createElement('div');
    div.className = 'p-4 border rounded-lg';
    div.style.borderColor = 'var(--border)';
    div.style.background = 'var(--card)';
    
    // Formatear fecha
    const fechaReserva = new Date(reserva.date + 'T' + reserva.time);
    const fechaFormateada = fechaReserva.toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Determinar si la reserva es pasada
    const esPasada = fechaReserva < new Date();
    const estadoClass = esPasada ? 'text-red-400' : 'text-green-400';
    const estadoText = esPasada ? 'Pasada' : 'Activa';
    
    div.innerHTML = `
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <h3 class="font-medium">${reserva.studentName || 'Sin nombre'}</h3>
            <span class="px-2 py-1 rounded text-xs ${estadoClass} border" style="border-color: currentColor;">
              ${estadoText}
            </span>
          </div>
          <div class="text-sm muted space-y-1">
            <div><i data-lucide="calendar" class="w-4 h-4 inline mr-2"></i>${fechaFormateada}</div>
            <div><i data-lucide="clock" class="w-4 h-4 inline mr-2"></i>${reserva.time}</div>
            <div><i data-lucide="user" class="w-4 h-4 inline mr-2"></i>Instructor: Luciano Sancho</div>
            ${reserva.studentEmail ? `<div><i data-lucide="mail" class="w-4 h-4 inline mr-2"></i>${reserva.studentEmail}</div>` : ''}
            ${reserva.studentPhone ? `<div><i data-lucide="phone" class="w-4 h-4 inline mr-2"></i>${reserva.studentPhone}</div>` : ''}
          </div>
        </div>
        <button 
          class="px-3 py-2 rounded-md border btn text-sm text-red-400 hover:bg-red-500/10" 
          style="border-color: var(--border);"
          onclick="deleteReserva('${reserva.id}')"
          title="Eliminar reserva"
        >
          <i data-lucide="trash-2" class="w-4 h-4 inline mr-1"></i>Eliminar
        </button>
      </div>
      
      <div class="pt-3 border-t text-xs muted" style="border-color: var(--border);">
        <div class="flex justify-between">
          <span>ID: ${reserva.id}</span>
          <span>Creada: ${new Date(reserva.createdAt).toLocaleDateString('es-AR')}</span>
        </div>
        <div class="mt-1">
          <span>Estado de pago: </span>
          <span class="text-green-400">${reserva.paymentStatus || 'Confirmado'}</span>
        </div>
      </div>
    `;
    
    return div;
  }
  
  // Función para eliminar reserva desde Firestore
  window.deleteReserva = async function(reservaId) {
    try {
      console.log('[reservas] solicitando eliminación de reserva:', reservaId);

      // Confirmar eliminación
      if (!confirm('¿Estás seguro de que quieres eliminar esta reserva? Esta acción no se puede deshacer.')) {
        return;
      }

      try {
        // Eliminar de Firestore
        const reservaRef = doc(db, 'reservas', reservaId);
        await deleteDoc(reservaRef);
        console.log('[reservas] reserva eliminada de Firestore:', reservaId);
      } catch (firestoreError) {
        console.error('[reservas] error eliminando de Firestore:', firestoreError);
        console.log('[reservas] intentando eliminar solo de localStorage...');
      }

      // También eliminar de localStorage (para mantener sincronización)
      try {
        const reservas = JSON.parse(localStorage.getItem('golf_reservas') || '[]');
        const reservasFiltradas = reservas.filter(reserva => reserva.id !== reservaId);

        if (reservasFiltradas.length !== reservas.length) {
          localStorage.setItem('golf_reservas', JSON.stringify(reservasFiltradas));
          console.log('[reservas] reserva también eliminada de localStorage');
        }
      } catch (localError) {
        console.warn('[reservas] error eliminando de localStorage:', localError);
      }

      console.log('[reservas] reserva eliminada exitosamente:', reservaId);

      // Recargar lista
      await loadReservas();
      
      alert('Reserva eliminada exitosamente');
      
    } catch (error) {
      console.error('[reservas] error eliminando reserva:', error);
      alert('Error al eliminar la reserva');
    }
  };
  
  // Event listener para botón de actualizar
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadReservas);
  }
  
  // Función pública para recargar reservas cuando sea necesario
  window.refreshReservas = loadReservas;
  
  // Cargar reservas iniciales cuando se accede a la sección
  const originalSwitchTo = window.switchTo;
  window.switchTo = function(target) {
    originalSwitchTo(target);
    if (target === 'reservas') {
      loadReservas();
    }
  };
  
  console.log('[reservas] sistema de gestión de reservas inicializado');
})();
