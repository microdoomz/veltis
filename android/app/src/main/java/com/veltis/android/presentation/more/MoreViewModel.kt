package com.veltis.android.presentation.more

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.veltis.android.data.model.*
import com.veltis.android.data.storage.SessionManager
import com.veltis.android.domain.model.VeltisResult
import com.veltis.android.domain.repository.AuthRepository
import com.veltis.android.domain.repository.VeltisAppRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

data class MoreUiState(
    val isLoading: Boolean = false,
    val isSubmitting: Boolean = false,
    val accounts: List<AccountDetailDto> = emptyList(),
    val budgets: List<BudgetDto> = emptyList(),
    val receivables: List<ReceivableDto> = emptyList(),
    val liabilities: List<LiabilityDto> = emptyList(),
    val recurringItems: List<RecurringItemDto> = emptyList(),
    val categories: List<CategoryDto> = emptyList(),
    val totalIncome: Double = 0.0,
    val totalExpenses: Double = 0.0,
    val netCashflow: Double = 0.0,
    val categoryBreakdown: Map<String, Double> = emptyMap(),
    val exportedData: String? = null,
    val exportFormat: String = "xlsx",
    val exportDateRange: String = "all",
    val statementImports: List<StatementImportDto> = emptyList(),
    val selectedImportDetail: ImportDetailDto? = null,
    val activeSessions: List<ActiveSessionDto> = emptyList(),
    val shortcutTokens: List<ShortcutTokenDto> = emptyList(),
    val newlyCreatedToken: CreatedShortcutTokenDto? = null,
    val firstDayOfWeek: String = "sunday",
    val dateFormat: String = "DD/MM/YYYY",
    val isPrivacyMode: Boolean = false,
    val baseCurrency: String = "USD",
    val userName: String? = null,
    val userEmail: String? = null,
    val errorMessage: String? = null,
    val successMessage: String? = null
)

class MoreViewModel(
    private val repository: VeltisAppRepository,
    private val authRepository: AuthRepository,
    private val sessionManager: SessionManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        MoreUiState(
            isPrivacyMode = sessionManager.getPrivacyMode(),
            baseCurrency = sessionManager.getBaseCurrency(),
            userName = sessionManager.getUser()?.name ?: "Veltis User",
            userEmail = sessionManager.getUser()?.email
        )
    )
    val uiState: StateFlow<MoreUiState> = _uiState.asStateFlow()

    init {
        loadAllData()
    }

    fun loadAccounts() {
        viewModelScope.launch {
            when (val res = repository.getAccounts()) {
                is VeltisResult.Success -> _uiState.update { it.copy(accounts = res.data) }
                is VeltisResult.Failure -> {}
            }
        }
    }

    fun loadAllData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null, baseCurrency = sessionManager.getBaseCurrency()) }

            launch {
                when (val res = repository.getAccounts()) {
                    is VeltisResult.Success -> _uiState.update { it.copy(accounts = res.data) }
                    is VeltisResult.Failure -> {}
                }
            }
            launch {
                when (val res = repository.getBudgets()) {
                    is VeltisResult.Success -> _uiState.update { it.copy(budgets = res.data) }
                    is VeltisResult.Failure -> {}
                }
            }
            launch {
                when (val res = repository.getReceivables()) {
                    is VeltisResult.Success -> _uiState.update { it.copy(receivables = res.data) }
                    is VeltisResult.Failure -> {}
                }
            }
            launch {
                when (val res = repository.getLiabilities()) {
                    is VeltisResult.Success -> _uiState.update { it.copy(liabilities = res.data) }
                    is VeltisResult.Failure -> {}
                }
            }
            launch {
                when (val res = repository.getRecurringItems()) {
                    is VeltisResult.Success -> _uiState.update { it.copy(recurringItems = res.data) }
                    is VeltisResult.Failure -> {}
                }
            }
            launch {
                when (val res = repository.getCategories()) {
                    is VeltisResult.Success -> _uiState.update { it.copy(categories = res.data) }
                    is VeltisResult.Failure -> {}
                }
            }
            launch {
                when (val res = repository.getTransactions()) {
                    is VeltisResult.Success -> {
                        val txns = res.data
                        val inc = txns.filter { it.type.equals("income", ignoreCase = true) }.sumOf { it.amount }
                        val exp = txns.filter { it.type.equals("expense", ignoreCase = true) }.sumOf { it.amount }
                        val breakdown = txns
                            .filter { it.type.equals("expense", ignoreCase = true) }
                            .groupBy { it.categoryName ?: "General" }
                            .mapValues { entry -> entry.value.sumOf { it.amount } }

                        _uiState.update {
                            it.copy(
                                totalIncome = inc,
                                totalExpenses = exp,
                                netCashflow = inc - exp,
                                categoryBreakdown = breakdown
                            )
                        }
                    }
                    is VeltisResult.Failure -> {}
                }
            }
            launch {
                when (val res = repository.getStatementImports()) {
                    is VeltisResult.Success -> _uiState.update { it.copy(statementImports = res.data) }
                    is VeltisResult.Failure -> {}
                }
            }
            launch {
                when (val res = repository.getActiveSessions()) {
                    is VeltisResult.Success -> _uiState.update { it.copy(activeSessions = res.data) }
                    is VeltisResult.Failure -> {}
                }
            }
            launch {
                when (val res = repository.getShortcutTokens()) {
                    is VeltisResult.Success -> _uiState.update { it.copy(shortcutTokens = res.data) }
                    is VeltisResult.Failure -> {}
                }
            }

            _uiState.update { it.copy(isLoading = false) }
        }
    }

    fun createRecurringItem(
        type: String,
        name: String,
        amount: Double,
        currency: String,
        customDay: Int,
        categoryId: String?,
        defaultAccountId: String?,
        destinationAccountId: String?,
        onSuccess: () -> Unit = {}
    ) {
        if (amount <= 0) {
            _uiState.update { it.copy(errorMessage = "Amount must be positive.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }
            when (val res = repository.createRecurringItem(
                type = type,
                name = name,
                amount = amount,
                currency = currency,
                customDay = customDay,
                categoryId = categoryId,
                defaultAccountId = defaultAccountId,
                destinationAccountId = destinationAccountId
            )) {
                is VeltisResult.Success -> {
                    _uiState.update { it.copy(isSubmitting = false, successMessage = "Recurring item created!") }
                    when (val rRes = repository.getRecurringItems()) {
                        is VeltisResult.Success -> _uiState.update { it.copy(recurringItems = rRes.data) }
                        is VeltisResult.Failure -> {}
                    }
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSubmitting = false, errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun deleteRecurringItem(id: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }
            when (val res = repository.deleteRecurringItem(id)) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            recurringItems = it.recurringItems.filter { r -> r.id != id },
                            successMessage = "Recurring schedule deleted."
                        )
                    }
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSubmitting = false, errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun confirmRecurringOccurrence(
        occurrenceId: String,
        accountId: String,
        actualDateStr: String? = null,
        actualAmount: Double? = null,
        destinationAccountId: String? = null,
        onSuccess: () -> Unit = {}
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }
            when (val res = repository.confirmRecurringOccurrence(
                occurrenceId = occurrenceId,
                accountId = accountId,
                actualDateStr = actualDateStr,
                actualAmount = actualAmount,
                destinationAccountId = destinationAccountId
            )) {
                is VeltisResult.Success -> {
                    _uiState.update { it.copy(isSubmitting = false, successMessage = "Occurrence confirmed & applied!") }
                    when (val rRes = repository.getRecurringItems()) {
                        is VeltisResult.Success -> _uiState.update { it.copy(recurringItems = rRes.data) }
                        is VeltisResult.Failure -> {}
                    }
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSubmitting = false, errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun skipRecurringOccurrence(occurrenceId: String, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }
            when (val res = repository.skipRecurringOccurrence(occurrenceId)) {
                is VeltisResult.Success -> {
                    _uiState.update { it.copy(isSubmitting = false, successMessage = "Occurrence skipped for this month.") }
                    when (val rRes = repository.getRecurringItems()) {
                        is VeltisResult.Success -> _uiState.update { it.copy(recurringItems = rRes.data) }
                        is VeltisResult.Failure -> {}
                    }
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSubmitting = false, errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun togglePrivacyMode() {
        val next = !_uiState.value.isPrivacyMode
        sessionManager.setPrivacyMode(next)
        _uiState.update { it.copy(isPrivacyMode = next) }
    }

    fun createBudget(
        categoryId: String,
        amount: Double,
        currency: String,
        start: String,
        end: String,
        onSuccess: () -> Unit = {}
    ) {
        if (amount <= 0) {
            _uiState.update { it.copy(errorMessage = "Budget amount must be positive.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }
            when (val res = repository.createBudget(categoryId, amount, currency, start, end)) {
                is VeltisResult.Success -> {
                    _uiState.update { it.copy(isSubmitting = false, successMessage = "Budget created successfully!") }
                    when (val bRes = repository.getBudgets()) {
                        is VeltisResult.Success -> _uiState.update { it.copy(budgets = bRes.data) }
                        is VeltisResult.Failure -> {}
                    }
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSubmitting = false, errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun deleteBudget(id: String) {
        viewModelScope.launch {
            when (val res = repository.deleteBudget(id)) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            budgets = it.budgets.filter { b -> b.id != id },
                            successMessage = "Budget removed."
                        )
                    }
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun createLiability(
        counterpartyName: String,
        liabilityType: String,
        amount: Double,
        currency: String,
        createdDate: String?,
        dueDate: String?,
        destAccountId: String?,
        note: String?,
        onSuccess: () -> Unit = {}
    ) {
        if (counterpartyName.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Counterparty name is required.") }
            return
        }
        if (amount <= 0) {
            _uiState.update { it.copy(errorMessage = "Amount must be positive.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }
            when (val res = repository.createLiability(
                counterpartyName = counterpartyName,
                liabilityType = liabilityType,
                amount = amount,
                currency = currency,
                createdDate = createdDate,
                dueDate = dueDate,
                destAccountId = destAccountId,
                note = note
            )) {
                is VeltisResult.Success -> {
                    _uiState.update { it.copy(isSubmitting = false, successMessage = "Liability recorded successfully!") }
                    when (val lRes = repository.getLiabilities()) {
                        is VeltisResult.Success -> _uiState.update { it.copy(liabilities = lRes.data) }
                        is VeltisResult.Failure -> {}
                    }
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSubmitting = false, errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun payLiability(
        id: String,
        accountId: String,
        amount: Double,
        paidAt: String?,
        onSuccess: () -> Unit = {}
    ) {
        if (amount <= 0) {
            _uiState.update { it.copy(errorMessage = "Payment amount must be positive.") }
            return
        }
        if (accountId.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Please select a payment account.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }
            when (val res = repository.payLiability(id, accountId, amount, paidAt)) {
                is VeltisResult.Success -> {
                    _uiState.update { it.copy(isSubmitting = false, successMessage = "Payment recorded successfully!") }
                    when (val lRes = repository.getLiabilities()) {
                        is VeltisResult.Success -> _uiState.update { it.copy(liabilities = lRes.data) }
                        is VeltisResult.Failure -> {}
                    }
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSubmitting = false, errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun createReceivable(
        counterpartyName: String,
        amount: Double,
        currency: String,
        createdDate: String?,
        expectedDate: String?,
        sourceAccountId: String?,
        note: String?,
        onSuccess: () -> Unit = {}
    ) {
        if (counterpartyName.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Debtor / Counterparty name is required.") }
            return
        }
        if (amount <= 0) {
            _uiState.update { it.copy(errorMessage = "Amount must be positive.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }
            when (val res = repository.createReceivable(
                counterpartyName = counterpartyName,
                amount = amount,
                currency = currency,
                createdDate = createdDate,
                expectedDate = expectedDate,
                sourceAccountId = sourceAccountId,
                note = note
            )) {
                is VeltisResult.Success -> {
                    _uiState.update { it.copy(isSubmitting = false, successMessage = "Receivable recorded successfully!") }
                    when (val rRes = repository.getReceivables()) {
                        is VeltisResult.Success -> _uiState.update { it.copy(receivables = rRes.data) }
                        is VeltisResult.Failure -> {}
                    }
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSubmitting = false, errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun settleReceivable(
        id: String,
        accountId: String,
        amount: Double,
        settledAt: String?,
        onSuccess: () -> Unit = {}
    ) {
        if (amount <= 0) {
            _uiState.update { it.copy(errorMessage = "Settlement amount must be positive.") }
            return
        }
        if (accountId.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Please select a deposit account.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }
            when (val res = repository.settleReceivable(id, accountId, amount, settledAt)) {
                is VeltisResult.Success -> {
                    _uiState.update { it.copy(isSubmitting = false, successMessage = "Settlement recorded successfully!") }
                    when (val rRes = repository.getReceivables()) {
                        is VeltisResult.Success -> _uiState.update { it.copy(receivables = rRes.data) }
                        is VeltisResult.Failure -> {}
                    }
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSubmitting = false, errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun exportData(format: String, onDone: (String) -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }
            when (val res = repository.exportData(format)) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            successMessage = "Export generated successfully (${format.uppercase()})!",
                            exportedData = res.data
                        )
                    }
                    onDone(res.data)
                }
                is VeltisResult.Failure -> {
                    _uiState.update {
                        it.copy(isSubmitting = false, errorMessage = res.error.userFriendlyMessage())
                    }
                }
            }
        }
    }

    fun logout(onLoggedOut: () -> Unit) {
        viewModelScope.launch {
            authRepository.signOut()
            sessionManager.clearSession()
            onLoggedOut()
        }
    }

    fun deleteAccount(onDeleted: () -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            when (val res = repository.deleteUserAccount()) {
                is VeltisResult.Success -> {
                    authRepository.signOut()
                    sessionManager.clearSession()
                    onDeleted()
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSubmitting = false, errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun updateBaseCurrency(currency: String, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            sessionManager.saveBaseCurrency(currency)
            _uiState.update { it.copy(baseCurrency = currency) }
            when (val res = repository.updateWorkspaceProfile(baseCurrency = currency)) {
                is VeltisResult.Success -> {
                    _uiState.update { it.copy(isSubmitting = false, successMessage = "Base currency updated to $currency.") }
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    // Saved locally regardless
                    _uiState.update { it.copy(isSubmitting = false, successMessage = "Base currency set to $currency.") }
                    onSuccess()
                }
            }
        }
    }

    fun updateProfile(name: String, workspaceName: String, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            sessionManager.saveUserName(name)
            _uiState.update { it.copy(userName = name) }
            when (val res = repository.updateWorkspaceProfile(name = workspaceName)) {
                is VeltisResult.Success -> {
                    _uiState.update { it.copy(isSubmitting = false, successMessage = "Profile updated successfully.") }
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSubmitting = false, successMessage = "Profile preferences saved.") }
                    onSuccess()
                }
            }
        }
    }

    fun createCategory(name: String, type: String = "expense", iconKey: String? = null, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            when (val res = repository.createCategory(name = name, type = type, iconKey = iconKey)) {
                is VeltisResult.Success -> {
                    _uiState.update { it.copy(isSubmitting = false, successMessage = "Category created successfully.") }
                    when (val catRes = repository.getCategories()) {
                        is VeltisResult.Success -> _uiState.update { it.copy(categories = catRes.data) }
                        is VeltisResult.Failure -> {}
                    }
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSubmitting = false, errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun deleteCategory(id: String, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            when (val res = repository.deleteCategory(id)) {
                is VeltisResult.Success -> {
                    _uiState.update { it.copy(isSubmitting = false, successMessage = "Category removed.") }
                    when (val catRes = repository.getCategories()) {
                        is VeltisResult.Success -> _uiState.update { it.copy(categories = catRes.data) }
                        is VeltisResult.Failure -> {}
                    }
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSubmitting = false, errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun changePassword(currentPass: String, newPass: String, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            when (val res = repository.changePassword(currentPass, newPass)) {
                is VeltisResult.Success -> {
                    _uiState.update { it.copy(isSubmitting = false, successMessage = "Password updated successfully.") }
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSubmitting = false, errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun setExportFormat(format: String) {
        _uiState.update { it.copy(exportFormat = format) }
    }

    fun setExportDateRange(range: String) {
        _uiState.update { it.copy(exportDateRange = range) }
    }

    fun setFirstDayOfWeek(day: String) {
        _uiState.update { it.copy(firstDayOfWeek = day) }
    }

    fun setDateFormat(format: String) {
        _uiState.update { it.copy(dateFormat = format) }
    }

    fun exportDataWithFilters(format: String, dateRange: String, onDone: (String) -> Unit = {}) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }

            val cal = Calendar.getInstance()
            val now = cal.time
            val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }

            var startDateStr: String? = null
            var endDateStr: String? = null

            when (dateRange) {
                "last30" -> {
                    val past = Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, -30) }
                    startDateStr = isoFormat.format(past.time)
                    endDateStr = isoFormat.format(now)
                }
                "this_month" -> {
                    val start = Calendar.getInstance().apply { set(Calendar.DAY_OF_MONTH, 1); set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0) }
                    startDateStr = isoFormat.format(start.time)
                    endDateStr = isoFormat.format(now)
                }
                "last_month" -> {
                    val start = Calendar.getInstance().apply {
                        add(Calendar.MONTH, -1)
                        set(Calendar.DAY_OF_MONTH, 1)
                        set(Calendar.HOUR_OF_DAY, 0)
                        set(Calendar.MINUTE, 0)
                    }
                    val end = Calendar.getInstance().apply {
                        set(Calendar.DAY_OF_MONTH, 1)
                        add(Calendar.DAY_OF_YEAR, -1)
                        set(Calendar.HOUR_OF_DAY, 23)
                        set(Calendar.MINUTE, 59)
                    }
                    startDateStr = isoFormat.format(start.time)
                    endDateStr = isoFormat.format(end.time)
                }
                "thisYear" -> {
                    val start = Calendar.getInstance().apply {
                        set(Calendar.MONTH, Calendar.JANUARY)
                        set(Calendar.DAY_OF_MONTH, 1)
                        set(Calendar.HOUR_OF_DAY, 0)
                        set(Calendar.MINUTE, 0)
                    }
                    startDateStr = isoFormat.format(start.time)
                    endDateStr = isoFormat.format(now)
                }
                "lastYear" -> {
                    val start = Calendar.getInstance().apply {
                        add(Calendar.YEAR, -1)
                        set(Calendar.MONTH, Calendar.JANUARY)
                        set(Calendar.DAY_OF_MONTH, 1)
                    }
                    val end = Calendar.getInstance().apply {
                        add(Calendar.YEAR, -1)
                        set(Calendar.MONTH, Calendar.DECEMBER)
                        set(Calendar.DAY_OF_MONTH, 31)
                    }
                    startDateStr = isoFormat.format(start.time)
                    endDateStr = isoFormat.format(end.time)
                }
            }

            when (val res = repository.exportDataWithFilters(format, startDateStr, endDateStr)) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            successMessage = "Export generated successfully (${format.uppercase()})!",
                            exportedData = res.data
                        )
                    }
                    onDone(res.data)
                }
                is VeltisResult.Failure -> {
                    _uiState.update {
                        it.copy(isSubmitting = false, errorMessage = res.error.userFriendlyMessage())
                    }
                }
            }
        }
    }

    fun loadStatementImports() {
        viewModelScope.launch {
            when (val res = repository.getStatementImports()) {
                is VeltisResult.Success -> _uiState.update { it.copy(statementImports = res.data) }
                is VeltisResult.Failure -> {}
            }
        }
    }

    fun deleteStatementImport(id: String, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            when (val res = repository.deleteStatementImport(id)) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            statementImports = it.statementImports.filter { imp -> imp.id != id },
                            successMessage = "Statement batch deleted."
                        )
                    }
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSubmitting = false, errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun loadStatementImportDetails(id: String, onLoaded: (ImportDetailDto) -> Unit = {}) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            when (val res = repository.getStatementImportDetails(id)) {
                is VeltisResult.Success -> {
                    _uiState.update { it.copy(isSubmitting = false, selectedImportDetail = res.data) }
                    onLoaded(res.data)
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSubmitting = false, errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun commitImportRows(
        id: String,
        action: String = "accept",
        rowIds: List<String>? = null,
        onSuccess: () -> Unit = {}
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            when (val res = repository.commitImportRows(id, action, rowIds)) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            successMessage = if (action == "accept") "Import rows committed to ledger!" else "Import rows rejected."
                        )
                    }
                    loadStatementImports()
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSubmitting = false, errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun uploadStatement(
        accountId: String,
        fileBytes: ByteArray,
        filename: String,
        isReferenceOnly: Boolean = false,
        onSuccess: (String) -> Unit = {}
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }
            when (val res = repository.uploadStatement(accountId, fileBytes, filename, isReferenceOnly)) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            successMessage = "Statement uploaded and parsed successfully!"
                        )
                    }
                    loadStatementImports()
                    onSuccess(res.data)
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSubmitting = false, errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun loadActiveSessions() {
        viewModelScope.launch {
            when (val res = repository.getActiveSessions()) {
                is VeltisResult.Success -> _uiState.update { it.copy(activeSessions = res.data) }
                is VeltisResult.Failure -> {}
            }
        }
    }

    fun revokeOtherSessions(onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            when (val res = repository.revokeOtherSessions()) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            successMessage = "Other active device sessions revoked."
                        )
                    }
                    loadActiveSessions()
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSubmitting = false, errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun loadShortcutTokens() {
        viewModelScope.launch {
            when (val res = repository.getShortcutTokens()) {
                is VeltisResult.Success -> _uiState.update { it.copy(shortcutTokens = res.data) }
                is VeltisResult.Failure -> {}
            }
        }
    }

    fun createShortcutToken(name: String, onSuccess: (CreatedShortcutTokenDto) -> Unit = {}) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            when (val res = repository.createShortcutToken(name)) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            newlyCreatedToken = res.data,
                            successMessage = "Shortcut webhook token created!"
                        )
                    }
                    loadShortcutTokens()
                    onSuccess(res.data)
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSubmitting = false, errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun revokeShortcutToken(tokenId: String, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            when (val res = repository.revokeShortcutToken(tokenId)) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            shortcutTokens = it.shortcutTokens.filter { t -> t.id != tokenId },
                            successMessage = "Shortcut token revoked."
                        )
                    }
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSubmitting = false, errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun clearMessages() = _uiState.update { it.copy(errorMessage = null, successMessage = null) }

}
