// ===== ESTADISTICAS.JS - GOLF APP =====
// Sistema de estadísticas para administradores
// Incluye gráficos de Chart.js y análisis de datos

// Global variables
let studentsData = [];
let bookingsData = [];
let charts = {};
let appUsageData = {
  startDate: null,
  totalSessions: 0
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('Estadísticas: Inicializando...');
  initializeEventListeners();

  // Initialize Lucide icons
  setTimeout(() => {
    if (window.lucide) {
      window.lucide.createIcons();
      console.log('Iconos Lucide inicializados');
    }
  }, 100);

  // Wait for Firebase to be available
  const checkFirebase = () => {
    if (window.firebaseAuth && window.firebaseDb) {
      checkAuthAndLoadData();
    } else {
      setTimeout(checkFirebase, 100);
    }
  };
  checkFirebase();
});

function initializeEventListeners() {
  // Back button
  document.getElementById('btn-back')?.addEventListener('click', () => {
    window.location.href = './index.html';
  });

  // Refresh button
  document.getElementById('btn-refresh')?.addEventListener('click', () => {
    loadAllData();
  });

  // Retry button
  document.getElementById('btn-retry')?.addEventListener('click', () => {
    loadAllData();
  });
}

async function checkAuthAndLoadData() {
  try {
    const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    onAuthStateChanged(window.firebaseAuth, (user) => {
      if (user) {
        console.log('Usuario autenticado:', user.email);
        checkAdminStatus(user);
      } else {
        console.log('Usuario no autenticado, redirigiendo...');
        window.location.href = './index.html';
      }
    });
  } catch (error) {
    console.error('Error importando Firebase Auth:', error);
    showErrorState();
  }
}

async function checkAdminStatus(user) {
  try {
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const userDoc = doc(window.firebaseDb, 'usuarios', user.uid);
    const userSnap = await getDoc(userDoc);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const isAdmin = userData.admin === true;
      const isCliente = userData.cliente === true;

      if (isAdmin || isCliente) {
        console.log('Usuario autorizado:', isAdmin ? 'admin' : 'cliente');

        // Configurar modo cliente si es necesario
        if (isCliente) {
          window.isClienteMode = true;
          console.log('Modo cliente activado para estadísticas');
        }

        loadAllData();
      } else {
        console.log('Usuario sin permisos, redirigiendo...');
        alert('Acceso denegado: solo administradores y clientes pueden ver estadísticas');
        window.location.href = './index.html';
      }
    } else {
      console.log('Usuario no encontrado en base de datos, redirigiendo...');
      alert('Usuario no encontrado');
      window.location.href = './index.html';
    }
  } catch (error) {
    console.error('Error verificando estado de usuario:', error);
    showErrorState();
  }
}

async function loadAllData() {
  console.log('Cargando datos para estadísticas...');
  showLoading();

  try {
    await Promise.all([
      loadStudentsData(),
      loadBookingsData(),
      loadAppUsageData()
    ]);

    calculateStatistics();
    showContent();

  } catch (error) {
    console.error('Error cargando datos:', error);
    showErrorState();
  }
}

async function loadStudentsData() {
  try {
    if (window.isClienteMode) {
      // Cargar datos demo para clientes
      console.log('Cargando alumnos demo para cliente');
      try {
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const querySnapshot = await getDocs(collection(window.firebaseDb, 'demo_alumnos'));

        studentsData = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          studentsData.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || data.updatedAt?.toDate() || new Date()
          });
        });
      } catch (error) {
        console.warn('Error cargando alumnos demo desde Firestore, usando datos por defecto:', error);
        // Datos demo por defecto con crecimiento gradual desde enero 2025
        studentsData = [
          // Enero 2025 - Primeros 3 alumnos
          {
            id: 'demo1',
            nombre: 'Juan Pérez Demo',
            email: 'juan.demo@ejemplo.com',
            edad: '35',
            nacimiento: '1989-05-15',
            handicap: '18',
            modalidad: 'Individual',
            ciudad: 'Buenos Aires',
            nacionalidad: 'Argentina',
            ocupacion: 'Ingeniero',
            createdAt: new Date('2025-01-08')
          },
          {
            id: 'demo2',
            nombre: 'María González Demo',
            email: 'maria.demo@ejemplo.com',
            edad: '28',
            nacimiento: '1996-08-22',
            handicap: '12',
            modalidad: 'Grupal',
            ciudad: 'Córdoba',
            nacionalidad: 'Argentina',
            ocupacion: 'Doctora',
            createdAt: new Date('2025-01-15')
          },
          {
            id: 'demo3',
            nombre: 'Carlos López Demo',
            email: 'carlos.demo@ejemplo.com',
            edad: '42',
            nacimiento: '1982-11-03',
            handicap: '24',
            modalidad: 'Individual',
            ciudad: 'Rosario',
            nacionalidad: 'Argentina',
            ocupacion: 'Contador',
            createdAt: new Date('2025-01-22')
          },
          // Febrero 2025 - +2 alumnos
          {
            id: 'demo4',
            nombre: 'Ana Martínez Demo',
            email: 'ana.demo@ejemplo.com',
            edad: '31',
            nacimiento: '1993-12-18',
            handicap: '15',
            modalidad: 'Grupal',
            ciudad: 'Mendoza',
            nacionalidad: 'Argentina',
            ocupacion: 'Arquitecta',
            createdAt: new Date('2025-02-05')
          },
          {
            id: 'demo5',
            nombre: 'Luis Rodriguez Demo',
            email: 'luis.demo@ejemplo.com',
            edad: '38',
            nacimiento: '1986-07-09',
            handicap: '20',
            modalidad: 'Individual',
            ciudad: 'La Plata',
            nacionalidad: 'Argentina',
            ocupacion: 'Abogado',
            createdAt: new Date('2025-02-18')
          },
          // Marzo 2025 - +2 alumnos
          {
            id: 'demo6',
            nombre: 'Sofia Fernández Demo',
            email: 'sofia.demo@ejemplo.com',
            edad: '26',
            nacimiento: '1998-03-12',
            handicap: '8',
            modalidad: 'Individual',
            ciudad: 'Salta',
            nacionalidad: 'Argentina',
            ocupacion: 'Diseñadora',
            createdAt: new Date('2025-03-07')
          },
          {
            id: 'demo7',
            nombre: 'Roberto Silva Demo',
            email: 'roberto.demo@ejemplo.com',
            edad: '45',
            nacimiento: '1979-09-30',
            handicap: '22',
            modalidad: 'Grupal',
            ciudad: 'Tucumán',
            nacionalidad: 'Argentina',
            ocupacion: 'Empresario',
            createdAt: new Date('2025-03-20')
          },
          // Abril 2025 - +2 alumnos
          {
            id: 'demo8',
            nombre: 'Elena Morales Demo',
            email: 'elena.demo@ejemplo.com',
            edad: '33',
            nacimiento: '1991-06-25',
            handicap: '16',
            modalidad: 'Individual',
            ciudad: 'Neuquén',
            nacionalidad: 'Argentina',
            ocupacion: 'Psicóloga',
            createdAt: new Date('2025-04-10')
          },
          {
            id: 'demo9',
            nombre: 'Diego Herrera Demo',
            email: 'diego.demo@ejemplo.com',
            edad: '29',
            nacimiento: '1995-11-14',
            handicap: '14',
            modalidad: 'Grupal',
            ciudad: 'Mar del Plata',
            nacionalidad: 'Argentina',
            ocupacion: 'Programador',
            createdAt: new Date('2025-04-25')
          },
          // Mayo 2025 - +2 alumnos
          {
            id: 'demo10',
            nombre: 'Valentina Castro Demo',
            email: 'valentina.demo@ejemplo.com',
            edad: '24',
            nacimiento: '2000-01-08',
            handicap: '10',
            modalidad: 'Individual',
            ciudad: 'Bahía Blanca',
            nacionalidad: 'Argentina',
            ocupacion: 'Estudiante',
            createdAt: new Date('2025-05-12')
          },
          {
            id: 'demo11',
            nombre: 'Francisco Ruiz Demo',
            email: 'francisco.demo@ejemplo.com',
            edad: '52',
            nacimiento: '1972-04-17',
            handicap: '28',
            modalidad: 'Individual',
            ciudad: 'Santa Fe',
            nacionalidad: 'Argentina',
            ocupacion: 'Médico',
            createdAt: new Date('2025-05-28')
          },
          // Junio 2025 - +2 alumnos
          {
            id: 'demo12',
            nombre: 'Camila Torres Demo',
            email: 'camila.demo@ejemplo.com',
            edad: '27',
            nacimiento: '1997-08-05',
            handicap: '13',
            modalidad: 'Grupal',
            ciudad: 'Corrientes',
            nacionalidad: 'Argentina',
            ocupacion: 'Veterinaria',
            createdAt: new Date('2025-06-08')
          },
          {
            id: 'demo13',
            nombre: 'Mateo Jiménez Demo',
            email: 'mateo.demo@ejemplo.com',
            edad: '36',
            nacimiento: '1988-12-02',
            handicap: '19',
            modalidad: 'Individual',
            ciudad: 'Formosa',
            nacionalidad: 'Argentina',
            ocupacion: 'Profesor',
            createdAt: new Date('2025-06-22')
          },
          // Julio 2025 - +2 alumnos
          {
            id: 'demo14',
            nombre: 'Isabella Vargas Demo',
            email: 'isabella.demo@ejemplo.com',
            edad: '30',
            nacimiento: '1994-10-18',
            handicap: '11',
            modalidad: 'Grupal',
            ciudad: 'Jujuy',
            nacionalidad: 'Argentina',
            ocupacion: 'Farmacéutica',
            createdAt: new Date('2025-07-15')
          },
          {
            id: 'demo15',
            nombre: 'Alejandro Peña Demo',
            email: 'alejandro.demo@ejemplo.com',
            edad: '40',
            nacimiento: '1984-02-28',
            handicap: '21',
            modalidad: 'Individual',
            ciudad: 'Catamarca',
            nacionalidad: 'Argentina',
            ocupacion: 'Consultor',
            createdAt: new Date('2025-07-30')
          },
          // Agosto 2025 - +2 alumnos
          {
            id: 'demo16',
            nombre: 'Lucía Moreno Demo',
            email: 'lucia.demo@ejemplo.com',
            edad: '25',
            nacimiento: '1999-07-12',
            handicap: '9',
            modalidad: 'Individual',
            ciudad: 'San Luis',
            nacionalidad: 'Argentina',
            ocupacion: 'Nutricionista',
            createdAt: new Date('2025-08-10')
          },
          {
            id: 'demo17',
            nombre: 'Gabriel Romero Demo',
            email: 'gabriel.demo@ejemplo.com',
            edad: '48',
            nacimiento: '1976-05-22',
            handicap: '25',
            modalidad: 'Grupal',
            ciudad: 'Río Negro',
            nacionalidad: 'Argentina',
            ocupacion: 'Ingeniero Civil',
            createdAt: new Date('2025-08-25')
          }
        ];
      }
    } else {
      // Cargar datos reales para admin
      console.log('Cargando alumnos reales para admin');
      const { collection, getDocs, query, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      const q = query(collection(window.firebaseDb, 'formularios'), orderBy('nombre'));
      const querySnapshot = await getDocs(q);

      studentsData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        studentsData.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || data.updatedAt?.toDate() || new Date()
        });
      });
    }

    console.log(`Cargados ${studentsData.length} alumnos`);
  } catch (error) {
    console.error('Error cargando alumnos:', error);
    studentsData = [];
  }
}

async function loadBookingsData() {
  try {
    if (window.isClienteMode) {
      // Cargar datos demo para clientes
      console.log('Cargando reservas demo para cliente');
      try {
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const querySnapshot = await getDocs(collection(window.firebaseDb, 'demo_reservas'));

        bookingsData = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          bookingsData.push({
            id: doc.id,
            ...data,
            fecha: new Date(data.fecha),
            createdAt: data.createdAt?.toDate() || new Date()
          });
        });
      } catch (error) {
        console.warn('Error cargando reservas demo desde Firestore, usando datos por defecto:', error);
        // Datos demo por defecto de reservas para 2025
        bookingsData = [
          // Enero 2025 - Primeras reservas de los primeros 3 alumnos
          {
            id: 'booking1',
            nombre: 'Juan Pérez Demo',
            fecha: new Date('2025-01-10'),
            hora: '09:00',
            createdAt: new Date('2025-01-09')
          },
          {
            id: 'booking2',
            nombre: 'María González Demo',
            fecha: new Date('2025-01-17'),
            hora: '10:30',
            createdAt: new Date('2025-01-16')
          },
          {
            id: 'booking3',
            nombre: 'Carlos López Demo',
            fecha: new Date('2025-01-24'),
            hora: '14:00',
            createdAt: new Date('2025-01-23')
          },

          // Febrero 2025 - Más reservas de alumnos existentes + nuevos
          {
            id: 'booking4',
            nombre: 'Juan Pérez Demo',
            fecha: new Date('2025-02-07'),
            hora: '15:30',
            createdAt: new Date('2025-02-06')
          },
          {
            id: 'booking5',
            nombre: 'Ana Martínez Demo',
            fecha: new Date('2025-02-10'),
            hora: '11:00',
            createdAt: new Date('2025-02-09')
          },
          {
            id: 'booking6',
            nombre: 'Luis Rodriguez Demo',
            fecha: new Date('2025-02-20'),
            hora: '16:00',
            createdAt: new Date('2025-02-19')
          },
          {
            id: 'booking7',
            nombre: 'María González Demo',
            fecha: new Date('2025-02-28'),
            hora: '12:30',
            createdAt: new Date('2025-02-27')
          },

          // Marzo 2025 - Incluir a los nuevos alumnos
          {
            id: 'booking8',
            nombre: 'Sofia Fernández Demo',
            fecha: new Date('2025-03-10'),
            hora: '09:30',
            createdAt: new Date('2025-03-09')
          },
          {
            id: 'booking9',
            nombre: 'Roberto Silva Demo',
            fecha: new Date('2025-03-25'),
            hora: '13:00',
            createdAt: new Date('2025-03-24')
          },
          {
            id: 'booking10',
            nombre: 'Carlos López Demo',
            fecha: new Date('2025-03-30'),
            hora: '10:00',
            createdAt: new Date('2025-03-29')
          },

          // Abril 2025 - Actividad creciente
          {
            id: 'booking11',
            nombre: 'Elena Morales Demo',
            fecha: new Date('2025-04-12'),
            hora: '14:30',
            createdAt: new Date('2025-04-11')
          },
          {
            id: 'booking12',
            nombre: 'Diego Herrera Demo',
            fecha: new Date('2025-04-26'),
            hora: '11:30',
            createdAt: new Date('2025-04-25')
          },
          {
            id: 'booking13',
            nombre: 'Juan Pérez Demo',
            fecha: new Date('2025-04-15'),
            hora: '16:30',
            createdAt: new Date('2025-04-14')
          },
          {
            id: 'booking14',
            nombre: 'Ana Martínez Demo',
            fecha: new Date('2025-04-20'),
            hora: '08:30',
            createdAt: new Date('2025-04-19')
          },

          // Mayo 2025 - Mayor actividad
          {
            id: 'booking15',
            nombre: 'Valentina Castro Demo',
            fecha: new Date('2025-05-15'),
            hora: '09:00',
            createdAt: new Date('2025-05-14')
          },
          {
            id: 'booking16',
            nombre: 'Francisco Ruiz Demo',
            fecha: new Date('2025-05-30'),
            hora: '17:00',
            createdAt: new Date('2025-05-29')
          },
          {
            id: 'booking17',
            nombre: 'María González Demo',
            fecha: new Date('2025-05-08'),
            hora: '13:30',
            createdAt: new Date('2025-05-07')
          },
          {
            id: 'booking18',
            nombre: 'Sofia Fernández Demo',
            fecha: new Date('2025-05-22'),
            hora: '15:00',
            createdAt: new Date('2025-05-21')
          },

          // Junio 2025 - Pico de actividad
          {
            id: 'booking19',
            nombre: 'Camila Torres Demo',
            fecha: new Date('2025-06-10'),
            hora: '10:00',
            createdAt: new Date('2025-06-09')
          },
          {
            id: 'booking20',
            nombre: 'Mateo Jiménez Demo',
            fecha: new Date('2025-06-25'),
            hora: '14:00',
            createdAt: new Date('2025-06-24')
          },
          {
            id: 'booking21',
            nombre: 'Luis Rodriguez Demo',
            fecha: new Date('2025-06-12'),
            hora: '16:00',
            createdAt: new Date('2025-06-11')
          },
          {
            id: 'booking22',
            nombre: 'Elena Morales Demo',
            fecha: new Date('2025-06-18'),
            hora: '11:00',
            createdAt: new Date('2025-06-17')
          },
          {
            id: 'booking23',
            nombre: 'Roberto Silva Demo',
            fecha: new Date('2025-06-28'),
            hora: '12:00',
            createdAt: new Date('2025-06-27')
          },

          // Julio 2025 - Actividad sostenida
          {
            id: 'booking24',
            nombre: 'Isabella Vargas Demo',
            fecha: new Date('2025-07-18'),
            hora: '09:30',
            createdAt: new Date('2025-07-17')
          },
          {
            id: 'booking25',
            nombre: 'Alejandro Peña Demo',
            fecha: new Date('2025-08-02'),
            hora: '15:30',
            createdAt: new Date('2025-08-01')
          },
          {
            id: 'booking26',
            nombre: 'Diego Herrera Demo',
            fecha: new Date('2025-07-10'),
            hora: '13:00',
            createdAt: new Date('2025-07-09')
          },
          {
            id: 'booking27',
            nombre: 'Valentina Castro Demo',
            fecha: new Date('2025-07-25'),
            hora: '17:30',
            createdAt: new Date('2025-07-24')
          },

          // Agosto 2025 - Nuevos alumnos activos
          {
            id: 'booking28',
            nombre: 'Lucía Moreno Demo',
            fecha: new Date('2025-08-12'),
            hora: '10:30',
            createdAt: new Date('2025-08-11')
          },
          {
            id: 'booking29',
            nombre: 'Gabriel Romero Demo',
            fecha: new Date('2025-08-28'),
            hora: '14:30',
            createdAt: new Date('2025-08-27')
          },
          {
            id: 'booking30',
            nombre: 'Camila Torres Demo',
            fecha: new Date('2025-08-15'),
            hora: '11:30',
            createdAt: new Date('2025-08-14')
          },
          {
            id: 'booking31',
            nombre: 'Juan Pérez Demo',
            fecha: new Date('2025-08-20'),
            hora: '16:00',
            createdAt: new Date('2025-08-19')
          },

          // Septiembre 2025 - Actividad actual
          {
            id: 'booking32',
            nombre: 'Francisco Ruiz Demo',
            fecha: new Date('2025-09-05'),
            hora: '08:30',
            createdAt: new Date('2025-09-04')
          },
          {
            id: 'booking33',
            nombre: 'Mateo Jiménez Demo',
            fecha: new Date('2025-09-12'),
            hora: '12:30',
            createdAt: new Date('2025-09-11')
          },
          {
            id: 'booking34',
            nombre: 'Isabella Vargas Demo',
            fecha: new Date('2025-09-18'),
            hora: '15:00',
            createdAt: new Date('2025-09-17')
          }
        ];
      }
    } else {
      // Cargar datos reales para admin
      console.log('Cargando reservas reales para admin');
      const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      const querySnapshot = await getDocs(collection(window.firebaseDb, 'reservas'));

      bookingsData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        bookingsData.push({
          id: doc.id,
          ...data,
          fecha: new Date(data.fecha),
          createdAt: data.createdAt?.toDate() || new Date()
        });
      });
    }

    console.log(`Cargadas ${bookingsData.length} reservas`);
  } catch (error) {
    console.error('Error cargando reservas:', error);
    bookingsData = [];
  }
}

async function loadAppUsageData() {
  // Calculate app usage based on creation dates and user activity
  const firstStudent = studentsData.reduce((earliest, student) =>
    (!earliest || student.createdAt < earliest.createdAt) ? student : earliest, null);

  if (firstStudent) {
    appUsageData.startDate = firstStudent.createdAt;
    const now = new Date();
    appUsageData.totalSessions = studentsData.length + bookingsData.length;
    appUsageData.daysActive = Math.ceil((now - appUsageData.startDate) / (1000 * 60 * 60 * 24));
  }

  console.log('Datos de uso de app calculados:', appUsageData);
}

function calculateStatistics() {
  // Update quick stats
  updateQuickStats();

  // Generate charts
  generateMonthlyRegistrationsChart();
  generateDailyBookingsChart();
  generateAgeRangeChart();
  updateMostActiveStudents();
  updateAdditionalStats();
}

function updateQuickStats() {
  document.getElementById('total-students').textContent = studentsData.length;
  document.getElementById('total-bookings').textContent = bookingsData.length;
  document.getElementById('app-usage-days').textContent = appUsageData.daysActive || 0;

  // Calculate active students (those with bookings)
  const studentsWithBookings = new Set(bookingsData.map(b => b.nombre));
  document.getElementById('active-students').textContent = studentsWithBookings.size;
}

function generateMonthlyRegistrationsChart() {
  const ctx = document.getElementById('monthly-registrations-chart');
  if (!ctx) return;

  // Group students by month
  const monthlyData = {};
  studentsData.forEach(student => {
    const month = student.createdAt.toISOString().slice(0, 7); // YYYY-MM
    monthlyData[month] = (monthlyData[month] || 0) + 1;
  });

  // Convert to arrays for Chart.js
  const sortedMonths = Object.keys(monthlyData).sort();
  const labels = sortedMonths.map(month => {
    const date = new Date(month + '-01');
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
  });
  const data = sortedMonths.map(month => monthlyData[month]);

  // Destroy existing chart if it exists
  if (charts.monthlyRegistrations) {
    charts.monthlyRegistrations.destroy();
  }

  charts.monthlyRegistrations = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Alumnos Registrados',
        data: data,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

function generateDailyBookingsChart() {
  const ctx = document.getElementById('daily-bookings-chart');
  if (!ctx) return;

  // Group bookings by day of week
  const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dailyData = new Array(7).fill(0);

  bookingsData.forEach(booking => {
    const dayOfWeek = booking.fecha.getDay();
    dailyData[dayOfWeek]++;
  });

  // Destroy existing chart if it exists
  if (charts.dailyBookings) {
    charts.dailyBookings.destroy();
  }

  charts.dailyBookings = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: daysOfWeek,
      datasets: [{
        label: 'Reservas',
        data: dailyData,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

function generateAgeRangeChart() {
  const ctx = document.getElementById('age-range-chart');
  if (!ctx) return;

  // Calculate ages and group into ranges
  const ageRanges = {
    '18-25': 0,
    '26-35': 0,
    '36-45': 0,
    '46-55': 0,
    '56-65': 0,
    '65+': 0
  };

  studentsData.forEach(student => {
    if (student.nacimiento) {
      const birthDate = new Date(student.nacimiento);
      const age = Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));

      if (age >= 18 && age <= 25) ageRanges['18-25']++;
      else if (age >= 26 && age <= 35) ageRanges['26-35']++;
      else if (age >= 36 && age <= 45) ageRanges['36-45']++;
      else if (age >= 46 && age <= 55) ageRanges['46-55']++;
      else if (age >= 56 && age <= 65) ageRanges['56-65']++;
      else if (age > 65) ageRanges['65+']++;
    }
  });

  const labels = Object.keys(ageRanges);
  const data = Object.values(ageRanges);

  // Destroy existing chart if it exists
  if (charts.ageRange) {
    charts.ageRange.destroy();
  }

  charts.ageRange = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.map((label, index) => `${label} (${data[index]})`),
      datasets: [{
        data: data,
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 205, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 205, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)'
        ],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = labels[context.dataIndex];
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return `${label}: ${value} alumnos (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

function updateMostActiveStudents() {
  // Count bookings per student
  const studentBookingCount = {};
  bookingsData.forEach(booking => {
    const studentName = booking.nombre;
    studentBookingCount[studentName] = (studentBookingCount[studentName] || 0) + 1;
  });

  // Sort by booking count
  const sortedStudents = Object.entries(studentBookingCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // Top 5

  const container = document.getElementById('most-active-students');
  if (!container) return;

  if (sortedStudents.length === 0) {
    container.innerHTML = '<p class="muted">No hay datos de reservas disponibles</p>';
    return;
  }

  container.innerHTML = sortedStudents.map(([ name, count], index) => `
    <div class="stats-metric">
      <span>${index + 1}. ${name}</span>
      <span class="stats-value">${count} reserva${count !== 1 ? 's' : ''}</span>
    </div>
  `).join('');
}

function updateAdditionalStats() {
  // Busiest day of week
  const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dailyCounts = new Array(7).fill(0);
  bookingsData.forEach(booking => {
    dailyCounts[booking.fecha.getDay()]++;
  });
  const busiestDayIndex = dailyCounts.indexOf(Math.max(...dailyCounts));
  document.getElementById('busiest-day').textContent =
    dailyCounts[busiestDayIndex] > 0 ? daysOfWeek[busiestDayIndex] : '-';

  // Busiest month
  const monthlyCounts = {};
  studentsData.forEach(student => {
    const month = student.createdAt.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
  });
  const busiestMonth = Object.keys(monthlyCounts).reduce((a, b) =>
    monthlyCounts[a] > monthlyCounts[b] ? a : b, '-');
  document.getElementById('busiest-month').textContent = busiestMonth;

  // Most popular time
  const timeCounts = {};
  bookingsData.forEach(booking => {
    if (booking.hora) {
      timeCounts[booking.hora] = (timeCounts[booking.hora] || 0) + 1;
    }
  });
  const popularTime = Object.keys(timeCounts).reduce((a, b) =>
    timeCounts[a] > timeCounts[b] ? a : b, '-');
  document.getElementById('popular-time').textContent = popularTime;

  // Average app usage
  const avgUsage = appUsageData.daysActive > 0 ?
    `${appUsageData.daysActive} días` : '-';
  document.getElementById('avg-usage').textContent = avgUsage;
}

function showLoading() {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('stats-content').classList.add('hidden');
  document.getElementById('error-state').classList.add('hidden');
}

function showContent() {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('stats-content').classList.remove('hidden');
  document.getElementById('error-state').classList.add('hidden');

  // Re-initialize Lucide icons after content is shown
  setTimeout(() => {
    if (window.lucide) {
      window.lucide.createIcons();
      console.log('Iconos Lucide re-inicializados después de mostrar contenido');
    }
  }, 100);
}

function showErrorState() {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('stats-content').classList.add('hidden');
  document.getElementById('error-state').classList.remove('hidden');
}

// Export functions for debugging
window.estadisticas = {
  loadAllData,
  studentsData: () => studentsData,
  bookingsData: () => bookingsData,
  charts: () => charts
};