/**
 * core.js — Primitif UI: escape, ikon, tanggal, toast, modal, laci, tema, router hash, gambar/avatar, utilitas formulir.
 */
(function () {
  'use strict';

  // ---------- Dasar ----------
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function nl2br(v) { return esc(v).replace(/\n/g, '<br>'); }
  function ic(name, cls) {
    var p = (window.ICONS || {})[name] || '';
    return '<svg class="' + (cls || 'w-5 h-5') + ' shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + p + '</svg>';
  }
  function debounce(fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; }
  function idle(fn) { (window.requestIdleCallback || function (f) { return setTimeout(f, 250); })(fn, { timeout: 1500 }); }

  // ---------- Tanggal (Indonesia) ----------
  var BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var BLN_P = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  function pd(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function fmtTgl(s) { var d = pd(s); return d ? d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear() : (s || ''); }
  function fmtTglPanjang(s) { var d = pd(s); return d ? HARI[d.getDay()] + ', ' + d.getDate() + ' ' + BLN_P[d.getMonth()] + ' ' + d.getFullYear() : (s || ''); }
  function fmtWaktu(s) { if (!s) return ''; var d = pd(s), m = /T(\d{2}):(\d{2})/.exec(s); return fmtTgl(s) + (m ? ', ' + m[1] + '.' + m[2] : ''); }
  function todayStr() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function tglParts(s) { var d = pd(s); return d ? { d: ('0' + d.getDate()).slice(-2), m: BLN[d.getMonth()].toUpperCase(), y: d.getFullYear() } : { d: '--', m: '---', y: '' }; }
  function num(n) { return Number(n || 0).toLocaleString('id-ID'); }

  // ---------- Gambar, avatar, ornamen ----------
  var STAR = '<path d="M12 2l2.4 4.6L19.5 5l-1.6 5L22 12l-4.1 2 1.6 5-5.1-1.6L12 22l-2.4-4.6L4.5 19l1.6-5L2 12l4.1-2-1.6-5 5.1 1.6z" fill="currentColor"/>';
  function star(cls) { return '<svg class="' + (cls || 'w-4 h-4') + '" viewBox="0 0 24 24" aria-hidden="true">' + STAR + '</svg>'; }
  function hash(s) { var h = 0; s = String(s || ''); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  var GRADS = [['#0B3D2E', '#14614B'], ['#14614B', '#06201A'], ['#765A00', '#CDA434'], ['#0B3D2E', '#396756'], ['#06201A', '#765A00']];
  /** Gambar dengan cadangan berupa gradien + bintang bila URL kosong / gagal dimuat. */
  function art(url, seed, cls, alt) {
    var g = GRADS[hash(seed) % GRADS.length], ph = '<div class="absolute inset-0 flex items-center justify-center text-white/25" style="background:linear-gradient(135deg,' + g[0] + ',' + g[1] + ')">' + star('w-1/3 h-1/3 max-w-20') + '</div>';
    var img = url ? '<img src="' + esc(url) + '" alt="' + esc(alt || '') + '" loading="lazy" decoding="async" class="absolute inset-0 w-full h-full object-cover" data-fallback="1">' : '';
    return '<div class="relative overflow-hidden ' + (cls || '') + '">' + ph + img + '</div>';
  }
  function initials(n) { var p = String(n || '?').trim().split(/\s+/); return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); }
  function avatar(nama, foto, size) {
    var g = GRADS[hash(nama) % GRADS.length], s = size || 'w-10 h-10 text-sm';
    return '<span class="relative inline-flex items-center justify-center rounded-full overflow-hidden text-white font-semibold shrink-0 ' + s + '" style="background:linear-gradient(135deg,' + g[0] + ',' + g[1] + ')" aria-hidden="true">' + esc(initials(nama)) +
      (foto ? '<img src="' + esc(foto) + '" alt="" loading="lazy" decoding="async" class="absolute inset-0 w-full h-full object-cover" data-fallback="1">' : '') + '</span>';
  }
  /** Foto orang bila ada; bila tidak ada (atau gagal dimuat) tampil ikon orang di atas gradien. */
  function personIcon(foto, size, alt) {
    var s = size || 'w-20 h-20';
    return '<span class="relative inline-flex items-center justify-center rounded-full overflow-hidden text-white shrink-0 ring-2 ring-gold/50 ' + s + '" style="background:linear-gradient(135deg,#0B3D2E,#14614B)">' + ic('user-round', 'w-1/2 h-1/2 opacity-80') +
      (foto ? '<img src="' + esc(foto) + '" alt="' + esc(alt || '') + '" loading="lazy" decoding="async" class="absolute inset-0 w-full h-full object-cover" data-fallback="1">' : '') + '</span>';
  }
  document.addEventListener('error', function (e) { var t = e.target; if (t && t.tagName === 'IMG' && t.dataset.fallback) t.remove(); }, true);

  document.addEventListener('load', function (e) { var t = e.target; if (t && t.tagName === 'IMG') t.classList.add('ld'); }, true);

  // ---------- Toast ----------
  function toast(msg, type) {
    var wrap = $('#toasts'); if (!wrap) return;
    var el = document.createElement('div'), tone = type === 'error' ? 'bg-danger-soft text-danger border-danger/40' : type === 'ok' ? 'bg-ok-soft text-ok border-ok/30' : 'bg-surface text-ink border-line';
    el.className = 'toast flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-float text-sm font-medium ' + tone;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = ic(type === 'error' ? 'triangle-alert' : type === 'ok' ? 'circle-check' : 'info', 'w-5 h-5 mt-0.5') + '<span class="flex-1">' + esc(msg) + '</span>';
    wrap.appendChild(el);
    setTimeout(function () { el.style.transition = 'opacity .2s'; el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 220); }, type === 'error' ? 5200 : 3200);
  }

  // ---------- Modal ----------
  var modalStack = [];
  function lockScroll(on) { document.documentElement.style.overflow = on ? 'hidden' : ''; }
  function modal(inner, o) {
    o = o || {};
    var ov = document.createElement('div'), prev = document.activeElement;
    ov.className = 'overlay'; ov.setAttribute('data-overlay', '1');
    ov.innerHTML = '<div class="modal ' + (o.wide ? 'modal-wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(o.label || 'Dialog') + '" tabindex="-1">' + inner + '</div>';
    document.body.appendChild(ov); lockScroll(true);
    var box = ov.firstChild;
    var api_ = {
      el: box, close: function () {
        if (!ov.parentNode) return; ov.remove(); modalStack = modalStack.filter(function (m) { return m !== api_; });
        if (!modalStack.length) lockScroll(false);
        if (prev && prev.focus && document.contains(prev)) try { prev.focus(); } catch (e) {}
        if (o.onClose) o.onClose();
      }
    };
    ov.addEventListener('mousedown', function (e) { if (e.target === ov && !o.sticky) api_.close(); });
    box.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) api_.close(); });
    modalStack.push(api_);
    setTimeout(function () { var f = $('[autofocus],input:not([type=hidden]),select,textarea', box) || box; try { f.focus({ preventScroll: true }); } catch (e) {} }, 30);
    return api_;
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modalStack.length) { modalStack[modalStack.length - 1].close(); return; }
    if (e.key === 'Tab' && modalStack.length) {     // jebakan fokus sederhana
      var box = modalStack[modalStack.length - 1].el, f = $$('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select,textarea,[tabindex]:not([tabindex="-1"])', box).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return; var a = f[0], b = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); } else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
    }
  });
  function modalHead(title, sub) {
    return '<div class="sticky top-0 z-10 bg-surface flex items-start justify-between gap-4 px-6 pt-6 pb-3"><div><h2 class="text-2xl font-semibold leading-tight">' + esc(title) + '</h2>' +
      (sub ? '<p class="text-sm text-muted mt-1">' + esc(sub) + '</p>' : '') + '</div><button type="button" class="btn btn-ghost btn-icon -mr-2" data-close aria-label="Tutup">' + ic('x') + '</button></div>';
  }
  function confirmBox(title, text, okLabel, danger) {
    return new Promise(function (res) {
      var m = modal(modalHead(title) + '<div class="px-6 pb-6"><p class="text-sm text-muted">' + esc(text) + '</p><div class="flex gap-3 justify-end mt-6"><button class="btn btn-ghost" data-close>Batal</button><button class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" data-ok>' + esc(okLabel || 'Ya, lanjutkan') + '</button></div></div>', { label: title, onClose: function () { res(false); } });
      m.el.querySelector('[data-ok]').onclick = function () { res(true); res = function () {}; m.close(); };
    });
  }

  // ---------- Laci (mobile) ----------
  function drawer(open) {
    var d = $('#drawer'); if (!d) return;
    d.hidden = !open; lockScroll(open);
    var btn = $('#btn-menu'); if (btn) btn.setAttribute('aria-expanded', String(open));
    if (open) { var f = $('a,button', $('.drawer-panel', d)); if (f) f.focus(); }
  }

  // ---------- Tema ----------
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', t === 'dark' ? '#06201A' : '#FAF7F0');
    $$('[data-theme-icon]').forEach(function (el) { el.innerHTML = ic(t === 'dark' ? 'sun' : 'moon'); });
    $$('[data-theme-toggle]').forEach(function (b) { b.setAttribute('aria-label', t === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'); });
  }
  function initTheme() {
    var t = window.lsGet('sim:theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(t);
    document.addEventListener('click', function (e) {
      if (!e.target.closest('[data-theme-toggle]')) return;
      var n = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; window.lsSet('sim:theme', n); applyTheme(n);
    });
  }

  // ---------- Router hash ----------
  var routes = {}, current = null;
  function route(name, def) { routes[name] = def; }
  function parseHash() { var h = (location.hash || '#/home').replace(/^#\/?/, ''); var p = h.split('/'); return { name: p[0] || 'home', args: p.slice(1) }; }
  function show() {
    var r = parseHash(), def = routes[r.name];
    if (!def) { location.replace('#/home'); return; }
    var prev = current; current = r.name;
    $$('.page').forEach(function (p) { var on = p.dataset.page === r.name; p.classList.toggle('active', on); });
    $$('[data-nav]').forEach(function (a) { if (a.dataset.nav === r.name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.body.setAttribute('data-route', r.name);
    document.title = (def.title ? def.title + ' · ' : '') + window.APP_CONFIG.APP_NAME;
    if (prev !== r.name) window.scrollTo(0, 0);
    drawer(false);
    if (def.enter) def.enter(r.args, prev);
    window.dispatchEvent(new CustomEvent('sim:route', { detail: r }));
  }
  function go(path) { if (location.hash === '#/' + path) show(); else location.hash = '#/' + path; }

  // ---------- Formulir ----------
  function formData(form) {
    var o = {}; $$('input,select,textarea', form).forEach(function (el) {
      if (!el.name) return;
      if (el.type === 'checkbox') { if (el.name.slice(-2) === '[]') { var k = el.name.slice(0, -2); o[k] = o[k] || []; if (el.checked) o[k].push(el.value); } else o[el.name] = el.checked; }
      else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
      else o[el.name] = el.value;
    }); return o;
  }
  function busy(btn, on, label) {
    if (!btn) return;
    if (on) { if (btn.dataset.b === '1') return; btn.dataset.b = '1'; btn.dataset.l = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.2-8.6"/></svg><span>' + esc(label || 'Memproses…') + '</span>'; }
    else { btn.disabled = false; if (btn.dataset.b === '1' && btn.dataset.l != null) btn.innerHTML = btn.dataset.l; btn.dataset.b = ''; }
  }
  function fieldErr(form, name, msg) {
    var el = form.querySelector('[name="' + name + '"]'); if (!el) return;
    el.setAttribute('aria-invalid', 'true'); var e = el.parentNode.querySelector('.err'); if (!e) { e = document.createElement('p'); e.className = 'err'; el.parentNode.appendChild(e); } e.textContent = msg; el.focus();
    el.addEventListener('input', function f() { el.removeAttribute('aria-invalid'); if (e) e.remove(); el.removeEventListener('input', f); });
  }
  function normHp(v) { var d = String(v || '').replace(/[^\d+]/g, ''); if (d[0] === '+') d = d.slice(1); if (d.indexOf('00') === 0) d = d.slice(2); if (d[0] === '0') d = '62' + d.slice(1); else if (d[0] === '8') d = '62' + d; return d; }
  function validHp(v) { return /^62\d{8,13}$/.test(normHp(v)); }
  /** Baca gambar → perkecil → JPEG base64 (maks sisi 720px) agar unggahan ringan. */
  function imageToB64(file, max, fmt) {
    return new Promise(function (res, rej) {
      if (!file) return res(null);
      if (!/^image\//.test(file.type)) return rej(new Error('Berkas harus gambar.'));
      var fr = new FileReader(); fr.onerror = function () { rej(new Error('Gagal membaca berkas.')); };
      fr.onload = function () {
        var im = new Image(); im.onerror = function () { rej(new Error('Gambar tidak dapat dibaca.')); };
        im.onload = function () {
          var m = max || 720, s = Math.min(1, m / Math.max(im.width, im.height)), c = document.createElement('canvas');
          c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          var png = fmt === 'png'; res({ mime: png ? 'image/png' : 'image/jpeg', b64: (png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.84)).split(',')[1], name: png ? 'logo.png' : 'foto.jpg' });
        }; im.src = fr.result;
      }; fr.readAsDataURL(file);
    });
  }
  function fileToB64(file) {
    return new Promise(function (res, rej) { var fr = new FileReader(); fr.onerror = rej; fr.onload = function () { res(String(fr.result).split(',')[1]); }; fr.readAsDataURL(file); });
  }
  function download(b64, name, mime) {
    var bin = atob(b64), arr = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    var url = URL.createObjectURL(new Blob([arr], { type: mime })), a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  window.UI = { $: $, $$: $$, esc: esc, nl2br: nl2br, ic: ic, debounce: debounce, idle: idle, fmtTgl: fmtTgl, personIcon: personIcon, fmtTglPanjang: fmtTglPanjang, fmtWaktu: fmtWaktu, todayStr: todayStr, tglParts: tglParts, num: num,
    star: star, art: art, avatar: avatar, initials: initials, toast: toast, modal: modal, modalHead: modalHead, confirm: confirmBox, drawer: drawer, initTheme: initTheme,
    route: route, show: show, go: go, parseHash: parseHash, formData: formData, busy: busy, fieldErr: fieldErr, normHp: normHp, validHp: validHp, imageToB64: imageToB64, fileToB64: fileToB64, download: download, hash: hash };
})();
