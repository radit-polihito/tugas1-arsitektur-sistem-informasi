/**
 * storage.js — Penyimpanan data (localStorage), ekspor/impor JSON, dan
 * normalisasi struktur data proyek.
 */
(function (global) {
  'use strict';

  var KUNCI = 'perencanaProyekServis.v1';
  var WARNA_DEFAULT = '#3b82f6';
  var TIPE_DEP = ['FS', 'SS', 'FF', 'SF'];

  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function kosong() {
    var tahun = new Date().getFullYear();
    var mulai = tahun + '-01-02';
    return {
      versi: 1,
      proyek: {
        nama: '',
        organisasi: '',
        deskripsi: '',
        tanggalMulai: mulai,
        liburMingguan: [0, 6],
        liburKhusus: []
      },
      kegiatan: [],
      tim: [],
      penugasan: []
    };
  }

  function angkaBersih(n, bawaan) {
    n = Math.round(Number(n));
    return isFinite(n) && n >= 1 ? n : bawaan;
  }

  function stringBersih(s, bawaan) {
    if (s === null || s === undefined) return bawaan === undefined ? '' : bawaan;
    return String(s);
  }

  function tanggalList(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.filter(function (t) {
      return typeof t === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t);
    });
  }

  /** Tidak ada tanggal? balikkan null. Tanggal valid? balikkan ISO. */
  function satuTanggal(t, bawaan) {
    return typeof t === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : (bawaan === undefined ? null : bawaan);
  }

  /**
   * Validasi + rapikan data hasil impor (atau hasil pembacaan localStorage).
   * @returns {object|null} struktur valid atau null bila bukan objek proyek
   */
  function normalisasi(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    if (!Array.isArray(data.kegiatan)) return null;

    var hasil = kosong();
    var p = data.proyek && typeof data.proyek === 'object' ? data.proyek : {};

    hasil.versi = 1;
    hasil.proyek.nama = stringBersih(p.nama);
    hasil.proyek.organisasi = stringBersih(p.organisasi);
    hasil.proyek.deskripsi = stringBersih(p.deskripsi);
    hasil.proyek.tanggalMulai = satuTanggal(p.tanggalMulai, hasil.proyek.tanggalMulai);
    hasil.proyek.liburMingguan = Array.isArray(p.liburMingguan)
      ? p.liburMingguan.map(Number).filter(function (n) { return n >= 0 && n <= 6; })
      : hasil.proyek.liburMingguan;
    hasil.proyek.liburKhusus = Array.isArray(p.liburKhusus)
      ? p.liburKhusus.filter(function (l) { return l && satuTanggal(l.tanggal); }).map(function (l) {
          return {
            id: stringBersih(l.id, uid('libur')) || uid('libur'),
            nama: stringBersih(l.nama, 'Libur'),
            tanggal: l.tanggal,
            berulang: !!l.berulang,
            pola: l.pola === 'bulanan' ? 'bulanan' : (l.pola === 'tahunan' || l.berulang ? 'tahunan' : 'sekali')
          };
        })
      : [];

    var idKegiatan = {};
    hasil.kegiatan = data.kegiatan.map(function (k) {
      var id = stringBersih(k && k.id) || uid('k');
      if (idKegiatan[id]) id = uid('k');
      idKegiatan[id] = true;
      var warna = stringBersih(k && k.warna, WARNA_DEFAULT);
      if (!/^#[0-9a-fA-F]{6}$/.test(warna)) warna = WARNA_DEFAULT;
      return {
        id: id,
        nama: stringBersih(k && k.nama, 'Kegiatan tanpa nama'),
        durasi: angkaBersih(k && k.durasi, 1),
        warna: warna,
        induk: k && k.induk && stringBersih(k.induk) ? stringBersih(k.induk) : null,
        dependensi: Array.isArray(k && k.dependensi)
          ? k.dependensi.filter(function (d) { return d && typeof d.kegiatanId === 'string'; }).map(function (d) {
              var tipe = String(d.tipe || 'FS').toUpperCase();
              if (TIPE_DEP.indexOf(tipe) < 0) tipe = 'FS';
              var jeda = Math.round(Number(d.jeda));
              if (!isFinite(jeda) || jeda < 0) jeda = 0;
              return { kegiatanId: d.kegiatanId, tipe: tipe, jeda: jeda };
            })
          : []
      };
    });

    // buang induk/dependensi yang merujuk kegiatan tidak ada
    hasil.kegiatan.forEach(function (k) {
      if (k.induk && !idKegiatan[k.induk]) k.induk = null;
      k.dependensi = k.dependensi.filter(function (d) { return !!idKegiatan[d.kegiatanId]; });
    });

    var idAnggota = {};
    hasil.tim = Array.isArray(data.tim) ? data.tim : [];
    hasil.tim = hasil.tim.map(function (a) {
      var id = stringBersih(a && a.id) || uid('a');
      if (idAnggota[id]) id = uid('a');
      idAnggota[id] = true;
      var peran = stringBersih(a && a.peran, 'Lainnya');
      return {
        id: id,
        nama: stringBersih(a && a.nama, 'Anggota tanpa nama'),
        peran: peran,
        kontak: stringBersih(a && a.kontak),
        liburPribadi: tanggalList(a && a.liburPribadi)
      };
    });

    hasil.penugasan = Array.isArray(data.penugasan) ? data.penugasan : [];
    hasil.penugasan = hasil.penugasan.filter(function (t) {
      return t && idKegiatan[t.kegiatanId] && idAnggota[t.anggotaId];
    }).map(function (t) {
      return { kegiatanId: t.kegiatanId, anggotaId: t.anggotaId };
    });

    return hasil;
  }

  function muat() {
    var mentah = null;
    try {
      mentah = global.localStorage.getItem(KUNCI);
    } catch (e) {
      return kosong();
    }
    if (!mentah) return kosong();
    try {
      return normalisasi(JSON.parse(mentah)) || kosong();
    } catch (e) {
      return kosong();
    }
  }

  function simpan(state) {
    try {
      global.localStorage.setItem(KUNCI, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  function hapus() {
    try {
      global.localStorage.removeItem(KUNCI);
      return true;
    } catch (e) {
      return false;
    }
  }

  function namaBerkas(state) {
    var nama = (state && state.proyek && state.proyek.nama) || 'proyek';
    var bersih = nama.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return (bersih || 'proyek') + '.json';
  }

  global.Penyimpanan = {
    KUNCI: KUNCI,
    WARNA_DEFAULT: WARNA_DEFAULT,
    TIPE_DEP: TIPE_DEP,
    uid: uid,
    kosong: kosong,
    normalisasi: normalisasi,
    muat: muat,
    simpan: simpan,
    hapus: hapus,
    namaBerkas: namaBerkas
  };
})(typeof window !== 'undefined' ? window : globalThis);
