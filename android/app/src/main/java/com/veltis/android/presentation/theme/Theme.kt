package com.veltis.android.presentation.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = TealPrimary,
    onPrimary = Color(0xFF020617),
    primaryContainer = TealDark,
    onPrimaryContainer = TextPrimary,
    secondary = VeltisCyan,
    background = VeltisDarkBg,
    surface = VeltisCardBg,
    onBackground = TextPrimary,
    onSurface = TextPrimary,
    outline = VeltisCardBorder
)

@Composable
fun VeltisTheme(
    darkTheme: Boolean = true, // Default to dark theme matching Veltis PWA
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content
    )
}
