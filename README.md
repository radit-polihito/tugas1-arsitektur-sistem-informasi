# Perencana Proyek Servis 🗂️

Alat perencanaan proyek **berbasis web** untuk mahasiswa Sistem Informasi, dibangun
murni dengan **HTML, CSS, dan JavaScript** — tanpa framework, tanpa proses build,
tanpa server. Semua data disimpan di `localStorage` browser.

Studi kasus yang dipakai sebagai contoh adalah operasional **tempat servis laptop**
(contoh: servis massal laptop pelanggan korporat / lab kampus).

---

## Cara menjalankan

Tidak ada proses instalasi. Cukup buka berkas HTML-nya langsung di browser
(Chrome, Firefox, Edge, atau Safari):

1. **Aplikasi utama** — buka `index.html` (dobel-klik dari File Explorer / Finder).
2. **Halaman tes otomatis** — buka `tes.html`. Seluruh pengecekan langsung
   dijalankan dan menampilkan status **LULUS / GAGAL** per kasus, plus ringkasan
   hijau/merah di bagian atas.

> Bila Anda menjalankan lewat server lokal (opsional), cukup:
> `python -m http.server` lalu buka `http://localhost:8000/`.
> Namun ini **tidak wajib** — halaman tetap berjalan dari `file://`.

Setelah membuka aplikasi, tekan **"Muat contoh: Servis 40 Laptop"** atau
**"Muat contoh: Jalur Kritis"** pada bilah atas untuk langsung melihat data contoh,
lalu buka tab **4. Visualisasi** dan **5. Jalur kritis**.

---

## Struktur berkas

```
index.html      Halaman aplikasi (5 tab, UI bahasa Indonesia)
tes.html        Halaman tes otomatis atas kedua contoh
css/style.css   Seluruh gaya antarmuka
js/schedule.js  LOGIKA PERHITUNGAN (tanpa DOM):
                - utilitas tanggal (ISO YYYY-MM-DD, berbasis UTC)
                - kalender kerja: libur mingguan + libur khusus
                - penjadwalan dependensi FS/SS/FF/SF + jeda hari kerja
                - perhitungan mundur (LS, LF, total float / lonjakan total)
                - enumerasi semua jalur awal-ke-akhir & jalur kritis
js/samples.js   Dua data contoh (Muat contoh A & B)
js/storage.js   localStorage, ekspor/impor JSON, normalisasi data
js/app.js       Antarmuka: render tabel, Gantt, PERT, jaringan, tabel jalur
js/tests.js     Pengecekan otomatis yang dipanggil tes.html
README.md       Berkas ini
```

Pemisahan `js/schedule.js` dari kode UI disengaja: seluruh perhitungan murni
dan dapat diuji ulang dari halaman tes tanpa membuka aplikasi.

---

## Fitur per tab

| Tab | Isi |
|---|---|
| **1. Pengaturan proyek** | Nama proyek, nama tempat servis/organisasi, deskripsi, tanggal mulai, hari libur mingguan, daftar libur khusus (sekali / berulang tiap tahun / berulang tiap bulan) |
| **2. Daftar kegiatan** | Tambah/ubah/hapus kegiatan: durasi (hari kerja), warna, sub-kegiatan (induk), hubungan antarkegiatan **FS / SS / FF / SF + jeda hari kerja**. Jadwal dihitung ulang otomatis dan melewati hari libur |
| **3. Tim** | Anggota (nama, peran: teknisi hardware, teknisi software, admin/kasir, kurir, manajer proyek; kontak; libur pribadi) dan penugasan anggota ke kegiatan |
| **4. Visualisasi** | Diagram **Gantt** (batang waktu + garis dependensi + penanda jalur kritis), diagram **PERT** (durasi, tanggal, lonjakan total), diagram **jaringan** (activity-on-node) |
| **5. Jalur kritis** | Tabel **semua** jalur awal→akhir beserta total durasi, jalur terpanjang ditandai **merah**, estimasi lama proyek (hari kerja & hari kalender), serta daftar kegiatan berlonjakan total 0 |

Bilah atas berisi: dua tombol **Muat contoh**, **Ekspor JSON**, **Impor JSON**,
dan **Bersihkan data**. Setiap perubahan langsung tersimpan ke `localStorage`
(indikator "Tersimpan ✓" di kanan atas).

---

## Dua contoh bawaan

### Contoh A — Servis Massal 40 Laptop Lab
Mulai **30 Juni 2026**, libur akhir pekan (Sabtu–Minggu) dan **17 Juli 2026**.

| Kegiatan | Durasi | Hubungan | Mulai | Selesai |
|---|---:|---|---|---|
| Pemeriksaan & Diagnosis Awal | 5 hari | — | 30/06/2026 | 06/07/2026 |
| Pengadaan Suku Cadang | 8 hari | SS terhadap Diagnosis, jeda 3 | 03/07/2026 | 14/07/2026 |
| Perbaikan & Pembersihan Hardware | 7 hari | SS terhadap Pengadaan, jeda 5 | 10/07/2026 | 21/07/2026 |
| Instal Ulang OS & Driver | 5 hari | FS jeda 0 | 22/07/2026 | 28/07/2026 |
| Uji Kualitas (stress test, baterai, layar) | 2 hari | FS jeda 0 | 29/07/2026 | 30/07/2026 |
| Serah Terima ke Pelanggan | 2 hari | FS jeda 0 | 31/07/2026 | 03/08/2026 |

Estimasi lama proyek: **24 hari kerja (35 hari kalender)**.
Perhatikan kegiatan "Perbaikan & Pembersihan Hardware" melompati 17 Juli dan
akhir pekan, itulah bukti jadwal dihitung ulang melewati hari libur.
(Tanggal-tabel di atas persis nilai yang diperiksa `tes.html`.)

> **Catatan rentang 30 Jun – 31 Jul.** Rencana tanpa libur 17 Juli berakhir
> persis pada **31 Juli 2026** (rentang 30 Jun–31 Jul, 24 hari kerja). Karena
> 17 Juli 2026 jatuh pada hari Jumat (hari kerja), libur khusus itu menahan
> proyek sehingga selesai menjadi **3 Agustus 2026**. Kondisi ini justru
> dipakai sebagai bukti bahwa libur khusus benar-benar menggeser jadwal —
> salah satu tes di `tes.html` membandingkan keduanya.

### Contoh B — Jalur kritis dengan banyak jalur paralel
A, B, C tanpa pendahulu; sisanya berantai (FS jeda 0), mulai **1 September 2026**.

| Jalur | Kegiatan | Total durasi |
|---|---|---:|
| 1 | B → E → H → J | **33 hari** ✔ jalur kritis |
| 2 | A → D → H → J | 30 hari |
| 3 | C → G → I → J | 20 hari |
| 4 | B → F → J | 9 hari |

Jalur kritis **B–E–H–J = 2 + 7 + 21 + 3 = 33 hari**, sama dengan estimasi lama
proyek (1 September → 15 Oktober 2026 = 33 hari kerja).

---

## Aturan perhitungan

* Semua durasi dan jeda dihitung dalam **hari kerja**, bukan hari kalender.
* Hari kerja = hari yang bukan libur mingguan dan bukan libur khusus.
* Tipe hubungan:
  * **FS + L** — penerima mulai **L hari kerja setelah** pemberi selesai
    (L = 0 ⇒ mulai pada hari kerja berikutnya).
  * **SS + L** — penerima mulai **L hari kerja setelah** pemberi mulai.
  * **FF + L** — penerima selesai **L hari kerja setelah** pemberi selesai.
  * **SF + L** — penerima selesai **L hari kerja setelah** pemberi mulai.
* Keberangkatan tiap kegiatan = **nilai maksimum** dari seluruh kendala pendahulunya.
* **Jalur kritis pada tab 5** = seluruh jalur akar→daun yang dihitung dari
  penjumlahan durasi, dengan total terbesar ditandai merah (sesuai kebutuhan tugas).
* **Lonjakan total (total float) pada diagram PERT** dihitung dengan perhitungan
  mundur (backward pass); kegiatan berlonjakan 0 ditandai merah pada Gantt/PERT.
  Keduanya menunjukkan jalur kritis yang sama ketika seluruh jeda bernilai 0.
* Libur pribadi anggota tersimpan dan ditampilkan pada tab Tim, tetapi
  **tidak** memengaruhi penjadwalan (kalender proyek yang menentukan hari kerja).

---

## Ekspor / Impor JSON

* **Ekspor JSON** mengunduh seluruh isi proyek sebagai berkas
  `nama-proyek.json` (berisi `proyek`, `kegiatan`, `tim`, `penugasan`).
* **Impor JSON** membaca berkas tersebut (lewat dialog berkas browser),
  memvalidasi/menormalkan isinya, lalu menimpa data yang sedang ada.
* Data juga tersimpan otomatis di `localStorage` dengan kunci
  `perencanaProyekServis.v1`.

Contoh struktur ringkas:

```json
{
  "versi": 1,
  "proyek": {
    "nama": "Servis Massal 40 Laptop Lab",
    "tanggalMulai": "2026-06-30",
    "liburMingguan": [0, 6],
    "liburKhusus": [
      { "nama": "Libur nasional 17 Juli", "tanggal": "2026-07-17", "berulang": false, "pola": "sekali" }
    ]
  },
  "kegiatan": [
    { "id": "k1", "nama": "Diagnosis", "durasi": 5, "warna": "#2563eb", "induk": null, "dependensi": [] },
    { "id": "k2", "nama": "Pengadaan", "durasi": 8, "warna": "#f59e0b", "induk": null,
      "dependensi": [{ "kegiatanId": "k1", "tipe": "SS", "jeda": 3 }] }
  ],
  "tim": [{ "id": "a1", "nama": "Andi", "peran": "Teknisi Hardware", "kontak": "0812…", "liburPribadi": [] }],
  "penugasan": [{ "kegiatanId": "k1", "anggotaId": "a1" }]
}
```

---

## Catatan untuk tugas/matakuliah

* `js/schedule.js` dapat dibaca sebagai referensi implementasi **CPM
  (Critical Path Method)**: *forward pass* untuk ES/EF, *backward pass* untuk
  LS/LF/total float, dan DFS untuk enumerasi seluruh jalur.
* `tes.html` adalah bukti otomatisasi pengujian: buka berkasnya dan seluruh
  pengecekan (**22 tes**) berjalan tanpa interaksi, cocok dilampirkan sebagai
  artefak pengujian.
