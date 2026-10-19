/**
 * public.js — Cangkang aplikasi + halaman publik: Home, About, Event, News, Narasumber.
 * Data dari bootPublik dimuat via SWR: tampil seketika dari cache lokal, disegarkan diam-diam di latar.
 */
(function () {
  'use strict';
  var U = UI, $ = U.$, $$ = U.$$, esc = U.esc, ic = U.ic, C = APP_CONFIG;
  var App = window.App = { S: { boot: null }, evFilter: 'semua', evCat: '', evQ: '' };

  var NAV = [
    { k: 'home', l: 'Home', i: 'house' }, { k: 'about', l: 'About', i: 'info' }, { k: 'event', l: 'Event', i: 'calendar-days' }, { k: 'galeri', l: 'Galeri', i: 'images' },
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
  App.saveIdentity = function (nama, hp, kode) { lsSet('sim:ident', JSON.stringify({ nama: nama, hp: hp, kode: kode || '' })); };
  App.me = function () { var s = Session.get('peserta'); return s ? s.profil : null; };
  function sk(n, h, cls) { var o = ''; for (var i = 0; i < n; i++) o += '<div class="skeleton ' + (cls || '') + '" style="height:' + (h || 220) + 'px;border-radius:1.5rem"></div>'; return o; }
  function sectionHead(desc, title, id, link) {
    return '<div class="sec-head"><div><h2 class="h-section"' + (id ? ' id="' + id + '"' : '') + '>' + esc(title) + '</h2>' + (desc && desc.length > 18 ? '<p class="sec-sub">' + esc(desc) + '</p>' : '') + '</div>' +
      (link ? '<a href="#/' + link.to + '" class="btn btn-line btn-sm shrink-0">' + esc(link.t) + ' ' + ic('arrow-right', 'w-4 h-4') + '</a>' : '') + '</div>';
  }
  function pageHead(title, desc, id) {
    return '<header class="max-w-3xl"><h1 id="' + id + '" class="h-section" style="font-size:clamp(2.2rem,4.6vw,3.4rem)">' + esc(title) + '</h1><p class="lead text-muted mt-4">' + esc(desc) + '</p></header>';
  }
  function emptyState(icon, title, text) {
    return '<div class="card p-10 text-center col-span-full"><div class="w-14 h-14 rounded-full bg-gold-pale text-gold-ink flex items-center justify-center mx-auto">' + ic(icon, 'w-7 h-7') + '</div><h3 class="text-xl font-semibold mt-4">' + esc(title) + '</h3><p class="text-sm text-muted mt-1 max-w-sm mx-auto">' + esc(text) + '</p></div>';
  }
  App.sk = sk; App.sectionHead = sectionHead; App.emptyState = emptyState; App.pageHead = pageHead;

  // ---------- Logo & identitas ----------
  var STAR_SVG = U.star('w-5 h-5'), baseFav = '', lastLogo = null;
  function applyBrand() {
    var b = B(); if (!b) return; var logo = b.app.logo || '';
    if (logo === lastLogo) return; lastLogo = logo;
    $$('[data-logo]').forEach(function (el) {
      el.classList.toggle('has-img', !!logo);
      el.innerHTML = logo ? '<img src="' + esc(logo) + '" alt="" decoding="async" data-logo-img="1">' : STAR_SVG;
    });
    var fav = $('#fav'); if (fav) { if (!baseFav) baseFav = fav.getAttribute('href'); fav.removeAttribute('type'); fav.setAttribute('href', logo || baseFav); if (!logo) fav.setAttribute('type', 'image/svg+xml'); }
  }
  document.addEventListener('error', function (e) {
    var t = e.target; if (t && t.tagName === 'IMG' && t.dataset.logoImg) { var m = t.parentNode; if (m) { m.classList.remove('has-img'); m.innerHTML = STAR_SVG; } }
  }, true);

  // ---------- Poster & dokumentasi ----------
  function posterThumb(k, cls) {         // poster utuh (contain) di atas latar buram dari gambar yang sama
    return '<div class="thumb ' + (cls || '') + '"><img class="thumb-bg" src="' + esc(k.poster) + '" alt="" aria-hidden="true" loading="lazy" decoding="async" data-fallback="1">' +
      '<img class="thumb-img" src="' + esc(k.poster) + '" alt="Poster ' + esc(k.judul) + '" loading="lazy" decoding="async" data-fallback="1"></div>';
  }
  function photosOf(kid) { var b = B(); return b ? b.galeri.filter(function (g) { return g.kegiatanId === kid; }) : []; }
  function allPhotos() {                 // urut: kegiatan terbaru dulu
    var b = B(), out = []; if (!b) return out;
    b.kegiatan.forEach(function (k) { photosOf(k.id).forEach(function (g) { out.push({ g: g, k: k }); }); });
    return out;
  }
  function lbItems(set) {
    var b = B(), list = set === 'all' ? allPhotos() : photosOf(set).map(function (g) { return { g: g, k: b.kegiatan.filter(function (x) { return x.id === g.kegiatanId; })[0] }; });
    return list.map(function (x) { return { src: x.g.gambar, cap: x.g.ket || (x.k && x.k.judul) || '', sub: x.k ? x.k.judul + ' · ' + U.fmtTgl(x.k.tanggal) : '' }; });
  }
  function photoBtn(g, i, set, k) {
    var cap = g.ket || (k && k.judul) || 'Foto kegiatan';
    return '<button type="button" class="ph" data-act="lb" data-set="' + esc(set) + '" data-i="' + i + '" aria-label="Buka foto: ' + esc(cap) + '"><img src="' + esc(g.gambar) + '" alt="' + esc(cap) + '" loading="lazy" decoding="async" data-fallback="1">' + (g.ket ? '<span class="ph-cap">' + esc(g.ket) + '</span>' : '') + '</button>';
  }

  // ---------- Lightbox ----------
  function lightbox(items, start) {
    if (!items.length) return;
    var i = Math.max(0, Math.min(start || 0, items.length - 1)), prevFocus = document.activeElement, ov = document.createElement('div'), x0 = null;
    ov.className = 'lb'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Penampil foto');
    var multi = items.length > 1;
    ov.innerHTML = '<button type="button" class="lb-btn" style="top:1rem;right:1rem" data-lb="x" aria-label="Tutup penampil">' + ic('x', 'w-6 h-6') + '</button>' +
      (multi ? '<button type="button" class="lb-btn" style="left:1rem;top:50%;margin-top:-24px" data-lb="p" aria-label="Foto sebelumnya">' + ic('chevron-left', 'w-6 h-6') + '</button><button type="button" class="lb-btn" style="right:1rem;top:50%;margin-top:-24px" data-lb="n" aria-label="Foto berikutnya">' + ic('chevron-right', 'w-6 h-6') + '</button>' : '') +
      '<div class="lb-stage"><img alt="" data-lb-img></div><div class="lb-foot"><p class="font-medium" data-lb-cap></p><p class="text-sm mt-0.5" style="color:rgba(255,255,255,.65)" data-lb-sub></p></div>';
    document.body.appendChild(ov); document.documentElement.style.overflow = 'hidden';
    var img = $('[data-lb-img]', ov);
    function show(n) {
      i = (n + items.length) % items.length; var it = items[i];
      img.src = it.src; img.alt = it.cap || '';
      $('[data-lb-cap]', ov).textContent = it.cap || ''; $('[data-lb-sub]', ov).textContent = (it.sub ? it.sub + (multi ? ' · ' : '') : '') + (multi ? (i + 1) + ' dari ' + items.length : '');
      if (multi) { new Image().src = items[(i + 1) % items.length].src; }
    }
    function close() {
      window.removeEventListener('keydown', key, true); ov.remove();
      if (!document.querySelector('.overlay')) document.documentElement.style.overflow = '';
      if (prevFocus && prevFocus.focus && document.contains(prevFocus)) try { prevFocus.focus(); } catch (e) {}
    }
    function key(e) {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowLeft' && multi) show(i - 1);
      else if (e.key === 'ArrowRight' && multi) show(i + 1);
      else if (e.key === 'Tab') { e.preventDefault(); var bs = $$('.lb-btn', ov), at = bs.indexOf(document.activeElement); bs[(at + (e.shiftKey ? -1 : 1) + bs.length) % bs.length].focus(); }
    }
    window.addEventListener('keydown', key, true);
    ov.addEventListener('click', function (e) {
      var b = e.target.closest('[data-lb]');
      if (b) { var a = b.dataset.lb; if (a === 'x') close(); else show(i + (a === 'n' ? 1 : -1)); return; }
      if (!e.target.closest('[data-lb-img]') && !e.target.closest('.lb-foot')) close();
    });
    ov.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
    ov.addEventListener('pointerup', function (e) { if (x0 == null || !multi) return; var dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 60) show(i + (dx < 0 ? 1 : -1)); });
    show(i); $('[data-lb="x"]', ov).focus();
  }
  App.lightbox = lightbox;

  // ---------- Kartu ----------
  function cardKegiatan(k) {
    var st = App.statusKg(k), p = U.tglParts(k.tanggal), nar = App.narName(k.narId);
    var state = '<span class="thumb-state badge ' + st.c + '">' + (st.live ? '<span class="w-2 h-2 rounded-full bg-ok animate-pulse"></span>' : '') + st.t + '</span>';
    var th = k.poster
      ? '<button class="block w-full text-left" data-act="kg-detail" data-id="' + esc(k.id) + '" aria-label="Detail: ' + esc(k.judul) + '">' + posterThumb(k).replace('</div>', '<div class="thumb-date"><b>' + p.d + '</b><span>' + p.m + '</span></div>' + state + '</div>') + '</button>'
      : '<button class="block w-full text-left" data-act="kg-detail" data-id="' + esc(k.id) + '" aria-label="Detail: ' + esc(k.judul) + '"><div class="thumb thumb-plain"><div class="d">' + p.d + '<small>' + p.m + ' ' + p.y + '</small></div>' + state + '</div></button>';
    return '<article class="card card-hover overflow-hidden flex flex-col">' + th +
      '<div class="p-5 flex flex-col gap-3 flex-1">' + (k.kategori ? '<p class="text-sm font-medium text-gold-ink">' + esc(k.kategori) + '</p>' : '') +
      '<h3 class="font-display text-xl font-semibold leading-snug line-clamp-2"><button class="text-left hover:underline" data-act="kg-detail" data-id="' + esc(k.id) + '">' + esc(k.judul) + '</button></h3>' +
      '<ul class="text-sm text-muted space-y-1.5">' +
      (k.jam ? '<li class="flex items-center gap-2">' + ic('clock', 'w-4 h-4') + esc(k.jam) + ' WIB</li>' : '') +
      (k.lokasi ? '<li class="flex items-center gap-2">' + ic('map-pin', 'w-4 h-4') + esc(k.lokasi) + '</li>' : '') +
      (nar ? '<li class="flex items-center gap-2">' + ic('mic-vocal', 'w-4 h-4') + esc(nar) + '</li>' : '') + '</ul>' +
      '<div class="flex gap-2 mt-auto pt-2"><button class="btn btn-line btn-sm flex-1" data-act="kg-detail" data-id="' + esc(k.id) + '">Detail</button>' +
      (k.absensi === 'Dibuka' ? '<button class="btn btn-primary btn-sm flex-1" data-act="absen" data-id="' + esc(k.id) + '">' + ic('circle-check', 'w-4 h-4') + ' Isi Kehadiran</button>' : '') + '</div></div></article>';
  }
  function cardBerita(b) {
    return '<article class="card card-hover overflow-hidden flex flex-col"><button class="block text-left" data-act="br-detail" data-id="' + esc(b.id) + '" aria-label="Baca: ' + esc(b.judul) + '">' +
      U.art(b.gambar, b.id, 'aspect-[16/10]', '') + '</button><div class="p-5 flex flex-col gap-2 flex-1"><div class="flex items-center gap-2 text-sm text-muted"><span class="badge">' + esc(b.kategori || 'Berita') + '</span><span>' + U.fmtTgl(b.tanggal) + '</span></div>' +
      '<h3 class="font-display text-xl font-semibold leading-snug line-clamp-2"><button class="text-left hover:underline" data-act="br-detail" data-id="' + esc(b.id) + '">' + esc(b.judul) + '</button></h3><p class="text-sm text-muted line-clamp-3">' + esc(b.ringkasan) + '</p></div></article>';
  }
  function cardNara(n) {
    return '<article class="card card-hover p-6 text-center flex flex-col items-center"><button data-act="nr-detail" data-id="' + esc(n.id) + '" aria-label="Profil ' + esc(n.nama) + '">' + U.avatar(n.nama, n.foto, 'w-24 h-28 text-2xl arch-r ring-4 ring-gold-pale') + '</button>' +
      '<h3 class="font-display text-xl font-semibold mt-4 leading-snug">' + esc(n.nama) + '</h3><p class="text-sm text-gold-ink font-medium">' + esc(n.gelar) + '</p>' +
      (n.keahlian ? '<div class="flex flex-wrap justify-center gap-1.5 mt-3">' + n.keahlian.split(',').slice(0, 3).map(function (x) { return '<span class="badge">' + esc(x.trim()) + '</span>'; }).join('') + '</div>' : '') +
      '<p class="text-sm text-muted line-clamp-3 mt-3">' + esc(n.bio) + '</p><button class="btn btn-line btn-sm mt-4" data-act="nr-detail" data-id="' + esc(n.id) + '">Lihat profil</button></article>';
  }
  App.cardKegiatan = cardKegiatan;

  // ---------- Sorotan kegiatan (hero event dengan poster) ----------
  function spotlight(k, o) {
    o = o || {};
    var st = App.statusKg(k), nar = App.narName(k.narId), p = U.tglParts(k.tanggal), open = k.absensi === 'Dibuka';
    var art = k.poster
      ? '<button type="button" class="poster-btn" data-act="poster" data-id="' + esc(k.id) + '" aria-label="Perbesar poster ' + esc(k.judul) + '"><img src="' + esc(k.poster) + '" alt="Poster ' + esc(k.judul) + '" decoding="async" data-fallback="1"></button>'
      : '<div class="arch-card" aria-hidden="true"><span class="d">' + p.d + '</span><span class="m">' + p.m + ' ' + p.y + '</span></div>';
    var meta = function (icn, t) { return t ? '<li class="flex items-start gap-3">' + ic(icn, 'w-5 h-5 mt-0.5 text-[#E8C45A]') + '<span>' + esc(t) + '</span></li>' : ''; };
    return '<section class="band-night ' + (o.top ? 'pt-32 sm:pt-40 pb-16 sm:pb-24' : 'band') + '" aria-labelledby="h-spot">' +
      '<div class="hero-arch" style="opacity:.35;right:-4%;height:120%" aria-hidden="true"></div>' +
      '<div class="wrap relative grid lg:grid-cols-12 gap-x-14 gap-y-10 items-center">' +
      '<div class="lg:col-span-5 order-2 lg:order-1"><div class="poster-stage">' + art + '</div></div>' +
      '<div class="lg:col-span-7 order-1 lg:order-2"><span class="badge ' + st.c + '">' + (st.live ? '<span class="w-2 h-2 rounded-full bg-ok animate-pulse"></span>' : '') + (open ? 'Absensi sedang dibuka' : st.t === 'Selesai' ? 'Kegiatan terakhir' : 'Kajian berikutnya') + '</span>' +
      '<h2 id="h-spot" class="font-display font-medium mt-5" style="font-size:clamp(2.1rem,4.6vw,3.6rem);line-height:1.1;letter-spacing:-.02em">' + esc(k.judul) + '</h2>' +
      '<ul class="mt-7 space-y-3 text-[17px]" style="color:rgba(233,241,237,.88)">' + meta('calendar-days', U.fmtTglPanjang(k.tanggal)) + meta('clock', k.jam && k.jam + ' WIB') + meta('map-pin', k.lokasi) + meta('mic-vocal', nar) + '</ul>' +
      (k.deskripsi ? '<p class="mt-6 max-w-xl leading-7 line-clamp-3 muted">' + esc(k.deskripsi) + '</p>' : '') +
      '<div class="mt-9 flex flex-wrap gap-3">' + (open ? '<button class="btn btn-solid-gold btn-hero" data-act="absen" data-id="' + esc(k.id) + '">' + ic('circle-check') + ' Isi kehadiran</button>' : '<button class="btn btn-solid-gold btn-hero" data-act="daftar">Daftar jadi peserta</button>') +
      '<button class="btn btn-glass btn-hero" data-act="kg-detail" data-id="' + esc(k.id) + '">Lihat detail &amp; materi</button></div></div></div></section>';
  }

  // ---------- HOME ----------
  function nextKegiatan() {
    var b = B(); if (!b) return null; var t = U.todayStr();
    var open = b.kegiatan.filter(function (k) { return k.absensi === 'Dibuka'; })[0]; if (open) return open;
    var up = b.kegiatan.filter(function (k) { return k.tanggal >= t; }).sort(function (a, c) { return a.tanggal < c.tanggal ? -1 : 1; });
    return up[0] || b.kegiatan[0] || null;
  }
  App.nextKegiatan = nextKegiatan;
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
    var k = nextKegiatan(), box = $('#hero-next');
    if (!k) { box.innerHTML = '<p class="text-muted">Belum ada jadwal kegiatan. Jadwal kajian akan tampil di sini.</p>'; return; }
    var p = U.tglParts(k.tanggal), open = k.absensi === 'Dibuka';
    box.innerHTML = '<div class="w-16 shrink-0 rounded-xl bg-brand text-on-brand text-center py-2.5" style="background:#0B3D2E"><div class="font-display text-2xl font-medium leading-none">' + p.d + '</div><div class="text-[11px] font-bold tracking-wider mt-1" style="color:#E8C45A">' + p.m + '</div></div>' +
      '<div class="min-w-0 flex-1"><p class="text-sm text-muted">' + (open ? 'Absensi sedang dibuka' : 'Kajian berikutnya') + '</p><p class="font-display text-lg sm:text-xl font-semibold leading-snug line-clamp-2">' + esc(k.judul) + '</p><p class="text-sm text-muted">' + esc([k.jam && k.jam + ' WIB', k.lokasi].filter(Boolean).join(' · ')) + '</p></div>' +
      (open ? '<button class="btn btn-primary btn-sm shrink-0" data-act="absen" data-id="' + esc(k.id) + '">Hadir</button>' : '<button class="btn btn-line btn-sm shrink-0" data-act="kg-detail" data-id="' + esc(k.id) + '">Detail</button>');
  }

  // ---------- Banner foto (carousel hero) ----------
  var Hero = { i: 0, n: 0, sig: null, timer: null, userPaused: false, hover: false, DUR: 6500 };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function slideImg(i) { var im = $('.hero-slide[data-i="' + i + '"] img'); if (im && !im.src && im.dataset.src) im.src = im.dataset.src; }
  function heroPlay() {
    clearTimeout(Hero.timer); var h = $('#hero');
    var go = Hero.n > 1 && !Hero.userPaused && !Hero.hover && !document.hidden && !reduce && document.body.dataset.route === 'home';
    h.classList.remove('playing');
    if (!go) return;
    void h.offsetWidth; h.classList.add('playing'); h.style.setProperty('--dur', Hero.DUR + 'ms');
    Hero.timer = setTimeout(function () { heroShow(Hero.i + 1); }, Hero.DUR);
  }
  function heroShow(n) {
    if (!Hero.n) return; Hero.i = (n + Hero.n) % Hero.n;
    $$('.hero-slide').forEach(function (s) { s.classList.toggle('on', +s.dataset.i === Hero.i); });
    $$('.hero-seg').forEach(function (s) { s.setAttribute('aria-current', String(+s.dataset.i === Hero.i)); });
    slideImg(Hero.i); slideImg((Hero.i + 1) % Hero.n);
    var sl = (B().banner || [])[Hero.i] || {}, cap = $('#hero-cap');
    var t = esc(sl.judul || '') + (sl.sub ? ' — ' + esc(sl.sub) : '');
    cap.innerHTML = sl.tautan && t ? '<a href="' + esc(sl.tautan) + '" target="_blank" rel="noopener noreferrer" class="underline decoration-[#CDA434] underline-offset-4 hover:text-white">' + t + '</a>' : t;
    heroPlay();
  }
  function buildHero() {
    var b = B(); if (!b) return; var sl = b.banner || [];
    var sig = JSON.stringify(sl); if (sig === Hero.sig) return; Hero.sig = sig;
    var h = $('#hero'); Hero.n = sl.length; if (Hero.i >= Hero.n) Hero.i = 0;
    h.classList.toggle('hero-plain', !sl.length); $('#hero-arch').hidden = !!sl.length; $('#hero-shade').hidden = !sl.length;
    $('#hero-slides').innerHTML = sl.map(function (s, i) { return '<div class="hero-slide' + (i === Hero.i ? ' on' : '') + '" data-i="' + i + '"><img ' + (i === Hero.i ? 'src="' + esc(s.gambar) + '" fetchpriority="high"' : 'data-src="' + esc(s.gambar) + '"') + ' alt="" decoding="async" data-fallback="1"></div>'; }).join('');
    var wrap = $('#hero-ctl-wrap'); wrap.hidden = !sl.length;
    $('#hero-ctl').innerHTML = Hero.n > 1 ? '<button type="button" class="hero-nav" data-act="hero-prev" aria-label="Foto sebelumnya">' + ic('chevron-left') + '</button>' +
      sl.map(function (s, i) { return '<button type="button" class="hero-seg" data-act="hero-go" data-i="' + i + '" aria-label="Foto ' + (i + 1) + ' dari ' + sl.length + '" aria-current="' + (i === Hero.i) + '"><i></i></button>'; }).join('') +
      '<button type="button" class="hero-nav" data-act="hero-next" aria-label="Foto berikutnya">' + ic('chevron-right') + '</button>' +
      (reduce ? '' : '<button type="button" class="hero-nav" data-act="hero-pause" aria-label="Jeda putar otomatis" aria-pressed="false">' + ic('pause') + '</button>') : '';
    if (Hero.n) heroShow(Hero.i); else heroPlay();
    if (Hero.n) U.idle(function () { slideImg(1); });
  }
  (function bindHero() {
    document.addEventListener('visibilitychange', heroPlay);
    window.addEventListener('sim:route', heroPlay);
    document.addEventListener('mouseover', function (e) { var on = !!e.target.closest('#hero .hero-ctl'); if (on !== Hero.hover) { Hero.hover = on; heroPlay(); } });
    var x0 = null;
    document.addEventListener('pointerdown', function (e) { x0 = e.target.closest('#hero') && !e.target.closest('button,a') ? e.clientX : null; });
    document.addEventListener('pointerup', function (e) { if (x0 == null) return; var dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 60) heroShow(Hero.i + (dx < 0 ? 1 : -1)); });
  })();

  function renderHome() {
    var b = B(), el = $('#home-body'); if (!b) { el.innerHTML = '<div class="wrap band"><div class="grid md:grid-cols-3 gap-6">' + sk(3) + '</div></div>'; return; }
    var t = U.todayStr(), spot = nextKegiatan();
    var up = b.kegiatan.filter(function (k) { return k.tanggal >= t || k.absensi === 'Dibuka'; }).sort(function (a, c) { return a.tanggal < c.tanggal ? -1 : 1; });
    var show = (up.length ? up : b.kegiatan).filter(function (k) { return !spot || k.id !== spot.id; }).slice(0, 3);
    var aktif = b.program.filter(function (g) { return g.status === 'Aktif'; });
    var photos = allPhotos(), html = '';
    if (spot) html += spotlight(spot);
    html += '<section class="band" aria-labelledby="h-kg"><div class="wrap">' + sectionHead('Jadwal kajian pekan dan bulan ini. Buka detail untuk materi, atau isi kehadiran saat absensi dibuka.', 'Kegiatan terdekat', 'h-kg', { to: 'event', t: 'Semua kegiatan' }) +
      '<div class="grid md:grid-cols-2 xl:grid-cols-3 gap-6">' + (show.length ? show.map(cardKegiatan).join('') : emptyState('calendar-days', 'Belum ada kegiatan lain', 'Jadwal kajian berikutnya akan tampil di sini.')) + '</div></div></section>';
    if (photos.length) {
      var n = photos.length >= 5 ? 5 : photos.length, tiles = photos.slice(0, n).map(function (x, i) { return photoBtn(x.g, i, 'all', x.k); });
      if (photos.length > 5) tiles[4] = tiles[4].replace('</button>', '<span class="bento-more">+' + (photos.length - 4) + '<span class="text-sm font-medium">foto lainnya</span></span></button>').replace('data-act="lb"', 'data-act="go-galeri"');
      html += '<section class="band band-alt" aria-labelledby="h-gl"><div class="wrap">' + sectionHead('Momen dari setiap kajian, dikumpulkan dalam satu tempat.', 'Galeri kegiatan', 'h-gl', { to: 'galeri', t: 'Lihat galeri' }) +
        '<div class="' + (photos.length >= 5 ? 'bento' : 'grid grid-cols-2 md:grid-cols-' + Math.min(n, 4) + ' gap-3') + '">' + tiles.join('') + '</div></div></section>';
    }
    if (aktif.length) {
      var g = aktif[0];
      html += '<section class="band" aria-labelledby="h-gp"><div class="wrap"><div class="prize p-8 sm:p-12 grid lg:grid-cols-5 gap-10 items-center"><div class="star-pattern absolute inset-0 opacity-60" aria-hidden="true"></div>' +
        '<div class="relative lg:col-span-3"><p class="flex items-center gap-2 font-semibold" style="color:#E8C45A">' + ic('trophy', 'w-5 h-5') + ' Grand Prize</p>' +
        '<h2 id="h-gp" class="font-display text-3xl sm:text-5xl font-medium mt-4" style="line-height:1.1;letter-spacing:-.02em">' + esc(g.nama) + '</h2><p class="mt-4 max-w-xl leading-7" style="color:rgba(255,255,255,.82)">' + esc(g.deskripsi || 'Hadir secara konsisten, raih kesempatan memenangkan hadiah utama.') + '</p>' +
        '<div class="mt-6 flex flex-wrap gap-2.5"><span class="rounded-full border border-white/25 px-4 py-1.5 text-sm font-medium">Hadir ' + g.min + '× di ' + esc((g.kategori || []).join(', ') || 'kegiatan rutin') + '</span><span class="rounded-full border border-white/25 px-4 py-1.5 text-sm font-medium">' + g.pemenang + ' pemenang</span>' +
        (g.selesai ? '<span class="rounded-full border border-white/25 px-4 py-1.5 text-sm font-medium">s.d. ' + U.fmtTgl(g.selesai) + '</span>' : '') + '</div>' +
        '<button class="btn btn-solid-gold btn-hero mt-8" data-go="dashboard">Lihat progres saya ' + ic('arrow-right', 'w-4 h-4') + '</button></div>' +
        '<div class="relative lg:col-span-2 flex justify-center">' + U.art(g.gambar, g.id, 'w-56 h-56 sm:w-64 sm:h-64 !rounded-full ring-4 ring-[#CDA434]/60', g.nama) + '</div></div></div></section>';
    }
    if (b.narasumber.length) html += '<section class="band band-alt" aria-labelledby="h-ns"><div class="wrap">' + sectionHead('Para asatidz yang membimbing jamaah dengan ilmu dan keteladanan.', 'Narasumber kami', 'h-ns', { to: 'narasumber', t: 'Semua narasumber' }) + '<div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">' + b.narasumber.slice(0, 4).map(cardNara).join('') + '</div></div></section>';
    if (b.berita.length) html += '<section class="band" aria-labelledby="h-br"><div class="wrap">' + sectionHead('Pengumuman, liputan kegiatan, dan tulisan dari majelis.', 'Berita & artikel', 'h-br', { to: 'news', t: 'Semua berita' }) + '<div class="grid md:grid-cols-3 gap-6">' + b.berita.slice(0, 3).map(cardBerita).join('') + '</div></div></section>';
    el.innerHTML = html;
  }

  // ---------- ABOUT ----------
  function renderAbout() {
    var b = B(), el = $('#about-body'); if (!b) { el.innerHTML = sk(2, 260); return; }
    var a = b.about || {}, lines = function (t) { return String(t || '').split('\n').filter(Boolean); };
    var team = []; try { team = JSON.parse(a.Struktur_JSON || '[]'); } catch (e) {}
    var html = pageHead('Tentang ' + b.app.nama, a.Tagline || 'Menuntut ilmu, merajut ukhuwah.', 'h-about');
    html += '<div class="grid lg:grid-cols-3 gap-6 mt-10"><div class="card p-8 lg:col-span-2"><h2 class="text-2xl font-semibold flex items-center gap-3">' + ic('book-open', 'w-6 h-6 text-gold-ink') + 'Sejarah Singkat</h2><p class="text-muted mt-4 leading-7">' + U.nl2br(a.Sejarah) + '</p></div>' +
      '<div class="card p-8 bg-brand text-on-brand" style="background:linear-gradient(135deg,#0B3D2E,#14614B);border-color:transparent"><h2 class="text-2xl font-semibold !text-white flex items-center gap-3">' + ic('sparkles', 'w-6 h-6 text-[#ffdf96]') + 'Visi</h2><p class="mt-4 text-white/90 leading-7">' + U.nl2br(a.Visi) + '</p></div></div>';
    html += '<div class="grid lg:grid-cols-2 gap-6 mt-6"><div class="card p-8"><h2 class="text-2xl font-semibold flex items-center gap-3">' + ic('list-checks', 'w-6 h-6 text-gold-ink') + 'Misi</h2><ol class="mt-4 space-y-3">' +
      lines(a.Misi).map(function (m, i) { return '<li class="flex gap-3"><span class="w-7 h-7 shrink-0 rounded-full bg-gold-pale text-gold-ink text-sm font-bold flex items-center justify-center">' + (i + 1) + '</span><span class="text-muted">' + esc(m) + '</span></li>'; }).join('') + '</ol></div>' +
      '<div class="card p-8"><h2 class="text-2xl font-semibold flex items-center gap-3">' + ic('heart', 'w-6 h-6 text-gold-ink') + 'Nilai-Nilai</h2><div class="grid grid-cols-2 gap-3 mt-4">' +
      lines(a.Nilai).map(function (n) { return '<div class="rounded-2xl bg-surface-2 border border-line px-4 py-4 flex items-center gap-3 font-medium">' + U.star('w-4 h-4 text-gold') + esc(n) + '</div>'; }).join('') + '</div>' +
      (a.Jadwal ? '<p class="mt-5 flex items-start gap-3 text-sm text-muted">' + ic('calendar-days', 'w-5 h-5 mt-0.5 text-gold-ink') + esc(a.Jadwal) + '</p>' : '') + '</div></div>';
    if (team.length) html += '<section class="mt-14" aria-labelledby="h-team">' + sectionHead('', 'Struktur pengurus', 'h-team') + '<div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">' +
      team.map(function (m) { return '<div class="card p-6 text-center">' + U.personIcon(m.foto, 'w-24 h-24 mx-auto', m.nama) + '<h3 class="font-display text-lg font-semibold mt-3">' + esc(m.nama) + '</h3><p class="text-sm text-gold-ink font-medium">' + esc(m.jabatan) + '</p></div>'; }).join('') + '</div></section>';
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
    var spot = nextKegiatan(), hero = $('#event-hero');
    if (hero) hero.innerHTML = spot ? spotlight(spot, { top: true }) : '';
    el.className = 'wrap pb-20 ' + (spot ? 'pt-14' : 'pt-32 sm:pt-40');
    var html = pageHead('Kegiatan & materi', 'Temukan jadwal kajian, isi kehadiran saat absensi dibuka, dan unduh materi setelah acara.', 'h-event') +
      '<div class="mt-8 flex flex-col lg:flex-row lg:items-center gap-4 justify-between"><div class="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1" role="group" aria-label="Filter status">' +
      chip('semua', 'Semua', App.evFilter, 'ev-f') + chip('akan', 'Akan Datang', App.evFilter, 'ev-f') + chip('selesai', 'Selesai', App.evFilter, 'ev-f') +
      (cats.length ? '<span class="w-px bg-line mx-1 shrink-0" aria-hidden="true"></span>' + cats.map(function (c) { return '<button class="chip" aria-pressed="' + (App.evCat === c) + '" data-act="ev-c" data-v="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') : '') + '</div>' +
      '<label class="relative block lg:w-72"><span class="sr-only">Cari kegiatan</span><span class="absolute left-4 top-1/2 -translate-y-1/2 text-muted">' + ic('search', 'w-5 h-5') + '</span><input id="ev-q" class="field !pl-12" type="search" placeholder="Cari kegiatan…" value="' + esc(App.evQ) + '" autocomplete="off"></label></div>' +
      '<div class="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">' + (list.length ? list.map(cardKegiatan).join('') : emptyState('search', 'Tidak ada kegiatan', 'Coba ubah filter atau kata kunci pencarian.')) + '</div>';
    el.innerHTML = html;
    var inp = $('#ev-q'); if (inp && App._focusQ) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); App._focusQ = false; }
  }

  // ---------- GALERI ----------
  App.galFilter = '';
  function renderGaleri() {
    var b = B(), el = $('#galeri-body'); if (!b) { el.innerHTML = sk(2, 260); return; }
    var albs = b.kegiatan.map(function (k) { return { k: k, items: photosOf(k.id) }; }).filter(function (a) { return a.items.length; });
    if (App.galFilter && !albs.some(function (a) { return a.k.id === App.galFilter; })) App.galFilter = '';
    var total = albs.reduce(function (n, a) { return n + a.items.length; }, 0);
    var html = pageHead('Galeri kegiatan', 'Dokumentasi setiap kajian dan acara majelis, dikelompokkan per kegiatan.', 'h-galeri');
    if (!albs.length) { el.innerHTML = html + '<div class="mt-10 grid">' + emptyState('images', 'Belum ada dokumentasi', 'Foto kegiatan akan tampil di sini setelah ditambahkan pengurus.') + '</div>'; return; }
    html += '<div class="mt-8 flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1" role="group" aria-label="Pilih kegiatan"><button class="chip" aria-pressed="' + (!App.galFilter) + '" data-act="gal-f" data-v="">Semua (' + total + ')</button>' +
      albs.map(function (a) { return '<button class="chip whitespace-nowrap" aria-pressed="' + (App.galFilter === a.k.id) + '" data-act="gal-f" data-v="' + esc(a.k.id) + '">' + esc(a.k.judul) + ' (' + a.items.length + ')</button>'; }).join('') + '</div>';
    albs.filter(function (a) { return !App.galFilter || a.k.id === App.galFilter; }).forEach(function (a) {
      html += '<section class="mt-12" aria-label="Album ' + esc(a.k.judul) + '"><div class="flex flex-wrap items-end justify-between gap-3 mb-5"><div><h2 class="font-display text-2xl sm:text-3xl font-medium">' + esc(a.k.judul) + '</h2><p class="text-sm text-muted mt-1">' + U.fmtTglPanjang(a.k.tanggal) + ' · ' + a.items.length + ' foto</p></div>' +
        '<button class="btn btn-line btn-sm" data-act="kg-detail" data-id="' + esc(a.k.id) + '">Detail kegiatan</button></div><div class="masonry">' +
        a.items.map(function (g, i) { return photoBtn(g, i, a.k.id, a.k); }).join('') + '</div></section>';
    });
    el.innerHTML = html;
  }

  // ---------- NEWS & NARASUMBER ----------
  function renderNews() {
    var b = B(), el = $('#news-body'); if (!b) { el.innerHTML = '<div class="grid md:grid-cols-3 gap-6">' + sk(3) + '</div>'; return; }
    el.innerHTML = pageHead('Berita & artikel', 'Pengumuman, liputan kegiatan, dan tulisan inspiratif dari majelis.', 'h-news') +
      '<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">' + (b.berita.length ? b.berita.map(cardBerita).join('') : emptyState('newspaper', 'Belum ada berita', 'Berita terbaru akan muncul di sini.')) + '</div>';
  }
  function renderNara() {
    var b = B(), el = $('#nara-body'); if (!b) { el.innerHTML = '<div class="grid md:grid-cols-4 gap-6">' + sk(4, 300) + '</div>'; return; }
    el.innerHTML = pageHead('Narasumber', 'Para asatidz yang membimbing jamaah dengan ilmu dan keteladanan.', 'h-nara') +
      '<div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">' + (b.narasumber.length ? b.narasumber.map(cardNara).join('') : emptyState('mic-vocal', 'Belum ada narasumber', 'Profil narasumber akan tampil di sini.')) + '</div>';
  }

  // ---------- Detail (modal) ----------
  function detailKegiatan(id) {
    var b = B(), k = b.kegiatan.filter(function (x) { return x.id === id; })[0]; if (!k) return;
    var st = App.statusKg(k), mats = b.materi.filter(function (m) { return m.kegiatanId === id; }), nar = App.narName(k.narId);
    U.modal(U.modalHead(k.judul, U.fmtTglPanjang(k.tanggal)) + '<div class="px-6 pb-6">' + (k.poster ? '<button type="button" class="block w-full mb-5 rounded-xl overflow-hidden cursor-zoom-in" data-act="poster" data-id="' + esc(k.id) + '" aria-label="Perbesar poster">' + posterThumb(k, '!rounded-xl') + '</button>' : '') +
      '<div class="flex flex-wrap gap-2 mb-4"><span class="badge ' + st.c + '">' + st.t + '</span>' + (k.kategori ? '<span class="badge">' + esc(k.kategori) + '</span>' : '') + '</div>' +
      '<ul class="text-sm space-y-2 mb-4">' + (k.jam ? '<li class="flex gap-2 items-center">' + ic('clock', 'w-4 h-4 text-gold-ink') + esc(k.jam) + ' WIB</li>' : '') + (k.lokasi ? '<li class="flex gap-2 items-center">' + ic('map-pin', 'w-4 h-4 text-gold-ink') + esc(k.lokasi) + '</li>' : '') + (nar ? '<li class="flex gap-2 items-center">' + ic('mic-vocal', 'w-4 h-4 text-gold-ink') + esc(nar) + '</li>' : '') + '</ul>' +
      '<p class="text-muted leading-7">' + U.nl2br(k.deskripsi) + '</p>' +
      '<h3 class="font-display text-lg font-semibold mt-6 mb-3">Materi</h3>' +
      (mats.length ? '<ul class="space-y-2">' + mats.map(function (m) {
        return '<li class="rounded-2xl border border-line bg-surface-2 p-3 flex items-center gap-3">' + ic('file-text', 'w-5 h-5 text-gold-ink') + '<span class="flex-1 text-sm font-medium">' + esc(m.judul) + '</span>' +
          (m.file ? '<a class="btn btn-ghost btn-sm" href="' + esc(m.file) + '" target="_blank" rel="noopener noreferrer">' + ic('download', 'w-4 h-4') + ' Slide</a>' : '') +
          (m.hasil ? '<a class="btn btn-ghost btn-sm" href="' + esc(m.hasil) + '" target="_blank" rel="noopener noreferrer">' + ic('file-text', 'w-4 h-4') + ' Rangkuman</a>' : '') +
          (!m.file && !m.hasil ? '<span class="badge badge-off">Segera tersedia</span>' : '') + '</li>'; }).join('') + '</ul>' : '<p class="text-sm text-muted">Materi belum diunggah.</p>') +
      (function () { var ph = photosOf(id); return ph.length ? '<h3 class="font-display text-lg font-semibold mt-6 mb-3">Dokumentasi</h3><div class="grid grid-cols-3 sm:grid-cols-4 gap-2">' + ph.slice(0, 4).map(function (g, i) { return '<button type="button" class="ph !mb-0 aspect-square" data-act="lb" data-set="' + esc(id) + '" data-i="' + i + '" aria-label="Buka foto ' + (i + 1) + '"><img src="' + esc(g.gambar) + '" alt="" loading="lazy" decoding="async" class="!h-full object-cover" data-fallback="1"></button>'; }).join('') + '</div>' + (ph.length > 4 ? '<button class="btn btn-line btn-sm mt-3" data-close data-act="gal-go" data-id="' + esc(id) + '">Lihat ' + ph.length + ' foto</button>' : '') : ''; })() +
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
    applyBrand(); renderHero(); buildHero(); renderHome(); renderAbout(); renderEvent(); renderGaleri(); renderNews(); renderNara();
    if (App.renderDash) App.renderDash();
  }
  App.renderAll = function () { App._dirty = true; renderAll(); };
  App.renderEvent = renderEvent;

  // ---------- Muat data ----------
  App.loadBoot = function (force) {
    return SWR.load('pub', 'boot', function () { return api('bootPublik', {}, { role: 'peserta', noToken: true }); }, {
      ttl: C.TTL_BOOT, force: force,
      onData: function (d) { d.banner = d.banner || []; d.galeri = d.galeri || []; App.S.boot = d; renderAll(); },
      onError: function (r) { if (!App.S.boot && r && r.code !== 'CONFIG') U.toast(r.message || 'Gagal memuat data.', 'error'); }
    });
  };

  // ---------- Navigasi & aksi ----------
  function buildNav() {
    var link = function (n, cls) { return '<a href="#/' + n.k + '" data-nav="' + n.k + '" class="' + cls + '">' + (cls.indexOf('side') >= 0 ? ic(n.i) : '') + esc(n.l) + '</a>'; };
    $('#nav-desktop').innerHTML = NAV.map(function (n) { return link(n, 'nav-link'); }).join('');
    $('#nav-drawer').innerHTML = NAV.map(function (n) { return link(n, 'side-link'); }).join('');
    $('#nav-footer').innerHTML = NAV.map(function (n) { return '<li><a class="hover:underline" style="color:rgba(233,241,237,.78)" href="#/' + n.k + '">' + esc(n.l) + '</a></li>'; }).join('');
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act],[data-go]'); if (!t) return;
    var a = t.dataset.act, id = t.dataset.id;
    if (t.dataset.go) { U.go(t.dataset.go); return; }
    if (a === 'menu') { U.drawer($('#drawer').hidden); return; }
    if (a === 'menu-close') { U.drawer(false); return; }
    if (a === 'hero-prev') { Hero.userPaused = false; return heroShow(Hero.i - 1); }
    if (a === 'hero-next') { Hero.userPaused = false; return heroShow(Hero.i + 1); }
    if (a === 'hero-go') return heroShow(+t.dataset.i);
    if (a === 'hero-pause') { Hero.userPaused = !Hero.userPaused; t.setAttribute('aria-pressed', String(Hero.userPaused)); t.setAttribute('aria-label', Hero.userPaused ? 'Putar otomatis' : 'Jeda putar otomatis'); t.innerHTML = ic(Hero.userPaused ? 'play' : 'pause'); return heroPlay(); }
    if (a === 'lb') return lightbox(lbItems(t.dataset.set), +t.dataset.i || 0);
    if (a === 'poster') { var kk = B().kegiatan.filter(function (x) { return x.id === id; })[0]; return kk && lightbox([{ src: kk.poster, cap: kk.judul, sub: U.fmtTglPanjang(kk.tanggal) }], 0); }
    if (a === 'go-galeri') { App.galFilter = ''; renderGaleri(); return U.go('galeri'); }
    if (a === 'gal-go') { App.galFilter = id; renderGaleri(); return U.go('galeri'); }
    if (a === 'gal-f') { App.galFilter = t.dataset.v; return renderGaleri(); }
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
  U.route('home', { title: 'Beranda' }); U.route('about', { title: 'Tentang' }); U.route('event', { title: 'Kegiatan' }); U.route('galeri', { title: 'Galeri' }); U.route('news', { title: 'Berita' });
  U.route('narasumber', { title: 'Narasumber' });
  U.route('dashboard', { title: 'Dashboard', enter: function () { if (App.enterDash) App.enterDash(); } });
  U.route('admin', { title: 'Panel Pengurus', enter: function () { loadAdmin(); } });

  var adminLoading = null;
  function loadAdmin() {
    if (window.Admin) return window.Admin.mount($('#admin-root'));
    if (!adminLoading) adminLoading = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = 'js/admin.js?v=3'; s.onload = res; s.onerror = function () { adminLoading = null; rej(); }; document.head.appendChild(s);
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
    var onScroll = function () { var t = window.scrollY < 24 ? '1' : '0'; if (document.body.dataset.top !== t) document.body.dataset.top = t; };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    window.addEventListener('hashchange', U.show);
    if (!location.hash) location.replace('#/home');
    U.show();
    App.loadBoot().then(function () {
      U.idle(function () {                                    // prefetch pintar: halaman yang kemungkinan dibuka berikutnya
        if (Session.get('peserta') && App.prefetchDash) App.prefetchDash();
        if (Session.get('admin')) { var s = document.createElement('script'); s.src = 'js/admin.js?v=3'; s.defer = true; document.head.appendChild(s); }
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
