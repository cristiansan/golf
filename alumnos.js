// === GOLF APP v1.8 - PÁGINA DE ALUMNOS ===
// Página de Alumnos: lista documentos de 'formularios' ordenados por nombre
// 
// NUEVO en v1.8:
// 🎭 Sistema completo de usuarios cliente/demo para esta página
// ✅ Usuarios cliente ven lista de alumnos demo en modo solo lectura
// ✅ 17 alumnos demo con datos realistas y crecimiento desde enero 2025
// ✅ Botón CSV deshabilitado para clientes con mensaje informativo
// ✅ Separación total entre datos demo y datos reales de producción
//
// NUEVO en v1.3:
// 🚀 Funcionalidad de reservas en app principal
//
// NUEVO en v1.2:
// ✅ Funcionalidad de exportación CSV completa
// ✅ Botón de descarga con todos los campos del formulario
// ✅ Soporte UTF-8 y formato compatible con Excel
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
let allAlumnos = []; // Guardar todos los alumnos para la exportación

// Verificar si el usuario es admin desde Firestore
async function checkUserAdminStatus(user) {
  if (!user) return { isAdmin: false, isCliente: false };

  try {
    const userRef = doc(db, 'usuarios', user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const isAdmin = userData.admin === true;
      const isCliente = userData.cliente === true;
      console.log('[alumnos] usuario roles desde Firebase - admin:', isAdmin, 'cliente:', isCliente);
      return { isAdmin, isCliente };
    } else {
      console.log('[alumnos] usuario no encontrado en Firestore');
      return { isAdmin: false, isCliente: false };
    }
  } catch (error) {
    console.warn('[alumnos] error verificando roles:', error);
    return { isAdmin: false, isCliente: false };
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
    return `<li><button class="md-navigation-item w-full text-left font-medium" data-idx="${idx}">${nombre}</button></li>`;
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
    // Guard: solo admin o cliente
    const ok = await ensureAdmin();
    if (!ok) return;

    let items = [];

    // Si es cliente, cargar datos demo
    if (window.isClienteMode) {
      console.log('[alumnos] cargando datos demo para cliente');
      try {
        const demoSnap = await getDocs(collection(db, 'demo_alumnos'));
        items = demoSnap.docs.map(d=>({ id: d.id, ...(d.data()||{}) }));
      } catch (error) {
        console.warn('[alumnos] error cargando datos demo, usando datos por defecto:', error);
        // Datos demo por defecto con crecimiento gradual desde enero 2025
        items = [
          // Enero 2025 - Primeros 3 alumnos
          {
            id: 'demo1',
            nombre: 'Juan Pérez Demo',
            email: 'juan.demo@ejemplo.com',
            telefono: '11-1234-5678',
            edad: '35',
            nacimiento: '1989-05-15',
            handicap: '18',
            modalidad: 'Individual',
            ciudad: 'Buenos Aires',
            nacionalidad: 'Argentina',
            ocupacion: 'Ingeniero'
          },
          {
            id: 'demo2',
            nombre: 'María González Demo',
            email: 'maria.demo@ejemplo.com',
            telefono: '11-8765-4321',
            edad: '28',
            nacimiento: '1996-08-22',
            handicap: '12',
            modalidad: 'Grupal',
            ciudad: 'Córdoba',
            nacionalidad: 'Argentina',
            ocupacion: 'Doctora'
          },
          {
            id: 'demo3',
            nombre: 'Carlos López Demo',
            email: 'carlos.demo@ejemplo.com',
            telefono: '11-5555-6666',
            edad: '42',
            nacimiento: '1982-11-03',
            handicap: '24',
            modalidad: 'Individual',
            ciudad: 'Rosario',
            nacionalidad: 'Argentina',
            ocupacion: 'Contador'
          },
          // Febrero 2025 - +2 alumnos
          {
            id: 'demo4',
            nombre: 'Ana Martínez Demo',
            email: 'ana.demo@ejemplo.com',
            telefono: '11-2222-3333',
            edad: '31',
            nacimiento: '1993-12-18',
            handicap: '15',
            modalidad: 'Grupal',
            ciudad: 'Mendoza',
            nacionalidad: 'Argentina',
            ocupacion: 'Arquitecta'
          },
          {
            id: 'demo5',
            nombre: 'Luis Rodriguez Demo',
            email: 'luis.demo@ejemplo.com',
            telefono: '11-4444-5555',
            edad: '38',
            nacimiento: '1986-07-09',
            handicap: '20',
            modalidad: 'Individual',
            ciudad: 'La Plata',
            nacionalidad: 'Argentina',
            ocupacion: 'Abogado'
          },
          // Marzo 2025 - +2 alumnos
          {
            id: 'demo6',
            nombre: 'Sofia Fernández Demo',
            email: 'sofia.demo@ejemplo.com',
            telefono: '11-6666-7777',
            edad: '26',
            nacimiento: '1998-03-12',
            handicap: '8',
            modalidad: 'Individual',
            ciudad: 'Salta',
            nacionalidad: 'Argentina',
            ocupacion: 'Diseñadora'
          },
          {
            id: 'demo7',
            nombre: 'Roberto Silva Demo',
            email: 'roberto.demo@ejemplo.com',
            telefono: '11-8888-9999',
            edad: '45',
            nacimiento: '1979-09-30',
            handicap: '22',
            modalidad: 'Grupal',
            ciudad: 'Tucumán',
            nacionalidad: 'Argentina',
            ocupacion: 'Empresario'
          },
          // Abril 2025 - +2 alumnos
          {
            id: 'demo8',
            nombre: 'Elena Morales Demo',
            email: 'elena.demo@ejemplo.com',
            telefono: '11-1111-2222',
            edad: '33',
            nacimiento: '1991-06-25',
            handicap: '16',
            modalidad: 'Individual',
            ciudad: 'Neuquén',
            nacionalidad: 'Argentina',
            ocupacion: 'Psicóloga'
          },
          {
            id: 'demo9',
            nombre: 'Diego Herrera Demo',
            email: 'diego.demo@ejemplo.com',
            telefono: '11-3333-4444',
            edad: '29',
            nacimiento: '1995-11-14',
            handicap: '14',
            modalidad: 'Grupal',
            ciudad: 'Mar del Plata',
            nacionalidad: 'Argentina',
            ocupacion: 'Programador'
          },
          // Mayo 2025 - +2 alumnos
          {
            id: 'demo10',
            nombre: 'Valentina Castro Demo',
            email: 'valentina.demo@ejemplo.com',
            telefono: '11-5555-6666',
            edad: '24',
            nacimiento: '2000-01-08',
            handicap: '10',
            modalidad: 'Individual',
            ciudad: 'Bahía Blanca',
            nacionalidad: 'Argentina',
            ocupacion: 'Estudiante'
          },
          {
            id: 'demo11',
            nombre: 'Francisco Ruiz Demo',
            email: 'francisco.demo@ejemplo.com',
            telefono: '11-7777-8888',
            edad: '52',
            nacimiento: '1972-04-17',
            handicap: '28',
            modalidad: 'Individual',
            ciudad: 'Santa Fe',
            nacionalidad: 'Argentina',
            ocupacion: 'Médico'
          },
          // Junio 2025 - +2 alumnos
          {
            id: 'demo12',
            nombre: 'Camila Torres Demo',
            email: 'camila.demo@ejemplo.com',
            telefono: '11-9999-0000',
            edad: '27',
            nacimiento: '1997-08-05',
            handicap: '13',
            modalidad: 'Grupal',
            ciudad: 'Corrientes',
            nacionalidad: 'Argentina',
            ocupacion: 'Veterinaria'
          },
          {
            id: 'demo13',
            nombre: 'Mateo Jiménez Demo',
            email: 'mateo.demo@ejemplo.com',
            telefono: '11-1357-2468',
            edad: '36',
            nacimiento: '1988-12-02',
            handicap: '19',
            modalidad: 'Individual',
            ciudad: 'Formosa',
            nacionalidad: 'Argentina',
            ocupacion: 'Profesor'
          },
          // Julio 2025 - +2 alumnos
          {
            id: 'demo14',
            nombre: 'Isabella Vargas Demo',
            email: 'isabella.demo@ejemplo.com',
            telefono: '11-2468-1357',
            edad: '30',
            nacimiento: '1994-10-18',
            handicap: '11',
            modalidad: 'Grupal',
            ciudad: 'Jujuy',
            nacionalidad: 'Argentina',
            ocupacion: 'Farmacéutica'
          },
          {
            id: 'demo15',
            nombre: 'Alejandro Peña Demo',
            email: 'alejandro.demo@ejemplo.com',
            telefono: '11-3691-2580',
            edad: '40',
            nacimiento: '1984-02-28',
            handicap: '21',
            modalidad: 'Individual',
            ciudad: 'Catamarca',
            nacionalidad: 'Argentina',
            ocupacion: 'Consultor'
          },
          // Agosto 2025 - +2 alumnos
          {
            id: 'demo16',
            nombre: 'Lucía Moreno Demo',
            email: 'lucia.demo@ejemplo.com',
            telefono: '11-1470-2580',
            edad: '25',
            nacimiento: '1999-07-12',
            handicap: '9',
            modalidad: 'Individual',
            ciudad: 'San Luis',
            nacionalidad: 'Argentina',
            ocupacion: 'Nutricionista'
          },
          {
            id: 'demo17',
            nombre: 'Gabriel Romero Demo',
            email: 'gabriel.demo@ejemplo.com',
            telefono: '11-2581-3692',
            edad: '48',
            nacimiento: '1976-05-22',
            handicap: '25',
            modalidad: 'Grupal',
            ciudad: 'Río Negro',
            nacionalidad: 'Argentina',
            ocupacion: 'Ingeniero Civil'
          }
        ];
      }
    } else {
      // Admin: cargar datos reales
      console.log('[alumnos] cargando datos reales para admin');
      let docsSnap;
      try {
        const q = query(collection(db, 'formularios'), orderBy('nombre'));
        docsSnap = await getDocs(q);
      } catch {
        docsSnap = await getDocs(collection(db, 'formularios'));
      }
      items = docsSnap.docs.map(d=>({ id: d.id, ...(d.data()||{}) }));
    }

    const sorted = sortByNombreAsc(items);
    allAlumnos = sorted; // Guardar para exportación
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
  
  // Verificar si es admin o cliente desde Firestore
  const userRoles = await checkUserAdminStatus(currentUser);
  const { isAdmin, isCliente } = userRoles;

  if (!isAdmin && !isCliente) {
    alert('No tienes permisos para acceder a esta página');
    window.location.href = './';
    return false;
  }

  // Si es cliente, configurar modo demo
  if (isCliente) {
    console.log('[alumnos] configurando modo cliente/demo');
    window.isClienteMode = true;
    // Deshabilitar botón de descarga para clientes
    const downloadBtn = document.getElementById('download-csv');
    if (downloadBtn) {
      downloadBtn.disabled = true;
      downloadBtn.title = 'Modo demo - Solo lectura';
      downloadBtn.style.opacity = '0.6';
    }
  }
  
  // Actualizar estado global
  isUserAdmin = isAdmin;
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
    // Usuario logueado - verificar roles
    console.log('[alumnos] usuario logueado:', user.email);
    const userRoles = await checkUserAdminStatus(user);
    const { isAdmin, isCliente } = userRoles;

    if (isAdmin || isCliente) {
      // Si es admin o cliente, configurar modo y cargar alumnos
      isUserAdmin = isAdmin;
      if (isCliente) {
        window.isClienteMode = true;
      }
      loadAlumnos();
    } else {
      // Si no tiene permisos, mostrar error
      alert('No tienes permisos para acceder a esta página');
      window.location.href = './';
    }
  } else {
    // Usuario no logueado - redirigir al login
    console.log('[alumnos] usuario no logueado, redirigiendo');
    window.location.href = './';
  }
});

// Funciones de exportación
function exportToCSV() {
  if (allAlumnos.length === 0) {
    alert('No hay datos para exportar');
    return;
  }

  // Definir las columnas que queremos exportar basadas en los datos reales
  const columns = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'email', label: 'Email' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'edad', label: 'Edad' },
    { key: 'nacimiento', label: 'Fecha Nacimiento' },
    { key: 'domicilio', label: 'Domicilio' },
    { key: 'ciudad', label: 'Ciudad' },
    { key: 'nacionalidad', label: 'Nacionalidad' },
    { key: 'ocupacion', label: 'Ocupación' },
    { key: 'handicap', label: 'Handicap' },
    { key: 'frecuencia', label: 'Frecuencia' },
    { key: 'modalidad', label: 'Modalidad' },
    { key: 'club', label: 'Club' },
    { key: 'anios', label: 'Años Experiencia' },
    { key: 'clases_previas', label: 'Clases Previas' },
    { key: 'apto', label: 'Apto Médico' },
    { key: 'apto_vto', label: 'Vto Apto Médico' },
    { key: 'alergias', label: 'Alergias' },
    { key: 'lesiones', label: 'Lesiones' },
    { key: 'condicion', label: 'Condición Médica' }
  ];

  // Crear el contenido CSV
  let csvContent = columns.map(col => col.label).join(',') + '\n';
  
  allAlumnos.forEach(alumno => {
    const row = columns.map(col => {
      let value = alumno[col.key] || '';
      // Escapar comillas y envolver en comillas si contiene comas
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        value = '"' + value.replace(/"/g, '""') + '"';
      }
      return value;
    });
    csvContent += row.join(',') + '\n';
  });

  // Descargar el archivo
  downloadFile(csvContent, 'alumnos.csv', 'text/csv;charset=utf-8;');
}


function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function initDownloadButton() {
  const downloadCSV = document.getElementById('download-csv');

  if (downloadCSV) {
    downloadCSV.addEventListener('click', () => {
      exportToCSV();
    });
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  window.lucide?.createIcons();
  initDownloadButton();

  // Si ya hay un usuario logueado, verificar roles
  if (auth.currentUser) {
    currentUser = auth.currentUser;
    checkUserAdminStatus(auth.currentUser).then(userRoles => {
      const { isAdmin, isCliente } = userRoles;
      isUserAdmin = isAdmin;

      if (isAdmin || isCliente) {
        if (isCliente) {
          window.isClienteMode = true;
        }
        loadAlumnos();
      }
    });
  }
});


