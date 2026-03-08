const activeUser = localStorage.getItem('activeUser');

if (!activeUser) {
    window.location.href = 'login.html';
}

window.logoutUser = function() {
    localStorage.removeItem('activeUser');
    sessionStorage.removeItem('vaultUnlocked');
    window.location.href = 'login.html';
};

let publicFiles = [];
let publicFolders = [];
let currentFolderId = null;
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('username-display').textContent = activeUser;

    window.dbLayer.init().then(() => {
        loadData();
        setupUpload();
        setupFolders();
        setupVaultAccess();
        setupTabs();
        
        // Setup document click to close action menus
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-icon') && !e.target.closest('.action-menu')) {
                document.querySelectorAll('.action-menu').forEach(menu => menu.classList.add('hidden'));
            }
        });
    }).catch(err => {
        console.error('DB Init Error', err);
    });
});

async function loadData() {
    try {
        publicFolders = await window.dbLayer.getFolders(activeUser, 'public');
        publicFiles = await window.dbLayer.getFiles(activeUser, 'public', currentFolderId);
        renderBreadcrumbs();
        renderGrid();
        updateFolderSelects();
    } catch (err) {
        console.error('Failed to load data', err);
    }
}

function getFilteredFiles() {
    if (currentFilter === 'all') return publicFiles;
    if (currentFilter === 'image') return publicFiles.filter(f => f.mimeType.startsWith('image/'));
    if (currentFilter === 'video') return publicFiles.filter(f => f.mimeType.startsWith('video/'));
    if (currentFilter === 'application/pdf') return publicFiles.filter(f => f.mimeType === 'application/pdf');
    return publicFiles;
}

function renderBreadcrumbs() {
    const nav = document.getElementById('folder-nav');
    nav.innerHTML = `<span class="nav-item" onclick="navigateTo(null)">Home</span>`;
    
    if (currentFolderId) {
        const folder = publicFolders.find(f => f.id === currentFolderId);
        if (folder) {
            nav.innerHTML += ` <span class="nav-separator">/</span> <span class="nav-item">${folder.name}</span>`;
        }
    }
}

function navigateTo(folderId) {
    currentFolderId = folderId;
    loadData();
}

function updateFolderSelects() {
    const select = document.getElementById('upload-folder-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">Root Directory</option>';
    publicFolders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.id;
        option.textContent = folder.name;
        if (folder.id === currentFolderId) option.selected = true;
        select.appendChild(option);
    });
}

function renderGrid() {
    const grid = document.getElementById('file-grid');
    grid.innerHTML = '';

    const displayFiles = getFilteredFiles();
    
    // Only show folders when in 'all' view and at root (or modify to show folders always)
    const showFolders = currentFilter === 'all' && currentFolderId === null;

    if (displayFiles.length === 0 && (!showFolders || publicFolders.length === 0)) {
        grid.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" width="48" height="48">
                    <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                </svg>
                <p>No files or folders here.</p>
            </div>
        `;
        return;
    }

    // Render Folders
    if (showFolders) {
        publicFolders.forEach(folder => {
            const card = document.createElement('div');
            card.className = 'file-card folder-card';
            
            card.innerHTML = `
                <div class="file-preview" onclick="navigateTo(${folder.id})">
                    <svg viewBox="0 0 24 24">
                        <path d="M9.17 6l2 2H20v12H4V6h5.17M10 4H4c-1.1 0-1.99.9-1.99 2L2 20c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                    </svg>
                </div>
                <div class="file-info">
                    <div class="file-details">
                        <div class="file-name" title="${folder.name}">${folder.name}</div>
                        <div class="file-meta">Folder</div>
                    </div>
                    <button class="btn-icon" onclick="event.stopPropagation(); toggleMenu('menu-folder-${folder.id}')">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                    </button>
                    <div id="menu-folder-${folder.id}" class="action-menu hidden">
                        <button class="menu-item danger" onclick="deleteFolder(${folder.id})">Delete Folder</button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    // Render Files
    displayFiles.forEach(file => {
        const card = document.createElement('div');
        card.className = 'file-card';
        
        let previewHtml = '';
        const url = URL.createObjectURL(file.fileData);
        
        if (file.mimeType.startsWith('image/')) {
            previewHtml = `<img src="${url}" alt="preview">`;
        } else if (file.mimeType.startsWith('video/')) {
             previewHtml = `<video src="${url}" preload="metadata"></video>`;
        } else if (file.mimeType === 'application/pdf') {
             previewHtml = `<svg viewBox="0 0 24 24"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/></svg>`;
        } else {
             previewHtml = `<svg viewBox="0 0 24 24"><path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z"/></svg>`;
        }

        const date = new Date(file.timestamp).toLocaleDateString();

        card.innerHTML = `
            <div class="file-preview" onclick="viewFile('${url}', '${file.mimeType}')">
                ${previewHtml}
            </div>
            <div class="file-info">
                <div class="file-details">
                    <div class="file-name" title="${file.name}">${file.name}</div>
                    <div class="file-meta">${date} &bull; ${(file.fileData.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
                <button class="btn-icon" onclick="event.stopPropagation(); toggleMenu('menu-file-${file.id}')">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                </button>
                <div id="menu-file-${file.id}" class="action-menu hidden">
                    <button class="menu-item" onclick="viewFile('${url}', '${file.mimeType}')">View</button>
                    <button class="menu-item" onclick="downloadFile('${url}', '${file.name}')">Download</button>
                    <button class="menu-item" onclick="shareFile(${file.id})">Share</button>
                    <button class="menu-item danger" onclick="deleteFile(${file.id})">Delete</button>
                </div>
            </div>
        `;

        grid.appendChild(card);
    });
}

function toggleMenu(menuId) {
    document.querySelectorAll('.action-menu').forEach(m => {
        if(m.id !== menuId) m.classList.add('hidden');
    });
    document.getElementById(menuId).classList.toggle('hidden');
}

function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            renderGrid();
        });
    });
}

// Folder Logic
window.openFolderModal = function() {
    document.getElementById('folder-name').value = '';
    document.getElementById('folder-modal').classList.add('active');
}

function setupFolders() {
    document.getElementById('confirm-folder').addEventListener('click', async () => {
        const name = document.getElementById('folder-name').value.trim();
        if (!name) return;
        
        try {
            await window.dbLayer.addFolder(activeUser, name, 'public');
            document.getElementById('folder-modal').classList.remove('active');
            loadData();
        } catch (err) {
            console.error(err);
        }
    });
}

async function deleteFolder(id) {
    if (confirm('Delete this folder? Files inside will not be deleted but loose their folder binding.')) {
        await window.dbLayer.deleteFolder(id);
        loadData();
    }
}

// Upload Logic
window.openUploadModal = function() {
    document.getElementById('upload-modal').classList.add('active');
    document.getElementById('file-input').value = "";
    document.getElementById('selected-file-name').textContent = "";
}

function setupUpload() {
    const input = document.getElementById('file-input');
    const label = document.getElementById('selected-file-name');
    let currentFile = null;

    input.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            currentFile = e.target.files[0];
            label.textContent = currentFile.name;
        }
    });

    document.getElementById('confirm-upload').addEventListener('click', async () => {
        if (!currentFile) return;
        
        const folderSelect = document.getElementById('upload-folder-select');
        const fId = folderSelect.value ? Number(folderSelect.value) : null;

        try {
            await window.dbLayer.addFile(
                activeUser,
                currentFile,
                currentFile.name,
                currentFile.type || 'application/octet-stream',
                'public',
                fId
            );
            document.getElementById('upload-modal').classList.remove('active');
            currentFile = null;
            loadData();
        } catch (err) {
            console.error('Upload failed', err);
            alert('Upload failed');
        }
    });
}

// File Actions
window.downloadFile = function(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

window.shareFile = async function(id) {
    const file = publicFiles.find(f => f.id === id);
    if (!file) return;

    if (navigator.share) {
        try {
            const f = new File([file.fileData], file.name, { type: file.mimeType });
            await navigator.share({
                files: [f],
                title: file.name
            });
        } catch (err) {
            console.error('Share failed', err);
            alert('Sharing failed or not supported for this file type.');
        }
    } else {
        alert("Web Share API not supported in this browser");
    }
}

async function deleteFile(id) {
    if (confirm('Are you sure you want to delete this file?')) {
        await window.dbLayer.deleteFile(id);
        loadData();
    }
}

function setupVaultAccess() {
    const vaultModal = document.getElementById('vault-modal');
    const btnVault = document.getElementById('btn-vault');
    const vaultMsg = document.getElementById('vault-modal-msg');
    
    let isSettingPin = false;

    btnVault.addEventListener('click', async () => {
        const user = await window.dbLayer.getUser(activeUser);
        
        if (!user.vaultPassword) {
            isSettingPin = true;
            vaultMsg.textContent = "Create a new Vault PIN to secure your files.";
            vaultMsg.style.color = "#4facfe";
            document.getElementById('confirm-vault').textContent = "Set PIN & Enter";
        } else {
            isSettingPin = false;
            vaultMsg.textContent = "Enter your Vault PIN to unlock.";
            vaultMsg.style.color = "#ccc";
            document.getElementById('confirm-vault').textContent = "Unlock Vault";
        }

        document.getElementById('vault-pin').value = '';
        vaultModal.classList.add('active');
    });

    document.getElementById('cancel-vault').addEventListener('click', () => {
        vaultModal.classList.remove('active');
    });

    document.getElementById('confirm-vault').addEventListener('click', async () => {
        const pin = document.getElementById('vault-pin').value;
        if (!pin) return;

        if (isSettingPin) {
            await window.dbLayer.updateVaultPassword(activeUser, pin);
            alert('Vault PIN set successfully!');
            sessionStorage.setItem('vaultUnlocked', 'true');
            window.location.href = 'vault.html';
        } else {
            const user = await window.dbLayer.getUser(activeUser);
            if (user.vaultPassword === pin) {
                sessionStorage.setItem('vaultUnlocked', 'true');
                window.location.href = 'vault.html';
            } else {
                alert('Incorrect Vault PIN!');
            }
        }
    });
}

// File Viewer UI
window.viewFile = function(url, mimeType) {
    const overlay = document.getElementById('file-viewer');
    const container = document.getElementById('viewer-container');
    container.innerHTML = '';
    
    if (mimeType.startsWith('image/')) {
        container.innerHTML = `<img src="${url}" style="max-width:100%; max-height:100%; object-fit: contain;">`;
    } else if (mimeType.startsWith('video/')) {
        container.innerHTML = `<video src="${url}" controls autoplay playsinline style="max-width:100%; max-height:100%; object-fit: contain;"></video>`;
    } else if (mimeType === 'application/pdf') {
        container.innerHTML = `
            <iframe src="${url}" style="width:80vw; height:70vh; border:none; background:#fff; display:block;"></iframe>
            <div style="text-align: center; margin-top: 15px;">
                <a href="${url}" download="document.pdf" class="btn" style="text-decoration: none; display: inline-block;">Download / Open Mobile PDF</a>
            </div>
        `;
    } else {
        alert("Preview not supported for this file type.");
        return;
    }
    
    overlay.classList.add('active');
}

window.closeViewer = function() {
    const overlay = document.getElementById('file-viewer');
    overlay.classList.remove('active');
    document.getElementById('viewer-container').innerHTML = '';
}
