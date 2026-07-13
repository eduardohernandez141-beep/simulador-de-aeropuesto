// ============================================
// PROFILE - Gestión de Perfil
// ============================================

// ============================================
// CARGA DEL PERFIL
// ============================================
function loadProfile() {
    let user = window.currentUser;
    if (!user) {
        loadCurrentUser();
        user = window.currentUser;
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
    }

    const nameEl = document.getElementById('profileName');
    const emailEl = document.getElementById('profileEmail');
    const ticketsEl = document.getElementById('profileTickets');
    const spentEl = document.getElementById('profileSpent');
    const roleEl = document.getElementById('profileRole');

    if (nameEl) nameEl.textContent = `${user.nombre} ${user.apellido}`;
    if (emailEl) emailEl.textContent = user.email;
    if (ticketsEl) ticketsEl.textContent = user.tickets.length;

    const totalSpent = user.tickets.reduce((sum, t) => sum + (t.precio || 0), 0);
    if (spentEl) spentEl.textContent = `$${totalSpent}`;

    if (roleEl) {
        roleEl.textContent = user.rol === 'ADMIN' ? '👑 Administrador' : '👤 Usuario';
    }

    const nombreInput = document.getElementById('profileNombre');
    const apellidoInput = document.getElementById('profileApellido');
    const emailInput = document.getElementById('profileEmailInput');
    const documentoInput = document.getElementById('profileDocumento');
    const telefonoInput = document.getElementById('profileTelefono');

    if (nombreInput) nombreInput.value = user.nombre;
    if (apellidoInput) apellidoInput.value = user.apellido;
    if (emailInput) emailInput.value = user.email;
    if (documentoInput) documentoInput.value = user.documento || '';
    if (telefonoInput) telefonoInput.value = user.telefono || '';

    const form = document.getElementById('profileForm');
    if (form) {
        form.addEventListener('submit', updateProfile);
    }
}

// ============================================
// ACTUALIZAR PERFIL
// ============================================
function updateProfile(e) {
    e.preventDefault();

    const nombre = document.getElementById('profileNombre').value.trim();
    const apellido = document.getElementById('profileApellido').value.trim();
    const email = document.getElementById('profileEmailInput').value.trim();
    const documento = document.getElementById('profileDocumento').value.trim();
    const telefono = document.getElementById('profileTelefono').value.trim();

    if (!nombre || !apellido || !email) {
        showMessage('Todos los campos obligatorios deben estar llenos', 'error');
        return;
    }

    const users = JSON.parse(localStorage.getItem('aerodash_users')) || [];
    const user = window.currentUser;
    if (!user) {
        showMessage('Debes iniciar sesión', 'error');
        return;
    }

    const emailExists = users.some(u => u.email === email && u.id !== user.id);
    if (emailExists) {
        showMessage('Este correo ya está registrado por otro usuario', 'error');
        return;
    }

    user.nombre = nombre;
    user.apellido = apellido;
    user.email = email;
    user.documento = documento;
    user.telefono = telefono;

    saveUserData();
    updateNavbarUser();
    if (typeof addActivityLog === 'function') {
        addActivityLog('profile_update', 'Perfil actualizado');
    }

    showMessage('✅ Perfil actualizado correctamente', 'success');

    setTimeout(() => {
        const msgDiv = document.getElementById('profileMessage');
        if (msgDiv) {
            msgDiv.className = 'message';
            msgDiv.style.display = 'none';
        }
    }, 3000);
}

// ============================================
// MOSTRAR MENSAJE
// ============================================
function showMessage(text, type) {
    const msgDiv = document.getElementById('profileMessage');
    if (!msgDiv) return;
    msgDiv.className = `message ${type}`;
    msgDiv.textContent = text;
    msgDiv.style.display = 'block';
}

// ============================================
// INICIALIZACIÓN DE LA PÁGINA
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('profile.html')) {
        loadProfile();
    }
});

// ============================================
// EXPORTAR FUNCIONES GLOBALMENTE
// ============================================
window.loadProfile = loadProfile;
window.updateProfile = updateProfile;
window.showMessage = showMessage;