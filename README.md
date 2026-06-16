# Sistem Manajemen Arsip Digital (CRUD Catatan)

Aplikasi ini adalah website sederhana untuk menyimpan, membaca, mengubah, dan menghapus catatan (biasa disebut sistem CRUD). Data catatan disimpan secara *online* agar aman, dan websitenya dilengkapi dengan gembok pengaman berupa PIN.

---

## Tim (Kelas D)

Proyek ini dibuat bersama-sama dengan pembagian tugas sebagai berikut:

1. **Dwi Setya Angga (202451191)** — Bagian Server & Upload Web (Backend & DevOps)
2. **Kodrat (202451202)** — Bagian Desain Tampilan Web (UI Designer)
3. **Denny Satrio Adi (202451203)** — Bagian Database & Keamanan (DBA & Security)
4. **Andrey Notonegoro (202451205)** — Bagian Logika Tampilan & Interaksi Web (Frontend Logic)

---

## Alur Pembuatan Proyek (Dari Awal Sampai Selesai)

Proyek ini kami bangun dari nol dengan urutan langkah sebagai berikut:

### Tahap 1: Menyiapkan Tempat Penyimpanan Data (Database)
* Kami membuat database **PostgreSQL** secara *online* dan gratis menggunakan layanan **Aiven**.
* Kami menggunakan aplikasi **DBeaver** di laptop untuk mengecek apakah tabel datanya sudah tersusun rapi.
* Kami membuat kode otomatis: jadi ketika aplikasi pertama kali dinyalakan, sistem akan langsung membuatkan tempat (tabel `notes`) untuk menyimpan judul, isi catatan, dan waktu pembuatan.

### Tahap 2: Membuat Otak Server (Backend)
* Kami menggunakan **Node.js** dan **Express.js** untuk membuat servernya.
* Kami membuat 4 jalur tugas utama (API) agar server bisa diperintah untuk:
  * Melihat daftar semua catatan.
  * Menyimpan catatan baru.
  * Mengedit/mengubah catatan yang sudah ada.
  * Menghapus catatan.

### Tahap 3: Menghias Tampilan Halaman (Frontend)
* Kami mendesain tampilan website menggunakan **HTML** dan **Tailwind CSS** agar terlihat rapi dan kekinian.
* Tampilannya kami ubah menjadi bentuk tabel berkolom yang profesional, lengkap dengan kotak statistik di bagian atas.
* Kami menambahkan kode **JavaScript** agar saat kita menambah atau menghapus catatan, halamannya tidak perlu *loading* (refresh) ulang.

### Tahap 4: Memasang Gembok Keamanan (Fitur PIN)
* Agar tidak sembarang orang bisa melihat catatan, kami menambahkan halaman **Login PIN**.
* Server akan otomatis menolak siapa pun yang mencoba mengotak-atik data jika tidak punya PIN yang benar.
* Supaya tidak repot mengetik PIN setiap kali membuka halaman, sistem akan mengingat PIN kamu sementara waktu di dalam browser (*LocalStorage*).

### Tahap 5: Meng-online-kan Website (Hosting/Deployment)
* Semua kode yang sudah selesai kami simpan ke dalam **GitHub**.
* Kami menyambungkan GitHub ke **Vercel** agar website ini punya *link* sendiri dan bisa diakses dari HP atau laptop mana saja.
* Rahasia penting seperti "Kata Sandi Database" dan "Angka PIN" kami sembunyikan di pengaturan khusus Vercel agar kodenya tidak bisa dibajak orang.

---

## Alat & Teknologi yang Digunakan

* **Otak Server (Backend):** Node.js, Express.js
* **Tempat Data (Database):** PostgreSQL (di Aiven Cloud)
* **Tampilan (Frontend):** HTML, JavaScript, Tailwind CSS 
* **Alat Pendukung:** DBeaver, Git & GitHub
* **Tempat Hosting:** Vercel

---

## Menjalankan Aplikasi Ini di Laptop Sendiri

Buat kamu yang ingin mencoba menjalankan kode ini di laptop masing-masing:

1. **Download Kodenya:**
```bash
   git clone [https://github.com/Angga-pixel/crud-catatan-sql.git](https://github.com/Angga-pixel/crud-catatan-sql.git)
   cd crud-catatan-sql