// ============================================
// AERODASH PRO - Application Core
// ============================================

// Variables Globales
var _currentUser = null;
var currentBookingFilter = 'all';
var scrollTopPosition = 0;
var currentTicketForPDF = null;

// Datos iniciales de vuelos
const initialFlights = [
    { id: 1, codigo: "AV101", origen: "Caracas", destino: "Maracaibo", fecha_salida: "2026-07-15T08:00:00", fecha_llegada: "2026-07-15T09:30:00", estado: "Programado", puerta: "B12", precio: 150, duracion: "1h 30m" },
    { id: 2, codigo: "AV202", origen: "Caracas", destino: "Barcelona", fecha_salida: "2026-07-15T10:00:00", fecha_llegada: "2026-07-15T11:15:00", estado: "Programado", puerta: "A05", precio: 120, duracion: "1h 15m" },
    { id: 3, codigo: "LA303", origen: "Caracas", destino: "Bogotá", fecha_salida: "2026-07-16T14:00:00", fecha_llegada: "2026-07-16T16:30:00", estado: "Programado", puerta: "C08", precio: 280, duracion: "2h 30m" },
    { id: 4, codigo: "CM404", origen: "Maracaibo", destino: "Panamá", fecha_salida: "2026-07-17T07:30:00", fecha_llegada: "2026-07-17T10:00:00", estado: "Programado", puerta: "D12", precio: 350, duracion: "2h 30m" },
    { id: 5, codigo: "IB505", origen: "Barcelona", destino: "Madrid", fecha_salida: "2026-07-20T20:00:00", fecha_llegada: "2026-07-21T10:00:00", estado: "Programado", puerta: "E03", precio: 650, duracion: "8h 00m" }
];

const asientosDisponibles = {
    1: ["1A", "1B", "1C", "2A", "2B", "2C", "3A", "3B", "3C"],
    2: ["1A", "1B", "1C", "2A", "2B", "2C", "3A", "3B", "3C"],
    3: ["1A", "1B", "1C", "2A", "2B", "2C", "3A", "3B", "3C"],
    4: ["1A", "1B", "1C", "2A", "2B", "2C", "3A", "3B", "3C"],
    5: ["5A", "5B", "5C", "6A", "6B", "6C", "7A", "7B", "7C", "8A", "8B", "8C"]
};

// ============================================
// INICIALIZACIÓN DE DATOS
// ============================================
function initFlightData() {
    if (!localStorage.getItem('aerodash_flights')) {
        localStorage.setItem('aerodash_flights', JSON.stringify(initialFlights));
        localStorage.setItem('aerodash_seats', JSON.stringify(asientosDisponibles));
    }
}
initFlightData();

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'success') {
    const oldToast = document.querySelector('.toast-notification');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.textContent = message;
    
    let bgColor = 'linear-gradient(135deg, #667eea, #764ba2)';
    if (type === 'success') bgColor = 'linear-gradient(135deg, #22c55e, #16a34a)';
    else if (type === 'error') bgColor = 'linear-gradient(135deg, #ef4444, #dc2626)';
    else if (type === 'warning') bgColor = 'linear-gradient(135deg, #f59e0b, #d97706)';
    
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        color: white;
        padding: 14px 24px;
        border-radius: 12px;
        font-weight: 600;
        font-size: 14px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        z-index: 99999;
        animation: slideIn 0.3s ease;
        max-width: 400px;
        background: ${bgColor};
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ============================================
// FORMATEO DE FECHAS
// ============================================
function formatDate(dateString) {
    if (!dateString) return 'Fecha no disponible';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateShort(dateString) {
    if (!dateString) return 'Fecha no disponible';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateForPDF(dateString) {
    if (!dateString) return 'Fecha no disponible';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ============================================
// LOGS DE ACTIVIDAD
// ============================================
function addActivityLog(action, details) {
    const user = _currentUser ? `${_currentUser.nombre} ${_currentUser.apellido}` : 'Sistema';
    const logs = JSON.parse(localStorage.getItem('aerodash_activity_logs')) || [];
    logs.unshift({
        id: Date.now(),
        action: action,
        details: details,
        user: user,
        timestamp: new Date().toISOString()
    });
    if (logs.length > 100) logs.pop();
    localStorage.setItem('aerodash_activity_logs', JSON.stringify(logs));
}

function getActivityLogs() {
    return JSON.parse(localStorage.getItem('aerodash_activity_logs')) || [];
}

// ============================================
// USUARIO
// ============================================
function loadCurrentUser() {
    const userData = sessionStorage.getItem('currentUser');
    if (userData) {
        _currentUser = JSON.parse(userData);
        const users = JSON.parse(localStorage.getItem('aerodash_users')) || [];
        const userFromDB = users.find(u => u.id === _currentUser.id);
        if (userFromDB) {
            _currentUser = userFromDB;
            _currentUser.tickets = _currentUser.tickets || [];
            sessionStorage.setItem('currentUser', JSON.stringify(_currentUser));
        }
    }
    return _currentUser;
}

function saveUserData() {
    if (!_currentUser) {
        console.warn('No hay usuario para guardar');
        return;
    }
    const users = JSON.parse(localStorage.getItem('aerodash_users')) || [];
    const userIndex = users.findIndex(u => u.id === _currentUser.id);
    if (userIndex !== -1) {
        users[userIndex] = _currentUser;
        localStorage.setItem('aerodash_users', JSON.stringify(users));
    }
    sessionStorage.setItem('currentUser', JSON.stringify(_currentUser));
}

function updateNavbarUser() {
    const userNameSpan = document.getElementById('userNameNav');
    if (userNameSpan && _currentUser) {
        userNameSpan.textContent = `${_currentUser.nombre} ${_currentUser.apellido}`;
    }
}

function checkAdminAccess() {
    const user = window.currentUser;
    if (!user || user.rol !== 'ADMIN') {
        if (typeof showToast === 'function') {
            showToast('Acceso denegado. Se requiere rol de administrador.', 'error');
        }
        setTimeout(() => {
            const isAdmin = window.location.pathname.includes('/admin/');
            window.location.href = isAdmin ? '../dashboard.html' : 'dashboard.html';
        }, 1500);
        return false;
    }
    return true;
}

function updateCurrentDate() {
    const dateElements = document.querySelectorAll('#currentDateDashboard, #currentDate');
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    dateElements.forEach(el => {
        if (el) el.textContent = dateStr;
    });
}

// ============================================
// LOGOUT
// ============================================
function logout() {
    if (confirm('¿Estás seguro de cerrar sesión?')) {
        if (typeof addActivityLog === 'function') {
            addActivityLog('logout', 'Cerró sesión');
        }
        sessionStorage.removeItem('currentUser');
        _currentUser = null;
        window.currentUser = null;
        window.location.href = 'login.html';
    }
}

// ============================================
// MODAL HELPERS
// ============================================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    scrollTopPosition = window.scrollY;
    document.documentElement.style.setProperty('--scroll-top', -scrollTopPosition + 'px');
    document.body.classList.add('modal-open');
    modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
    document.documentElement.style.removeProperty('--scroll-top');
    window.scrollTo(0, scrollTopPosition);
}

// ============================================
// PDF GENERATION
// ============================================
function generatePDF(elementId, filename) {
    const element = document.getElementById(elementId);
    if (!element) {
        showToast('Error al generar el PDF', 'error');
        return;
    }

    // Mostrar loading
    showToast('📄 Generando PDF...', 'warning');

    const opt = {
        margin: 10,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2,
            useCORS: true,
            letterRendering: true,
            backgroundColor: '#ffffff'
        },
        jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait' 
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(element).save().then(function() {
        showToast('✅ PDF descargado correctamente', 'success');
    }).catch(function(err) {
        console.error('Error al generar PDF:', err);
        showToast('Error al generar el PDF', 'error');
    });
}

// ============================================
// INICIALIZACIÓN DE LA PÁGINA
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop();
    
    if (currentPage === 'login.html' || currentPage === '' || currentPage === '/') {
        return;
    }

    loadCurrentUser();
    if (!_currentUser) {
        window.location.href = 'login.html';
        return;
    }

    updateNavbarUser();
    updateCurrentDate();
    
    const adminLinks = document.querySelectorAll('#adminNavLink');
    if (_currentUser && _currentUser.rol === 'ADMIN') {
        adminLinks.forEach(link => link.style.display = 'inline-block');
    } else {
        adminLinks.forEach(link => link.style.display = 'none');
    }
});

// ============================================
// EXPORTAR FUNCIONES GLOBALMENTE
// ============================================

// GETTER/SETTER PARA currentUser
Object.defineProperty(window, 'currentUser', {
    get: function() { return _currentUser; },
    set: function(value) { 
        if (value) {
            _currentUser = value;
            sessionStorage.setItem('currentUser', JSON.stringify(_currentUser));
        } else {
            _currentUser = null;
        }
    }
});

window.getCurrentUser = function() { return _currentUser; };

window.showToast = showToast;
window.formatDate = formatDate;
window.formatDateShort = formatDateShort;
window.formatDateForPDF = formatDateForPDF;
window.addActivityLog = addActivityLog;
window.getActivityLogs = getActivityLogs;
window.loadCurrentUser = loadCurrentUser;
window.updateNavbarUser = updateNavbarUser;
window.saveUserData = saveUserData;
window.checkAdminAccess = checkAdminAccess;
window.updateCurrentDate = updateCurrentDate;
window.openModal = openModal;
window.closeModal = closeModal;
window.logout = logout;
window.generatePDF = generatePDF;
window.scrollTopPosition = scrollTopPosition;
window.initialFlights = initialFlights;
window.asientosDisponibles = asientosDisponibles;
window.initFlightData = initFlightData;
window.currentBookingFilter = currentBookingFilter;
window.currentTicketForPDF = currentTicketForPDF;