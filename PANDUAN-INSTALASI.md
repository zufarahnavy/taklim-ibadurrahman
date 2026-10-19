# Panduan Instalasi — SIM Ibadurrahman

> ## 🔄 SUDAH PERNAH INSTALL? Baca bagian ini dulu (Pembaruan Revisi 2)
>
> Revisi ini menambah: desain beranda baru, banner foto berputar, hero kegiatan berposter, halaman **Galeri**, menu admin **Logo**, **Banner**, **Galeri**, dan **checklist** peserta.
> Karena ada fitur baru di backend, lakukan **kedua** langkah ini (urutannya penting):
>
> **1. Perbarui backend (±3 menit)**
> 1. Buka proyek Apps Script Anda → ganti isi file **Db.gs, Kode.gs, Layanan.gs, Admin.gs, Migrasi.gs, Dummy.gs** dengan versi baru (file `.gs` dikirim terpisah). `appsscript.json` tidak berubah.
> 2. Pilih fungsi **`perbaruiStruktur`** → **Run**. Ini membuat sheet `Banner` & `Galeri`, kolom `Kode` di sheet Peserta, folder Drive `Logo`, `Banner`, `Galeri`, serta **memberi ID Peserta (MTI-2026-001, dst.) ke semua peserta lama** berurutan sesuai tanggal daftar (aman dijalankan berulang; data lama tidak disentuh). Izinkan akses bila diminta.
> 3. **Deploy → Manage deployments → ✏️ Edit → Version: _New version_ → Deploy.**
>    ⚠️ Jangan pilih "New deployment" — URL `/exec` akan berubah dan Anda harus mengganti `GAS_URL` lagi.
>
> **2. Perbarui frontend**
> 1. Ekstrak ZIP, lalu **salin semua file ke folder repo Anda KECUALI `js/config.js`** (file itu sudah berisi URL Anda; di ZIP isinya masih placeholder).
> 2. Di terminal, dari folder repo: `git add . && git commit -m "Revisi 2: desain baru, banner, galeri" && git push`.
> 3. Tunggu ±1 menit, buka situs dengan **Ctrl+Shift+R** (atau jendela penyamaran).
>
> Setelah itu: **Panel Pengurus → Logo & Identitas / Banner Beranda / Galeri Kegiatan**.
>
> ---
> ### Cara memakai fitur baru
- **Grand Prize hanya untuk kegiatan rutin:** isi kolom *Kategori / jenis kegiatan* pada kegiatan rutin dengan nama yang sama (mis. `Majelis Rutin`). Pada Panel → *Grand Prize* → tambah/ubah program, centang **Kegiatan rutin yang dihitung**. Hanya kehadiran pada kategori terpilih yang dihitung untuk syarat undian; kegiatan jenis lain (tabligh, daurah, dll.) tidak berpengaruh. Progres peserta di Dashboard ikut menampilkan "Hadir N× di <kategori>". Program lama tanpa kategori tetap menghitung semua kegiatan sampai Anda mengubahnya. Kolom baru `Kategori_Syarat` dibuat otomatis oleh `perbaruiStruktur`.
- **ID Peserta:** setiap peserta mendapat ID unik berformat `MTI-TAHUN-NOMOR` (mis. `MTI-2026-001`), tampil setelah mendaftar, di Dashboard (bisa disalin), dan di tabel Peserta admin (kolom *ID*, bisa dicari). Peserta **masuk & mengisi kehadiran cukup dengan ID atau nomor HP** yang didaftarkan (penulisan ID longgar: `mti 2026 1` tetap dikenali). Catatan keamanan: login memakai nomor HP saja tergolong lemah; percobaan beruntun dibatasi otomatis (rate limit). Peserta baru dari admin/impor/dummy otomatis mendapat ID.
> - **Logo:** Panel → *Logo & Identitas* → unggah PNG persegi (latar transparan lebih baik) → *Simpan logo*. Muncul di header, footer, panel admin, dan ikon tab.
> - **Banner beranda:** Panel → *Banner Beranda* → *Unggah banyak foto* (maks. 10 sekali unggah) atau *Tambah banner*. Urutkan dengan tombol panah, sembunyikan sementara dengan *Sembunyikan*, hapus banyak sekaligus dengan checklist. Gunakan foto lanskap 16:9.
> - **Poster kegiatan:** isi kolom *Poster* saat menambah/mengubah kegiatan. Poster tampil utuh di kartu kegiatan, di *hero* kegiatan pada Beranda & halaman Event, dan bisa diperbesar.
> - **Galeri:** Panel → *Galeri Kegiatan* → *Unggah foto* → pilih kegiatan → pilih banyak foto sekaligus (maks. 20). Ubah keterangan lewat ikon pensil; hapus banyak dengan checklist.
> - **Checklist peserta:** Panel → *Peserta* → centang baris (atau centang kotak di kepala tabel untuk semua) → *Aktifkan / Nonaktifkan / Hapus*. **Tambah banyak:** tempel daftar "Nama, HP, Alamat", *Periksa daftar*, centang yang ingin ditambahkan.
> - Bila **tidak ada banner aktif**, beranda memakai latar zamrud polos dengan motif lengkung (tetap rapi).
>
> ---


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
