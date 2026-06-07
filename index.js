const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

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

// ROUTE UTAMA: FRONTEND UI (Premium SaaS Dashboard Style)
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Workspace Catatan Digital</title>
        
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            body { font-family: 'Plus Jakarta Sans', sans-serif; }
            /* Custom scrollbar tipis yang elegan */
            ::-webkit-scrollbar { width: 6px; }
            ::-webkit-scrollbar-track { background: #FDFBF7; }
            ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
            ::-webkit-scrollbar-thumb:hover { background: #7C3AED; }
        </style>
    </head>
    <body class="bg-[#FAF7F2] text-slate-800 min-h-screen antialiased">
        
        <nav class="bg-white border-b border-purple-100 px-8 py-4 sticky top-0 z-20 shadow-sm">
            <div class="max-w-7xl mx-auto flex justify-between items-center">
                <div class="flex items-center space-x-3">
                    <div class="w-3 h-3 bg-purple-700 rounded-full shadow-sm shadow-purple-500"></div>
                    <span class="text-lg font-bold text-slate-900 tracking-tight">Workspace Catatan</span>
                </div>
                <div class="flex items-center space-x-2 bg-emerald-50 px-3 py-1.5 border border-emerald-200 rounded-full">
                    <span class="relative flex h-2 w-2">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span class="text-xs font-semibold text-emerald-700">Database Terhubung</span>
                </div>
            </div>
        </nav>

        <main class="max-w-7xl mx-auto px-6 py-10">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                <div class="lg:col-span-4 sticky top-24">
                    <div class="bg-white p-6 rounded-xl border border-purple-100 shadow-sm">
                        <div class="mb-5">
                            <h2 id="formTitle" class="text-xl font-extrabold text-slate-900 tracking-tight">Buat Catatan Baru</h2>
                            <p class="text-xs text-slate-400 mt-1">Data akan langsung tersimpan di cloud server Aiven.</p>
                        </div>
                        
                        <form id="noteForm" class="space-y-4">
                            <div>
                                <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Judul</label>
                                <input type="text" id="title" required 
                                    class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all duration-200" 
                                    placeholder="Ketik judul catatan...">
                            </div>
                            
                            <div>
                                <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Isi Konten</label>
                                <textarea id="content" rows="6" required 
                                    class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all duration-200 resize-none leading-relaxed" 
                                    placeholder="Tulis detail informasi catatan di sini..."></textarea>
                            </div>
                            
                            <div class="pt-2 flex gap-3">
                                <button type="submit" id="submitBtn" 
                                    class="flex-1 bg-purple-700 hover:bg-purple-800 text-white text-sm font-bold py-3 px-4 rounded-lg transition-colors duration-200 shadow-md shadow-purple-100 cursor-pointer text-center">
                                    Simpan Catatan
                                </button>
                                <button type="button" id="cancelBtn" onclick="cancelEdit()" 
                                    class="hidden bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold py-3 px-4 rounded-lg transition-colors cursor-pointer border border-slate-200">
                                    Batal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div class="lg:col-span-8">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-lg font-extrabold text-slate-900 tracking-tight uppercase border-b-2 border-purple-700 pb-1">Daftar Arsip</h2>
                        <span id="totalNotes" class="bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1 rounded-md">0 Berkas</span>
                    </div>
                    
                    <div id="notesContainer" class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div id="loading" class="col-span-full text-center text-slate-400 py-12 font-medium text-sm">Menyelaraskan data arsip...</div>
                    </div>
                </div>

            </div>
        </main>

        <script>
            const noteForm = document.getElementById('noteForm');
            const notesContainer = document.getElementById('notesContainer');
            const formTitle = document.getElementById('formTitle');
            const submitBtn = document.getElementById('submitBtn');
            const cancelBtn = document.getElementById('cancelBtn');
            const totalNotesBadge = document.getElementById('totalNotes');

            let allNotes = []; 
            let editModeId = null; 

            // 1. GET DATA (READ)
            async function fetchNotes() {
                try {
                    const response = await fetch('/api/notes');
                    const result = await response.json();
                    
                    if (!response.ok) throw new Error(result.error || 'Sinkronisasi gagal');
                    
                    allNotes = result.data; 
                    notesContainer.innerHTML = '';
                    totalNotesBadge.innerText = \`\${allNotes.length} Berkas\`;
                    
                    if (allNotes.length === 0) {
                        notesContainer.innerHTML = \`
                            <div class="col-span-full text-center py-16 bg-white border border-dashed border-slate-200 rounded-xl p-8">
                                <div class="text-slate-300 text-4xl mb-2">📂</div>
                                <div class="text-slate-500 font-semibold text-sm">Belum Ada Arsip Tersimpan</div>
                                <div class="text-slate-400 text-xs mt-1">Silakan tambahkan data melalui form di sebelah kiri.</div>
                            </div>
                        \`;
                        return;
                    }

                    allNotes.forEach(note => {
                        const dateObj = new Date(note.created_at);
                        const dateStr = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                        const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' });
                        
                        const noteCard = document.createElement('div');
                        noteCard.className = 'bg-white p-5 rounded-xl border border-purple-50 flex flex-col justify-between hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group';
                        noteCard.innerHTML = \`
                            <div>
                                <h3 class="text-base font-bold text-slate-900 group-hover:text-purple-700 transition-colors duration-200 mb-2 leading-snug">\${note.title}</h3>
                                <p class="text-slate-600 text-xs whitespace-pre-line leading-relaxed mb-6">\${note.content}</p>
                            </div>
                            <div class="border-t border-slate-50 pt-3.5 flex justify-between items-center text-[11px]">
                                <div class="text-slate-400 font-medium">
                                    <span>\${dateStr}</span>
                                    <span class="mx-1.5 text-slate-300">&bull;</span>
                                    <span>\${timeStr}</span>
                                </div>
                                <div class="flex space-x-3 font-bold">
                                    <button onclick="startEdit(\${note.id})" class="text-purple-600 hover:text-purple-800 cursor-pointer transition-colors">Ubah</button>
                                    <button onclick="deleteNote(\${note.id})" class="text-slate-400 hover:text-red-600 cursor-pointer transition-colors">Hapus</button>
                                </div>
                            </div>
                        \`;
                        notesContainer.appendChild(noteCard);
                    });
                } catch (error) {
                    notesContainer.innerHTML = \`<div class="col-span-full text-center text-red-500 font-semibold text-sm py-12">Sistem Galat: \${error.message}</div>\`;
                }
            }

            // 2. PINDAH KE MODE EDIT
            function startEdit(id) {
                const targetNote = allNotes.find(n => n.id === id);
                if (!targetNote) return;

                editModeId = id;
                document.getElementById('title').value = targetNote.title;
                document.getElementById('content').value = targetNote.content;
                
                formTitle.innerText = "Modifikasi Arsip";
                submitBtn.innerText = "Perbarui Data";
                submitBtn.className = "flex-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold py-3 px-4 rounded-lg transition-colors duration-200 shadow-md shadow-amber-100 cursor-pointer text-center";
                cancelBtn.classList.remove('hidden');
                
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }

            // 3. BATAL EDIT
            function cancelEdit() {
                editModeId = null;
                noteForm.reset();
                formTitle.innerText = "Buat Catatan Baru";
                submitBtn.innerText = "Simpan Catatan";
                submitBtn.className = "flex-1 bg-purple-700 hover:bg-purple-800 text-white text-sm font-bold py-3 px-4 rounded-lg transition-colors duration-200 shadow-md shadow-purple-100 cursor-pointer text-center";
                cancelBtn.classList.add('hidden');
            }

            // 4. SUBMIT FORM
            noteForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const title = document.getElementById('title').value;
                const content = document.getElementById('content').value;

                const url = editModeId ? \`/api/notes/\${editModeId}\` : '/api/notes';
                const method = editModeId ? 'PUT' : 'POST';

                try {
                    const response = await fetch(url, {
                        method: method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title, content })
                    });
                    
                    const result = await response.json();

                    if (response.ok) {
                        cancelEdit(); 
                        fetchNotes(); 
                    } else {
                        alert('Gagal memproses data: ' + (result.error || result.message));
                    }
                } catch (error) {
                    alert('Kesalahan Koneksi: ' + error.message);
                }
            });

            // 5. HAPUS DATA
            async function deleteNote(id) {
                if (confirm('Apakah Anda yakin ingin menghapus arsip catatan ini?')) {
                    try {
                        const response = await fetch(\`/api/notes/\${id}\`, { method: 'DELETE' });
                        if (response.ok) {
                            if (editModeId === id) cancelEdit(); 
                            fetchNotes();
                        } else {
                            const result = await response.json();
                            alert('Gagal menghapus: ' + (result.error || result.message));
                        }
                    } catch (error) {
                        alert('Kesalahan Sistem: ' + error.message);
                    }
                }
            }

            fetchNotes();
        </script>
    </body>
    </html>
    `);
});

// --- BACKEND REST API ENDPOINTS ---

app.get('/api/notes', async (req, res) => {
    try {
        await ensureTableExists(); 
        const result = await pool.query('SELECT * FROM notes ORDER BY created_at DESC');
        res.status(200).json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ message: 'Error server', error: error.message });
    }
});

app.post('/api/notes', async (req, res) => {
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

app.put('/api/notes/:id', async (req, res) => {
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

app.delete('/api/notes/:id', async (req, res) => {
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

module.exports = app;