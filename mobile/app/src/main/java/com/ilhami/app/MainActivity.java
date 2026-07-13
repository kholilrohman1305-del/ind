package com.ilhami.app;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {

    private static final String BASE_URL = "https://lightcoral-yak-645423.hostingersite.com/";
    private static final int PERMISSION_REQUEST_CODE = 100;
    private static final int FILE_CHOOSER_REQUEST_CODE = 200;
    private static final int LOCATION_PERMISSION_CODE = 300;

    private WebView webView;
    private ProgressBar progressBar;
    private SwipeRefreshLayout swipeRefresh;
    private LinearLayout errorLayout;
    private Button retryButton;

    private ValueCallback<Uri[]> fileUploadCallback;
    private String cameraPhotoPath;

    // Pending geolocation callback
    private GeolocationPermissions.Callback geoCallback;
    private String geoOrigin;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webView);
        progressBar = findViewById(R.id.progressBar);
        swipeRefresh = findViewById(R.id.swipeRefresh);
        errorLayout = findViewById(R.id.errorLayout);
        retryButton = findViewById(R.id.retryButton);

        requestAllPermissions();
        setupWebView();

        swipeRefresh.setColorSchemeColors(
            ContextCompat.getColor(this, R.color.primary)
        );
        swipeRefresh.setOnRefreshListener(() -> webView.reload());

        // Only allow pull-to-refresh when WebView is scrolled to the very top
        webView.setOnScrollChangeListener((v, scrollX, scrollY, oldScrollX, oldScrollY) -> {
            swipeRefresh.setEnabled(scrollY == 0);
        });

        retryButton.setOnClickListener(v -> {
            errorLayout.setVisibility(View.GONE);
            webView.setVisibility(View.VISIBLE);
            webView.loadUrl(BASE_URL);
        });

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(BASE_URL);
        }
    }

    private void setupWebView() {
        WebSettings settings = webView.getSettings();

        // Enable JavaScript
        settings.setJavaScriptEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);

        // DOM Storage & Database
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);

        // Geolocation
        settings.setGeolocationEnabled(true);

        // File access
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        // Cache
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Responsive
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);

        // Mixed content (allow https page to load http resources if needed)
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        // Media autoplay
        settings.setMediaPlaybackRequiresUserGesture(false);

        // User agent - append app identifier
        String ua = settings.getUserAgentString();
        settings.setUserAgentString(ua + " IlhamiApp/1.0");

        // Bridge login biometrik untuk halaman web
        webView.addJavascriptInterface(new BiometricBridge(), "IlhamiBiometric");

        // Cookies
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        // WebViewClient - handle navigation
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();

                // Keep internal URLs in WebView
                if (url.contains("lightcoral-yak-645423.hostingersite.com")) {
                    return false;
                }

                // Open external links in browser
                if (url.startsWith("tel:") || url.startsWith("mailto:") ||
                    url.startsWith("whatsapp:") || url.startsWith("intent:")) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                    } catch (Exception ignored) {}
                    return true;
                }

                // Other external URLs -> open in browser
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                } catch (Exception ignored) {}
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                progressBar.setVisibility(View.VISIBLE);
                errorLayout.setVisibility(View.GONE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                progressBar.setVisibility(View.GONE);
                swipeRefresh.setRefreshing(false);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request.isForMainFrame()) {
                    webView.setVisibility(View.GONE);
                    errorLayout.setVisibility(View.VISIBLE);
                    progressBar.setVisibility(View.GONE);
                    swipeRefresh.setRefreshing(false);
                }
            }
        });

        // WebChromeClient - handle permissions, file upload, geolocation
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
                if (newProgress == 100) {
                    progressBar.setVisibility(View.GONE);
                }
            }

            // --- Geolocation Permission ---
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin,
                    GeolocationPermissions.Callback callback) {
                if (hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)) {
                    callback.invoke(origin, true, false);
                } else {
                    // Save callback and request permission
                    geoCallback = callback;
                    geoOrigin = origin;
                    ActivityCompat.requestPermissions(MainActivity.this,
                        new String[]{
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                        },
                        LOCATION_PERMISSION_CODE);
                }
            }

            // --- File Upload ---
            @Override
            public boolean onShowFileChooser(WebView webView,
                    ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams) {

                if (fileUploadCallback != null) {
                    fileUploadCallback.onReceiveValue(null);
                }
                fileUploadCallback = filePathCallback;

                // Check camera permission
                if (!hasPermission(Manifest.permission.CAMERA)) {
                    ActivityCompat.requestPermissions(MainActivity.this,
                        new String[]{Manifest.permission.CAMERA},
                        PERMISSION_REQUEST_CODE);
                    return true;
                }

                launchFileChooser(fileChooserParams);
                return true;
            }
        });
    }

    private void launchFileChooser(WebChromeClient.FileChooserParams params) {
        Intent takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        if (takePictureIntent.resolveActivity(getPackageManager()) != null) {
            File photoFile = null;
            try {
                photoFile = createImageFile();
            } catch (IOException ignored) {}

            if (photoFile != null) {
                cameraPhotoPath = "file:" + photoFile.getAbsolutePath();
                Uri photoUri = FileProvider.getUriForFile(this,
                    getPackageName() + ".fileprovider", photoFile);
                takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, photoUri);
            }
        }

        Intent contentIntent = new Intent(Intent.ACTION_GET_CONTENT);
        contentIntent.addCategory(Intent.CATEGORY_OPENABLE);

        // Determine accepted types
        String[] acceptTypes = params != null ? params.getAcceptTypes() : null;
        if (acceptTypes != null && acceptTypes.length > 0 && acceptTypes[0] != null && !acceptTypes[0].isEmpty()) {
            contentIntent.setType(acceptTypes[0]);
        } else {
            contentIntent.setType("*/*");
        }

        Intent chooserIntent = Intent.createChooser(contentIntent, "Pilih File");
        if (takePictureIntent.resolveActivity(getPackageManager()) != null) {
            chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{takePictureIntent});
        }

        try {
            startActivityForResult(chooserIntent, FILE_CHOOSER_REQUEST_CODE);
        } catch (Exception e) {
            if (fileUploadCallback != null) {
                fileUploadCallback.onReceiveValue(null);
                fileUploadCallback = null;
            }
        }
    }

    private File createImageFile() throws IOException {
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
        String imageFileName = "IMG_" + timeStamp + "_";
        File storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
        return File.createTempFile(imageFileName, ".jpg", storageDir);
    }

    // --- Permission Handling ---
    private void requestAllPermissions() {
        List<String> permissions = new ArrayList<>();

        if (!hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)) {
            permissions.add(Manifest.permission.ACCESS_FINE_LOCATION);
            permissions.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        }
        if (!hasPermission(Manifest.permission.CAMERA)) {
            permissions.add(Manifest.permission.CAMERA);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (!hasPermission(Manifest.permission.POST_NOTIFICATIONS)) {
                permissions.add(Manifest.permission.POST_NOTIFICATIONS);
            }
            if (!hasPermission(Manifest.permission.READ_MEDIA_IMAGES)) {
                permissions.add(Manifest.permission.READ_MEDIA_IMAGES);
            }
        } else if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.S_V2) {
            if (!hasPermission(Manifest.permission.READ_EXTERNAL_STORAGE)) {
                permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE);
            }
        }

        if (!permissions.isEmpty()) {
            ActivityCompat.requestPermissions(this,
                permissions.toArray(new String[0]),
                PERMISSION_REQUEST_CODE);
        }
    }

    private boolean hasPermission(String permission) {
        return ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                           @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == LOCATION_PERMISSION_CODE) {
            boolean granted = grantResults.length > 0 &&
                grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (geoCallback != null) {
                geoCallback.invoke(geoOrigin, granted, false);
                geoCallback = null;
                geoOrigin = null;
            }
        }

        if (requestCode == PERMISSION_REQUEST_CODE) {
            // If camera was just granted and we have a pending file upload, launch chooser
            for (int i = 0; i < permissions.length; i++) {
                if (permissions[i].equals(Manifest.permission.CAMERA) &&
                    grantResults[i] == PackageManager.PERMISSION_GRANTED &&
                    fileUploadCallback != null) {
                    launchFileChooser(null);
                    return;
                }
            }
        }
    }

    // --- File Upload Result ---
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (fileUploadCallback == null) return;

            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK) {
                if (data == null || data.getData() == null) {
                    // Camera photo
                    if (cameraPhotoPath != null) {
                        results = new Uri[]{Uri.parse(cameraPhotoPath)};
                    }
                } else {
                    // File from gallery/file picker
                    results = new Uri[]{data.getData()};
                }
            }

            fileUploadCallback.onReceiveValue(results);
            fileUploadCallback = null;
            cameraPhotoPath = null;
        }
    }

    // --- Biometric Login Bridge ---
    private void sendBiometricResult(boolean success, String message) {
        String safeMessage = message == null ? "" : message.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ");
        String js = "window.__onBiometricResult && window.__onBiometricResult(" + success + ", '" + safeMessage + "')";
        runOnUiThread(() -> webView.evaluateJavascript(js, null));
    }

    private class BiometricBridge {

        @JavascriptInterface
        public boolean isAvailable() {
            BiometricManager manager = BiometricManager.from(MainActivity.this);
            return manager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK)
                == BiometricManager.BIOMETRIC_SUCCESS;
        }

        @JavascriptInterface
        public void authenticate() {
            runOnUiThread(() -> {
                if (!isAvailable()) {
                    sendBiometricResult(false, "Biometrik tidak tersedia di perangkat ini.");
                    return;
                }

                BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                    .setTitle("Login Biometrik")
                    .setSubtitle("Verifikasi identitas Anda untuk masuk")
                    .setNegativeButtonText("Batal")
                    .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_WEAK)
                    .build();

                BiometricPrompt prompt = new BiometricPrompt(MainActivity.this,
                    ContextCompat.getMainExecutor(MainActivity.this),
                    new BiometricPrompt.AuthenticationCallback() {
                        @Override
                        public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                            sendBiometricResult(true, "");
                        }

                        @Override
                        public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                            if (errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON
                                || errorCode == BiometricPrompt.ERROR_USER_CANCELED) {
                                sendBiometricResult(false, "");
                            } else {
                                sendBiometricResult(false, errString.toString());
                            }
                        }
                    });

                prompt.authenticate(promptInfo);
            });
        }
    }

    // --- Back Button ---
    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            new AlertDialog.Builder(this)
                .setTitle("Keluar Aplikasi")
                .setMessage("Apakah Anda yakin ingin keluar?")
                .setPositiveButton("Ya", (d, w) -> finish())
                .setNegativeButton("Tidak", null)
                .show();
        }
    }

    @Override
    protected void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    protected void onPause() {
        super.onPause();
        webView.onPause();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
