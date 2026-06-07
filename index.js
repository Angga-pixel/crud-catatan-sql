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

// ROUTE UTAMA: FRONTEND UI (Gaya Editorial Premium - Anti AI)
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sistem Dokumentasi Digital</title>
        
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
        
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            body { font-family: 'Plus Jakarta Sans', sans-serif; }
            .font-heading { font-family: 'Cormorant Garamond', serif; }
            
            /* Custom Scrollbar minimalis ala portfolio seni */
            ::-webkit-scrollbar { width: 6px; }
            ::-webkit-scrollbar-track { background: #F7F4EF; }
            ::-webkit-scrollbar-thumb { background: #3D4A41; }
        </style>
    </head>
    <body class="bg-[#F7F4EF] text-[#232321] min-h-screen antialiased selection:bg-[#3D4A41] selection:text-white">
        
        <header class="max-w-7xl mx-auto px-6 pt-16 pb-12 border-b border-stone-300">
            <div class="flex flex-col md:flex-row justify-between items-baseline gap-4">
                <div>
                    <h1 class="font-heading text-5xl font-medium tracking-tight text-stone-900">Sistem Dokumentasi & Catatan</h1>
                    <p class="text-xs uppercase tracking-[0.2em] text-stone-500 mt-2">Penyimpanan Terstruktur — Express.js & PostgreSQL</p>
                </div>
                <div class="text-xs font-semibold uppercase tracking-widest text-[#3D4A41] border border-[#3D4A41] px-3 py-1">
                    Arsip Resmi v1.0
                </div>
            </div>
        </header>

        <main class="max-w-7xl mx-auto px-6 py-12">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-16">
                
                <div class="lg:col-span-5">
                    <div class="sticky top-12">
                        <h2 id="formTitle" class="font-heading text-3xl text-stone-900 font-medium mb-8 border-b border-stone-300 pb-3">Entri Manuskrip Baru</h2>
                        
                        <form id="noteForm" class="space-y-8">
                            <div>
                                <label class="block text-xs uppercase tracking-widest text-stone-500 font-bold mb-2">Judul Dokumen</label>
                                <input type="text" id="title" required 
                                    class="w-full px-0 py-2 bg-transparent border-b border-stone-400 focus:border-[#232321] text-stone-900 placeholder-stone-400 focus:outline-none transition-colors rounded-none font-heading text-xl" 
                                    placeholder="Tulis judul berkas di sini...">
                            </div>
                            
                            <div>
                                <label class="block text-xs uppercase tracking-widest text-stone-500 font-bold mb-2">Rincian Narasi / Catatan</label>
                                <textarea id="content" rows="6" required 
                                    class="w-full px-0 py-2 bg-transparent border-b border-stone-400 focus:border-[#232321] text-stone-900 placeholder-stone-400 focus:outline-none transition-colors rounded-none leading-relaxed resize-none" 
                                    placeholder="Uraikan rincian dokumen secara lengkap..."></textarea>
                            </div>
                            
                            <div class="pt-4">
                                <button type="submit" id="submitBtn" 
                                    class="w-full bg-[#232321] hover:bg-[#3D4A41] text-white text-xs font-bold uppercase tracking-widest py-4 transition-colors duration-300 rounded-none cursor-pointer">
                                    Simpan Dokumen ke Data Center
                                </button>
                                <button type="button" id="cancelBtn" onclick="cancelEdit()" 
                                    class="hidden w-full bg-stone-400 hover:bg-stone-500 text-white text-xs font-bold uppercase tracking-widest py-3 mt-3 transition-colors rounded-none cursor-pointer">
                                    Batalkan Perubahan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div class="lg:col-span-7">
                    <div class="flex justify-between items-baseline mb-8 border-b border-stone-300 pb-3">
                        <h2 class="font-heading text-3xl text-stone-900 font-medium">Katalog Indeks</h2>
                        <span id="totalNotes" class="text-xs uppercase tracking-widest text-stone-500 font-semibold">0 Berkas Terdata</span>
                    </div>
                    
                    <div id="notesContainer" class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12">
                        <div id="loading" class="col-span-full text-sm text-stone-500 italic py-8">Mensinkronisasi basis data...</div>
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

            // 1. AMBIL DATA (READ)
            async function fetchNotes() {
                try {
                    const response = await fetch('/api/notes');
                    const result = await response.json();
                    
                    if (!response.ok) throw new Error(result.error || 'Gagal sinkronisasi data');
                    
                    allNotes = result.data; 
                    notesContainer.innerHTML = '';
                    totalNotesBadge.innerText = \`\${allNotes.length} Berkas Terdata\`;
                    
                    if (allNotes.length === 0) {
                        notesContainer.innerHTML = '<div class="col-span-full text-sm text-stone-400 py-12 border-t border-stone-300 font-heading italic">Lemari arsip kosong. Belum ada dokumen yang dimasukkan.</div>';
                        return;
                    }

                    allNotes.forEach((note, index) => {
                        const dateObj = new Date(note.created_at);
                        const dateStr = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                        
                        // Membuat penomoran otomatis dua digit (01, 02, dst.) agar terkesan mewah buatan manusia
                        const indexStr = String(index + 1).padStart(2, '0');
                        
                        const noteCard = document.createElement('div');
                        // Desain tanpa kotak tebal, hanya memanfaatkan garis batas minimalis (border-t)
                        noteCard.className = 'border-t border-stone-400 pt-4 flex flex-col justify-between min-h-[220px] transition-all hover:border-stone-900 group';
                        noteCard.innerHTML = \`
                            <div>
                                <div class="flex justify-between items-baseline mb-3">
                                    <span class="text-xs font-mono font-bold text-stone-400 group-hover:text-[#3D4A41] transition-colors">\${indexStr}</span>
                                    <span class="text-[10px] uppercase tracking-widest text-stone-400 font-bold">\${dateStr}</span>
                                </div>
                                <h3 class="font-heading text-xl font-bold text-stone-900 leading-tight group-hover:text-[#3D4A41] transition-colors mb-2">\${note.title}</h3>
                                <p class="text-stone-600 text-xs whitespace-pre-line leading-relaxed mb-6 font-sans">\${note.content}</p>
                            </div>
                            <div class="flex justify-start space-x-6 text-[11px] uppercase tracking-widest font-bold pt-2 border-t border-stone-200">
                                <button onclick="startEdit(\${note.id})" class="text-stone-500 hover:text-stone-900 cursor-pointer transition-colors">Perbarui</button>
                                <button onclick="deleteNote(\${note.id})" class="text-stone-400 hover:text-red-700 cursor-pointer transition-colors">Eliminasi</button>
                            </div>
                        \`;
                        notesContainer.appendChild(noteCard);
                    });
                } catch (error) {
                    notesContainer.innerHTML = \`<div class="col-span-full text-xs text-red-700 py-8 font-bold tracking-wider uppercase">Sistem Galat: \${error.message}</div>\`;
                }
            }

            // 2. PINDAH KE MODE EDIT
            function startEdit(id) {
                const targetNote = allNotes.find(n => n.id === id);
                if (!targetNote) return;

                editModeId = id;
                document.getElementById('title').value = targetNote.title;
                document.getElementById('content').value = targetNote.content;
                
                formTitle.innerText = "Modifikasi Manuskrip";
                submitBtn.innerText = "Terapkan Perubahan";
                submitBtn.className = "w-full bg-[#3D4A41] hover:bg-[#232321] text-white text-xs font-bold uppercase tracking-widest py-4 transition-colors duration-300 rounded-none cursor-pointer";
                cancelBtn.classList.remove('hidden');
                
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }

            function cancelEdit() {
                editModeId = null;
                noteForm.reset();
                formTitle.innerText = "Entri Manuskrip Baru";
                submitBtn.innerText = "Simpan Dokumen ke Data Center";
                submitBtn.className = "w-full bg-[#232321] hover:bg-[#3D4A41] text-white text-xs font-bold uppercase tracking-widest py-4 transition-colors duration-300 rounded-none cursor-pointer";
                cancelBtn.classList.add('hidden');
            }

            // 3. PROSES SIMPAN / EDIT DATA
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
                        alert('Kegagalan Sistem: ' + (result.error || result.message));
                    }
                } catch (error) {
                    alert('Kesalahan Jaringan: ' + error.message);
                }
            });

            // 4. PROSES ELIMINASI DATA
            async function deleteNote(id) {
                if (confirm('Konfirmasi Yuridis: Apakah Anda sepenuhnya yakin ingin mengeliminasi dokumen ini dari database secara permanen?')) {
                    try {
                        const response = await fetch(\`/api/notes/\${id}\`, { method: 'DELETE' });
                        if (response.ok) {
                            if (editModeId === id) cancelEdit(); 
                            fetchNotes();
                        } else {
                            const result = await response.json();
                            alert('Gagal mengeliminasi dokumen: ' + (result.error || result.message));
                        }
                    } catch (error) {
                        alert('Kesalahan Otorisasi: ' + error.message);
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