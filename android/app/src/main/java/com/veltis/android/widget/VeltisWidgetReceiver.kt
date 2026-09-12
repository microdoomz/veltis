package com.veltis.android.widget

import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

/**
 * BroadcastReceiver responsible for managing the lifecycle and updates
 * of the Veltis Glance Home-Screen Widget.
 */
class VeltisWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = VeltisGlanceWidget()
}
