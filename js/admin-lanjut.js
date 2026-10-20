/**
 * admin-lanjut.js — Modul admin lanjutan: Grand Prize & undian, Form Builder, Laporan, Konten About,
 * Migrasi Data, Backup & Restore, Pengaturan (dummy) & Audit Log.
 */
(function () {
  'use strict';
  var U = UI, $ = U.$, $$ = U.$$, esc = U.esc, ic = U.ic, Admin = window.Admin, A = Admin.A, H = Admin.h, req = H.req;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function modalOpen() { return !!document.querySelector('[data-overlay]'); }
  function field(id, label, inp, hint) { return '<div><label class="label" for="' + id + '">' + esc(label) + '</label>' + inp + (hint ? '<p class="hint">' + esc(hint) + '</p>' : '') + '</div>'; }
  function sel(id, name, opts, val) { return '<select class="field" id="' + id + '" name="' + name + '">' + opts.map(function (o) { return '<option value="' + esc(o.v) + '"' + (String(o.v) === String(val) ? ' selected' : '') + '>' + esc(o.l) + '</option>'; }).join('') + '</select>'; }

  // =====================================================================
  //  GRAND PRIZE & UNDIAN
  // =====================================================================
  Admin.views.grandprize = function (main) {
    var rows = H.list('program');
    main.innerHTML = H.pageHead('Grand Prize', 'Atur program hadiah, syarat kehadiran, dan jalankan undian transparan.', '<button class="btn btn-primary btn-sm" data-add="program">' + ic('plus', 'w-4 h-4') + ' Tambah program</button>') +
      '<div class="grid md:grid-cols-2 xl:grid-cols-3 gap-5">' + (rows.length ? rows.map(function (g) {
        var tone = g.Status === 'Aktif' ? 'badge-ok' : g.Status === 'Selesai' ? 'badge-warn' : 'badge-off';
        return '<div class="card overflow-hidden flex flex-col">' + U.art(g.Gambar_URL, g.ID, 'aspect-[16/8]', g.Nama_Hadiah) + '<div class="p-5 flex flex-col gap-3 flex-1"><div class="flex items-start justify-between gap-3"><h3 class="font-display text-xl font-semibold leading-snug">' + esc(g.Nama_Hadiah) + '</h3><span class="badge ' + tone + '">' + esc(g.Status) + '</span></div>' +
          '<p class="text-sm text-muted line-clamp-2">' + esc(g.Deskripsi) + '</p><ul class="text-sm space-y-1.5">' +
          '<li class="flex items-center gap-2">' + ic('circle-check', 'w-4 h-4 text-gold-ink') + 'Minimal hadir <strong>' + esc(g.Min_Kehadiran) + '×</strong> di <strong>' + esc(String(g.Kategori_Syarat || '').split('|').join(', ') || 'semua kegiatan') + '</strong></li><li class="flex items-center gap-2">' + ic('users', 'w-4 h-4 text-gold-ink') + '<strong>' + esc(g.Jumlah_Pemenang) + '</strong> pemenang</li>' +
          (g.Periode_Mulai || g.Periode_Selesai ? '<li class="flex items-center gap-2">' + ic('calendar-days', 'w-4 h-4 text-gold-ink') + (g.Periode_Mulai ? U.fmtTgl(g.Periode_Mulai) : '…') + ' – ' + (g.Periode_Selesai ? U.fmtTgl(g.Periode_Selesai) : '…') + '</li>' : '') + '</ul>' +
          '<div class="flex gap-2 mt-auto pt-2"><button class="btn btn-solid-gold btn-sm flex-1" data-undi="' + esc(g.ID) + '">' + ic('shuffle', 'w-4 h-4') + ' Undian</button><button class="btn btn-ghost btn-sm btn-icon" data-edit="program" data-id="' + esc(g.ID) + '" aria-label="Ubah">' + ic('pencil', 'w-4 h-4') + '</button><button class="btn btn-ghost btn-sm btn-icon text-danger" data-del="program" data-id="' + esc(g.ID) + '" data-label="' + esc(g.Nama_Hadiah) + '" aria-label="Hapus">' + ic('trash-2', 'w-4 h-4') + '</button></div></div></div>'; }).join('') : App.emptyState('trophy', 'Belum ada program', 'Buat program Grand Prize pertama Anda.')) + '</div>';
  };
  function roll(names, el, ms) {
    if (reduce || !names.length) return Promise.resolve();
    var t0 = Date.now(); return new Promise(function (res) { var iv = setInterval(function () { el.textContent = names[Math.floor(Math.random() * names.length)]; if (Date.now() - t0 > ms) { clearInterval(iv); res(); } }, 70); });
  }
  function openUndian(pid) {
    var data = null;
    var m = U.modal(U.modalHead('Undian Grand Prize') + '<div class="px-6 pb-6" id="ud-body">' + App.sk(1, 200) + '</div>', { label: 'Undian', wide: true, sticky: true });
    function draw() {
      var d = data, tampil = d.pemenang.length && d.pemenang.every(function (w) { return w.tampil; });
      $('#ud-body', m.el).innerHTML = '<div class="text-center rounded-3xl p-6 gold-banner"><p class="text-xs font-bold tracking-widest uppercase">Hadiah</p><h3 class="font-display text-3xl font-semibold mt-1 !text-[#251a00]">' + esc(d.program.nama) + '</h3><p class="mt-2 text-sm font-medium">' + d.layak.length + ' peserta memenuhi syarat (min. hadir ' + d.program.min + '× di ' + esc((d.program.kategori || []).join(', ') || 'semua kegiatan') + ') · ' + d.program.pemenang + ' pemenang</p></div>' +
        '<div class="mt-5 rounded-3xl bg-brand text-on-brand text-center py-10 px-4 min-h-[140px] flex items-center justify-center" style="background:linear-gradient(135deg,#0B3D2E,#06201A)"><div id="ud-stage" class="font-display text-3xl sm:text-4xl font-semibold text-[#ffdf96] break-words" aria-live="polite">' +
        (d.pemenang.length ? d.pemenang.map(function (w) { return '<div class="py-1">' + U.star('w-5 h-5 inline -mt-1 mr-2') + esc(w.nama) + '</div>'; }).join('') : '<span class="text-white/60 text-xl">Tekan “Mulai Undian”</span>') + '</div></div>' +
        '<p class="text-xs text-muted mt-3 text-center">Pemilihan acak dilakukan di server dan disimpan ke sheet <em>Undian</em>. Hasil yang sudah ditayangkan tidak ikut diundi ulang.</p>' +
        '<div class="flex flex-wrap gap-3 justify-between mt-5"><button class="btn btn-ghost" data-close>Tutup</button><div class="flex flex-wrap gap-3 justify-end">' +
        (d.pemenang.length ? '<button class="btn ' + (tampil ? 'btn-ghost' : 'btn-gold') + '" id="ud-pub">' + ic(tampil ? 'eye' : 'upload', 'w-4 h-4') + (tampil ? ' Sembunyikan dari publik' : ' Tayangkan di situs') + '</button>' : '') +
        '<button class="btn btn-primary" id="ud-run">' + ic('shuffle', 'w-4 h-4') + (d.pemenang.length ? ' Undi ulang' : ' Mulai Undian') + '</button></div></div>' +
        '<details class="mt-5"><summary class="text-sm font-medium cursor-pointer">Daftar peserta layak (' + d.layak.length + ')</summary><ul class="mt-3 max-h-48 overflow-y-auto divide-y divide-line rounded-2xl border border-line">' + d.layak.map(function (x) { return '<li class="px-4 py-2 text-sm flex justify-between"><span>' + esc(x.nama) + '</span><span class="text-muted">' + x.hadir + '×</span></li>'; }).join('') + '</ul></details>';
      $('#ud-run', m.el).onclick = run; var pub = $('#ud-pub', m.el); if (pub) pub.onclick = function () { togglePub(!tampil); };
    }
    function load() { return req('programLayak', { programId: pid }).then(function (r) { if (!r.success) { U.toast(r.message, 'error'); m.close(); return; } data = r.data; draw(); }); }
    function run() {
      var btn = $('#ud-run', m.el); U.busy(btn, true, 'Mengundi…'); var stage = $('#ud-stage', m.el), names = data.layak.map(function (x) { return x.nama; });
      stage.className = 'font-display text-4xl font-semibold text-white';
      Promise.all([roll(names, stage, 2400), req('undianJalankan', { programId: pid })]).then(function (arr) {
        var r = arr[1]; U.busy(btn, false);
        if (!r.success) { U.toast(r.message, 'error'); return load(); }
        U.toast('Undian selesai', 'ok'); load();
      });
    }
    function togglePub(on) { req('undianTampil', { programId: pid, tampil: on }).then(function (r) { if (!r.success) return U.toast(r.message, 'error'); U.toast(on ? 'Pemenang ditayangkan di situs' : 'Pemenang disembunyikan', 'ok'); H.afterChange(); load(); }); }
    load();
  }

  // =====================================================================
  //  FORM BUILDER
  // =====================================================================
  var FT = [{ v: 'text', l: 'Teks pendek' }, { v: 'textarea', l: 'Paragraf' }, { v: 'number', l: 'Angka' }, { v: 'date', l: 'Tanggal' }, { v: 'select', l: 'Dropdown' }, { v: 'radio', l: 'Pilihan tunggal' }, { v: 'checkbox', l: 'Kotak centang' }, { v: 'rating', l: 'Penilaian 1–5' }, { v: 'yesno', l: 'Ya / Tidak' }];
  Admin.views.form = function (main) {
    var rows = H.list('form');
    main.innerHTML = H.pageHead('Form Builder', 'Buat survei atau formulir pendaftaran tanpa coding.', '<button class="btn btn-primary btn-sm" data-form-new>' + ic('plus', 'w-4 h-4') + ' Buat formulir</button>') +
      '<div class="grid md:grid-cols-2 xl:grid-cols-3 gap-5">' + (rows.length ? rows.map(function (f) {
        var tone = f.Status === 'Aktif' ? 'badge-ok' : f.Status === 'Draf' ? 'badge-warn' : 'badge-off';
        return '<div class="card p-5 flex flex-col gap-3"><div class="flex items-start justify-between gap-3"><h3 class="font-display text-xl font-semibold leading-snug">' + esc(f.Judul) + '</h3><span class="badge ' + tone + '">' + esc(f.Status) + '</span></div><p class="text-sm text-muted line-clamp-2">' + esc(f.Deskripsi) + '</p>' +
          '<p class="text-sm flex items-center gap-4"><span class="flex items-center gap-1.5">' + ic('list-checks', 'w-4 h-4 text-gold-ink') + (f.fields || []).length + ' pertanyaan</span><span class="flex items-center gap-1.5">' + ic('inbox', 'w-4 h-4 text-gold-ink') + f.jumlahRespons + ' respons</span></p>' +
          '<div class="flex flex-wrap gap-2 mt-auto pt-1"><button class="btn btn-gold btn-sm" data-form-resp="' + esc(f.ID) + '">Respons</button><button class="btn btn-ghost btn-sm" data-form-edit="' + esc(f.ID) + '">' + ic('pencil', 'w-4 h-4') + ' Ubah</button><button class="btn btn-ghost btn-sm btn-icon" data-form-dup="' + esc(f.ID) + '" aria-label="Duplikat">' + ic('copy', 'w-4 h-4') + '</button><button class="btn btn-ghost btn-sm btn-icon text-danger" data-form-del="' + esc(f.ID) + '" aria-label="Hapus">' + ic('trash-2', 'w-4 h-4') + '</button></div></div>'; }).join('') : App.emptyState('clipboard-list', 'Belum ada formulir', 'Buat formulir pertama untuk mengumpulkan masukan jamaah.')) + '</div>';
  };
  function reloadForms() { return req('formAdminList').then(function (r) { if (r.success) { A.boot.form = r.data; H.render(); } H.afterChange(); }); }
  function openBuilder(id) {
    var src = id ? H.list('form').filter(function (f) { return f.ID === id; })[0] : null;
    var st = { id: id || '', judul: src ? src.Judul : '', deskripsi: src ? src.Deskripsi : '', kegiatanId: src ? src.Kegiatan_ID : '', status: src ? src.Status : 'Draf', fields: src ? JSON.parse(JSON.stringify(src.fields)) : [{ id: 'q1', type: 'rating', label: 'Seberapa puas Anda?', required: true }] };
    var m = U.modal('<div id="fb"></div>', { label: 'Form builder', wide: true, sticky: true });
    function fieldRow(f, i) {
      var hasOpt = /^(select|radio|checkbox)$/.test(f.type);
      return '<div class="rounded-2xl border border-line bg-surface-2 p-4 space-y-3" data-fi="' + i + '"><div class="flex gap-2 items-start"><span class="w-7 h-7 shrink-0 rounded-full bg-brand text-on-brand text-xs font-bold flex items-center justify-center mt-2">' + (i + 1) + '</span>' +
        '<div class="flex-1 grid sm:grid-cols-5 gap-2"><input class="field sm:col-span-3" data-k="label" placeholder="Teks pertanyaan" aria-label="Pertanyaan ' + (i + 1) + '" value="' + esc(f.label) + '" maxlength="150">' + sel('', '', FT, f.type).replace('<select class="field"', '<select class="field sm:col-span-2" data-k="type" aria-label="Jenis pertanyaan ' + (i + 1) + '"') + '</div></div>' +
        (hasOpt ? '<textarea class="field ml-9" data-k="options" rows="3" placeholder="Satu pilihan per baris" aria-label="Pilihan jawaban">' + esc((f.options || []).join('\n')) + '</textarea>' : '') +
        '<div class="flex items-center justify-between ml-9"><label class="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" data-k="required"' + (f.required ? ' checked' : '') + '> Wajib diisi</label><div class="flex gap-1"><button type="button" class="btn btn-ghost btn-sm btn-icon" data-mv="-1" aria-label="Naikkan"' + (i === 0 ? ' disabled' : '') + '>' + ic('chevron-down', 'w-4 h-4 rotate-180') + '</button><button type="button" class="btn btn-ghost btn-sm btn-icon" data-mv="1" aria-label="Turunkan"' + (i === st.fields.length - 1 ? ' disabled' : '') + '>' + ic('chevron-down', 'w-4 h-4') + '</button><button type="button" class="btn btn-ghost btn-sm btn-icon text-danger" data-rm aria-label="Hapus pertanyaan">' + ic('trash-2', 'w-4 h-4') + '</button></div></div></div>';
    }
    function draw(keepFocus) {
      var scroll = $('.modal', m.el.parentNode) ? 0 : 0;
      $('#fb', m.el).innerHTML = U.modalHead(id ? 'Ubah Formulir' : 'Formulir Baru') + '<div class="px-6 pb-6 space-y-5"><div class="grid sm:grid-cols-2 gap-4"><div class="sm:col-span-2">' + '<label class="label" for="fb-j">Judul formulir <span class="text-danger">*</span></label><input class="field" id="fb-j" value="' + esc(st.judul) + '" maxlength="150"></div>' +
        '<div class="sm:col-span-2"><label class="label" for="fb-d">Deskripsi</label><textarea class="field" id="fb-d" rows="2" maxlength="500">' + esc(st.deskripsi) + '</textarea></div>' +
        field('fb-s', 'Status', sel('fb-s', 'fb-s', [{ v: 'Draf', l: 'Draf (belum tampil)' }, { v: 'Aktif', l: 'Aktif (tampil di dashboard peserta)' }, { v: 'Ditutup', l: 'Ditutup' }], st.status)) +
        field('fb-k', 'Terkait kegiatan (opsional)', sel('fb-k', 'fb-k', H.kegOptions(true).map(function (o) { return o.v === '' ? { v: '', l: '— Umum —' } : o; }), st.kegiatanId)) + '</div>' +
        '<div class="space-y-3" id="fb-fields">' + st.fields.map(fieldRow).join('') + '</div><button type="button" class="btn btn-gold btn-sm" id="fb-add">' + ic('plus', 'w-4 h-4') + ' Tambah pertanyaan</button>' +
        '<div class="flex gap-3 justify-end pt-2 border-t border-line"><button type="button" class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="fb-save">Simpan formulir</button></div></div>';
    }
    function pull() {
      st.judul = $('#fb-j', m.el).value; st.deskripsi = $('#fb-d', m.el).value; st.status = $('#fb-s', m.el).value; st.kegiatanId = $('#fb-k', m.el).value;
      $$('[data-fi]', m.el).forEach(function (row) {
        var f = st.fields[+row.dataset.fi]; f.label = $('[data-k=label]', row).value; f.type = $('[data-k=type]', row).value; f.required = $('[data-k=required]', row).checked;
        var o = $('[data-k=options]', row); if (o) f.options = o.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); else delete f.options;
      });
    }
    m.el.addEventListener('click', function (e) {
      var t = e.target.closest('button'); if (!t) return;
      if (t.id === 'fb-add') { pull(); if (st.fields.length >= 40) return U.toast('Maksimal 40 pertanyaan.', 'error'); st.fields.push({ id: 'q' + (Date.now() % 100000), type: 'text', label: '', required: false }); draw(); var last = $$('[data-fi]', m.el).pop(); if (last) $('[data-k=label]', last).focus(); return; }
      var row = t.closest('[data-fi]');
      if (row && t.dataset.mv) { pull(); var i = +row.dataset.fi, j = i + +t.dataset.mv; var tmp = st.fields[i]; st.fields[i] = st.fields[j]; st.fields[j] = tmp; return draw(); }
      if (row && t.hasAttribute('data-rm')) { pull(); st.fields.splice(+row.dataset.fi, 1); return draw(); }
      if (t.id === 'fb-save') {
        pull(); if (!st.judul.trim()) return U.toast('Judul formulir wajib diisi.', 'error');
        if (!st.fields.length) return U.toast('Tambahkan minimal satu pertanyaan.', 'error');
        U.busy(t, true, 'Menyimpan…');
        req('formSave', { id: st.id, judul: st.judul, deskripsi: st.deskripsi, kegiatanId: st.kegiatanId, status: st.status, fields: st.fields }).then(function (r) { U.busy(t, false); if (!r.success) return U.toast(r.message, 'error'); U.toast('Formulir disimpan', 'ok'); m.close(); reloadForms(); });
      }
    });
    m.el.addEventListener('change', function (e) { if (e.target.dataset.k === 'type') { pull(); draw(); } });
    draw();
  }
  function openRespons(fid) {
    var m = U.modal(U.modalHead('Respons Formulir') + '<div class="px-6 pb-6" id="rs-body">' + App.sk(1, 200) + '</div>', { label: 'Respons', wide: true });
    req('formRespons', { formId: fid }).then(function (r) {
      if (!r.success) { U.toast(r.message, 'error'); return m.close(); }
      var d = r.data, f = d.form;
      $('#rs-body', m.el).innerHTML = '<div class="flex flex-wrap items-center justify-between gap-3 mb-4"><div><p class="font-semibold">' + esc(f.judul) + '</p><p class="text-sm text-muted">' + d.rows.length + ' respons</p></div><button class="btn btn-gold btn-sm" id="rs-x">' + ic('file-spreadsheet', 'w-4 h-4') + ' Unduh Excel</button></div>' +
        (d.rows.length ? '<div class="rounded-2xl border border-line overflow-auto max-h-[55vh]"><table class="tbl"><thead><tr><th>Peserta</th><th>Waktu</th>' + f.fields.map(function (q) { return '<th>' + esc(q.label) + '</th>'; }).join('') + '<th>Status</th></tr></thead><tbody>' + d.rows.map(function (x) {
          return '<tr><td class="font-medium whitespace-nowrap">' + esc(x.nama) + '</td><td class="whitespace-nowrap text-muted">' + U.fmtWaktu(x.waktu) + '</td>' + f.fields.map(function (q) { var v = x.jawaban[q.id]; return '<td class="min-w-[140px]">' + esc(Array.isArray(v) ? v.join(', ') : v == null ? '' : v) + '</td>'; }).join('') +
            '<td>' + sel('', '', ['Baru', 'Dibaca', 'Selesai', 'Ditolak'].map(function (s) { return { v: s, l: s }; }), x.status).replace('<select class="field"', '<select class="field !h-9 !text-xs !px-3" data-rs="' + esc(x.id) + '" aria-label="Status respons ' + esc(x.nama) + '"') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="text-center text-muted py-10">Belum ada respons.</p>');
      m.el.addEventListener('change', function (e) { if (e.target.dataset.rs) req('responsStatus', { id: e.target.dataset.rs, status: e.target.value }).then(function (x) { if (!x.success) U.toast(x.message, 'error'); }); });
      var bx = $('#rs-x', m.el); if (bx) bx.onclick = function () { exportLaporan({ jenis: 'form', formId: fid }, 'xlsx', bx); };
    });
  }

  // =====================================================================
  //  LAPORAN
  // =====================================================================
  function exportLaporan(p, fmt, btn) {
    U.busy(btn, true, 'Menyiapkan…');
    req('laporanPdf', Object.assign({ format: fmt }, p), { timeout: 90000 }).then(function (r) { U.busy(btn, false); if (!r.success) return U.toast(r.message, 'error'); U.download(r.data.b64, r.data.nama, r.data.mime); U.toast('Berkas diunduh', 'ok'); });
  }
  Admin.views.laporan = function (main) {
    var jenisOpts = [{ v: 'kehadiran', l: 'Kehadiran per kegiatan' }, { v: 'rekap', l: 'Rekap & peringkat peserta' }, { v: 'peserta', l: 'Daftar peserta' }, { v: 'undian', l: 'Hasil undian' }, { v: 'form', l: 'Respons formulir' }];
    main.innerHTML = H.pageHead('Laporan', 'Pratinjau data lalu unduh sebagai Excel atau PDF berkop surat.') +
      '<form class="card p-6 grid sm:grid-cols-2 xl:grid-cols-4 gap-4 items-end" id="lp-f">' + field('lp-j', 'Jenis laporan', sel('lp-j', 'jenis', jenisOpts, 'kehadiran')) +
      '<div data-for="kehadiran">' + field('lp-k', 'Kegiatan', sel('lp-k', 'kegiatanId', [{ v: '', l: 'Semua kegiatan' }].concat(H.kegOptions(false)), '')) + '</div>' +
      '<div data-for="kehadiran"><label class="label" for="lp-d">Dari tanggal</label><input class="field" id="lp-d" name="dari" type="date"></div><div data-for="kehadiran"><label class="label" for="lp-s">Sampai tanggal</label><input class="field" id="lp-s" name="sampai" type="date"></div>' +
      '<div data-for="form" hidden>' + field('lp-fm', 'Formulir', sel('lp-fm', 'formId', H.list('form').map(function (f) { return { v: f.ID, l: f.Judul }; }), '')) + '</div>' +
      '<div class="flex gap-2 sm:col-span-2 xl:col-span-4 flex-wrap"><button class="btn btn-primary" type="submit">' + ic('search', 'w-4 h-4') + ' Pratinjau</button><button class="btn btn-gold" type="button" data-exp="xlsx">' + ic('file-spreadsheet', 'w-4 h-4') + ' Unduh Excel</button><button class="btn btn-gold" type="button" data-exp="pdf">' + ic('file-text', 'w-4 h-4') + ' Unduh PDF</button></div></form><div id="lp-out" class="mt-6"></div>';
    var f = $('#lp-f'); function vis() { var j = $('#lp-j').value; $$('[data-for]', f).forEach(function (e) { e.hidden = e.dataset.for !== j; }); }
    $('#lp-j').addEventListener('change', vis); vis();
    function params() { var d = U.formData(f); return { jenis: d.jenis, kegiatanId: d.kegiatanId, dari: d.dari, sampai: d.sampai, formId: d.formId }; }
    f.addEventListener('submit', function (e) {
      e.preventDefault(); var btn = $('[type=submit]', f); U.busy(btn, true, 'Memuat…');
      req('laporan', params()).then(function (r) {
        U.busy(btn, false); if (!r.success) return U.toast(r.message, 'error'); var d = r.data;
        $('#lp-out').innerHTML = '<div class="card overflow-hidden"><div class="text-center py-6 px-4 border-b-4" style="border-color:rgb(var(--c-gold))"><p class="font-display text-2xl font-semibold">' + esc(d.kop.nama) + '</p><p class="text-sm text-muted">' + esc(d.kop.alamat) + '</p></div><div class="px-6 py-4"><p class="font-display text-xl font-semibold">' + esc(d.judul) + '</p><p class="text-xs text-muted">Dicetak ' + esc(d.dibuat) + ' · ' + d.baris.length + ' baris</p></div>' +
          '<div class="overflow-auto max-h-[55vh]"><table class="tbl"><thead><tr>' + d.kolom.map(function (k) { return '<th>' + esc(k) + '</th>'; }).join('') + '</tr></thead><tbody>' + (d.baris.length ? d.baris.slice(0, 200).map(function (b) { return '<tr>' + b.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') : '<tr><td colspan="' + d.kolom.length + '" class="text-center text-muted py-10">Tidak ada data.</td></tr>') + '</tbody></table></div>' + (d.baris.length > 200 ? '<p class="text-xs text-muted p-4">Pratinjau 200 baris pertama; berkas unduhan memuat semua data.</p>' : '') + '</div>';
      });
    });
    f.addEventListener('click', function (e) { var b = e.target.closest('[data-exp]'); if (b) exportLaporan(params(), b.dataset.exp, b); });
  };

  // =====================================================================
  //  KONTEN ABOUT
  // =====================================================================
  Admin.views.about = function (main) {
    var a = A.boot.about || {}, team = []; try { team = JSON.parse(a.Struktur_JSON || '[]'); } catch (e) {}
    function draw() {
      main.innerHTML = H.pageHead('Konten About', 'Teks pada halaman About dan hero beranda.') + '<form class="card p-6 sm:p-8 grid gap-5" id="ab-f" novalidate>' +
        field('ab-hj', 'Judul hero beranda', '<input class="field" id="ab-hj" name="Hero_Judul" maxlength="200" value="' + esc(a.Hero_Judul) + '">') + field('ab-hs', 'Subjudul hero', '<textarea class="field" id="ab-hs" name="Hero_Subjudul" rows="2" maxlength="400">' + esc(a.Hero_Subjudul) + '</textarea>') +
        field('ab-tg', 'Tagline', '<input class="field" id="ab-tg" name="Tagline" maxlength="200" value="' + esc(a.Tagline) + '">') + field('ab-sj', 'Sejarah', '<textarea class="field" id="ab-sj" name="Sejarah" rows="5" maxlength="3000">' + esc(a.Sejarah) + '</textarea>') +
        field('ab-vi', 'Visi', '<textarea class="field" id="ab-vi" name="Visi" rows="3" maxlength="1000">' + esc(a.Visi) + '</textarea>') + field('ab-mi', 'Misi', '<textarea class="field" id="ab-mi" name="Misi" rows="5">' + esc(a.Misi) + '</textarea>', 'Satu poin per baris.') +
        field('ab-ni', 'Nilai-nilai', '<textarea class="field" id="ab-ni" name="Nilai" rows="3">' + esc(a.Nilai) + '</textarea>', 'Satu nilai per baris.') + field('ab-ja', 'Jadwal rutin', '<input class="field" id="ab-ja" name="Jadwal" maxlength="300" value="' + esc(a.Jadwal) + '">') +
        field('ab-al', 'Alamat', '<input class="field" id="ab-al" name="Alamat" maxlength="300" value="' + esc(a.Alamat) + '">') +
        '<div><p class="label">Struktur pengurus</p><div class="space-y-2" id="ab-team">' + team.map(function (t, i) { return '<div class="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center" data-ti="' + i + '"><label class="cursor-pointer relative" title="Unggah foto" aria-label="Unggah foto ' + esc(t.nama || 'pengurus') + '">' + U.personIcon(t.foto, 'w-12 h-12') + '<span class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gold text-[#251a00] flex items-center justify-center">' + ic('camera', 'w-3 h-3') + '</span><input type="file" class="sr-only" accept="image/*" data-tfoto><input type="hidden" data-t="foto" value="' + esc(t.foto || '') + '"></label><input class="field" data-t="nama" placeholder="Nama" aria-label="Nama pengurus" value="' + esc(t.nama) + '"><input class="field" data-t="jabatan" placeholder="Jabatan" aria-label="Jabatan" value="' + esc(t.jabatan) + '"><button type="button" class="btn btn-ghost btn-icon text-danger" data-trm aria-label="Hapus pengurus">' + ic('trash-2', 'w-4 h-4') + '</button></div>'; }).join('') + '</div><button type="button" class="btn btn-gold btn-sm mt-3" id="ab-tadd">' + ic('plus', 'w-4 h-4') + ' Tambah pengurus</button></div>' +
        '<div class="flex justify-end"><button class="btn btn-primary" type="submit">Simpan perubahan</button></div></form>';
      var f = $('#ab-f');
      function pullTeam() { team = $$('[data-ti]', f).map(function (r) { return { nama: $('[data-t=nama]', r).value, jabatan: $('[data-t=jabatan]', r).value, foto: $('[data-t=foto]', r).value }; }); }
      $('#ab-tadd').onclick = function () { pullTeam(); team.push({ nama: '', jabatan: '', foto: '' }); a = Object.assign(a, U.formData(f)); draw(); };
      f.addEventListener('change', function (e) {
        var inp = e.target; if (!inp.matches || !inp.matches('[data-tfoto]') || !inp.files[0]) return;
        var row = inp.closest('[data-ti]'), idx = +row.dataset.ti; U.toast('Mengunggah foto…');
        H.upload(inp.files[0], 'Foto_Pengurus', 480).then(function (r) { if (!r.success) return U.toast(r.message, 'error'); pullTeam(); team[idx].foto = r.data.url; a = Object.assign(a, U.formData(f)); draw(); U.toast('Foto terunggah — tekan Simpan perubahan', 'ok'); });
      });
      f.addEventListener('click', function (e) { var b = e.target.closest('[data-trm]'); if (!b) return; pullTeam(); team.splice(+b.closest('[data-ti]').dataset.ti, 1); a = Object.assign(a, U.formData(f)); draw(); });
      f.addEventListener('submit', function (e) {
        e.preventDefault(); pullTeam(); var d = U.formData(f); d.Struktur_JSON = JSON.stringify(team.filter(function (t) { return t.nama.trim(); })); var btn = $('[type=submit]', f); U.busy(btn, true, 'Menyimpan…');
        req('aboutSave', { data: d }).then(function (r) { U.busy(btn, false); if (!r.success) return U.toast(r.message, 'error'); A.boot.about = r.data; a = r.data; U.toast('Konten About disimpan', 'ok'); H.afterChange(); });
      });
    }
    draw();
  };

  // =====================================================================
  //  MIGRASI DATA
  // =====================================================================
  var M = { sumber: '', sheets: null, sheet: '', target: 'peserta', mode: 'tambah', mapping: {}, plan: null };
  var FIELD_LABEL = { Nama: 'Nama', No_HP: 'No. HP', Alamat: 'Alamat', Jenis_Kelamin: 'Jenis kelamin', Status: 'Status', Tanggal_Daftar: 'Tanggal daftar', Judul: 'Judul kegiatan', Tanggal: 'Tanggal', Jam: 'Jam', Lokasi: 'Lokasi', Deskripsi: 'Deskripsi', Kategori: 'Kategori', Kegiatan: 'Judul kegiatan', Waktu: 'Waktu hadir' };
  Admin.views.migrasi = function (main) {
    function planHtml(p) {
      var ok = !p.hilang.length;
      return '<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">' + [['Baru', p.baru, 'badge-ok'], ['Diperbarui', p.ubah, 'badge-warn'], ['Sudah ada', p.sama, 'badge-off'], ['Dilewati', p.lewat, 'badge-danger']].map(function (x) { return '<div class="rounded-2xl border border-line p-4 text-center"><p class="font-display text-3xl font-semibold">' + x[1] + '</p><span class="badge ' + x[2] + ' mt-1">' + x[0] + '</span></div>'; }).join('') + '</div>' +
        (p.hilang.length ? '<p class="err mt-4" role="alert">Kolom wajib belum terpetakan: ' + esc(p.hilang.map(function (h) { return FIELD_LABEL[h] || h; }).join(', ')) + '. Pilih kolom sumber di bawah.</p>' : '') +
        '<details class="mt-4"' + (p.hilang.length ? ' open' : '') + '><summary class="text-sm font-medium cursor-pointer">Pemetaan kolom (berdasarkan nama header)</summary><div class="grid sm:grid-cols-2 gap-3 mt-3">' + Object.keys(FIELD_LABEL).filter(function (k) { return p.target === 'peserta' ? ['Nama', 'No_HP', 'Alamat', 'Jenis_Kelamin', 'Status', 'Tanggal_Daftar'].indexOf(k) >= 0 : p.target === 'kegiatan' ? ['Judul', 'Tanggal', 'Jam', 'Lokasi', 'Deskripsi', 'Kategori'].indexOf(k) >= 0 : ['No_HP', 'Kegiatan', 'Tanggal', 'Waktu'].indexOf(k) >= 0; }).map(function (k) {
          return '<div><label class="label" for="mp-' + k + '">' + esc(FIELD_LABEL[k]) + '</label>' + sel('mp-' + k, k, [{ v: '', l: '— tidak dipakai —' }].concat(p.headers.map(function (h) { return { v: h, l: h }; })), p.mapping[k] || '').replace('<select class="field"', '<select class="field" data-map="' + k + '"') + '</div>'; }).join('') + '</div></details>' +
        (p.contohBaru.length ? '<p class="text-sm mt-4"><strong>Contoh data baru:</strong> ' + p.contohBaru.map(esc).join(', ') + '</p>' : '') +
        (p.contohUbah.length ? '<p class="text-sm mt-2"><strong>Contoh perubahan:</strong> ' + p.contohUbah.map(function (u) { return esc(u.label) + ' (' + esc(u.perubahan) + ')'; }).join('; ') + '</p>' : '') +
        (p.daftarLewat.length ? '<details class="mt-3"><summary class="text-sm font-medium cursor-pointer text-danger">Baris dilewati (' + p.lewat + ')</summary><ul class="mt-2 text-sm space-y-1 max-h-40 overflow-y-auto">' + p.daftarLewat.map(function (l) { return '<li>Baris ' + l.baris + ': ' + esc(l.alasan) + '</li>'; }).join('') + '</ul></details>' : '') +
        '<div class="flex flex-wrap gap-3 mt-6"><button class="btn btn-primary" id="mg-run"' + (ok && (p.baru || p.ubah) ? '' : ' disabled') + '>' + ic('database', 'w-4 h-4') + ' Jalankan impor (' + (p.baru + p.ubah) + ' baris)</button><p class="text-xs text-muted self-center">Aman dijalankan berulang: data yang sama tidak akan digandakan.</p></div>';
    }
    function draw() {
      main.innerHTML = H.pageHead('Migrasi Data', 'Impor dari Google Sheets lama. Sumber hanya dibaca, tidak pernah diubah.') +
        '<div class="grid xl:grid-cols-5 gap-6"><section class="card p-6 xl:col-span-3" aria-labelledby="mg1"><h2 id="mg1" class="font-display text-xl font-semibold flex items-center gap-2">' + ic('database', 'w-5 h-5 text-gold-ink') + '1 · Impor dari Spreadsheet</h2>' +
        '<form id="mg-f" class="mt-4 space-y-4" novalidate>' + field('mg-s', 'Tautan / ID spreadsheet sumber', '<input class="field" id="mg-s" name="sumber" placeholder="https://docs.google.com/spreadsheets/d/…" value="' + esc(M.sumber) + '">', 'Akun pemilik skrip harus punya akses lihat ke spreadsheet tersebut.') + '<button class="btn btn-gold btn-sm" type="submit">Baca sumber</button></form>' +
        (M.sheets ? '<div class="mt-5 pt-5 border-t border-line grid sm:grid-cols-3 gap-4">' + field('mg-sh', 'Sheet sumber', sel('mg-sh', 'sheet', M.sheets.sheets.map(function (s) { return { v: s.nama, l: s.nama + ' (' + s.baris + ' baris)' }; }), M.sheet)) + field('mg-t', 'Impor sebagai', sel('mg-t', 'target', [{ v: 'peserta', l: 'Peserta' }, { v: 'kegiatan', l: 'Kegiatan' }, { v: 'kehadiran', l: 'Kehadiran' }], M.target)) + field('mg-m', 'Mode', sel('mg-m', 'mode', [{ v: 'tambah', l: 'Tambah data baru saja' }, { v: 'sinkron', l: 'Sinkron (baru + perbarui)' }], M.mode)) + '<div class="sm:col-span-3"><button class="btn btn-primary" id="mg-scan">' + ic('search', 'w-4 h-4') + ' Pindai (simulasi, tanpa menulis)</button></div></div><div id="mg-plan">' + (M.plan ? planHtml(M.plan) : '') + '</div>' : '') + '</section>' +
        '<section class="card p-6 xl:col-span-2 self-start" aria-labelledby="mg2"><h2 id="mg2" class="font-display text-xl font-semibold flex items-center gap-2">' + ic('clipboard-list', 'w-5 h-5 text-gold-ink') + '2 · Tempel Cepat (Peserta)</h2><p class="text-sm text-muted mt-1">Satu peserta per baris: <code>Nama, No. HP, Alamat</code></p>' +
        '<textarea class="field mt-3" id="mg-paste" rows="7" placeholder="Siti Aminah, 081234567890, Waru&#10;Budi Santoso, 085611112222"></textarea><div class="flex gap-2 mt-3"><button class="btn btn-ghost btn-sm" id="mg-pscan">Pindai</button><button class="btn btn-primary btn-sm" id="mg-prun">Impor</button></div><div id="mg-pres" class="mt-3 text-sm"></div></section></div>';
      bind();
    }
    function bind() {
      var f = $('#mg-f');
      f.addEventListener('submit', function (e) {
        e.preventDefault(); M.sumber = $('#mg-s').value.trim(); if (!M.sumber) return U.fieldErr(f, 'sumber', 'Isi tautan spreadsheet.');
        var btn = $('[type=submit]', f); U.busy(btn, true, 'Membaca…');
        req('importScan', { sumber: M.sumber }, { timeout: 60000 }).then(function (r) { U.busy(btn, false); if (!r.success) return U.toast(r.message, 'error'); M.sheets = r.data; M.sheet = r.data.sheets[0] ? r.data.sheets[0].nama : ''; M.plan = null; M.mapping = {}; draw(); });
      });
      var scan = $('#mg-scan'); if (scan) scan.onclick = function () { M.sheet = $('#mg-sh').value; M.target = $('#mg-t').value; M.mode = $('#mg-m').value; M.mapping = {}; doScan(scan); };
      var sec = $('#mg-plan'); if (sec) { sec.addEventListener('change', function (e) { if (e.target.dataset.map) { M.mapping[e.target.dataset.map] = e.target.value; doScan(); } }); var run = $('#mg-run'); if (run) run.onclick = function () { runImport(run); }; }
      var pp = function (jalankan, btn) { var teks = $('#mg-paste').value; if (!teks.trim()) return U.toast('Tempel data terlebih dahulu.', 'error'); U.busy(btn, true, 'Memproses…'); req('pesertaImport', { teks: teks, jalankan: jalankan, mode: 'tambah' }).then(function (r) { U.busy(btn, false); if (!r.success) return U.toast(r.message, 'error'); var d = r.data; $('#mg-pres').innerHTML = '<p><strong>' + d.baru + '</strong> baru · <strong>' + d.sama + '</strong> sudah ada · <strong>' + d.lewat + '</strong> dilewati' + (d.selesai ? ' — <span class="text-ok font-semibold">selesai ✓</span>' : ' (simulasi)') + '</p>' + (d.daftarLewat.length ? '<ul class="mt-1 text-danger">' + d.daftarLewat.slice(0, 5).map(function (l) { return '<li>Baris ' + l.baris + ': ' + esc(l.alasan) + '</li>'; }).join('') + '</ul>' : ''); if (d.selesai) { U.toast(d.baru + ' peserta diimpor', 'ok'); H.refreshBoot(true); H.afterChange(); } }); };
      $('#mg-pscan').onclick = function (e) { pp(false, e.currentTarget); }; $('#mg-prun').onclick = function (e) { pp(true, e.currentTarget); };
    }
    function doScan(btn) {
      if (btn) U.busy(btn, true, 'Memindai…');
      req('importScan', { sumber: M.sumber, sheet: M.sheet, target: M.target, mode: M.mode, mapping: M.mapping }, { timeout: 90000 }).then(function (r) { if (btn) U.busy(btn, false); if (!r.success) return U.toast(r.message, 'error'); M.plan = r.data; M.mapping = r.data.mapping; $('#mg-plan').innerHTML = planHtml(r.data); var run = $('#mg-run'); if (run) run.onclick = function () { runImport(run); }; });
    }
    function runImport(btn) {
      U.confirm('Jalankan impor?', 'Akan menambahkan ' + M.plan.baru + ' data dan memperbarui ' + M.plan.ubah + ' data. Disarankan membuat backup lebih dulu.', 'Ya, impor').then(function (ok) {
        if (!ok) return; U.busy(btn, true, 'Mengimpor…');
        req('importRun', { sumber: M.sumber, sheet: M.sheet, target: M.target, mode: M.mode, mapping: M.mapping }, { timeout: 120000, retries: 0 }).then(function (r) { U.busy(btn, false); if (!r.success) return U.toast(r.message, 'error'); U.toast('Impor selesai: ' + r.data.baru + ' baru, ' + r.data.ubah + ' diperbarui', 'ok'); M.plan = null; H.refreshBoot(true); H.afterChange(); doScan(); });
      });
    }
    draw();
  };

  // =====================================================================
  //  BACKUP & RESTORE
  // =====================================================================
  Admin.views.backup = function (main) {
    var data = null;
    function draw() {
      main.innerHTML = H.pageHead('Backup & Restore', 'Salinan lengkap database disimpan di folder Backup pada Google Drive Anda.') +
        '<div class="grid lg:grid-cols-3 gap-6"><div class="space-y-6"><section class="card p-6"><h2 class="font-display text-xl font-semibold flex items-center gap-2">' + ic('hard-drive', 'w-5 h-5 text-gold-ink') + 'Backup sekarang</h2><p class="text-sm text-muted mt-2">Membuat salinan seluruh spreadsheet database saat ini.</p><button class="btn btn-primary mt-4 w-full" id="bk-now">' + ic('save', 'w-4 h-4') + ' Buat backup</button></section>' +
        '<section class="card p-6"><h2 class="font-display text-xl font-semibold flex items-center gap-2">' + ic('refresh-cw', 'w-5 h-5 text-gold-ink') + 'Jadwal otomatis</h2>' +
        (data ? '<form id="bk-f" class="mt-3 space-y-3"><label class="flex items-center gap-3 cursor-pointer"><input type="checkbox" name="aktif"' + (data.aktif ? ' checked' : '') + '><span class="text-sm font-medium">Backup harian pukul 02.00 WIB</span></label>' + field('bk-r', 'Simpan backup terbaru sebanyak', '<input class="field" id="bk-r" name="retensi" type="number" min="1" max="60" value="' + data.retensi + '">', 'Backup lebih lama otomatis dihapus.') + '<button class="btn btn-gold btn-sm" type="submit">Simpan jadwal</button></form>' : App.sk(1, 120)) + '</section></div>' +
        '<section class="card p-6 lg:col-span-2" aria-labelledby="bk-h"><h2 id="bk-h" class="font-display text-xl font-semibold">Daftar backup</h2>' +
        (data ? (data.daftar.length ? '<ul class="mt-4 divide-y divide-line">' + data.daftar.map(function (b) { return '<li class="py-3 flex flex-wrap items-center gap-3"><span class="w-10 h-10 rounded-2xl bg-gold-pale text-gold-ink flex items-center justify-center">' + ic('database', 'w-5 h-5') + '</span><div class="min-w-0 flex-1"><p class="font-medium truncate">' + esc(b.nama) + (b.praRestore ? ' <span class="badge badge-warn ml-1">pra-restore</span>' : '') + '</p><p class="text-xs text-muted">' + U.fmtWaktu(b.waktu) + '</p></div><a class="btn btn-ghost btn-sm" href="' + esc(b.url) + '" target="_blank" rel="noopener noreferrer">' + ic('external-link', 'w-4 h-4') + ' Buka</a><button class="btn btn-danger btn-sm" data-restore="' + esc(b.id) + '" data-nama="' + esc(b.nama) + '">Pulihkan</button></li>'; }).join('') + '</ul>' : '<p class="text-muted text-sm mt-4">Belum ada backup.</p>') : '<div class="mt-4">' + App.sk(2, 70) + '</div>') + '</section></div>';
      var now = $('#bk-now'); now.onclick = function () { U.busy(now, true, 'Membuat backup…'); req('backupNow', {}, { timeout: 120000, retries: 0 }).then(function (r) { U.busy(now, false); if (!r.success) return U.toast(r.message, 'error'); U.toast('Backup dibuat: ' + r.data.backup.nama, 'ok'); load(); }); };
      var f = $('#bk-f'); if (f) f.addEventListener('submit', function (e) { e.preventDefault(); var d = U.formData(f), btn = $('[type=submit]', f); U.busy(btn, true, 'Menyimpan…'); req('backupJadwal', { aktif: d.aktif, retensi: d.retensi }).then(function (r) { U.busy(btn, false); if (!r.success) return U.toast(r.message, 'error'); U.toast(r.data.aktif ? 'Backup harian diaktifkan' : 'Backup harian dimatikan', 'ok'); load(); }); });
      main.onclick = function (e) { var b = e.target.closest('[data-restore]'); if (b) openRestore(b.dataset.restore, b.dataset.nama); };
    }
    function load() { req('backupList').then(function (r) { if (!r.success) return U.toast(r.message, 'error'); data = r.data; if (A.view === 'backup') draw(); }); }
    function openRestore(id, nama) {
      var m = U.modal(U.modalHead('Pulihkan dari backup') + '<form class="px-6 pb-6 space-y-4"><div class="rounded-2xl bg-danger-soft text-danger p-4 text-sm flex gap-3">' + ic('triangle-alert', 'w-5 h-5 mt-0.5') + '<p>Data peserta, kegiatan, kehadiran, dan lainnya akan <strong>ditimpa</strong> dengan isi <em>' + esc(nama) + '</em>. Backup otomatis “pra-restore” dibuat lebih dulu sebagai pengaman.</p></div>' + field('rs-c', 'Ketik PULIHKAN untuk melanjutkan', '<input class="field" id="rs-c" autocomplete="off" placeholder="PULIHKAN">') + '<div class="flex gap-3 justify-end"><button type="button" class="btn btn-ghost" data-close>Batal</button><button class="btn btn-danger" type="submit">Pulihkan sekarang</button></div></form>', { label: 'Pulihkan backup' });
      $('form', m.el).addEventListener('submit', function (e) {
        e.preventDefault(); var btn = $('[type=submit]', m.el), c = $('#rs-c', m.el).value; if (c !== 'PULIHKAN') return U.fieldErr(m.el, 'x', ''), U.toast('Ketik PULIHKAN persis seperti contoh.', 'error');
        U.busy(btn, true, 'Memulihkan…'); req('backupRestore', { fileId: id, konfirmasi: c }, { timeout: 180000, retries: 0 }).then(function (r) { U.busy(btn, false); if (!r.success) return U.toast(r.message, 'error'); A.boot = r.data.boot; m.close(); U.toast('Data dipulihkan dari backup', 'ok'); H.afterChange(); load(); });
      });
    }
    draw(); load();
  };

  // =====================================================================
  //  PENGATURAN & AUDIT
  // =====================================================================
  Admin.views.pengaturan = function (main) {
    var s = A.boot.pengaturan || {}, audit = null;
    function draw() {
      main.innerHTML = H.pageHead('Pengaturan & Audit') + '<div class="grid lg:grid-cols-2 gap-6">' +
        '<section class="card p-6"><h2 class="font-display text-xl font-semibold">Identitas organisasi</h2><form id="pg-f" class="mt-4 space-y-4" novalidate>' + field('pg-n', 'Nama organisasi', '<input class="field" id="pg-n" name="Nama_Organisasi" maxlength="200" value="' + esc(s.Nama_Organisasi) + '">') + field('pg-a', 'Alamat', '<input class="field" id="pg-a" name="Alamat_Organisasi" maxlength="200" value="' + esc(s.Alamat_Organisasi) + '">') +
        field('pg-w', 'Nomor WhatsApp pengurus', '<input class="field" id="pg-w" name="Kontak_WA" type="tel" maxlength="20" value="' + esc(s.Kontak_WA) + '">', 'Tampil sebagai tombol kontak di halaman About.') + field('pg-k', 'Judul kop surat laporan', '<input class="field" id="pg-k" name="Surat_Kop" maxlength="200" value="' + esc(s.Surat_Kop) + '">') + '<button class="btn btn-primary" type="submit">Simpan</button></form></section>' +
        '<section class="card p-6 self-start"><h2 class="font-display text-xl font-semibold">Data dummy</h2><p class="text-sm text-muted mt-2">Data contoh (peserta, kegiatan, berita, dll.) agar situs terlihat penuh saat belum ada data nyata. Status saat ini: <span class="badge ' + (A.boot.dummy ? 'badge-warn' : 'badge-ok') + '">' + (A.boot.dummy ? 'Aktif' : 'Tidak aktif') + '</span></p>' +
        '<div class="flex flex-wrap gap-3 mt-5"><button class="btn btn-danger" id="dm-del"' + (A.boot.dummy ? '' : ' disabled') + '>' + ic('trash-2', 'w-4 h-4') + ' Hapus semua data dummy</button><button class="btn btn-gold" id="dm-load">' + ic('refresh-cw', 'w-4 h-4') + ' Muat ulang dummy</button></div><p class="hint mt-3">Data nyata (bukan dummy) tidak terpengaruh.</p></section>' +
        '<section class="card p-6 lg:col-span-2" aria-labelledby="au-h"><div class="flex items-center justify-between gap-3"><h2 id="au-h" class="font-display text-xl font-semibold flex items-center gap-2">' + ic('history', 'w-5 h-5 text-gold-ink') + 'Audit log</h2><button class="btn btn-ghost btn-sm" id="au-load">' + ic('refresh-cw', 'w-4 h-4') + ' ' + (audit ? 'Muat ulang' : 'Tampilkan') + '</button></div><div id="au-body" class="mt-4"></div></section></div>';
      $('#pg-f').addEventListener('submit', function (e) { e.preventDefault(); var btn = $('[type=submit]', e.target); U.busy(btn, true, 'Menyimpan…'); req('pengaturanSave', { data: U.formData(e.target) }).then(function (r) { U.busy(btn, false); if (!r.success) return U.toast(r.message, 'error'); A.boot.pengaturan = r.data; s = r.data; U.toast('Pengaturan disimpan', 'ok'); H.afterChange(); }); });
      $('#dm-del').onclick = function () { U.confirm('Hapus semua data dummy?', 'Seluruh data contoh akan dihapus permanen. Data nyata tidak terpengaruh.', 'Hapus dummy', true).then(function (ok) { if (!ok) return; var b = $('#dm-del'); U.busy(b, true, 'Menghapus…'); req('dummyHapus', {}, { timeout: 120000 }).then(function (r) { U.busy(b, false); if (!r.success) return U.toast(r.message, 'error'); A.boot = r.data.boot; U.toast(r.data.dihapus + ' baris dummy dihapus', 'ok'); H.afterChange(); H.render(); }); }); };
      $('#dm-load').onclick = function () { U.confirm('Muat ulang data dummy?', 'Data dummy lama diganti dengan set contoh baru.', 'Muat ulang').then(function (ok) { if (!ok) return; var b = $('#dm-load'); U.busy(b, true, 'Memuat…'); req('dummyMuat', {}, { timeout: 120000 }).then(function (r) { U.busy(b, false); if (!r.success) return U.toast(r.message, 'error'); A.boot = r.data.boot; U.toast('Data dummy dimuat ulang', 'ok'); H.afterChange(); H.render(); }); }); };
      $('#au-load').onclick = function (e) { var b = e.currentTarget; U.busy(b, true, 'Memuat…'); req('auditLog', { limit: 150 }).then(function (r) { U.busy(b, false); if (!r.success) return U.toast(r.message, 'error'); audit = r.data; $('#au-body').innerHTML = '<div class="overflow-auto max-h-[50vh] rounded-2xl border border-line"><table class="tbl"><thead><tr><th>Waktu</th><th>Metode</th><th>Pengguna</th><th>Aksi</th><th>Hasil</th><th>Keterangan</th></tr></thead><tbody>' + audit.map(function (a) { return '<tr><td class="whitespace-nowrap text-muted">' + esc(String(a.waktu).replace('T', ' ')) + '</td><td>' + esc(a.metode) + '</td><td>' + esc(a.pengguna) + '</td><td class="font-medium">' + esc(a.aksi) + '</td><td><span class="badge ' + (a.hasil === 'Berhasil' ? 'badge-ok' : 'badge-danger') + '">' + esc(a.hasil) + '</span></td><td class="text-muted">' + esc(a.ket) + '</td></tr>'; }).join('') + '</tbody></table></div>'; }); };
    }
    draw();
  };

  // ---------- Delegasi tombol modul lanjutan ----------
  document.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-undi]'))) return openUndian(t.dataset.undi);
    if (e.target.closest('[data-form-new]')) return openBuilder();
    if ((t = e.target.closest('[data-form-edit]'))) return openBuilder(t.dataset.formEdit);
    if ((t = e.target.closest('[data-form-resp]'))) return openRespons(t.dataset.formResp);
    if ((t = e.target.closest('[data-form-dup]'))) return req('formDuplikat', { id: t.dataset.formDup }).then(function (r) { if (!r.success) return U.toast(r.message, 'error'); U.toast('Formulir diduplikat (status Draf)', 'ok'); reloadForms(); });
    if ((t = e.target.closest('[data-form-del]'))) { var id = t.dataset.formDel; return U.confirm('Hapus formulir?', 'Formulir beserta seluruh responsnya akan dihapus permanen.', 'Hapus', true).then(function (ok) { if (ok) req('formHapus', { id: id }).then(function (r) { if (!r.success) return U.toast(r.message, 'error'); U.toast('Formulir dihapus', 'ok'); reloadForms(); }); }); }
  });
})();
