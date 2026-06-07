# API CRUD Catatan (SQL Version)

Aplikasi API RESTful sederhana menggunakan Node.js, Express.js, dan PostgreSQL yang di-host di Aiven.

## Endpoint API
* **GET /** - Cek status API
* **GET /api/notes** - Mengambil semua catatan (SQL SELECT)
* **POST /api/notes** - Menambahkan catatan baru (SQL INSERT)
* **PUT /api/notes/:id** - Mengubah catatan berdasarkan ID (SQL UPDATE)
* **DELETE /api/notes/:id** - Menghapus catatan berdasarkan ID (SQL DELETE)