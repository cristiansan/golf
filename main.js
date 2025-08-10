// IndexedDB helper
const DB_NAME = 'golfDB';
const STORE = 'personas';
const DB_VERSION = 1;
const GAS_URL = 'https://script.google.com/macros/s/AKfycbx-4BC_XyB5fJzP1Y7KysEeBidtLbKPQ_E15hqgpkEg16lKIEV1lGQb0ZNPq2BBFhxcLg/exec';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('by_created', 'creado_en');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbAdd(persona) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.add({ ...persona, creado_en: new Date().toISOString() });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbAllDesc() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      const arr = req.result.sort((a, b) => (b.id || 0) - (a.id || 0));
      resolve(arr);
    };
    req.onerror = () => reject(req.error);
  });
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function sendToGoogleSheets(payload) {
  if (!GAS_URL) return { ok: false, skipped: true };
  const remotePayload = { ...payload };
  if (remotePayload.aptoArchivo && remotePayload.aptoArchivo.buffer) {
    remotePayload.aptoArchivo = {
      name: remotePayload.aptoArchivo.name,
      type: remotePayload.aptoArchivo.type,
      size: remotePayload.aptoArchivo.size,
      base64: arrayBufferToBase64(remotePayload.aptoArchivo.buffer)
    };
  }
  try {
    await fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(remotePayload)
    });
    // En no-cors no podemos leer respuesta; asumimos éxito (fire-and-forget)
    return { ok: true, opaque: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// UI tabs
const tabButtons = Array.from(document.querySelectorAll('.tab-button'));
const tabs = {
  personales: document.getElementById('tab-personales'),
  medica: document.getElementById('tab-medica'),
  experiencia: document.getElementById('tab-experiencia')
};

let currentTabIndex = 0;
const orderedTabs = ['personales', 'medica', 'experiencia'];

function setActiveTab(index) {
  currentTabIndex = Math.max(0, Math.min(orderedTabs.length - 1, index));
  tabButtons.forEach((btn, i) => btn.classList.toggle('active', i === currentTabIndex));
  orderedTabs.forEach((key, i) => tabs[key].classList.toggle('active', i === currentTabIndex));
}

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => setActiveTab(orderedTabs.indexOf(btn.dataset.tab)));
});

document.getElementById('prevBtn').addEventListener('click', () => setActiveTab(currentTabIndex - 1));
document.getElementById('nextBtn').addEventListener('click', () => setActiveTab(currentTabIndex + 1));

const form = document.getElementById('registroForm');

// Calcular edad basado en fecha de nacimiento
function calculateAge(isoDate) {
  if (!isoDate) return null;
  const dob = new Date(isoDate);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age < 0 ? null : age;
}

const fechaInput = document.querySelector('input[name="fechaNacimiento"]');
const edadInput = document.querySelector('input[name="edad"]');

function updateAgeUI() {
  const age = calculateAge(fechaInput.value);
  edadInput.value = age != null ? String(age) : '';
}

fechaInput.addEventListener('input', updateAgeUI);
fechaInput.addEventListener('change', updateAgeUI);
updateAgeUI();

// Normalizar teléfonos para comparar (quitar no-dígitos)
function normalizePhone(value) {
  return (value || '').replace(/[^\d]/g, '');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());

  // Obtener archivo del apto (si existe) desde el form
  const fileInput = form.querySelector('input[name="aptoArchivo"]');
  const file = fileInput?.files?.[0] || null;

  // Validaciones de archivo: tamaño y tipo
  if (file) {
    const maxBytes = 2 * 1024 * 1024; // 2MB
    if (file.size > maxBytes) {
      alert('El archivo de apto supera los 2 MB. Por favor, adjunte uno más liviano.');
      setActiveTab(1);
      fileInput.focus();
      return;
    }
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      alert('Formato de archivo no permitido. Use PDF o imagen.');
      setActiveTab(1);
      fileInput.focus();
      return;
    }
  }

  // Validar teléfonos diferentes
  const tel = (data.telefono || '').trim();
  const telEmer = (data.telefonoEmergencia || '').trim();
  if (tel && telEmer && normalizePhone(tel) === normalizePhone(telEmer)) {
    alert('El teléfono de emergencia debe ser distinto al teléfono del participante.');
    setActiveTab(0);
    document.querySelector('input[name="telefonoEmergencia"]').focus();
    return;
  }

  const edadCalculada = calculateAge(data.fechaNacimiento);
  const payload = {
    nombreApellido: data.nombreApellido?.trim() || '',
    fechaNacimiento: data.fechaNacimiento || null,
    edad: edadCalculada,
    domicilio: data.domicilio || null,
    telefono: data.telefono || null,
    email: data.email || null,
    tutor: data.tutor || null,
    telefonoEmergencia: data.telefonoEmergencia || null,
    nacionalidad: data.nacionalidad || null,
    ocupacion: data.ocupacion || null,
    alergias: data.alergias || null,
    lesionesCirugias: data.lesionesCirugias || null,
    condicionMedica: data.condicionMedica || null,
    aptoMedico: (data.aptoMedico || 'si') === 'si',
    aptoVencimiento: data.aptoVencimiento || null,
    aniosPracticando: data.aniosPracticando ? Number(data.aniosPracticando) : null,
    handicap: data.handicap || null,
    club: data.club || null,
    frecuenciaSemanal: data.frecuenciaSemanal ? Number(data.frecuenciaSemanal) : null,
    modalidadFavorita: (data.modalidadFavorita === 'Otro' && data.modalidadFavoritaOtro)
      ? `Otro: ${data.modalidadFavoritaOtro}`
      : (data.modalidadFavorita || null),
    clasesPrevias: (data.clasesPrevias || 'no') === 'si'
  };

  // Convertir archivo a ArrayBuffer para guardar en IndexedDB
  if (file) {
    const buf = await file.arrayBuffer();
    payload.aptoArchivo = {
      name: file.name,
      type: file.type,
      size: file.size,
      buffer: buf
    };
  } else {
    payload.aptoArchivo = null;
  }

  if (!payload.nombreApellido) {
    alert('El campo "Nombre y Apellido" es obligatorio.');
    setActiveTab(0);
    return;
  }

  try {
    // Enviar a Google Sheets si está configurado
    try { await sendToGoogleSheets(payload); } catch (e2) { console.warn('Sync Sheets falló', e2); }
    await dbAdd(payload);
    form.reset();
    setActiveTab(0);
    await cargarLista();
    alert('Registro guardado ✔');
  } catch (err) {
    console.error(err);
    alert('Ocurrió un error al guardar');
  }
});

async function cargarLista() {
  try {
    const items = await dbAllDesc();
    const ul = document.getElementById('listaPersonas');
    ul.innerHTML = '';
    for (const p of items) {
      const li = document.createElement('li');
      li.innerHTML = `
        <div><strong>${p.nombreApellido}</strong></div>
        <div class="muted">${p.email || ''} ${p.telefono ? ' · ' + p.telefono : ''}</div>
        <div class="muted">${new Date(p.creado_en).toLocaleString()}</div>
      `;
      // Si hay archivo adjunto, agregar botón de descarga
      if (p.aptoArchivo && p.aptoArchivo.buffer) {
        const btn = document.createElement('button');
        btn.textContent = 'Descargar apto';
        btn.type = 'button';
        btn.style.marginTop = '6px';
        btn.addEventListener('click', () => {
          const blob = new Blob([new Uint8Array(p.aptoArchivo.buffer)], { type: p.aptoArchivo.type });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = p.aptoArchivo.name || 'apto';
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        });
        li.appendChild(btn);
      }
      ul.appendChild(li);
    }
  } catch (e) {
    console.error(e);
  }
}

setActiveTab(0);
cargarLista();


