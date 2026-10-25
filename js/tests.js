/**
 * tests.js — Pengecekan otomatis atas kedua contoh studi kasus.
 *
 * Contoh A : memeriksa tanggal mulai & selesai setiap kegiatan, hari libur
 *            (akhir pekan dan 17 Juli 2026), serta estimasi lama proyek.
 * Contoh B : memeriksa seluruh jalur awal-ke-akhir, jalur kritis B-E-H-J,
 *            dan total durasi jalur kritis = 33 hari.
 *
 * Dipanggil dari tes.html melalui JalankanTes().
 */
(function (global) {
  'use strict';

  var S = global.Scheduler;
  var C = global.Contoh;

  /* --- ekspektasi Contoh A (mulai 30 Juni 2026, libur Sabtu/Minggu + 17 Juli 2026) --- */
  var EKSPETASI_A = {
    k1: { nama: 'Pemeriksaan & Diagnosis Awal', mulai: '2026-06-30', selesai: '2026-07-06' },
    k2: { nama: 'Pengadaan Suku Cadang', mulai: '2026-07-03', selesai: '2026-07-14' },
    k3: { nama: 'Perbaikan & Pembersihan Hardware', mulai: '2026-07-10', selesai: '2026-07-21' },
    k4: { nama: 'Instal Ulang OS & Driver', mulai: '2026-07-22', selesai: '2026-07-28' },
    k5: { nama: 'Uji Kualitas (stress test, baterai, layar)', mulai: '2026-07-29', selesai: '2026-07-30' },
    k6: { nama: 'Serah Terima ke Pelanggan', mulai: '2026-07-31', selesai: '2026-08-03' }
  };

  function jalankan() {
    var hasil = [];

    function tes(nama, fn) {
      try {
        var ket = fn();
        hasil.push({ nama: nama, lulus: true, keterangan: ket || '' });
      } catch (e) {
        hasil.push({ nama: nama, lulus: false, pesan: e && e.message ? e.message : String(e) });
      }
    }

    function samakan(nilai, harapan, label) {
      if (nilai !== harapan) {
        throw new Error(label + ': diharapkan "' + harapan + '", didapat "' + nilai + '"');
      }
    }

    function benar(kondisi, pesan) {
      if (!kondisi) throw new Error(pesan);
    }

    /* =================== CONTOH A =================== */
    var A = C.servis40Laptop();
    var resA = S.analisis(A.proyek, A.kegiatan);

    tes('Contoh A — tidak ada masalah data (siklus/dependensi hilang)', function () {
      benar(resA.masalah.length === 0, 'masalah: ' + resA.masalah.join(' | '));
      return 'jumlah masalah: 0';
    });

    Object.keys(EKSPETASI_A).forEach(function (id) {
      var e = EKSPETASI_A[id];
      tes('Contoh A — "' + e.nama + '" tanggal mulai & selesai', function () {
        var j = resA.jadwal[id];
        benar(!!j, 'kegiatan tidak terjadwal');
        samakan(j.mulai, e.mulai, 'tanggal mulai');
        samakan(j.selesai, e.selesai, 'tanggal selesai');
        return e.mulai + ' → ' + e.selesai;
      });
    });

    /* Hari-hari kerja yang benar-benar dipakai satu kegiatan: mulai, lalu maju
     * sebanyak durasi hari kerja (dengan demikian melewati akhir pekan & libur). */
    function hariKerjaKegiatan(res, id) {
      var j = res.jadwal[id];
      var n = S.durasiKegiatan(res.peta[id]);
      var hasil = [], t = j.mulai;
      for (var i = 0; i < n; i++) {
        hasil.push(t);
        t = res.kal.majuKerja(t, 1);
      }
      return hasil;
    }

    tes('Contoh A — 17 Juli 2026 tidak dihitung sebagai hari kerja kegiatan mana pun', function () {
      benar(resA.kal.libur('2026-07-17'), '17 Juli 2026 tidak terdaftar sebagai hari libur');
      var jatuh = [];
      Object.keys(resA.jadwal).forEach(function (id) {
        hariKerjaKegiatan(resA, id).forEach(function (t) {
          if (t === '2026-07-17') jatuh.push(resA.peta[id].nama);
        });
      });
      benar(jatuh.length === 0, 'kegiatan yang bekerja pada 17 Juli: ' + jatuh.join(', '));
      return 'Perbaikan & Pembersihan Hardware melompati 17/07/2026';
    });

    tes('Contoh A — semua hari kerja kegiatan jatuh pada hari kerja, bukan akhir pekan', function () {
      var salah = [];
      Object.keys(resA.jadwal).forEach(function (id) {
        var j = resA.jadwal[id];
        var hari = hariKerjaKegiatan(resA, id);
        hari.forEach(function (t) {
          if (!resA.kal.adalahHariKerja(t)) salah.push(resA.peta[id].nama + ' pada ' + t);
        });
        var n = S.durasiKegiatan(resA.peta[id]);
        var hitung = resA.kal.jumlahHariKerja(j.mulai, j.selesai);
        if (hitung !== n) salah.push(resA.peta[id].nama + ' punya ' + hitung + ' hari kerja, seharusnya ' + n);
      });
      benar(salah.length === 0, 'pelanggaran hari libur: ' + salah.join('; '));
      return 'batang Gantt boleh melewati akhir pekan, hari kerjanya tidak';
    });

    tes('Contoh A — jadwal melewati libur (Perbaikan & Pembersihan Hardware selesai setelah 17 Juli)', function () {
      var j = resA.jadwal.k3;
      benar(j.mulai < '2026-07-17' && j.selesai > '2026-07-17',
        'kegiatan tidak membentang melewati 17 Juli (mulai ' + j.mulai + ', selesai ' + j.selesai + ')');
      return 'membentang 10/07 → 21/07 (loncat 17 Juli + akhir pekan)';
    });

    tes('Contoh A — hubungan dependensi terpenuhi (SS+3, SS+5, FS+0)', function () {
      benar(resA.jadwal.k2.mulai === resA.kal.majuKerja(resA.jadwal.k1.mulai, 3),
        'Pengadaan seharusnya mulai 3 hari kerja setelah Diagnosis');
      benar(resA.jadwal.k3.mulai === resA.kal.majuKerja(resA.jadwal.k2.mulai, 5),
        'Perbaikan seharusnya mulai 5 hari kerja setelah Pengadaan');
      benar(resA.jadwal.k4.mulai === resA.kal.majuKerja(resA.jadwal.k3.selesai, 1),
        'Instalasi (FS+0) seharusnya dimulai tepat satu hari kerja setelah Perbaikan selesai');
      benar(resA.jadwal.k5.mulai === resA.kal.majuKerja(resA.jadwal.k4.selesai, 1),
        'Uji kualitas (FS+0) harus tepat setelah Instalasi');
      benar(resA.jadwal.k6.mulai === resA.kal.majuKerja(resA.jadwal.k5.selesai, 1),
        'Serah terima (FS+0) harus tepat setelah Uji kualitas');
      return 'SS+3, SS+5, dan tiga FS+0 terpenuhi';
    });

    tes('Contoh A — estimasi lama proyek 24 hari kerja (30 Jun → 3 Ags 2026)', function () {
      benar(!!resA.durasi, 'durasi proyek tidak dihitung');
      samakan(resA.durasi.mulai, '2026-06-30', 'tanggal mulai proyek');
      samakan(resA.durasi.selesai, '2026-08-03', 'tanggal selesai proyek');
      samakan(resA.durasi.hariKerja, 24, 'jumlah hari kerja');
      samakan(resA.durasi.hariKalender, 35, 'jumlah hari kalender');
      return '24 hari kerja / 35 hari kalender';
    });

    tes('Contoh A — libur 17 Juli menahan proyek: tanpa libur itu proyek selesai 31 Juli 2026', function () {
      var tanpaLibur = C.servis40Laptop();
      tanpaLibur.proyek.liburKhusus = [];
      var resTanpa = S.analisis(tanpaLibur.proyek, tanpaLibur.kegiatan);
      samakan(resTanpa.durasi.selesai, '2026-07-31', 'tanggal selesai tanpa libur 17 Juli');
      samakan(resTanpa.durasi.hariKerja, 24, 'jumlah hari kerja tanpa libur 17 Juli');
      return 'tanpa 17 Juli: selesai 31/07/2026 — dengan libur 17 Juli: selesai 03/08/2026';
    });

    /* =================== CONTOH B =================== */
    var B = C.jalurKritis();
    var resB = S.analisis(B.proyek, B.kegiatan);

    tes('Contoh B — tidak ada masalah data (siklus/dependensi hilang)', function () {
      benar(resB.masalah.length === 0, 'masalah: ' + resB.masalah.join(' | '));
      return 'jumlah masalah: 0';
    });

    tes('Contoh B — seluruh kegiatan terjadwal (A s/d J)', function () {
      samakan(Object.keys(resB.jadwal).length, 10, 'jumlah kegiatan terjadwal');
      return '10 kegiatan terjadwal';
    });

    tes('Contoh B — ada 4 jalur awal-ke-akhir', function () {
      samakan(resB.jalur.length, 4, 'jumlah jalur');
      return '4 jalur: A-D-H-J, B-E-H-J, B-F-J, C-G-I-J';
    });

    tes('Contoh B — total durasi tiap jalur benar (30, 33, 9, 20)', function () {
      var petaJalur = {};
      resB.jalur.forEach(function (j) { petaJalur[j.ids.join('-')] = j.total; });
      samakan(petaJalur['A-D-H-J'], 30, 'jalur A-D-H-J');
      samakan(petaJalur['B-E-H-J'], 33, 'jalur B-E-H-J');
      samakan(petaJalur['B-F-J'], 9, 'jalur B-F-J');
      samakan(petaJalur['C-G-I-J'], 20, 'jalur C-G-I-J');
      return 'A-D-H-J=30, B-E-H-J=33, B-F-J=9, C-G-I-J=20';
    });

    tes('Contoh B — jalur kritis = B → E → H → J', function () {
      benar(!!resB.kritis, 'jalur kritis tidak ditemukan');
      samakan(resB.kritis.ids.join('-'), 'B-E-H-J', 'jalur kritis');
      return resB.kritis.nama.join(' → ');
    });

    tes('Contoh B — total durasi jalur kritis = 33 hari', function () {
      benar(!!resB.kritis, 'jalur kritis tidak ditemukan');
      samakan(resB.kritis.total, 33, 'total durasi jalur kritis');
      benar(resB.jalur[0].kritis === true, 'jalur terpanjang belum ditandai kritis');
      return '33 hari kerja';
    });

    tes('Contoh B — kegiatan jalur kritis (lonjakan total = 0) adalah B, E, H, J', function () {
      var ids = Object.keys(resB.kritisAktivitas).sort().join(',');
      samakan(ids, 'B,E,H,J', 'daftar kegiatan kritis');
      return 'B, E, H, J';
    });

    tes('Contoh B — estimasi lama proyek = 33 hari kerja (1 Sep → 15 Okt 2026)', function () {
      benar(!!resB.durasi, 'durasi proyek tidak dihitung');
      samakan(resB.durasi.mulai, '2026-09-01', 'tanggal mulai proyek');
      samakan(resB.durasi.selesai, '2026-10-15', 'tanggal selesai proyek');
      samakan(resB.durasi.hariKerja, 33, 'jumlah hari kerja');
      return '33 hari kerja / 45 hari kalender';
    });

    tes('Contoh B — tanggal kunci: H selesai 12 Okt, J 13–15 Okt 2026', function () {
      samakan(resB.jadwal.H.mulai, '2026-09-14', 'tanggal mulai H');
      samakan(resB.jadwal.H.selesai, '2026-10-12', 'tanggal selesai H');
      samakan(resB.jadwal.J.mulai, '2026-10-13', 'tanggal mulai J');
      samakan(resB.jadwal.J.selesai, '2026-10-15', 'tanggal selesai J');
      return 'H: 14/09 → 12/10, J: 13/10 → 15/10';
    });

    return hasil;
  }

  global.JalankanTes = jalankan;
})(typeof window !== 'undefined' ? window : globalThis);
