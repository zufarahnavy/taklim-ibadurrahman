/**
 * KONFIGURASI — satu-satunya file yang perlu Anda ubah setelah deploy Google Apps Script.
 * Tempel URL Web App (berakhiran /exec) ke GAS_URL. Jangan taruh rahasia apa pun di file ini.
 */
window.APP_CONFIG = {
  GAS_URL: 'PASTE_URL_WEB_APP_ANDA_DI_SINI',
  APP_NAME: 'Majelis Taklim Ibadurrahman',
  SCHEMA_V: 1,            // naikkan angka ini bila struktur data berubah (cache lama otomatis dibuang)
  TTL_BOOT: 45 * 1000,    // data dianggap "segar" selama 45 detik; setelah itu diperbarui diam-diam
  TTL_ADMIN: 20 * 1000,
  POLL_ADMIN: 30 * 1000,  // polling ringan khusus admin saat tab terlihat
  TIMEOUT: 25 * 1000
};
