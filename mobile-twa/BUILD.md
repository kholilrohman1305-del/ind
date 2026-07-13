# Ilhami Indonesia - Android App (TWA / Trusted Web Activity)

Aplikasi ini membungkus situs https://lightcoral-yak-645423.hostingersite.com/
menggunakan **TWA** — halaman dirender oleh **Chrome** di HP pengguna, bukan
WebView. Karena itu semua fitur Chrome ikut berfungsi, termasuk **login
biometrik (WebAuthn)**, tanpa bridge khusus.

## Syarat di HP pengguna

- Google Chrome terpasang (hampir semua HP Android sudah ada).

## Cara Build APK

Dari folder `mobile-twa/`:

```bash
gradle assembleDebug
```

APK ada di: `app/build/outputs/apk/debug/app-debug.apk`

(Atau buka folder ini di Android Studio → Build > Build APK(s).)

## Digital Asset Links (WAJIB agar full-screen)

Agar aplikasi tampil full-screen tanpa address bar Chrome, situs harus
menyajikan file verifikasi di:

```
https://lightcoral-yak-645423.hostingersite.com/.well-known/assetlinks.json
```

File sumbernya: `public/.well-known/assetlinks.json` (sudah dilayani oleh
route khusus di `src/app.js`). Isinya harus memuat **SHA-256 fingerprint
sertifikat penandatangan APK**.

Cek fingerprint keystore debug:

```bash
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android
```

> PENTING: jika APK di-build ulang di komputer lain, atau ditandatangani
> dengan keystore release baru, fingerprint berubah — perbarui
> `public/.well-known/assetlinks.json` lalu deploy ulang, jika tidak
> aplikasi akan menampilkan address bar Chrome di atas.

## Kustomisasi

- URL: `app/src/main/res/values/strings.xml` (`launch_url` + `asset_statements`)
  dan host di `AndroidManifest.xml`
- Nama aplikasi: `strings.xml` (`app_name`)
- Warna status bar: `colors.xml`
- Icon: folder `res/mipmap-*` dan `res/drawable`

## Beda dengan `mobile/` (WebView lama)

| | `mobile/` (WebView) | `mobile-twa/` (TWA) |
|---|---|---|
| Mesin render | Android WebView | Chrome |
| Biometrik | Bridge BiometricPrompt | WebAuthn Chrome langsung |
| Sesi login | Terpisah | Berbagi dengan Chrome |
| Ukuran APK | ±5,7 MB | ±0,5 MB |
