// Initialize Admin Dashboard
document.addEventListener('DOMContentLoaded', async () => {
    // Basic Auth Check
    const isAdmin = localStorage.getItem('isAdmin');
    if (!isAdmin) {
        window.location.href = 'admin-login.html';
        return;
    }

    // We must wait for the DB to be ready before querying it
    await window.dbLayer.init();
    loadUsers();
});

async function loadUsers() {
    try {
        const users = await window.dbLayer.getAllUsers();
        
        // Update stats
        document.getElementById('total-users').innerText = users.length;
        
        let vaultCount = 0;
        const tbody = document.getElementById('users-tbody');
        tbody.innerHTML = '';
        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:rgba(255,255,255,0.5);">No users registered yet.</td></tr>';
            document.getElementById('total-vaults').innerText = '0';
            return;
        }

        // Render each user
        users.forEach(user => {
            const hasVault = user.vaultPassword !== null && user.vaultPassword !== undefined;
            if (hasVault) vaultCount++;
            
            // basic XSS prevention for display and properly escaping single quotes for the onclick handler
            const safeDisplay = user.username.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const safeData = user.username.replace(/'/g, "\\'");
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="font-weight: 600;">${safeDisplay}</div>
                </td>
                <td>
                    <span style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; 
                          background: ${hasVault ? 'rgba(40, 167, 69, 0.2)' : 'rgba(255,255,255,0.1)'};
                          color: ${hasVault ? '#4cd137' : 'rgba(255,255,255,0.7)'};">
                        ${hasVault ? 'Configured' : 'Not Setup'}
                    </span>
                </td>
                <td>
                    <button class="btn-small btn-danger" onclick="deleteUser('${safeData}')">Delete User</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        document.getElementById('total-vaults').innerText = vaultCount;
        
    } catch (e) {
        console.error("Failed to load users for Admin panel", e);
        const tbody = document.getElementById('users-tbody');
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#ff6b6b;">Error loading users.</td></tr>';
    }
}

async function deleteUser(username) {
    if (confirm(`Are you sure you want to delete user "${username}"? This cannot be undone.`)) {
        try {
            await window.dbLayer.deleteUser(username);
            // Optionally: If we were thorough, we'd also delete their files/folders from IndexedDB to avoid orphaned records
            loadUsers(); // refresh the list
        } catch (e) {
            alert('Error deleting user: ' + e);
        }
    }
}
