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

// ROUTE UTAMA: FRONTEND UI (Layout Kiri-Kanan, Formal)
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sistem Catatan Digital</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            /* Custom Scrollbar agar lebih estetik */
            ::-webkit-scrollbar { width: 8px; }
            ::-webkit-scrollbar-track { background: #F5F2EB; }
            ::-webkit-scrollbar-thumb { background: #D8B4E2; border-radius: 4px; }
            ::-webkit-scrollbar-thumb:hover { background: #9333EA; }
        </style>
    </head>
    <body class="bg-[#F5F2EB] font-serif min-h-screen text-gray-800">
        <!-- Header -->
        <header class="bg-white border-b border-purple-200 shadow-sm py-6 px-8 mb-8 sticky top-0 z-10">
            <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
                <h1 class="text-3xl font-bold text-purple-900 tracking-tight uppercase">Sistem Catatan Digital</h1>
                <p class="text-purple-700 mt-2 md:mt-0 italic font-semibold">Biro Arsip & Dokumentasi</p>
            </div>
        </header>

        <div class="max-w-7xl mx-auto px-6 pb-12">
            <!-- Grid Utama: Kiri (Form) dan Kanan (Daftar) -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                <!-- KOLOM KIRI: FORM -->
                <div class="lg:col-span-4">
                    <!-- Form dibuat sticky agar menempel saat di-scroll -->
                    <div class="bg-white p-7 rounded-sm shadow-md border-t-4 border-purple-800 sticky top-28">
                        <h2 id="formTitle" class="text-xl font-bold text-purple-900 mb-6 uppercase tracking-wide border-b border-gray-100 pb-3">Buat Catatan Baru</h2>
                        <form id="noteForm" class="space-y-5">
                            <div>
                                <label class="block text-sm font-bold text-purple-900 mb-2">Judul Dokumen</label>
                                <input type="text" id="title" required class="w-full px-4 py-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all bg-gray-50" placeholder="Masukkan judul...">
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-purple-900 mb-2">Isi Keterangan</label>
                                <textarea id="content" rows="6" required class="w-full px-4 py-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all bg-gray-50" placeholder="Tulis rincian catatan di sini..."></textarea>
                            </div>
                            <div class="flex space-x-3 pt-4">
                                <button type="submit" id="submitBtn" class="flex-1 bg-purple-800 hover:bg-purple-900 text-white font-bold py-3 px-4 rounded transition duration-200 shadow-sm uppercase tracking-wider text-sm">
                                    Simpan Data
                                </button>
                                <button type="button" id="cancelBtn" onclick="cancelEdit()" class="hidden bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded transition duration-200 shadow-sm uppercase tracking-wider text-sm">
                                    Batal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- KOLOM KANAN: DAFTAR CATATAN -->
                <div class="lg:col-span-8">
                    <div class="bg-white p-8 rounded-sm shadow-md border border-gray-200 min-h-[600px]">
                        <div class="flex justify-between items-center mb-6 border-b border-purple-200 pb-4">
                            <h2 class="text-2xl font-bold text-purple-900 uppercase tracking-wide">Arsip Catatan</h2>
                            <span id="totalNotes" class="bg-purple-100 text-purple-800 py-1 px-3 rounded text-sm font-bold">0 Dokumen</span>
                        </div>
                        
                        <!-- Container Kartu -->
                        <div id="notesContainer" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div id="loading" class="col-span-full text-center text-purple-700 py-12 italic">Mengambil data dari server...</div>
                        </div>
                    </div>
                </div>

            </div>
        </div>

        <script>
            const noteForm = document.getElementById('noteForm');
            const notesContainer = document.getElementById('notesContainer');
            const formTitle = document.getElementById('formTitle');
            const submitBtn = document.getElementById('submitBtn');
            const cancelBtn = document.getElementById('cancelBtn');
            const totalNotesBadge = document.getElementById('totalNotes');

            let allNotes = []; 
            let editModeId = null; 

            async function fetchNotes() {
                try {
                    const response = await fetch('/api/notes');
                    const result = await response.json();
                    
                    if (!response.ok) throw new Error(result.error || 'Gagal mengambil data');
                    
                    allNotes = result.data; 
                    notesContainer.innerHTML = '';
                    totalNotesBadge.innerText = \`\${allNotes.length} Dokumen\`;
                    
                    if (allNotes.length === 0) {
                        notesContainer.innerHTML = '<div class="col-span-full text-center text-gray-500 py-16 bg-gray-50 border border-dashed border-gray-300 rounded">Tidak ada catatan yang diarsipkan.</div>';
                        return;
                    }

                    allNotes.forEach(note => {
                        const dateObj = new Date(note.created_at);
                        const dateStr = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
                        const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' });
                        
                        const noteCard = document.createElement('div');
                        noteCard.className = 'bg-[#FDFBF7] p-6 border border-gray-200 border-l-4 border-l-purple-800 flex flex-col justify-between break-words hover:shadow-md transition-shadow';
                        noteCard.innerHTML = \`
                            <div>
                                <h3 class="text-lg font-bold text-purple-900 mb-3 leading-tight">\${note.title}</h3>
                                <p class="text-gray-700 text-sm whitespace-pre-line mb-6 leading-relaxed">\${note.content}</p>
                            </div>
                            <div class="border-t border-gray-200 pt-4 flex justify-between items-end">
                                <div class="text-xs font-semibold text-gray-500">
                                    <div class="mb-1">Terdata pada:</div>
                                    <div class="text-purple-800">\${dateStr} &bull; \${timeStr}</div>
                                </div>
                                <div class="flex flex-col space-y-2">
                                    <button onclick="startEdit(\${note.id})" class="text-left text-xs font-bold text-purple-700 hover:text-purple-900 uppercase tracking-wider cursor-pointer">Perbarui</button>
                                    <button onclick="deleteNote(\${note.id})" class="text-left text-xs font-bold text-red-600 hover:text-red-800 uppercase tracking-wider cursor-pointer">Hapus</button>
                                </div>
                            </div>
                        \`;
                        notesContainer.appendChild(noteCard);
                    });
                } catch (error) {
                    notesContainer.innerHTML = \`<div class="col-span-full text-center text-red-600 py-12 font-bold">\${error.message}</div>\`;
                }
            }

            function startEdit(id) {
                const targetNote = allNotes.find(n => n.id === id);
                if (!targetNote) return;

                editModeId = id;
                document.getElementById('title').value = targetNote.title;
                document.getElementById('content').value = targetNote.content;
                
                formTitle.innerText = "Perbarui Dokumen";
                submitBtn.innerText = "Simpan Perubahan";
                submitBtn.className = "flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded transition duration-200 shadow-sm uppercase tracking-wider text-sm";
                cancelBtn.classList.remove('hidden');
                
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }

            function cancelEdit() {
                editModeId = null;
                noteForm.reset();
                formTitle.innerText = "Buat Catatan Baru";
                submitBtn.innerText = "Simpan Data";
                submitBtn.className = "flex-1 bg-purple-800 hover:bg-purple-900 text-white font-bold py-3 px-4 rounded transition duration-200 shadow-sm uppercase tracking-wider text-sm";
                cancelBtn.classList.add('hidden');
            }

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
                    alert('Kesalahan Server: ' + error.message);
                }
            });

            async function deleteNote(id) {
                if (confirm('Konfirmasi Resmi: Apakah Anda yakin ingin menghapus dokumen ini secara permanen?')) {
                    try {
                        const response = await fetch(\`/api/notes/\${id}\`, { method: 'DELETE' });
                        if (response.ok) {
                            if (editModeId === id) cancelEdit(); 
                            fetchNotes();
                        } else {
                            const result = await response.json();
                            alert('Gagal menghapus dokumen: ' + (result.error || result.message));
                        }
                    } catch (error) {
                        alert('Kesalahan Server: ' + error.message);
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