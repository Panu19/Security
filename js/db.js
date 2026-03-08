const DB_NAME = 'SecureVaultDB';
const DB_VERSION = 2; // Bumped to 2 for folders support

class VaultDatabase {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => reject('Database error: ' + event.target.error);

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Users store
                if (!db.objectStoreNames.contains('users')) {
                    db.createObjectStore('users', { keyPath: 'username' });
                }
                
                // Files store
                if (!db.objectStoreNames.contains('files')) {
                    const fileStore = db.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
                    fileStore.createIndex('username', 'username', { unique: false });
                    fileStore.createIndex('type', 'type', { unique: false }); // 'public' or 'vault'
                    fileStore.createIndex('folderId', 'folderId', { unique: false }); 
                } else {
                    // Upgrade existing files store to have folderId index
                    const fileStore = event.target.transaction.objectStore('files');
                    if (!fileStore.indexNames.contains('folderId')) {
                        fileStore.createIndex('folderId', 'folderId', { unique: false }); 
                    }
                }

                // Folders store
                if (!db.objectStoreNames.contains('folders')) {
                    const folderStore = db.createObjectStore('folders', { keyPath: 'id', autoIncrement: true });
                    folderStore.createIndex('username', 'username', { unique: false });
                    folderStore.createIndex('type', 'type', { unique: false }); // 'public' or 'vault'
                }
            };
        });
    }

    async addUser(username, password, securityAnswer = '') {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            
            const request = store.add({ username, password, securityAnswer, vaultPassword: null });
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject('Username already exists');
        });
    }

    async getUser(username) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            
            const request = store.get(username);
            
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async updateVaultPassword(username, vaultPassword) {
        const user = await this.getUser(username);
        if (!user) throw new Error('User not found');
        
        user.vaultPassword = vaultPassword;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            
            const request = store.put(user);
            
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async updatePassword(username, newPassword) {
        const user = await this.getUser(username);
        if (!user) throw new Error('User not found');
        
        user.password = newPassword;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            
            const request = store.put(user);
            
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async addFile(username, fileData, name, mimeType, type, folderId = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['files'], 'readwrite');
            const store = transaction.objectStore('files');
            
            const request = store.add({
                username,
                fileData,
                name,
                mimeType,
                type,
                folderId,
                timestamp: Date.now()
            });
            
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async getFiles(username, type, folderId = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');
            const index = store.index('username');
            
            const request = index.getAll(username);
            
            request.onsuccess = (e) => {
                const allFiles = e.target.result || [];
                // Filter by type (public/vault) and matching folderId
                // For root level files, folderId is null
                const filtered = allFiles.filter(item => item.type === type && item.folderId === folderId);
                resolve(filtered);
            };
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async deleteFile(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['files'], 'readwrite');
            const store = transaction.objectStore('files');
            
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    }

    // Folder Logic
    async addFolder(username, name, type) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['folders'], 'readwrite');
            const store = transaction.objectStore('folders');
            
            const request = store.add({
                username,
                name,
                type,
                timestamp: Date.now()
            });
            
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async getFolders(username, type) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['folders'], 'readonly');
            const store = transaction.objectStore('folders');
            const index = store.index('username');
            
            const request = index.getAll(username);
            
            request.onsuccess = (e) => {
                const allFolders = e.target.result || [];
                resolve(allFolders.filter(item => item.type === type));
            };
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async deleteFolder(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['folders'], 'readwrite');
            const store = transaction.objectStore('folders');
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    }

    // Admin user logic
    async getAllUsers() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            
            const request = store.getAll();
            
            request.onsuccess = (e) => resolve(e.target.result || []);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async deleteUser(username) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            
            const request = store.delete(username);
            
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    }
}

window.dbLayer = new VaultDatabase();
