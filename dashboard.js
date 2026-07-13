// ============================================
// DASHBOARD - Página Principal
// ============================================

// ============================================
// CARGA DEL DASHBOARD
// ============================================
function loadDashboard() {
    let user = window.currentUser;
    if (!user) {
        loadCurrentUser();
        user = window.currentUser;
        if (!user) return;
    }

    const welcomeName = document.getElementById('welcomeName');
    if (welcomeName) welcomeName.textContent = user.nombre;
    
    const roleSpan = document.getElementById('welcomeRole');
    if (roleSpan) {
        roleSpan.textContent = user.rol === 'ADMIN' ? '👑 Administrador' : '👤 Usuario';
    }

    const vuelos = getFlights();
    const totalFlightsEl = document.getElementById('totalFlights');
    const myTicketsEl = document.getElementById('myTicketsCount');
    const totalSpentEl = document.getElementById('totalSpent');
    const upcomingFlightsEl = document.getElementById('upcomingFlights');

    if (totalFlightsEl) totalFlightsEl.textContent = vuelos.length;
    if (myTicketsEl) myTicketsEl.textContent = user.tickets.length;

    const totalSpent = user.tickets.reduce((sum, t) => sum + (t.precio || 0), 0);
    if (totalSpentEl) totalSpentEl.textContent = `$${totalSpent}`;

    const upcoming = user.tickets.filter(t => new Date(t.fecha_salida) > new Date() && t.estado !== 'Cancelado').length;
    if (upcomingFlightsEl) upcomingFlightsEl.textContent = upcoming;

    const adminActions = document.getElementById('adminQuickActions');
    if (adminActions && user.rol === 'ADMIN') {
        adminActions.style.display = 'block';
    }

    const upcomingFlights = vuelos.filter(v => new Date(v.fecha_salida) > new Date()).slice(0, 3);
    renderFlightsGrid(upcomingFlights, 'upcomingFlightsList', true);

    const recentTickets = [...user.tickets].reverse().slice(0, 3);
    renderRecentBookings(recentTickets);

    const featured = vuelos.filter(v => v.precio <= 200).slice(0, 3);
    renderFlightsGrid(featured, 'featuredFlights', true);
}

// ============================================
// RENDER FLIGHTS GRID
// ============================================
function renderFlightsGrid(flights, containerId, showBuyButton = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!flights || flights.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <i class="fas fa-plane-slash"></i>
            <h3>No hay vuelos disponibles</h3>
            <p>Pronto habrá más vuelos disponibles</p>
        </div>`;
        return;
    }

    container.innerHTML = flights.map(flight => `
        <div class="flight-card">
            <div class="flight-header">
                <span class="flight-code"><i class="fas fa-tag"></i> ${flight.codigo}</span>
                <span class="flight-status status-${flight.estado}">${flight.estado}</span>
            </div>
            <div class="flight-route">
                <i class="fas fa-plane-departure"></i> ${flight.origen} → ${flight.destino}
            </div>
            <div class="flight-time">
                <i class="far fa-calendar-alt"></i> ${formatDate(flight.fecha_salida)}
            </div>
            <div class="flight-time">
                <i class="far fa-clock"></i> ${flight.duracion}
            </div>
            <div class="flight-price">$${flight.precio}</div>
            ${showBuyButton ? `<button class="btn-primary btn-block" onclick="window.selectFlightForBooking(${flight.id})">Reservar Ahora</button>` : ''}
        </div>
    `).join('');
}

// ============================================
// RENDER RECENT BOOKINGS
// ============================================
function renderRecentBookings(tickets) {
    const container = document.getElementById('recentBookings');
    if (!container) return;

    if (!tickets || tickets.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No tienes reservas recientes</p></div>';
        return;
    }

    container.innerHTML = tickets.map(ticket => {
        const vuelo = getFlightById(ticket.vueloId);
        if (!vuelo) return '';
        return `
            <div class="booking-card">
                <div class="booking-info">
                    <h4>${vuelo.codigo} - ${vuelo.origen} → ${vuelo.destino}</h4>
                    <p><i class="far fa-calendar-alt"></i> ${formatDate(vuelo.fecha_salida)}</p>
                    <p><i class="fas fa-chair"></i> Asiento: ${ticket.asiento} | Pagado: $${ticket.precio}</p>
                </div>
                <div class="booking-actions">
                    <button class="btn-view" onclick="window.viewTicket(${ticket.id})">Ver Ticket</button>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// INICIALIZACIÓN DE LA PÁGINA
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard.html')) {
        loadDashboard();
    }
});

// ============================================
// EXPORTAR FUNCIONES GLOBALMENTE
// ============================================
window.loadDashboard = loadDashboard;
window.renderFlightsGrid = renderFlightsGrid;
window.renderRecentBookings = renderRecentBookings;