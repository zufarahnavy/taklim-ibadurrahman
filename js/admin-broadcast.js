/**
 * admin-broadcast.js — Broadcast WhatsApp: susun teks (pengumuman / reminder kegiatan) lalu kirim
 * ke tiap peserta lewat tautan wa.me yang sudah berisi pesan personal. Tanpa API pihak ketiga,
 * tanpa biaya, tanpa rahasia: pesan dikirim dari WhatsApp milik admin sendiri.
 */
(function () {
  'use strict';
  var U = UI, $ = U.$, $$ = U.$$, esc = U.esc, ic = U.ic, Admin = window.Admin, A = Admin.A, H = Admin.h, req = H.req;
  var LS = 'sim:bc-sent', BC = null;   // BC: keadaan disimpan di luar render agar tidak hilang saat panel menyegarkan data
  function lsGet() { try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) { return {}; } }
  function lsSet(v) { try { localStorage.setItem(LS, JSON.stringify(v)); } catch (e) {} }
  function hash(s) { return String(U.hash ? U.hash(s) : s.length); }
  function orgName() { var b = window.App && App.S && App.S.boot; return (b && b.app && b.app.nama) || 'Majelis Taklim Ibadurrahman'; }

  var TPL = {
    umum: { l: 'Pengumuman umum', t: 'Assalamu\'alaikum warahmatullahi wabarakatuh, {nama}.\n\n[Tulis pengumuman di sini]\n\nJazakumullahu khairan.\n— ' },
    reminder: { l: 'Pengingat kegiatan', t: 'Assalamu\'alaikum warahmatullahi wabarakatuh, {nama}.\n\nMengingatkan, insya Allah akan diadakan:\n*{kegiatan}*\nHari/tanggal: {tanggal}\nPukul: {jam}\nTempat: {lokasi}\n\nJangan lupa mengisi kehadiran dengan ID Peserta Anda: *{id}*\n\nSampai jumpa, jazakumullahu khairan.\n— ' },
    kosong: { l: 'Tulis sendiri', t: '' }
  };
  var VARS = ['nama', 'id', 'kegiatan', 'tanggal', 'jam', 'lokasi'];

  Admin.views.broadcast = function (main) {
    var today = U.todayStr ? U.todayStr() : new Date().toISOString().slice(0, 10);
    var kegs = H.list('kegiatan').slice().sort(function (a, b) { return a.Tanggal < b.Tanggal ? 1 : -1; });
    var up = kegs.filter(function (k) { return k.Tanggal >= today; }).sort(function (a, b) { return a.Tanggal < b.Tanggal ? -1 : 1; });
    // render ulang (mis. setelah data disegarkan) tidak boleh menumpuk pendengar acara atau menghapus ketikan
    if (main._bcAc) main._bcAc.abort(); var ac = main._bcAc = new AbortController(), sig = { signal: ac.signal };
    if (main._bcTimer) { clearInterval(main._bcTimer); main._bcTimer = null; }
    var st = BC || (BC = { mode: 'manual', batch: 20, jeda: '5-8', cfg: null, blasts: [], tpl: 'reminder', kid: (up[0] || kegs[0] || {}).ID || '', text: '', q: '', sel: {}, init: false });
    st.sent = lsGet();
    var people = H.list('peserta').filter(function (p) { return p.Status === 'Aktif' && U.validHp(p.No_HP); });
    people.forEach(function (p) { if (st.sel[p.ID] === undefined) st.sel[p.ID] = true; });
    function kg() { return kegs.filter(function (k) { return k.ID === st.kid; })[0] || {}; }
    function applyTpl() { st.text = TPL[st.tpl].t + (TPL[st.tpl].t ? orgName() : ''); }
    if (!st.init) { applyTpl(); st.init = true; }

    function fill(text, p) {
      var k = st.tpl === 'reminder' || /\{(kegiatan|tanggal|jam|lokasi)\}/.test(text) ? kg() : {};
      var m = { nama: p ? p.Nama : 'Bapak/Ibu', id: p ? (p.Kode || '-') : 'MTI26001', kegiatan: k.Judul || '(pilih kegiatan)', tanggal: k.Tanggal ? (U.fmtTglPanjang ? U.fmtTglPanjang(k.Tanggal) : U.fmtTgl(k.Tanggal)) : '-', jam: k.Jam || '-', lokasi: k.Lokasi || '-' };
      return text.replace(/\{(\w+)\}/g, function (a, v) { return m[v] != null ? m[v] : a; });
    }
    function link(p) { return 'https://wa.me/' + U.normHp(p.No_HP) + '?text=' + encodeURIComponent(fill(st.text, p)); }
    function key(p) { return hash(st.text + '|' + st.kid + '|' + st.tpl) + ':' + p.ID; }
    function visible() { var q = st.q.trim().toLowerCase(); return people.filter(function (p) { return !q || (p.Nama + ' ' + p.Kode + ' ' + p.No_HP).toLowerCase().indexOf(q) >= 0; }); }
    function chosen() { return people.filter(function (p) { return st.sel[p.ID]; }); }

    main.innerHTML = H.pageHead('Broadcast WhatsApp', 'Susun pengumuman atau pengingat kegiatan, lalu kirim ke tiap peserta lewat WhatsApp Anda.') +
      '<div class="grid lg:grid-cols-5 gap-6 items-start"><section class="card p-6 lg:col-span-3 grid gap-4" aria-labelledby="bc-h"><h2 id="bc-h" class="text-lg font-semibold">1. Tulis pesan</h2>' +
      '<div class="grid sm:grid-cols-2 gap-4"><div><label class="label" for="bc-tpl">Jenis pesan</label><select class="field" id="bc-tpl">' + Object.keys(TPL).map(function (k) { return '<option value="' + k + '">' + TPL[k].l + '</option>'; }).join('') + '</select></div>' +
      '<div id="bc-kgw"><label class="label" for="bc-kg">Kegiatan</label><select class="field" id="bc-kg">' + (kegs.length ? kegs.map(function (k) { return '<option value="' + esc(k.ID) + '">' + esc(k.Judul) + ' · ' + U.fmtTgl(k.Tanggal) + '</option>'; }).join('') : '<option value="">Belum ada kegiatan</option>') + '</select></div></div>' +
      '<div><label class="label" for="bc-txt">Isi pesan</label><textarea class="field" id="bc-txt" rows="11" maxlength="1500"></textarea>' +
      '<div class="flex flex-wrap gap-2 mt-2" aria-label="Sisipkan data otomatis">' + VARS.map(function (v) { return '<button type="button" class="badge badge-off cursor-pointer" data-var="' + v + '">{' + v + '}</button>'; }).join('') + '</div>' +
      '<p class="hint">Klik kode untuk menyisipkannya. Kode diganti otomatis dengan data tiap peserta. Gunakan *teks* untuk huruf tebal di WhatsApp.</p></div>' +
      '<div><p class="label">Pratinjau (contoh untuk peserta pertama)</p><div class="rounded-2xl p-4 text-sm whitespace-pre-wrap leading-6" style="background:#DCF8C6;color:#10261f" id="bc-prev"></div></div>' +
      '<div class="flex flex-wrap gap-3"><button type="button" class="btn btn-ghost" id="bc-copy">' + ic('copy', 'w-4 h-4') + ' Salin teks</button></div></section>' +
      '<section class="card p-6 lg:col-span-2 grid gap-4" aria-labelledby="bc-r"><h2 id="bc-r" class="text-lg font-semibold">2. Pilih penerima &amp; kirim</h2>' +
      '<input class="field" id="bc-q" type="search" placeholder="Cari nama / ID / HP…" aria-label="Cari penerima">' +
      '<div class="flex items-center justify-between gap-3 text-sm"><label class="flex items-center gap-2 font-medium cursor-pointer"><input type="checkbox" id="bc-all" class="w-5 h-5 accent-[#0B3D2E]"> Pilih semua</label><span class="text-muted" id="bc-n"></span></div>' +
      '<ul class="divide-y divide-line max-h-[46vh] overflow-y-auto rounded-2xl border border-line" id="bc-list"></ul>' +
      '<fieldset class="grid grid-cols-2 gap-2" aria-label="Cara kirim"><label class="cursor-pointer"><input type="radio" name="bc-mode" value="manual" class="sr-only chip-radio" checked><span class="block rounded-2xl border border-line px-3 py-2.5 text-center text-sm font-medium">Manual<br><span class="text-xs text-muted font-normal">dari WhatsApp saya</span></span></label>' +
      '<label class="cursor-pointer"><input type="radio" name="bc-mode" value="otomatis" class="sr-only chip-radio"><span class="block rounded-2xl border border-line px-3 py-2.5 text-center text-sm font-medium">Otomatis<br><span class="text-xs text-muted font-normal">lewat Fonnte</span></span></label></fieldset>' +
      '<div id="bc-manual"><button type="button" class="btn btn-primary btn-hero w-full" id="bc-next">' + ic('send', 'w-4 h-4') + ' <span>Kirim ke berikutnya</span></button>' +
      '<p class="hint mt-2">Setiap klik membuka WhatsApp dengan pesan siap kirim untuk satu peserta; tekan Kirim di WhatsApp, lalu kembali ke sini. Peserta yang sudah dikirim ditandai ✓.</p></div>' +
      '<div id="bc-auto" class="hidden grid gap-3"><div><p class="label">Ukuran batch (per menit)</p><div class="grid grid-cols-3 gap-2" id="bc-batch">' + [10, 20, 50].map(function (n) { return '<label class="cursor-pointer"><input type="radio" name="bc-batch" value="' + n + '" class="sr-only chip-radio"><span class="block rounded-xl border border-line py-2 text-center font-semibold">' + n + '</span></label>'; }).join('') + '</div></div>' +
      '<div><label class="label" for="bc-jeda">Jeda antar pesan (detik)</label><input class="field" id="bc-jeda" inputmode="numeric" maxlength="7" placeholder="5 atau 5-8"><p class="hint">Jeda acak (mis. 5-8) lebih aman dari pemblokiran.</p></div>' +
      '<button type="button" class="btn btn-primary btn-hero w-full" id="bc-go">' + ic('send', 'w-4 h-4') + ' <span>Mulai kirim otomatis</span></button><p class="hint" id="bc-auto-note"></p></div></section></div>' +
      '<section class="card p-6 mt-6 grid gap-5" id="bc-fonnte" aria-labelledby="bc-f-h"><div class="flex flex-wrap items-center justify-between gap-3"><div><h2 id="bc-f-h" class="text-lg font-semibold">Pengiriman otomatis (Fonnte)</h2><p class="text-sm text-muted">Opsional. Pesan dikirim server dari nomor WhatsApp yang terhubung ke Fonnte, sekitar satu batch per menit, walau halaman ditutup.</p></div><span class="badge badge-off" id="bc-f-stat">Memuat…</span></div>' +
      '<div class="grid md:grid-cols-2 gap-6"><div class="grid gap-3 content-start"><label class="label" for="bc-tok">Token Fonnte</label><input class="field" id="bc-tok" type="password" autocomplete="off" spellcheck="false" placeholder="Tempel token dari fonnte.com"><p class="hint">Token disimpan aman di server (Script Properties) dan tidak pernah ditampilkan kembali.</p>' +
      '<div class="flex flex-wrap gap-2"><button type="button" class="btn btn-primary btn-sm" id="bc-f-save">Simpan token</button><button type="button" class="btn btn-ghost btn-sm" id="bc-f-dev">Cek perangkat</button><button type="button" class="btn btn-ghost btn-sm text-danger" id="bc-f-del">Hapus token</button></div><p class="text-sm" id="bc-f-info" aria-live="polite"></p>' +
      '<div class="grid grid-cols-[1fr_auto] gap-2 items-end pt-2"><div><label class="label" for="bc-tes">Kirim pesan tes ke nomor</label><input class="field" id="bc-tes" type="tel" placeholder="08xxxxxxxxxx"></div><button type="button" class="btn btn-gold btn-sm" id="bc-f-tes">Kirim tes</button></div></div>' +
      '<div><p class="label">Riwayat pengiriman otomatis</p><ul class="grid gap-3" id="bc-blasts"><li class="text-sm text-muted">Memuat…</li></ul></div></div></section>';

    var txt = $('#bc-txt', main);
    txt.value = st.text; $('#bc-tpl', main).value = st.tpl; if (st.kid) $('#bc-kg', main).value = st.kid;
    function kgVis() { $('#bc-kgw', main).style.display = (st.tpl === 'kosong' && !/\{(kegiatan|tanggal|jam|lokasi)\}/.test(st.text)) ? 'none' : ''; }
    function drawPrev() { var first = chosen()[0] || people[0]; $('#bc-prev', main).textContent = fill(st.text, first) || 'Pesan masih kosong.'; }
    function drawList() {
      var v = visible(), c = chosen().length;
      $('#bc-n', main).textContent = c + ' dari ' + people.length + ' dipilih';
      $('#bc-all', main).checked = v.length > 0 && v.every(function (p) { return st.sel[p.ID]; });
      $('#bc-list', main).innerHTML = v.length ? v.map(function (p) {
        var done = st.sent[key(p)];
        return '<li class="flex items-center gap-3 px-3 py-2.5"><input type="checkbox" class="w-5 h-5 accent-[#0B3D2E] shrink-0" data-p="' + esc(p.ID) + '"' + (st.sel[p.ID] ? ' checked' : '') + ' aria-label="Pilih ' + esc(p.Nama) + '"><div class="min-w-0 flex-1"><p class="font-medium truncate">' + esc(p.Nama) + '</p><p class="text-xs text-muted truncate">' + esc(p.Kode || '') + ' · ' + esc(p.No_HP) + '</p></div>' +
          (done ? '<span class="badge badge-ok">✓ Terkirim</span>' : '') + '<a class="btn btn-gold btn-sm" data-send="' + esc(p.ID) + '" href="' + esc(link(p)) + '" target="_blank" rel="noopener noreferrer">Kirim</a></li>'; }).join('') : '<li class="p-6 text-center text-muted text-sm">Tidak ada peserta aktif dengan nomor HP valid.</li>';
      var nxt = chosen().filter(function (p) { return !st.sent[key(p)]; });
      var b = $('#bc-next', main); b.disabled = !nxt.length || !st.text.trim();
      $('span', b).textContent = nxt.length ? 'Kirim ke berikutnya (' + nxt.length + ' tersisa)' : 'Semua terpilih sudah dikirim';
    }
    function refresh() { drawPrev(); drawList(); kgVis(); }
    function mark(p) { st.sent[key(p)] = 1; lsSet(st.sent); }

    $('#bc-tpl', main).onchange = function (e) { st.tpl = e.target.value; applyTpl(); txt.value = st.text; refresh(); };
    $('#bc-kg', main).onchange = function (e) { st.kid = e.target.value; refresh(); };
    txt.oninput = function () { st.text = txt.value; refresh(); };
    main.addEventListener('click', function (e) {
      var v = e.target.closest('[data-var]');
      if (v) { var s = txt.selectionStart || txt.value.length, t = '{' + v.dataset.var + '}'; txt.value = txt.value.slice(0, s) + t + txt.value.slice(txt.selectionEnd || s); txt.focus(); txt.setSelectionRange(s + t.length, s + t.length); st.text = txt.value; refresh(); return; }
      var sd = e.target.closest('[data-send]');
      if (sd) { var p = people.filter(function (x) { return x.ID === sd.dataset.send; })[0]; if (p) { mark(p); setTimeout(drawList, 50); } return; }
      if (e.target.closest('#bc-copy')) { var c = fill(st.text, chosen()[0] || people[0]); (navigator.clipboard ? navigator.clipboard.writeText(c) : Promise.reject()).then(function () { U.toast('Teks disalin', 'ok'); }, function () { U.toast('Salin manual dari kotak pesan'); }); return; }
      if (e.target.closest('#bc-next')) {
        var nx = chosen().filter(function (p) { return !st.sent[key(p)]; })[0]; if (!nx) return;
        mark(nx); window.open(link(nx), '_blank', 'noopener'); drawList(); return;
      }
    }, sig);
    main.addEventListener('change', function (e) {
      var t = e.target;
      if (t.id === 'bc-all') { visible().forEach(function (p) { st.sel[p.ID] = t.checked; }); drawPrev(); drawList(); }
      else if (t.dataset && t.dataset.p) { st.sel[t.dataset.p] = t.checked; drawPrev(); drawList(); }
    }, sig);
    $('#bc-q', main).oninput = U.debounce ? U.debounce(function (e) { st.q = e.target.value; drawList(); }, 150) : function (e) { st.q = e.target.value; drawList(); };
    // ---------- Otomatis (Fonnte) ----------
    function setMode(m) {
      st.mode = m; $('#bc-manual', main).classList.toggle('hidden', m !== 'manual'); $('#bc-auto', main).classList.toggle('hidden', m !== 'otomatis');
      $$('[name=bc-mode]', main).forEach(function (x) { x.checked = x.value === m; });
      $('#bc-list', main).classList.toggle('sent-hide', false); drawAuto();
    }
    function drawAuto() {
      var ready = st.cfg && st.cfg.tokenAda, n = chosen().length;
      $$('[name=bc-batch]', main).forEach(function (x) { x.checked = Number(x.value) === st.batch; });
      var jd = $('#bc-jeda', main); if (document.activeElement !== jd) jd.value = st.jeda;
      var g = $('#bc-go', main); g.disabled = !ready || !n || !st.text.trim();
      $('span', g).textContent = 'Mulai kirim otomatis (' + n + ' penerima)';
      var batches = Math.ceil(n / st.batch);
      $('#bc-auto-note', main).textContent = ready ? ('Perkiraan: ' + batches + ' batch ≈ ' + batches + ' menit, lalu selesai sendiri.') : 'Isi token Fonnte di bagian bawah halaman agar mode ini aktif.';
    }
    function drawCfg() {
      var c = st.cfg; if (!c) return;
      var b = $('#bc-f-stat', main); b.textContent = c.tokenAda ? 'Token terpasang ' + c.tokenMask : 'Belum diatur'; b.className = 'badge ' + (c.tokenAda ? 'badge-ok' : 'badge-off');
      $('#bc-tok', main).placeholder = c.tokenAda ? 'Kosongkan untuk tetap memakai token ' + c.tokenMask : 'Tempel token dari fonnte.com';
      drawAuto();
    }
    function blastHtml(b) {
      var run = b.status === 'Berjalan', col = b.status === 'Selesai' ? 'badge-ok' : run ? 'badge-warn' : 'badge-off';
      return '<li class="rounded-2xl border border-line p-4"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><p class="font-medium truncate">' + esc(b.judul) + '</p><p class="text-xs text-muted">' + U.fmtTgl(String(b.dibuat).slice(0, 10)) + ' · batch ' + b.batch + ' · jeda ' + esc(b.jeda) + ' dtk</p></div><span class="badge ' + col + '">' + esc(b.status) + '</span></div>' +
        '<div class="h-2.5 rounded-full bg-line overflow-hidden mt-3" role="progressbar" aria-valuenow="' + b.persen + '" aria-valuemin="0" aria-valuemax="100" aria-label="Kemajuan ' + esc(b.judul) + '"><div class="h-full rounded-full" style="width:' + b.persen + '%;background:linear-gradient(90deg,#CDA434,#ffd25e);transition:width .4s"></div></div>' +
        '<p class="text-sm mt-2">' + b.terkirim + ' terkirim · ' + b.gagal + ' gagal · ' + b.sisa + ' menunggu <span class="text-muted">dari ' + b.total + '</span></p>' +
        (run ? '<div class="flex gap-2 mt-3"><button type="button" class="btn btn-gold btn-sm" data-bnow="' + esc(b.id) + '">Kirim batch sekarang</button><button type="button" class="btn btn-ghost btn-sm text-danger" data-bstop="' + esc(b.id) + '">Hentikan</button></div>' : '') + '</li>';
    }
    function drawBlasts() { var ul = $('#bc-blasts', main); if (!ul) return; ul.innerHTML = st.blasts.length ? st.blasts.map(blastHtml).join('') : '<li class="text-sm text-muted">Belum ada pengiriman otomatis.</li>'; }
    function loadBlasts() {
      if (!$('#bc-blasts', main)) { clearInterval(main._bcTimer); main._bcTimer = null; return; }
      req('waBlastDaftar').then(function (r) { if (r.success) { st.blasts = r.data; drawBlasts(); if (!st.blasts.some(function (b) { return b.status === 'Berjalan'; })) { clearInterval(main._bcTimer); main._bcTimer = null; } } });
    }
    function poll() { loadBlasts(); if (!main._bcTimer) main._bcTimer = setInterval(loadBlasts, 15000); }
    function info(t, bad) { var e = $('#bc-f-info', main); e.textContent = t; e.className = 'text-sm ' + (bad ? 'text-danger' : 'text-ok'); }
    req('waConfig').then(function (r) { if (r.success) { st.cfg = r.data; st.batch = r.data.batch; st.jeda = r.data.jeda; drawCfg(); } else $('#bc-f-stat', main).textContent = 'Tidak tersedia'; });
    poll();
    main.addEventListener('change', function (e) {
      var t = e.target;
      if (t.name === 'bc-mode') setMode(t.value);
      else if (t.name === 'bc-batch') { st.batch = Number(t.value); drawAuto(); }
    }, sig);
    main.addEventListener('input', function (e) { if (e.target.id === 'bc-jeda') st.jeda = e.target.value.trim(); }, sig);
    main.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('#bc-go'))) {
        var ids = chosen().map(function (p) { return p.ID; }), kk = kegs.length && (st.tpl === 'reminder' || /\{(kegiatan|tanggal|jam|lokasi)\}/.test(st.text)) ? st.kid : '';
        U.confirm('Kirim otomatis?', ids.length + ' pesan akan dikirim lewat Fonnte secara bertahap (' + st.batch + ' per menit). Pastikan isi pesan sudah benar.', 'Mulai kirim').then(function (okk) {
          if (!okk) return; U.busy(b, true, 'Menyiapkan…');
          req('waBlastBuat', { judul: (TPL[st.tpl] || {}).l + ' ' + U.todayStr(), pesan: st.text, ids: ids, kegiatanId: kk, batch: st.batch, jeda: st.jeda }).then(function (r) {
            U.busy(b, false); if (!r.success) return U.toast(r.message, 'error');
            U.toast('Pengiriman dimulai: ' + r.data.blast.total + ' penerima' + (r.data.dilewati ? ' (' + r.data.dilewati + ' dilewati)' : ''), 'ok'); st.blasts.unshift(r.data.blast); drawBlasts(); poll();
            $('#bc-fonnte', main).scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }); return;
      }
      if ((b = e.target.closest('[data-bnow]'))) { U.busy(b, true, 'Mengirim…'); req('waBlastProses', { blastId: b.dataset.bnow }, { timeout: 60000 }).then(function (r) { if (!r.success) { U.busy(b, false); return U.toast(r.message, 'error'); } loadBlasts(); }); return; }
      if ((b = e.target.closest('[data-bstop]'))) { U.confirm('Hentikan pengiriman?', 'Pesan yang belum terkirim akan dibatalkan.', 'Hentikan', true).then(function (okk) { if (okk) req('waBlastStop', { blastId: b.dataset.bstop }).then(function (r) { if (!r.success) return U.toast(r.message, 'error'); U.toast('Pengiriman dihentikan', 'ok'); loadBlasts(); }); }); return; }
      if ((b = e.target.closest('#bc-f-save'))) {
        var tok = $('#bc-tok', main).value.trim(); if (!tok) return info('Tempel token Fonnte terlebih dahulu.', true);
        U.busy(b, true, 'Menyimpan…'); req('waConfigSimpan', { token: tok, batch: st.batch, jeda: st.jeda }).then(function (r) { U.busy(b, false); if (!r.success) return info(r.message, true); st.cfg = r.data; $('#bc-tok', main).value = ''; drawCfg(); info('Token tersimpan. Klik "Cek perangkat" untuk memastikan terhubung.'); }); return;
      }
      if ((b = e.target.closest('#bc-f-dev'))) { U.busy(b, true, 'Memeriksa…'); req('waPerangkat').then(function (r) { U.busy(b, false); if (!r.success) return info(r.message, true); var d = r.data; info('Nomor ' + d.nomor + ' · status: ' + d.status + (d.paket ? ' · paket ' + d.paket : '') + (d.kuota !== '' ? ' · kuota ' + d.kuota : ''), d.status !== 'connect'); }); return; }
      if ((b = e.target.closest('#bc-f-del'))) { U.confirm('Hapus token Fonnte?', 'Pengiriman otomatis akan nonaktif sampai token diisi lagi.', 'Hapus', true).then(function (okk) { if (okk) req('waConfigSimpan', { token: '__HAPUS__' }).then(function (r) { if (!r.success) return info(r.message, true); st.cfg = r.data; drawCfg(); info('Token dihapus.'); }); }); return; }
      if ((b = e.target.closest('#bc-f-tes'))) { var no = $('#bc-tes', main).value.trim(); if (!U.validHp(no)) return info('Nomor tes tidak valid.', true); U.busy(b, true, 'Mengirim…'); req('waTes', { nomor: no }).then(function (r) { U.busy(b, false); if (!r.success) return info(r.message, true); info('Pesan tes terkirim ke ' + no + '.'); }); return; }
    }, sig);
    var _drawList = drawList; drawList = function () { _drawList(); if (st.mode === 'otomatis') drawAuto(); };
    refresh(); setMode(st.mode); drawBlasts(); drawCfg();
  };
})();
