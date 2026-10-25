/**
 * samples.js — Dua contoh data siap pakai ("Muat contoh").
 *
 * Contoh A : Servis Massal 40 Laptop Lab — 30 Jun s/d 31 Jul 2026,
 *            libur akhir pekan dan 17 Juli 2026.
 * Contoh B : Studi jalur kritis dengan banyak jalur paralel,
 *            jalur kritis B-E-H-J = 33 hari.
 */
(function (global) {
  'use strict';

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  var PERAN = ['Teknisi Hardware', 'Teknisi Software', 'Admin/Kasir', 'Kurir', 'Manajer Proyek', 'Lainnya'];

  /* ------------------------------------------------------------------ */
  function contohServis40Laptop() {
    return {
      versi: 1,
      proyek: {
        nama: 'Servis Massal 40 Laptop Lab',
        organisasi: 'Laboratorium Komputer Kampus',
        deskripsi: 'Perawatan berkala 40 unit laptop laboratorium: diagnosis, pengadaan suku cadang, perbaikan hardware, instalasi ulang OS, uji kualitas, dan serah terima.',
        tanggalMulai: '2026-06-30',
        liburMingguan: [0, 6],
        liburKhusus: [
          { id: 'libur1', nama: 'Libur nasional 17 Juli', tanggal: '2026-07-17', berulang: false, pola: 'sekali' }
        ]
      },
      kegiatan: [
        {
          id: 'k1', nama: 'Pemeriksaan & Diagnosis Awal', durasi: 5, warna: '#2563eb', induk: null,
          dependensi: []
        },
        {
          id: 'k2', nama: 'Pengadaan Suku Cadang', durasi: 8, warna: '#f59e0b', induk: null,
          dependensi: [{ kegiatanId: 'k1', tipe: 'SS', jeda: 3 }]
        },
        {
          id: 'k3', nama: 'Perbaikan & Pembersihan Hardware', durasi: 7, warna: '#16a34a', induk: null,
          dependensi: [{ kegiatanId: 'k2', tipe: 'SS', jeda: 5 }]
        },
        {
          id: 'k4', nama: 'Instal Ulang OS & Driver', durasi: 5, warna: '#7c3aed', induk: null,
          dependensi: [{ kegiatanId: 'k3', tipe: 'FS', jeda: 0 }]
        },
        {
          id: 'k5', nama: 'Uji Kualitas (stress test, baterai, layar)', durasi: 2, warna: '#0891b2', induk: null,
          dependensi: [{ kegiatanId: 'k4', tipe: 'FS', jeda: 0 }]
        },
        {
          id: 'k6', nama: 'Serah Terima ke Pelanggan', durasi: 2, warna: '#dc2626', induk: null,
          dependensi: [{ kegiatanId: 'k5', tipe: 'FS', jeda: 0 }]
        }
      ],
      tim: [
        { id: 'a1', nama: 'Andi Pratama', peran: 'Teknisi Hardware', kontak: '0812-0000-1111', liburPribadi: ['2026-07-10'] },
        { id: 'a2', nama: 'Budi Santoso', peran: 'Teknisi Software', kontak: 'budi@kampus.ac.id', liburPribadi: [] },
        { id: 'a3', nama: 'Citra Dewi', peran: 'Admin/Kasir', kontak: '0813-2222-3333', liburPribadi: [] },
        { id: 'a4', nama: 'Doni Kurnia', peran: 'Kurir', kontak: '0814-5555-6666', liburPribadi: ['2026-07-17'] }
      ],
      penugasan: [
        { kegiatanId: 'k1', anggotaId: 'a1' },
        { kegiatanId: 'k2', anggotaId: 'a3' },
        { kegiatanId: 'k3', anggotaId: 'a1' },
        { kegiatanId: 'k4', anggotaId: 'a2' },
        { kegiatanId: 'k5', anggotaId: 'a2' },
        { kegiatanId: 'k6', anggotaId: 'a4' },
        { kegiatanId: 'k6', anggotaId: 'a3' }
      ]
    };
  }

  /* ------------------------------------------------------------------ */
  function contohJalurKritis() {
    return {
      versi: 1,
      proyek: {
        nama: 'Servis Massal dengan Banyak Jalur Paralel',
        organisasi: 'Bengkel Servis Laptop Korporat',
        deskripsi: 'Contoh perhitungan jalur kritis: penerimaan unit, diagnosis, persiapan area, pembersihan, pemesanan suku cadang impor, backup data, lisensi software, perbaikan, konfigurasi, dan uji akhir.',
        tanggalMulai: '2026-09-01',
        liburMingguan: [0, 6],
        liburKhusus: []
      },
      kegiatan: [
        { id: 'A', nama: 'A — Penerimaan & Pencatatan Unit', durasi: 1, warna: '#2563eb', induk: null, dependensi: [] },
        { id: 'B', nama: 'B — Diagnosis Kerusakan', durasi: 2, warna: '#0ea5e9', induk: null, dependensi: [] },
        { id: 'C', nama: 'C — Persiapan Alat & Area Kerja', durasi: 3, warna: '#64748b', induk: null, dependensi: [] },
        { id: 'D', nama: 'D — Pembersihan Internal & Pasta Termal', durasi: 5, warna: '#16a34a', induk: null, dependensi: [{ kegiatanId: 'A', tipe: 'FS', jeda: 0 }] },
        { id: 'E', nama: 'E — Pemesanan Suku Cadang Impor', durasi: 7, warna: '#f59e0b', induk: null, dependensi: [{ kegiatanId: 'B', tipe: 'FS', jeda: 0 }] },
        { id: 'F', nama: 'F — Backup Data Pelanggan', durasi: 4, warna: '#8b5cf6', induk: null, dependensi: [{ kegiatanId: 'B', tipe: 'FS', jeda: 0 }] },
        { id: 'G', nama: 'G — Pengadaan Lisensi & Paket Aplikasi', durasi: 12, warna: '#ec4899', induk: null, dependensi: [{ kegiatanId: 'C', tipe: 'FS', jeda: 0 }] },
        { id: 'H', nama: 'H — Perbaikan & Penggantian Komponen', durasi: 21, warna: '#dc2626', induk: null, dependensi: [{ kegiatanId: 'D', tipe: 'FS', jeda: 0 }, { kegiatanId: 'E', tipe: 'FS', jeda: 0 }] },
        { id: 'I', nama: 'I — Konfigurasi Software Standar', durasi: 2, warna: '#14b8a6', induk: null, dependensi: [{ kegiatanId: 'G', tipe: 'FS', jeda: 0 }] },
        { id: 'J', nama: 'J — Uji Akhir & Serah Terima', durasi: 3, warna: '#b91c1c', induk: null, dependensi: [{ kegiatanId: 'F', tipe: 'FS', jeda: 0 }, { kegiatanId: 'H', tipe: 'FS', jeda: 0 }, { kegiatanId: 'I', tipe: 'FS', jeda: 0 }] }
      ],
      tim: [
        { id: 'b1', nama: 'Rina Amelia', peran: 'Manajer Proyek', kontak: '0815-7777-8888', liburPribadi: [] },
        { id: 'b2', nama: 'Saiful Hidayat', peran: 'Teknisi Hardware', kontak: '0816-9999-0000', liburPribadi: [] },
        { id: 'b3', nama: 'Tika Larasati', peran: 'Teknisi Software', kontak: 'tika@bengkel.co.id', liburPribadi: [] },
        { id: 'b4', nama: 'Umar Fauzi', peran: 'Kurir', kontak: '0817-1212-3434', liburPribadi: [] }
      ],
      penugasan: [
        { kegiatanId: 'A', anggotaId: 'b1' },
        { kegiatanId: 'B', anggotaId: 'b2' },
        { kegiatanId: 'C', anggotaId: 'b4' },
        { kegiatanId: 'D', anggotaId: 'b2' },
        { kegiatanId: 'E', anggotaId: 'b1' },
        { kegiatanId: 'F', anggotaId: 'b3' },
        { kegiatanId: 'G', anggotaId: 'b3' },
        { kegiatanId: 'H', anggotaId: 'b2' },
        { kegiatanId: 'I', anggotaId: 'b3' },
        { kegiatanId: 'J', anggotaId: 'b1' }
      ]
    };
  }

  global.Contoh = {
    PERAN: PERAN,
    servis40Laptop: function () { return clone(contohServis40Laptop()); },
    jalurKritis: function () { return clone(contohJalurKritis()); },
    namaContoh: {
      servis40Laptop: 'Contoh A — Servis Massal 40 Laptop Lab',
      jalurKritis: 'Contoh B — Jalur Kritis (jalur paralel)'
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
