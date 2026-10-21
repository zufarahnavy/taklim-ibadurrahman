/**
 * admin.js — Panel Superadmin (dimuat malas hanya saat #/admin dibuka).
 * Semua data admin disimpan di MEMORI (bukan localStorage) karena berisi data pribadi peserta.
 * Perubahan memakai pembaruan optimistik: tampilan berubah seketika, server menyusul.
 */
(function () {
  'use strict';
  var U = UI, $ = U.$, $$ = U.$$, esc = U.esc, ic = U.ic, C = APP_CONFIG;
  var A = { boot: null, view: 'ringkasan', root: null, mounted: false, insight: null };
  var Admin = window.Admin = { A: A, views: {}, h: {} };

  function req(action, data, opt) { return api(action, data || {}, Object.assign({ role: 'admin' }, opt || {})); }
  Admin.h.req = req;

  // ---------- Navigasi ----------
  var NAV = [
    { k: 'ringkasan', l: 'Ringkasan', i: 'layout-dashboard' }, { k: 'peserta', l: 'Peserta', i: 'users' }, { k: 'kegiatan', l: 'Kegiatan & Absensi', i: 'calendar-days' },
    { k: 'narasumber', l: 'Narasumber', i: 'mic-vocal' }, { k: 'berita', l: 'Berita', i: 'newspaper' }, { k: 'materi', l: 'Materi', i: 'file-text' },
    { k: 'banner', l: 'Banner Beranda', i: 'image', lazy: 1 }, { k: 'galeri', l: 'Galeri Kegiatan', i: 'images', lazy: 1 },
    { k: 'broadcast', l: 'Broadcast WhatsApp', i: 'message-circle', lazy: 1 }, { k: 'grandprize', l: 'Grand Prize', i: 'trophy', lazy: 1 }, { k: 'form', l: 'Form Builder', i: 'clipboard-list', lazy: 1 }, { k: 'laporan', l: 'Laporan', i: 'file-spreadsheet', lazy: 1 },
    { k: 'about', l: 'Konten About', i: 'book-open', lazy: 1 }, { k: 'migrasi', l: 'Migrasi Data', i: 'database', lazy: 1 }, { k: 'backup', l: 'Backup & Restore', i: 'hard-drive', lazy: 1 },
    { k: 'logo', l: 'Logo & Identitas', i: 'badge-check', lazy: 1 },
    { k: 'pengaturan', l: 'Pengaturan & Audit', i: 'settings', lazy: 1 }
  ];
  var TITLES = {}; NAV.forEach(function (n) { TITLES[n.k] = n.l; });

  // ---------- Muat modul lanjutan ----------
  var extraP = null, EXTRA = ['js/admin-lanjut.js', 'js/admin-media.js', 'js/admin-broadcast.js'], EXTRA_V = '?v=5';
  /** Muat satu skrip dengan batas waktu; skrip gagal dibuang agar percobaan ulang tidak menumpuk tag. */
  function loadScript(src, ms) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'), done = false;
      function fin(ok) { if (done) return; done = true; clearTimeout(t); s.onload = s.onerror = null; if (ok) res(); else { if (s.parentNode) s.parentNode.removeChild(s); rej(new Error('muat ' + src)); } }
      var t = setTimeout(function () { fin(false); }, ms);
      s.onload = function () { fin(true); }; s.onerror = function () { fin(false); };
      s.src = src + EXTRA_V; document.head.appendChild(s);
    });
  }
  function loadRetry(src, n) { return loadScript(src, 12000).catch(function (e) { if (n > 0) return new Promise(function (r) { setTimeout(r, 600); }).then(function () { return loadRetry(src, n - 1); }); throw e; }); }
  function ensureExtra() {
    if (Admin.extraLoaded) return Promise.resolve();
    if (!extraP) extraP = Promise.all(EXTRA.map(function (src) { return loadRetry(src, 2); })).then(function () { Admin.extraLoaded = true; }, function (e) { extraP = null; throw e; });
    return extraP;
  }

  // ---------- Login ----------
  function loginView() {
    A.root.innerHTML = '<div class="min-h-dvh flex items-center justify-center p-5 hero-bg relative"><div class="star-pattern absolute inset-0 opacity-60" aria-hidden="true"></div>' +
      '<div class="relative w-full max-w-md card p-8 sm:p-10"><div class="mx-auto w-fit">' + logoMark('!w-14 !h-14') + '</div>' +
      '<h1 class="font-display text-3xl font-semibold text-center mt-5">Panel Pengurus</h1><p class="text-center text-muted text-sm mt-2">Khusus Superadmin. Masuk dengan akun Google yang telah didaftarkan.</p>' +
      '<div class="mt-8 flex justify-center min-h-[44px]" id="g-btn"><div class="skeleton w-64 h-11 !rounded-full"></div></div><p class="err text-center hidden" id="login-err" role="alert"></p>' +
      '<details class="mt-8 group" id="darurat" hidden><summary class="text-sm text-muted text-center cursor-pointer select-none hover:text-heading">Akses darurat</summary>' +
      '<form class="mt-4 space-y-3" id="f-darurat" novalidate><label class="label" for="pp">Passphrase darurat</label><input class="field" id="pp" name="pass" type="password" autocomplete="off" minlength="16" placeholder="Minimal 16 karakter"><button class="btn btn-gold w-full" type="submit">' + ic('key-round', 'w-4 h-4') + ' Masuk darurat</button>' +
      '<p class="hint">Sesi darurat hanya 30 menit dan dicatat di audit log.</p></form></details>' +
      '<a href="#/home" class="block text-center text-sm font-medium text-heading mt-8 hover:underline">← Kembali ke situs</a></div></div>';
    var err = $('#login-err');
    function showErr(m) { err.textContent = m; err.classList.remove('hidden'); }
    function done(r) {
      if (!r.success) return showErr(r.message);
      Session.set('admin', { token: r.data.token, exp: r.data.exp, email: r.data.email, nama: r.data.nama, metode: r.data.metode });
      A.boot = r.data.boot; A.view = 'ringkasan'; shell(); startPolling();
    }
    req('nonceLogin', {}, { noToken: true }).then(function (r) {
      if (!r.success) { $('#g-btn').innerHTML = ''; return showErr(r.message); }
      var cfg = r.data;
      if (cfg.darurat) $('#darurat').hidden = false;
      if (!cfg.clientId) { $('#g-btn').innerHTML = ''; return showErr('OAUTH_CLIENT_ID belum diisi di Script Properties.'); }
      function init() {
        google.accounts.id.initialize({ client_id: cfg.clientId, nonce: cfg.nonce, ux_mode: 'popup', callback: function (resp) { req('loginGoogle', { credential: resp.credential, nonce: cfg.nonce }, { noToken: true }).then(done); } });
        $('#g-btn').innerHTML = ''; google.accounts.id.renderButton($('#g-btn'), { theme: 'filled_black', size: 'large', shape: 'pill', text: 'signin_with', locale: 'id', width: 280 });
      }
      if (window.google && google.accounts) init(); else { var s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = init; s.onerror = function () { $('#g-btn').innerHTML = ''; showErr('Gagal memuat Google Sign-In. Periksa koneksi atau gunakan akses darurat.'); }; document.head.appendChild(s); }
    });
    $('#f-darurat').addEventListener('submit', function (e) {
      e.preventDefault(); var btn = $('[type=submit]', e.target), pass = $('#pp').value;
      if (pass.length < 16) return showErr('Passphrase minimal 16 karakter.');
      U.busy(btn, true, 'Memeriksa…'); req('loginDarurat', { passphrase: pass }, { noToken: true }).then(function (r) { U.busy(btn, false); $('#pp').value = ''; done(r); });
    });
  }

  // ---------- Cangkang ----------
  function shell() {
    var s = Session.get('admin') || {};
    var nav = NAV.map(function (n) { return '<button class="side-link" data-view="' + n.k + '"' + (A.view === n.k ? ' aria-current="page"' : '') + '>' + ic(n.i) + '<span>' + esc(n.l) + '</span></button>'; }).join('');
    A.root.innerHTML = '<div class="min-h-dvh lg:flex bg-canvas">' +
      '<aside class="hidden lg:flex flex-col w-72 shrink-0 border-r border-line bg-surface sticky top-0 h-dvh p-5 gap-1 overflow-y-auto" aria-label="Menu admin">' + brand() + '<nav class="flex flex-col gap-1 mt-6" id="adm-nav">' + nav + '</nav>' + foot(s) + '</aside>' +
      '<div class="flex-1 min-w-0"><header class="lg:hidden sticky top-0 z-30 bg-surface/95 border-b border-line flex items-center justify-between px-4 h-14" style="backdrop-filter:blur(8px)"><div class="flex items-center gap-2 font-display font-semibold text-heading">' + U.star('w-5 h-5 text-gold') + '<span id="adm-title">Ringkasan</span></div><button class="btn btn-ghost btn-icon" id="adm-menu" aria-label="Buka menu">' + ic('menu') + '</button></header>' +
      '<div id="adm-dummy"></div><main class="p-4 sm:p-6 lg:p-10 max-w-[1400px]" id="adm-main" tabindex="-1"></main></div></div>' +
      '<div id="adm-drawer" hidden class="fixed inset-0 z-[85] lg:hidden"><div class="absolute inset-0 bg-emerald-night/60" data-dclose></div><aside class="drawer-panel bg-surface p-5 flex flex-col gap-1 overflow-y-auto">' + brand() + '<nav class="flex flex-col gap-1 mt-4">' + nav + '</nav>' + foot(s) + '</aside></div>';
    A.mounted = true; renderView(); idle();
  }
  function logoUrl() { var p = A.boot && A.boot.pengaturan; return (p && p.Logo_URL) || (window.App && App.S.boot && App.S.boot.app.logo) || ''; }
  function logoMark(cls) { var u = logoUrl(); return '<span class="logo-mark ' + (u ? 'has-img ' : '') + (cls || '') + '">' + (u ? '<img src="' + esc(u) + '" alt="" decoding="async" data-fallback="1">' : U.star('w-5 h-5')) + '</span>'; }
  Admin.h.logoMark = logoMark;
  function brand() { return '<div class="flex items-center gap-3">' + logoMark('!w-11 !h-11') + '<div><p class="font-display font-semibold text-heading leading-tight">SIM Ibadurrahman</p><p class="text-xs text-muted">Superadmin Portal</p></div></div>'; }
  function foot(s) {
    return '<div class="mt-auto pt-5 border-t border-line space-y-2"><div class="flex items-center gap-3 px-2">' + U.avatar(s.nama || s.email || 'A', '', 'w-9 h-9 text-xs') + '<div class="min-w-0"><p class="text-sm font-medium truncate">' + esc(s.nama || 'Superadmin') + '</p><p class="text-xs text-muted truncate">' + esc(s.metode === 'darurat' ? 'Sesi darurat' : s.email || '') + '</p></div></div>' +
      '<div class="flex gap-2"><a class="btn btn-ghost btn-sm flex-1" href="#/home">' + ic('external-link', 'w-4 h-4') + ' Lihat situs</a><button class="btn btn-ghost btn-sm btn-icon" data-theme-toggle><span data-theme-icon></span></button><button class="btn btn-danger btn-sm" data-act-adm="logout" aria-label="Keluar">' + ic('log-out', 'w-4 h-4') + '</button></div></div>';
  }
  function idle() { U.$$('[data-theme-icon]').forEach(function (e) { e.innerHTML = ic(document.documentElement.getAttribute('data-theme') === 'dark' ? 'sun' : 'moon'); }); U.idle(ensureExtra); }

  function dummyBanner() {
    var el = $('#adm-dummy'); if (!el) return;
    el.innerHTML = A.boot && A.boot.dummy ? '<div class="bg-gold-pale text-gold-ink border-b border-gold/40 px-4 sm:px-6 lg:px-10 py-3 flex flex-wrap items-center justify-between gap-3 text-sm"><span class="flex items-center gap-2 font-medium">' + ic('triangle-alert', 'w-4 h-4') + ' Data dummy aktif — sebagian data di situs hanyalah contoh.</span><button class="btn btn-sm btn-gold" data-view="pengaturan">Kelola data dummy</button></div>' : '';
  }

  function renderView() {
    var main = $('#adm-main'); if (!main) return;
    $$('[data-view]').forEach(function (b) { if (b.classList.contains('side-link')) { if (b.dataset.view === A.view) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); } });
    var t = $('#adm-title'); if (t) t.textContent = TITLES[A.view] || '';
    dummyBanner();
    var v = Admin.views[A.view];
    main._lazyTok = (main._lazyTok || 0) + 1; main._lazyLoading = null;
    if (v) { main.innerHTML = ''; try { v(main); } catch (e) { main.innerHTML = '<div class="card p-8 text-center max-w-lg mx-auto"><h2 class="font-display text-xl font-semibold">Tampilan gagal dibuka</h2><p class="text-muted mt-2">Muat ulang halaman jika berulang.</p><button class="btn btn-primary mt-5" onclick="location.reload()">Muat ulang</button></div>'; if (window.console) console.error(e); } return; }
    var nv = NAV.filter(function (n) { return n.k === A.view; })[0];
    if (nv && nv.lazy) {
      if (main._lazyLoading === A.view) return;   // pemuatan modul untuk tampilan ini sedang berjalan: jangan mulai ulang
      var want = A.view, tok = main._lazyTok = (main._lazyTok || 0) + 1;
      main._lazyLoading = want;
      main.innerHTML = '<div class="space-y-4">' + App.sk(2, 160) + '</div>';
      ensureExtra().then(function () {
        if (main._lazyTok !== tok) return;
        main._lazyLoading = null;
        if (!Admin.views[want]) throw new Error('tampilan tidak ada');
        main.innerHTML = ''; Admin.views[want](main);
      }).catch(function (err) {
        if (main._lazyTok !== tok) return;
        main._lazyLoading = null;
        main.innerHTML = '<div class="card p-8 text-center max-w-lg mx-auto"><span class="w-12 h-12 rounded-2xl bg-gold-pale text-gold-ink inline-flex items-center justify-center">' + ic('wifi-off', 'w-6 h-6') + '</span><h2 class="font-display text-xl font-semibold mt-4">Halaman belum bisa dimuat</h2><p class="text-muted mt-2">Koneksi internet sedang lambat atau terputus. Data Anda aman. Coba muat ulang halaman ini.</p><button class="btn btn-primary mt-5" data-act="muat-ulang">' + ic('refresh-cw', 'w-4 h-4') + ' Muat ulang</button></div>';
        var b = main.querySelector('[data-act="muat-ulang"]'); if (b) b.addEventListener('click', function () { main._lazyLoading = null; renderView(); });
      });
    }
  }
  /** Segarkan tampilan hanya bila admin tidak sedang mengetik (agar isian formulir tidak hilang saat data latar tersinkron). */
  Admin.h.render = function () {
    var ae = document.activeElement;
    if (modalOpen() || (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) && ae.closest && ae.closest('#adm-main'))) return;
    renderView();
  };
  function modalOpen() { return !!document.querySelector('[data-overlay]'); }
  function setView(k) { A.view = k; renderView(); window.scrollTo(0, 0); var d = $('#adm-drawer'); if (d) { d.hidden = true; document.documentElement.style.overflow = ''; } }

  // ---------- Helper umum admin ----------
  function pageHead(title, sub, actions) {
    return '<div class="flex flex-wrap items-end justify-between gap-4 mb-6"><div><h1 class="font-display text-3xl font-semibold">' + esc(title) + '</h1>' + (sub ? '<p class="text-muted mt-1">' + esc(sub) + '</p>' : '') + '</div><div class="flex flex-wrap gap-2">' + (actions || '') + '</div></div>';
  }
  Admin.h.pageHead = pageHead;
  function stat(icon, label, val, sub) { return '<div class="card p-5"><div class="flex items-center gap-3"><span class="w-10 h-10 rounded-2xl bg-gold-pale text-gold-ink flex items-center justify-center">' + ic(icon, 'w-5 h-5') + '</span><span class="text-sm text-muted font-medium">' + esc(label) + '</span></div><p class="font-display text-4xl font-semibold mt-3">' + val + '</p>' + (sub ? '<p class="text-xs text-muted mt-1">' + esc(sub) + '</p>' : '') + '</div>'; }
  Admin.h.stat = stat;
  function tableWrap(inner) { return '<div class="card overflow-hidden"><div class="overflow-x-auto max-h-[70vh]">' + inner + '</div></div>'; }
  Admin.h.tableWrap = tableWrap;
  function searchBox(id, ph, val) { return '<label class="relative block w-full sm:w-72"><span class="sr-only">' + esc(ph) + '</span><span class="absolute left-4 top-1/2 -translate-y-1/2 text-muted">' + ic('search', 'w-5 h-5') + '</span><input id="' + id + '" class="field !pl-12" type="search" placeholder="' + esc(ph) + '" value="' + esc(val || '') + '" autocomplete="off"></label>'; }
  Admin.h.searchBox = searchBox;
  function bindSearch(id, cb) { var i = $('#' + id); if (!i) return; i.addEventListener('input', U.debounce(function () { cb(i.value); }, 120)); }
  Admin.h.bindSearch = bindSearch;

  // ---------- Unggah berkas ----------
  function uploadFile(file, folder, px, fmt) {
    var isImg = /^image\//.test(file.type);
    var p = isImg ? U.imageToB64(file, px || 1280, fmt) : U.fileToB64(file).then(function (b) { return { mime: file.type, b64: b, name: file.name }; });
    return p.then(function (f) { return req('upload', { folder: folder, name: f.name || file.name, mime: f.mime, b64: f.b64 }, { timeout: 60000 }); });
  }
  Admin.h.upload = uploadFile; Admin.h.modalOpen = function () { return modalOpen(); };

  // ---------- Form modal generik ----------
  /** fields: [{k,l,type,req,opts:[{v,l}],folder,hint,max}] ; values: objek ; onSave(data) -> Promise<{success,message}> */
  function formModal(title, fields, values, onSave, o) {
    o = o || {};
    var html = fields.map(function (f) {
      var id = 'af-' + f.k, v = values[f.k] == null ? '' : values[f.k], lab = esc(f.l) + (f.req ? ' <span class="text-danger" aria-hidden="true">*</span>' : ''), inp;
      if (f.type === 'textarea') inp = '<textarea class="field" id="' + id + '" name="' + f.k + '" rows="' + (f.rows || 4) + '" maxlength="' + (f.max || 2000) + '">' + esc(v) + '</textarea>';
      else if (f.type === 'checks') { var cur = String(v).split('|').map(function (x) { return x.trim().toLowerCase(); }); inp = (f.opts && f.opts.length) ? '<div class="flex flex-wrap gap-2" role="group" aria-label="' + esc(f.l) + '" data-checks="' + f.k + '">' + f.opts.map(function (op) { return '<label class="chip-check"><input type="checkbox" class="sr-only" value="' + esc(op.v) + '"' + (cur.indexOf(String(op.v).toLowerCase()) >= 0 ? ' checked' : '') + '><span class="rounded-full border border-line px-4 py-2 text-sm font-medium cursor-pointer inline-block">' + esc(op.l) + '</span></label>'; }).join('') + '</div>' : '<p class="text-sm text-muted rounded-xl bg-gold-pale/50 px-4 py-3">Belum ada kategori kegiatan. Isi kolom <strong>Kategori</strong> pada kegiatan rutin lebih dulu (mis. "Kajian Rutin").</p>'; }
      else if (f.type === 'select') inp = '<select class="field" id="' + id + '" name="' + f.k + '">' + (f.opts || []).map(function (op) { return '<option value="' + esc(op.v) + '"' + (String(op.v) === String(v) ? ' selected' : '') + '>' + esc(op.l) + '</option>'; }).join('') + '</select>';
      else if (f.type === 'image' || f.type === 'file') inp = '<div class="space-y-2"><input class="field" id="' + id + '" name="' + f.k + '" type="url" placeholder="https://… (otomatis terisi setelah unggah)" value="' + esc(v) + '"><div class="flex items-center gap-3"><label class="btn btn-gold btn-sm cursor-pointer">' + ic('upload', 'w-4 h-4') + ' Unggah ' + (f.type === 'image' ? 'gambar' : 'berkas') + '<input type="file" class="sr-only" data-up="' + f.k + '" data-folder="' + esc(f.folder) + '" data-px="' + (f.px || '') + '" data-fmt="' + (f.fmt || '') + '" accept="' + (f.type === 'image' ? 'image/*' : '.pdf,.ppt,.pptx,image/*') + '"></label><span class="text-xs text-muted" data-upst="' + f.k + '"></span></div></div>';
      else inp = (f.list ? '<datalist id="dl-' + f.k + '">' + f.list.map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist>' : '') + '<input class="field" ' + (f.list ? 'list="dl-' + f.k + '" ' : '') + 'id="' + id + '" name="' + f.k + '" type="' + (f.type || 'text') + '" ' + (f.type === 'number' ? 'min="0" inputmode="numeric"' : '') + ' maxlength="' + (f.max || 200) + '" value="' + esc(v) + '"' + (f.ro ? ' readonly' : '') + '>';
      return '<div class="' + (f.half ? 'sm:col-span-1' : 'sm:col-span-2') + '"><label class="label" for="' + id + '">' + lab + '</label>' + inp + (f.hint ? '<p class="hint">' + esc(f.hint) + '</p>' : '') + '</div>';
    }).join('');
    var m = U.modal(U.modalHead(title) + '<form class="px-6 pb-6 grid sm:grid-cols-2 gap-4" novalidate>' + html + '<div class="sm:col-span-2 flex gap-3 justify-end pt-2"><button type="button" class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" type="submit">Simpan</button></div></form>', { label: title, wide: true });
    var form = $('form', m.el);
    form.addEventListener('change', function (e) {
      var inp = e.target; if (!inp.dataset || !inp.dataset.up || !inp.files[0]) return;
      var st = $('[data-upst=' + inp.dataset.up + ']', form); st.textContent = 'Mengunggah…';
      uploadFile(inp.files[0], inp.dataset.folder, +inp.dataset.px || 0, inp.dataset.fmt || '').then(function (r) { if (!r.success) { st.textContent = ''; return U.toast(r.message, 'error'); } $('[name=' + inp.dataset.up + ']', form).value = r.data.url; st.textContent = '✓ Terunggah'; });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault(); var d = U.formData(form), btn = $('[type=submit]', form);
      fields.forEach(function (f) { if (f.type === 'checks') d[f.k] = Array.prototype.map.call(form.querySelectorAll('[data-checks=' + f.k + '] input:checked'), function (c) { return c.value; }).join('|'); });
      for (var i = 0; i < fields.length; i++) { var f = fields[i]; if (f.req && !String(d[f.k] || '').trim()) return U.fieldErr(form, f.k, f.l + ' wajib diisi.'); }
      U.busy(btn, true, 'Menyimpan…');
      Promise.resolve(onSave(d)).then(function (r) { U.busy(btn, false); if (r && r.success === false) return U.toast(r.message, 'error'); m.close(); });
    });
    return m;
  }
  Admin.h.formModal = formModal;

  // ---------- Penyimpanan lokal optimistik ----------
  function kategoriKegiatan() { var seen = {}, out = []; list('kegiatan').forEach(function (k) { var c = String(k.Kategori || '').trim(); if (c && !seen[c.toLowerCase()]) { seen[c.toLowerCase()] = 1; out.push(c); } }); return out.sort(); }
  function list(ent) { return A.boot[ent] || (A.boot[ent] = []); }
  function upsertLocal(ent, row) { var l = list(ent), i = l.findIndex(function (x) { return x.ID === row.ID; }); if (i >= 0) l[i] = Object.assign(l[i], row); else l.unshift(row); }
  Admin.h.list = list; Admin.h.upsertLocal = upsertLocal;
  function afterChange() { App.loadBoot(true); }       // sinkronkan data publik di latar
  Admin.h.afterChange = afterChange;
  function saveEntity(ent, id, data) {
    return req('entitySave', { entity: ent, id: id, data: data }).then(function (r) {
      if (!r.success) return r;
      upsertLocal(ent, r.data); renderView(); U.toast(id ? 'Perubahan disimpan' : 'Data ditambahkan', 'ok'); afterChange(); return r;
    });
  }
  Admin.h.saveEntity = saveEntity;
  function deleteEntity(ent, id, label) {
    U.confirm('Hapus data?', '"' + label + '" akan dihapus permanen beserta data terkait.', 'Hapus', true).then(function (ok) {
      if (!ok) return; var l = list(ent), i = l.findIndex(function (x) { return x.ID === id; }); if (i < 0) return; var bak = l.splice(i, 1)[0]; renderView();
      req('entityDelete', { entity: ent, id: id }).then(function (r) { if (!r.success) { l.splice(i, 0, bak); renderView(); return U.toast(r.message, 'error'); } U.toast('Data dihapus', 'ok'); afterChange(); if (ent !== 'materi') refreshBoot(true); });
    });
  }
  Admin.h.deleteEntity = deleteEntity;
  var bootBusy = false;
  function refreshBoot(quiet) {
    if (bootBusy) return Promise.resolve(null);   // satu permintaan latar dalam satu waktu
    bootBusy = true;
    return req('adminBoot', {}, { timeout: 20000, retries: 1 }).then(function (r) { bootBusy = false; return r; }, function (e) { bootBusy = false; throw e; }).then(function (r) {
      if (!r.success) { if (!quiet) U.toast(r.message, 'error'); return; }
      var changed = JSON.stringify(r.data) !== A.lastJson; A.lastJson = JSON.stringify(r.data);
      A.boot = r.data; if (changed) Admin.h.render(); return r;
    });
  }
  Admin.h.refreshBoot = refreshBoot;

  // ---------- Tampilan: Ringkasan ----------
  function kegOptions(withEmpty) { return (withEmpty ? [{ v: '', l: '— Pilih —' }] : []).concat(A.boot.kegiatan.map(function (k) { return { v: k.ID, l: k.Judul + ' (' + U.fmtTgl(k.Tanggal) + ')' }; })); }
  function narOptions() { return [{ v: '', l: '— Belum ditentukan —' }].concat(A.boot.narasumber.map(function (n) { return { v: n.ID, l: n.Nama }; })); }
  Admin.h.kegOptions = kegOptions;

  Admin.views.ringkasan = function (main) {
    var r = A.boot.ringkasan;
    function draw() {
      var ins = A.insight;
      var tone = { good: 'bg-ok-soft text-ok', warn: 'bg-gold-pale text-gold-ink', info: 'bg-surface-3 text-heading' };
      var insHtml = !ins ? '<div class="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">' + App.sk(4, 110) + '</div>' :
        '<div class="rounded-3xl border border-gold/50 p-6 sm:p-8" style="background:linear-gradient(135deg,rgb(var(--c-goldpale)),rgb(var(--c-surface)))"><div class="flex items-start gap-4"><span class="w-12 h-12 rounded-2xl bg-brand text-gold flex items-center justify-center shrink-0">' + ic('sparkles', 'w-6 h-6') + '</span><div><h2 class="font-display text-2xl font-semibold">Insight Otomatis</h2><p class="text-muted mt-1">' + esc(ins.ringkas) + '</p></div></div>' +
        '<div class="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-6">' + ins.kartu.map(function (k) { return '<div class="rounded-2xl bg-surface border border-line p-4"><p class="text-xs font-semibold uppercase tracking-wider text-muted">' + esc(k.judul) + '</p><p class="font-display text-2xl font-semibold mt-1 truncate">' + esc(k.nilai) + '</p><p class="text-xs mt-1 inline-flex px-2 py-0.5 rounded-full ' + tone[k.tone] + '">' + esc(k.ket) + '</p></div>'; }).join('') + '</div>' +
        '<div class="grid lg:grid-cols-3 gap-6 mt-6"><div class="lg:col-span-2"><h3 class="font-semibold mb-3">Tren kehadiran (8 kegiatan terakhir)</h3><div class="flex items-end gap-2 h-40" role="img" aria-label="Grafik batang kehadiran">' +
        ins.tren.map(function (t) { return '<div class="flex-1 flex flex-col items-center justify-end h-full gap-1 min-w-0"><span class="text-[11px] font-semibold">' + t.persen + '%</span><div class="w-full rounded-t-xl" style="height:' + Math.max(4, t.persen) + '%;background:linear-gradient(180deg,#CDA434,#0B3D2E)" title="' + esc(t.judul) + '"></div><span class="text-[10px] text-muted truncate w-full text-center">' + esc(U.fmtTgl(t.tanggal).slice(0, 6)) + '</span></div>'; }).join('') + '</div></div>' +
        '<div><h3 class="font-semibold mb-3">Perlu disapa</h3>' + (ins.perhatian.length ? '<ul class="space-y-2 max-h-40 overflow-y-auto">' + ins.perhatian.map(function (p) { return '<li class="flex items-center justify-between gap-2 text-sm rounded-xl bg-surface border border-line px-3 py-2"><span class="truncate">' + esc(p.nama) + '</span><a class="btn btn-ghost btn-sm" target="_blank" rel="noopener noreferrer" href="https://wa.me/' + esc(p.hp) + '" aria-label="WhatsApp ' + esc(p.nama) + '">' + ic('phone', 'w-4 h-4') + '</a></li>'; }).join('') + '</ul>' : '<p class="text-sm text-muted">Tidak ada. Semua peserta aktif hadir belakangan ini 🎉</p>') + '</div></div></div>';
      main.innerHTML = pageHead('Ringkasan', 'Gambaran cepat kondisi majelis hari ini.', '<button class="btn btn-gold btn-sm" data-view="kegiatan">' + ic('calendar-days', 'w-4 h-4') + ' Kelola absensi</button>') +
        '<div class="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">' + stat('users', 'Peserta aktif', U.num(r.aktif), 'dari ' + U.num(r.peserta) + ' terdaftar') + stat('calendar-days', 'Kegiatan', U.num(r.kegiatan), r.dibuka + ' absensi dibuka') + stat('circle-check', 'Total kehadiran', U.num(r.hadir)) + stat('trophy', 'Program Grand Prize', U.num(r.program)) + '</div><div class="mt-8">' + insHtml + '</div>';
    }
    draw();
    if (!A.insight) req('insight').then(function (x) { if (x.success) { A.insight = x.data; if (A.view === 'ringkasan') draw(); } });
    else req('insight').then(function (x) { if (x.success && JSON.stringify(x.data) !== JSON.stringify(A.insight)) { A.insight = x.data; if (A.view === 'ringkasan' && !modalOpen()) draw(); } });
  };

  // ---------- Tampilan: Peserta (dengan checklist massal) ----------
  var qPes = '', selPes = {};
  function selCount() { return Object.keys(selPes).length; }
  function pesBar() {
    var n = selCount(); if (!n) return '';
    return '<div class="sticky top-2 z-20 mb-3 rounded-xl border border-gold bg-surface shadow-float p-3 flex flex-wrap items-center gap-2" role="region" aria-label="Aksi untuk peserta terpilih"><span class="font-semibold px-1">' + n + ' dipilih</span><span class="flex-1"></span>' +
      '<button class="btn btn-line btn-sm" data-bulk="aktif">' + ic('check', 'w-4 h-4') + ' Aktifkan</button><button class="btn btn-line btn-sm" data-bulk="nonaktif">' + ic('eye-off', 'w-4 h-4') + ' Nonaktifkan</button>' +
      '<button class="btn btn-danger btn-sm" data-bulk="hapus">' + ic('trash-2', 'w-4 h-4') + ' Hapus</button><button class="btn btn-ghost btn-sm" data-bulk="clear">Batal pilih</button></div>';
  }
  function syncSel() {
    var bar = $('#pes-bar'); if (bar) bar.innerHTML = pesBar();
    var all = $$('[data-sel]'), on = all.filter(function (c) { return c.checked; }).length, h = $('#sel-all');
    if (h) { h.checked = all.length > 0 && on === all.length; h.indeterminate = on > 0 && on < all.length; }
    all.forEach(function (c) { var tr = c.closest('tr'); if (tr) tr.style.background = c.checked ? 'rgb(var(--c-goldpale) / .45)' : ''; });
  }
  /** Pencarian peserta: tiap kata harus cocok di nama / ID / alamat / JK; angka dicocokkan juga ke No. HP (0812… = 62812…, spasi & strip diabaikan). */
  function pesFilter(rows, q) {
    q = String(q || '').toLowerCase().trim(); if (!q) return rows;
    var tokens = q.split(/\s+/).filter(String), digits = q.replace(/\D/g, '');
    var hpq = digits.length >= 3 ? digits.replace(/^(0|62)/, '') : '';
    return rows.filter(function (p) {
      var hp = String(p.No_HP || '').replace(/\D/g, ''), hay = [p.Nama, p.Kode, p.Alamat, p.No_HP, p.Jenis_Kelamin === 'Laki-laki' ? 'laki-laki pria' : p.Jenis_Kelamin === 'Perempuan' ? 'perempuan wanita' : ''].join(' ').toLowerCase(), hay2 = hay.replace(/[\s\-_.]/g, '');
      if (hpq && hp.replace(/^(0|62)/, '').indexOf(hpq) >= 0 && tokens.length === 1) return true;
      return tokens.every(function (t) { return hay.indexOf(t) >= 0 || hay2.indexOf(t.replace(/[\s\-_.]/g, '')) >= 0; });
    });
  }
  Admin.views.peserta = function (main) {
    function draw() {
      var rows = pesFilter(list('peserta'), qPes);
      var exist = {}; list('peserta').forEach(function (p) { exist[p.ID] = 1; }); Object.keys(selPes).forEach(function (k) { if (!exist[k]) delete selPes[k]; });
      main.innerHTML = pageHead('Peserta', U.num(list('peserta').length) + ' peserta terdaftar', '<button class="btn btn-gold btn-sm" data-view="migrasi">' + ic('upload', 'w-4 h-4') + ' Impor file</button><button class="btn btn-gold btn-sm" data-bulk-add>' + ic('list-plus', 'w-4 h-4') + ' Tambah banyak</button><button class="btn btn-primary btn-sm" data-add="peserta">' + ic('plus', 'w-4 h-4') + ' Tambah peserta</button>') +
        '<div class="mb-4">' + searchBox('q-pes', 'Cari nama / ID / HP / alamat…', qPes) + '</div><div id="pes-bar">' + pesBar() + '</div>' +
        tableWrap('<table class="tbl"><thead><tr><th class="w-12"><input type="checkbox" id="sel-all" aria-label="Pilih semua peserta yang tampil"></th><th>ID</th><th>Nama</th><th>JK</th><th>No. HP</th><th class="hidden md:table-cell">Alamat</th><th>Hadir</th><th>Status</th><th class="text-right">Aksi</th></tr></thead><tbody>' +
          (rows.length ? rows.slice(0, 300).map(function (p) {
            return '<tr><td><input type="checkbox" data-sel="' + esc(p.ID) + '" aria-label="Pilih ' + esc(p.Nama) + '"' + (selPes[p.ID] ? ' checked' : '') + '></td><td class="whitespace-nowrap font-mono text-xs font-semibold text-gold-ink">' + esc(p.Kode || '…') + '</td><td><div class="flex items-center gap-3 min-w-[180px]">' + U.avatar(p.Nama, p.Foto_URL, 'w-9 h-9 text-xs') + '<span class="font-medium">' + esc(p.Nama) + (p.Is_Dummy === 'TRUE' ? ' <span class="badge badge-off ml-1">dummy</span>' : '') + '</span></div></td><td>' + (p.Jenis_Kelamin ? '<span class="badge badge-off" title="' + esc(p.Jenis_Kelamin) + '">' + (p.Jenis_Kelamin === 'Perempuan' ? 'P' : 'L') + '</span>' : '<span class="text-muted" title="Belum diisi">–</span>') + '</td><td class="whitespace-nowrap">' + esc(p.No_HP) + '</td><td class="hidden md:table-cell text-muted">' + esc(p.Alamat) + '</td><td>' + (p.jumlahHadir || 0) + '×</td>' +
              '<td><button class="badge ' + (p.Status === 'Aktif' ? 'badge-ok' : 'badge-off') + '" data-pstatus="' + esc(p.ID) + '" aria-label="Ubah status ' + esc(p.Nama) + '">' + esc(p.Status) + '</button></td>' +
              '<td class="text-right whitespace-nowrap"><button class="btn btn-ghost btn-sm btn-icon" data-edit="peserta" data-id="' + esc(p.ID) + '" aria-label="Ubah ' + esc(p.Nama) + '">' + ic('pencil', 'w-4 h-4') + '</button><button class="btn btn-ghost btn-sm btn-icon text-danger" data-del="peserta" data-id="' + esc(p.ID) + '" data-label="' + esc(p.Nama) + '" aria-label="Hapus ' + esc(p.Nama) + '">' + ic('trash-2', 'w-4 h-4') + '</button></td></tr>'; }).join('') : '<tr><td colspan="9" class="text-center text-muted py-10">Tidak ada peserta.</td></tr>') + '</tbody></table>') +
        (rows.length > 300 ? '<p class="text-xs text-muted mt-3">Menampilkan 300 teratas — gunakan pencarian untuk mempersempit.</p>' : '');
      bindSearch('q-pes', function (v) { qPes = v; draw(); var n = $('#q-pes'); n.focus(); n.setSelectionRange(v.length, v.length); });
      syncSel();
    }
    draw();
    if (!kodeTried && list('peserta').some(function (p) { return !p.Kode || p.Kode.indexOf('-') >= 0; })) { kodeTried = true; req('kodeLengkapi').then(function (r) { if (r.success && r.data.dibuat) refreshBoot(true); }); }
  };
  var kodeTried = false;
  document.addEventListener('change', function (e) {
    var t = e.target; if (!t.closest || !t.closest('#adm-main')) return;
    if (t.id === 'sel-all') { $$('[data-sel]').forEach(function (c) { c.checked = t.checked; if (t.checked) selPes[c.dataset.sel] = 1; else delete selPes[c.dataset.sel]; }); return syncSel(); }
    if (t.dataset && t.dataset.sel) { if (t.checked) selPes[t.dataset.sel] = 1; else delete selPes[t.dataset.sel]; syncSel(); }
  });
  function bulkPeserta(kind) {
    var ids = Object.keys(selPes); if (!ids.length) return;
    if (kind === 'clear') { selPes = {}; return renderView(); }
    if (kind === 'hapus') {
      return U.confirm('Hapus ' + ids.length + ' peserta?', 'Peserta terpilih beserta data kehadiran, respons formulir, dan undiannya akan dihapus permanen.', 'Hapus ' + ids.length + ' peserta', true).then(function (ok) {
        if (!ok) return; var l = list('peserta'), bak = l.slice(); A.boot.peserta = l.filter(function (p) { return !selPes[p.ID]; }); selPes = {}; renderView();
        req('entityHapusMassal', { entity: 'peserta', ids: ids }, { timeout: 60000 }).then(function (r) { if (!r.success) { A.boot.peserta = bak; renderView(); return U.toast(r.message, 'error'); } U.toast(r.data.dihapus + ' peserta dihapus', 'ok'); afterChange(); refreshBoot(true); });
      });
    }
    var to = kind === 'aktif' ? 'Aktif' : 'Nonaktif', old = {}; list('peserta').forEach(function (p) { if (selPes[p.ID]) { old[p.ID] = p.Status; p.Status = to; } }); selPes = {}; renderView();
    req('pesertaStatusMassal', { ids: ids, status: to }).then(function (r) { if (!r.success) { list('peserta').forEach(function (p) { if (old[p.ID]) p.Status = old[p.ID]; }); renderView(); return U.toast(r.message, 'error'); } U.toast(ids.length + ' peserta ' + (to === 'Aktif' ? 'diaktifkan' : 'dinonaktifkan'), 'ok'); afterChange(); });
  }
  /** Tambah banyak: tempel daftar → periksa di sisi klien → centang yang akan ditambahkan. */
  function openBulkAdd() {
    var parsed = [];
    var m = U.modal(U.modalHead('Tambah banyak peserta', 'Tempel satu peserta per baris: Nama, No. HP, L/P (opsional), Alamat') + '<div class="px-6 pb-6"><label class="label" for="ba-t">Daftar peserta</label><textarea class="field" id="ba-t" rows="6" placeholder="Siti Aminah, 081234567890, P, Waru&#10;Budi Santoso; 085611112222; L; Gedangan"></textarea><p class="hint">Pemisah boleh koma, titik koma, atau tab. Dari Excel/Sheets: salin kolom Nama, HP, Alamat lalu tempel.</p>' +
      '<div class="flex gap-2 mt-3"><button class="btn btn-gold btn-sm" id="ba-check">' + ic('list-checks', 'w-4 h-4') + ' Periksa daftar</button></div><div id="ba-res" class="mt-4"></div></div>', { label: 'Tambah banyak peserta', wide: true });
    function check() {
      var seen = {}; list('peserta').forEach(function (p) { seen[p.No_HP] = 1; });
      parsed = $('#ba-t', m.el).value.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).slice(0, 500).map(function (l, i) {
        var c = l.split(/\t|;|,/).map(function (x) { return x.trim(); }), nama = c[0] || '', hp = U.normHp(c[1] || ''), why = '';
        if (nama.length < 3) why = 'Nama terlalu pendek'; else if (!U.validHp(hp)) why = 'No. HP tidak valid'; else if (seen[hp]) why = 'No. HP sudah terdaftar / ganda'; else seen[hp] = 1;
        var jkTok = c.length >= 3 && /^(l|p|lk|pr|laki-?laki|perempuan|pria|wanita)$/i.test(c[2]) ? c[2] : '';
        return { i: i, line: l, nama: nama, hp: hp, jk: jkTok, alamat: c.slice(jkTok ? 3 : 2).join(', '), why: why };
      });
      draw();
    }
    function draw() {
      var ok = parsed.filter(function (r) { return !r.why; }), box = $('#ba-res', m.el);
      if (!parsed.length) { box.innerHTML = '<p class="text-sm text-muted">Tempel daftar lalu tekan “Periksa daftar”.</p>'; return; }
      box.innerHTML = '<div class="flex flex-wrap items-center justify-between gap-2 mb-2"><label class="flex items-center gap-2 text-sm font-medium"><input type="checkbox" id="ba-all" checked> Pilih semua yang valid</label><span class="text-sm text-muted">' + ok.length + ' valid · ' + (parsed.length - ok.length) + ' dilewati</span></div>' +
        '<div class="rounded-xl border border-line max-h-[40vh] overflow-y-auto"><ul class="divide-y divide-line">' + parsed.map(function (r) {
          return '<li><label class="flex items-center gap-3 px-4 py-2.5 ' + (r.why ? 'opacity-60' : 'cursor-pointer hover:bg-surface-2') + '"><input type="checkbox" data-ba="' + r.i + '"' + (r.why ? ' disabled' : ' checked') + '><span class="flex-1 min-w-0"><span class="font-medium block truncate">' + esc(r.nama || '(tanpa nama)') + '</span><span class="text-xs text-muted">' + esc(r.hp || '—') + (r.alamat ? ' · ' + esc(r.alamat) : '') + '</span></span>' + (r.why ? '<span class="badge badge-danger">' + esc(r.why) + '</span>' : '') + '</label></li>'; }).join('') + '</ul></div>' +
        '<div class="flex justify-end gap-3 mt-4"><button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="ba-go">' + ic('plus', 'w-4 h-4') + ' <span id="ba-n"></span></button></div>';
      count();
    }
    function picked() { return $$('[data-ba]:checked', m.el).map(function (c) { return parsed[+c.dataset.ba]; }); }
    function count() { var n = picked().length, b = $('#ba-go', m.el); if (b) { $('#ba-n', m.el).textContent = 'Tambahkan ' + n + ' peserta'; b.disabled = !n; } }
    m.el.addEventListener('change', function (e) {
      if (e.target.id === 'ba-all') $$('[data-ba]:not(:disabled)', m.el).forEach(function (c) { c.checked = e.target.checked; });
      if (e.target.id === 'ba-all' || (e.target.dataset && e.target.dataset.ba != null)) count();
    });
    m.el.addEventListener('click', function (e) {
      if (e.target.closest('#ba-check')) return check();
      if (e.target.closest('#ba-go')) {
        var rows = picked(), btn = $('#ba-go', m.el); if (!rows.length) return;
        U.busy(btn, true, 'Menambahkan…');
        req('pesertaImport', { teks: rows.map(function (r) { return (r.jk ? [r.nama, r.hp, r.jk, r.alamat] : [r.nama, r.hp, r.alamat]).join(', '); }).join('\n'), jalankan: true, mode: 'tambah' }, { timeout: 60000 }).then(function (r) {
          U.busy(btn, false); if (!r.success) return U.toast(r.message, 'error');
          U.toast(r.data.baru + ' peserta ditambahkan', 'ok'); m.close(); refreshBoot(true); afterChange();
        });
      }
    });
  }

  // ---------- Konfigurasi CRUD sederhana ----------
  var CRUD = {
    peserta: { title: 'Peserta', fields: function () { return [{ k: 'Nama', l: 'Nama lengkap', req: 1, half: 1, max: 80 }, { k: 'No_HP', l: 'No. HP', req: 1, half: 1, max: 20, type: 'tel', hint: 'Format 08xx atau 62xx' }, { k: 'Jenis_Kelamin', l: 'Jenis kelamin', type: 'select', opts: [{ v: '', l: '— Belum diisi —' }, { v: 'Laki-laki', l: 'Laki-laki' }, { v: 'Perempuan', l: 'Perempuan' }] }, { k: 'Alamat', l: 'Alamat', type: 'textarea', rows: 2, max: 250 }, { k: 'Foto_URL', l: 'Foto', type: 'image', folder: 'Foto_Peserta' }, { k: 'Status', l: 'Status', type: 'select', opts: [{ v: 'Aktif', l: 'Aktif' }, { v: 'Nonaktif', l: 'Nonaktif' }] }]; } },
    kegiatan: { title: 'Kegiatan', fields: function () { return [{ k: 'Judul', l: 'Judul kegiatan', req: 1, max: 150 }, { k: 'Tanggal', l: 'Tanggal', type: 'date', req: 1, half: 1 }, { k: 'Jam', l: 'Jam (mis. 05.30)', half: 1, max: 20 }, { k: 'Lokasi', l: 'Lokasi', max: 150 }, { k: 'Narasumber_ID', l: 'Narasumber', type: 'select', opts: narOptions(), half: 1 }, { k: 'Kategori', l: 'Kategori / jenis kegiatan', max: 40, half: 1, list: kategoriKegiatan(), hint: 'Samakan untuk kegiatan rutin (mis. Kajian Rutin).' }, { k: 'Deskripsi', l: 'Deskripsi', type: 'textarea' }, { k: 'Poster_URL', l: 'Poster', type: 'image', folder: 'Poster_Event' }, { k: 'Status_Absensi', l: 'Status absensi', type: 'select', opts: [{ v: 'Ditutup', l: 'Ditutup' }, { v: 'Dibuka', l: 'Dibuka' }] }]; } },
    narasumber: { title: 'Narasumber', fields: function () { return [{ k: 'Nama', l: 'Nama', req: 1, half: 1, max: 100 }, { k: 'Gelar', l: 'Gelar', half: 1, max: 100 }, { k: 'Keahlian', l: 'Keahlian (pisahkan koma)', max: 200 }, { k: 'Bio', l: 'Biografi singkat', type: 'textarea', max: 1500 }, { k: 'Foto_URL', l: 'Foto', type: 'image', folder: 'Foto_Narasumber' }]; } },
    berita: { title: 'Berita', fields: function () { return [{ k: 'Judul', l: 'Judul', req: 1, max: 150 }, { k: 'Tanggal', l: 'Tanggal', type: 'date', req: 1, half: 1 }, { k: 'Kategori', l: 'Kategori', half: 1, max: 40 }, { k: 'Ringkasan', l: 'Ringkasan', type: 'textarea', rows: 2, max: 300 }, { k: 'Isi', l: 'Isi berita', type: 'textarea', rows: 8, max: 8000 }, { k: 'Gambar_URL', l: 'Gambar', type: 'image', folder: 'Gambar_Berita' }]; } },
    banner: { title: 'Banner', fields: function () { return [{ k: 'Gambar_URL', l: 'Foto banner', type: 'image', folder: 'Banner', px: 1600, req: 1, hint: 'Disarankan foto lanskap (16:9), minimal 1600 px. Bagian tengah foto paling aman dari pemotongan.' }, { k: 'Judul', l: 'Judul foto (opsional)', max: 90 }, { k: 'Subjudul', l: 'Keterangan singkat (opsional)', max: 180 }, { k: 'Tautan', l: 'Tautan saat diklik (opsional)', type: 'url', max: 600, hint: 'Harus diawali https://' }, { k: 'Status', l: 'Status', type: 'select', opts: [{ v: 'Aktif', l: 'Tampil di beranda' }, { v: 'Nonaktif', l: 'Sembunyikan' }] }]; } },
    galeri: { title: 'Foto Galeri', fields: function () { return [{ k: 'Kegiatan_ID', l: 'Kegiatan', type: 'select', req: 1, opts: kegOptions(true) }, { k: 'Gambar_URL', l: 'Foto', type: 'image', folder: 'Galeri', px: 1600, req: 1 }, { k: 'Keterangan', l: 'Keterangan foto', max: 200 }]; } },
    materi: { title: 'Materi', fields: function () { return [{ k: 'Kegiatan_ID', l: 'Kegiatan', type: 'select', req: 1, opts: kegOptions(true) }, { k: 'Judul', l: 'Judul materi', req: 1, max: 150 }, { k: 'File_URL', l: 'Slide / PPT', type: 'file', folder: 'Materi_PPT' }, { k: 'Hasil_URL', l: 'Rangkuman / hasil', type: 'file', folder: 'Hasil_Materi' }]; } },
    program: { title: 'Program Grand Prize', fields: function () { return [{ k: 'Nama_Hadiah', l: 'Nama hadiah', req: 1, max: 150 }, { k: 'Deskripsi', l: 'Deskripsi', type: 'textarea', rows: 3, max: 1000 }, { k: 'Jumlah_Pemenang', l: 'Jumlah pemenang', type: 'number', req: 1, half: 1, max: 3 }, { k: 'Min_Kehadiran', l: 'Minimal kehadiran', type: 'number', req: 1, half: 1, max: 3 }, { k: 'Kategori_Syarat', l: 'Kegiatan rutin yang dihitung', type: 'checks', req: 1, opts: kategoriKegiatan().map(function (x) { return { v: x, l: x }; }), hint: 'Hanya kehadiran pada kegiatan berkategori ini yang dihitung untuk undian. Kegiatan lain tidak berpengaruh.' }, { k: 'Periode_Mulai', l: 'Periode mulai', type: 'date', half: 1 }, { k: 'Periode_Selesai', l: 'Periode selesai', type: 'date', half: 1 }, { k: 'Status', l: 'Status', type: 'select', opts: [{ v: 'Aktif', l: 'Aktif' }, { v: 'Nonaktif', l: 'Nonaktif' }, { v: 'Selesai', l: 'Selesai' }] }, { k: 'Gambar_URL', l: 'Gambar hadiah', type: 'image', folder: 'Gambar_Hadiah' }]; } }
  };
  Admin.CRUD = CRUD;
  function openEntity(ent, id) {
    var cfg = CRUD[ent], row = id ? list(ent).filter(function (x) { return x.ID === id; })[0] : {};
    if (!id && ent === 'kegiatan') row = { Status_Absensi: 'Ditutup', Tanggal: U.todayStr() };
    if (!id && ent === 'berita') row = { Tanggal: U.todayStr() };
    if (!id && ent === 'banner') row = { Status: 'Aktif' };
    if (!id && ent === 'program') row = { Jumlah_Pemenang: '1', Min_Kehadiran: '5', Status: 'Aktif' };
    formModal((id ? 'Ubah ' : 'Tambah ') + cfg.title, cfg.fields(), row || {}, function (d) { return saveEntity(ent, id || '', d); });
  }
  Admin.h.openEntity = openEntity;

  // ---------- Tampilan: Kegiatan, Narasumber, Berita, Materi ----------
  var qKg = '';
  Admin.views.kegiatan = function (main) {
    function draw() {
      var q = qKg.toLowerCase(), rows = list('kegiatan').filter(function (k) { return !q || (k.Judul + ' ' + k.Lokasi).toLowerCase().indexOf(q) >= 0; }), nar = {};
      A.boot.narasumber.forEach(function (n) { nar[n.ID] = n.Nama; });
      main.innerHTML = pageHead('Kegiatan & Absensi', 'Buka absensi saat acara berlangsung; peserta hanya bisa hadir sekali per kegiatan.', '<button class="btn btn-primary btn-sm" data-add="kegiatan">' + ic('plus', 'w-4 h-4') + ' Tambah kegiatan</button>') +
        '<div class="mb-4">' + searchBox('q-kg', 'Cari kegiatan…', qKg) + '</div>' +
        tableWrap('<table class="tbl"><thead><tr><th>Kegiatan</th><th class="hidden md:table-cell">Narasumber</th><th>Absensi</th><th class="text-right">Aksi</th></tr></thead><tbody>' +
          (rows.length ? rows.map(function (k) {
            var open = k.Status_Absensi === 'Dibuka';
            return '<tr><td><div class="min-w-[200px]"><p class="font-medium">' + esc(k.Judul) + (k.Is_Dummy === 'TRUE' ? ' <span class="badge badge-off ml-1">dummy</span>' : '') + '</p><p class="text-xs text-muted">' + U.fmtTgl(k.Tanggal) + (k.Jam ? ' · ' + esc(k.Jam) : '') + (k.Lokasi ? ' · ' + esc(k.Lokasi) : '') + '</p></div></td><td class="hidden md:table-cell text-muted">' + esc(nar[k.Narasumber_ID] || '–') + '</td>' +
              '<td><button role="switch" aria-checked="' + open + '" data-toggle-abs="' + esc(k.ID) + '" class="inline-flex items-center gap-2 rounded-full px-1 py-1 pr-3 text-xs font-semibold ' + (open ? 'bg-ok-soft text-ok' : 'bg-surface-3 text-muted') + '" style="min-height:36px"><span class="w-8 h-5 rounded-full relative ' + (open ? 'bg-ok' : 'bg-line') + '"><span class="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style="left:' + (open ? '14px' : '2px') + '"></span></span>' + (open ? 'Dibuka' : 'Ditutup') + '</button></td>' +
              '<td class="text-right whitespace-nowrap"><button class="btn btn-gold btn-sm" data-hadir="' + esc(k.ID) + '">' + ic('list-checks', 'w-4 h-4') + ' <span class="hidden sm:inline">Kehadiran</span></button><button class="btn btn-ghost btn-sm btn-icon" data-edit="kegiatan" data-id="' + esc(k.ID) + '" aria-label="Ubah">' + ic('pencil', 'w-4 h-4') + '</button><button class="btn btn-ghost btn-sm btn-icon text-danger" data-del="kegiatan" data-id="' + esc(k.ID) + '" data-label="' + esc(k.Judul) + '" aria-label="Hapus">' + ic('trash-2', 'w-4 h-4') + '</button></td></tr>'; }).join('') : '<tr><td colspan="4" class="text-center text-muted py-10">Belum ada kegiatan.</td></tr>') + '</tbody></table>');
      bindSearch('q-kg', function (v) { qKg = v; draw(); var n = $('#q-kg'); n.focus(); n.setSelectionRange(v.length, v.length); });
    }
    draw();
  };
  function toggleAbsensi(id) {
    var k = list('kegiatan').filter(function (x) { return x.ID === id; })[0]; if (!k) return;
    var to = k.Status_Absensi === 'Dibuka' ? 'Ditutup' : 'Dibuka', old = k.Status_Absensi; k.Status_Absensi = to; A.boot.ringkasan.dibuka += to === 'Dibuka' ? 1 : -1; renderView();
    req('absensiStatus', { id: id, status: to }).then(function (r) { if (!r.success) { k.Status_Absensi = old; A.boot.ringkasan.dibuka += to === 'Dibuka' ? -1 : 1; renderView(); return U.toast(r.message, 'error'); } U.toast('Absensi ' + (to === 'Dibuka' ? 'dibuka' : 'ditutup'), 'ok'); afterChange(); });
  }
  Admin.views.narasumber = function (main) {
    var rows = list('narasumber');
    main.innerHTML = pageHead('Narasumber', rows.length + ' narasumber', '<button class="btn btn-primary btn-sm" data-add="narasumber">' + ic('plus', 'w-4 h-4') + ' Tambah narasumber</button>') +
      '<div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">' + (rows.length ? rows.map(function (n) {
        return '<div class="card p-5 flex gap-4">' + U.avatar(n.Nama, n.Foto_URL, 'w-16 h-16 text-lg') + '<div class="min-w-0 flex-1"><p class="font-display text-lg font-semibold truncate">' + esc(n.Nama) + '</p><p class="text-sm text-gold-ink">' + esc(n.Gelar) + '</p><p class="text-sm text-muted line-clamp-2 mt-1">' + esc(n.Bio) + '</p>' +
          '<div class="mt-3 flex gap-2"><button class="btn btn-ghost btn-sm" data-edit="narasumber" data-id="' + esc(n.ID) + '">' + ic('pencil', 'w-4 h-4') + ' Ubah</button><button class="btn btn-ghost btn-sm text-danger" data-del="narasumber" data-id="' + esc(n.ID) + '" data-label="' + esc(n.Nama) + '">' + ic('trash-2', 'w-4 h-4') + '</button></div></div></div>'; }).join('') : App.emptyState('mic-vocal', 'Belum ada narasumber', 'Tambahkan profil narasumber pertama.')) + '</div>';
  };
  Admin.views.berita = function (main) {
    var rows = list('berita');
    main.innerHTML = pageHead('Berita', rows.length + ' artikel', '<button class="btn btn-primary btn-sm" data-add="berita">' + ic('plus', 'w-4 h-4') + ' Tambah berita</button>') +
      tableWrap('<table class="tbl"><thead><tr><th>Judul</th><th class="hidden sm:table-cell">Kategori</th><th>Tanggal</th><th class="text-right">Aksi</th></tr></thead><tbody>' + (rows.length ? rows.map(function (b) {
        return '<tr><td class="min-w-[220px]"><span class="font-medium">' + esc(b.Judul) + '</span>' + (b.Is_Dummy === 'TRUE' ? ' <span class="badge badge-off ml-1">dummy</span>' : '') + '</td><td class="hidden sm:table-cell text-muted">' + esc(b.Kategori) + '</td><td class="whitespace-nowrap">' + U.fmtTgl(b.Tanggal) + '</td><td class="text-right whitespace-nowrap"><button class="btn btn-ghost btn-sm btn-icon" data-edit="berita" data-id="' + esc(b.ID) + '" aria-label="Ubah">' + ic('pencil', 'w-4 h-4') + '</button><button class="btn btn-ghost btn-sm btn-icon text-danger" data-del="berita" data-id="' + esc(b.ID) + '" data-label="' + esc(b.Judul) + '" aria-label="Hapus">' + ic('trash-2', 'w-4 h-4') + '</button></td></tr>'; }).join('') : '<tr><td colspan="4" class="text-center text-muted py-10">Belum ada berita.</td></tr>') + '</tbody></table>');
  };
  Admin.views.materi = function (main) {
    var rows = list('materi'), kg = {}; A.boot.kegiatan.forEach(function (k) { kg[k.ID] = k; });
    main.innerHTML = pageHead('Materi', 'Slide dan rangkuman untuk setiap kegiatan.', '<button class="btn btn-primary btn-sm" data-add="materi">' + ic('plus', 'w-4 h-4') + ' Tambah materi</button>') +
      tableWrap('<table class="tbl"><thead><tr><th>Materi</th><th class="hidden sm:table-cell">Kegiatan</th><th>Berkas</th><th class="text-right">Aksi</th></tr></thead><tbody>' + (rows.length ? rows.map(function (m) {
        return '<tr><td class="min-w-[200px] font-medium">' + esc(m.Judul) + '</td><td class="hidden sm:table-cell text-muted">' + esc(kg[m.Kegiatan_ID] ? kg[m.Kegiatan_ID].Judul : '–') + '</td><td>' + (m.File_URL ? '<span class="badge badge-ok">Slide</span> ' : '') + (m.Hasil_URL ? '<span class="badge badge-ok">Rangkuman</span>' : '') + (!m.File_URL && !m.Hasil_URL ? '<span class="badge badge-off">Kosong</span>' : '') + '</td><td class="text-right whitespace-nowrap"><button class="btn btn-ghost btn-sm btn-icon" data-edit="materi" data-id="' + esc(m.ID) + '" aria-label="Ubah">' + ic('pencil', 'w-4 h-4') + '</button><button class="btn btn-ghost btn-sm btn-icon text-danger" data-del="materi" data-id="' + esc(m.ID) + '" data-label="' + esc(m.Judul) + '" aria-label="Hapus">' + ic('trash-2', 'w-4 h-4') + '</button></td></tr>'; }).join('') : '<tr><td colspan="4" class="text-center text-muted py-10">Belum ada materi.</td></tr>') + '</tbody></table>');
  };

  // ---------- Absensi manual ----------
  function openKehadiran(kid) {
    var kg = list('kegiatan').filter(function (k) { return k.ID === kid; })[0]; if (!kg) return;
    if (modalOpen()) return;                                       // cegah modal ganda dari klik beruntun
    var data = null, q = '', filt = 'semua', working = {};           // working: pid -> true saat permintaan berjalan (cegah klik ganda)
    var m = U.modal(U.modalHead('Kehadiran: ' + kg.Judul, U.fmtTglPanjang(kg.Tanggal)) + '<div class="px-6 pb-6"><div class="flex flex-wrap gap-3 items-center justify-between mb-3"><div class="flex-1 min-w-[200px]">' + searchBox('q-kh', 'Cari peserta…') + '</div><span class="badge" id="kh-count">…</span></div>' +
      '<div class="flex flex-wrap gap-2 mb-3" role="group" aria-label="Saring daftar">' + [['semua', 'Semua'], ['hadir', 'Sudah hadir'], ['belum', 'Belum hadir']].map(function (f) { return '<button type="button" class="badge cursor-pointer" data-kf="' + f[0] + '">' + f[1] + '</button>'; }).join('') + '</div>' +
      '<div id="kh-body" class="rounded-2xl border border-line max-h-[50vh] overflow-y-auto">' + App.sk(1, 200) + '</div>' +
      '<div class="flex flex-wrap gap-3 justify-between mt-4"><button class="btn btn-gold btn-sm" id="kh-all">' + ic('check', 'w-4 h-4') + ' Hadirkan semua yang belum</button><button class="btn btn-ghost" data-close>Selesai</button></div><p class="hint mt-2">Setiap peserta hanya dicatat satu kali per kegiatan. Gunakan tombol <strong>Hapus</strong> untuk membatalkan kehadiran.</p></div>', { label: 'Kehadiran manual', wide: true, onClose: function () { refreshBoot(true); } });
    function match(r) { return !q || (r.nama + ' ' + r.hp).toLowerCase().indexOf(q) >= 0; }
    function shown() { return data.rows.filter(function (r) { return match(r) && (filt === 'semua' || (filt === 'hadir') === !!r.hadir); }); }
    function draw() {
      var rows = shown(), hadirN = data.rows.filter(function (r) { return r.hadir; }).length;
      $('#kh-count', m.el).textContent = hadirN + ' / ' + data.rows.length + ' hadir';
      $$('[data-kf]', m.el).forEach(function (b) { var on = b.dataset.kf === filt; b.className = 'badge cursor-pointer ' + (on ? 'badge-ok' : 'badge-off'); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      var body = $('#kh-body', m.el), top = body.scrollTop;
      body.innerHTML = rows.length ? '<ul class="divide-y divide-line">' + rows.map(function (r) {
        var w = !!working[r.pid];
        return '<li class="flex items-center gap-3 px-4 py-3"><span class="flex-1 min-w-0"><span class="font-medium block truncate">' + esc(r.nama) + '</span><span class="text-xs text-muted">' + esc(r.hp) + (r.hadir ? ' · ' + esc(r.metode || '') + (r.waktu ? ' · ' + esc(String(r.waktu).replace('T', ' ').slice(0, 16)) : '') : '') + '</span></span>' + (r.status !== 'Aktif' ? '<span class="badge badge-off">Nonaktif</span>' : '') +
          (r.hadir ? '<span class="badge badge-ok">' + ic('check', 'w-3.5 h-3.5') + ' Hadir</span><button type="button" class="btn btn-ghost btn-sm text-danger" data-khdel="' + esc(r.pid) + '"' + (w ? ' disabled' : '') + ' aria-label="Hapus kehadiran ' + esc(r.nama) + '">' + ic('trash-2', 'w-4 h-4') + ' Hapus</button>'
                   : '<button type="button" class="btn btn-gold btn-sm" data-khadd="' + esc(r.pid) + '"' + (w ? ' disabled' : '') + ' aria-label="Hadirkan ' + esc(r.nama) + '">' + ic('check', 'w-4 h-4') + ' Hadirkan</button>') + '</li>'; }).join('') + '</ul>'
        : '<p class="p-6 text-center text-muted text-sm">Tidak ada peserta yang cocok.</p>';
      body.scrollTop = top;
      var todo = data.rows.filter(function (r) { return !r.hadir && r.status === 'Aktif' && match(r); }).length, all = $('#kh-all', m.el); all.disabled = !todo;
    }
    req('kehadiranList', { kegiatanId: kid }).then(function (r) { if (!r.success) { U.toast(r.message, 'error'); return m.close(); } data = r.data; draw(); });
    $('#q-kh', m.el).addEventListener('input', U.debounce(function (e) { q = e.target.value.toLowerCase(); if (data) draw(); }, 100));
    /** Kirim perubahan; tampilan diperbarui dari JAWABAN server (bukan tebakan), sehingga tidak bisa tercatat dua kali. */
    function apply(ids, hadir) {
      ids = ids.filter(function (id) { return !working[id]; }); if (!ids.length) return;
      ids.forEach(function (id) { working[id] = true; }); draw();
      req('kehadiranSet', { kegiatanId: kid, pesertaIds: ids, hadir: hadir }, { timeout: 60000 }).then(function (x) {
        ids.forEach(function (id) { delete working[id]; });
        if (!x.success) { U.toast(x.message, 'error'); return draw(); }
        var now = new Date().toISOString().slice(0, 19);
        ids.forEach(function (id) { var r = data.rows.filter(function (y) { return y.pid === id; })[0]; if (r) { r.hadir = hadir; r.metode = hadir ? 'Manual' : ''; r.waktu = hadir ? now : ''; } });
        draw();
        if (hadir && x.data.sudah) U.toast(x.data.sudah + ' peserta sudah tercatat hadir sebelumnya.');
        else U.toast(hadir ? (ids.length > 1 ? ids.length + ' peserta ditandai hadir' : 'Kehadiran dicatat') : 'Kehadiran dihapus', 'ok');
      });
    }
    m.el.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-khadd]'))) return apply([b.dataset.khadd], true);
      if ((b = e.target.closest('[data-khdel]'))) {
        var r = data.rows.filter(function (y) { return y.pid === b.dataset.khdel; })[0]; if (!r) return;
        return U.confirm('Hapus kehadiran?', 'Kehadiran ' + r.nama + ' pada kegiatan ini akan dihapus.', 'Hapus', true).then(function (okk) { if (okk) apply([r.pid], false); });
      }
      if ((b = e.target.closest('[data-kf]'))) { filt = b.dataset.kf; return draw(); }
      if (e.target.closest('#kh-all')) {
        var ids = data.rows.filter(function (r) { return !r.hadir && r.status === 'Aktif' && match(r); }).map(function (r) { return r.pid; });
        if (!ids.length) return U.toast('Tidak ada yang perlu ditandai.');
        U.confirm('Hadirkan semua?', ids.length + ' peserta aktif akan ditandai hadir.', 'Hadirkan').then(function (okk) { if (okk) apply(ids.slice(0, 500), true); });
      }
    });
  }
  Admin.h.openKehadiran = openKehadiran;

  // ---------- Delegasi klik ----------
  function onClick(e) {
    var t;
    if ((t = e.target.closest('[data-view]'))) { if (t.closest('#adm-root') || t.closest('#admin-root')) { setView(t.dataset.view); return; } }
    if ((t = e.target.closest('[data-bulk]'))) return bulkPeserta(t.dataset.bulk);
    if (e.target.closest('[data-bulk-add]')) return openBulkAdd();
    if ((t = e.target.closest('[data-add]'))) return openEntity(t.dataset.add);
    if ((t = e.target.closest('[data-edit]'))) return openEntity(t.dataset.edit, t.dataset.id);
    if ((t = e.target.closest('[data-del]'))) return deleteEntity(t.dataset.del, t.dataset.id, t.dataset.label);
    if ((t = e.target.closest('[data-toggle-abs]'))) return toggleAbsensi(t.dataset.toggleAbs);
    if ((t = e.target.closest('[data-hadir]'))) return openKehadiran(t.dataset.hadir);
    if ((t = e.target.closest('[data-pstatus]'))) {
      var p = list('peserta').filter(function (x) { return x.ID === t.dataset.pstatus; })[0]; if (!p) return; var to = p.Status === 'Aktif' ? 'Nonaktif' : 'Aktif', old = p.Status; p.Status = to; renderView();
      return req('pesertaStatus', { id: p.ID, status: to }).then(function (r) { if (!r.success) { p.Status = old; renderView(); U.toast(r.message, 'error'); } else afterChange(); });
    }
    if (e.target.closest('#adm-menu')) { var d = $('#adm-drawer'); d.hidden = false; document.documentElement.style.overflow = 'hidden'; return; }
    if (e.target.closest('[data-dclose]')) { $('#adm-drawer').hidden = true; document.documentElement.style.overflow = ''; return; }
    if ((t = e.target.closest('[data-act-adm=logout]'))) return logout();
  }
  function logout() {
    req('logout', {}, { retries: 0 }); Session.clear('admin'); A.boot = null; A.mounted = false; stopPolling(); U.toast('Anda telah keluar.'); loginView();
  }
  Admin.h.logout = logout;

  // ---------- Polling ringan (hanya admin, hanya tab terlihat) ----------
  var pollT = null;
  function startPolling() { stopPolling(); pollT = setInterval(function () { if (document.visibilityState === 'visible' && document.body.dataset.route === 'admin' && A.mounted && !modalOpen()) refreshBoot(true); }, C.POLL_ADMIN); }
  function stopPolling() { if (pollT) clearInterval(pollT); pollT = null; }

  // ---------- Mount ----------
  var bound = false;
  Admin.mount = function (root) {
    A.root = root;
    if (!bound) { document.addEventListener('click', onClick); window.addEventListener('sim:auth-expired', function (e) { if (e.detail.role === 'admin' && document.body.dataset.route === 'admin') { U.toast('Sesi berakhir. Silakan masuk kembali.', 'error'); A.mounted = false; stopPolling(); loginView(); } }); window.addEventListener('sim:route', function (e) { if (e.detail.name !== 'admin') stopPolling(); else if (A.boot) startPolling(); }); bound = true; }
    if (A.boot && Session.get('admin')) { if (!A.mounted) shell(); else renderView(); startPolling(); return; }
    var s = Session.get('admin');
    if (!s) return loginView();
    root.innerHTML = '<div class="min-h-dvh p-6 space-y-4">' + App.sk(3, 120) + '</div>';
    req('adminBoot').then(function (r) { if (!r.success) { if (r.code !== 'AUTH') U.toast(r.message, 'error'); return loginView(); } A.boot = r.data; A.lastJson = JSON.stringify(r.data); shell(); startPolling(); });
  };
})();
