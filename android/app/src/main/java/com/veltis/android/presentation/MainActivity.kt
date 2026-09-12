package com.veltis.android.presentation

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.veltis.android.VeltisApplication
import com.veltis.android.presentation.navigation.AppNavigation
import com.veltis.android.presentation.theme.VeltisTheme

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val app = application as VeltisApplication
        setContent {
            VeltisTheme {
                AppNavigation(app = app)
            }
        }
    }
}
