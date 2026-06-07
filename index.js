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

// ROUTE UTAMA: FRONTEND UI (Desain Formal, Cream & Ungu)
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sistem Catatan Digital</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-[#F5F2EB] font-serif min-h-screen py-10 px-4 text-gray-800">
        <div class="max-w-4xl mx-auto">
            <header class="text-center mb-10 border-b-2 border-purple-200 pb-6">
                <h1 class="text-4xl font-bold text-purple-900 tracking-tight uppercase">Sistem Catatan Digital</h1>
                <p class="text-purple-700 mt-2 italic">Dibuat dengan Express.js dan Aiven PostgreSQL</p>
            </header>

            <div class="bg-white p-8 rounded-md shadow-sm border border-purple-200 mb-10">
                <h2 id="formTitle" class="text-xl font-bold text-purple-900 mb-4 border-l-4 border-purple-700 pl-3">Buat Catatan Baru</h2>
                <form id="noteForm" class="space-y-5">
                    <div>
                        <label class="block text-sm font-semibold text-purple-900 mb-1">Judul Catatan</label>
                        <input type="text" id="title" required class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all" placeholder="Masukkan judul...">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-purple-900 mb-1">Isi Catatan</label>
                        <textarea id="content" rows="5" required class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all" placeholder="Tulis isi catatan di sini..."></textarea>
                    </div>
                    <div class="flex space-x-3 pt-2">
                        <button type="submit" id="submitBtn" class="flex-1 bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 px-4 rounded-md transition duration-200 cursor-pointer shadow-sm">
                            Simpan Catatan
                        </button>
                        <button type="button" id="cancelBtn" onclick="cancelEdit()" class="hidden bg-gray-500 hover:bg-gray-600 text-white font-bold py-2.5 px-4 rounded-md transition duration-200 cursor-pointer shadow-sm">
                            Batal
                        </button>
                    </div>
                </form>
            </div>

            <div>
                <h2 class="text-2xl font-bold text-purple-900 mb-6 border-b border-purple-200 pb-2">Daftar Catatan</h2>
                <div id="notesContainer" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div id="loading" class="col-span-full text-center text-purple-700 py-10 italic">Memuat data...</div>
                </div>
            </div>
        </div>

        <script>
            const noteForm = document.getElementById('noteForm');
            const notesContainer = document.getElementById('notesContainer');
            const formTitle = document.getElementById('formTitle');
            const submitBtn = document.getElementById('submitBtn');
            const cancelBtn = document.getElementById('cancelBtn');

            let allNotes = []; 
            let editModeId = null; 

            async function fetchNotes() {
                try {
                    const response = await fetch('/api/notes');
                    const result = await response.json();
                    
                    if (!response.ok) throw new Error(result.error || 'Gagal mengambil data');
                    
                    allNotes = result.data; 
                    notesContainer.innerHTML = '';
                    
                    if (allNotes.length === 0) {
                        notesContainer.innerHTML = '<div class="col-span-full text-center text-gray-500 py-10 border border-dashed border-purple-300 rounded-md">Belum ada data catatan yang tersimpan.</div>';
                        return;
                    }

                    allNotes.forEach(note => {
                        const date = new Date(note.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit'
                        });
                        
                        const noteCard = document.createElement('div');
                        // Aksen formal dengan garis di kiri (border-l-4)
                        noteCard.className = 'bg-white p-6 rounded-md shadow-sm border border-gray-200 border-l-4 border-l-purple-700 flex flex-col justify-between break-words';
                        noteCard.innerHTML = \`
                            <div>
                                <h3 class="text-lg font-bold text-purple-900 mb-3">\${note.title}</h3>
                                <p class="text-gray-700 text-sm whitespace-pre-line mb-5 leading-relaxed">\${note.content}</p>
                            </div>
                            <div class="flex justify-between items-center border-t border-gray-100 pt-4 text-xs font-semibold">
                                <span class="text-gray-500">\${date}</span>
                                <div class="space-x-4">
                                    <button onclick="startEdit(\${note.id})" class="text-purple-700 hover:text-purple-900 uppercase tracking-wider cursor-pointer">Edit</button>
                                    <button onclick="deleteNote(\${note.id})" class="text-red-600 hover:text-red-800 uppercase tracking-wider cursor-pointer">Hapus</button>
                                </div>
                            </div>
                        \`;
                        notesContainer.appendChild(noteCard);
                    });
                } catch (error) {
                    notesContainer.innerHTML = \`<div class="col-span-full text-center text-red-600 py-10 font-semibold">\${error.message}</div>\`;
                }
            }

            function startEdit(id) {
                const targetNote = allNotes.find(n => n.id === id);
                if (!targetNote) return;

                editModeId = id;
                document.getElementById('title').value = targetNote.title;
                document.getElementById('content').value = targetNote.content;
                
                // Ubah Tampilan Form tanpa emoji
                formTitle.innerText = "Edit Catatan";
                submitBtn.innerText = "Perbarui Catatan";
                submitBtn.className = "flex-1 bg-purple-900 hover:bg-purple-950 text-white font-bold py-2.5 px-4 rounded-md transition duration-200 cursor-pointer shadow-sm";
                cancelBtn.classList.remove('hidden');
                
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }

            function cancelEdit() {
                editModeId = null;
                noteForm.reset();
                formTitle.innerText = "Buat Catatan Baru";
                submitBtn.innerText = "Simpan Catatan";
                submitBtn.className = "flex-1 bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 px-4 rounded-md transition duration-200 cursor-pointer shadow-sm";
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
                        alert('Gagal: ' + (result.error || result.message));
                    }
                } catch (error) {
                    alert('Kesalahan Sistem: ' + error.message);
                }
            });

            async function deleteNote(id) {
                if (confirm('Konfirmasi: Apakah Anda yakin ingin menghapus catatan ini?')) {
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