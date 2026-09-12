package com.veltis.android.presentation

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.activity.compose.setContent
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.fragment.app.FragmentActivity
import com.veltis.android.VeltisApplication
import com.veltis.android.presentation.pwa.VeltisPwaScreen
import com.veltis.android.presentation.theme.VeltisTheme

class MainActivity : FragmentActivity() {

    private lateinit var app: VeltisApplication
    private var pendingOAuthToken by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        app = application as VeltisApplication

        handleAuthIntent(intent)

        setContent {
            VeltisTheme {
                VeltisPwaScreen(
                    app = app,
                    initialDeepLinkToken = pendingOAuthToken
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleAuthIntent(intent)
    }

    private fun handleAuthIntent(intent: Intent?) {
        val data: Uri? = intent?.data
        if (data != null && data.scheme == "veltis" && data.host == "auth") {
            val token = data.getQueryParameter("token")
            if (!token.isNullOrBlank()) {
                pendingOAuthToken = token
                Toast.makeText(this, "Signed in successfully!", Toast.LENGTH_SHORT).show()
            }
        }
    }
}
