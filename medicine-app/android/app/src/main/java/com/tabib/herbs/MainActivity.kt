package com.tabib.herbs

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader

/**
 * يعرض واجهة التطبيق (مجلد www) من داخل ملف APK دون الحاجة إلى إنترنت.
 * تُخدَم الملفات عبر WebViewAssetLoader على نطاق https محلي آمن.
 */
class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        val container = FrameLayout(this).apply { setBackgroundColor(Color.parseColor("#0E7C66")) }
        webView = WebView(this)
        container.addView(webView, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        setContentView(container)

        // تجنّب تداخل المحتوى مع شريط الحالة وشريط التنقل (Android 15 edge-to-edge)
        ViewCompat.setOnApplyWindowInsetsListener(container) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.ime())
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            WindowInsetsCompat.CONSUMED
        }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            userAgentString = "$userAgentString TabibApp/1.0"
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                assetLoader.shouldInterceptRequest(request.url)

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (request.url.host == WebViewAssetLoader.DEFAULT_DOMAIN) return false
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, request.url))
                } catch (_: ActivityNotFoundException) {
                }
                return true
            }
        }

        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl("https://${WebViewAssetLoader.DEFAULT_DOMAIN}/index.html")
        }

        // زر الرجوع: يرجع داخل صفحات التطبيق أولاً، ثم يغلق التطبيق من الصفحة الرئيسية
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                webView.evaluateJavascript("(window.tabibBack && window.tabibBack()) === true") { result ->
                    if (result != "true") {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                        isEnabled = true
                    }
                }
            }
        })
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }
}
