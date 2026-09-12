package com.veltis.android

import android.app.Application
import com.veltis.android.data.api.NetworkClient
import com.veltis.android.data.repository.VeltisRepositoryImpl
import com.veltis.android.data.storage.TokenManager
import com.veltis.android.domain.repository.VeltisRepository

class VeltisApplication : Application() {

    lateinit var tokenManager: TokenManager
        private set

    lateinit var networkClient: NetworkClient
        private set

    lateinit var repository: VeltisRepository
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this

        tokenManager = TokenManager(this)
        networkClient = NetworkClient(tokenManager)
        repository = VeltisRepositoryImpl(networkClient, tokenManager)
    }

    companion object {
        lateinit var instance: VeltisApplication
            private set
    }
}
