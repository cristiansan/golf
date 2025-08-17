// Variables globales para autenticación (deben ir antes de cualquier función que las use)
let currentUser = null;
let isUserAdmin = false;

// Función para generar hash SHA-256 (debe ir antes de cualquier función que la use)
async function sha256Hex(str){
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

// Función para mostrar/ocultar la app según el estado de auth
function toggleAppVisibility(isLoggedIn) {
  const loginOverlay = document.getElementById('login-overlay');
  const mainContent = document.querySelector('main');
  const header = document.querySelector('header');
  
  if (isLoggedIn) {
    // Usuario logueado - mostrar app
    loginOverlay.style.display = 'none';
    mainContent.style.display = 'block';
    header.style.display = 'flex';
  } else {
    // Usuario no logueado - mostrar overlay de login
    loginOverlay.style.display = 'flex';
    mainContent.style.display = 'none';
    header.style.display = 'none';
  }
}

// Inicialización de iconos Lucide
document.addEventListener('DOMContentLoaded', () => { window.lucide?.createIcons(); console.log('[app] DOMContentLoaded'); });

// Firebase (ESM)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js';
import { getAuth, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc, initializeFirestore, getDocs, query, orderBy, updateDoc, setDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js';

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
try { getAnalytics(fbApp); } catch(e) { console.warn('[firebase] analytics no disponible', e?.message||e); }
const db = initializeFirestore(fbApp, { experimentalAutoDetectLongPolling: true });
const storage = getStorage(fbApp);
const auth = getAuth(fbApp);

// Referencia a config de admin en Firestore
const ADMIN_CONFIG_REF = doc(db, 'config', 'admin');

function isSha256Hex(s){ return typeof s === 'string' && /^[a-f0-9]{64}$/i.test(String(s).trim()); }

async function fetchAdminKeyFromFirebase(){
  try {
    await ensureAuth();
    const snap = await getDoc(ADMIN_CONFIG_REF);
    if (!snap.exists()) return '';
    const data = snap.data() || {};
    // Puede venir como 'admin_key_hash' (sha-256 hex) o 'admin_key' (texto plano)
    return String((data.admin_key_hash ?? data.admin_key ?? '') || '').trim();
  } catch (e) {
    console.warn('[admin] no se pudo leer admin_key', e?.message||e);
    return '';
  }
}

function setIsAdminLocal(flag){
  try { localStorage.setItem('is_admin', flag ? '1' : ''); } catch {}
}
function isAdminLocal(){
  try { return localStorage.getItem('is_admin') === '1'; } catch { return false; }
}

async function ensureAuth() {
  try {
    if (auth.currentUser) return auth.currentUser;
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (e) {
    console.warn('[firebase] error autenticando anónimo', e);
    return null;
  }
}

// Click en logo para login de admin
(function initAdminLoginViaLogo(){
  const logo = document.getElementById('drawer-logo');
  if (!logo) return;
  logo.style.cursor = 'pointer';
  logo.addEventListener('click', async()=>{
    try {
      await ensureAuth();
      const entered = prompt('Ingrese clave de administrador:');
      if (entered == null) return;
      const [storedVal, enteredHash] = await Promise.all([
        fetchAdminKeyFromFirebase(),
        sha256Hex(String(entered).trim()),
      ]);
      if (!storedVal) { alert('Configuración de clave no encontrada en Firebase'); return; }
      const enteredPlain = String(entered).trim();
      const ok = isSha256Hex(storedVal) ? (enteredHash === storedVal) : (enteredPlain === storedVal);
      if (!ok) { alert('Clave incorrecta'); return; }
      // éxito
      try { localStorage.setItem('admin_key_hash', storedVal); } catch {}
      setIsAdminLocal(true);
      
      // Actualizar UI de admin inmediatamente
      updateAdminUI(true);
      ensureAlumnosNav();
      
      alert('Acceso administrador concedido');
    } catch (e) {
      console.error('[admin] error:', e);
      alert('Error validando clave de administrador');
    }
  });
})();

// Helpers de secciones
const sections = { formulario: sec('formulario'), videos: sec('videos'), links: sec('links'), qr: sec('qr') };
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

if (isAdminLocal()) {
  ensureAlumnosNav();
}

// Actualizar UI de admin (función global)
function updateAdminUI(isAdmin) {
  // Considerar tanto admin de Firebase como admin local
  const isAdminFromFirebase = isAdmin;
  const isAdminFromLocal = isAdminLocal();
  const shouldShowAdmin = isAdminFromFirebase || isAdminFromLocal;
  
  const header = document.getElementById('nav-admin-header');
  const group = document.getElementById('nav-admin');
  
  if (header && group) {
    header.style.display = shouldShowAdmin ? '' : 'none';
    group.style.display = shouldShowAdmin ? '' : 'none';
  }
  
  // Asegurar que el botón de Alumnos esté disponible
  if (shouldShowAdmin) {
    ensureAlumnosNav();
  }
}

// Mostrar/ocultar botón Links según admin (usando el nuevo sistema)
function ensureLinksNavVisibility(){
  // Esta función ahora se maneja desde updateAdminUI
  // Solo se ejecuta al cargar la página
  if (currentUser) {
    checkUserAdminStatus(currentUser);
  } else {
    // Si no hay usuario logueado, verificar admin local
    updateAdminUI(false);
  }
}
ensureLinksNavVisibility();

// Sistema de Autenticación
(function initAuth() {
  const loginModal = document.getElementById('modal-login');
  const registerModal = document.getElementById('modal-register');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const btnLogin = document.getElementById('btn-login');
  const btnLogout = document.getElementById('btn-logout');
  const userInfo = document.getElementById('user-info');
  const userEmail = document.getElementById('user-email');

  // Verificar si el usuario es admin
  async function checkUserAdminStatus(user) {
    if (!user) return false;
    
    try {
      // Buscar el perfil del usuario en Firestore
      const userQuery = query(
        collection(db, 'usuarios'), 
        query => query.where('uid', '==', user.uid)
      );
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data();
        isUserAdmin = userData.admin === true;
        console.log('[auth] usuario admin:', isUserAdmin);
        
        // Actualizar UI de admin
        updateAdminUI(isUserAdmin);
      } else {
        isUserAdmin = false;
        updateAdminUI(false);
      }
    } catch (error) {
      console.warn('[auth] error verificando admin:', error);
      isUserAdmin = false;
      updateAdminUI(false);
    }
    
    return isUserAdmin;
  }



  // Verificar si el usuario ya tiene formulario
  async function checkUserHasForm(user) {
    if (!user) return false;
    
    try {
      const formQuery = query(
        collection(db, 'formularios'),
        query => query.where('email', '==', user.email)
      );
      const formSnapshot = await getDocs(formQuery);
      return !formSnapshot.empty;
    } catch (error) {
      console.warn('[auth] error verificando formulario:', error);
      return false;
    }
  }

  // Estado de autenticación
  async function updateAuthUI(user) {
    currentUser = user;
    
    if (user) {
      // Usuario logueado
      btnLogin.style.display = 'none';
      userInfo.style.display = 'flex';
      
      // Mostrar solo el nombre del usuario sin el dominio del email
      const displayName = user.displayName || user.email?.split('@')[0] || 'Usuario';
      userEmail.textContent = displayName;
      
      // Mostrar la app
      toggleAppVisibility(true);
      
      // Verificar si es admin
      checkUserAdminStatus(user);
      
      // Verificar si ya tiene formulario y cambiar sección por defecto
      const hasForm = await checkUserHasForm(user);
      if (hasForm) {
        // Si ya tiene formulario, mostrar Videos por defecto
        switchTo('videos');
      } else {
        // Si no tiene formulario, mostrar Formulario por defecto
        switchTo('formulario');
      }
      
      // Guardar en localStorage si está marcado "recordarme"
      const rememberMe = document.getElementById('login-remember')?.checked;
      if (rememberMe) {
        try { localStorage.setItem('auth_remember', '1'); } catch {}
      }
    } else {
      // Usuario no logueado
      btnLogin.style.display = 'block';
      userInfo.style.display = 'none';
      userEmail.textContent = '';
      isUserAdmin = false;
      
      // Limpiar admin local cuando no hay usuario logueado
      setIsAdminLocal(false);
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

  // Mostrar modal de login
  btnLogin?.addEventListener('click', () => {
    loginModal.classList.remove('hidden');
    window.lucide?.createIcons();
  });

  // Event listener para el botón de login obligatorio
  document.getElementById('btn-login-required')?.addEventListener('click', () => {
    document.getElementById('modal-login').classList.remove('hidden');
    window.lucide?.createIcons();
  });

  // Cerrar modales
  function closeModals() {
    loginModal.classList.add('hidden');
    registerModal.classList.add('hidden');
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
    loginModal.classList.add('hidden');
    registerModal.classList.remove('hidden');
    window.lucide?.createIcons();
  });

  document.getElementById('btn-show-login')?.addEventListener('click', () => {
    registerModal.classList.add('hidden');
    loginModal.classList.remove('hidden');
    window.lucide?.createIcons();
  });

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
      closeModals();
      alert('¡Bienvenido!');
      
    } catch (error) {
      console.error('[auth] error login:', error);
      let message = 'Error al iniciar sesión';
      
      switch (error.code) {
        case 'auth/user-not-found':
          message = 'No existe una cuenta con este email';
          break;
        case 'auth/wrong-password':
          message = 'Contraseña incorrecta';
          break;
        case 'auth/invalid-email':
          message = 'Email inválido';
          break;
        case 'auth/too-many-requests':
          message = 'Demasiados intentos fallidos. Intenta más tarde';
          break;
      }
      
      alert(message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  // Registro con email/password
  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creando cuenta...';
      
      const name = document.getElementById('register-name').value.trim();
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
      
      // Guardar nombre del usuario en Firestore
      try {
        await addDoc(collection(db, 'usuarios'), {
          uid: userCredential.user.uid,
          nombre: name,
          email: email,
          createdAt: serverTimestamp()
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

  // Login con Google
  document.getElementById('btn-login-google')?.addEventListener('click', async () => {
    try {
      const provider = new GoogleAuthProvider();
      
      // Configurar persistencia automática para Google
      await setPersistence(auth, browserLocalPersistence);
      
      const result = await signInWithPopup(auth, provider);
      
      // Crear perfil de usuario en Firestore si no existe
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
      console.log('[auth] login con Google exitoso (persistencia automática)');
    } catch (error) {
      console.error('[auth] error google login:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        // Usuario cerró el popup, no mostrar error
        return;
      }
      alert('Error al iniciar sesión con Google');
    }
  });

  // Logout
  btnLogout?.addEventListener('click', async () => {
    try {
      await signOut(auth);
      
      // Limpiar admin local al cerrar sesión
      setIsAdminLocal(false);
      updateAdminUI(false);
      
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
    loginForm?.reset();
    registerForm?.reset();
  }
  
  // Limpiar al cerrar
  document.getElementById('btn-close-login')?.addEventListener('click', clearForms);
  document.getElementById('btn-close-register')?.addEventListener('click', clearForms);
  document.getElementById('modal-login-overlay')?.addEventListener('click', clearForms);
  document.getElementById('modal-register-overlay')?.addEventListener('click', clearForms);

  // Función para hacer admin a un usuario (solo para desarrollo/testing)
  window.makeUserAdmin = async function(email) {
    if (!currentUser) {
      alert('Debes estar logueado para usar esta función');
      return;
    }
    
    try {
      // Buscar usuario por email
      const userQuery = query(
        collection(db, 'usuarios'), 
        query => query.where('email', '==', email)
      );
      const userSnapshot = await getDocs(userQuery);
      
      if (userSnapshot.empty) {
        alert('Usuario no encontrado');
        return;
      }
      
      const userDoc = userSnapshot.docs[0];
      const userData = userDoc.data();
      
      // Actualizar el campo admin
      await updateDoc(userDoc.ref, { admin: true });
      
      // Si es el usuario actual, actualizar la UI
      if (userData.uid === currentUser.uid) {
        isUserAdmin = true;
        updateAdminUI(true);
      }
      
      alert(`Usuario ${email} ahora es admin`);
      
    } catch (error) {
      console.error('[auth] error haciendo admin:', error);
      alert('Error al hacer admin al usuario');
    }
  };

  console.log('[auth] sistema inicializado');
})();
