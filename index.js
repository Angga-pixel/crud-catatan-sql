const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 1. KONFIGURASI KONEKSI KE AIVEN POSTGRESQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Wajib diaktifkan untuk koneksi cloud Aiven
    }
});

// Fungsi Otomatis untuk Membuat Tabel 'notes' jika belum ada
const initDatabase = async () => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS notes (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    try {
        await pool.query(createTableQuery);
        console.log('Database terhubung & tabel "notes" siap digunakan.');
    } catch (err) {
        console.error('Gagal menginisialisasi tabel database:', err.message);
    }
};
initDatabase();

// 2. ROUTE / ENDPOINT API

// Endpoint Cek Status Server
app.get('/', (req, res) => {
    res.send('API CRUD Catatan Express.js + Aiven PostgreSQL siap digunakan!');
});

// CREATE: Tambah catatan baru
app.post('/api/notes', async (req, res) => {
    try {
        const { title, content } = req.body;
        if (!title || !content) {
            return res.status(400).json({ message: 'Judul dan isi catatan wajib diisi!' });
        }
        
        // Query SQL untuk menyimpan data dan mengembalikan data yang baru masuk (RETURNING *)
        const queryText = 'INSERT INTO notes(title, content) VALUES($1, $2) RETURNING *';
        const result = await pool.query(queryText, [title, content]);
        
        res.status(201).json({ message: 'Catatan berhasil ditambahkan', data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error server', error: error.message });
    }
});

// READ: Mengambil semua catatan
app.get('/api/notes', async (req, res) => {
    try {
        // Query SQL untuk mengambil semua catatan diurutkan dari yang terbaru
        const result = await pool.query('SELECT * FROM notes ORDER BY created_at DESC');
        res.status(200).json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ message: 'Error server', error: error.message });
    }
});

// UPDATE: Mengubah catatan berdasarkan ID
app.put('/api/notes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content } = req.body;
        
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

// DELETE: Menghapus catatan berdasarkan ID
app.delete('/api/notes/:id', async (req, res) => {
    try {
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

// Jalankan Server Lokal
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});

module.exports = app;