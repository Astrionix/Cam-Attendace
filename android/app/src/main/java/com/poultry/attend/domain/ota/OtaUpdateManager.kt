package com.poultry.attend.domain.ota

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import com.poultry.attend.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

data class UpdateInfo(
    val versionName: String,
    val releaseTitle: String,
    val releaseNotes: String,
    val downloadUrl: String,
    val apkSize: Long,
    val publishedAt: String,
    val assetName: String
)

sealed class UpdateCheckResult {
    data class UpToDate(val currentVersion: String) : UpdateCheckResult()
    data class UpdateAvailable(val updateInfo: UpdateInfo, val currentVersion: String) : UpdateCheckResult()
    data class Error(val message: String) : UpdateCheckResult()
}

sealed class DownloadState {
    object Idle : DownloadState()
    data class Downloading(val progress: Float, val downloadedBytes: Long, val totalBytes: Long) : DownloadState()
    data class Downloaded(val apkFile: File) : DownloadState()
    data class Failed(val error: String) : DownloadState()
}

class OtaUpdateManager(private val context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences("poultry_ota_prefs", Context.MODE_PRIVATE)

    var githubRepo: String
        get() = prefs.getString("github_repo", "Astrionix/Cam-Attendace") ?: "Astrionix/Cam-Attendace"
        set(value) = prefs.edit().putString("github_repo", value.trim()).apply()

    val currentVersion: String
        get() = BuildConfig.VERSION_NAME

    val currentVersionCode: Int
        get() = BuildConfig.VERSION_CODE

    /**
     * Checks GitHub Releases for latest release tag and APK asset.
     */
    suspend fun checkForUpdates(): UpdateCheckResult = withContext(Dispatchers.IO) {
        try {
            val apiUrl = "https://api.github.com/repos/$githubRepo/releases/latest"
            val url = URL(apiUrl)
            val connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                setRequestProperty("Accept", "application/vnd.github.v3+json")
                setRequestProperty("User-Agent", "PoultryAttend-Kiosk-Android")
                connectTimeout = 12000
                readTimeout = 12000
            }

            val responseCode = connection.responseCode
            if (responseCode == 404) {
                return@withContext UpdateCheckResult.Error("No releases found on GitHub ($githubRepo). Create a Release on GitHub to enable OTA updates.")
            }
            if (responseCode !in 200..299) {
                val errorStream = connection.errorStream?.bufferedReader()?.use { it.readText() } ?: ""
                return@withContext UpdateCheckResult.Error("GitHub API error ($responseCode): ${errorStream.take(120)}")
            }

            val responseText = connection.inputStream.bufferedReader().use { it.readText() }
            val json = JSONObject(responseText)

            val tagName = json.optString("tag_name", "").trim()
            val releaseTitle = json.optString("name", "v$tagName")
            val releaseNotes = json.optString("body", "Bug fixes and performance improvements.")
            val publishedAt = json.optString("published_at", "")

            // Parse clean version without 'v' prefix
            val cleanRemoteVersion = tagName.removePrefix("v").removePrefix("V")
            val cleanLocalVersion = currentVersion.removePrefix("v").removePrefix("V")

            // Look for APK asset in assets array
            val assetsArray = json.optJSONArray("assets")
            var downloadUrl: String? = null
            var apkSize = 0L
            var assetName = "PoultryAttend-update.apk"

            if (assetsArray != null) {
                for (i in 0 until assetsArray.length()) {
                    val asset = assetsArray.getJSONObject(i)
                    val name = asset.optString("name", "")
                    if (name.endsWith(".apk", ignoreCase = true)) {
                        downloadUrl = asset.optString("browser_download_url")
                        apkSize = asset.optLong("size", 0L)
                        assetName = name
                        break
                    }
                }
            }

            if (downloadUrl.isNullOrEmpty()) {
                return@withContext UpdateCheckResult.Error(
                    "Latest release ($tagName) found on GitHub, but no .apk asset was uploaded to it."
                )
            }

            val updateInfo = UpdateInfo(
                versionName = cleanRemoteVersion,
                releaseTitle = releaseTitle,
                releaseNotes = releaseNotes,
                downloadUrl = downloadUrl,
                apkSize = apkSize,
                publishedAt = publishedAt,
                assetName = assetName
            )

            if (isNewerVersion(cleanRemoteVersion, cleanLocalVersion)) {
                UpdateCheckResult.UpdateAvailable(updateInfo, currentVersion)
            } else {
                UpdateCheckResult.UpToDate(currentVersion)
            }
        } catch (e: Exception) {
            UpdateCheckResult.Error(e.localizedMessage ?: "Failed to connect to update server")
        }
    }

    /**
     * Downloads the APK file with progress reporting.
     * Follows HTTP 302/301 redirects (standard for GitHub releases to AWS S3).
     */
    suspend fun downloadApk(
        downloadUrl: String,
        onProgress: (progress: Float, downloaded: Long, total: Long) -> Unit
    ): File = withContext(Dispatchers.IO) {
        val updatesDir = File(context.cacheDir, "ota_updates").apply { mkdirs() }
        val targetFile = File(updatesDir, "PoultryAttend_update.apk")
        if (targetFile.exists()) {
            targetFile.delete()
        }

        var currentUrl = downloadUrl
        var connection: HttpURLConnection
        var redirectCount = 0

        while (true) {
            val url = URL(currentUrl)
            connection = (url.openConnection() as HttpURLConnection).apply {
                instanceFollowRedirects = true
                connectTimeout = 15000
                readTimeout = 30000
                setRequestProperty("User-Agent", "PoultryAttend-Kiosk-Android")
            }

            val code = connection.responseCode
            if (code in listOf(HttpURLConnection.HTTP_MOVED_PERM, HttpURLConnection.HTTP_MOVED_TEMP, 307, 308)) {
                val newUrl = connection.getHeaderField("Location")
                if (!newUrl.isNullOrEmpty() && redirectCount < 5) {
                    currentUrl = newUrl
                    redirectCount++
                    connection.disconnect()
                    continue
                }
            }
            break
        }

        val totalLength = connection.contentLength.toLong()
        var downloadedBytes = 0L

        connection.inputStream.use { input ->
            FileOutputStream(targetFile).use { output ->
                val buffer = ByteArray(8192)
                var bytesRead: Int
                while (input.read(buffer).also { bytesRead = it } != -1) {
                    output.write(buffer, 0, bytesRead)
                    downloadedBytes += bytesRead
                    val progress = if (totalLength > 0) {
                        (downloadedBytes.toFloat() / totalLength.toFloat()).coerceIn(0f, 1f)
                    } else {
                        0f
                    }
                    onProgress(progress, downloadedBytes, totalLength)
                }
                output.flush()
            }
        }

        targetFile
    }

    /**
     * Launches the system Package Installer via FileProvider to install the APK.
     */
    fun installApk(apkFile: File): Boolean {
        if (!apkFile.exists() || apkFile.length() == 0L) return false

        // Check if unknown app sources allowed on Android 8.0+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!context.packageManager.canRequestPackageInstalls()) {
                val manageIntent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                    data = Uri.parse("package:${context.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(manageIntent)
                return false
            }
        }

        val apkUri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            apkFile
        )

        val installIntent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(apkUri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

        context.startActivity(installIntent)
        return true
    }

    /**
     * Compares two semantic version strings (e.g. "1.0.1" vs "1.0.0").
     */
    private fun isNewerVersion(remote: String, local: String): Boolean {
        val remoteParts = remote.split(".").mapNotNull { it.toIntOrNull() }
        val localParts = local.split(".").mapNotNull { it.toIntOrNull() }

        val maxLength = maxOf(remoteParts.size, localParts.size)
        for (i in 0 until maxLength) {
            val r = remoteParts.getOrElse(i) { 0 }
            val l = localParts.getOrElse(i) { 0 }
            if (r > l) return true
            if (r < l) return false
        }
        return false
    }
}
