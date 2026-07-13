# Ilhami Indonesia - Android App (WebView)

## Prasyarat

1. **Android Studio** (versi terbaru) - [Download](https://developer.android.com/studio)
2. **JDK 17** (biasanya sudah termasuk di Android Studio)

## Cara Build APK

### Langkah 1: Buka Project
1. Buka **Android Studio**
2. Pilih **File > Open**
3. Arahkan ke folder `mobile/` ini
4. Tunggu Gradle sync selesai (pertama kali agak lama)

### Langkah 2: Build Debug APK
1. Pilih menu **Build > Build Bundle(s) / APK(s) > Build APK(s)**
2. Tunggu proses build selesai
3. APK ada di: `mobile/app/build/outputs/apk/debug/app-debug.apk`

### Langkah 3: Build Release APK (untuk distribusi)

#### Buat Keystore (sekali saja):
```bash
keytool -genkey -v -keystore ilhami-release.keystore -alias ilhami -keyalg RSA -keysize 2048 -validity 10000
```

#### Tambahkan di `local.properties`:
```
RELEASE_STORE_FILE=../ilhami-release.keystore
RELEASE_STORE_PASSWORD=password_anda
RELEASE_KEY_ALIAS=ilhami
RELEASE_KEY_PASSWORD=password_anda
```

#### Build:
1. **Build > Generate Signed Bundle / APK**
2. Pilih **APK**
3. Masukkan info keystore
4. Pilih **release** build type
5. APK ada di: `mobile/app/build/outputs/apk/release/app-release.apk`

## Fitur Aplikasi

- WebView full-screen (tanpa toolbar browser)
- Splash screen dengan logo
- Pull-to-refresh (tarik ke bawah untuk reload)
- Izin lokasi (GPS) - untuk fitur peta cabang
- Izin kamera - untuk upload foto
- Izin file picker - untuk upload dokumen
- Izin notifikasi (Android 13+)
- Back button navigation (mundur halaman, bukan langsung keluar)
- Dialog konfirmasi keluar
- Halaman error/offline dengan tombol retry
- Progress bar loading
- Cookie & session tersimpan
- External link dibuka di browser HP

## Kustomisasi

### Ganti URL
Edit `BASE_URL` di `app/src/main/java/com/ilhami/app/MainActivity.java`:
```java
private static final String BASE_URL = "https://domain-baru-anda.com/";
```

### Ganti Warna Tema
Edit `app/src/main/res/values/colors.xml`

### Ganti Icon Aplikasi
Gunakan [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html) untuk generate icon dari logo PNG, lalu replace file-file di folder `mipmap-*`.

### Ganti Nama Aplikasi
Edit `app/src/main/res/values/strings.xml`
