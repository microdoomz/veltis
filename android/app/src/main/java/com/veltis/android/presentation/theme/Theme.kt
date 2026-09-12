package com.veltis.android.presentation.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = TealLight,
    onPrimary = Color.Black,
    primaryContainer = TealDark,
    onPrimaryContainer = TealContainer,
    secondary = VeltisCyan,
    background = VeltisDarkBg,
    surface = VeltisCardBg,
    onBackground = Color.White,
    onSurface = Color.White,
    outline = VeltisCardBorder
)

@Composable
fun VeltisTheme(
    darkTheme: Boolean = true, // Default to dark theme matching Veltis web app
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content
    )
}
