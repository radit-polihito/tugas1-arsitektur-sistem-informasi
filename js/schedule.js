/**
 * schedule.js — Logika perhitungan perencanaan proyek (tanpa DOM).
 *
 * Berisi:
 *   1. Utilitas tanggal (format ISO YYYY-MM-DD, berbasis UTC agar bebas timezone).
 *   2. Kalender kerja: hari libur mingguan + libur khusus (sekali / tahunan / bulanan).
 *   3. Penjadwalan otomatis dengan dependensi FS, SS, FF, SF + jeda (hari kerja).
 *   4. Perhitungan jalur mundur (LS, LF, total float) untuk penandaan jalur kritis.
 *   5. Enumerasi semua jalur awal-ke-akhir dan total durasinya.
 *
 * File ini dipakai bersama oleh index.html dan tes.html, sehingga tidak boleh
 * menyentuh objek DOM.
 */
(function (global) {
  'use strict';

  var NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var MAKS_LANGKAH = 200000; // pengaman agar tidak loop tanpa henti
  var MAKS_JALUR = 3000; // batas enumerasi jalur agar tidak meledak

  /* ------------------------------------------------------------------ */
  /* 1. Utilitas tanggal                                                  */
  /* ------------------------------------------------------------------ */

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  /** Kembalikan timestamp UTC, atau null bila format/tanggal tidak valid. */
  function parseTanggal(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    var p = s.split('-');
    var y = +p[0], m = +p[1], d = +p[2];
    var t = Date.UTC(y, m - 1, d);
    var cek = new Date(t);
    if (cek.getUTCFullYear() !== y || cek.getUTCMonth() !== m - 1 || cek.getUTCDate() !== d) return null;
    return t;
  }

  function fmtTanggal(t) {
    var d = new Date(t);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }

  function tanggalValid(s) {
    return parseTanggal(s) !== null;
  }

  function tambahHari(s, n) {
    var t = parseTanggal(s);
    if (t === null) throw new Error('Tanggal tidak valid: ' + s);
    return fmtTanggal(t + n * 86400000);
  }

  function hariDalamMinggu(s) {
    var t = parseTanggal(s);
    if (t === null) return -1;
    return new Date(t).getUTCDay();
  }

  /** Selisih hari kalender dari a ke b (b - a). */
  function selisihHariKalender(a, b) {
    var ta = parseTanggal(a), tb = parseTanggal(b);
    if (ta === null || tb === null) return 0;
    return Math.round((tb - ta) / 86400000);
  }

  /** Contoh: 03/07 */
  function tanggalPendek(s) {
    var t = parseTanggal(s);
    if (t === null) return String(s);
    var d = new Date(t);
    return pad(d.getUTCDate()) + '/' + pad(d.getUTCMonth() + 1);
  }

  /** Contoh: 03/07/2026 */
  function tanggalPanjang(s) {
    var t = parseTanggal(s);
    if (t === null) return String(s);
    var d = new Date(t);
    return pad(d.getUTCDate()) + '/' + pad(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear();
  }

  /** Contoh: Rabu, 03 Juli 2026 */
  function tanggalDeskripsi(s) {
    var t = parseTanggal(s);
    if (t === null) return String(s);
    var d = new Date(t);
    var bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return NAMA_HARI[d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' + bulan[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
  }

  /* ------------------------------------------------------------------ */
  /* 2. Kalender kerja                                                    */
  /* ------------------------------------------------------------------ */

  /**
   * Buat kalender kerja dari pengaturan proyek.
   * @param {object} proyek { liburMingguan:[0..6], liburKhusus:[{tanggal, berulang, pola}] }
   */
  function buatKalender(proyek) {
    proyek = proyek || {};
    var mingguan = new Set((proyek.liburMingguan || []).map(Number));
    var sekali = new Set();
    var tahunan = new Set(); // 'MM-DD'
    var bulanan = new Set(); // tanggal bulan 1..31

    (proyek.liburKhusus || []).forEach(function (l) {
      if (!l || !l.tanggal) return;
      if (parseTanggal(l.tanggal) === null) return;
      if (l.berulang) {
        if (l.pola === 'bulanan') bulanan.add(Number(l.tanggal.slice(8, 10)));
        else tahunan.add(l.tanggal.slice(5));
      } else {
        sekali.add(l.tanggal);
      }
    });

    function libur(t) {
      if (mingguan.has(hariDalamMinggu(t))) return true;
      if (sekali.has(t)) return true;
      if (tahunan.has(t.slice(5))) return true;
      if (bulanan.has(Number(t.slice(8, 10)))) return true;
      return false;
    }

    function hariKerjaBerikutnya(t) {
      var cur = t;
      for (var i = 0; i < MAKS_LANGKAH; i++) {
        cur = tambahHari(cur, 1);
        if (!libur(cur)) return cur;
      }
      throw new Error('Kalender tidak punya hari kerja sama sekali. Periksa pengaturan hari libur mingguan.');
    }

    function hariKerjaSebelumnya(t) {
      var cur = t;
      for (var i = 0; i < MAKS_LANGKAH; i++) {
        cur = tambahHari(cur, -1);
        if (!libur(cur)) return cur;
      }
      throw new Error('Kalender tidak punya hari kerja sama sekali. Periksa pengaturan hari libur mingguan.');
    }

    return {
      libur: libur,
      adalahHariKerja: function (t) { return !libur(t); },
      /** Hari kerja pertama pada atau setelah tanggal t. */
      pertamaKerja: function (t) {
        if (!libur(t)) return t;
        return hariKerjaBerikutnya(t);
      },
      /** Maju n hari kerja dari t (n = 0 mengembalikan t apa adanya). */
      majuKerja: function (t, n) {
        var cur = t;
        n = Math.max(0, Math.round(n) || 0);
        for (var i = 0; i < n; i++) cur = hariKerjaBerikutnya(cur);
        return cur;
      },
      /** Mundur n hari kerja dari t. */
      mundurKerja: function (t, n) {
        var cur = t;
        n = Math.max(0, Math.round(n) || 0);
        for (var i = 0; i < n; i++) cur = hariKerjaSebelumnya(cur);
        return cur;
      },
      /** Jumlah hari kerja inklusif dari a sampai b. */
      jumlahHariKerja: function (a, b) {
        if (selisihHariKalender(a, b) < 0) return 0;
        var cur = this.pertamaKerja(a);
        var n = 0;
        while (cur <= b && n < MAKS_LANGKAH) {
          n++;
          cur = hariKerjaBerikutnya(cur);
        }
        return n;
      },
      /** Berapa hari kerja yang dibutuhkan untuk maju dari a ke b (b >= a). */
      selisihKerja: function (a, b) {
        var cur = a, n = 0;
        while (cur < b && n < MAKS_LANGKAH) {
          cur = hariKerjaBerikutnya(cur);
          n++;
        }
        return n;
      }
    };
  }

  /* ------------------------------------------------------------------ */
  /* 3. Topologi & penjadwalan                                            */
  /* ------------------------------------------------------------------ */

  function durasiKegiatan(k) {
    var d = Math.round(Number(k && k.durasi));
    if (!isFinite(d) || d < 1) d = 1;
    return d;
  }

  /**
   * Urutkan kegiatan secara topologis (Kahn) dan susun peta successor.
   * @returns {{order: string[], succ: object, masalah: string[]}}
   */
  function urutTopologi(kegiatan) {
    kegiatan = kegiatan || [];
    var peta = {};
    kegiatan.forEach(function (k) { if (k && k.id != null) peta[k.id] = k; });
    var ids = Object.keys(peta);
    var indeg = {}, succ = {};
    ids.forEach(function (id) { indeg[id] = 0; succ[id] = []; });
    var masalah = [];

    kegiatan.forEach(function (k) {
      if (!k || k.id == null) return;
      var uniq = new Set();
      (k.dependensi || []).forEach(function (d) {
        if (!d || d.kegiatanId == null) return;
        if (!Object.prototype.hasOwnProperty.call(peta, d.kegiatanId)) {
          masalah.push('Kegiatan "' + k.nama + '" merujuk kegiatan dependensi yang tidak ditemukan.');
          return;
        }
        if (d.kegiatanId === k.id) {
          masalah.push('Kegiatan "' + k.nama + '" tidak boleh bergantung pada dirinya sendiri.');
          return;
        }
        if (uniq.has(d.kegiatanId)) return;
        uniq.add(d.kegiatanId);
      });
      uniq.forEach(function (pid) {
        indeg[k.id]++;
        succ[pid].push(k.id);
      });
    });

    var antre = ids.filter(function (id) { return indeg[id] === 0; });
    var order = [];
    while (antre.length) {
      var id = antre.shift();
      order.push(id);
      succ[id].forEach(function (n) {
        if (--indeg[n] === 0) antre.push(n);
      });
    }
    if (order.length !== ids.length) {
      masalah.push('Ditemukan siklus dependensi antar kegiatan. Jadwal tidak dapat dihitung.');
    }
    return { order: order, succ: succ, peta: peta, masalah: masalah };
  }

  function tanggalMulaiProyek(kal, proyek) {
    var t = proyek && proyek.tanggalMulai;
    if (parseTanggal(t) === null) t = fmtTanggal(Date.now());
    return kal.pertamaKerja(t);
  }

  /**
   * Perhitungan maju (forward pass): ES & EF tiap kegiatan.
   *
   * Aturan jeda (dalam hari kerja):
   *   FS + L → mulai penerima = L hari kerja setelah selesai pemberi (L=0 → hari kerja berikutnya)
   *   SS + L → mulai penerima = L hari kerja setelah mulai pemberi
   *   FF + L → selesai penerima = L hari kerja setelah selesai pemberi
   *   SF + L → selesai penerima = L hari kerja setelah mulai pemberi
   */
  function hitungJadwal(kal, proyek, urut, peta) {
    var jadwal = {};
    var awalProyek = tanggalMulaiProyek(kal, proyek);

    urut.order.forEach(function (id) {
      var k = peta[id];
      var durasi = durasiKegiatan(k);
      var deps = (k.dependensi || []).filter(function (d) {
        return d && Object.prototype.hasOwnProperty.call(peta, d.kegiatanId) && jadwal[d.kegiatanId];
      });

      var mulai;
      if (deps.length === 0) {
        mulai = awalProyek;
      } else {
        var kandidat = null;
        deps.forEach(function (d) {
          var p = jadwal[d.kegiatanId];
          var tipe = String(d.tipe || 'FS').toUpperCase();
          var L = Math.round(Number(d.jeda));
          if (!isFinite(L)) L = 0;
          var c;
          if (tipe === 'SS') {
            c = kal.majuKerja(p.mulai, L);
          } else if (tipe === 'FF') {
            c = kal.mundurKerja(kal.majuKerja(p.selesai, L), durasi - 1);
          } else if (tipe === 'SF') {
            c = kal.mundurKerja(kal.majuKerja(p.mulai, L), durasi - 1);
          } else { // FS (default)
            c = kal.majuKerja(p.selesai, L + 1);
          }
          if (kandidat === null || c > kandidat) kandidat = c;
        });
        mulai = kandidat !== null ? kandidat : awalProyek;
      }

      mulai = kal.pertamaKerja(mulai);
      jadwal[id] = { mulai: mulai, selesai: kal.majuKerja(mulai, durasi - 1) };
    });

    return jadwal;
  }

  /**
   * Perhitungan mundur (backward pass): LF, LS, dan total float.
   * Proyek dianggap selesai pada selesai terakhir dari seluruh kegiatan.
   */
  function hitungMundur(kal, urut, peta, jadwal) {
    var selesaiProyek = null;
    Object.keys(jadwal).forEach(function (id) {
      if (selesaiProyek === null || jadwal[id].selesai > selesaiProyek) selesaiProyek = jadwal[id].selesai;
    });

    var LF = {}, LS = {}, TF = {};
    urut.order.slice().reverse().forEach(function (id) {
      var k = peta[id];
      var durasi = durasiKegiatan(k);
      var lf = null;

      urut.succ[id].forEach(function (sid) {
        if (!jadwal[sid]) return;
        (peta[sid].dependensi || []).forEach(function (d) {
          if (!d || d.kegiatanId !== id) return;
          var tipe = String(d.tipe || 'FS').toUpperCase();
          var L = Math.round(Number(d.jeda));
          if (!isFinite(L)) L = 0;
          var cand;
          if (tipe === 'SS') cand = kal.majuKerja(kal.mundurKerja(LS[sid], L), durasi - 1);
          else if (tipe === 'FF') cand = kal.mundurKerja(LF[sid], L);
          else if (tipe === 'SF') cand = kal.majuKerja(kal.mundurKerja(LF[sid], L), durasi - 1);
          else cand = kal.mundurKerja(LS[sid], L + 1);
          if (cand && (lf === null || cand < lf)) lf = cand;
        });
      });

      if (urut.succ[id].length === 0) {
        // Kegiatan daun: batas akhir = selesai proyek.
        lf = selesaiProyek !== null ? selesaiProyek : jadwal[id].selesai;
      } else if (lf === null || lf < jadwal[id].selesai) {
        lf = jadwal[id].selesai;
      }
      if (selesaiProyek !== null && lf > selesaiProyek) lf = selesaiProyek;
      LF[id] = lf;
      LS[id] = kal.mundurKerja(lf, durasi - 1);
      // Lonjakan total = LS - ES (dihitung dalam hari kerja, bisa negatif bila LS < ES).
      TF[id] = LS[id] >= jadwal[id].mulai
        ? kal.selisihKerja(jadwal[id].mulai, LS[id])
        : -kal.selisihKerja(LS[id], jadwal[id].mulai);
    });

    return { LF: LF, LS: LS, TF: TF, selesaiProyek: selesaiProyek };
  }

  /* ------------------------------------------------------------------ */
  /* 4. Enumerasi jalur                                                   */
  /* ------------------------------------------------------------------ */

  /**
   * Cari semua jalur dari kegiatan akar (tanpa pendahulu) ke kegiatan daun
   * (tanpa penerima).
   * @returns {{jalur: string[][], terpotong: boolean}}
   */
  function semuaJalur(urut) {
    var punyaPendahulu = {};
    urut.order.forEach(function (id) {
      urut.succ[id].forEach(function (n) { punyaPendahulu[n] = true; });
    });
    var akar = urut.order.filter(function (id) { return !punyaPendahulu[id]; });

    var jalur = [];
    var terpotong = false;

    function dfs(id, jalan) {
      if (jalur.length >= MAKS_JALUR) { terpotong = true; return; }
      jalan.push(id);
      if (urut.succ[id].length === 0) {
        jalur.push(jalan.slice());
      } else {
        urut.succ[id].forEach(function (n) { dfs(n, jalan); });
      }
      jalan.pop();
    }

    akar.forEach(function (a) { dfs(a, []); });
    return { jalur: jalur, terpotong: terpotong };
  }

  /* ------------------------------------------------------------------ */
  /* 5. Analisis lengkap                                                  */
  /* ------------------------------------------------------------------ */

  /**
   * Hitung jadwal, seluruh jalur awal-ke-akhir, jalur kritis, dan lama proyek.
   * @returns {object} hasil analisis siap pakai UI
   */
  function analisis(proyek, kegiatan) {
    proyek = proyek || {};
    kegiatan = Array.isArray(kegiatan) ? kegiatan : [];

    var hasil = {
      masalah: [],
      jadwal: {},
      urutan: [],
      peta: {},
      jalur: [],          // [{ids, nama, total, jeda, kritis}]
      kritis: null,       // {ids, nama, total}
      kritisAktivitas: {},// {id: true}
      float: {},
      durasi: null,       // {mulai, selesai, hariKerja, hariKalender}
      kal: null,
      terpotong: false
    };

    var urut = urutTopologi(kegiatan);
    hasil.peta = urut.peta;
    hasil.urutan = urut.order;
    hasil.masalah = urut.masalah.slice();

    if (urut.order.length !== Object.keys(urut.peta).length) return hasil; // ada siklus

    var kal;
    try {
      kal = buatKalender(proyek);
    } catch (e) {
      hasil.masalah.push(e.message);
      return hasil;
    }
    hasil.kal = kal;

    var jadwal;
    try {
      jadwal = hitungJadwal(kal, proyek, urut, urut.peta);
    } catch (e) {
      hasil.masalah.push(e.message);
      return hasil;
    }
    hasil.jadwal = jadwal;

    var mundur;
    try {
      mundur = hitungMundur(kal, urut, urut.peta, jadwal);
    } catch (e) {
      hasil.masalah.push(e.message);
      return hasil;
    }
    hasil.float = mundur.TF;
    Object.keys(mundur.TF).forEach(function (id) {
      if (mundur.TF[id] === 0) hasil.kritisAktivitas[id] = true;
    });

    // --- semua jalur awal-ke-akhir + total durasi ---
    var daftar = semuaJalur(urut);
    hasil.terpotong = daftar.terpotong;
    hasil.jalur = daftar.jalur.map(function (ids) {
      var total = 0, jeda = 0;
      ids.forEach(function (id, i) {
        total += durasiKegiatan(urut.peta[id]);
        if (i > 0) {
          var prev = ids[i - 1];
          var terbesar = 0;
          (urut.peta[id].dependensi || []).forEach(function (d) {
            if (d.kegiatanId === prev) {
              var L = Math.round(Number(d.jeda));
              if (isFinite(L) && L > terbesar) terbesar = L;
            }
          });
          jeda += terbesar;
        }
      });
      return {
        ids: ids,
        nama: ids.map(function (id) { return urut.peta[id].nama; }),
        total: total,
        jeda: jeda,
        kritis: false
      };
    }).sort(function (a, b) {
      if (b.total !== a.total) return b.total - a.total;
      return a.nama.join(' > ').localeCompare(b.nama.join(' > '));
    });

    if (hasil.jalur.length) {
      hasil.jalur[0].kritis = true;
      hasil.kritis = hasil.jalur[0];
    }

    // --- lama proyek ---
    var mulai = null, selesai = null;
    Object.keys(jadwal).forEach(function (id) {
      if (mulai === null || jadwal[id].mulai < mulai) mulai = jadwal[id].mulai;
      if (selesai === null || jadwal[id].selesai > selesai) selesai = jadwal[id].selesai;
    });
    if (mulai !== null) {
      hasil.durasi = {
        mulai: mulai,
        selesai: selesai,
        hariKalender: selisihHariKalender(mulai, selesai) + 1,
        hariKerja: kal.jumlahHariKerja(mulai, selesai)
      };
    }

    return hasil;
  }

  global.Scheduler = {
    NAMA_HARI: NAMA_HARI,
    NAMA_BULAN: NAMA_BULAN,
    pad: pad,
    parseTanggal: parseTanggal,
    fmtTanggal: fmtTanggal,
    tanggalValid: tanggalValid,
    tambahHari: tambahHari,
    hariDalamMinggu: hariDalamMinggu,
    selisihHariKalender: selisihHariKalender,
    tanggalPendek: tanggalPendek,
    tanggalPanjang: tanggalPanjang,
    tanggalDeskripsi: tanggalDeskripsi,
    buatKalender: buatKalender,
    durasiKegiatan: durasiKegiatan,
    urutTopologi: urutTopologi,
    hitungJadwal: hitungJadwal,
    hitungMundur: hitungMundur,
    semuaJalur: semuaJalur,
    analisis: analisis
  };
})(typeof window !== 'undefined' ? window : globalThis);
