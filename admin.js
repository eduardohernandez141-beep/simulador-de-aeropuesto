// ============================================
// ADMIN - Panel de Administración
// ============================================

// ============================================
// ADMIN DASHBOARD
// ============================================
function loadAdminDashboard() {
    const vuelos = getFlights();
    const users = JSON.parse(localStorage.getItem('aerodash_users')) || [];
    const allTickets = users.reduce((acc, u) => [...acc, ...(u.tickets || [])], []);
    const totalRevenue = allTickets.reduce((sum, t) => sum + (t.precio || 0), 0);

    const totalFlightsEl = document.getElementById('adminTotalFlights');
    const totalUsersEl = document.getElementById('adminTotalUsers');
    const totalBookingsEl = document.getElementById('adminTotalBookings');
    const totalRevenueEl = document.getElementById('adminTotalRevenue');

    if (totalFlightsEl) totalFlightsEl.textContent = vuelos.length;
    if (totalUsersEl) totalUsersEl.textContent = users.length;
    if (totalBookingsEl) totalBookingsEl.textContent = allTickets.length;
    if (totalRevenueEl) totalRevenueEl.textContent = `$${totalRevenue}`;

    const logs = typeof getActivityLogs === 'function' ? getActivityLogs() : [];
    const logContainer = document.getElementById('activityLogs');
    if (logContainer) {
        if (logs.length === 0) {
            logContainer.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:20px;">No hay actividad registrada</p>';
        } else {
            logContainer.innerHTML = logs.slice(0, 20).map(log => {
                const iconMap = {
                    'login': 'fa-sign-in-alt',
                    'logout': 'fa-sign-out-alt',
                    'register': 'fa-user-plus',
                    'create_flight': 'fa-plus-circle',
                    'edit_flight': 'fa-edit',
                    'delete_flight': 'fa-trash-alt',
                    'booking': 'fa-ticket-alt',
                    'cancel_booking': 'fa-times-circle',
                    'profile_update': 'fa-user-edit',
                    'delete_user': 'fa-user-slash'
                };
                const icon = iconMap[log.action] || 'fa-circle';
                return `
                    <div class="log-item">
                        <span>
                            <i class="fas ${icon} log-icon ${log.action.split('_')[0]}"></i>
                            <strong>${log.user}</strong> ${log.details}
                        </span>
                        <span class="log-time">${new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                `;
            }).join('');
        }
    }
}

function generateReport() {
    if (typeof showToast === 'function') {
        showToast('📊 Reporte generado. Revisa la consola para ver los datos.', 'success');
    } else {
        alert('Reporte generado. Revisa la consola.');
    }
    const vuelos = getFlights();
    const users = JSON.parse(localStorage.getItem('aerodash_users')) || [];
    const allTickets = users.reduce((acc, u) => [...acc, ...(u.tickets || [])], []);
    console.log('=== REPORTE AERODASH PRO ===');
    console.log('Total Vuelos:', vuelos.length);
    console.log('Total Usuarios:', users.length);
    console.log('Total Reservas:', allTickets.length);
    console.log('Ingresos Totales:', allTickets.reduce((sum, t) => sum + (t.precio || 0), 0));
}

function clearAllData() {
    if (!confirm('⚠️ ¿Estás seguro de eliminar todos los datos del sistema? Esta acción no se puede deshacer.')) return;
    if (!confirm('Última confirmación: ¿Seguro que quieres borrar TODOS los datos?')) return;

    localStorage.removeItem('aerodash_users');
    localStorage.removeItem('aerodash_flights');
    localStorage.removeItem('aerodash_seats');
    localStorage.removeItem('aerodash_activity_logs');
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');

    if (typeof showToast === 'function') {
        showToast('🧹 Todos los datos han sido eliminados', 'warning');
    } else {
        alert('Todos los datos han sido eliminados');
    }
    setTimeout(() => {
        window.location.href = '../login.html';
    }, 1500);
}

// ============================================
// MANAGE FLIGHTS
// ============================================
function loadManageFlights() {
    renderAdminFlights();

    const form = document.getElementById('flightForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            saveFlightFromForm();
        });
    }
}

function renderAdminFlights() {
    const vuelos = getFlights();
    const container = document.getElementById('adminFlightsList');
    const countSpan = document.getElementById('adminFlightsCount');

    if (!container) return;

    if (countSpan) countSpan.textContent = `${vuelos.length} vuelos`;

    if (vuelos.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No hay vuelos registrados</p></div>';
        return;
    }

    container.innerHTML = vuelos.map(flight => `
        <div class="flight-card">
            <div class="flight-header">
                <span class="flight-code">${flight.codigo}</span>
                <span class="flight-status status-${flight.estado}">${flight.estado}</span>
            </div>
            <div class="flight-route">
                <i class="fas fa-plane-departure"></i> ${flight.origen} → ${flight.destino}
            </div>
            <div class="flight-time">
                <i class="far fa-calendar-alt"></i> ${formatDate(flight.fecha_salida)}
            </div>
            <div class="flight-time">
                <i class="far fa-clock"></i> ${flight.duracion} | Puerta: ${flight.puerta}
            </div>
            <div class="flight-price">$${flight.precio}</div>
            <div class="flight-actions">
                <button class="btn-primary" onclick="window.editFlight(${flight.id})"><i class="fas fa-edit"></i> Editar</button>
                <button class="btn-danger" onclick="window.deleteFlightAdmin(${flight.id})"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function saveFlightFromForm() {
    const id = document.getElementById('editFlightId').value;
    const codigo = document.getElementById('flightCodigo').value.trim();
    const origen = document.getElementById('flightOrigen').value.trim();
    const destino = document.getElementById('flightDestino').value.trim();
    const fecha_salida = document.getElementById('flightSalida').value;
    const fecha_llegada = document.getElementById('flightLlegada').value;
    const duracion = document.getElementById('flightDuracion').value.trim();
    const puerta = document.getElementById('flightPuerta').value.trim();
    const precio = parseFloat(document.getElementById('flightPrecio').value);
    const estado = document.getElementById('flightEstado').value;

    if (!codigo || !origen || !destino || !fecha_salida || !duracion || !puerta || !precio) {
        showFlightMessage('Todos los campos son obligatorios', 'error');
        return;
    }

    if (precio <= 0) {
        showFlightMessage('El precio debe ser mayor a 0', 'error');
        return;
    }

    const flightData = { 
        codigo, 
        origen, 
        destino, 
        fecha_salida, 
        fecha_llegada: fecha_llegada || fecha_salida, 
        duracion, 
        puerta, 
        precio, 
        estado 
    };

    let result;
    if (id) {
        result = updateFlight(parseInt(id), flightData);
        if (result) {
            showFlightMessage('✅ Vuelo actualizado correctamente', 'success');
            resetFlightForm();
            renderAdminFlights();
        }
    } else {
        result = createFlight(flightData);
        if (result) {
            showFlightMessage('✅ Vuelo creado correctamente', 'success');
            resetFlightForm();
            renderAdminFlights();
        }
    }
}

function editFlight(id) {
    const flight = getFlightById(id);
    if (!flight) return;

    const editId = document.getElementById('editFlightId');
    const codigo = document.getElementById('flightCodigo');
    const origen = document.getElementById('flightOrigen');
    const destino = document.getElementById('flightDestino');
    const salida = document.getElementById('flightSalida');
    const llegada = document.getElementById('flightLlegada');
    const duracion = document.getElementById('flightDuracion');
    const puerta = document.getElementById('flightPuerta');
    const precio = document.getElementById('flightPrecio');
    const estado = document.getElementById('flightEstado');

    if (editId) editId.value = flight.id;
    if (codigo) codigo.value = flight.codigo;
    if (origen) origen.value = flight.origen;
    if (destino) destino.value = flight.destino;
    
    if (salida && flight.fecha_salida) {
        salida.value = flight.fecha_salida.slice(0, 16);
    }
    if (llegada && flight.fecha_llegada) {
        llegada.value = flight.fecha_llegada.slice(0, 16);
    } else if (llegada && flight.fecha_salida) {
        llegada.value = flight.fecha_salida.slice(0, 16);
    }
    
    if (duracion) duracion.value = flight.duracion;
    if (puerta) puerta.value = flight.puerta;
    if (precio) precio.value = flight.precio;
    if (estado) estado.value = flight.estado;

    const title = document.getElementById('flightFormTitle');
    if (title) {
        title.innerHTML = '<i class="fas fa-edit"></i> Editar Vuelo';
        title.scrollIntoView({ behavior: 'smooth' });
    }
}

function deleteFlightAdmin(id) {
    if (!confirm('¿Estás seguro de eliminar este vuelo?')) return;

    const flight = getFlightById(id);
    if (deleteFlight(id)) {
        if (typeof showToast === 'function') {
            showToast(`🗑️ Vuelo ${flight?.codigo || id} eliminado`);
        }
        renderAdminFlights();
        resetFlightForm();
    }
}

function resetFlightForm() {
    const editId = document.getElementById('editFlightId');
    const form = document.getElementById('flightForm');
    const title = document.getElementById('flightFormTitle');
    const msg = document.getElementById('flightFormMessage');

    if (editId) editId.value = '';
    if (form) form.reset();
    if (title) title.innerHTML = '<i class="fas fa-plus-circle"></i> Crear Nuevo Vuelo';
    if (msg) {
        msg.className = 'message';
        msg.style.display = 'none';
    }
}

function showFlightMessage(text, type) {
    const msgDiv = document.getElementById('flightFormMessage');
    if (!msgDiv) return;
    msgDiv.className = `message ${type}`;
    msgDiv.textContent = text;
    msgDiv.style.display = 'block';
    setTimeout(() => {
        msgDiv.className = 'message';
        msgDiv.style.display = 'none';
    }, 3000);
}

// ============================================
// MANAGE USERS
// ============================================
function loadManageUsers() {
    const users = JSON.parse(localStorage.getItem('aerodash_users')) || [];
    const container = document.getElementById('adminUsersList');
    const countSpan = document.getElementById('adminUsersCount');

    if (!container) return;

    if (countSpan) countSpan.textContent = `${users.length} usuarios`;

    if (users.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No hay usuarios registrados</p></div>';
        return;
    }

    const user = window.currentUser;
    container.innerHTML = users.map(u => {
        const ticketCount = (u.tickets || []).length;
        const isAdmin = u.rol === 'ADMIN';
        const isCurrentUser = user && user.id === u.id;
        return `
            <div class="user-card">
                <div class="user-info">
                    <i class="fas fa-user-circle"></i>
                    <div>
                        <div class="user-name">${u.nombre} ${u.apellido} ${isCurrentUser ? '👤 (Tú)' : ''}</div>
                        <div class="user-email">${u.email} • ${ticketCount} reservas</div>
                    </div>
                </div>
                <div class="user-badge ${isAdmin ? 'admin' : ''}">${isAdmin ? '👑 Admin' : '👤 Usuario'}</div>
                <div class="user-actions">
                    ${!isAdmin && !isCurrentUser ? `<button class="btn-danger" onclick="window.deleteUser(${u.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function deleteUser(id) {
    if (!confirm('¿Estás seguro de eliminar este usuario? Se eliminarán también sus reservas.')) return;

    let users = JSON.parse(localStorage.getItem('aerodash_users')) || [];
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
        if (typeof showToast === 'function') {
            showToast('Usuario no encontrado', 'error');
        }
        return;
    }
    
    const user = users[userIndex];
    users.splice(userIndex, 1);
    localStorage.setItem('aerodash_users', JSON.stringify(users));
    
    if (typeof addActivityLog === 'function') {
        addActivityLog('delete_user', `Usuario ${user.email} eliminado`);
    }
    if (typeof showToast === 'function') {
        showToast(`🗑️ Usuario ${user.nombre} ${user.apellido} eliminado`);
    }
    loadManageUsers();
}

// ============================================
// INICIALIZACIÓN DE LA PÁGINA
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    loadCurrentUser();
    
    const path = window.location.pathname;
    
    if (path.includes('admin-dashboard.html')) {
        if (!checkAdminAccess()) return;
        loadAdminDashboard();
    }
    if (path.includes('manage-flights.html')) {
        if (!checkAdminAccess()) return;
        loadManageFlights();
    }
    if (path.includes('manage-users.html')) {
        if (!checkAdminAccess()) return;
        loadManageUsers();
    }
});

// ============================================
// EXPORTAR FUNCIONES GLOBALMENTE
// ============================================
window.loadAdminDashboard = loadAdminDashboard;
window.generateReport = generateReport;
window.clearAllData = clearAllData;
window.loadManageFlights = loadManageFlights;
window.renderAdminFlights = renderAdminFlights;
window.saveFlightFromForm = saveFlightFromForm;
window.editFlight = editFlight;
window.deleteFlightAdmin = deleteFlightAdmin;
window.resetFlightForm = resetFlightForm;
window.showFlightMessage = showFlightMessage;
window.loadManageUsers = loadManageUsers;
window.deleteUser = deleteUser;