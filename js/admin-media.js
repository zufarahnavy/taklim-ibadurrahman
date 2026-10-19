/**
 * admin-media.js — Modul admin: Banner Beranda, Galeri Kegiatan, Logo & Identitas.
 * Dimuat malas bersama admin-lanjut.js. Semua perubahan optimistik (tampilan berubah dulu, server menyusul).
 */
(function () {
  'use strict';
  var U = UI, $ = U.$, $$ = U.$$, esc = U.esc, ic = U.ic, Admin = window.Admin, A = Admin.A, H = Admin.h, req = H.req;

  function toNum(x) { return Number(x.Urutan) || 9999; }
  function bySeq(a, b) { return toNum(a) - toNum(b); }
  function mapSeq(list) { return list.map(function (x, i) { x.Urutan = String(i + 1); return x; }); }

  // ---------- Pemilih ganda untuk checklist (dipakai Banner & Galeri) ----------
  function bulkBar(n, what) {
    if (!n) return '';
    return '<div class="sticky top-2 z-20 mb-4 rounded-xl border border-gold bg-surface shadow-float p-3 flex flex-wrap items-center gap-2" role="region" aria-label="Aksi untuk ' + what + ' terpilih"><span class="font-semibold px-1">' + n + ' dipilih</span><span class="flex-1"></span>' +
      '<button class="btn btn-danger btn-sm" data-mbulk="hapus">' + ic('trash-2', 'w-4 h-4') + ' Hapus terpilih</button><button class="btn btn-ghost btn-sm" data-mbulk="clear">Batal pilih</button></div>';
  }
  function deleteMany(ent, ids, label, done) {
    return U.confirm('Hapus ' + ids.length + ' ' + label + '?', 'Data yang dipilih dihapus permanen dari situs.', 'Hapus ' + ids.length, true).then(function (ok) {
      if (!ok) return;
      var set = {}, bak = A.boot[ent].slice(); ids.forEach(function (i) { set[i] = 1; });
      A.boot[ent] = bak.filter(function (x) { return !set[x.ID]; }); done();
      req('entityHapusMassal', { entity: ent, ids: ids }, { timeout: 60000 }).then(function (r) {
        if (!r.success) { A.boot[ent] = bak; done(); return U.toast(r.message, 'error'); }
        U.toast(r.data.dihapus + ' ' + label + ' dihapus', 'ok'); H.afterChange();
      });
    });
  }
  function saveOrder(ent) {
    req('urutSimpan', { entity: ent, ids: A.boot[ent].slice().sort(bySeq).map(function (x) { return x.ID; }) }).then(function (r) { if (!r.success) U.toast(r.message, 'error'); else H.afterChange(); });
  }
  function move(ent, id, dir) {
    var l = A.boot[ent].slice().sort(bySeq), i = l.findIndex(function (x) { return x.ID === id; }), j = i + dir;
    if (i < 0 || j < 0 || j >= l.length) return;
    var t = l[i]; l[i] = l[j]; l[j] = t; mapSeq(l); saveOrder(ent);
  }

  // =====================================================================
  //  BANNER BERANDA
  // =====================================================================
  var selB = {};
  Admin.views.banner = function (main) {
    function draw() {
      var rows = (A.boot.banner || []).slice().sort(bySeq), ex = {}; rows.forEach(function (b) { ex[b.ID] = 1; }); Object.keys(selB).forEach(function (k) { if (!ex[k]) delete selB[k]; });
      var aktif = rows.filter(function (b) { return b.Status === 'Aktif'; }).length;
      main.innerHTML = H.pageHead('Banner Beranda', 'Foto-foto yang berputar di bagian paling atas beranda. Urutkan dengan tombol panah.',
        '<button class="btn btn-gold btn-sm" data-bn-multi>' + ic('image-up', 'w-4 h-4') + ' Unggah banyak foto</button><button class="btn btn-primary btn-sm" data-add="banner">' + ic('plus', 'w-4 h-4') + ' Tambah banner</button>') +
        '<p class="text-sm text-muted -mt-3 mb-5">' + aktif + ' banner tampil di beranda' + (aktif === 0 ? ' — saat kosong, beranda memakai latar zamrud polos.' : '.') + ' Gunakan foto lanskap (16:9) agar tampil penuh.</p>' + bulkBar(Object.keys(selB).length, 'banner') +
        (rows.length ? '<div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">' + rows.map(function (b, i) {
          var on = b.Status === 'Aktif';
          return '<div class="card overflow-hidden flex flex-col' + (on ? '' : ' opacity-75') + '"><div class="relative">' + U.art(b.Gambar_URL, b.ID, 'aspect-[16/9]', b.Judul) +
            '<label class="absolute left-3 top-3 w-9 h-9 rounded-lg bg-surface/90 flex items-center justify-center cursor-pointer shadow" title="Pilih"><input type="checkbox" data-bsel="' + esc(b.ID) + '"' + (selB[b.ID] ? ' checked' : '') + ' aria-label="Pilih banner ' + (i + 1) + '"></label>' +
            '<span class="absolute right-3 top-3 badge ' + (on ? 'badge-ok' : 'badge-off') + '">' + (on ? 'Tampil' : 'Disembunyikan') + '</span></div>' +
            '<div class="p-4 flex flex-col gap-3 flex-1"><div class="min-w-0"><p class="font-display text-lg font-semibold truncate">' + esc(b.Judul || 'Tanpa judul') + '</p><p class="text-sm text-muted line-clamp-2 min-h-[20px]">' + esc(b.Subjudul) + '</p></div>' +
            '<div class="mt-auto flex flex-wrap items-center gap-1.5"><button class="btn btn-ghost btn-sm btn-icon" data-bmove="-1" data-id="' + esc(b.ID) + '" aria-label="Geser ke depan"' + (i === 0 ? ' disabled' : '') + '>' + ic('arrow-up', 'w-4 h-4') + '</button><button class="btn btn-ghost btn-sm btn-icon" data-bmove="1" data-id="' + esc(b.ID) + '" aria-label="Geser ke belakang"' + (i === rows.length - 1 ? ' disabled' : '') + '>' + ic('arrow-down', 'w-4 h-4') + '</button>' +
            '<span class="flex-1"></span><button class="btn btn-line btn-sm" data-btoggle="' + esc(b.ID) + '">' + (on ? 'Sembunyikan' : 'Tampilkan') + '</button>' +
            '<button class="btn btn-ghost btn-sm btn-icon" data-edit="banner" data-id="' + esc(b.ID) + '" aria-label="Ubah">' + ic('pencil', 'w-4 h-4') + '</button><button class="btn btn-ghost btn-sm btn-icon text-danger" data-del="banner" data-id="' + esc(b.ID) + '" data-label="' + esc(b.Judul || 'banner ini') + '" aria-label="Hapus">' + ic('trash-2', 'w-4 h-4') + '</button></div></div></div>'; }).join('') + '</div>'
          : '<div class="card p-10 text-center">' + '<div class="w-14 h-14 rounded-full bg-gold-pale text-gold-ink flex items-center justify-center mx-auto">' + ic('image', 'w-7 h-7') + '</div><h2 class="text-xl font-semibold mt-4">Belum ada banner</h2><p class="text-sm text-muted mt-1 max-w-sm mx-auto">Unggah foto kegiatan agar tampil berputar di beranda.</p><button class="btn btn-primary mt-5" data-bn-multi>' + ic('image-up', 'w-4 h-4') + ' Unggah foto pertama</button></div>');
    }
    Admin._drawBanner = draw; draw();
  };
  function redrawBanner() { if (A.view === 'banner' && Admin._drawBanner) Admin._drawBanner(); }

  // ---------- Unggah banyak foto (banner / galeri) dengan progres ----------
  function multiUpload(o) {
    var files = [], m = U.modal(U.modalHead(o.title, o.sub) + '<div class="px-6 pb-6">' + (o.extra || '') +
      '<label class="label" for="mu-f">Pilih foto</label><input class="field !h-auto py-3" id="mu-f" type="file" accept="image/*" multiple><p class="hint">Maksimal ' + o.max + ' foto sekali unggah. Foto diperkecil otomatis agar cepat dimuat.</p>' +
      '<ul id="mu-list" class="mt-4 space-y-2 max-h-[34vh] overflow-y-auto"></ul><div class="flex justify-end gap-3 mt-5"><button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="mu-go" disabled>' + ic('upload', 'w-4 h-4') + ' <span>Unggah</span></button></div></div>', { label: o.title, wide: true, sticky: true });
    var list = $('#mu-list', m.el), go = $('#mu-go', m.el), busy = false;
    $('#mu-f', m.el).addEventListener('change', function (e) {
      files = Array.prototype.slice.call(e.target.files).filter(function (f) { return /^image\//.test(f.type); }).slice(0, o.max);
      list.innerHTML = files.map(function (f, i) { return '<li class="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm"><span class="flex-1 truncate">' + esc(f.name) + '</span><span class="text-muted shrink-0" data-st="' + i + '">Siap</span></li>'; }).join('');
      go.disabled = !files.length; $('span', go).textContent = files.length ? 'Unggah ' + files.length + ' foto' : 'Unggah';
    });
    go.addEventListener('click', function () {
      if (busy || !files.length) return; busy = true; go.disabled = true;
      var urls = [], next = 0, done = 0, fail = 0;
      function setSt(i, t, cls) { var el = $('[data-st="' + i + '"]', m.el); if (el) { el.textContent = t; el.className = (cls || 'text-muted') + ' shrink-0'; } }
      function worker() {
        if (next >= files.length) return Promise.resolve();
        var i = next++; setSt(i, 'Mengunggah…');
        return H.upload(files[i], o.folder, 1600).then(function (r) {
          if (r.success) { urls[i] = r.data.url; setSt(i, '✓ Terunggah', 'text-ok'); } else { fail++; setSt(i, 'Gagal', 'text-danger'); }
        }).catch(function () { fail++; setSt(i, 'Gagal', 'text-danger'); }).then(function () { done++; $('span', go).textContent = 'Mengunggah ' + done + '/' + files.length + '…'; return worker(); });
      }
      Promise.all([worker(), worker(), worker()]).then(function () {
        var ok = urls.filter(Boolean);
        if (!ok.length) { busy = false; go.disabled = false; $('span', go).textContent = 'Coba lagi'; return U.toast('Semua foto gagal diunggah. Periksa koneksi lalu coba lagi.', 'error'); }
        o.save(ok, m).then(function (r) {
          busy = false;
          if (!r || r.success === false) { go.disabled = false; return U.toast((r && r.message) || 'Gagal menyimpan.', 'error'); }
          m.close(); U.toast(ok.length + ' foto ditambahkan' + (fail ? ' (' + fail + ' gagal)' : ''), fail ? '' : 'ok');
        });
      });
    });
  }

  // =====================================================================
  //  GALERI KEGIATAN
  // =====================================================================
  var selG = {}, galFilter = '';
  Admin.views.galeri = function (main) {
    function draw() {
      var kegs = A.boot.kegiatan.slice().sort(function (a, b) { return a.Tanggal < b.Tanggal ? 1 : -1; }), all = (A.boot.galeri || []).slice().sort(bySeq);
      var ex = {}; all.forEach(function (g) { ex[g.ID] = 1; }); Object.keys(selG).forEach(function (k) { if (!ex[k]) delete selG[k]; });
      if (galFilter && !kegs.some(function (k) { return k.ID === galFilter; })) galFilter = '';
      var by = {}; all.forEach(function (g) { (by[g.Kegiatan_ID] = by[g.Kegiatan_ID] || []).push(g); });
      var albs = kegs.filter(function (k) { return by[k.ID] && (!galFilter || k.ID === galFilter); });
      main.innerHTML = H.pageHead('Galeri Kegiatan', 'Dokumentasi foto setiap kegiatan. Foto tampil di halaman Galeri dan di detail kegiatan.',
        '<button class="btn btn-primary btn-sm" data-gl-multi>' + ic('image-up', 'w-4 h-4') + ' Unggah foto</button>') +
        '<div class="mb-5 max-w-md"><label class="label" for="gl-f">Tampilkan kegiatan</label><select class="field" id="gl-f"><option value="">Semua kegiatan (' + all.length + ' foto)</option>' + kegs.map(function (k) { return '<option value="' + esc(k.ID) + '"' + (k.ID === galFilter ? ' selected' : '') + '>' + esc(k.Judul) + ' (' + (by[k.ID] ? by[k.ID].length : 0) + ')</option>'; }).join('') + '</select></div>' +
        bulkBar(Object.keys(selG).length, 'foto') +
        (albs.length ? albs.map(function (k) {
          var items = by[k.ID];
          return '<section class="mb-10" aria-label="Album ' + esc(k.Judul) + '"><div class="flex flex-wrap items-center justify-between gap-3 mb-3"><div><h2 class="font-display text-xl font-semibold">' + esc(k.Judul) + '</h2><p class="text-sm text-muted">' + U.fmtTgl(k.Tanggal) + ' · ' + items.length + ' foto</p></div>' +
            '<label class="flex items-center gap-2 text-sm font-medium cursor-pointer"><input type="checkbox" data-gsel-alb="' + esc(k.ID) + '"' + (items.every(function (g) { return selG[g.ID]; }) ? ' checked' : '') + '> Pilih semua</label></div>' +
            '<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">' + items.map(function (g, i) {
              return '<div class="card overflow-hidden"><div class="relative">' + U.art(g.Gambar_URL, g.ID, 'aspect-square', g.Keterangan) +
                '<label class="absolute left-2 top-2 w-9 h-9 rounded-lg bg-surface/90 flex items-center justify-center cursor-pointer shadow"><input type="checkbox" data-gsel="' + esc(g.ID) + '"' + (selG[g.ID] ? ' checked' : '') + ' aria-label="Pilih foto ' + (i + 1) + ' ' + esc(k.Judul) + '"></label></div>' +
                '<div class="p-2.5 flex items-center gap-1"><p class="text-xs text-muted flex-1 truncate" title="' + esc(g.Keterangan) + '">' + esc(g.Keterangan || 'Tanpa keterangan') + '</p>' +
                '<button class="btn btn-ghost btn-sm btn-icon" data-edit="galeri" data-id="' + esc(g.ID) + '" aria-label="Ubah keterangan">' + ic('pencil', 'w-4 h-4') + '</button><button class="btn btn-ghost btn-sm btn-icon text-danger" data-del="galeri" data-id="' + esc(g.ID) + '" data-label="foto ini" aria-label="Hapus foto">' + ic('trash-2', 'w-4 h-4') + '</button></div></div>'; }).join('') + '</div></section>';
        }).join('') : '<div class="card p-10 text-center"><div class="w-14 h-14 rounded-full bg-gold-pale text-gold-ink flex items-center justify-center mx-auto">' + ic('images', 'w-7 h-7') + '</div><h2 class="text-xl font-semibold mt-4">Belum ada foto' + (galFilter ? ' untuk kegiatan ini' : '') + '</h2><p class="text-sm text-muted mt-1 max-w-sm mx-auto">Unggah dokumentasi kegiatan agar jamaah dapat melihatnya di halaman Galeri.</p><button class="btn btn-primary mt-5" data-gl-multi>' + ic('image-up', 'w-4 h-4') + ' Unggah foto</button></div>');
    }
    Admin._drawGaleri = draw; draw();
  };
  function redrawGaleri() { if (A.view === 'galeri' && Admin._drawGaleri) Admin._drawGaleri(); }

  function openGaleriUpload() {
    var kegs = A.boot.kegiatan.slice().sort(function (a, b) { return a.Tanggal < b.Tanggal ? 1 : -1; });
    if (!kegs.length) return U.toast('Buat kegiatan terlebih dahulu sebelum menambah foto.', 'error');
    multiUpload({
      title: 'Unggah foto galeri', sub: 'Foto akan masuk ke album kegiatan yang dipilih', folder: 'Galeri', max: 20,
      extra: '<div class="mb-4"><label class="label" for="mu-k">Kegiatan</label><select class="field" id="mu-k">' + kegs.map(function (k) { return '<option value="' + esc(k.ID) + '"' + (k.ID === galFilter ? ' selected' : '') + '>' + esc(k.Judul) + ' (' + U.fmtTgl(k.Tanggal) + ')</option>'; }).join('') + '</select></div>',
      save: function (urls, m) {
        var kid = $('#mu-k', m.el).value;
        return req('galeriTambah', { kegiatanId: kid, items: urls.map(function (u) { return { url: u }; }) }, { timeout: 60000 }).then(function (r) {
          if (r.success) { r.data.items.forEach(function (o) { A.boot.galeri.push(o); }); galFilter = kid; redrawGaleri(); H.afterChange(); }
          return r;
        });
      }
    });
  }
  function openBannerUpload() {
    multiUpload({
      title: 'Unggah banyak foto banner', sub: 'Setiap foto menjadi satu banner baru (bisa diberi judul setelahnya)', folder: 'Banner', max: 10,
      save: function (urls) {
        var jobs = urls.map(function (u) { return req('entitySave', { entity: 'banner', data: { Gambar_URL: u, Status: 'Aktif' } }); });
        return Promise.all(jobs).then(function (rs) {
          rs.forEach(function (r) { if (r.success) H.upsertLocal('banner', r.data); });
          redrawBanner(); H.afterChange();
          var bad = rs.filter(function (r) { return !r.success; })[0]; return bad ? { success: false, message: bad.message } : { success: true };
        });
      }
    });
  }

  // =====================================================================
  //  LOGO & IDENTITAS
  // =====================================================================
  Admin.views.logo = function (main) {
    var cur = (A.boot.pengaturan && A.boot.pengaturan.Logo_URL) || '', pending = cur;
    function prev(u, bg) { return '<div class="rounded-2xl border border-line p-6 flex items-center gap-4" style="background:' + bg + '"><span class="logo-mark ' + (u ? 'has-img' : '') + ' !w-16 !h-16 !rounded-2xl">' + (u ? '<img src="' + esc(u) + '" alt="Pratinjau logo" data-fallback="1">' : U.star('w-8 h-8')) + '</span><span class="font-display text-xl font-semibold" style="color:' + (bg === '#06201A' ? '#fff' : '#0B3D2E') + '">' + esc((window.App && App.S.boot && App.S.boot.app.nama) || 'Nama Majelis') + '</span></div>'; }
    function draw() {
      main.innerHTML = H.pageHead('Logo & Identitas', 'Logo tampil di header, footer, panel admin, dan tab peramban.') + '<div class="grid lg:grid-cols-2 gap-6">' +
        '<section class="card p-6"><h2 class="font-display text-xl font-semibold">Logo majelis</h2><p class="text-sm text-muted mt-1">Gunakan gambar persegi dengan latar transparan (PNG) atau putih, minimal 256×256 px.</p>' +
        '<div class="mt-5 space-y-3" id="lg-prev">' + prev(pending, '#ffffff') + prev(pending, '#06201A') + '</div>' +
        '<div class="mt-5 flex flex-wrap items-center gap-3"><label class="btn btn-gold cursor-pointer">' + ic('upload', 'w-4 h-4') + ' Unggah logo baru<input type="file" id="lg-file" class="sr-only" accept="image/png,image/jpeg,image/webp"></label><span class="text-sm text-muted" id="lg-st"></span></div>' +
        '<div class="mt-4"><label class="label" for="lg-url">Atau tempel alamat gambar (https://…)</label><input class="field" id="lg-url" type="url" maxlength="600" value="' + esc(pending) + '" placeholder="https://…"></div>' +
        '<div class="mt-6 flex flex-wrap gap-3"><button class="btn btn-primary" id="lg-save">Simpan logo</button><button class="btn btn-ghost text-danger" id="lg-reset"' + (cur || pending ? '' : ' disabled') + '>Hapus logo</button></div></section>' +
        '<section class="card p-6 self-start"><h2 class="font-display text-xl font-semibold">Nama & kontak</h2><p class="text-sm text-muted mt-1">Nama majelis, alamat, dan nomor WhatsApp diatur di menu Pengaturan.</p><button class="btn btn-line mt-4" data-view="pengaturan">' + ic('settings', 'w-4 h-4') + ' Buka Pengaturan</button></section></div>';
      var st = $('#lg-st');
      $('#lg-file').addEventListener('change', function (e) {
        var f = e.target.files[0]; if (!f) return; st.textContent = 'Mengunggah…';
        H.upload(f, 'Logo', 512, 'png').then(function (r) { if (!r.success) { st.textContent = ''; return U.toast(r.message, 'error'); } pending = r.data.url; $('#lg-url').value = pending; st.textContent = '✓ Terunggah — tekan Simpan logo'; $('#lg-prev').innerHTML = prev(pending, '#ffffff') + prev(pending, '#06201A'); });
      });
      $('#lg-url').addEventListener('change', function (e) { pending = e.target.value.trim(); $('#lg-prev').innerHTML = prev(pending, '#ffffff') + prev(pending, '#06201A'); });
      function save(val, msg, btn) {
        U.busy(btn, true, 'Menyimpan…');
        req('pengaturanSave', { data: { Logo_URL: val } }).then(function (r) {
          U.busy(btn, false); if (!r.success) return U.toast(r.message, 'error');
          A.boot.pengaturan = Object.assign(A.boot.pengaturan || {}, { Logo_URL: r.data.Logo_URL || '' }); cur = pending = r.data.Logo_URL || '';
          U.toast(msg, 'ok'); H.afterChange(); Admin.h.render();
          $$('.logo-mark').forEach(function () {});    // sisi admin menyusul saat render ulang
        });
      }
      $('#lg-save').onclick = function (e) { var v = $('#lg-url').value.trim(); if (v && !/^https:\/\//i.test(v)) return U.toast('Alamat gambar harus diawali https://', 'error'); save(v, 'Logo disimpan', e.currentTarget); };
      $('#lg-reset').onclick = function (e) { var b = e.currentTarget; U.confirm('Hapus logo?', 'Situs kembali memakai ikon bintang bawaan.', 'Hapus logo', true).then(function (ok) { if (ok) { pending = ''; save('', 'Logo dihapus', b); } }); };
    }
    draw();
  };

  // ---------- Delegasi ----------
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#adm-main')) return;
    var t;
    if (e.target.closest('[data-bn-multi]')) return openBannerUpload();
    if (e.target.closest('[data-gl-multi]')) return openGaleriUpload();
    if ((t = e.target.closest('[data-bmove]'))) return move('banner', t.dataset.id, +t.dataset.bmove), redrawBanner();
    if ((t = e.target.closest('[data-btoggle]'))) {
      var b = A.boot.banner.filter(function (x) { return x.ID === t.dataset.btoggle; })[0]; if (!b) return; var to = b.Status === 'Aktif' ? 'Nonaktif' : 'Aktif', old = b.Status; b.Status = to; redrawBanner();
      return req('entitySave', { entity: 'banner', id: b.ID, data: { Status: to } }).then(function (r) { if (!r.success) { b.Status = old; redrawBanner(); U.toast(r.message, 'error'); } else { U.toast(to === 'Aktif' ? 'Banner ditampilkan' : 'Banner disembunyikan', 'ok'); H.afterChange(); } });
    }
    if ((t = e.target.closest('[data-mbulk]'))) {
      var isB = A.view === 'banner', sel = isB ? selB : selG, ids = Object.keys(sel);
      if (t.dataset.mbulk === 'clear') { if (isB) selB = {}; else selG = {}; return isB ? redrawBanner() : redrawGaleri(); }
      return deleteMany(isB ? 'banner' : 'galeri', ids, isB ? 'banner' : 'foto', function () { if (isB) selB = {}; else selG = {}; isB ? redrawBanner() : redrawGaleri(); });
    }
  });
  document.addEventListener('change', function (e) {
    var t = e.target; if (!t.closest || !t.closest('#adm-main')) return;
    if (t.dataset.bsel) { if (t.checked) selB[t.dataset.bsel] = 1; else delete selB[t.dataset.bsel]; return redrawBanner(); }
    if (t.dataset.gsel) { if (t.checked) selG[t.dataset.gsel] = 1; else delete selG[t.dataset.gsel]; return redrawGaleri(); }
    if (t.dataset.gselAlb) { (A.boot.galeri || []).forEach(function (g) { if (g.Kegiatan_ID === t.dataset.gselAlb) { if (t.checked) selG[g.ID] = 1; else delete selG[g.ID]; } }); return redrawGaleri(); }
    if (t.id === 'gl-f') { galFilter = t.value; redrawGaleri(); }
  });
})();
