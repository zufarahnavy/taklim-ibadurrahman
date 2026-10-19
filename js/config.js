/**
 * KONFIGURASI — satu-satunya file yang perlu Anda ubah setelah deploy Google Apps Script.
 * Tempel URL Web App (berakhiran /exec) ke GAS_URL. Jangan taruh rahasia apa pun di file ini.
 */
window.APP_CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbySJaDP1hp-TFHTXXn7-qKcmzlBY9ox87rmD_XUtetOvx6WgjzEeTaeb9Ug-yJyQjvOvA/exec',
  APP_NAME: 'Majelis Taklim Ibadurrahman',
  SCHEMA_V: 1,            // naikkan angka ini bila struktur data berubah (cache lama otomatis dibuang)
  TTL_BOOT: 45 * 1000,    // data dianggap "segar" selama 45 detik; setelah itu diperbarui diam-diam
  TTL_ADMIN: 20 * 1000,
  POLL_ADMIN: 30 * 1000,  // polling ringan khusus admin saat tab terlihat
  TIMEOUT: 25 * 1000
};
