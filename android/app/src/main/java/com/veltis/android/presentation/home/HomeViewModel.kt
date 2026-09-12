package com.veltis.android.presentation.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.veltis.android.data.model.HomeDashboardDto
import com.veltis.android.data.storage.SessionManager
import com.veltis.android.domain.model.VeltisResult
import com.veltis.android.domain.repository.VeltisAppRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class HomeUiState(
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val dashboard: HomeDashboardDto? = null,
    val isPrivacyMode: Boolean = false,
    val errorMessage: String? = null,
    val offlineSyncedCount: Int = 0
)

class HomeViewModel(
    private val repository: VeltisAppRepository,
    private val sessionManager: SessionManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        HomeUiState(isPrivacyMode = sessionManager.getPrivacyMode())
    )
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadDashboard()
        syncOffline()
    }

    fun loadDashboard(forceRefresh: Boolean = false) {
        viewModelScope.launch {
            _uiState.update { if (forceRefresh) it.copy(isRefreshing = true) else it.copy(isLoading = it.dashboard == null) }
            when (val result = repository.getHomeDashboard(forceRefresh)) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isRefreshing = false,
                            dashboard = result.data,
                            errorMessage = null
                        )
                    }
                }
                is VeltisResult.Failure -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isRefreshing = false,
                            errorMessage = result.error.userFriendlyMessage()
                        )
                    }
                }
            }
        }
    }

    fun togglePrivacyMode() {
        val newMode = !_uiState.value.isPrivacyMode
        sessionManager.setPrivacyMode(newMode)
        _uiState.update { it.copy(isPrivacyMode = newMode) }
    }

    fun syncOffline() {
        viewModelScope.launch {
            when (val result = repository.syncOfflineQueue()) {
                is VeltisResult.Success -> {
                    if (result.data > 0) {
                        _uiState.update { it.copy(offlineSyncedCount = result.data) }
                        loadDashboard(forceRefresh = true)
                    }
                }
                is VeltisResult.Failure -> {}
            }
        }
    }

    fun clearError() = _uiState.update { it.copy(errorMessage = null) }
}
