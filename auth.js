// ============================================
// AUTH - Autenticación y Registro
// ============================================

// ============================================
// LOGIN
// ============================================
function loginUser(email, password) {
    const users = JSON.parse(localStorage.getItem('aerodash_users')) || [];
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        window.currentUser = user;
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        if (typeof addActivityLog === 'function') {
            addActivityLog('login', `Inició sesión como ${user.rol}`);
        }
        return { success: true };
    }
    return { success: false, message: 'Correo o contraseña incorrectos' };
}

// ============================================
// REGISTRO
// ============================================
function registerUser(nombre, apellido, email, password, documento, telefono) {
    const users = JSON.parse(localStorage.getItem('aerodash_users')) || [];

    if (users.some(u => u.email === email)) {
        return { success: false, message: 'El correo ya está registrado' };
    }

    if (password.length < 4) {
        return { success: false, message: 'La contraseña debe tener al menos 4 caracteres' };
    }

    const newUser = {
        id: Date.now(),
        nombre,
        apellido,
        email,
        password,
        documento: documento || '',
        telefono: telefono || '',
        rol: 'USER',
        tickets: [],
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem('aerodash_users', JSON.stringify(users));
    if (typeof addActivityLog === 'function') {
        addActivityLog('register', `Nuevo usuario registrado: ${email}`);
    }
    return { success: true };
}

// ============================================
// CAMBIO DE TABS EN LOGIN
// ============================================
function switchTab(tab) {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');

    tabs.forEach((t, i) => {
        if ((tab === 'login' && i === 0) || (tab === 'register' && i === 1)) {
            t.classList.add('active');
        } else {
            t.classList.remove('active');
        }
    });

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (loginForm) loginForm.classList.toggle('active', tab === 'login');
    if (registerForm) registerForm.classList.toggle('active', tab === 'register');
}

// ============================================
// DEMO USERS
// ============================================
function fillDemo(email, password) {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    if (emailInput) emailInput.value = email;
    if (passwordInput) passwordInput.value = password;
    
    // Disparar evento para que el botón se active
    const event = new Event('input', { bubbles: true });
    if (emailInput) emailInput.dispatchEvent(event);
    if (passwordInput) passwordInput.dispatchEvent(event);
}

// ============================================
// FORZAR CREACIÓN DEL ADMINISTRADOR
// ============================================
function ensureAdminExists() {
    const users = JSON.parse(localStorage.getItem('aerodash_users')) || [];
    
    // Buscar si ya existe un admin
    const adminExists = users.some(u => u.email === 'admin@aerodash.com');
    
    if (!adminExists) {
        // Crear el administrador
        const adminUser = {
            id: 1,
            nombre: 'Administrador',
            apellido: 'Sistema',
            email: 'admin@aerodash.com',
            password: 'admin123',
            documento: '00000000',
            telefono: '0000000000',
            rol: 'ADMIN',
            tickets: [],
            createdAt: new Date().toISOString()
        };
        users.push(adminUser);
        localStorage.setItem('aerodash_users', JSON.stringify(users));
        console.log('✅ Usuario administrador creado correctamente');
        console.log('👑 Email: admin@aerodash.com');
        console.log('🔑 Contraseña: admin123');
    } else {
        // Verificar que el admin tenga los datos correctos
        const adminIndex = users.findIndex(u => u.email === 'admin@aerodash.com');
        if (adminIndex !== -1) {
            // Asegurar que el admin tenga rol ADMIN
            users[adminIndex].rol = 'ADMIN';
            users[adminIndex].nombre = 'Administrador';
            users[adminIndex].apellido = 'Sistema';
            users[adminIndex].password = 'admin123';
            localStorage.setItem('aerodash_users', JSON.stringify(users));
            console.log('✅ Usuario administrador verificado y corregido');
        }
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // FORZAR CREACIÓN DEL ADMINISTRADOR
    ensureAdminExists();

    if (!window.location.pathname.includes('login.html')) return;

    const loginForm = document.getElementById('loginFormElement');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const result = loginUser(email, password);

            const messageDiv = document.getElementById('loginMessage');
            if (result.success) {
                messageDiv.className = 'message success';
                messageDiv.textContent = '¡Bienvenido! Redirigiendo...';
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                messageDiv.className = 'message error';
                messageDiv.textContent = result.message;
            }
        });
    }

    const registerForm = document.getElementById('registerFormElement');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nombre = document.getElementById('regNombre').value;
            const apellido = document.getElementById('regApellido').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('regConfirmPassword').value;
            const documento = document.getElementById('regDocumento').value;
            const telefono = document.getElementById('regTelefono').value;

            if (password !== confirmPassword) {
                const msgDiv = document.getElementById('registerMessage');
                msgDiv.className = 'message error';
                msgDiv.textContent = 'Las contraseñas no coinciden';
                return;
            }

            const result = registerUser(nombre, apellido, email, password, documento, telefono);
            const msgDiv = document.getElementById('registerMessage');

            if (result.success) {
                msgDiv.className = 'message success';
                msgDiv.textContent = 'Registro exitoso. Ahora inicia sesión';
                setTimeout(() => switchTab('login'), 1500);
                document.getElementById('registerFormElement').reset();
            } else {
                msgDiv.className = 'message error';
                msgDiv.textContent = result.message;
            }
        });
    }
});

// ============================================
// EXPORTAR FUNCIONES GLOBALMENTE
// ============================================
window.loginUser = loginUser;
window.registerUser = registerUser;
window.switchTab = switchTab;
window.fillDemo = fillDemo;
window.ensureAdminExists = ensureAdminExists;