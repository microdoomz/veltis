package com.veltis.android

import android.app.Application
import com.veltis.android.data.api.NetworkClient
import com.veltis.android.data.repository.AuthRepositoryImpl
import com.veltis.android.data.repository.VeltisAppRepositoryImpl
import com.veltis.android.data.repository.VeltisRepositoryImpl
import com.veltis.android.data.storage.SessionManager
import com.veltis.android.data.storage.TokenManager
import com.veltis.android.data.storage.VeltisDatabaseHelper
import com.veltis.android.domain.repository.AuthRepository
import com.veltis.android.domain.repository.VeltisAppRepository
import com.veltis.android.domain.repository.VeltisRepository

class VeltisApplication : Application() {

    lateinit var tokenManager: TokenManager
        private set

    lateinit var sessionManager: SessionManager
        private set

    lateinit var dbHelper: VeltisDatabaseHelper
        private set

    lateinit var networkClient: NetworkClient
        private set

    lateinit var repository: VeltisRepository
        private set

    lateinit var authRepository: AuthRepository
        private set

    lateinit var appRepository: VeltisAppRepository
        private set

    val fullApiService: com.veltis.android.data.api.VeltisFullApiService
        get() = networkClient.createFullApiService()

    override fun onCreate() {
        super.onCreate()
        instance = this

        tokenManager = TokenManager(this)
        sessionManager = SessionManager(this)
        dbHelper = VeltisDatabaseHelper(this)
        networkClient = NetworkClient(tokenManager, sessionManager)
        repository = VeltisRepositoryImpl(networkClient, tokenManager)
        authRepository = AuthRepositoryImpl(networkClient, sessionManager)
        appRepository = VeltisAppRepositoryImpl(networkClient, sessionManager, dbHelper)
    }

    companion object {
        lateinit var instance: VeltisApplication
            private set
    }
}
