const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// --- KONFIGURASI PIN KEAMANAN ---
const MASTER_PIN = process.env.APP_PIN || '1234';

// --- KONEKSI DATABASE AIVEN ---
let dbUrl = process.env.DATABASE_URL || '';
dbUrl = dbUrl.replace('?sslmode=require', '');

const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

const ensureTableExists = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS notes (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
};

// --- MIDDLEWARE KEAMANAN API ---
const verifyPinMiddleware = (req, res, next) => {
    const clientPin = req.headers['x-pin'];
    if (!clientPin || clientPin !== MASTER_PIN) {
        return res.status(401).json({ message: 'Otorisasi Gagal: PIN tidak valid atau belum dimasukkan.' });
    }
    next();
};

// ROUTE UTAMA: FRONTEND UI
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sistem Manajemen Arsip Digital</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            body { font-family: 'Plus Jakarta Sans', sans-serif; }
            ::-webkit-scrollbar { width: 6px; }
            ::-webkit-scrollbar-track { background: #FAF7F2; }
            ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
            ::-webkit-scrollbar-thumb:hover { background: #7C3AED; }
        </style>
    </head>
    <body class="bg-[#FAF7F2] text-slate-800 min-h-screen antialiased">
        
        <div id="pinGateway" class="fixed inset-0 bg-[#FAF7F2] z-50 flex items-center justify-center p-4">
            <div class="bg-white p-8 rounded-xl border border-purple-100 shadow-xl max-w-sm w-full text-center">
                <div class="w-12 h-12 bg-purple-50 text-purple-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-100">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                </div>
                <h2 class="text-xl font-extrabold text-slate-900 tracking-tight">Otorisasi Akses</h2>
                <p class="text-xs text-slate-400 mt-1 mb-6">Sistem ini dilindungi. Masukkan PIN keamanan Anda untuk membuka repositori data.</p>
                
                <form id="pinForm" class="space-y-4">
                    <input type="password" id="inputPin" required maxlength="8" autocomplete="off"
                        class="w-full text-center tracking-[0.5em] font-mono text-xl px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-700 focus:bg-white transition-all" 
                        placeholder="••••">
                    <button type="submit" 
                        class="w-full bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold uppercase tracking-wider py-3.5 rounded-lg transition-colors cursor-pointer shadow-md">
                        Buka Sistem
                    </button>
                </form>
                <div id="pinError" class="text-xs text-red-600 font-bold mt-3 hidden">Kode PIN Salah. Akses Ditolak.</div>
            </div>
        </div>

        <div id="mainWorkspace" class="hidden">
            <nav class="bg-white border-b border-purple-100 px-8 py-4 sticky top-0 z-20 shadow-sm">
                <div class="max-w-7xl mx-auto flex justify-between items-center">
                    <div class="flex items-center space-x-3">
                        <div class="w-3 h-3 bg-purple-800 rounded-full shadow-sm shadow-purple-500"></div>
                        <span class="text-base font-extrabold text-slate-900 tracking-wider uppercase">Sistem Manajemen Arsip Digital</span>
                    </div>
                    <div class="flex items-center space-x-4">
                        <div class="flex items-center space-x-2 bg-purple-50 px-3 py-1.5 border border-purple-200 rounded-full">
                            <span class="relative flex h-2 w-2">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-2 w-2 bg-purple-700"></span>
                            </span>
                            <span class="text-xs font-bold text-purple-900 uppercase tracking-wider">Terproteksi</span>
                        </div>
                        <button onclick="logoutSystem()" class="text-xs font-bold text-red-600 border border-red-200 px-3 py-1.5 rounded-md transition-all cursor-pointer uppercase tracking-wider hover:bg-red-600 hover:text-white active:bg-red-800">
                            Keluar
                        </button>
                    </div>
                </div>
            </nav>

            <main class="max-w-7xl mx-auto px-6 py-10">
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    <div class="lg:col-span-4 sticky top-24">
                        <div class="bg-white p-6 rounded-xl border border-purple-100 shadow-sm">
                            <div class="mb-6 border-b border-slate-100 pb-3">
                                <h2 id="formTitle" class="text-lg font-extrabold text-slate-900 tracking-tight">Registrasi Dokumen</h2>
                                <p class="text-xs text-slate-400 mt-1">Isi formulir kontrol di bawah untuk melakukan pengarsipan.</p>
                            </div>
                            
                            <form id="noteForm" class="space-y-4">
                                <div>
                                    <label class="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Judul Dokumen</label>
                                    <input type="text" id="title" required 
                                        class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-700 focus:bg-white transition-all duration-200 text-sm font-medium" 
                                        placeholder="Masukkan nama berkas...">
                                </div>
                                
                                <div>
                                    <label class="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Deskripsi / Uraian Isi</label>
                                    <textarea id="content" rows="6" required 
                                        class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-700 focus:bg-white transition-all duration-200 resize-none text-sm leading-relaxed" 
                                        placeholder="Uraikan detail dokumen atau catatan di sini..."></textarea>
                                </div>
                                
                                <div class="pt-2 flex gap-3">
                                    <button type="submit" id="submitBtn" 
                                        class="flex-1 bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold uppercase tracking-wider py-3.5 px-4 rounded-lg transition-colors duration-200 shadow-md shadow-purple-100 cursor-pointer text-center">
                                        Simpan Berkas
                                    </button>
                                    <button type="button" id="cancelBtn" onclick="cancelEdit()" 
                                        class="hidden bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider py-3.5 px-4 rounded-lg transition-colors cursor-pointer border border-slate-200">
                                        Batal
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div class="lg:col-span-8 space-y-6">
                        
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="bg-white p-4 rounded-xl border border-purple-100 shadow-sm flex flex-col justify-between">
                                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Volume Arsip</span>
                                <span id="totalNotesBadge" class="text-2xl font-extrabold text-purple-900 mt-2">0 Dokumen</span>
                            </div>
                            <div class="bg-white p-4 rounded-xl border border-purple-100 shadow-sm flex flex-col justify-between">
                                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Klasifikasi Database</span>
                                <span class="text-sm font-bold text-slate-800 mt-2">PostgreSQL Relational</span>
                            </div>
                            <div class="bg-white p-4 rounded-xl border border-purple-100 shadow-sm flex flex-col justify-between">
                                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Infrastruktur Cloud</span>
                                <span class="text-sm font-bold text-slate-800 mt-2">Aiven Cloud Node</span>
                            </div>
                        </div>

                        <div class="bg-white rounded-xl border border-purple-100 shadow-sm overflow-hidden">
                            <div class="px-6 py-4 border-b border-purple-50 bg-slate-50 flex justify-between items-center">
                                <h2 class="text-xs font-bold text-slate-500 uppercase tracking-widest">Lembar Kontrol Katalog Dokumen</h2>
                            </div>
                            
                            <div class="overflow-x-auto">
                                <table class="w-full table-auto text-left border-collapse">
                                    <thead>
                                        <tr class="border-b border-purple-100 bg-purple-50/50 text-[11px] font-bold uppercase tracking-wider text-purple-900">
                                            <th class="px-5 py-3.5 w-[12%]">Kode</th>
                                            <th class="px-5 py-3.5 w-[53%]">Dokumen & Rincian Konten</th>
                                            <th class="px-5 py-3.5 w-[20%]">Waktu Registrasi</th>
                                            <th class="px-5 py-3.5 w-[15%] text-center">Otoritas</th>
                                        </tr>
                                    </thead>
                                    <tbody id="tableBody">
                                        <tr id="loadingRow">
                                            <td colspan="4" class="px-5 py-12 text-center text-sm font-medium text-slate-400 italic">
                                                Menyelaraskan struktur katalog dengan basis data...
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                    </div>

                </div>
            </main>
        </div>

        <script>
            const pinGateway = document.getElementById('pinGateway');
            const mainWorkspace = document.getElementById('mainWorkspace');
            const pinForm = document.getElementById('pinForm');
            const inputPin = document.getElementById('inputPin');
            const pinError = document.getElementById('pinError');

            const noteForm = document.getElementById('noteForm');
            const tableBody = document.getElementById('tableBody');
            const formTitle = document.getElementById('formTitle');
            const submitBtn = document.getElementById('submitBtn');
            const cancelBtn = document.getElementById('cancelBtn');
            const totalNotesBadge = document.getElementById('totalNotesBadge');

            let allNotes = []; 
            let editModeId = null; 

            // --- MANAJEMEN AUTENTIKASI ---
            function getSavedPin() {
                return localStorage.getItem('secure_archive_pin') || '';
            }

            async function checkSession() {
                const currentPin = getSavedPin();
                if (!currentPin) {
                    showLoginScreen();
                    return;
                }

                try {
                    const response = await fetch('/api/auth/verify', {
                        method: 'POST',
                        headers: { 'X-PIN': currentPin }
                    });
                    
                    if (response.ok) {
                        showWorkspace();
                        fetchNotes();
                    } else {
                        localStorage.removeItem('secure_archive_pin');
                        showLoginScreen();
                    }
                } catch (e) {
                    showLoginScreen();
                }
            }

            function showLoginScreen() {
                pinGateway.classList.remove('hidden');
                mainWorkspace.classList.add('hidden');
            }

            function showWorkspace() {
                pinGateway.classList.add('hidden');
                mainWorkspace.classList.remove('hidden');
            }

            pinForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const targetPin = inputPin.value;

                try {
                    const response = await fetch('/api/auth/verify', {
                        method: 'POST',
                        headers: { 'X-PIN': targetPin }
                    });

                    if (response.ok) {
                        pinError.classList.add('hidden');
                        localStorage.setItem('secure_archive_pin', targetPin);
                        inputPin.value = '';
                        showWorkspace();
                        fetchNotes();
                    } else {
                        pinError.classList.remove('hidden');
                        inputPin.value = '';
                        inputPin.focus();
                    }
                } catch (error) {
                    alert('Kesalahan jaringan saat autentikasi.');
                }
            });

            function logoutSystem() {
                if(confirm('Apakah Anda ingin mengunci kembali sistem manajemen arsip?')) {
                    localStorage.removeItem('secure_archive_pin');
                    showLoginScreen();
                }
            }


            // --- OPERASI CRUD ARSIP ---
            async function fetchNotes() {
                try {
                    const response = await fetch('/api/notes', {
                        headers: { 'X-PIN': getSavedPin() }
                    });
                    const result = await response.json();
                    
                    if (!response.ok) throw new Error(result.error || result.message);
                    
                    allNotes = result.data; 
                    tableBody.innerHTML = '';
                    totalNotesBadge.innerText = allNotes.length + ' Dokumen';
                    
                    if (allNotes.length === 0) {
                        tableBody.innerHTML = \`
                            <tr>
                                <td colspan="4" class="px-5 py-16 text-center text-slate-400 text-sm font-medium bg-slate-50/30">
                                    <div class="font-bold text-slate-500">Katalog Indeks Kosong</div>
                                    <div class="text-xs text-slate-400 mt-0.5">Silakan entri berkas baru melalui panel registrasi di sebelah kiri.</div>
                                </td>
                            </tr>
                        \`;
                        return;
                    }

                    allNotes.forEach((note, index) => {
                        const dateObj = new Date(note.created_at);
                        const dateStr = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                        const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' });
                        const indexStr = '#' + String(index + 1).padStart(2, '0');
                        
                        const row = document.createElement('tr');
                        row.className = 'border-b border-slate-100 bg-white hover:bg-purple-50/20 transition-colors text-xs text-slate-700';
                        
                        row.innerHTML = \`
                            <td class="px-5 py-4 font-mono font-bold text-purple-900">\${indexStr}</td>
                            <td class="px-5 py-4">
                                <div class="font-extrabold text-slate-900 text-sm mb-1">\${note.title}</div>
                                <div class="text-slate-500 whitespace-pre-line leading-relaxed pr-4">\${note.content}</div>
                            </td>
                            <td class="px-5 py-4 text-slate-500 font-medium whitespace-nowrap">
                                <div class="font-semibold text-slate-800">\${dateStr}</div>
                                <div class="text-[10px] text-slate-400 mt-0.5">\${timeStr} WIB</div>
                            </td>
                            <td class="px-5 py-4 text-center whitespace-nowrap font-bold">
                                <div class="flex justify-center space-x-4 text-[11px] uppercase tracking-wider">
                                    <button onclick="startEdit(\${note.id})" class="text-purple-700 hover:text-purple-900 cursor-pointer transition-colors">Ubah</button>
                                    <button onclick="deleteNote(\${note.id})" class="text-slate-400 hover:text-red-600 cursor-pointer transition-colors">Hapus</button>
                                </div>
                            </td>
                        \`;
                        tableBody.appendChild(row);
                    });
                } catch (error) {
                    tableBody.innerHTML = \`
                        <tr>
                            <td colspan="4" class="px-5 py-10 text-center text-red-500 font-bold text-xs uppercase tracking-wider">
                                Akses Ditolak: \${error.message}
                            </td>
                        </tr>
                    \`;
                }
            }

            function startEdit(id) {
                const targetNote = allNotes.find(n => n.id === id);
                if (!targetNote) return;

                editModeId = id;
                document.getElementById('title').value = targetNote.title;
                document.getElementById('content').value = targetNote.content;
                
                formTitle.innerText = "Modifikasi Arsip";
                submitBtn.innerText = "Perbarui Berkas";
                submitBtn.className = "flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold uppercase tracking-wider py-3.5 px-4 rounded-lg transition-colors duration-200 shadow-md shadow-amber-100 cursor-pointer text-center";
                cancelBtn.classList.remove('hidden');
                
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }

            function cancelEdit() {
                editModeId = null;
                noteForm.reset();
                formTitle.innerText = "Registrasi Dokumen";
                submitBtn.innerText = "Simpan Berkas";
                submitBtn.className = "flex-1 bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold uppercase tracking-wider py-3.5 px-4 rounded-lg transition-colors duration-200 shadow-md shadow-purple-100 cursor-pointer text-center";
                cancelBtn.classList.add('hidden');
            }

            noteForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const title = document.getElementById('title').value;
                const content = document.getElementById('content').value;

                const url = editModeId ? '/api/notes/' + editModeId : '/api/notes';
                const method = editModeId ? 'PUT' : 'POST';

                try {
                    const response = await fetch(url, {
                        method: method,
                        headers: { 
                            'Content-Type': 'application/json',
                            'X-PIN': getSavedPin()
                        },
                        body: JSON.stringify({ title, content })
                    });
                    
                    const result = await response.json();

                    if (response.ok) {
                        cancelEdit(); 
                        fetchNotes(); 
                    } else {
                        alert('Gagal memproses berkas: ' + (result.error || result.message));
                    }
                } catch (error) {
                    alert('Kesalahan Koneksi Jaringan: ' + error.message);
                }
            });

            async function deleteNote(id) {
                if (confirm('Konfirmasi Kontrol: Apakah Anda yakin ingin menghapus berkas catatan ini secara permanen dari sistem?')) {
                    try {
                        const response = await fetch('/api/notes/' + id, { 
                            method: 'DELETE',
                            headers: { 'X-PIN': getSavedPin() }
                        });
                        if (response.ok) {
                            if (editModeId === id) cancelEdit(); 
                            fetchNotes();
                        } else {
                            const result = await response.json();
                            alert('Gagal mengeksekusi penghapusan: ' + (result.error || result.message));
                        }
                    } catch (error) {
                        alert('Kesalahan Akses Basis Data: ' + error.message);
                    }
                }
            }

            // Jalankan pengecekan sesi
            checkSession();
        </script>
    </body>
    </html>
    `);
});

// --- REST API ENDPOINTS ---
app.post('/api/auth/verify', verifyPinMiddleware, (req, res) => {
    res.status(200).json({ status: 'Authorized' });
});

app.get('/api/notes', verifyPinMiddleware, async (req, res) => {
    try {
        await ensureTableExists(); 
        const result = await pool.query('SELECT * FROM notes ORDER BY created_at DESC');
        res.status(200).json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ message: 'Error server', error: error.message });
    }
});

app.post('/api/notes', verifyPinMiddleware, async (req, res) => {
    try {
        await ensureTableExists(); 
        const { title, content } = req.body;
        if (!title || !content) {
            return res.status(400).json({ message: 'Judul dan isi wajib diisi!' });
        }
        const queryText = 'INSERT INTO notes(title, content) VALUES($1, $2) RETURNING *';
        const result = await pool.query(queryText, [title, content]);
        res.status(201).json({ message: 'Catatan ditambahkan', data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error database/server', error: error.message });
    }
});

app.put('/api/notes/:id', verifyPinMiddleware, async (req, res) => {
    try {
        await ensureTableExists();
        const { id } = req.params;
        const { title, content } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ message: 'Judul dan isi wajib diisi!' });
        }

        const queryText = 'UPDATE notes SET title = $1, content = $2 WHERE id = $3 RETURNING *';
        const result = await pool.query(queryText, [title, content, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Catatan tidak ditemukan' });
        }
        res.status(200).json({ message: 'Catatan berhasil diperbarui', data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error server', error: error.message });
    }
});

app.delete('/api/notes/:id', verifyPinMiddleware, async (req, res) => {
    try {
        await ensureTableExists();
        const { id } = req.params;
        const queryText = 'DELETE FROM notes WHERE id = $1 RETURNING *';
        const result = await pool.query(queryText, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Catatan tidak ditemukan' });
        }
        res.status(200).json({ message: 'Catatan berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ message: 'Error server', error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});

module.exports = app;