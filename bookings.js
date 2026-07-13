// ============================================
// BOOKINGS - Gestión de Reservas
// ============================================

var _selectedFlight = null;
var _selectedSeats = [];

// ============================================
// EXPORTAR FUNCIONES Y GETTERS GLOBALMENTE
// ============================================
window.toggleSeat = toggleSeat;
window.selectFlightForBooking = selectFlightForBooking;
window.confirmBooking = confirmBooking;
window.closeBookingModal = closeBookingModal;
window.filterBookings = filterBookings;
window.viewTicket = viewTicket;
window.closeTicketModal = closeTicketModal;
window.downloadTicketPDF = downloadTicketPDF;
window.cancelTicket = cancelTicket;
window.loadMyBookings = loadMyBookings;
window.renderBookingsList = renderBookingsList;
window.updateSeatGrid = updateSeatGrid;

window.getSelectedFlight = function() { return _selectedFlight; };
window.getSelectedSeats = function() { return _selectedSeats; };

// ============================================
// SELECCIONAR VUELO PARA RESERVAR
// ============================================
function selectFlightForBooking(flightId) {
    _selectedFlight = getFlightById(flightId);
    if (!_selectedFlight) {
        if (typeof showToast === 'function') {
            showToast('Vuelo no encontrado', 'error');
        }
        return;
    }

    _selectedSeats = [];
    scrollTopPosition = window.scrollY;
    document.documentElement.style.setProperty('--scroll-top', -scrollTopPosition + 'px');

    const modal = document.getElementById('bookingModal');
    const modalContent = document.getElementById('modalFlightInfo');

    if (!modal || !modalContent) {
        if (typeof showToast === 'function') {
            showToast('Error al abrir el modal de reserva', 'error');
        }
        return;
    }

    document.body.classList.add('modal-open');

    modalContent.innerHTML = `
        <div class="ticket-details">
            <h3>${_selectedFlight.codigo} - ${_selectedFlight.origen} → ${_selectedFlight.destino}</h3>
            <p><i class="far fa-calendar-alt"></i> ${formatDate(_selectedFlight.fecha_salida)}</p>
            <p><i class="fas fa-tag"></i> Precio unitario: $${_selectedFlight.precio}</p>
            <p><i class="fas fa-chair"></i> Asientos seleccionados: <span id="selectedSeatsCount">0</span></p>
            <p><i class="fas fa-dollar-sign"></i> <strong>Total: $<span id="totalPrice">0</span></strong></p>
        </div>
    `;

    updateSeatGrid();
    modal.classList.add('active');
}

// ============================================
// ACTUALIZAR GRID DE ASIENTOS
// ============================================
function updateSeatGrid() {
    if (!_selectedFlight) return;

    const seatContainer = document.getElementById('seatSelector');
    if (!seatContainer) return;
    
    const asientosVuelo = getSeatsForFlight(_selectedFlight.id);
    
    if (!asientosVuelo || asientosVuelo.length === 0) {
        seatContainer.innerHTML = '<div class="empty-state"><p>No hay asientos disponibles para este vuelo</p></div>';
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('aerodash_users')) || [];
    const allTickets = users.reduce((acc, u) => [...acc, ...(u.tickets || [])], []);
    const occupiedSeats = allTickets
        .filter(t => t.vueloId === _selectedFlight.id && t.estado !== 'Cancelado')
        .map(t => t.asiento);

    seatContainer.innerHTML = asientosVuelo.map(seat => {
        const isOccupied = occupiedSeats.includes(seat);
        const isSelected = _selectedSeats.includes(seat);
        const classes = isOccupied ? 'occupied' : (isSelected ? 'selected' : 'available');
        const label = isOccupied ? 'Ocupado' : (isSelected ? '✓ Seleccionado' : 'Disponible');
        const onclick = isOccupied ? '' : `window.toggleSeat('${seat}')`;

        return `
            <div class="seat ${classes}" data-seat="${seat}" onclick="${onclick}">
                ${seat}
                <br><small>${label}</small>
            </div>
        `;
    }).join('');

    const counter = document.getElementById('selectedSeatsCount');
    if (counter) {
        counter.textContent = _selectedSeats.length;
    }

    const totalPriceSpan = document.getElementById('totalPrice');
    if (totalPriceSpan && _selectedFlight) {
        const total = _selectedSeats.length * _selectedFlight.precio;
        totalPriceSpan.textContent = total.toFixed(2);
    }
}

// ============================================
// TOGGLE ASIENTO
// ============================================
function toggleSeat(seat) {
    const seatElement = document.querySelector(`.seat[data-seat="${seat}"]`);
    if (!seatElement || seatElement.classList.contains('occupied')) return;

    const index = _selectedSeats.indexOf(seat);
    if (index > -1) {
        _selectedSeats.splice(index, 1);
    } else {
        _selectedSeats.push(seat);
    }

    updateSeatGrid();
}

// ============================================
// CONFIRMAR RESERVA
// ============================================
function confirmBooking() {
    if (!_selectedFlight) {
        if (typeof showToast === 'function') {
            showToast('No hay vuelo seleccionado', 'error');
        }
        return;
    }
    
    if (_selectedSeats.length === 0) {
        if (typeof showToast === 'function') {
            showToast('Por favor selecciona al menos un asiento', 'error');
        }
        return;
    }

    const paymentSelect = document.getElementById('paymentMethod');
    if (!paymentSelect) {
        if (typeof showToast === 'function') {
            showToast('Error: No se encontró el método de pago', 'error');
        }
        return;
    }
    
    const paymentMethod = paymentSelect.value;
    if (!paymentMethod) {
        if (typeof showToast === 'function') {
            showToast('Por favor selecciona un método de pago', 'error');
        }
        return;
    }

    let user = window.currentUser;
    if (!user) {
        loadCurrentUser();
        user = window.currentUser;
        if (!user) {
            if (typeof showToast === 'function') {
                showToast('Debes iniciar sesión para reservar', 'error');
            }
            return;
        }
    }

    let ticketsCreados = 0;
    _selectedSeats.forEach(seat => {
        const newTicket = {
            id: Date.now() + Math.random() * 1000,
            vueloId: _selectedFlight.id,
            vuelo: _selectedFlight.codigo,
            origen: _selectedFlight.origen,
            destino: _selectedFlight.destino,
            fecha_salida: _selectedFlight.fecha_salida,
            asiento: seat,
            precio: _selectedFlight.precio,
            estado: 'Confirmado',
            fecha_compra: new Date().toISOString(),
            metodo_pago: paymentMethod
        };

        user.tickets.push(newTicket);
        ticketsCreados++;
    });

    saveUserData();
    loadCurrentUser();
    if (typeof addActivityLog === 'function') {
        addActivityLog('booking', `${ticketsCreados} reserva(s) para ${_selectedFlight.codigo} (${_selectedFlight.origen} → ${_selectedFlight.destino})`);
    }

    _selectedSeats = [];
    updateSeatGrid();

    if (typeof showToast === 'function') {
        showToast(`🎉 ¡${ticketsCreados} ${ticketsCreados === 1 ? 'reserva' : 'reservas'} confirmada${ticketsCreados > 1 ? 's' : ''}!`);
    }

    closeBookingModal();
    
    const path = window.location.pathname;
    if (path.includes('dashboard.html') && typeof window.loadDashboard === 'function') {
        setTimeout(() => window.loadDashboard(), 500);
    } else if (path.includes('my-bookings.html')) {
        setTimeout(() => filterBookings(window.currentBookingFilter || 'all'), 500);
    } else if (path.includes('flights.html')) {
        setTimeout(() => {
            window.location.href = 'my-bookings.html';
        }, 1500);
    }
}

// ============================================
// CERRAR MODAL DE RESERVA
// ============================================
function closeBookingModal() {
    const modal = document.getElementById('bookingModal');
    if (modal) {
        modal.classList.remove('active');
    }
    _selectedFlight = null;
    _selectedSeats = [];

    document.body.classList.remove('modal-open');
    document.documentElement.style.removeProperty('--scroll-top');
    window.scrollTo(0, scrollTopPosition);
}

// ============================================
// MIS RESERVAS
// ============================================
function loadMyBookings() {
    loadCurrentUser();
    const user = window.currentUser;
    if (user && user.tickets) {
        user.tickets.sort((a, b) => {
            const dateA = new Date(a.fecha_compra || a.id);
            const dateB = new Date(b.fecha_compra || b.id);
            return dateB - dateA;
        });
    }
    filterBookings('all');
}

function filterBookings(filter) {
    window.currentBookingFilter = filter;

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        const btnFilter = btn.getAttribute('data-filter');
        if (btnFilter === filter) {
            btn.classList.add('active');
        }
    });

    const user = window.currentUser;
    if (!user) {
        const container = document.getElementById('bookingsList');
        if (container) {
            container.innerHTML = '<div class="empty-state"><p>Inicia sesión para ver tus reservas</p></div>';
        }
        return;
    }

    let filteredTickets = [...user.tickets];
    const now = new Date();

    if (filter === 'active') {
        filteredTickets = filteredTickets.filter(t => new Date(t.fecha_salida) > now && t.estado !== 'Cancelado');
    } else if (filter === 'completed') {
        filteredTickets = filteredTickets.filter(t => new Date(t.fecha_salida) < now && t.estado !== 'Cancelado');
    } else if (filter === 'cancelled') {
        filteredTickets = filteredTickets.filter(t => t.estado === 'Cancelado');
    }

    filteredTickets.sort((a, b) => {
        const dateA = new Date(a.fecha_compra || a.id);
        const dateB = new Date(b.fecha_compra || b.id);
        return dateB - dateA;
    });

    renderBookingsList(filteredTickets);
}

function renderBookingsList(tickets) {
    const container = document.getElementById('bookingsList');
    const emptyDiv = document.getElementById('emptyBookings');

    if (!container) return;

    if (!tickets || tickets.length === 0) {
        container.innerHTML = '';
        if (emptyDiv) emptyDiv.style.display = 'block';
        return;
    }

    if (emptyDiv) emptyDiv.style.display = 'none';

    const user = window.currentUser;
    container.innerHTML = tickets.map(ticket => {
        const isPast = new Date(ticket.fecha_salida) < new Date();
        const statusColor = ticket.estado === 'Confirmado' ? '#16a34a' : '#dc2626';
        return `
            <div class="booking-card" style="border-left-color: ${statusColor};">
                <div class="booking-info">
                    <h4><i class="fas fa-plane"></i> ${ticket.vuelo} - ${ticket.origen} → ${ticket.destino}</h4>
                    <p><i class="far fa-calendar-alt"></i> ${formatDate(ticket.fecha_salida)}</p>
                    <p><i class="fas fa-chair"></i> Asiento: ${ticket.asiento} | <i class="fas fa-dollar-sign"></i> $${ticket.precio}</p>
                    <p><i class="fas fa-credit-card"></i> Pagado con: ${ticket.metodo_pago}</p>
                    <p><i class="fas fa-tag"></i> Estado: <strong style="color: ${statusColor}">${ticket.estado}</strong></p>
                    <p style="font-size: 0.7rem; color: #94a3b8;"><i class="far fa-clock"></i> Comprado: ${new Date(ticket.fecha_compra).toLocaleString()}</p>
                </div>
                <div class="booking-actions">
                    <button class="btn-view" onclick="window.viewTicket(${ticket.id})"><i class="fas fa-eye"></i> Ver Ticket</button>
                    ${!isPast && ticket.estado !== 'Cancelado' ? `<button class="btn-cancel" onclick="window.cancelTicket(${ticket.id})"><i class="fas fa-times"></i> Cancelar</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// VER TICKET
// ============================================
function viewTicket(ticketId) {
    loadCurrentUser();
    const user = window.currentUser;
    if (!user) {
        if (typeof showToast === 'function') {
            showToast('Debes iniciar sesión para ver tus tickets', 'error');
        }
        return;
    }
    
    const ticket = user.tickets.find(t => t.id === ticketId);
    if (!ticket) {
        if (typeof showToast === 'function') {
            showToast('Ticket no encontrado', 'error');
        }
        return;
    }

    window.currentTicketForPDF = ticket;
    const vueloCompleto = getFlightById(ticket.vueloId);

    scrollTopPosition = window.scrollY;
    document.documentElement.style.setProperty('--scroll-top', -scrollTopPosition + 'px');
    document.body.classList.add('modal-open');

    const modal = document.getElementById('ticketModal');
    const ticketDetails = document.getElementById('ticketDetails');

    if (!modal || !ticketDetails) {
        if (typeof showToast === 'function') {
            showToast('Error al abrir el ticket', 'error');
        }
        return;
    }

    ticketDetails.innerHTML = `
        <div id="ticketContent" style="padding: 20px; background: white; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #667eea; padding-bottom: 16px;">
                <i class="fas fa-plane-departure" style="font-size: 2.5rem; color: #667eea;"></i>
                <h2 style="margin: 8px 0 4px 0; font-family: 'Poppins', sans-serif; color: #1e293b;">AeroDash Pro</h2>
                <p style="color: #64748b; margin: 0;">Aerolíneas</p>
                <p style="margin: 8px 0 0 0; font-weight: 700; color: ${ticket.estado === 'Confirmado' ? '#16a34a' : '#dc2626'};">
                    ${ticket.estado === 'Confirmado' ? '✓ TICKET CONFIRMADO' : '✗ TICKET CANCELADO'}
                </p>
            </div>
            <div style="display: grid; gap: 10px; font-size: 0.95rem;">
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
                    <strong style="color: #64748b;">N° Ticket:</strong>
                    <span>#${ticket.id}</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
                    <strong style="color: #64748b;">Pasajero:</strong>
                    <span>${user.nombre} ${user.apellido}</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
                    <strong style="color: #64748b;">Documento:</strong>
                    <span>${user.documento || 'No registrado'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
                    <strong style="color: #64748b;">Vuelo:</strong>
                    <span>${ticket.vuelo}</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
                    <strong style="color: #64748b;">Ruta:</strong>
                    <span>${ticket.origen} → ${ticket.destino}</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
                    <strong style="color: #64748b;">Fecha:</strong>
                    <span>${formatDateForPDF(ticket.fecha_salida)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
                    <strong style="color: #64748b;">Asiento:</strong>
                    <span>${ticket.asiento}</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
                    <strong style="color: #64748b;">Puerta:</strong>
                    <span>${vueloCompleto?.puerta || 'N/A'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #667eea; padding-bottom: 6px; margin-top: 4px;">
                    <strong style="color: #1e293b;">Total pagado:</strong>
                    <span style="font-weight: 800; color: #667eea;">$${ticket.precio}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding-bottom: 6px;">
                    <strong style="color: #64748b;">Método de pago:</strong>
                    <span>${ticket.metodo_pago}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding-bottom: 6px;">
                    <strong style="color: #64748b;">Comprado:</strong>
                    <span style="font-size: 0.8rem; color: #94a3b8;">${new Date(ticket.fecha_compra).toLocaleString()}</span>
                </div>
            </div>
            <div style="margin-top: 20px; padding: 12px; background: #f1f5f9; border-radius: 12px; text-align: center;">
                <i class="fas fa-qrcode" style="font-size: 2rem; color: #667eea;"></i>
                <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: #94a3b8; word-break: break-all;">
                    #${ticket.id}${ticket.vuelo}${ticket.asiento}
                </p>
            </div>
        </div>
    `;

    modal.classList.add('active');
}

function closeTicketModal() {
    const modal = document.getElementById('ticketModal');
    if (modal) modal.classList.remove('active');

    document.body.classList.remove('modal-open');
    document.documentElement.style.removeProperty('--scroll-top');
    window.scrollTo(0, scrollTopPosition);
}

function downloadTicketPDF() {
    const ticket = window.currentTicketForPDF;
    if (!ticket) {
        if (typeof showToast === 'function') {
            showToast('No hay ticket para descargar', 'error');
        }
        return;
    }

    const user = window.currentUser;
    if (!user) {
        if (typeof showToast === 'function') {
            showToast('Debes iniciar sesión', 'error');
        }
        return;
    }

    const vueloCompleto = getFlightById(ticket.vueloId);
    
    // Crear contenido del PDF
    const pdfContent = document.createElement('div');
    pdfContent.id = 'pdfTicketContent';
    pdfContent.style.cssText = 'padding: 30px; font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;';
    pdfContent.innerHTML = `
        <div style="text-align: center; border-bottom: 3px solid #667eea; padding-bottom: 20px; margin-bottom: 20px;">
            <div style="font-size: 2.5rem; color: #667eea;">✈️</div>
            <h1 style="margin: 8px 0 4px 0; color: #1e293b;">AeroDash Pro</h1>
            <p style="color: #64748b; margin: 0;">Aerolíneas</p>
            <p style="margin: 12px 0 0 0; font-weight: 700; color: ${ticket.estado === 'Confirmado' ? '#16a34a' : '#dc2626'}; font-size: 1.1rem;">
                ${ticket.estado === 'Confirmado' ? '✓ TICKET CONFIRMADO' : '✗ TICKET CANCELADO'}
            </p>
        </div>
        <div style="display: grid; gap: 10px; font-size: 0.95rem;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                <strong style="color: #64748b;">N° Ticket:</strong>
                <span>#${ticket.id}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                <strong style="color: #64748b;">Pasajero:</strong>
                <span>${user.nombre} ${user.apellido}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                <strong style="color: #64748b;">Documento:</strong>
                <span>${user.documento || 'No registrado'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                <strong style="color: #64748b;">Vuelo:</strong>
                <span>${ticket.vuelo}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                <strong style="color: #64748b;">Ruta:</strong>
                <span>${ticket.origen} → ${ticket.destino}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                <strong style="color: #64748b;">Fecha:</strong>
                <span>${formatDateForPDF(ticket.fecha_salida)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                <strong style="color: #64748b;">Asiento:</strong>
                <span>${ticket.asiento}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                <strong style="color: #64748b;">Puerta:</strong>
                <span>${vueloCompleto?.puerta || 'N/A'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #667eea; padding-bottom: 8px; margin-top: 4px;">
                <strong style="color: #1e293b;">Total pagado:</strong>
                <span style="font-weight: 800; color: #667eea; font-size: 1.2rem;">$${ticket.precio}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 8px;">
                <strong style="color: #64748b;">Método de pago:</strong>
                <span>${ticket.metodo_pago}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 8px;">
                <strong style="color: #64748b;">Comprado:</strong>
                <span style="font-size: 0.8rem; color: #94a3b8;">${new Date(ticket.fecha_compra).toLocaleString()}</span>
            </div>
        </div>
        <div style="margin-top: 24px; padding: 16px; background: #f1f5f9; border-radius: 12px; text-align: center;">
            <div style="font-size: 2rem; color: #667eea;">◼◼◼</div>
            <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: #94a3b8;">
                Código: #${ticket.id}${ticket.vuelo}${ticket.asiento}
            </p>
            <p style="margin: 8px 0 0 0; font-size: 0.7rem; color: #94a3b8;">
                Este ticket es válido para el vuelo seleccionado.
            </p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 0.7rem; color: #94a3b8;">
            <p>Generado el ${new Date().toLocaleString()}</p>
            <p>AeroDash Pro - Sistema de Gestión Aeroportuaria</p>
        </div>
    `;

    // Añadir temporalmente al DOM para generar el PDF
    document.body.appendChild(pdfContent);

    const opt = {
        margin: 10,
        filename: `Ticket_${ticket.vuelo}_${ticket.asiento}.pdf`,
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
        }
    };

    html2pdf().set(opt).from(pdfContent).save().then(function() {
        document.body.removeChild(pdfContent);
        if (typeof showToast === 'function') {
            showToast('✅ Ticket descargado correctamente', 'success');
        }
    }).catch(function(err) {
        document.body.removeChild(pdfContent);
        console.error('Error al generar PDF:', err);
        if (typeof showToast === 'function') {
            showToast('Error al generar el PDF', 'error');
        }
    });
}

// ============================================
// CANCELAR TICKET
// ============================================
function cancelTicket(ticketId) {
    if (!confirm('¿Estás seguro de cancelar esta reserva?')) return;

    loadCurrentUser();
    const user = window.currentUser;
    if (!user) {
        if (typeof showToast === 'function') {
            showToast('Debes iniciar sesión', 'error');
        }
        return;
    }
    
    const ticketIndex = user.tickets.findIndex(t => t.id === ticketId);
    if (ticketIndex === -1) {
        if (typeof showToast === 'function') {
            showToast('Ticket no encontrado', 'error');
        }
        return;
    }

    const ticket = user.tickets[ticketIndex];
    if (ticket.estado === 'Cancelado') {
        if (typeof showToast === 'function') {
            showToast('Este ticket ya está cancelado', 'warning');
        }
        return;
    }

    user.tickets[ticketIndex].estado = 'Cancelado';
    saveUserData();
    if (typeof addActivityLog === 'function') {
        addActivityLog('cancel_booking', `Reserva cancelada: ${ticket.vuelo} (${ticket.origen} → ${ticket.destino})`);
    }
    if (typeof showToast === 'function') {
        showToast('✈️ Reserva cancelada exitosamente');
    }
    filterBookings(window.currentBookingFilter || 'all');
}

// ============================================
// INICIALIZACIÓN DE LA PÁGINA
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('my-bookings.html')) {
        loadMyBookings();
    }
});