package com.bodydream.trainer;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.provider.MediaStore;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.speech.tts.TextToSpeech;
import android.view.WindowManager;
import android.view.WindowInsets;
import android.graphics.Insets;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.ValueCallback;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/** Offline-only Android host for BodyDream Elite assets. No INTERNET permission. */
public class MainActivity extends Activity {
    private static final String OFFLINE_ORIGIN = "https://appassets.androidplatform.net/assets/";
    private static final int CODE_FILE_CHOOSER = 101;
    private static final int CODE_BACKUP_EXPORT = 102;
    private static final int CODE_BACKUP_IMPORT = 103;
    private static final int MAX_BACKUP_SIZE = 5_000_000;

    private WebView webView;
    private ValueCallback<Uri[]> pendingFiles;
    private String pendingExport;
    private TextToSpeech voice;
    private boolean voiceReady = false;

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(11, 16, 23));
        getWindow().setNavigationBarColor(Color.rgb(11, 16, 23));
        if (Build.VERSION.SDK_INT >= 29) {
            // Avoid a light system navigation contrast plate over the dark AMOLED UI.
            getWindow().setNavigationBarContrastEnforced(false);
        }
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);

        voice = new TextToSpeech(getApplicationContext(), result -> {
            if (result == TextToSpeech.SUCCESS && voice != null) {
                int lang = voice.setLanguage(new Locale("ru", "RU"));
                voiceReady = lang != TextToSpeech.LANG_MISSING_DATA && lang != TextToSpeech.LANG_NOT_SUPPORTED;
            }
        });

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(11, 16, 23));
        // Android 15 enforces edge-to-edge for apps targeting SDK 35.
        // Apply physical screen cutout/status/gesture insets at the Android view level,
        // so buttons and workout controls are never hidden under HyperOS system bars.
        if (Build.VERSION.SDK_INT >= 35) {
            webView.setOnApplyWindowInsetsListener((view, windowInsets) -> {
                Insets safe = windowInsets.getInsets(
                    WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                Insets keyboard = windowInsets.getInsets(WindowInsets.Type.ime());
                view.setPadding(safe.left, safe.top, safe.right,
                    Math.max(safe.bottom, keyboard.bottom));
                return windowInsets;
            });
        }
        setContentView(webView);
        webView.addJavascriptInterface(new AndroidBridge(), "Android");
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);           // local content served from a trusted virtual HTTPS origin
        settings.setAllowContentAccess(true);         // document/photo picker
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setTextZoom(100);
        settings.setDefaultTextEncodingName("UTF-8");
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        WebView.setWebContentsDebuggingEnabled(false);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !request.getUrl().toString().startsWith(OFFLINE_ORIGIN);
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return !url.startsWith(OFFLINE_ORIGIN);
            }
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (!url.startsWith(OFFLINE_ORIGIN)) {
                    // No external content is allowed to execute inside the trusted JS bridge.
                    return emptyResponse();
                }
                String asset = url.substring(OFFLINE_ORIGIN.length());
                if (!asset.equals("index.html") && !asset.equals("app.css")
                    && !asset.equals("app.js") && !asset.equals("data.js")
                    && !asset.equals("visuals.js") && !asset.equals("visuals.css")) {
                    return emptyResponse();
                }
                String mime = asset.endsWith(".html") ? "text/html"
                    : asset.endsWith(".css") ? "text/css" : "application/javascript";
                try {
                    return new WebResourceResponse(mime, "UTF-8", getAssets().open(asset));
                } catch (Exception ex) {
                    return emptyResponse();
                }
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view,
                                            ValueCallback<Uri[]> callback,
                                            FileChooserParams params) {
                if (pendingFiles != null) pendingFiles.onReceiveValue(null);
                pendingFiles = callback;
                boolean wantsVideo = false;
                for (String type : params.getAcceptTypes()) {
                    if (type != null && type.startsWith("video/")) wantsVideo = true;
                }
                if (params.isCaptureEnabled() && wantsVideo) {
                    try {
                        Intent camera = new Intent(MediaStore.ACTION_VIDEO_CAPTURE);
                        camera.putExtra(MediaStore.EXTRA_DURATION_LIMIT, 30);
                        startActivityForResult(camera, CODE_FILE_CHOOSER);
                        return true;
                    } catch (Exception ignored) {
                        // No video capture app: fall back to selecting an existing file.
                    }
                }
                try {
                    Intent pick = params.createIntent();
                    startActivityForResult(pick, CODE_FILE_CHOOSER);
                    return true;
                } catch (Exception ex) {
                    if (pendingFiles != null) pendingFiles.onReceiveValue(null);
                    pendingFiles = null;
                    toast("Не удалось открыть системный выбор файла");
                    return true;
                }
            }
        });
        // Restore progress from browser storage, including any interrupted session.
        webView.loadUrl(OFFLINE_ORIGIN + "index.html");
    }

    private WebResourceResponse emptyResponse() {
        return new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream(new byte[0]));
    }

    private void toast(String message) {
        runOnUiThread(() -> Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show());
    }

    public class AndroidBridge {
        @JavascriptInterface
        public void vibrate(int durationMs) {
            runOnUiThread(() -> {
                Vibrator v = (Vibrator) getSystemService(VIBRATOR_SERVICE);
                if (v == null || !v.hasVibrator()) return;
                long ms = Math.max(10, Math.min(durationMs, 300));
                if (Build.VERSION.SDK_INT >= 26) {
                    v.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    v.vibrate(ms);
                }
            });
        }
        @JavascriptInterface
        public void speak(String message) {
            if (message == null || message.length() > 350) return;
            runOnUiThread(() -> {
                if (voiceReady && voice != null) voice.speak(message, TextToSpeech.QUEUE_FLUSH, null, "bodydream_voice");
            });
        }
        @JavascriptInterface
        public void keepAwake(boolean enable) {
            runOnUiThread(() -> {
                if (enable) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            });
        }
        @JavascriptInterface
        public void exportData(String contents) {
            if (contents == null || contents.length() > MAX_BACKUP_SIZE) {
                toast("Резервная копия слишком большая");return;
            }
            runOnUiThread(() -> {
                pendingExport = contents;
                try {
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("application/json");
                    intent.putExtra(Intent.EXTRA_TITLE, "BodyDream-Elite-backup.json");
                    startActivityForResult(intent, CODE_BACKUP_EXPORT);
                } catch (Exception ex) {
                    pendingExport = null;
                    toast("Не удалось выбрать место для сохранения");
                }
            });
        }
        @JavascriptInterface
        public void importData() {
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("*/*");
                    intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[] {"application/json", "text/plain"});
                    startActivityForResult(intent, CODE_BACKUP_IMPORT);
                } catch (Exception ex) {
                    toast("Не удалось открыть выбор копии");
                }
            });
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == CODE_FILE_CHOOSER) {
            if (pendingFiles != null) {
                pendingFiles.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
                pendingFiles = null;
            }
            return;
        }
        if (requestCode == CODE_BACKUP_EXPORT) {
            if (resultCode == RESULT_OK && data != null && data.getData() != null && pendingExport != null) {
                try (OutputStream stream = getContentResolver().openOutputStream(data.getData())) {
                    if (stream == null) throw new IllegalStateException("No output stream");
                    stream.write(pendingExport.getBytes(StandardCharsets.UTF_8));
                    stream.flush();
                    toast("Копия сохранена в выбранную папку");
                } catch (Exception ex) {
                    toast("Ошибка сохранения резервной копии");
                }
            }
            pendingExport = null;
            return;
        }
        if (requestCode == CODE_BACKUP_IMPORT && resultCode == RESULT_OK && data != null && data.getData() != null) {
            try (InputStream stream = getContentResolver().openInputStream(data.getData())) {
                if (stream == null) throw new IllegalStateException("No input stream");
                ByteArrayOutputStream output = new ByteArrayOutputStream();
                byte[] chunk = new byte[8192];
                int read;
                while ((read = stream.read(chunk)) != -1) {
                    if (output.size() + read > MAX_BACKUP_SIZE) throw new IllegalStateException("File too large");
                    output.write(chunk, 0, read);
                }
                String jsonText = new String(output.toByteArray(), StandardCharsets.UTF_8);
                // Proper JSON string escaping prevents source-code injection in evaluateJavascript.
                webView.evaluateJavascript("window.BodyDreamReceiveBackup(" + JSONObject.quote(jsonText) + ")", null);
            } catch (Exception ex) {
                toast("Ошибка чтения: проверь размер и формат JSON");
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (webView == null) { super.onBackPressed();return; }
        webView.evaluateJavascript("window.BodyDreamBack && window.BodyDreamBack()", result -> {
            if (!"true".equals(result)) MainActivity.super.onBackPressed();
        });
    }

    @Override
    protected void onDestroy() {
        if (voice != null) {voice.stop();voice.shutdown();voice = null;}
        if (pendingFiles != null) {pendingFiles.onReceiveValue(null);pendingFiles = null;}
        if (webView != null) {webView.removeJavascriptInterface("Android");webView.destroy();webView = null;}
        super.onDestroy();
    }
}

