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

    if (userSnap.exists() && userSnap.data().admin === true) {
      console.log('Usuario administrador confirmado');
      loadAllData();
    } else {
      console.log('Usuario no es administrador, redirigiendo...');
      alert('Acceso denegado: solo administradores pueden ver estadísticas');
      window.location.href = './index.html';
    }
  } catch (error) {
    console.error('Error verificando estado de admin:', error);
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

    console.log(`Cargados ${studentsData.length} alumnos`);
  } catch (error) {
    console.error('Error cargando alumnos:', error);
    studentsData = [];
  }
}

async function loadBookingsData() {
  try {
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