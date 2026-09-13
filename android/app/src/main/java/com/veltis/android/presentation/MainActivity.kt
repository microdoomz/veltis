package com.veltis.android.presentation

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.activity.compose.setContent
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import com.veltis.android.VeltisApplication
import com.veltis.android.data.repository.AuthRepositoryImpl
import com.veltis.android.domain.model.VeltisResult
import com.veltis.android.presentation.navigation.AppNavigation
import com.veltis.android.presentation.theme.VeltisTheme
import kotlinx.coroutines.launch

class MainActivity : FragmentActivity() {

    private lateinit var app: VeltisApplication

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        app = application as VeltisApplication

        handleAuthIntent(intent)

        setContent {
            VeltisTheme {
                AppNavigation(app = app)
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
                val authRepo = AuthRepositoryImpl(app.networkClient, app.sessionManager)
                lifecycleScope.launch {
                    when (val res = authRepo.handleOAuthCallback(token)) {
                        is VeltisResult.Success -> {
                            Toast.makeText(
                                this@MainActivity,
                                "Welcome to Veltis, ${res.data.name ?: res.data.email}!",
                                Toast.LENGTH_SHORT
                            ).show()
                            setContent {
                                VeltisTheme {
                                    AppNavigation(app = app)
                                }
                            }
                        }
                        is VeltisResult.Failure -> {
                            Toast.makeText(this@MainActivity, res.error.userFriendlyMessage(), Toast.LENGTH_LONG).show()
                        }
                    }
                }
            }
        }
    }
}
