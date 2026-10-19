# SIM Ibadurrahman — Frontend

Situs statis (HTML + Tailwind ter-build + JavaScript vanilla) untuk Majelis Taklim Ibadurrahman, dihosting di GitHub Pages dan berbicara dengan backend Google Apps Script lewat REST JSON.

- Konfigurasi: `js/config.js` (isi `GAS_URL`).
- Instalasi lengkap: **PANDUAN-INSTALASI.md**.
- Kinerja: data tampil dari cache lokal seketika (SWR), disegarkan di latar; navigasi antar menu tanpa permintaan jaringan.
- Tanpa CDN: CSS ter-build, font & ikon lokal.
