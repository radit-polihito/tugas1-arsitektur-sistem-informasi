/**
 * app.js — Antarmuka utama (tab, form, tabel, visualisasi, ekspor/impor).
 * Semua perhitungan logika ada di js/schedule.js.
 */
(function () {
  'use strict';

  var S = window.Scheduler;
  var C = window.Contoh;
  var P = window.Penyimpanan;

  var state = P.muat();
  var tabAktif = 'pengaturan';
  var modeVisual = 'gantt';
  var depsSementara = [];
  var hasilAnalisis = null;

  /* ---------------- utilitas ---------------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var timerToast = null;
  function toast(pesan, jenis) {
    var el = $('#toast');
    el.textContent = pesan;
    el.className = 'toast' + (jenis === 'bahaya' ? ' bahaya' : '');
    el.hidden = false;
    clearTimeout(timerToast);
    timerToast = setTimeout(function () { el.hidden = true; }, 3200);
  }

  function simpan(render = true) {
    var ok = P.simpan(state);
    $('#statusSimpan').textContent = ok ? 'Tersimpan ✓' : 'Gagal menyimpan';
    if (render) renderSemua();
  }

  function namaKegiatan(id) {
    var k = state.kegiatan.find(function (x) { return x.id === id; });
    return k ? k.nama : id;
  }

  /* ---------------- pemberitahuan keadaan kosong ---------------- */
  function pesanKosong(pesan) {
    return '<p class="petunjuk" style="padding:24px 0;text-align:center;">' + esc(pesan) + '</p>';
  }

  /* ================================================================ */
  /* PENGATURAN                                                        */
  /* ================================================================ */
  function isiFormPengaturan() {
    var p = state.proyek;
    $('#setNama').value = p.nama || '';
    $('#setOrganisasi').value = p.organisasi || '';
    $('#setDeskripsi').value = p.deskripsi || '';
    $('#setMulai').value = p.tanggalMulai || '';
    $$('#liburMingguan input').forEach(function (cb) {
      cb.checked = p.liburMingguan.map(Number).indexOf(Number(cb.value)) >= 0;
    });
    renderTabelLibur();
  }

  function bacaLiburMingguan() {
    return $$('#liburMingguan input:checked').map(function (cb) { return Number(cb.value); });
  }

  function validasiLiburMingguan() {
    if (bacaLiburMingguan().length === 0) {
      toast('Pilih minimal satu hari libur mingguan, kalender butuh hari kerja.', 'bahaya');
      return false;
    }
    return true;
  }

  function renderTabelLibur() {
    var daftar = state.proyek.liburKhusus || [];
    var isi = daftar.map(function (l) {
      var pola = l.pola === 'bulanan' ? 'Berulang tiap bulan'
        : (l.pola === 'tahunan' ? 'Berulang tiap tahun' : 'Sekali');
      return '<tr>' +
        '<td>' + esc(l.nama) + '</td>' +
        '<td>' + esc(S.tanggalDeskripsi(l.tanggal)) + '</td>' +
        '<td><span class="chip">' + esc(pola) + '</span></td>' +
        '<td class="aksi-cell"><button type="button" class="btn btn-kecil btn-bahaya-kecil" data-hapus-libur="' + esc(l.id) + '">Hapus</button></td>' +
        '</tr>';
    }).join('');
    $('#tabelLibur').innerHTML = isi || '<tr><td colspan="4" class="kosong">Belum ada libur khusus.</td></tr>';
  }

  function simpanPengaturan() {
    if (!validasiLiburMingguan()) return;
    var tanggal = $('#setMulai').value;
    if (!S.tanggalValid(tanggal)) {
      toast('Tanggal mulai proyek tidak valid.', 'bahaya');
      return;
    }
    state.proyek.nama = $('#setNama').value.trim();
    state.proyek.organisasi = $('#setOrganisasi').value.trim();
    state.proyek.deskripsi = $('#setDeskripsi').value.trim();
    state.proyek.tanggalMulai = tanggal;
    state.proyek.liburMingguan = bacaLiburMingguan();
    toast('Pengaturan proyek disimpan.');
    simpan();
  }

  /* ================================================================ */
  /* KEGIATAN                                                          */
  /* ================================================================ */
  function bersihkanFormKegiatan() {
    $('#formKegiatan').reset();
    $('#kegId').value = '';
    $('#kegDurasi').value = 1;
    $('#kegWarna').value = P.WARNA_DEFAULT;
    $('#depJeda').value = 0;
    depsSementara = [];
    $('#judulFormKegiatan').textContent = 'Tambah kegiatan';
    $('#btnSimpanKegiatan').textContent = 'Tambah kegiatan';
    $('#btnBatalKegiatan').hidden = true;
    renderDaftarDep();
  }

  function renderDaftarDep() {
    if (!depsSementara.length) {
      $('#daftarDep').innerHTML = '<li class="kosong">Belum ada hubungan — kegiatan ini jadi kegiatan awal (akar).</li>';
      return;
    }
    $('#daftarDep').innerHTML = depsSementara.map(function (d, i) {
      return '<li>' + esc(namaKegiatan(d.kegiatanId)) + ' → <strong>' + esc(d.tipe) +
        ' + ' + d.jeda + ' hari kerja</strong>' +
        '<button type="button" title="Hapus hubungan" data-hapus-dep="' + i + '">×</button></li>';
    }).join('');
  }

  function isiSelectKegiatan() {
    var pilihan = ['#kegInduk', '#depKegiatan', '#pasKegiatan'].map(function (s) { return $(s).value; });
    var opsi = '<option value="">— pilih kegiatan —</option>';
    var opsiInduk = '<option value="">— kegiatan utama —</option>';
    state.kegiatan.forEach(function (k) {
      var label = (k.induk ? '└ ' : '') + k.nama + ' (' + k.durasi + ' hr)';
      opsi += '<option value="' + esc(k.id) + '">' + esc(label) + '</option>';
      opsiInduk += '<option value="' + esc(k.id) + '">' + esc(k.nama) + '</option>';
    });
    $('#kegInduk').innerHTML = opsiInduk;
    $('#depKegiatan').innerHTML = opsi;
    $('#pasKegiatan').innerHTML = opsi;
    ['#kegInduk', '#depKegiatan', '#pasKegiatan'].forEach(function (s, i) {
      if (pilihan[i] && $(s).querySelector('option[value="' + CSS.escape(pilihan[i]) + '"]')) $(s).value = pilihan[i];
    });
  }

  function renderTabelKegiatan(a) {
    if (!state.kegiatan.length) {
      $('#tabelKegiatan').innerHTML = '<tr><td colspan="5" class="kosong">Belum ada kegiatan. Tambahkan lewat formulir di atas atau muat contoh.</td></tr>';
      $('#ringkasKegiatan').textContent = '';
      return;
    }
    var total = state.kegiatan.reduce(function (n, k) { return n + S.durasiKegiatan(k); }, 0);
    var baris = state.kegiatan.map(function (k) {
      var deps = (k.dependensi || []).map(function (d) {
        var warna = d.tipe === 'FS' ? 'chip' : 'chip';
        return '<span class="' + warna + '">' + esc(namaKegiatan(d.kegiatanId)) + ' (' + esc(d.tipe) + '+' + d.jeda + ')</span>';
      }).join('') || '<span class="kosong">— (kegiatan awal)</span>';
      var induk = k.induk ? '<span class="induk" title="Sub-kegiatan dari ' + esc(namaKegiatan(k.induk)) + '">└ </span>' : '';
      var jadwal = a && a.jadwal[k.id]
        ? '<div class="tes-hasil">' + esc(S.tanggalPendek(a.jadwal[k.id].mulai)) + ' → ' + esc(S.tanggalPendek(a.jadwal[k.id].selesai)) +
          (a.kritisAktivitas[k.id] ? ' · <span class="chip chip-merah">kritis</span>' : '') + '</div>'
        : '';
      return '<tr>' +
        '<td>' + induk + '<span class="sampel-warna" style="background:' + esc(k.warna) + '"></span> ' + esc(k.nama) + jadwal + '</td>' +
        '<td class="kanan">' + k.durasi + ' hr</td>' +
        '<td><span class="sampel-warna" style="background:' + esc(k.warna) + '"></span> ' + esc(k.warna) + '</td>' +
        '<td>' + deps + '</td>' +
        '<td class="aksi-cell">' +
          '<button type="button" class="btn btn-kecil" data-ubah-keg="' + esc(k.id) + '">Ubah</button>' +
          '<button type="button" class="btn btn-kecil btn-bahaya-kecil" data-hapus-keg="' + esc(k.id) + '">Hapus</button>' +
        '</td>' +
      '</tr>';
    }).join('');
    $('#tabelKegiatan').innerHTML = baris;

    var catatan = state.kegiatan.length + ' kegiatan · total durasi ' + total + ' hari kerja (sebelum penggabungan jalur paralel).';
    if (a && a.masalah.length) {
      catatan += ' <span class="chip chip-merah">' + a.masalah.length + ' masalah</span> ' + esc(a.masalah.join(' '));
    }
    $('#ringkasKegiatan').innerHTML = catatan;
  }

  function simpanKegiatan(ev) {
    ev.preventDefault();
    var nama = $('#kegNama').value.trim();
    if (!nama) { toast('Nama kegiatan wajib diisi.', 'bahaya'); return; }
    var durasi = Math.round(Number($('#kegDurasi').value));
    if (!isFinite(durasi) || durasi < 1) { toast('Durasi minimal 1 hari kerja.', 'bahaya'); return; }
    var induk = $('#kegInduk').value || null;
    var id = $('#kegId').value;

    if (id) {
      var k = state.kegiatan.find(function (x) { return x.id === id; });
      if (k) {
        k.nama = nama; k.durasi = durasi; k.warna = $('#kegWarna').value;
        k.induk = induk === id ? null : induk;
        k.dependensi = depsSementara.slice();
      }
      toast('Kegiatan "' + nama + '" diperbarui.');
    } else {
      state.kegiatan.push({
        id: P.uid('k'), nama: nama, durasi: durasi,
        warna: $('#kegWarna').value, induk: induk, dependensi: depsSementara.slice()
      });
      toast('Kegiatan "' + nama + '" ditambahkan.');
    }
    bersihkanFormKegiatan();
    simpan();
  }

  function ubahKegiatan(id) {
    var k = state.kegiatan.find(function (x) { return x.id === id; });
    if (!k) return;
    $('#kegId').value = k.id;
    $('#kegNama').value = k.nama;
    $('#kegDurasi').value = k.durasi;
    $('#kegWarna').value = k.warna;
    $('#kegInduk').value = k.induk || '';
    depsSementara = JSON.parse(JSON.stringify(k.dependensi || []));
    renderDaftarDep();
    $('#judulFormKegiatan').textContent = 'Ubah kegiatan';
    $('#btnSimpanKegiatan').textContent = 'Simpan perubahan';
    $('#btnBatalKegiatan').hidden = false;
    $('#kegNama').focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function hapusKegiatan(id) {
    var k = state.kegiatan.find(function (x) { return x.id === id; });
    if (!k) return;
    if (!confirm('Hapus kegiatan "' + k.nama + '" beserta hubungan dan penugasannya?')) return;
    state.kegiatan = state.kegiatan.filter(function (x) { return x.id !== id; });
    state.kegiatan.forEach(function (x) {
      if (x.induk === id) x.induk = null;
      x.dependensi = (x.dependensi || []).filter(function (d) { return d.kegiatanId !== id; });
    });
    state.penugasan = state.penugasan.filter(function (t) { return t.kegiatanId !== id; });
    if ($('#kegId').value === id) bersihkanFormKegiatan();
    toast('Kegiatan "' + k.nama + '" dihapus.');
    simpan();
  }

  /* ================================================================ */
  /* TIM                                                               */
  /* ================================================================ */
  function isiSelectPeran() {
    $('#angPeran').innerHTML = (C.PERAN || []).map(function (p) {
      return '<option value="' + esc(p) + '">' + esc(p) + '</option>';
    }).join('');
  }

  function isiSelectAnggota() {
    var pilih = $('#pasAnggota').value;
    $('#pasAnggota').innerHTML = state.tim.length
      ? state.tim.map(function (a) { return '<option value="' + esc(a.id) + '">' + esc(a.nama) + ' — ' + esc(a.peran) + '</option>'; }).join('')
      : '<option value="">— belum ada anggota —</option>';
    if (pilih && $('#pasAnggota').querySelector('option[value="' + CSS.escape(pilih) + '"]')) $('#pasAnggota').value = pilih;
  }

  function renderTabelAnggota() {
    if (!state.tim.length) {
      $('#tabelAnggota').innerHTML = '<tr><td colspan="5" class="kosong">Belum ada anggota tim.</td></tr>';
      return;
    }
    $('#tabelAnggota').innerHTML = state.tim.map(function (a) {
      var libur = (a.liburPribadi || []).map(function (t) {
        return '<span class="chip">' + esc(S.tanggalPendek(t)) + '</span>';
      }).join('') || '<span class="kosong">—</span>';
      return '<tr>' +
        '<td><strong>' + esc(a.nama) + '</strong></td>' +
        '<td><span class="chip chip-hijau">' + esc(a.peran) + '</span></td>' +
        '<td>' + esc(a.kontak || '—') + '</td>' +
        '<td>' + libur + '</td>' +
        '<td class="aksi-cell">' +
          '<button type="button" class="btn btn-kecil" data-ubah-ang="' + esc(a.id) + '">Ubah</button>' +
          '<button type="button" class="btn btn-kecil btn-bahaya-kecil" data-hapus-ang="' + esc(a.id) + '">Hapus</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  function renderTabelPenugasan() {
    if (!state.penugasan.length) {
      $('#tabelPenugasan').innerHTML = '<tr><td colspan="5" class="kosong">Belum ada penugasan.</td></tr>';
      return;
    }
    $('#tabelPenugasan').innerHTML = state.penugasan.map(function (t) {
      var ang = state.tim.find(function (x) { return x.id === t.anggotaId; });
      return '<tr>' +
        '<td>' + esc(namaKegiatan(t.kegiatanId)) + '</td>' +
        '<td>' + esc(ang ? ang.nama : t.anggotaId) + '</td>' +
        '<td>' + esc(ang ? ang.peran : '—') + '</td>' +
        '<td>' + esc(ang ? (ang.kontak || '—') : '—') + '</td>' +
        '<td class="aksi-cell"><button type="button" class="btn btn-kecil btn-bahaya-kecil" data-hapus-pas="' +
          esc(t.kegiatanId) + '|' + esc(t.anggotaId) + '">Hapus</button></td>' +
      '</tr>';
    }).join('');
  }

  function bersihkanFormAnggota() {
    $('#formAnggota').reset();
    $('#angId').value = '';
    $('#judulFormAnggota').textContent = 'Tambah anggota tim';
    $('#btnSimpanAnggota').textContent = 'Tambah anggota';
    $('#btnBatalAnggota').hidden = true;
  }

  function simpanAnggota(ev) {
    ev.preventDefault();
    var nama = $('#angNama').value.trim();
    if (!nama) { toast('Nama anggota wajib diisi.', 'bahaya'); return; }
    var libur = $('#angLibur').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    for (var i = 0; i < libur.length; i++) {
      if (!S.tanggalValid(libur[i])) {
        toast('Libur pribadi "' + libur[i] + '" tidak valid. Gunakan format YYYY-MM-DD.', 'bahaya');
        return;
      }
    }
    var id = $('#angId').value;
    if (id) {
      var a = state.tim.find(function (x) { return x.id === id; });
      if (a) {
        a.nama = nama; a.peran = $('#angPeran').value;
        a.kontak = $('#angKontak').value.trim(); a.liburPribadi = libur;
      }
      toast('Anggota "' + nama + '" diperbarui.');
    } else {
      state.tim.push({
        id: P.uid('a'), nama: nama, peran: $('#angPeran').value,
        kontak: $('#angKontak').value.trim(), liburPribadi: libur
      });
      toast('Anggota "' + nama + '" ditambahkan.');
    }
    bersihkanFormAnggota();
    simpan();
  }

  function ubahAnggota(id) {
    var a = state.tim.find(function (x) { return x.id === id; });
    if (!a) return;
    $('#angId').value = a.id;
    $('#angNama').value = a.nama;
    $('#angPeran').value = a.peran;
    $('#angKontak').value = a.kontak || '';
    $('#angLibur').value = (a.liburPribadi || []).join(', ');
    $('#judulFormAnggota').textContent = 'Ubah anggota tim';
    $('#btnSimpanAnggota').textContent = 'Simpan perubahan';
    $('#btnBatalAnggota').hidden = false;
    $('#angNama').focus();
  }

  function hapusAnggota(id) {
    var a = state.tim.find(function (x) { return x.id === id; });
    if (!a) return;
    if (!confirm('Hapus anggota "' + a.nama + '" beserta penugasannya?')) return;
    state.tim = state.tim.filter(function (x) { return x.id !== id; });
    state.penugasan = state.penugasan.filter(function (t) { return t.anggotaId !== id; });
    if ($('#angId').value === id) bersihkanFormAnggota();
    toast('Anggota "' + a.nama + '" dihapus.');
    simpan();
  }

  function tambahPenugasan() {
    var kid = $('#pasKegiatan').value, aid = $('#pasAnggota').value;
    if (!kid) { toast('Pilih kegiatan terlebih dahulu.', 'bahaya'); return; }
    if (!aid) { toast('Pilih anggota terle dahulu.', 'bahaya'); return; }
    var ada = state.penugasan.some(function (t) { return t.kegiatanId === kid && t.anggotaId === aid; });
    if (ada) { toast('Penugasan tersebut sudah ada.', 'bahaya'); return; }
    state.penugasan.push({ kegiatanId: kid, anggotaId: aid });
    toast('Penugasan ditambahkan.');
    simpan();
  }

  /* ================================================================ */
  /* VISUALISASI — GANTT                                               */
  /* ================================================================ */
  function renderGantt(a) {
    var area = $('#areaVisual');
    var ids = a.urutan.filter(function (id) { return a.jadwal[id]; });
    if (!ids.length || !a.durasi) { area.innerHTML = pesanKosong('Belum ada kegiatan untuk digambar.'); return; }

    var mulai = a.durasi.mulai, selesai = a.durasi.selesai;
    var totalHari = Math.max(1, S.selisihHariKalender(mulai, selesai) + 1);
    var colW = totalHari <= 400 ? 26 : (totalHari <= 900 ? 14 : 8);
    var lebar = totalHari * colW;
    var rowH = 34;
    var tinggi = ids.length * rowH;

    // ---- kepala tanggal ----
    var kepala = '';
    for (var i = 0; i < totalHari; i++) {
      var t = S.tambahHari(mulai, i);
      var d = S.parseTanggal(t);
      var dd = new Date(d);
      var hariLibur = a.kal.libur(t);
      var awalBulan = dd.getUTCDate() === 1;
      var cls = 'gantt-hari' + (hariLibur ? ' libur' : '') + (awalBulan && i > 0 ? ' bulan' : '');
      var isi = '';
      if (colW >= 20) isi = '<span>' + S.NAMA_HARI[dd.getUTCDay()].charAt(0) + '</span><span class="d">' + t.slice(8) + '</span>';
      kepala += '<div class="' + cls + '" style="width:' + colW + 'px;flex-basis:' + colW + 'px">' + isi + '</div>';
    }

    // ---- nama kegiatan ----
    var namaKolom = ids.map(function (id) {
      var k = a.peta[id];
      return '<div class="gantt-nama-cell" title="' + esc(k.nama) + '">' +
        (k.induk ? '<span class="induk">└</span>' : '') +
        '<span class="sampel-warna" style="background:' + esc(k.warna) + '"></span>' +
        '<span class="teks">' + esc(k.nama) + '</span></div>';
    }).join('');

    // ---- kolom libur + bar ----
    var kolom = '', bar = '';
    for (var h = 0; h < totalHari; h++) {
      var th = S.tambahHari(mulai, h);
      if (a.kal.libur(th)) kolom += '<div class="gantt-kolom libur" style="left:' + (h * colW) + 'px;width:' + colW + 'px"></div>';
    }

    var koor = {}; // id -> {x1,x2,y}
    ids.forEach(function (id, idx) {
      var k = a.peta[id];
      var j = a.jadwal[id];
      var x = S.selisihHariKalender(mulai, j.mulai) * colW;
      var lebarBar = Math.max(colW, (S.selisihHariKalender(j.mulai, j.selesai) + 1) * colW - 2);
      var y = idx * rowH + 6;
      koor[id] = { x1: x, x2: x + lebarBar + 2, y: y + 11 };
      bar += '<div class="gantt-bar' + (a.kritisAktivitas[id] ? ' kritis' : '') + (k.induk ? ' sub' : '') +
        '" style="left:' + x + 'px;top:' + y + 'px;width:' + lebarBar + 'px;background:' + esc(k.warna) + '"' +
        ' title="' + esc(k.nama) + ' · ' + esc(S.tanggalPanjang(j.mulai)) + ' → ' + esc(S.tanggalPanjang(j.selesai)) +
        ' · ' + k.durasi + ' hari kerja">' + esc(k.nama) + '</div>';
    });

    // ---- garis dependensi ----
    var links = '';
    ids.forEach(function (id) {
      (a.peta[id].dependensi || []).forEach(function (d) {
        if (!koor[d.kegiatanId] || !koor[id]) return;
        var p = koor[d.kegiatanId], q = koor[id];
        var kritis = a.kritisAktivitas[d.kegiatanId] && a.kritisAktivitas[id];
        var warna = kritis ? '#dc2626' : '#94a3b8';
        var url = kritis ? 'url(#panahMerah)' : 'url(#panahAbu)';
        var offset = Math.min(36, Math.max(14, Math.abs(q.x1 - p.x2) / 2 + 14));
        var arah = q.x1 > p.x2 ? 1 : -1;
        var dPath = 'M ' + p.x2 + ' ' + p.y +
          ' C ' + (p.x2 + offset * arah) + ' ' + p.y + ', ' + (q.x1 - offset * arah) + ' ' + q.y + ', ' + (q.x1 - 6) + ' ' + q.y;
        links += '<path d="' + dPath + '" stroke="' + warna + '" stroke-width="' + (kritis ? 2.2 : 1.5) +
          '" fill="none" marker-end="' + url + '"/>';
      });
    });

    area.innerHTML =
      '<div class="gantt-scroll">' +
        '<div class="gantt-kepala">' +
          '<div class="gantt-nama gantt-nama-kepala">Kegiatan</div>' +
          '<div class="gantt-lane" style="width:' + lebar + 'px">' + kepala + '</div>' +
        '</div>' +
        '<div class="gantt-badan">' +
          '<div class="gantt-nama-col">' + namaKolom + '</div>' +
          '<div class="gantt-lanes" style="width:' + lebar + 'px;height:' + tinggi + 'px">' +
            '<div class="gantt-grid" style="background-image:repeating-linear-gradient(to right,#eef2f7 0,#eef2f7 1px,transparent 1px,transparent ' + colW + 'px)"></div>' +
            kolom + bar +
            '<svg class="gantt-links" width="' + lebar + '" height="' + tinggi + '">' +
              '<defs>' +
                '<marker id="panahAbu" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">' +
                  '<path d="M0,0 L7,3.5 L0,7 z" fill="#94a3b8"/></marker>' +
                '<marker id="panahMerah" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">' +
                  '<path d="M0,0 L7,3.5 L0,7 z" fill="#dc2626"/></marker>' +
              '</defs>' + links +
            '</svg>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="legend">' +
        '<span><i class="kotak-kritis"></i> batang bergaris merah = kegiatan jalur kritis</span>' +
        '<span><i class="kotak-libur"></i> kolom abu-abu = hari libur</span>' +
        '<span>panah = hubungan antarkegiatan (FS/SS/FF/SF + jeda)</span>' +
        '<span>rentang: ' + esc(S.tanggalPanjang(mulai)) + ' → ' + esc(S.tanggalPanjang(selesai)) + '</span>' +
      '</div>';
  }

  /* ================================================================ */
  /* VISUALISASI — PERT & JARINGAN                                    */
  /* ================================================================ */
  function renderDiagram(a, mode) {
    var area = $('#areaVisual');
    var ids = a.urutan.filter(function (id) { return a.jadwal[id]; });
    if (!ids.length) { area.innerHTML = pesanKosong('Belum ada kegiatan untuk digambar.'); return; }

    // level = jarak terpanjang dari kegiatan akar
    var level = {};
    var petaPred = {};
    ids.forEach(function (id) { petaPred[id] = []; });
    ids.forEach(function (id) {
      (a.peta[id].dependensi || []).forEach(function (d) {
        if (petaPred[d.kegiatanId] && d.kegiatanId !== id) petaPred[id].push(d.kegiatanId);
      });
    });
    function hitungLevel(id) {
      if (level[id] !== undefined) return level[id];
      level[id] = 0; // pengaman siklus
      var l = 0;
      (petaPred[id] || []).forEach(function (p) { l = Math.max(l, hitungLevel(p) + 1); });
      level[id] = l;
      return l;
    }
    ids.forEach(hitungLevel);

    var perLevel = [];
    ids.forEach(function (id) {
      var l = level[id] || 0;
      if (!perLevel[l]) perLevel[l] = [];
      perLevel[l].push(id);
    });
    // pastikan tidak ada lubang antar tingkat
    for (var lv = 0; lv < perLevel.length; lv++) if (!perLevel[lv]) perLevel[lv] = [];

    var pert = mode === 'pert';
    var lebarNode = 200;
    var tinggiNode = pert ? 96 : 74;
    var gapX = 96, gapY = 34, pad = 30;
    var W = pad * 2 + perLevel.length * (lebarNode + gapX);
    var maksBaris = 1;
    perLevel.forEach(function (list) { if (list.length > maksBaris) maksBaris = list.length; });
    var H = pad * 2 + maksBaris * (tinggiNode + gapY);

    var posisi = {};
    perLevel.forEach(function (list, l) {
      (list || []).forEach(function (id, i) {
        posisi[id] = {
          x: pad + l * (lebarNode + gapX),
          y: pad + i * (tinggiNode + gapY)
        };
      });
    });

    // panah
    var edges = '';
    ids.forEach(function (id) {
      (a.peta[id].dependensi || []).forEach(function (d) {
        if (!posisi[d.kegiatanId] || !posisi[id]) return;
        var p = posisi[d.kegiatanId], q = posisi[id];
        var x1 = p.x + lebarNode, y1 = p.y + tinggiNode / 2;
        var x2 = q.x, y2 = q.y + tinggiNode / 2;
        var kritis = a.kritisAktivitas[d.kegiatanId] && a.kritisAktivitas[id];
        var offset = 40;
        var dPath = 'M ' + x1 + ' ' + y1 + ' C ' + (x1 + offset) + ' ' + y1 + ', ' + (x2 - offset) + ' ' + y2 + ', ' + (x2 - 7) + ' ' + y2;
        edges += '<path class="edge' + (kritis ? ' kritis' : '') + '" d="' + dPath +
          '" marker-end="' + (kritis ? 'url(#panahMerah)' : 'url(#panahAbu)') + '"/>' +
          '<text class="node-info" x="' + ((x1 + x2) / 2) + '" y="' + ((y1 + y2) / 2 - 6) + '" text-anchor="middle">' +
          esc(d.tipe) + '+' + d.jeda + '</text>';
      });
    });

    // simpul
    var nodes = ids.map(function (id) {
      var k = a.peta[id], j = a.jadwal[id], p = posisi[id];
      var kritis = !!a.kritisAktivitas[id];
      var judul = potong(k.nama, 30);
      var isi = '';
      if (pert) {
        isi =
          '<text class="node-nama" x="' + (p.x + 12) + '" y="' + (p.y + 21) + '">' + esc(judul) + '</text>' +
          '<text class="node-info" x="' + (p.x + 12) + '" y="' + (p.y + 41) + '">Durasi: ' + k.durasi + ' hari kerja</text>' +
          '<text class="node-info" x="' + (p.x + 12) + '" y="' + (p.y + 59) + '">Mulai ' + esc(S.tanggalPendek(j.mulai)) +
            ' → Selesai ' + esc(S.tanggalPendek(j.selesai)) + '</text>' +
          '<text class="node-info" x="' + (p.x + 12) + '" y="' + (p.y + 77) + '">Lonjakan total: ' +
            (a.float[id] !== undefined ? a.float[id] : 0) + ' hari</text>' +
          (kritis ? '<text class="node-tag" x="' + (p.x + 12) + '" y="' + (p.y + 91) + '">★ JALUR KRITIS</text>' : '');
      } else {
        isi =
          '<text class="node-nama" x="' + (p.x + 12) + '" y="' + (p.y + 22) + '">' + esc(judul) + '</text>' +
          '<text class="node-info" x="' + (p.x + 12) + '" y="' + (p.y + 42) + '">' + k.durasi + ' hari · ' +
            esc(S.tanggalPendek(j.mulai)) + ' → ' + esc(S.tanggalPendek(j.selesai)) + '</text>' +
          (kritis ? '<text class="node-tag" x="' + (p.x + 12) + '" y="' + (p.y + 62) + '">★ KRITIS</text>' : '');
      }
      return '<g><title>' + esc(k.nama) + ' (' + esc(S.tanggalPanjang(j.mulai)) + ' → ' + esc(S.tanggalPanjang(j.selesai)) + ')</title>' +
        '<rect class="' + (kritis ? 'node-kritis' : 'node-normal') + '" x="' + p.x + '" y="' + p.y +
        '" width="' + lebarNode + '" height="' + tinggiNode + '" rx="10"/>' + isi + '</g>';
    }).join('');

    area.innerHTML =
      '<div class="diagram-scroll"><svg width="' + W + '" height="' + H + '" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
          '<marker id="panahAbu" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">' +
            '<path d="M0,0 L7,3.5 L0,7 z" fill="#94a3b8"/></marker>' +
          '<marker id="panahMerah" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">' +
            '<path d="M0,0 L7,3.5 L0,7 z" fill="#dc2626"/></marker>' +
        '</defs>' +
        edges + nodes +
      '</svg></div>' +
      '<div class="legend">' +
        '<span><i class="kotak-kritis"></i> simpul/panah merah = jalur kritis</span>' +
        '<span>label panah = tipe hubungan + jeda (hari kerja)</span>' +
        '<span>arah panah = ketergantungan antarkegiatan</span>' +
      '</div>';
  }

  function potong(teks, n) {
    teks = String(teks || '');
    return teks.length > n ? teks.slice(0, n - 1) + '…' : teks;
  }

  function renderVisual(a) {
    var btn = $$('[data-mode]');
    btn.forEach(function (b) {
      b.classList.toggle('btn-utama', b.getAttribute('data-mode') === modeVisual);
    });
    var ket = {
      gantt: 'Batang waktu per kegiatan di atas garis waktu harian; kolom abu-abu = hari libur, panah = dependensi, garis merah tebal = jalur kritis.',
      pert: 'Diagram PERT: tiap simpul menampilkan durasi, tanggal mulai/selesai, dan lonjakan total (total float) kegiatan.',
      jaringan: 'Diagram jaringan (activity-on-node): hubungan antarkegiatan beserta tipe dan jeda; jalur kritis ditandai merah.'
    };
    $('#keteranganVisual').textContent = ket[modeVisual] || '';
    if (!state.kegiatan.length) {
      $('#areaVisual').innerHTML = pesanKosong('Belum ada kegiatan. Buka tab "2. Daftar kegiatan" atau muat contoh terlebih dahulu.');
      return;
    }
    if (modeVisual === 'gantt') renderGantt(a);
    else renderDiagram(a, modeVisual);
  }

  /* ================================================================ */
  /* JALUR KRITIS                                                      */
  /* ================================================================ */
  function renderJalur(a) {
    var ringkas = $('#ringkasJalur');
    var tabel = $('#tabelJalur');
    var kritis = $('#daftarKritis');
    var catatan = $('#catatanJalur');

    if (!state.kegiatan.length || !a.durasi) {
      ringkas.innerHTML = '<div class="ringkas-item"><div class="label">Belum ada data</div><div class="nilai">—</div></div>';
      tabel.innerHTML = '<tr><td colspan="6" class="kosong">Belum ada kegiatan untuk dianalisis.</td></tr>';
      kritis.innerHTML = '<span class="kosong">—</span>';
      catatan.textContent = '';
      return;
    }

    var k = a.kritis;
    ringkas.innerHTML =
      '<div class="ringkas-item">' +
        '<div class="label">Estimasi lama proyek</div>' +
        '<div class="nilai">' + a.durasi.hariKerja + ' hari kerja</div>' +
        '<div class="label">' + a.durasi.hariKalender + ' hari kalender · ' +
          esc(S.tanggalPendek(a.durasi.mulai)) + ' → ' + esc(S.tanggalPendek(a.durasi.selesai)) + '</div>' +
      '</div>' +
      '<div class="ringkas-item merah">' +
        '<div class="label">Jalur kritis (terpanjang)</div>' +
        '<div class="nilai">' + (k ? k.total + ' hari' : '—') + '</div>' +
        '<div class="label">' + (k ? esc(k.nama.join(' → ')) : 'tidak ada jalur') + '</div>' +
      '</div>' +
      '<div class="ringkas-item">' +
        '<div class="label">Jumlah jalur awal → akhir</div>' +
        '<div class="nilai">' + a.jalur.length + '</div>' +
        '<div class="label">' + (a.terpotong ? 'terpotong (batas ' + 3000 + ' jalur)' : 'seluruh jalur ditampilkan') + '</div>' +
      '</div>' +
      '<div class="ringkas-item">' +
        '<div class="label">Kegiatan</div>' +
        '<div class="nilai">' + state.kegiatan.length + '</div>' +
        '<div class="label">' + state.tim.length + ' anggota tim</div>' +
      '</div>';

    if (!a.jalur.length) {
      tabel.innerHTML = '<tr><td colspan="6" class="kosong">Tidak ada jalur (periksa pesan masalah di tab kegiatan).</td></tr>';
    } else {
      tabel.innerHTML = a.jalur.map(function (j, i) {
        return '<tr' + (j.kritis ? ' class="jalur-kritis"' : '') + '>' +
          '<td class="kanan">' + (i + 1) + '</td>' +
          '<td>' + esc(j.nama.join('  →  ')) + '</td>' +
          '<td class="kanan">' + j.ids.length + '</td>' +
          '<td class="kanan"><strong>' + j.total + '</strong></td>' +
          '<td class="kanan">' + j.jeda + '</td>' +
          '<td>' + (j.kritis ? '<span class="status-kritis">JALUR KRITIS (terpanjang)</span>' : '<span class="status-normal">jalur paralel</span>') + '</td>' +
        '</tr>';
      }).join('');
    }

    var masalah = a.masalah.length
      ? '<span class="chip chip-merah">Ada masalah: ' + esc(a.masalah.join(' ')) + '</span> '
      : '';
    catatan.innerHTML = masalah +
      'Total durasi = jumlah hari kerja seluruh kegiatan pada jalur; jalur dengan total terbesar ditandai merah. ' +
      'Estimasi lama proyek dihitung dari jadwal aktual (melewati hari libur), sehingga dapat berbeda bila terdapat jeda dependensi atau kegiatan paralel.';

    var ids = Object.keys(a.kritisAktivitas);
    kritis.innerHTML = ids.length
      ? ids.map(function (id) { return '<span class="chip chip-merah">' + esc(namaKegiatan(id)) + '</span>'; }).join('')
      : '<span class="kosong">—</span>';
  }

  /* ================================================================ */
  /* RENDER UTAMA                                                      */
  /* ================================================================ */
  function renderSemua() {
    var a = S.analisis(state.proyek, state.kegiatan);
    hasilAnalisis = a;
    var judul = state.proyek.nama || 'Belum ada proyek';
    if (state.proyek.organisasi) judul += ' — ' + state.proyek.organisasi;
    $('#judulProyek').textContent = judul;
    isiSelectKegiatan();
    isiSelectAnggota();
    renderDaftarDep();
    renderTabelKegiatan(a);
    renderTabelAnggota();
    renderTabelPenugasan();
    renderTabelLibur();
    renderJalur(a);
    if (tabAktif === 'visual') renderVisual(a);
  }

  function bukaTab(nama) {
    tabAktif = nama;
    $$('.tab-btn').forEach(function (b) { b.classList.toggle('aktif', b.getAttribute('data-tab') === nama); });
    $$('.tab-isi').forEach(function (s) { s.classList.toggle('aktif', s.id === 'tab-' + nama); });
    if (nama === 'visual' && hasilAnalisis) renderVisual(hasilAnalisis);
    if (nama === 'pengaturan') isiFormPengaturan();
  }

  /* ================================================================ */
  /* CONTOH, EKSPOR, IMPOR                                             */
  /* ================================================================ */
  function muatContoh(fn) {
    if (state.kegiatan.length && !confirm('Muat contoh akan mengganti data proyek saat ini. Lanjutkan?')) return;
    state = fn();
    bersihkanFormKegiatan();
    bersihkanFormAnggota();
    isiFormPengaturan();
    simpan();
    toast('Contoh dimuat. Periksa tab 4 (visualisasi) dan 5 (jalur kritis).');
  }

  function eksporJSON() {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = P.namaBerkas(state);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('Data diekspor sebagai ' + a.download);
  }

  function imporJSON(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var data;
      try {
        data = JSON.parse(String(reader.result));
      } catch (e) {
        toast('Berkas bukan JSON yang valid.', 'bahaya');
        return;
      }
      var bersih = P.normalisasi(data);
      if (!bersih) {
        toast('Struktur data tidak sesuai (tidak ada daftar "kegiatan").', 'bahaya');
        return;
      }
      state = bersih;
      bersihkanFormKegiatan();
      bersihkanFormAnggota();
      isiFormPengaturan();
      simpan();
      toast('Data berhasil diimpor: ' + state.kegiatan.length + ' kegiatan, ' + state.tim.length + ' anggota.');
    };
    reader.onerror = function () { toast('Berkas gagal dibaca.', 'bahaya'); };
    reader.readAsText(file);
  }

  function resetData() {
    if (!confirm('Hapus seluruh data proyek dari browser ini?')) return;
    state = P.kosong();
    P.hapus();
    bersihkanFormKegiatan();
    bersihkanFormAnggota();
    isiFormPengaturan();
    simpan();
    toast('Data dibersihkan.');
  }

  /* ================================================================ */
  /* EVENT                                                             */
  /* ================================================================ */
  function pasangEvent() {
    $('#tabBar').addEventListener('click', function (ev) {
      var b = ev.target.closest('.tab-btn');
      if (b) bukaTab(b.getAttribute('data-tab'));
    });

    // pengaturan
    $('#btnSimpanPengaturan').addEventListener('click', simpanPengaturan);
    $('#liburMingguan').addEventListener('change', function () {
      if (!validasiLiburMingguan()) {
        // kembalikan centang ke keadaan tersimpan
        $$('#liburMingguan input').forEach(function (cb) {
          cb.checked = state.proyek.liburMingguan.map(Number).indexOf(Number(cb.value)) >= 0;
        });
        return;
      }
      state.proyek.liburMingguan = bacaLiburMingguan();
      simpan();
      toast('Hari libur mingguan diperbarui.');
    });

    $('#btnTambahLibur').addEventListener('click', function () {
      var nama = $('#liburNama').value.trim();
      var tanggal = $('#liburTanggal').value;
      var pola = $('#liburPola').value;
      if (!nama) { toast('Nama libur wajib diisi.', 'bahaya'); return; }
      if (!S.tanggalValid(tanggal)) { toast('Tanggal libur tidak valid.', 'bahaya'); return; }
      state.proyek.liburKhusus.push({
        id: P.uid('libur'), nama: nama, tanggal: tanggal,
        berulang: pola !== 'sekali', pola: pola
      });
      $('#liburNama').value = '';
      $('#liburTanggal').value = '';
      toast('Libur khusus ditambahkan.');
      simpan();
    });

    $('#tabelLibur').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-hapus-libur]');
      if (!b) return;
      var id = b.getAttribute('data-hapus-libur');
      state.proyek.liburKhusus = state.proyek.liburKhusus.filter(function (l) { return l.id !== id; });
      toast('Libur khusus dihapus.');
      simpan();
    });

    // kegiatan
    $('#formKegiatan').addEventListener('submit', simpanKegiatan);
    $('#btnBatalKegiatan').addEventListener('click', bersihkanFormKegiatan);
    $('#btnTambahDep').addEventListener('click', function () {
      var kid = $('#depKegiatan').value;
      if (!kid) { toast('Pilih kegiatan pendahulu terlebih dahulu.', 'bahaya'); return; }
      if (kid === $('#kegId').value) { toast('Kegiatan tidak boleh bergantung pada dirinya sendiri.', 'bahaya'); return; }
      var tipe = $('#depTipe').value;
      var jeda = Math.round(Number($('#depJeda').value));
      if (!isFinite(jeda) || jeda < 0) jeda = 0;
      var sama = depsSementara.some(function (d) { return d.kegiatanId === kid && d.tipe === tipe; });
      if (sama) { toast('Hubungan tersebut sudah ada.', 'bahaya'); return; }
      depsSementara.push({ kegiatanId: kid, tipe: tipe, jeda: jeda });
      renderDaftarDep();
    });
    $('#daftarDep').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-hapus-dep]');
      if (!b) return;
      depsSementara.splice(Number(b.getAttribute('data-hapus-dep')), 1);
      renderDaftarDep();
    });
    $('#tabelKegiatan').addEventListener('click', function (ev) {
      var ubah = ev.target.closest('[data-ubah-keg]');
      var hapus = ev.target.closest('[data-hapus-keg]');
      if (ubah) ubahKegiatan(ubah.getAttribute('data-ubah-keg'));
      if (hapus) hapusKegiatan(hapus.getAttribute('data-hapus-keg'));
    });

    // tim
    $('#formAnggota').addEventListener('submit', simpanAnggota);
    $('#btnBatalAnggota').addEventListener('click', bersihkanFormAnggota);
    $('#tabelAnggota').addEventListener('click', function (ev) {
      var ubah = ev.target.closest('[data-ubah-ang]');
      var hapus = ev.target.closest('[data-hapus-ang]');
      if (ubah) ubahAnggota(ubah.getAttribute('data-ubah-ang'));
      if (hapus) hapusAnggota(hapus.getAttribute('data-hapus-ang'));
    });
    $('#btnTambahPas').addEventListener('click', tambahPenugasan);
    $('#tabelPenugasan').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-hapus-pas]');
      if (!b) return;
      var bagian = b.getAttribute('data-hapus-pas').split('|');
      state.penugasan = state.penugasan.filter(function (t) {
        return !(t.kegiatanId === bagian[0] && t.anggotaId === bagian[1]);
      });
      toast('Penugasan dihapus.');
      simpan();
    });

    // visualisasi
    $$('[data-mode]').forEach(function (b) {
      b.addEventListener('click', function () {
        modeVisual = b.getAttribute('data-mode');
        if (hasilAnalisis) renderVisual(hasilAnalisis);
      });
    });

    // toolbar
    $('#btnContohA').addEventListener('click', function () { muatContoh(C.servis40Laptop); });
    $('#btnContohB').addEventListener('click', function () { muatContoh(C.jalurKritis); });
    $('#btnEkspor').addEventListener('click', eksporJSON);
    $('#inpImpor').addEventListener('change', function (ev) {
      var f = ev.target.files && ev.target.files[0];
      if (f) imporJSON(f);
      ev.target.value = '';
    });
    $('#btnReset').addEventListener('click', resetData);
  }

  /* ================================================================ */
  function mulai() {
    isiSelectPeran();
    isiFormPengaturan();
    pasangEvent();
    renderSemua();
    bukaTab('pengaturan');
    $('#statusSimpan').textContent = '';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai);
  else mulai();
})();
