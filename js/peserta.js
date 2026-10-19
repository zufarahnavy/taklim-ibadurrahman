/**
 * peserta.js — Alur peserta: Daftar, Isi Kehadiran, Verifikasi, Data Diri, Formulir, dan Dashboard pribadi.
 * Identitas peserta: Nama + No. HP (tanpa kata sandi). Sesi 12 jam disimpan di perangkat ini.
 */
(function () {
  'use strict';
  var U = UI, $ = U.$, esc = U.esc, ic = U.ic, App = window.App, dash = null;

  function B() { return App.S.boot; }
  function setSession(res) {
    Session.set('peserta', { token: res.token, exp: res.exp, profil: res.profil });
    App.saveIdentity(res.profil.nama, res.profil.hp);
    SWR.drop('dash:' + res.profil.id, 'd');
  }
  function field(id, label, input, hint) { return '<div><label class="label" for="' + id + '">' + esc(label) + '</label>' + input + (hint ? '<p class="hint">' + esc(hint) + '</p>' : '') + '</div>'; }
  var NAMA_IN = function (v) { return '<input class="field" id="f-nama" name="nama" type="text" autocomplete="name" required minlength="3" maxlength="80" placeholder="Nama lengkap sesuai pendaftaran" value="' + esc(v || '') + '">'; };
  var HP_IN = function (v) { return '<input class="field" id="f-hp" name="hp" type="tel" inputmode="tel" autocomplete="tel" required maxlength="20" placeholder="08xxxxxxxxxx" value="' + esc(v || '') + '">'; };
  function successView(icon, title, text, buttons) {
    return '<div class="px-6 py-10 text-center"><div class="w-20 h-20 rounded-full bg-ok-soft text-ok flex items-center justify-center mx-auto">' + ic(icon, 'w-10 h-10') + '</div><h2 class="text-2xl font-semibold mt-5">' + esc(title) + '</h2><p class="text-muted mt-2">' + text + '</p><div class="flex flex-col sm:flex-row gap-3 justify-center mt-7">' + buttons + '</div></div>';
  }

  // ---------- Daftar ----------
  function openDaftar() {
    if (App.me()) { U.toast('Anda sudah terdaftar & terverifikasi di perangkat ini.', 'ok'); return U.go('dashboard'); }
    warmUp();
    var m = U.modal(U.modalHead('Daftar Peserta', 'Cukup nama & nomor HP. Data Anda tidak ditampilkan ke publik.') +
      '<form class="px-6 pb-6 space-y-4" novalidate>' + field('f-nama', 'Nama lengkap', NAMA_IN()) + field('f-hp', 'Nomor HP / WhatsApp', HP_IN(), 'Dipakai sebagai identitas saat absensi. Contoh: 081234567890') +
      field('f-alamat', 'Alamat (opsional)', '<textarea class="field" id="f-alamat" name="alamat" rows="2" maxlength="250" placeholder="Kecamatan / kota"></textarea>') +
      field('f-foto', 'Foto (opsional)', '<input class="field !pt-2.5" id="f-foto" name="foto" type="file" accept="image/*">') +
      '<div class="flex gap-3 justify-end pt-2"><button type="button" class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" type="submit">Daftar</button></div></form>', { label: 'Daftar peserta' });
    var form = $('form', m.el);
    form.addEventListener('submit', function (e) {
      e.preventDefault(); var d = U.formData(form), btn = $('[type=submit]', form);
      if (d.nama.trim().length < 3) return U.fieldErr(form, 'nama', 'Nama minimal 3 karakter.');
      if (!U.validHp(d.hp)) return U.fieldErr(form, 'hp', 'Nomor HP tidak valid. Contoh: 081234567890.');
      U.busy(btn, true, 'Mendaftarkan…');
      var file = $('#f-foto', form).files[0];
      U.imageToB64(file, 640).catch(function () { return null; }).then(function (foto) {
        return api('daftar', { nama: d.nama, hp: d.hp, alamat: d.alamat, foto: foto }, { role: 'peserta', noToken: true });
      }).then(function (r) {
        U.busy(btn, false);
        if (!r.success) return U.toast(r.message, 'error');
        setSession(r.data); App.loadBoot(true);
        m.el.innerHTML = successView('circle-check', 'Pendaftaran berhasil', 'Selamat bergabung, <strong>' + esc(r.data.profil.nama) + '</strong>. Anda sudah bisa mengisi kehadiran.',
          '<button class="btn btn-gold" data-close data-act="absen">Isi Kehadiran</button><button class="btn btn-primary" data-close data-go="dashboard">Buka Dashboard</button>');
        App.renderDash(); prefetchDash();
      });
    });
  }

  // ---------- Isi Kehadiran ----------
  function openAbsen(preId) {
    var b = B(); warmUp();
    if (!b) { App.loadBoot(true); return U.toast('Memuat data… coba lagi sebentar.'); }
    var open = b.kegiatan.filter(function (k) { return k.absensi === 'Dibuka'; }), ident = App.identity(), me = App.me() || {};
    if (!open.length) {
      var up = b.kegiatan.filter(function (k) { return k.tanggal >= U.todayStr(); }).sort(function (a, c) { return a.tanggal < c.tanggal ? -1 : 1; })[0];
      return U.modal(U.modalHead('Isi Kehadiran') + '<div class="px-6 pb-8 text-center"><div class="w-16 h-16 rounded-full bg-gold-pale text-gold-ink flex items-center justify-center mx-auto">' + ic('clock', 'w-8 h-8') + '</div>' +
        '<h3 class="text-xl font-semibold mt-4">Absensi belum dibuka</h3><p class="text-muted mt-2 text-sm">Absensi hanya bisa diisi saat pengurus membukanya pada hari kajian.' + (up ? '<br>Kajian berikutnya: <strong>' + esc(up.judul) + '</strong> (' + U.fmtTgl(up.tanggal) + ').' : '') + '</p><button class="btn btn-primary mt-6" data-close>Mengerti</button></div>', { label: 'Absensi belum dibuka' });
    }
    var sel = preId && open.some(function (k) { return k.id === preId; }) ? preId : open[0].id;
    var m = U.modal(U.modalHead('Isi Kehadiran', 'Masukkan identitas yang Anda daftarkan.') +
      '<form class="px-6 pb-6 space-y-4" novalidate>' + field('f-kg', 'Kegiatan', '<select class="field" id="f-kg" name="kegiatanId">' + open.map(function (k) { return '<option value="' + esc(k.id) + '"' + (k.id === sel ? ' selected' : '') + '>' + esc(k.judul + ' — ' + U.fmtTgl(k.tanggal)) + '</option>'; }).join('') + '</select>') +
      field('f-nama', 'Nama lengkap', NAMA_IN(me.nama || ident.nama)) + field('f-hp', 'Nomor HP', HP_IN(me.hp || ident.hp)) +
      '<p class="err hidden" id="absen-err" role="alert"></p>' +
      '<div class="flex gap-3 justify-end pt-2"><button type="button" class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" type="submit">' + ic('circle-check', 'w-5 h-5') + ' Hadir</button></div>' +
      '<p class="text-center text-sm text-muted">Belum terdaftar? <button type="button" class="font-semibold text-heading underline" data-close data-act="daftar">Daftar dulu</button></p></form>', { label: 'Isi kehadiran' });
    var form = $('form', m.el);
    form.addEventListener('submit', function (e) {
      e.preventDefault(); var d = U.formData(form), btn = $('[type=submit]', form), er = $('#absen-err', form);
      er.classList.add('hidden');
      if (d.nama.trim().length < 3) return U.fieldErr(form, 'nama', 'Isi nama lengkap Anda.');
      if (!U.validHp(d.hp)) return U.fieldErr(form, 'hp', 'Nomor HP tidak valid.');
      U.busy(btn, true, 'Mencatat…');
      api('absen', { nama: d.nama, hp: d.hp, kegiatanId: d.kegiatanId }, { role: 'peserta', noToken: true }).then(function (r) {
        U.busy(btn, false);
        if (!r.success) { er.textContent = r.message; er.classList.remove('hidden'); return; }
        setSession(r.data); App.loadBoot(true);
        m.el.innerHTML = successView('circle-check', 'Kehadiran tercatat', 'Jazakumullahu khairan, <strong>' + esc(r.data.nama) + '</strong>.<br>Ini kehadiran ke-<strong>' + r.data.total + '</strong> Anda. <span class="text-sm">(' + esc(r.data.judul) + ')</span>',
          '<button class="btn btn-ghost" data-close>Selesai</button><button class="btn btn-primary" data-close data-go="dashboard">Lihat progres</button>');
        prefetchDash(true);
      });
    });
  }

  // ---------- Verifikasi ----------
  function verifFormHtml() {
    var ident = App.identity();
    return '<form data-form="verif" class="space-y-4" novalidate>' + field('v-nama', 'Nama lengkap', NAMA_IN(ident.nama).replace('id="f-nama"', 'id="v-nama"')) + field('v-hp', 'Nomor HP', HP_IN(ident.hp).replace('id="f-hp"', 'id="v-hp"')) +
      '<p class="err hidden" role="alert" data-err></p><button class="btn btn-primary w-full" type="submit">' + ic('log-in', 'w-5 h-5') + ' Masuk</button>' +
      '<p class="text-center text-sm text-muted">Belum punya akun? <button type="button" class="font-semibold text-heading underline" data-act="daftar">Daftar peserta</button></p></form>';
  }
  function submitVerif(form, after) {
    var d = U.formData(form), btn = $('[type=submit]', form), er = $('[data-err]', form); er.classList.add('hidden');
    if (d.nama.trim().length < 3) return U.fieldErr(form, 'nama', 'Isi nama lengkap Anda.');
    if (!U.validHp(d.hp)) return U.fieldErr(form, 'hp', 'Nomor HP tidak valid.');
    U.busy(btn, true, 'Memeriksa…');
    api('verifikasi', { nama: d.nama, hp: d.hp }, { role: 'peserta', noToken: true }).then(function (r) {
      U.busy(btn, false);
      if (!r.success) { er.textContent = r.message; er.classList.remove('hidden'); return; }
      setSession(r.data); U.toast('Selamat datang, ' + r.data.profil.nama + '!', 'ok'); App.renderDash(); prefetchDash(true);
      if (after) after();
    });
  }
  function openVerif(after) {
    var m = U.modal(U.modalHead('Verifikasi Peserta', 'Masukkan nama & nomor HP yang Anda daftarkan.') + '<div class="px-6 pb-6">' + verifFormHtml() + '</div>', { label: 'Verifikasi' });
    $('form', m.el).addEventListener('submit', function (e) { e.preventDefault(); submitVerif(e.target, function () { m.close(); if (after) after(); }); });
  }

  // ---------- Data Diri ----------
  function openDataDiri() {
    var me = App.me(); if (!me) return openVerif(openDataDiri);
    var m = U.modal(U.modalHead('Data Diri', 'Hanya Anda dan pengurus yang dapat melihat data ini.') +
      '<form class="px-6 pb-6 space-y-4" novalidate><div class="flex items-center gap-4">' + U.avatar(me.nama, me.foto, 'w-16 h-16 text-xl') + '<div class="min-w-0"><p class="font-semibold truncate">' + esc(me.nama) + '</p><p class="text-sm text-muted">' + esc(me.hp) + ' · terdaftar ' + U.fmtTgl(me.daftar) + '</p></div></div>' +
      field('f-nama', 'Nama lengkap', NAMA_IN(me.nama)) + field('f-alamat', 'Alamat', '<textarea class="field" id="f-alamat" name="alamat" rows="2" maxlength="250">' + esc(me.alamat || '') + '</textarea>') +
      field('f-foto', 'Ganti foto', '<input class="field !pt-2.5" id="f-foto" type="file" accept="image/*">') +
      '<p class="hint">Nomor HP tidak dapat diubah sendiri. Hubungi pengurus bila perlu mengganti nomor.</p>' +
      '<div class="flex gap-3 justify-between pt-2"><button type="button" class="btn btn-danger btn-sm" data-close data-act="logout-peserta">' + ic('log-out', 'w-4 h-4') + ' Keluar</button><div class="flex gap-3"><button type="button" class="btn btn-ghost" data-close>Tutup</button><button class="btn btn-primary" type="submit">Simpan</button></div></div></form>', { label: 'Data diri' });
    var form = $('form', m.el);
    form.addEventListener('submit', function (e) {
      e.preventDefault(); var d = U.formData(form), btn = $('[type=submit]', form);
      if (d.nama.trim().length < 3) return U.fieldErr(form, 'nama', 'Nama minimal 3 karakter.');
      U.busy(btn, true, 'Menyimpan…');
      U.imageToB64($('#f-foto', form).files[0], 640).catch(function () { return null; }).then(function (foto) {
        var p = { nama: d.nama, alamat: d.alamat }; if (foto) p.foto = foto;
        return api('dataDiriSimpan', p, { role: 'peserta' });
      }).then(function (r) {
        U.busy(btn, false); if (!r.success) return U.toast(r.message, 'error');
        var s = Session.get('peserta'); s.profil = r.data; Session.set('peserta', s); App.saveIdentity(r.data.nama, r.data.hp);
        U.toast('Data diri diperbarui', 'ok'); m.close(); App.renderDash();
      });
    });
  }

  function logout() {
    var s = Session.get('peserta'); if (s) { api('logout', {}, { role: 'peserta', retries: 0 }); SWR.drop('dash:' + s.profil.id, 'd'); }
    Session.clear('peserta'); dash = null; App.renderDash(); U.toast('Anda telah keluar.');
  }

  // ---------- Formulir dinamis ----------
  function fieldInput(f) {
    var id = 'q-' + f.id, name = 'f_' + f.id, req = f.required ? ' required' : '', lab = esc(f.label) + (f.required ? ' <span class="text-danger" aria-hidden="true">*</span>' : '');
    var pill = function (type, val, label, nm) { return '<label class="cursor-pointer"><input class="peer sr-only" type="' + type + '" name="' + nm + '" value="' + esc(val) + '"' + req + '><span class="chip peer-checked:bg-brand peer-checked:text-on-brand peer-checked:border-brand peer-focus-visible:ring-4 peer-focus-visible:ring-gold/50">' + esc(label) + '</span></label>'; };
    var body;
    if (f.type === 'textarea') body = '<textarea class="field" id="' + id + '" name="' + name + '" rows="3" maxlength="2000"' + req + '></textarea>';
    else if (f.type === 'number') body = '<input class="field" id="' + id + '" name="' + name + '" type="number" inputmode="decimal"' + req + '>';
    else if (f.type === 'date') body = '<input class="field" id="' + id + '" name="' + name + '" type="date"' + req + '>';
    else if (f.type === 'select') body = '<select class="field" id="' + id + '" name="' + name + '"' + req + '><option value="">Pilih…</option>' + (f.options || []).map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select>';
    else if (f.type === 'radio') body = '<div class="flex flex-wrap gap-2" role="radiogroup" aria-label="' + esc(f.label) + '">' + (f.options || []).map(function (o) { return pill('radio', o, o, name); }).join('') + '</div>';
    else if (f.type === 'checkbox') body = '<div class="flex flex-wrap gap-2">' + (f.options || []).map(function (o) { return pill('checkbox', o, o, name + '[]').replace(req, ''); }).join('') + '</div>';
    else if (f.type === 'rating') body = '<div class="flex gap-2" role="radiogroup" aria-label="' + esc(f.label) + ' (1 sampai 5)">' + [1, 2, 3, 4, 5].map(function (n) { return pill('radio', n, String(n), name); }).join('') + '</div>';
    else if (f.type === 'yesno') body = '<div class="flex gap-2">' + pill('radio', 'Ya', 'Ya', name) + pill('radio', 'Tidak', 'Tidak', name) + '</div>';
    else body = '<input class="field" id="' + id + '" name="' + name + '" type="text" maxlength="300"' + req + '>';
    return '<div><label class="label" ' + (/^(radio|checkbox|rating|yesno)$/.test(f.type) ? '' : 'for="' + id + '"') + '>' + lab + '</label>' + body + '</div>';
  }
  function openForm(id) {
    var me = App.me(); if (!me) return openVerif(function () { openForm(id); });
    var f = (B().form || []).filter(function (x) { return x.id === id; })[0]; if (!f) return U.toast('Formulir tidak tersedia.', 'error');
    var m = U.modal(U.modalHead(f.judul, f.deskripsi) + '<form class="px-6 pb-6 space-y-5" novalidate>' + f.fields.map(fieldInput).join('') +
      '<div class="flex gap-3 justify-end pt-2"><button type="button" class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" type="submit">Kirim</button></div></form>', { label: f.judul, wide: true });
    var form = $('form', m.el);
    form.addEventListener('submit', function (e) {
      e.preventDefault(); var d = U.formData(form), jaw = {}, bad = null;
      f.fields.forEach(function (q) {
        var v = d['f_' + q.id]; if (Array.isArray(v) && !v.length) v = undefined;
        if (v === '' || v == null) { if (q.required && !bad) bad = q; return; } jaw[q.id] = v;
      });
      if (bad) return U.toast('Mohon lengkapi: ' + bad.label, 'error');
      var btn = $('[type=submit]', form); U.busy(btn, true, 'Mengirim…');
      api('formSubmit', { formId: id, jawaban: jaw }, { role: 'peserta' }).then(function (r) {
        U.busy(btn, false); if (!r.success) return U.toast(r.message, 'error');
        m.el.innerHTML = successView('circle-check', 'Terima kasih!', 'Jawaban Anda sudah kami terima.', '<button class="btn btn-primary" data-close>Selesai</button>');
        loadDash(true);
      });
    });
  }

  // ---------- Dashboard ----------
  function loadDash(force) {
    var me = App.me(); if (!me) return Promise.resolve();
    return SWR.load('dash:' + me.id, 'd', function () { return api('dashboard', {}, { role: 'peserta' }); }, {
      ttl: 20000, force: force, onData: function (d) { dash = d; App.renderDash(); },
      onError: function (r) { if (r && r.code !== 'AUTH') U.toast(r.message || 'Gagal memuat dashboard', 'error'); }
    });
  }
  function prefetchDash(force) { if (App.me()) loadDash(!!force); }
  App.prefetchDash = prefetchDash;
  App.enterDash = function () { App.renderDash(); if (App.me()) loadDash(false); };
  App.onPesertaOut = function () { dash = null; U.toast('Sesi berakhir. Silakan verifikasi ulang.', 'error'); App.renderDash(); };

  function statCard(icon, label, value, sub) {
    return '<div class="card p-6"><div class="w-11 h-11 rounded-2xl bg-gold-pale text-gold-ink flex items-center justify-center">' + ic(icon, 'w-5 h-5') + '</div><p class="font-display text-4xl font-semibold mt-4 text-heading">' + value + '</p><p class="font-medium mt-1">' + esc(label) + '</p>' + (sub ? '<p class="text-sm text-muted">' + esc(sub) + '</p>' : '') + '</div>';
  }
  function programCard(p) {
    var pct = p.min ? Math.min(100, Math.round(p.hadir / p.min * 100)) : 0;
    return '<div class="card p-6"><div class="flex items-start justify-between gap-3"><div class="flex items-center gap-3 min-w-0"><div class="w-11 h-11 rounded-2xl gold-banner flex items-center justify-center shrink-0">' + ic('trophy', 'w-5 h-5') + '</div><div class="min-w-0"><p class="font-display text-lg font-semibold truncate">' + esc(p.nama) + '</p><p class="text-sm text-muted">Minimal hadir ' + p.min + '×</p></div></div>' +
      (p.layak ? '<span class="badge badge-ok">' + ic('circle-check', 'w-4 h-4') + ' Layak undian</span>' : '<span class="badge badge-warn">Kurang ' + p.sisa + '×</span>') + '</div>' +
      '<div class="mt-5"><div class="flex justify-between text-sm mb-2"><span class="text-muted">Progres Anda</span><span class="font-semibold">' + p.hadir + ' / ' + p.min + '</span></div><div class="h-3 rounded-full bg-line overflow-hidden" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100" aria-label="Progres ' + esc(p.nama) + '"><div class="h-full rounded-full" style="width:' + pct + '%;background:linear-gradient(90deg,#CDA434,#ffd25e);transition:width .5s ease"></div></div></div></div>';
  }
  function guestView(b) {
    var st = b.stat, aktif = b.program.filter(function (g) { return g.status === 'Aktif'; });
    return '<header class="max-w-3xl"><p class="eyebrow flex items-center gap-2">' + U.star('w-3.5 h-3.5') + 'Dashboard</p><h1 id="h-dash" class="h-section mt-2">Pantau Progres Anda</h1><p class="text-lg text-muted mt-4">Masuk dengan nama & nomor HP untuk melihat riwayat kehadiran, peringkat, dan kelayakan Grand Prize.</p></header>' +
      '<div class="grid lg:grid-cols-5 gap-6 mt-10"><div class="card p-8 lg:col-span-2 self-start"><div class="w-12 h-12 rounded-2xl bg-brand text-on-brand flex items-center justify-center">' + ic('user-round', 'w-6 h-6') + '</div><h2 class="text-2xl font-semibold mt-4 mb-5">Masuk Peserta</h2>' + verifFormHtml() + '</div>' +
      '<div class="lg:col-span-3 space-y-6"><div class="grid grid-cols-3 gap-4">' + statCard('users', 'Peserta', U.num(st.peserta)) + statCard('calendar-days', 'Kegiatan', U.num(st.kegiatan)) + statCard('trending-up', 'Rata-rata hadir', st.rata + '%') + '</div>' +
      (aktif.length ? aktif.map(function (g) { return '<div class="card p-6 flex items-center gap-4"><div class="w-12 h-12 rounded-2xl gold-banner flex items-center justify-center shrink-0">' + ic('gift', 'w-6 h-6') + '</div><div class="min-w-0"><p class="font-display text-lg font-semibold">' + esc(g.nama) + '</p><p class="text-sm text-muted">Hadir minimal ' + g.min + '× · ' + g.pemenang + ' pemenang</p></div></div>'; }).join('') : '') +
      (b.pemenang.length ? '<div class="card p-6"><h3 class="font-display text-lg font-semibold flex items-center gap-2">' + ic('party-popper', 'w-5 h-5 text-gold-ink') + 'Pemenang Grand Prize</h3><ul class="mt-3 divide-y divide-line">' + b.pemenang.map(function (w) { var g = b.program.filter(function (x) { return x.id === w.programId; })[0]; return '<li class="py-2.5 flex justify-between gap-3 text-sm"><span class="font-medium">' + esc(w.nama) + '</span><span class="text-muted">' + esc(g ? g.nama : '') + '</span></li>'; }).join('') + '</ul></div>' : '') + '</div></div>';
  }
  function memberView(b, me, d) {
    var t = d ? d.hadir : null;
    var head = '<div class="card p-6 sm:p-8 flex flex-wrap items-center justify-between gap-5 relative overflow-hidden"><div class="star-pattern absolute inset-0 opacity-40" aria-hidden="true"></div><div class="relative flex items-center gap-4 min-w-0">' + U.avatar(me.nama, me.foto, 'w-16 h-16 text-xl ring-4 ring-gold-pale') +
      '<div class="min-w-0"><p class="text-sm text-muted">Assalamu\'alaikum,</p><h1 id="h-dash" class="font-display text-2xl sm:text-3xl font-semibold truncate">' + esc(me.nama) + '</h1>' + (d && d.peringkat ? '<span class="badge mt-1">' + ic('award', 'w-4 h-4') + ' Peringkat #' + d.peringkat + ' dari ' + d.totalPeserta + '</span>' : '') + '</div></div>' +
      '<div class="relative flex gap-2"><button class="btn btn-gold btn-sm" data-act="data-diri">' + ic('user-round', 'w-4 h-4') + ' Data Diri</button><button class="btn btn-ghost btn-sm" data-act="logout-peserta">' + ic('log-out', 'w-4 h-4') + ' Keluar</button></div></div>';
    if (!d) return head + '<div class="grid md:grid-cols-3 gap-6 mt-6">' + App.sk(3, 150) + '</div><div class="mt-6">' + App.sk(1, 260) + '</div>';
    var forms = (d.formBelum || []).map(function (id) { return (b.form || []).filter(function (f) { return f.id === id; })[0]; }).filter(Boolean);
    var html = head + '<div class="grid sm:grid-cols-3 gap-6 mt-6">' + statCard('circle-check', 'Total kehadiran', d.hadir.length, 'dari ' + d.totalKegiatan + ' kegiatan') +
      '<div class="card p-6 flex items-center gap-5"><div class="ring-progress w-24 h-24 rounded-full p-2 shrink-0" style="--p:' + d.persen + '"><div class="w-full h-full rounded-full bg-surface flex items-center justify-center font-display text-xl font-semibold">' + d.persen + '%</div></div><div><p class="font-medium">Tingkat kehadiran</p><p class="text-sm text-muted">Terhadap seluruh kegiatan</p></div></div>' +
      statCard('award', 'Peringkat', d.peringkat ? '#' + d.peringkat : '–', 'di antara ' + d.totalPeserta + ' peserta') + '</div>';
    if (d.program.length) html += '<section class="mt-12" aria-labelledby="h-gp2">' + App.sectionHead('Hadiah', 'Progres Grand Prize', 'h-gp2') + '<div class="grid md:grid-cols-2 gap-6">' + d.program.map(programCard).join('') + '</div></section>';
    if (forms.length) html += '<section class="mt-12" aria-labelledby="h-fm">' + App.sectionHead('Perlu diisi', 'Formulir untuk Anda', 'h-fm') + '<div class="grid md:grid-cols-2 gap-4">' + forms.map(function (f) { return '<div class="card p-5 flex items-center gap-4"><div class="w-11 h-11 rounded-2xl bg-gold-pale text-gold-ink flex items-center justify-center shrink-0">' + ic('clipboard-list', 'w-5 h-5') + '</div><div class="min-w-0 flex-1"><p class="font-semibold truncate">' + esc(f.judul) + '</p><p class="text-sm text-muted line-clamp-2">' + esc(f.deskripsi) + '</p></div><button class="btn btn-primary btn-sm" data-act="form-isi" data-id="' + esc(f.id) + '">Isi</button></div>'; }).join('') + '</div></section>';
    html += '<div class="grid lg:grid-cols-2 gap-6 mt-12"><section aria-labelledby="h-rw"><h2 id="h-rw" class="font-display text-2xl font-semibold mb-4">Riwayat Kehadiran</h2><div class="card divide-y divide-line">' +
      (d.hadir.length ? d.hadir.slice(0, 12).map(function (h) { return '<div class="p-4 flex items-center gap-3"><span class="w-9 h-9 rounded-full bg-ok-soft text-ok flex items-center justify-center shrink-0">' + ic('check', 'w-4 h-4') + '</span><div class="min-w-0 flex-1"><p class="font-medium truncate">' + esc(h.judul) + '</p><p class="text-xs text-muted">' + U.fmtWaktu(h.waktu) + '</p></div></div>'; }).join('') : '<p class="p-8 text-center text-muted text-sm">Belum ada kehadiran. Isi kehadiran saat absensi dibuka.</p>') + '</div></section>' +
      '<section aria-labelledby="h-rk"><h2 id="h-rk" class="font-display text-2xl font-semibold mb-4">Papan Peringkat</h2><ol class="card divide-y divide-line">' +
      d.ranking.map(function (r) { return '<li class="p-4 flex items-center gap-3 ' + (r.saya ? 'bg-gold-pale/60' : '') + '"><span class="w-8 text-center font-display text-lg font-semibold ' + (r.rank <= 3 ? 'text-gold-ink' : 'text-muted') + '">' + r.rank + '</span>' + U.avatar(r.nama, r.foto, 'w-9 h-9 text-xs') + '<span class="flex-1 min-w-0 truncate font-medium">' + esc(r.nama) + (r.saya ? ' <span class="badge ml-1">Anda</span>' : '') + '</span><span class="text-sm font-semibold">' + r.jumlah + '×</span></li>'; }).join('') + '</ol></section></div>';
    return html;
  }
  App.renderDash = function () {
    var el = $('#dash-body'), b = B(); if (!el) return;
    if (!b) { el.innerHTML = '<div class="grid md:grid-cols-3 gap-6">' + App.sk(3, 180) + '</div>'; return; }
    var me = App.me();
    if (!me) { dash = null; el.innerHTML = guestView(b); return; }
    el.innerHTML = memberView(b, me, dash);
  };
  document.addEventListener('submit', function (e) { if (e.target.matches && e.target.matches('#dash-body form[data-form=verif]')) { e.preventDefault(); submitVerif(e.target); } });

  window.Peserta = { act: function (a, id) {
    if (a === 'daftar') return openDaftar();
    if (a === 'absen') return openAbsen(id);
    if (a === 'data-diri') return openDataDiri();
    if (a === 'verifikasi') return openVerif();
    if (a === 'logout-peserta') return logout();
    if (a === 'form-isi') return openForm(id);
  } };
  // render awal bila boot sudah ada
  if (App.S.boot) App.renderDash();
})();
