const activeUser = localStorage.getItem('activeUser');

if (!activeUser) {
    window.location.href = 'login.html';
}

const vaultUnlocked = sessionStorage.getItem('vaultUnlocked');
if (vaultUnlocked !== 'true') {
    window.location.href = 'dashboard.html';
}

window.logoutUser = function() {
    localStorage.removeItem('activeUser');
    sessionStorage.removeItem('vaultUnlocked');
    window.location.href = 'login.html';
};

window.lockVault = function() {
    sessionStorage.removeItem('vaultUnlocked');
    window.location.href = 'dashboard.html';
};

let vaultFiles = [];
let vaultFolders = [];
let currentFolderId = null;
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    window.dbLayer.init().then(() => {
        loadVaultData();
        setupVaultUpload();
        setupVaultFolders();
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

async function loadVaultData() {
    try {
        vaultFolders = await window.dbLayer.getFolders(activeUser, 'vault');
        vaultFiles = await window.dbLayer.getFiles(activeUser, 'vault', currentFolderId);
        renderBreadcrumbs();
        renderVaultGrid();
        updateFolderSelects();
    } catch (err) {
        console.error('Failed to load hidden data', err);
    }
}

function getFilteredFiles() {
    if (currentFilter === 'all') return vaultFiles;
    if (currentFilter === 'image') return vaultFiles.filter(f => f.mimeType.startsWith('image/'));
    if (currentFilter === 'video') return vaultFiles.filter(f => f.mimeType.startsWith('video/'));
    if (currentFilter === 'application/pdf') return vaultFiles.filter(f => f.mimeType === 'application/pdf');
    return vaultFiles;
}

function renderBreadcrumbs() {
    const nav = document.getElementById('folder-nav');
    nav.innerHTML = `<span class="nav-item" onclick="navigateTo(null)">Root Vault</span>`;
    
    if (currentFolderId) {
        const folder = vaultFolders.find(f => f.id === currentFolderId);
        if (folder) {
            nav.innerHTML += ` <span class="nav-separator">/</span> <span class="nav-item">${folder.name}</span>`;
        }
    }
}

function navigateTo(folderId) {
    currentFolderId = folderId;
    loadVaultData();
}

function updateFolderSelects() {
    const select = document.getElementById('upload-folder-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">Root Vault Directory</option>';
    vaultFolders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.id;
        option.textContent = folder.name;
        if (folder.id === currentFolderId) option.selected = true;
        select.appendChild(option);
    });
}

function renderVaultGrid() {
    const grid = document.getElementById('file-grid');
    grid.innerHTML = '';

    const displayFiles = getFilteredFiles();
    
    // Only show folders when in 'all' view and at root
    const showFolders = currentFilter === 'all' && currentFolderId === null;

    if (displayFiles.length === 0 && (!showFolders || vaultFolders.length === 0)) {
        grid.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" width="48" height="48">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                </svg>
                <p>No files or folders here.</p>
            </div>
        `;
        return;
    }

    // Render Folders
    if (showFolders) {
        vaultFolders.forEach(folder => {
            const card = document.createElement('div');
            card.className = 'file-card folder-card vault-folder-card';
            card.style.borderColor = 'rgba(245, 87, 108, 0.2)';
            
            card.innerHTML = `
                <div class="file-preview" onclick="navigateTo(${folder.id})" style="background: rgba(245, 87, 108, 0.05);">
                    <svg viewBox="0 0 24 24">
                        <path d="M9.17 6l2 2H20v12H4V6h5.17M10 4H4c-1.1 0-1.99.9-1.99 2L2 20c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                    </svg>
                </div>
                <div class="file-info">
                    <div class="file-details">
                        <div class="file-name" title="${folder.name}">${folder.name}</div>
                        <div class="file-meta">Hidden Folder</div>
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

    // Render Vault Files
    displayFiles.forEach(file => {
        const card = document.createElement('div');
        card.className = 'file-card';
        card.style.borderColor = 'rgba(245, 87, 108, 0.2)';
        
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
            <div class="file-preview" onclick="viewFile('${url}', '${file.mimeType}')" style="background: rgba(245, 87, 108, 0.05);">
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
            renderVaultGrid();
        });
    });
}

// Folder Logic
window.openFolderModal = function() {
    document.getElementById('folder-name').value = '';
    document.getElementById('folder-modal').classList.add('active');
}

function setupVaultFolders() {
    document.getElementById('confirm-folder').addEventListener('click', async () => {
        const name = document.getElementById('folder-name').value.trim();
        if (!name) return;
        
        try {
            await window.dbLayer.addFolder(activeUser, name, 'vault');
            document.getElementById('folder-modal').classList.remove('active');
            loadVaultData();
        } catch (err) {
            console.error(err);
        }
    });
}

async function deleteFolder(id) {
    if (confirm('Delete this folder? Hidden files inside will not be deleted but will appear at the root Vault.')) {
        await window.dbLayer.deleteFolder(id);
        loadVaultData();
    }
}

// Upload Logic
window.openUploadModal = function() {
    document.getElementById('upload-modal').classList.add('active');
    document.getElementById('file-input').value = "";
    document.getElementById('selected-file-name').textContent = "";
}

function setupVaultUpload() {
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
                'vault',
                fId
            );
            document.getElementById('upload-modal').classList.remove('active');
            currentFile = null;
            loadVaultData();
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
    const file = vaultFiles.find(f => f.id === id);
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
    if (confirm('Are you sure you want to permanently delete this hidden file?')) {
        await window.dbLayer.deleteFile(id);
        loadVaultData();
    }
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
                <button onclick="window.open('${url}', '_blank')" class="btn" style="text-decoration: none; display: inline-block; cursor: pointer;">Download / Open Mobile PDF</button>
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
