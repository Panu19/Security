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

        // Toggle Reset Password Section
        const showResetBtn = document.getElementById('show-reset-btn');
        const cancelResetBtn = document.getElementById('cancel-reset-btn');
        const loginSection = document.getElementById('login-section');
        const resetSection = document.getElementById('reset-section');

        if (showResetBtn) {
            showResetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                loginSection.style.display = 'none';
                resetSection.style.display = 'block';
            });
        }

        if (cancelResetBtn) {
            cancelResetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                resetSection.style.display = 'none';
                loginSection.style.display = 'block';
            });
        }

        // Handle Reset Password
        const resetForm = document.getElementById('reset-form');
        if (resetForm) {
            resetForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const user = document.getElementById('reset-username').value.trim();
                const securityAnswer = document.getElementById('reset-security').value.trim();
                const newPassword = document.getElementById('reset-password-new').value;

                try {
                    const userData = await window.dbLayer.getUser(user);
                    if (!userData) {
                        showAlert('reset-alert', 'User not found');
                        return;
                    }

                    if ((userData.securityAnswer || '').toLowerCase() === securityAnswer.toLowerCase()) {
                        await window.dbLayer.updatePassword(user, newPassword);
                        showAlert('reset-alert', 'Password reset successfully! Please log in.', 'success');
                        setTimeout(() => {
                            resetSection.style.display = 'none';
                            loginSection.style.display = 'block';
                            document.getElementById('reset-form').reset();
                        }, 2000);
                    } else {
                        showAlert('reset-alert', 'Incorrect security answer');
                    }
                } catch (err) {
                    showAlert('reset-alert', 'Error resetting password');
                }
            });
        }
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            const user = document.getElementById('reg-username').value.trim();
            const pass = document.getElementById('reg-password').value;
            const securityAnswer = document.getElementById('reg-security').value.trim();

            if (!user.toLowerCase().endsWith('@gmail.com')) {
                showAlert('register-alert', 'Only @gmail.com addresses are allowed');
                return;
            }

            try {
                const exists = await window.dbLayer.getUser(user);
                if (exists) {
                    showAlert('register-alert', 'Username already exists');
                    return;
                }
                
                await window.dbLayer.addUser(user, pass, securityAnswer);
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
    sessionStorage.removeItem('vaultUnlocked');
    window.location.href = 'login.html';
}

// Global lock vault function
window.lockVault = function() {
    sessionStorage.removeItem('vaultUnlocked');
    window.location.href = 'dashboard.html';
}
