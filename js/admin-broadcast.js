/**
 * admin-broadcast.js — Broadcast WhatsApp: susun teks (pengumuman / reminder kegiatan) lalu kirim
 * ke tiap peserta lewat tautan wa.me yang sudah berisi pesan personal. Tanpa API pihak ketiga,
 * tanpa biaya, tanpa rahasia: pesan dikirim dari WhatsApp milik admin sendiri.
 */
(function () {
  'use strict';
  var U = UI, $ = U.$, $$ = U.$$, esc = U.esc, ic = U.ic, Admin = window.Admin, A = Admin.A, H = Admin.h;
  var LS = 'sim:bc-sent';
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
    var st = { tpl: 'reminder', kid: (up[0] || kegs[0] || {}).ID || '', text: '', q: '', sel: null, sent: lsGet() };
    var people = H.list('peserta').filter(function (p) { return p.Status === 'Aktif' && U.validHp(p.No_HP); });
    st.sel = {}; people.forEach(function (p) { st.sel[p.ID] = true; });
    function kg() { return kegs.filter(function (k) { return k.ID === st.kid; })[0] || {}; }
    function applyTpl() { st.text = TPL[st.tpl].t + (TPL[st.tpl].t ? orgName() : ''); }
    applyTpl();

    function fill(text, p) {
      var k = st.tpl === 'reminder' || /\{(kegiatan|tanggal|jam|lokasi)\}/.test(text) ? kg() : {};
      var m = { nama: p ? p.Nama : 'Bapak/Ibu', id: p ? (p.Kode || '-') : 'MTI-2026-001', kegiatan: k.Judul || '(pilih kegiatan)', tanggal: k.Tanggal ? (U.fmtTglPanjang ? U.fmtTglPanjang(k.Tanggal) : U.fmtTgl(k.Tanggal)) : '-', jam: k.Jam || '-', lokasi: k.Lokasi || '-' };
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
      '<button type="button" class="btn btn-primary btn-hero" id="bc-next">' + ic('send', 'w-4 h-4') + ' <span>Kirim ke berikutnya</span></button>' +
      '<p class="hint">Setiap klik membuka WhatsApp dengan pesan siap kirim untuk satu peserta; tekan Kirim di WhatsApp, lalu kembali ke sini. Peserta yang sudah dikirim ditandai ✓.</p></section></div>';

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
    });
    main.addEventListener('change', function (e) {
      var t = e.target;
      if (t.id === 'bc-all') { visible().forEach(function (p) { st.sel[p.ID] = t.checked; }); drawPrev(); drawList(); }
      else if (t.dataset && t.dataset.p) { st.sel[t.dataset.p] = t.checked; drawPrev(); drawList(); }
    });
    $('#bc-q', main).oninput = U.debounce ? U.debounce(function (e) { st.q = e.target.value; drawList(); }, 150) : function (e) { st.q = e.target.value; drawList(); };
    refresh();
  };
})();
