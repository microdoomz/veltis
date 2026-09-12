package com.veltis.android.presentation.pwa

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.webkit.*
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.fragment.app.FragmentActivity
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.veltis.android.VeltisApplication
import com.veltis.android.domain.model.User
import com.veltis.android.util.BiometricHelper

class AndroidWebAppInterface(
    private val activity: FragmentActivity,
    private val app: VeltisApplication,
    private val onReloadNeeded: () -> Unit
) {
    @JavascriptInterface
    fun promptBiometrics() {
        activity.runOnUiThread {
            BiometricHelper.showBiometricPrompt(
                activity = activity,
                title = "Unlock Veltis",
                subtitle = "Confirm your fingerprint or face to authenticate",
                onSuccess = {
                    val token = app.sessionManager.getBiometricSessionToken() ?: app.sessionManager.getSessionToken()
                    if (!token.isNullOrBlank()) {
                        injectCookieAndRefresh(token)
                    } else {
                        Toast.makeText(activity, "Biometric verified. Please sign in to link session.", Toast.LENGTH_SHORT).show()
                    }
                },
                onError = { _, err ->
                    Toast.makeText(activity, err.toString(), Toast.LENGTH_SHORT).show()
                }
            )
        }
    }

    @JavascriptInterface
    fun syncSession(token: String, userId: String = "", userName: String = "") {
        if (token.isNotBlank()) {
            app.sessionManager.saveSession(
                token = token,
                user = User(id = userId.ifBlank { "user" }, email = "user@veltis", name = userName)
            )
            app.sessionManager.saveBiometricSessionToken(token)
            app.tokenManager.saveToken(token)
        }
    }

    @JavascriptInterface
    fun syncAccounts(accountsJson: String) {
        if (accountsJson.isNotBlank()) {
            app.tokenManager.saveCachedAccountsJson(accountsJson)
        }
    }

    private fun injectCookieAndRefresh(token: String) {
        val baseUrl = app.tokenManager.getBaseUrl()
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setCookie(baseUrl, "better-auth.session_token=$token; Path=/; SameSite=Lax")
        cookieManager.flush()
        onReloadNeeded()
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun VeltisPwaScreen(
    app: VeltisApplication,
    initialDeepLinkToken: String? = null,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val activity = context as? FragmentActivity

    var currentUrl by remember { mutableStateOf(app.tokenManager.getBaseUrl()) }
    var pageTitle by remember { mutableStateOf("Veltis") }
    var isLoading by remember { mutableStateOf(true) }
    var loadingProgress by remember { mutableStateOf(0) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var showServerDialog by remember { mutableStateOf(false) }

    var webViewRef by remember { mutableStateOf<WebView?>(null) }
    var swipeRefreshRef by remember { mutableStateOf<SwipeRefreshLayout?>(null) }

    val isBiometricAvailable = remember { BiometricHelper.isBiometricAvailable(context) }
    val hasSavedBiometricToken = remember { !app.sessionManager.getBiometricSessionToken().isNullOrBlank() }

    // Intercept back navigation to traverse WebView history
    BackHandler(enabled = webViewRef?.canGoBack() == true) {
        webViewRef?.goBack()
    }

    // Handle deep link token if provided
    LaunchedEffect(initialDeepLinkToken) {
        if (!initialDeepLinkToken.isNullOrBlank()) {
            val cookieManager = CookieManager.getInstance()
            cookieManager.setAcceptCookie(true)
            cookieManager.setCookie(app.tokenManager.getBaseUrl(), "better-auth.session_token=$initialDeepLinkToken; Path=/; SameSite=Lax")
            cookieManager.flush()
            app.sessionManager.saveSession(
                token = initialDeepLinkToken,
                user = User(id = "oauth_user", email = "oauth_user@veltis", name = "Veltis User")
            )
            app.sessionManager.saveBiometricSessionToken(initialDeepLinkToken)
            app.tokenManager.saveToken(initialDeepLinkToken)
            webViewRef?.loadUrl("${app.tokenManager.getBaseUrl()}home")
        }
    }

    val isOnline = remember(context) {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        val network = cm?.activeNetwork
        val caps = cm?.getNetworkCapabilities(network)
        caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF020617)) // PWA Slate 950
    ) {
        AndroidView(
            factory = { ctx ->
                val swipeRefresh = SwipeRefreshLayout(ctx).apply {
                    setColorSchemeColors(android.graphics.Color.parseColor("#14B8A6")) // Teal
                    setProgressBackgroundColorSchemeColor(android.graphics.Color.parseColor("#0F172A")) // Slate 900
                    setOnRefreshListener {
                        webViewRef?.reload()
                    }
                }

                val webView = WebView(ctx).apply {
                    setBackgroundColor(android.graphics.Color.parseColor("#020617"))
                    isHapticFeedbackEnabled = true

                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        databaseEnabled = true
                        allowFileAccess = true
                        allowContentAccess = true
                        useWideViewPort = true
                        loadWithOverviewMode = true
                        setSupportZoom(false)
                        displayZoomControls = false
                        mediaPlaybackRequiresUserGesture = false
                        mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                        cacheMode = if (isOnline) WebSettings.LOAD_DEFAULT else WebSettings.LOAD_CACHE_ELSE_NETWORK

                        // User-Agent identifying standalone Android PWA
                        val defaultUa = userAgentString
                        userAgentString = "$defaultUa VeltisAndroid/1.0.0 (android-app://com.veltis.android)"
                    }

                    // Enable Cookies
                    val webViewInstance = this
                    CookieManager.getInstance().apply {
                        setAcceptCookie(true)
                        setAcceptThirdPartyCookies(webViewInstance, true)
                    }

                    // Add JavaScript Interface for Biometrics and Widget Sync
                    if (activity != null) {
                        addJavascriptInterface(
                            AndroidWebAppInterface(
                                activity = activity,
                                app = app,
                                onReloadNeeded = {
                                    post { reload() }
                                }
                            ),
                            "AndroidBridge"
                        )
                    }

                    webChromeClient = object : WebChromeClient() {
                        override fun onProgressChanged(view: WebView?, newProgress: Int) {
                            loadingProgress = newProgress
                            if (newProgress >= 100) {
                                isLoading = false
                                swipeRefresh.isRefreshing = false
                            }
                        }

                        override fun onReceivedTitle(view: WebView?, title: String?) {
                            pageTitle = title ?: "Veltis"
                        }
                    }

                    webViewClient = object : WebViewClient() {
                        override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                            isLoading = true
                            loadError = null
                            if (url != null) currentUrl = url
                        }

                        override fun onPageFinished(view: WebView?, url: String?) {
                            isLoading = false
                            swipeRefresh.isRefreshing = false

                            // Extract Better Auth Session Cookie to sync with Widget & Keystore
                            if (url != null) {
                                val cookies = CookieManager.getInstance().getCookie(url)
                                if (!cookies.isNullOrBlank()) {
                                    val sessionToken = cookies.split(";")
                                        .map { it.trim() }
                                        .firstOrNull { it.startsWith("better-auth.session_token=") }
                                        ?.substringAfter("better-auth.session_token=")

                                    if (!sessionToken.isNullOrBlank()) {
                                        app.sessionManager.saveSession(
                                            token = sessionToken,
                                            user = User(id = "user", email = "user@veltis", name = "Veltis User")
                                        )
                                        app.sessionManager.saveBiometricSessionToken(sessionToken)
                                        app.tokenManager.saveToken(sessionToken)
                                    }
                                }

                                // Sync accounts list for Glance widget
                                view?.evaluateJavascript(
                                    """
                                    (function() {
                                        try {
                                            fetch('/api/shortcuts/accounts')
                                                .then(r => r.json())
                                                .then(data => {
                                                    if (data && window.AndroidBridge) {
                                                        window.AndroidBridge.syncAccounts(JSON.stringify(data));
                                                    }
                                                }).catch(e => {});
                                        } catch(e) {}
                                    })();
                                    """.trimIndent(),
                                    null
                                )
                            }
                        }

                        override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                            val targetUri = request?.url ?: return false
                            val uriString = targetUri.toString()

                            // Google OAuth handling: launch in Chrome Custom Tab
                            if (uriString.contains("accounts.google.com") ||
                                uriString.contains("api/auth/sign-in/social?provider=google")
                            ) {
                                try {
                                    val customTabsIntent = CustomTabsIntent.Builder()
                                        .setShowTitle(true)
                                        .build()
                                    customTabsIntent.launchUrl(ctx, targetUri)
                                    return true
                                } catch (_: Exception) {
                                    val intent = Intent(Intent.ACTION_VIEW, targetUri)
                                    ctx.startActivity(intent)
                                    return true
                                }
                            }

                            // Handle deep link
                            if (targetUri.scheme == "veltis") {
                                val intent = Intent(Intent.ACTION_VIEW, targetUri)
                                ctx.startActivity(intent)
                                return true
                            }

                            // External links
                            if (!uriString.startsWith(app.tokenManager.getBaseUrl()) &&
                                !uriString.contains("veltis") &&
                                !uriString.contains("localhost") &&
                                !uriString.contains("10.0.2.2")
                            ) {
                                try {
                                    val intent = Intent(Intent.ACTION_VIEW, targetUri)
                                    ctx.startActivity(intent)
                                    return true
                                } catch (_: Exception) {}
                            }

                            return false
                        }

                        override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                            if (request?.isForMainFrame == true) {
                                isLoading = false
                                swipeRefresh.isRefreshing = false
                                loadError = error?.description?.toString() ?: "Connection failed"
                            }
                        }
                    }

                    loadUrl(app.tokenManager.getBaseUrl())
                }

                swipeRefresh.addView(webView)
                webViewRef = webView
                swipeRefreshRef = swipeRefresh
                swipeRefresh
            },
            modifier = Modifier.fillMaxSize()
        )

        // Loading Bar at the top (PWA style)
        if (isLoading && loadingProgress < 100) {
            LinearProgressIndicator(
                progress = { loadingProgress / 100f },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(2.5.dp)
                    .align(Alignment.TopCenter),
                color = Color(0xFF14B8A6), // Teal
                trackColor = Color.Transparent
            )
        }

        // Floating Biometric Unlock Button (Appears if user is on login page & has saved biometric token)
        val isLoginPage = currentUrl.contains("/login") || currentUrl.contains("/sign-in") || currentUrl.endsWith("/#login")
        AnimatedVisibility(
            visible = isLoginPage && isBiometricAvailable && hasSavedBiometricToken,
            enter = fadeIn() + slideInVertically(initialOffsetY = { it }),
            exit = fadeOut() + slideOutVertically(targetOffsetY = { it }),
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(bottom = 32.dp, end = 20.dp)
        ) {
            Surface(
                shape = RoundedCornerShape(28.dp),
                color = Color(0xFF14B8A6), // Teal
                shadowElevation = 8.dp,
                modifier = Modifier.clickable {
                    if (activity != null) {
                        BiometricHelper.showBiometricPrompt(
                            activity = activity,
                            title = "Unlock Veltis",
                            subtitle = "Verify fingerprint or face to sign in",
                            onSuccess = {
                                val token = app.sessionManager.getBiometricSessionToken()
                                if (!token.isNullOrBlank()) {
                                    val cookieManager = CookieManager.getInstance()
                                    cookieManager.setAcceptCookie(true)
                                    cookieManager.setCookie(app.tokenManager.getBaseUrl(), "better-auth.session_token=$token; Path=/; SameSite=Lax")
                                    cookieManager.flush()
                                    webViewRef?.loadUrl("${app.tokenManager.getBaseUrl()}home")
                                    Toast.makeText(context, "Unlocked with Biometrics!", Toast.LENGTH_SHORT).show()
                                }
                            },
                            onError = { _, err ->
                                Toast.makeText(context, err.toString(), Toast.LENGTH_SHORT).show()
                            }
                        )
                    }
                }
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 18.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Fingerprint,
                        contentDescription = "Biometric Login",
                        tint = Color(0xFF020617),
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Unlock with Biometrics",
                        color = Color(0xFF020617),
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }
        }

        // Connection Error Screen with Server Switcher
        if (loadError != null) {
            Surface(
                modifier = Modifier.fillMaxSize(),
                color = Color(0xFF020617)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(28.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF0F172A))
                            .border(1.dp, Color(0xFF1E293B), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.WifiOff,
                            contentDescription = null,
                            tint = Color(0xFF94A3B8),
                            modifier = Modifier.size(32.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = "Unable to reach Veltis",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "Server: ${app.tokenManager.getBaseUrl()}",
                        fontSize = 12.sp,
                        color = Color(0xFF64748B)
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Button(
                            onClick = {
                                loadError = null
                                webViewRef?.loadUrl(app.tokenManager.getBaseUrl())
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF14B8A6)),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Retry", fontWeight = FontWeight.Bold)
                        }

                        OutlinedButton(
                            onClick = { showServerDialog = true },
                            shape = RoundedCornerShape(12.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155))
                        ) {
                            Icon(Icons.Default.Settings, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Change Server", color = Color.White)
                        }
                    }
                }
            }
        }

        // Server Switcher Dialog
        if (showServerDialog) {
            AlertDialog(
                onDismissRequest = { showServerDialog = false },
                title = { Text("Server Environment", color = Color.White, fontWeight = FontWeight.Bold) },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(
                            text = "Select where the Veltis app connects:",
                            fontSize = 13.sp,
                            color = Color(0xFF94A3B8)
                        )

                        // 1. Production Vercel
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(10.dp))
                                .clickable {
                                    app.tokenManager.saveBaseUrl("https://veltismoney.vercel.app/")
                                    showServerDialog = false
                                    loadError = null
                                    webViewRef?.loadUrl("https://veltismoney.vercel.app/")
                                },
                            color = Color(0xFF0F172A)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text("Vercel Cloud Production (Live)", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 13.sp)
                                Text("https://veltismoney.vercel.app/", color = Color(0xFF14B8A6), fontSize = 11.sp)
                            }
                        }

                        // 2. Localhost Emulator
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(10.dp))
                                .clickable {
                                    app.tokenManager.saveBaseUrl("http://10.0.2.2:3000/")
                                    showServerDialog = false
                                    loadError = null
                                    webViewRef?.loadUrl("http://10.0.2.2:3000/")
                                },
                            color = Color(0xFF0F172A)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text("Android Emulator Localhost", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 13.sp)
                                Text("http://10.0.2.2:3000/", color = Color(0xFF94A3B8), fontSize = 11.sp)
                            }
                        }
                    }
                },
                confirmButton = {
                    TextButton(onClick = { showServerDialog = false }) {
                        Text("Close", color = Color(0xFF14B8A6))
                    }
                },
                containerColor = Color(0xFF0F172A)
            )
        }
    }
}
