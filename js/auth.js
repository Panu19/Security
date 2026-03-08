document.addEventListener('DOMContentLoaded', () => {
    // Wait for DB to initialize
    window.dbLayer.init().then(() => {
        setupAuth();
    }).catch(err => {
        console.error('Failed to init DB:', err);
        showAlert('login-alert', 'System Initialization Error', 'error');
        showAlert('register-alert', 'System Initialization Error', 'error');
    });
});

function showAlert(elementId, message, type='error') {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.className = `alert ${type}`;
    el.textContent = message;
    
    setTimeout(() => {
        el.className = 'alert hidden';
    }, 4000);
}

function setupAuth() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = document.getElementById('username').value.trim();
            const pass = document.getElementById('password').value;

            try {
                const userData = await window.dbLayer.getUser(user);
                if (userData && userData.password === pass) {
                    localStorage.setItem('activeUser', user);
                    window.location.href = 'dashboard.html';
                } else {
                    showAlert('login-alert', 'Invalid credentials');
                }
            } catch (err) {
                showAlert('login-alert', 'Login error');
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = document.getElementById('reg-username').value.trim();
            const pass = document.getElementById('reg-password').value;

            try {
                const exists = await window.dbLayer.getUser(user);
                if (exists) {
                    showAlert('register-alert', 'Username already exists');
                    return;
                }
                
                await window.dbLayer.addUser(user, pass);
                showAlert('register-alert', 'Account created! Redirecting...', 'success');
                setTimeout(() => {
                    localStorage.setItem('activeUser', user);
                    window.location.href = 'dashboard.html';
                }, 1500);
            } catch (err) {
                showAlert('register-alert', 'Registration failed');
            }
        });
    }
}

// Global logout function
window.logoutUser = function() {
    localStorage.removeItem('activeUser');
    window.location.href = 'login.html';
}
