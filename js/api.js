/**
 * api.js — Klien REST ke Google Apps Script + lapisan "instan" (SWR cache, waktu server, sesi).
 * Pola gas-instant-ux-pro: tampilkan cache seketika → segarkan di latar → perbarui hanya bila hash berubah.
 */
(function () {
  'use strict';
  var C = window.APP_CONFIG, LS = window.localStorage;
  function lsGet(k) { try { return LS.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { LS.setItem(k, v); } catch (e) { /* penuh / diblokir */ } }
  function lsDel(k) { try { LS.removeItem(k); } catch (e) {} }
  function ssGet(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) {} }
  function ssDel(k) { try { window.sessionStorage.removeItem(k); } catch (e) {} }

  // ---------- Perf: ukur waktu klien + server ----------
  var Perf = { log: [], mark: function (name, client, server) { this.log.push({ aksi: name, klien_ms: client, server_ms: server == null ? '' : server }); if (this.log.length > 60) this.log.shift(); }, table: function () { console.table(this.log); } };

  // ---------- Identitas perangkat & sesi ----------
  var device = lsGet('sim:dev');
  if (!device) { device = 'd' + Math.random().toString(36).slice(2, 12); lsSet('sim:dev', device); }

  var Session = {
    get: function (role) {
      var raw = role === 'admin' ? ssGet('sim:s:admin') : lsGet('sim:s:peserta');
      if (!raw) return null;
      try { var s = JSON.parse(raw); if (s.exp && s.exp < Date.now()) { this.clear(role); return null; } return s; } catch (e) { return null; }
    },
    set: function (role, s) { var raw = JSON.stringify(s); if (role === 'admin') ssSet('sim:s:admin', raw); else lsSet('sim:s:peserta', raw); },
    clear: function (role) { if (role === 'admin') ssDel('sim:s:admin'); else lsDel('sim:s:peserta'); },
    token: function (role) { var s = this.get(role); return s ? s.token : ''; }
  };

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function waitOnline() {
    if (navigator.onLine !== false) return Promise.resolve();
    return new Promise(function (res) { window.addEventListener('online', function f() { window.removeEventListener('online', f); res(); }); });
  }
  function configured() { return C.GAS_URL && /^https:\/\/script\.google(usercontent)?\.com\//.test(C.GAS_URL); }

  /**
   * api(aksi, data, {role, retries, timeout, quiet})
   * role: 'peserta' | 'admin' | undefined — menentukan token yang dikirim.
   * Mengembalikan objek { success, data, message, ms } dan TIDAK melempar untuk galat server (cukup periksa success).
   */
  function api(action, data, opt) {
    opt = opt || {};
    if (!configured()) return Promise.resolve({ success: false, message: 'Alamat server (GAS_URL) belum diatur di js/config.js.', code: 'CONFIG' });
    var role = opt.role || (action.indexOf('admin') === 0 || opt.admin ? 'admin' : 'peserta');
    var token = opt.noToken ? '' : (Session.token(role) || (role === 'peserta' ? Session.token('admin') : ''));
    var body = JSON.stringify({ action: action, data: data || {}, token: token, device: device, reqId: opt.reqId || uid() });
    var retries = opt.retries == null ? 2 : opt.retries, t0 = performance.now();

    function attempt(n) {
      return waitOnline().then(function () {
        var ctrl = new AbortController(), to = setTimeout(function () { ctrl.abort(); }, opt.timeout || C.TIMEOUT);
        return fetch(C.GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body, redirect: 'follow', signal: ctrl.signal, credentials: 'omit' })
          .then(function (r) { clearTimeout(to); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
          .catch(function (err) { clearTimeout(to); throw err; });
      }).then(function (res) {
        var ms = Math.round(performance.now() - t0);
        Perf.mark(action, ms, res.ms);
        if (res.code === 'AUTH') { var rr = role; Session.clear(rr); window.dispatchEvent(new CustomEvent('sim:auth-expired', { detail: { role: rr } })); }
        return res;
      }).catch(function (err) {
        if (n < retries) return sleep(500 * Math.pow(2, n)).then(function () { return attempt(n + 1); });   // body sama (reqId sama) → aman diulang
        return { success: false, message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.', code: 'NET' };
      });
    }
    return attempt(0);
  }

  // ---------- SWR: stale-while-revalidate dengan cache per-namespace ----------
  function ck(ns, key) { return 'sim:v' + C.SCHEMA_V + ':' + ns + ':' + key; }
  var SWR = {
    read: function (ns, key) { var raw = lsGet(ck(ns, key)); if (!raw) return null; try { return JSON.parse(raw); } catch (e) { return null; } },
    write: function (ns, key, d) { lsSet(ck(ns, key), JSON.stringify({ t: Date.now(), d: d })); },
    drop: function (ns, key) { lsDel(ck(ns, key)); },
    /**
     * load(ns,key,fetcher,{ttl,force,onData}) — onData dipanggil segera dgn cache (jika ada), lalu lagi bila data baru berbeda.
     * fetcher harus mengembalikan Promise<{success,data}>.
     */
    load: function (ns, key, fetcher, o) {
      o = o || {};
      var hit = this.read(ns, key), fresh = hit && (Date.now() - hit.t) < (o.ttl || C.TTL_BOOT) && !o.force;
      if (hit && o.onData) o.onData(hit.d, { cached: true, fresh: fresh });
      if (fresh) return Promise.resolve(hit.d);
      return fetcher().then(function (res) {
        if (!res || !res.success) { if (o.onError) o.onError(res); return hit ? hit.d : null; }
        var changed = !hit || !hit.d || res.data.v !== hit.d.v || res.data.v == null;
        SWR.write(ns, key, res.data);
        if (o.onData && changed) o.onData(res.data, { cached: false, fresh: true });
        else if (hit) SWR.write(ns, key, res.data);
        return res.data;
      });
    }
  };

  // ---------- Sambungan awal (hangatkan GAS agar tidak cold-start saat aksi pertama) ----------
  function warmUp() { if (configured()) { try { fetch(C.GAS_URL + '?ping=1', { mode: 'no-cors', credentials: 'omit' }).catch(function () {}); } catch (e) {} } }

  window.Perf = Perf; window.Session = Session; window.SWR = SWR; window.api = api; window.warmUp = warmUp;
  window.apiConfigured = configured; window.lsGet = lsGet; window.lsSet = lsSet; window.lsDel = lsDel; window.uid = uid; window.deviceId = device;
})();
