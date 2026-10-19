# Panduan Instalasi — SIM Ibadurrahman

Aplikasi terdiri dari **dua bagian**:

| Bagian | Isi | Tempat |
|---|---|---|
| **Frontend** | `index.html`, `css/`, `js/`, `assets/` (folder ZIP ini) | GitHub Pages |
| **Backend** | 6 file `.gs` + `appsscript.json` (dikirim terpisah, **tidak ada di ZIP**) | Google Apps Script |

Urutan: **A. Backend → B. Hubungkan → C. Frontend ke GitHub Pages → D. Uji**.

---

## A. Backend (Google Apps Script)

1. Buka <https://script.google.com> → **Proyek baru** → beri nama `SIM Ibadurrahman`.
2. Buat file sesuai nama (tombol **+** di samping *Files*) lalu tempel isi masing-masing:
   `Kode.gs` · `Db.gs` · `Layanan.gs` · `Admin.gs` · `Dummy.gs` · `Migrasi.gs`
   (file bawaan `Code.gs` boleh dihapus/diganti nama menjadi `Kode.gs`).
3. **Project Settings (ikon roda gigi)** → centang **Show "appsscript.json" manifest file in editor**, lalu ganti isi `appsscript.json` dengan file yang dikirim.
4. Pilih fungsi **`setupAppEnvironment`** → **Run** → setujui izin (Advanced → Go to … → Allow).
   Ini otomatis membuat folder Drive `SIM_Ibadurrahman`, spreadsheet database + 13 sheet, data dummy, dan trigger. **Jalankan sekali saja.**
5. **Project Settings → Script Properties → Add script property** (isi manual, jangan ditulis di kode):

   | Property | Nilai |
   |---|---|
   | `SUPERADMIN_EMAILS` | email Google Superadmin, pisahkan dengan koma |
   | `OAUTH_CLIENT_ID` | Client ID dari langkah B.1 |
   | `EMERGENCY_ENABLED` | `false` (ubah `true` hanya bila butuh jalur darurat) |

   `SESSION_SECRET`, `SPREADSHEET_ID`, folder Drive dll. sudah terisi otomatis oleh langkah 4.
6. (Opsional) **Passphrase darurat** — tambah property sementara `TEMP_EMERGENCY_PASS` (≥16 karakter), jalankan fungsi **`setEmergencyPassphrase`** (properti sementara otomatis terhapus, yang tersimpan hanya hash+salt), lalu set `EMERGENCY_ENABLED=true`.
7. Jalankan **`healthCheck`** dan **`setupSecrets`** — log harus menampilkan ✅ untuk semua property wajib.

### Deploy sebagai Web App
**Deploy → New deployment → ⚙ Web app** → *Execute as*: **Me** · *Who has access*: **Anyone** → Deploy → salin **Web app URL** (berakhiran `/exec`).

> **Memperbarui kode nanti:** *Deploy → Manage deployments → ✏ Edit → Version: New version → Deploy*. URL `/exec` **tetap sama**. Jangan membuat *New deployment* lagi (URL berubah).

---

## B. Hubungkan

### B.1 Client ID Google (untuk login Superadmin)
1. <https://console.cloud.google.com> → buat/pilih project → **APIs & Services → OAuth consent screen** (External, isi nama aplikasi & email) → tambahkan akun Superadmin sebagai *Test user* bila status masih *Testing*.
2. **Credentials → Create credentials → OAuth client ID → Web application**.
3. **Authorized JavaScript origins**: `https://USERNAME.github.io` (ganti USERNAME; tanpa garis miring di akhir).
4. Salin **Client ID** → tempel ke Script Property `OAUTH_CLIENT_ID`.

> Catatan desain: login memakai *Google Identity Services* (ID token). Token diverifikasi **di server** (audience, issuer, kedaluwarsa, nonce sekali-pakai) dan email wajib ada di `SUPERADMIN_EMAILS`. Tidak ada secret di frontend.

### B.2 URL backend ke frontend
Buka `js/config.js` dan ganti:
```js
GAS_URL: 'https://script.google.com/macros/s/XXXXXXXX/exec',
```

---

## C. Frontend → GitHub Pages (lewat terminal)

1. Buat repository **kosong** di GitHub, mis. `sim-ibadurrahman` (Public).
2. Ekstrak ZIP. Folder hasil ekstrak (yang berisi `index.html` langsung di dalamnya) adalah **folder repo**.
3. Di terminal, **masuk ke folder yang berisi `index.html` tersebut**, lalu:

```bash
cd /lokasi/folder/yang-berisi-index.html     # <- PENTING: git init di folder INI
git init
git add .
git commit -m "SIM Ibadurrahman: rilis awal"
git branch -M main
git remote add origin https://github.com/USERNAME/sim-ibadurrahman.git
git push -u origin main
```
4. GitHub → repo → **Settings → Pages → Build and deployment**: *Source* **Deploy from a branch** · Branch **main** · Folder **/ (root)** → Save.
5. Tunggu 1–2 menit. Situs: `https://USERNAME.github.io/sim-ibadurrahman/`.
   (Jika memakai nama repo lain, origin untuk OAuth tetap `https://USERNAME.github.io`.)

**Memperbarui frontend:** ubah file → `git add . && git commit -m "pesan" && git push`.
Jangan memakai fitur *Upload files* di web GitHub.

---

## D. Uji cepat
1. Buka situs → beranda terisi (data dummy) → pindah menu terasa instan.
2. **Daftar** → **Isi Kehadiran** (kegiatan dengan absensi *Dibuka*) → **Dashboard**.
3. `…/#/admin` → **Masuk dengan Google** (atau akses darurat) → Ringkasan muncul.
4. Admin → **Pengaturan → Hapus Semua Data Dummy** bila sudah siap memakai data nyata (**Muat Ulang** untuk memulihkan).
5. Admin → **Backup & Restore → Buat backup**, aktifkan jadwal harian.

## Modul Migrasi & Backup
- **Migrasi Data**: tempel tautan Google Sheets lama → *Baca sumber* → pilih sheet & jenis (Peserta/Kegiatan/Kehadiran) → **Pindai** (simulasi, tidak menulis) → cek pemetaan kolom → **Jalankan impor**. Sumber hanya dibaca. Aman diulang (kunci unik: No. HP / Judul+Tanggal / Peserta+Kegiatan). Mode *Sinkron* memperbarui kolom yang boleh diubah.
- **Backup**: salinan spreadsheet di Drive › `SIM_Ibadurrahman/Backup`. **Pulihkan** membuat backup "pra-restore" otomatis dan meminta ketik `PULIHKAN`.

## Keamanan (ringkas)
- Rahasia hanya di *Script Properties*; tidak ada di kode, Sheets, atau repo.
- Sesi bertanda-tangan HMAC; admin 6 jam, darurat 30 menit; 5 percobaan gagal darurat → kunci 15 menit.
- Nomor HP & alamat tidak pernah dikirim ke publik; peserta hanya melihat data sendiri.
- Tulis berkas Drive dibatasi tipe (gambar/PDF/PPT) dan ukuran (3 MB).

## Pemecahan masalah
| Gejala | Solusi |
|---|---|
| Banner "Server belum terhubung" | Isi `GAS_URL` di `js/config.js` lalu push. |
| "Server belum dikonfigurasi" | Jalankan `setupAppEnvironment` / `setupSecrets`. |
| Tombol Google tidak muncul / error origin | Origin `https://USERNAME.github.io` belum ada di OAuth client; atau `OAUTH_CLIENT_ID` kosong. |
| "Akun Google ini tidak memiliki akses" | Email belum ada di `SUPERADMIN_EMAILS`. |
| Perubahan backend tidak terlihat | Deploy **New version** pada deployment yang sama. |
| Aksi pertama terasa ±2–4 detik | Cold-start Google; sudah dihangatkan otomatis saat halaman dibuka. |
