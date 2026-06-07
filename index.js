const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// KONEKSI KE AIVEN POSTGRESQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// FUNGSI MEMASTIKAN TABEL ADA (Aman untuk Vercel Serverless)
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

// ROUTE UTAMA: FRONTEND UI
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Aplikasi CRUD Catatan</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-100 font-sans min-h-screen py-10 px-4">
        <div class="max-w-4xl mx-auto">
            <header class="text-center mb-10">
                <h1 class="text-4xl font-extrabold text-slate-800 tracking-tight">📝 Aplikasi Catatan Digital</h1>
                <p class="text-slate-500 mt-2">Dibuat dengan Express.js + Aiven PostgreSQL</p>
            </header>

            <div class="bg-white p-6 rounded-2xl shadow-md border border-slate-200 mb-10">
                <h2 class="text-xl font-bold text-slate-700 mb-4">Buat Catatan Baru</h2>
                <form id="noteForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-600 mb-1">Judul Catatan</label>
                        <input type="text" id="title" required class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Masukkan judul...">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-600 mb-1">Isi Catatan</label>
                        <textarea id="content" rows="4" required class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tulis isi catatan di sini..."></textarea>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition duration-200 cursor-pointer">
                        Simpan Catatan
                    </button>
                </form>
            </div>

            <div>
                <h2 class="text-2xl font-bold text-slate-800 mb-4">Daftar Catatan Kamu</h2>
                <div id="notesContainer" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div id="loading" class="col-span-full text-center text-slate-500 py-10">Memuat catatan...</div>
                </div>
            </div>
        </div>

        <script>
            const noteForm = document.getElementById('noteForm');
            const notesContainer = document.getElementById('notesContainer');

            async function fetchNotes() {
                try {
                    const response = await fetch('/api/notes');
                    const result = await response.json();
                    
                    if (!response.ok) throw new Error(result.error || 'Gagal mengambil data');
                    
                    notesContainer.innerHTML = '';
                    if (result.data.length === 0) {
                        notesContainer.innerHTML = '<div class="col-span-full text-center text-slate-400 py-10">Belum ada catatan. Silakan buat catatan baru di atas!</div>';
                        return;
                    }

                    result.data.forEach(note => {
                        const date = new Date(note.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'
                        });
                        
                        const noteCard = document.createElement('div');
                        noteCard.className = 'bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between break-words';
                        noteCard.innerHTML = \`
                            <div>
                                <h3 class="text-lg font-bold text-slate-800 mb-2">\${note.title}</h3>
                                <p class="text-slate-600 text-sm whitespace-pre-line mb-4">\${note.content}</p>
                            </div>
                            <div class="flex justify-between items-center border-t border-slate-100 pt-3 text-xs text-slate-400">
                                <span>\${date}</span>
                                <button onclick="deleteNote(\${note.id})" class="text-red-500 hover:text-red-700 font-semibold cursor-pointer">Hapus</button>
                            </div>
                        \`;
                        notesContainer.appendChild(noteCard);
                    });
                } catch (error) {
                    notesContainer.innerHTML = \`<div class="col-span-full text-center text-red-500 py-10">\${error.message}</div>\`;
                }
            }

            noteForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const title = document.getElementById('title').value;
                const content = document.getElementById('content').value;

                try {
                    const response = await fetch('/api/notes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title, content })
                    });
                    
                    const result = await response.json();

                    if (response.ok) {
                        noteForm.reset();
                        fetchNotes(); 
                    } else {
                        // Menampilkan pesan error asli dari server
                        alert('Gagal: ' + (result.error || result.message));
                    }
                } catch (error) {
                    alert('Error Sistem: ' + error.message);
                }
            });

            async function deleteNote(id) {
                if (confirm('Yakin ingin menghapus catatan ini?')) {
                    try {
                        const response = await fetch(\`/api/notes/\${id}\`, { method: 'DELETE' });
                        if (response.ok) {
                            fetchNotes();
                        } else {
                            const result = await response.json();
                            alert('Gagal hapus: ' + (result.error || result.message));
                        }
                    } catch (error) {
                        alert('Error Sistem: ' + error.message);
                    }
                }
            }

            fetchNotes();
        </script>
    </body>
    </html>
    `);
});

// BACKEND API

app.get('/api/notes', async (req, res) => {
    try {
        await ensureTableExists(); // Cek tabel sebelum ambil data
        const result = await pool.query('SELECT * FROM notes ORDER BY created_at DESC');
        res.status(200).json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ message: 'Error server', error: error.message });
    }
});

app.post('/api/notes', async (req, res) => {
    try {
        await ensureTableExists(); // Cek tabel sebelum insert data
        
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