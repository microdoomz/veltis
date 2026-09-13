package com.veltis.android.util

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import com.veltis.android.BuildConfig
import com.veltis.android.data.api.VeltisFullApiService
import com.veltis.android.data.model.AppVersionDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream

object AppUpdateManager {

    suspend fun checkForUpdate(apiService: VeltisFullApiService): AppVersionDto? {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.getAppVersion()
                if (response.isSuccessful) {
                    val versionInfo = response.body()
                    if (versionInfo != null && versionInfo.versionCode > BuildConfig.VERSION_CODE) {
                        return@withContext versionInfo
                    }
                }
            } catch (e: Exception) {
                // Ignore network errors during background check
            }
            null
        }
    }

    suspend fun downloadAndInstallApk(
        context: Context,
        apkUrl: String,
        onProgress: (Float) -> Unit,
        onError: (String) -> Unit
    ) {
        withContext(Dispatchers.IO) {
            try {
                val client = OkHttpClient()
                val request = Request.Builder().url(apkUrl).build()
                val response = client.newCall(request).execute()

                if (!response.isSuccessful) {
                    withContext(Dispatchers.Main) {
                        onError("Failed to download update: HTTP ${response.code}")
                    }
                    return@withContext
                }

                val body = response.body ?: run {
                    withContext(Dispatchers.Main) {
                        onError("Empty response body from server")
                    }
                    return@withContext
                }

                val totalBytes = body.contentLength()
                val destinationFile = File(context.cacheDir, "veltis_update.apk")
                if (destinationFile.exists()) {
                    destinationFile.delete()
                }

                val inputStream: InputStream = body.byteStream()
                val outputStream = FileOutputStream(destinationFile)
                val buffer = ByteArray(8192)
                var bytesRead: Int
                var totalBytesRead = 0L

                while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                    outputStream.write(buffer, 0, bytesRead)
                    totalBytesRead += bytesRead
                    if (totalBytes > 0) {
                        val progress = totalBytesRead.toFloat() / totalBytes.toFloat()
                        withContext(Dispatchers.Main) {
                            onProgress(progress)
                        }
                    }
                }

                outputStream.flush()
                outputStream.close()
                inputStream.close()

                withContext(Dispatchers.Main) {
                    onProgress(1.0f)
                    launchInstaller(context, destinationFile)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    onError(e.localizedMessage ?: "Unknown error while downloading update")
                }
            }
        }
    }

    private fun launchInstaller(context: Context, apkFile: File) {
        try {
            val contentUri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.provider",
                apkFile
            )

            val installIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(contentUri, "application/vnd.android.package-archive")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
            }

            context.startActivity(installIntent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
