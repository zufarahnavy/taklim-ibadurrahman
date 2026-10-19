/**
 * public.js — Cangkang aplikasi + halaman publik: Home, About, Event, News, Narasumber.
 * Data dari bootPublik dimuat via SWR: tampil seketika dari cache lokal, disegarkan diam-diam di latar.
 */
(function () {
  'use strict';
  var U = UI, $ = U.$, $$ = U.$$, esc = U.esc, ic = U.ic, C = APP_CONFIG;
  var App = window.App = { S: { boot: null }, evFilter: 'semua', evCat: '', evQ: '' };

  var NAV = [
    { k: 'home', l: 'Home', i: 'house' }, { k: 'about', l: 'About', i: 'info' }, { k: 'event', l: 'Event', i: 'calendar-days' },
    { k: 'news', l: 'News', i: 'newspaper' }, { k: 'narasumber', l: 'Narasumber', i: 'mic-vocal' }, { k: 'dashboard', l: 'Dashboard', i: 'layout-dashboard' }
  ];

  // ---------- Util domain ----------
  function B() { return App.S.boot; }
  App.narName = function (id) { var b = B(); var n = b && b.narasumber.filter(function (x) { return x.id === id; })[0]; return n ? n.nama + (n.gelar ? ', ' + n.gelar : '') : ''; };
  App.statusKg = function (k) {
    var t = U.todayStr();
    if (k.absensi === 'Dibuka') return { t: 'Absensi Dibuka', c: 'badge-ok', live: true };
    if (k.tanggal === t) return { t: 'Hari Ini', c: 'badge-warn' };
    if (k.tanggal > t) return { t: 'Akan Datang', c: 'badge' };
    return { t: 'Selesai', c: 'badge-off' };
  };
  App.identity = function () { try { return JSON.parse(lsGet('sim:ident') || 'null') || {}; } catch (e) { return {}; } };
  App.saveIdentity = function (nama, hp) { lsSet('sim:ident', JSON.stringify({ nama: nama, hp: hp })); };
  App.me = function () { var s = Session.get('peserta'); return s ? s.profil : null; };
  function sk(n, h, cls) { var o = ''; for (var i = 0; i < n; i++) o += '<div class="skeleton ' + (cls || '') + '" style="height:' + (h || 220) + 'px;border-radius:1.5rem"></div>'; return o; }
  function sectionHead(eyebrow, title, id, link) {
    return '<div class="flex items-end justify-between gap-4 mb-8"><div><p class="eyebrow flex items-center gap-2">' + U.star('w-3.5 h-3.5') + esc(eyebrow) + '</p><h2 class="h-section mt-2"' + (id ? ' id="' + id + '"' : '') + '>' + esc(title) + '</h2></div>' +
      (link ? '<a href="#/' + link.to + '" class="btn btn-ghost btn-sm shrink-0">' + esc(link.t) + ' ' + ic('arrow-right', 'w-4 h-4') + '</a>' : '') + '</div>';
  }
  function emptyState(icon, title, text) {
    return '<div class="card p-10 text-center col-span-full"><div class="w-14 h-14 rounded-full bg-gold-pale text-gold-ink flex items-center justify-center mx-auto">' + ic(icon, 'w-7 h-7') + '</div><h3 class="text-xl font-semibold mt-4">' + esc(title) + '</h3><p class="text-sm text-muted mt-1 max-w-sm mx-auto">' + esc(text) + '</p></div>';
  }
  App.sk = sk; App.sectionHead = sectionHead; App.emptyState = emptyState;

  // ---------- Kartu ----------
  function cardKegiatan(k, opt) {
    var st = App.statusKg(k), p = U.tglParts(k.tanggal), nar = App.narName(k.narId);
    return '<article class="card card-hover p-5 flex flex-col gap-4">' +
      '<div class="flex items-start gap-4"><div class="w-16 shrink-0 rounded-2xl bg-brand text-on-brand text-center py-2.5"><div class="font-display text-2xl font-semibold leading-none">' + p.d + '</div><div class="text-[11px] font-semibold tracking-widest mt-1 text-[#ffdf96]">' + p.m + '</div></div>' +
      '<div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2 mb-1.5"><span class="' + (st.c === 'badge' ? 'badge' : 'badge ' + st.c) + '">' + (st.live ? '<span class="w-2 h-2 rounded-full bg-ok animate-pulse"></span>' : '') + st.t + '</span>' + (k.kategori ? '<span class="text-xs text-muted">' + esc(k.kategori) + '</span>' : '') + '</div>' +
      '<h3 class="font-display text-xl font-semibold leading-snug line-clamp-2"><button class="text-left hover:underline" data-act="kg-detail" data-id="' + esc(k.id) + '">' + esc(k.judul) + '</button></h3></div></div>' +
      '<ul class="text-sm text-muted space-y-1.5">' +
      (k.jam ? '<li class="flex items-center gap-2">' + ic('clock', 'w-4 h-4') + esc(k.jam) + ' WIB</li>' : '') +
      (k.lokasi ? '<li class="flex items-center gap-2">' + ic('map-pin', 'w-4 h-4') + esc(k.lokasi) + '</li>' : '') +
      (nar ? '<li class="flex items-center gap-2">' + ic('mic-vocal', 'w-4 h-4') + esc(nar) + '</li>' : '') + '</ul>' +
      '<div class="flex gap-2 mt-auto pt-1"><button class="btn btn-ghost btn-sm flex-1 border-line" style="border-color:rgb(var(--c-line))" data-act="kg-detail" data-id="' + esc(k.id) + '">Detail</button>' +
      (k.absensi === 'Dibuka' ? '<button class="btn btn-primary btn-sm flex-1" data-act="absen" data-id="' + esc(k.id) + '">' + ic('circle-check', 'w-4 h-4') + ' Isi Kehadiran</button>' : '') + '</div></article>';
  }
  function cardBerita(b) {
    return '<article class="card card-hover overflow-hidden flex flex-col"><button class="block text-left" data-act="br-detail" data-id="' + esc(b.id) + '" aria-label="Baca: ' + esc(b.judul) + '">' +
      U.art(b.gambar, b.id, 'aspect-[16/9]', '') + '</button><div class="p-5 flex flex-col gap-2 flex-1"><div class="flex items-center gap-2 text-xs text-muted"><span class="badge">' + esc(b.kategori || 'Berita') + '</span><span>' + U.fmtTgl(b.tanggal) + '</span></div>' +
      '<h3 class="font-display text-xl font-semibold leading-snug line-clamp-2"><button class="text-left hover:underline" data-act="br-detail" data-id="' + esc(b.id) + '">' + esc(b.judul) + '</button></h3><p class="text-sm text-muted line-clamp-3">' + esc(b.ringkasan) + '</p></div></article>';
  }
  function cardNara(n) {
    return '<article class="card card-hover p-6 text-center flex flex-col items-center"><button data-act="nr-detail" data-id="' + esc(n.id) + '" class="rounded-full" aria-label="Profil ' + esc(n.nama) + '">' + U.avatar(n.nama, n.foto, 'w-24 h-24 text-2xl ring-4 ring-gold-pale') + '</button>' +
      '<h3 class="font-display text-xl font-semibold mt-4 leading-snug">' + esc(n.nama) + '</h3><p class="text-sm text-gold-ink font-medium">' + esc(n.gelar) + '</p>' +
      (n.keahlian ? '<div class="flex flex-wrap justify-center gap-1.5 mt-3">' + n.keahlian.split(',').slice(0, 3).map(function (x) { return '<span class="badge">' + esc(x.trim()) + '</span>'; }).join('') + '</div>' : '') +
      '<p class="text-sm text-muted line-clamp-3 mt-3">' + esc(n.bio) + '</p><button class="btn btn-ghost btn-sm mt-4" data-act="nr-detail" data-id="' + esc(n.id) + '">Lihat profil</button></article>';
  }
  App.cardKegiatan = cardKegiatan;

  // ---------- HOME ----------
  function nextKegiatan() {
    var b = B(); if (!b) return null; var t = U.todayStr();
    var open = b.kegiatan.filter(function (k) { return k.absensi === 'Dibuka'; })[0]; if (open) return open;
    var up = b.kegiatan.filter(function (k) { return k.tanggal >= t; }).sort(function (a, c) { return a.tanggal < c.tanggal ? -1 : 1; });
    return up[0] || b.kegiatan[0] || null;
  }
  function renderHero() {
    var b = B(); if (!b) return;
    var a = b.about || {}, st = b.stat;
    $$('[data-bind=hero-title]').forEach(function (e) { e.textContent = a.Hero_Judul || b.app.nama; });
    $$('[data-bind=hero-sub]').forEach(function (e) { e.textContent = a.Hero_Subjudul || e.textContent; });
    $$('[data-bind=org-name]').forEach(function (e) { e.textContent = b.app.nama; });
    $$('[data-bind=tagline]').forEach(function (e) { e.textContent = a.Tagline || ''; });
    $$('[data-bind=alamat]').forEach(function (e) { e.textContent = b.app.alamat || a.Alamat || ''; });
    $('#brand-name').textContent = b.app.nama;
    $('#st-peserta').textContent = U.num(st.peserta); $('#st-kegiatan').textContent = U.num(st.kegiatan); $('#st-hadir').textContent = U.num(st.hadir);
    $('#hero-ring').style.setProperty('--p', st.rata); $('#hero-ring-n').textContent = st.rata + '%';
    var k = nextKegiatan(), box = $('#hero-next');
    if (!k) { box.innerHTML = '<p class="text-sm text-white/70">Belum ada jadwal kegiatan.</p>'; return; }
    var p = U.tglParts(k.tanggal), s = App.statusKg(k);
    box.innerHTML = '<div class="w-12 shrink-0 rounded-2xl bg-white/15 text-center py-1.5"><div class="font-display text-xl font-semibold leading-none">' + p.d + '</div><div class="text-[10px] tracking-widest text-[#ffdf96] font-semibold">' + p.m + '</div></div>' +
      '<div class="min-w-0 flex-1"><p class="text-[11px] uppercase tracking-widest text-[#ffdf96] font-semibold">' + (k.absensi === 'Dibuka' ? 'Absensi sedang dibuka' : 'Kajian berikutnya') + '</p><p class="font-semibold truncate">' + esc(k.judul) + '</p><p class="text-xs text-white/70 truncate">' + esc([k.jam && k.jam + ' WIB', k.lokasi].filter(Boolean).join(' · ')) + '</p></div>' +
      (k.absensi === 'Dibuka' ? '<button class="btn btn-solid-gold btn-sm" data-act="absen" data-id="' + esc(k.id) + '">Hadir</button>' : '');
  }
  function renderHome() {
    var b = B(), el = $('#home-body'); if (!b) { el.innerHTML = '<div class="grid md:grid-cols-3 gap-6">' + sk(3) + '</div>'; return; }
    var t = U.todayStr(), up = b.kegiatan.filter(function (k) { return k.tanggal >= t || k.absensi === 'Dibuka'; }).sort(function (a, c) { return a.tanggal < c.tanggal ? -1 : 1; });
    var show = (up.length ? up : b.kegiatan).slice(0, 3);
    var aktif = b.program.filter(function (g) { return g.status === 'Aktif'; });
    var html = '';
    html += '<section aria-labelledby="h-kg">' + sectionHead('Jadwal Kajian', 'Kegiatan Terdekat', 'h-kg', { to: 'event', t: 'Semua kegiatan' }) +
      '<div class="grid md:grid-cols-2 xl:grid-cols-3 gap-6">' + (show.length ? show.map(cardKegiatan).join('') : emptyState('calendar-days', 'Belum ada kegiatan', 'Jadwal kajian akan tampil di sini.')) + '</div></section>';
    if (aktif.length) {
      var g = aktif[0];
      html += '<section aria-labelledby="h-gp"><div class="gold-banner rounded-4xl relative overflow-hidden p-8 sm:p-12 grid lg:grid-cols-5 gap-8 items-center"><div class="star-pattern absolute inset-0 opacity-50" aria-hidden="true"></div>' +
        '<div class="relative lg:col-span-3"><span class="inline-flex items-center gap-2 rounded-full bg-[#251a00]/10 px-4 py-1.5 text-xs font-bold tracking-widest uppercase">' + ic('trophy', 'w-4 h-4') + ' Grand Prize</span>' +
        '<h2 id="h-gp" class="font-display text-3xl sm:text-4xl font-semibold mt-4 !text-[#251a00]">' + esc(g.nama) + '</h2><p class="mt-3 text-[#251a00]/80 max-w-xl">' + esc(g.deskripsi || 'Hadir secara konsisten, raih kesempatan memenangkan hadiah utama.') + '</p>' +
        '<div class="mt-6 flex flex-wrap gap-3"><span class="rounded-full bg-[#251a00]/10 px-4 py-2 text-sm font-semibold">Minimal hadir ' + g.min + '×</span><span class="rounded-full bg-[#251a00]/10 px-4 py-2 text-sm font-semibold">' + g.pemenang + ' pemenang</span>' +
        (g.selesai ? '<span class="rounded-full bg-[#251a00]/10 px-4 py-2 text-sm font-semibold">s.d. ' + U.fmtTgl(g.selesai) + '</span>' : '') + '</div>' +
        '<button class="btn mt-8 bg-[#251a00] text-white hover:opacity-90" style="min-height:52px;padding:0 1.75rem" data-go="dashboard">Lihat progres saya ' + ic('arrow-right', 'w-4 h-4') + '</button></div>' +
        '<div class="relative lg:col-span-2 flex justify-center">' + U.art(g.gambar, g.id, 'w-56 h-56 sm:w-64 sm:h-64 !rounded-full ring-8 ring-white/30', g.nama) + '</div></div></section>';
    }
    if (b.narasumber.length) html += '<section aria-labelledby="h-ns">' + sectionHead('Pengajar', 'Narasumber Kami', 'h-ns', { to: 'narasumber', t: 'Semua narasumber' }) + '<div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">' + b.narasumber.slice(0, 4).map(cardNara).join('') + '</div></section>';
    if (b.berita.length) html += '<section aria-labelledby="h-br">' + sectionHead('Kabar Terbaru', 'Berita & Artikel', 'h-br', { to: 'news', t: 'Semua berita' }) + '<div class="grid md:grid-cols-3 gap-6">' + b.berita.slice(0, 3).map(cardBerita).join('') + '</div></section>';
    el.innerHTML = html;
  }

  // ---------- ABOUT ----------
  function renderAbout() {
    var b = B(), el = $('#about-body'); if (!b) { el.innerHTML = sk(2, 260); return; }
    var a = b.about || {}, lines = function (t) { return String(t || '').split('\n').filter(Boolean); };
    var team = []; try { team = JSON.parse(a.Struktur_JSON || '[]'); } catch (e) {}
    var html = '<header class="max-w-3xl"><p class="eyebrow flex items-center gap-2">' + U.star('w-3.5 h-3.5') + 'Tentang Kami</p><h1 id="h-about" class="h-section mt-2">' + esc(b.app.nama) + '</h1><p class="text-lg text-muted mt-4">' + U.nl2br(a.Tagline || '') + '</p></header>';
    html += '<div class="grid lg:grid-cols-3 gap-6 mt-10"><div class="card p-8 lg:col-span-2"><h2 class="text-2xl font-semibold flex items-center gap-3">' + ic('book-open', 'w-6 h-6 text-gold-ink') + 'Sejarah Singkat</h2><p class="text-muted mt-4 leading-7">' + U.nl2br(a.Sejarah) + '</p></div>' +
      '<div class="card p-8 bg-brand text-on-brand" style="background:linear-gradient(135deg,#0B3D2E,#14614B);border-color:transparent"><h2 class="text-2xl font-semibold !text-white flex items-center gap-3">' + ic('sparkles', 'w-6 h-6 text-[#ffdf96]') + 'Visi</h2><p class="mt-4 text-white/90 leading-7">' + U.nl2br(a.Visi) + '</p></div></div>';
    html += '<div class="grid lg:grid-cols-2 gap-6 mt-6"><div class="card p-8"><h2 class="text-2xl font-semibold flex items-center gap-3">' + ic('list-checks', 'w-6 h-6 text-gold-ink') + 'Misi</h2><ol class="mt-4 space-y-3">' +
      lines(a.Misi).map(function (m, i) { return '<li class="flex gap-3"><span class="w-7 h-7 shrink-0 rounded-full bg-gold-pale text-gold-ink text-sm font-bold flex items-center justify-center">' + (i + 1) + '</span><span class="text-muted">' + esc(m) + '</span></li>'; }).join('') + '</ol></div>' +
      '<div class="card p-8"><h2 class="text-2xl font-semibold flex items-center gap-3">' + ic('heart', 'w-6 h-6 text-gold-ink') + 'Nilai-Nilai</h2><div class="grid grid-cols-2 gap-3 mt-4">' +
      lines(a.Nilai).map(function (n) { return '<div class="rounded-2xl bg-surface-2 border border-line px-4 py-4 flex items-center gap-3 font-medium">' + U.star('w-4 h-4 text-gold') + esc(n) + '</div>'; }).join('') + '</div>' +
      (a.Jadwal ? '<p class="mt-5 flex items-start gap-3 text-sm text-muted">' + ic('calendar-days', 'w-5 h-5 mt-0.5 text-gold-ink') + esc(a.Jadwal) + '</p>' : '') + '</div></div>';
    if (team.length) html += '<section class="mt-14" aria-labelledby="h-team">' + sectionHead('Kepengurusan', 'Struktur Pengurus', 'h-team') + '<div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">' +
      team.map(function (m) { return '<div class="card p-6 text-center">' + U.avatar(m.nama, m.foto, 'w-20 h-20 text-xl mx-auto') + '<h3 class="font-display text-lg font-semibold mt-3">' + esc(m.nama) + '</h3><p class="text-sm text-gold-ink font-medium">' + esc(m.jabatan) + '</p></div>'; }).join('') + '</div></section>';
    html += '<section class="mt-14 card p-8 flex flex-wrap items-center justify-between gap-6"><div class="flex items-start gap-4">' + ic('map-pin', 'w-6 h-6 text-gold-ink mt-1') + '<div><h2 class="text-xl font-semibold">Lokasi & Kontak</h2><p class="text-muted mt-1">' + esc(a.Alamat || b.app.alamat || '') + '</p></div></div>' +
      (b.app.kontak ? '<a class="btn btn-primary" href="https://wa.me/' + esc(U.normHp(b.app.kontak)) + '" target="_blank" rel="noopener noreferrer">' + ic('phone', 'w-4 h-4') + ' Hubungi via WhatsApp</a>' : '') + '</section>';
    el.innerHTML = html;
  }

  // ---------- EVENT ----------
  function renderEvent() {
    var b = B(), el = $('#event-body'); if (!b) { el.innerHTML = '<div class="grid md:grid-cols-3 gap-6">' + sk(3) + '</div>'; return; }
    var t = U.todayStr(), q = App.evQ.toLowerCase(), cats = []; b.kegiatan.forEach(function (k) { if (k.kategori && cats.indexOf(k.kategori) < 0) cats.push(k.kategori); });
    var list = b.kegiatan.filter(function (k) {
      if (App.evFilter === 'akan' && !(k.tanggal >= t || k.absensi === 'Dibuka')) return false;
      if (App.evFilter === 'selesai' && !(k.tanggal < t && k.absensi !== 'Dibuka')) return false;
      if (App.evCat && k.kategori !== App.evCat) return false;
      if (q && (k.judul + ' ' + k.lokasi + ' ' + k.deskripsi).toLowerCase().indexOf(q) < 0) return false; return true;
    });
    if (App.evFilter === 'akan') list.sort(function (a, c) { return a.tanggal < c.tanggal ? -1 : 1; });
    var chip = function (k, l, cur, act) { return '<button class="chip" aria-pressed="' + (cur === k) + '" data-act="' + act + '" data-v="' + esc(k) + '">' + esc(l) + '</button>'; };
    var html = '<header class="max-w-3xl"><p class="eyebrow flex items-center gap-2">' + U.star('w-3.5 h-3.5') + 'Agenda</p><h1 id="h-event" class="h-section mt-2">Kegiatan & Materi</h1><p class="text-lg text-muted mt-4">Temukan jadwal kajian, isi kehadiran saat absensi dibuka, dan unduh materi setelah acara.</p></header>' +
      '<div class="mt-8 flex flex-col lg:flex-row lg:items-center gap-4 justify-between"><div class="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1" role="group" aria-label="Filter status">' +
      chip('semua', 'Semua', App.evFilter, 'ev-f') + chip('akan', 'Akan Datang', App.evFilter, 'ev-f') + chip('selesai', 'Selesai', App.evFilter, 'ev-f') +
      (cats.length ? '<span class="w-px bg-line mx-1 shrink-0" aria-hidden="true"></span>' + cats.map(function (c) { return '<button class="chip" aria-pressed="' + (App.evCat === c) + '" data-act="ev-c" data-v="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') : '') + '</div>' +
      '<label class="relative block lg:w-72"><span class="sr-only">Cari kegiatan</span><span class="absolute left-4 top-1/2 -translate-y-1/2 text-muted">' + ic('search', 'w-5 h-5') + '</span><input id="ev-q" class="field !pl-12" type="search" placeholder="Cari kegiatan…" value="' + esc(App.evQ) + '" autocomplete="off"></label></div>' +
      '<div class="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">' + (list.length ? list.map(cardKegiatan).join('') : emptyState('search', 'Tidak ada kegiatan', 'Coba ubah filter atau kata kunci pencarian.')) + '</div>';
    el.innerHTML = html;
    var inp = $('#ev-q'); if (inp && App._focusQ) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); App._focusQ = false; }
  }

  // ---------- NEWS & NARASUMBER ----------
  function renderNews() {
    var b = B(), el = $('#news-body'); if (!b) { el.innerHTML = '<div class="grid md:grid-cols-3 gap-6">' + sk(3) + '</div>'; return; }
    el.innerHTML = '<header class="max-w-3xl"><p class="eyebrow flex items-center gap-2">' + U.star('w-3.5 h-3.5') + 'Kabar</p><h1 id="h-news" class="h-section mt-2">Berita & Artikel</h1><p class="text-lg text-muted mt-4">Pengumuman, liputan kegiatan, dan tulisan inspiratif dari majelis.</p></header>' +
      '<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">' + (b.berita.length ? b.berita.map(cardBerita).join('') : emptyState('newspaper', 'Belum ada berita', 'Berita terbaru akan muncul di sini.')) + '</div>';
  }
  function renderNara() {
    var b = B(), el = $('#nara-body'); if (!b) { el.innerHTML = '<div class="grid md:grid-cols-4 gap-6">' + sk(4, 300) + '</div>'; return; }
    el.innerHTML = '<header class="max-w-3xl"><p class="eyebrow flex items-center gap-2">' + U.star('w-3.5 h-3.5') + 'Pengajar</p><h1 id="h-nara" class="h-section mt-2">Narasumber</h1><p class="text-lg text-muted mt-4">Para asatidz yang membimbing jamaah dengan ilmu dan keteladanan.</p></header>' +
      '<div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">' + (b.narasumber.length ? b.narasumber.map(cardNara).join('') : emptyState('mic-vocal', 'Belum ada narasumber', 'Profil narasumber akan tampil di sini.')) + '</div>';
  }

  // ---------- Detail (modal) ----------
  function detailKegiatan(id) {
    var b = B(), k = b.kegiatan.filter(function (x) { return x.id === id; })[0]; if (!k) return;
    var st = App.statusKg(k), mats = b.materi.filter(function (m) { return m.kegiatanId === id; }), nar = App.narName(k.narId);
    U.modal(U.modalHead(k.judul, U.fmtTglPanjang(k.tanggal)) + '<div class="px-6 pb-6">' + (k.poster ? U.art(k.poster, k.id, 'aspect-[16/9] rounded-2xl mb-5', k.judul) : '') +
      '<div class="flex flex-wrap gap-2 mb-4"><span class="badge ' + st.c + '">' + st.t + '</span>' + (k.kategori ? '<span class="badge">' + esc(k.kategori) + '</span>' : '') + '</div>' +
      '<ul class="text-sm space-y-2 mb-4">' + (k.jam ? '<li class="flex gap-2 items-center">' + ic('clock', 'w-4 h-4 text-gold-ink') + esc(k.jam) + ' WIB</li>' : '') + (k.lokasi ? '<li class="flex gap-2 items-center">' + ic('map-pin', 'w-4 h-4 text-gold-ink') + esc(k.lokasi) + '</li>' : '') + (nar ? '<li class="flex gap-2 items-center">' + ic('mic-vocal', 'w-4 h-4 text-gold-ink') + esc(nar) + '</li>' : '') + '</ul>' +
      '<p class="text-muted leading-7">' + U.nl2br(k.deskripsi) + '</p>' +
      '<h3 class="font-display text-lg font-semibold mt-6 mb-3">Materi</h3>' +
      (mats.length ? '<ul class="space-y-2">' + mats.map(function (m) {
        return '<li class="rounded-2xl border border-line bg-surface-2 p-3 flex items-center gap-3">' + ic('file-text', 'w-5 h-5 text-gold-ink') + '<span class="flex-1 text-sm font-medium">' + esc(m.judul) + '</span>' +
          (m.file ? '<a class="btn btn-ghost btn-sm" href="' + esc(m.file) + '" target="_blank" rel="noopener noreferrer">' + ic('download', 'w-4 h-4') + ' Slide</a>' : '') +
          (m.hasil ? '<a class="btn btn-ghost btn-sm" href="' + esc(m.hasil) + '" target="_blank" rel="noopener noreferrer">' + ic('file-text', 'w-4 h-4') + ' Rangkuman</a>' : '') +
          (!m.file && !m.hasil ? '<span class="badge badge-off">Segera tersedia</span>' : '') + '</li>'; }).join('') + '</ul>' : '<p class="text-sm text-muted">Materi belum diunggah.</p>') +
      '<div class="flex gap-3 justify-end mt-6"><button class="btn btn-ghost" data-close>Tutup</button>' + (k.absensi === 'Dibuka' ? '<button class="btn btn-primary" data-close data-act="absen" data-id="' + esc(k.id) + '">' + ic('circle-check', 'w-4 h-4') + ' Isi Kehadiran</button>' : '') + '</div></div>', { label: k.judul, wide: true });
  }
  function detailBerita(id) {
    var b = B().berita.filter(function (x) { return x.id === id; })[0]; if (!b) return;
    U.modal(U.modalHead(b.judul, U.fmtTglPanjang(b.tanggal) + (b.kategori ? ' · ' + b.kategori : '')) + '<div class="px-6 pb-6">' + (b.gambar ? U.art(b.gambar, b.id, 'aspect-[16/9] rounded-2xl mb-5', b.judul) : '') + '<div class="text-muted leading-7">' + U.nl2br(b.isi || b.ringkasan) + '</div><div class="flex justify-end mt-6"><button class="btn btn-ghost" data-close>Tutup</button></div></div>', { label: b.judul, wide: true });
  }
  function detailNara(id) {
    var n = B().narasumber.filter(function (x) { return x.id === id; })[0]; if (!n) return;
    var kg = B().kegiatan.filter(function (k) { return k.narId === id; }).slice(0, 5);
    U.modal(U.modalHead(n.nama, n.gelar) + '<div class="px-6 pb-6"><div class="flex justify-center mb-4">' + U.avatar(n.nama, n.foto, 'w-28 h-28 text-3xl ring-4 ring-gold-pale') + '</div>' +
      (n.keahlian ? '<div class="flex flex-wrap justify-center gap-2 mb-4">' + n.keahlian.split(',').map(function (x) { return '<span class="badge">' + esc(x.trim()) + '</span>'; }).join('') + '</div>' : '') +
      '<p class="text-muted leading-7">' + U.nl2br(n.bio) + '</p>' +
      (kg.length ? '<h3 class="font-display text-lg font-semibold mt-6 mb-3">Kajian bersama narasumber</h3><ul class="space-y-2">' + kg.map(function (k) { return '<li class="rounded-2xl bg-surface-2 border border-line px-4 py-3 text-sm flex justify-between gap-3"><span class="font-medium">' + esc(k.judul) + '</span><span class="text-muted shrink-0">' + U.fmtTgl(k.tanggal) + '</span></li>'; }).join('') + '</ul>' : '') +
      '<div class="flex justify-end mt-6"><button class="btn btn-ghost" data-close>Tutup</button></div></div>', { label: n.nama });
  }

  // ---------- Render semua (hanya bila data berubah) ----------
  var lastV = null;
  function renderAll() {
    if (B() && lastV === B().v && App._dirty !== true) return;
    lastV = B() && B().v; App._dirty = false;
    renderHero(); renderHome(); renderAbout(); renderEvent(); renderNews(); renderNara();
    if (App.renderDash) App.renderDash();
  }
  App.renderAll = function () { App._dirty = true; renderAll(); };
  App.renderEvent = renderEvent;

  // ---------- Muat data ----------
  App.loadBoot = function (force) {
    return SWR.load('pub', 'boot', function () { return api('bootPublik', {}, { role: 'peserta', noToken: true }); }, {
      ttl: C.TTL_BOOT, force: force,
      onData: function (d) { App.S.boot = d; renderAll(); },
      onError: function (r) { if (!App.S.boot && r && r.code !== 'CONFIG') U.toast(r.message || 'Gagal memuat data.', 'error'); }
    });
  };

  // ---------- Navigasi & aksi ----------
  function buildNav() {
    var link = function (n, cls) { return '<a href="#/' + n.k + '" data-nav="' + n.k + '" class="' + cls + '">' + (cls.indexOf('side') >= 0 ? ic(n.i) : '') + esc(n.l) + '</a>'; };
    $('#nav-desktop').innerHTML = NAV.map(function (n) { return link(n, 'nav-link'); }).join('');
    $('#nav-drawer').innerHTML = NAV.map(function (n) { return link(n, 'side-link'); }).join('');
    $('#nav-footer').innerHTML = NAV.map(function (n) { return '<li><a class="text-muted hover:text-heading hover:underline" href="#/' + n.k + '">' + esc(n.l) + '</a></li>'; }).join('');
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act],[data-go]'); if (!t) return;
    var a = t.dataset.act, id = t.dataset.id;
    if (t.dataset.go) { U.go(t.dataset.go); return; }
    if (a === 'menu') { U.drawer($('#drawer').hidden); return; }
    if (a === 'menu-close') { U.drawer(false); return; }
    if (a === 'kg-detail') return detailKegiatan(id);
    if (a === 'br-detail') return detailBerita(id);
    if (a === 'nr-detail') return detailNara(id);
    if (a === 'ev-f') { App.evFilter = t.dataset.v; return renderEvent(); }
    if (a === 'ev-c') { App.evCat = App.evCat === t.dataset.v ? '' : t.dataset.v; return renderEvent(); }
    if (a === 'daftar' || a === 'absen' || a === 'data-diri' || a === 'verifikasi' || a === 'logout-peserta' || a === 'form-isi') {
      U.drawer(false);
      if (window.Peserta) window.Peserta.act(a, id, t);
    }
  });
  document.addEventListener('input', function (e) { if (e.target.id === 'ev-q') { var v = e.target.value; clearTimeout(App._qt); App._qt = setTimeout(function () { App.evQ = v; App._focusQ = true; renderEvent(); }, 120); } });

  // ---------- Rute ----------
  U.route('home', { title: 'Beranda' }); U.route('about', { title: 'Tentang' }); U.route('event', { title: 'Kegiatan' }); U.route('news', { title: 'Berita' });
  U.route('narasumber', { title: 'Narasumber' });
  U.route('dashboard', { title: 'Dashboard', enter: function () { if (App.enterDash) App.enterDash(); } });
  U.route('admin', { title: 'Panel Pengurus', enter: function () { loadAdmin(); } });

  var adminLoading = null;
  function loadAdmin() {
    if (window.Admin) return window.Admin.mount($('#admin-root'));
    if (!adminLoading) adminLoading = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = 'js/admin.js'; s.onload = res; s.onerror = function () { adminLoading = null; rej(); }; document.head.appendChild(s);
    });
    $('#admin-root').innerHTML = '<div class="min-h-dvh flex items-center justify-center"><div class="skeleton w-64 h-40"></div></div>';
    adminLoading.then(function () { window.Admin.mount($('#admin-root')); }).catch(function () { U.toast('Gagal memuat panel pengurus. Periksa koneksi.', 'error'); });
  }

  // ---------- Boot aplikasi ----------
  function hydrateIcons() { $$('[data-ic]').forEach(function (el) { if (!el.firstChild) el.innerHTML = ic(el.dataset.ic); }); }
  function init() {
    U.initTheme(); hydrateIcons(); buildNav(); $('#yr').textContent = new Date().getFullYear();
    if (!apiConfigured()) $('#cfg-warning').classList.remove('hidden');
    warmUp();
    window.addEventListener('hashchange', U.show);
    if (!location.hash) location.replace('#/home');
    U.show();
    App.loadBoot().then(function () {
      U.idle(function () {                                    // prefetch pintar: halaman yang kemungkinan dibuka berikutnya
        if (Session.get('peserta') && App.prefetchDash) App.prefetchDash();
        if (Session.get('admin')) { var s = document.createElement('script'); s.src = 'js/admin.js'; s.defer = true; document.head.appendChild(s); }
      });
    });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') App.loadBoot(); });   // segar saat kembali ke tab
    window.addEventListener('online', function () { U.toast('Kembali online', 'ok'); App.loadBoot(true); });
    window.addEventListener('offline', function () { U.toast('Anda sedang offline — menampilkan data tersimpan.'); });
    window.addEventListener('sim:auth-expired', function (e) { if (e.detail.role === 'peserta' && App.onPesertaOut) App.onPesertaOut(); });
  }
  /* skrip ber-defer: init dijalankan setelah SEMUA modul (public.js + peserta.js) dimuat */
  if (document.readyState === 'complete') init(); else document.addEventListener('DOMContentLoaded', init);
})();
