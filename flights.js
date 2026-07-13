// ============================================
// FLIGHTS - Gestión de Vuelos
// ============================================

// ============================================
// CRUD DE VUELOS
// ============================================
function getFlights() {
    const stored = localStorage.getItem('aerodash_flights');
    if (stored) {
        const flights = JSON.parse(stored);
        return flights.map(f => ({ ...f, estado: f.estado || 'Programado' }));
    }
    localStorage.setItem('aerodash_flights', JSON.stringify(initialFlights));
    localStorage.setItem('aerodash_seats', JSON.stringify(asientosDisponibles));
    return initialFlights;
}

function saveFlights(flights) {
    localStorage.setItem('aerodash_flights', JSON.stringify(flights));
}

function getFlightById(id) {
    const flights = getFlights();
    return flights.find(f => f.id === id);
}

function generateSeatsForFlight(flightId) {
    const seats = [];
    const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
    for (let i = 1; i <= 10; i++) {
        for (let row of rows) {
            seats.push(`${i}${row}`);
        }
    }
    return seats;
}

function showFlightMessage(message, type = 'error') {
    if (typeof showToast === 'function') {
        showToast(message, type);
    } else {
        alert(message);
    }
}

function createFlight(flightData) {
    const flights = getFlights();
    
    if (flights.some(f => f.codigo === flightData.codigo)) {
        showFlightMessage('Ya existe un vuelo con ese código', 'error');
        return null;
    }
    
    if (!flightData.fecha_salida) {
        showFlightMessage('La fecha de salida es obligatoria', 'error');
        return null;
    }
    
    const salida = new Date(flightData.fecha_salida);
    if (isNaN(salida.getTime())) {
        showFlightMessage('La fecha de salida no es válida', 'error');
        return null;
    }
    
    const llegada = new Date(flightData.fecha_llegada || flightData.fecha_salida);
    if (isNaN(llegada.getTime())) {
        showFlightMessage('La fecha de llegada no es válida', 'error');
        return null;
    }
    
    if (llegada <= salida) {
        showFlightMessage('La fecha de llegada debe ser posterior a la fecha de salida', 'error');
        return null;
    }
    
    const newFlight = {
        id: Date.now(),
        ...flightData,
        estado: flightData.estado || 'Programado'
    };
    flights.push(newFlight);
    saveFlights(flights);
    
    const seats = generateSeatsForFlight(newFlight.id);
    updateSeatsForFlight(newFlight.id, seats);
    
    if (typeof addActivityLog === 'function') {
        addActivityLog('create_flight', `Vuelo ${newFlight.codigo} creado: ${newFlight.origen} → ${newFlight.destino}`);
    }
    return newFlight;
}

function updateFlight(id, flightData) {
    const flights = getFlights();
    const index = flights.findIndex(f => f.id === id);
    if (index === -1) return null;
    
    if (flights.some(f => f.codigo === flightData.codigo && f.id !== id)) {
        showFlightMessage('Ya existe otro vuelo con ese código', 'error');
        return null;
    }
    
    if (!flightData.fecha_salida) {
        showFlightMessage('La fecha de salida es obligatoria', 'error');
        return null;
    }
    
    const salida = new Date(flightData.fecha_salida);
    if (isNaN(salida.getTime())) {
        showFlightMessage('La fecha de salida no es válida', 'error');
        return null;
    }
    
    const llegada = new Date(flightData.fecha_llegada || flightData.fecha_salida);
    if (isNaN(llegada.getTime())) {
        showFlightMessage('La fecha de llegada no es válida', 'error');
        return null;
    }
    
    if (llegada <= salida) {
        showFlightMessage('La fecha de llegada debe ser posterior a la fecha de salida', 'error');
        return null;
    }
    
    flights[index] = { ...flights[index], ...flightData };
    saveFlights(flights);
    if (typeof addActivityLog === 'function') {
        addActivityLog('edit_flight', `Vuelo ${flights[index].codigo} actualizado`);
    }
    return flights[index];
}

function deleteFlight(id) {
    const flights = getFlights();
    const flight = flights.find(f => f.id === id);
    const index = flights.findIndex(f => f.id === id);
    if (index === -1) return false;
    
    const users = JSON.parse(localStorage.getItem('aerodash_users')) || [];
    const hasBookings = users.some(u => 
        (u.tickets || []).some(t => t.vueloId === id && t.estado !== 'Cancelado')
    );
    
    if (hasBookings) {
        showFlightMessage('No se puede eliminar el vuelo porque tiene reservas activas', 'error');
        return false;
    }
    
    flights.splice(index, 1);
    saveFlights(flights);
    
    const allSeats = JSON.parse(localStorage.getItem('aerodash_seats')) || {};
    delete allSeats[id];
    localStorage.setItem('aerodash_seats', JSON.stringify(allSeats));
    
    if (typeof addActivityLog === 'function') {
        addActivityLog('delete_flight', `Vuelo ${flight?.codigo || id} eliminado`);
    }
    return true;
}

function getSeatsForFlight(flightId) {
    const stored = localStorage.getItem('aerodash_seats');
    if (stored) {
        const seats = JSON.parse(stored);
        return seats[flightId] || [];
    }
    return asientosDisponibles[flightId] || [];
}

function updateSeatsForFlight(flightId, seats) {
    const stored = localStorage.getItem('aerodash_seats');
    const allSeats = stored ? JSON.parse(stored) : {};
    allSeats[flightId] = seats;
    localStorage.setItem('aerodash_seats', JSON.stringify(allSeats));
}

// ============================================
// PÁGINA DE EXPLORAR VUELOS
// ============================================
function loadFlightsPage() {
    const vuelos = getFlights();
    renderAllFlights(vuelos);
    const searchBtn = document.getElementById('searchFlightsBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', searchFlights);
    }
}

function renderAllFlights(flightsList) {
    const container = document.getElementById('flightsList');
    const countSpan = document.getElementById('resultsCount');

    if (!container) return;

    if (!flightsList || flightsList.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No se encontraron vuelos</p></div>';
        if (countSpan) countSpan.textContent = '0 vuelos';
        return;
    }

    if (countSpan) countSpan.textContent = `${flightsList.length} vuelos`;

    container.innerHTML = flightsList.map(flight => `
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
            <button class="btn-primary" style="width:100%" onclick="window.selectFlightForBooking(${flight.id})">
                Reservar Ahora
            </button>
        </div>
    `).join('');
}

function searchFlights() {
    const origen = document.getElementById('filterOrigen').value.toLowerCase();
    const destino = document.getElementById('filterDestino').value.toLowerCase();
    const fecha = document.getElementById('filterFecha').value;

    let filtered = getFlights();
    if (origen) filtered = filtered.filter(v => v.origen.toLowerCase().includes(origen));
    if (destino) filtered = filtered.filter(v => v.destino.toLowerCase().includes(destino));
    if (fecha) filtered = filtered.filter(v => v.fecha_salida.startsWith(fecha));

    renderAllFlights(filtered);
}

// ============================================
// INICIALIZACIÓN DE LA PÁGINA
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('flights.html')) {
        loadFlightsPage();
    }
});

// ============================================
// EXPORTAR FUNCIONES GLOBALMENTE
// ============================================
window.getFlights = getFlights;
window.saveFlights = saveFlights;
window.getFlightById = getFlightById;
window.createFlight = createFlight;
window.updateFlight = updateFlight;
window.deleteFlight = deleteFlight;
window.getSeatsForFlight = getSeatsForFlight;
window.updateSeatsForFlight = updateSeatsForFlight;
window.loadFlightsPage = loadFlightsPage;
window.renderAllFlights = renderAllFlights;
window.searchFlights = searchFlights;
window.generateSeatsForFlight = generateSeatsForFlight;
window.showFlightMessage = showFlightMessage;