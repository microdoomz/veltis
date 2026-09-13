package com.veltis.android.data.storage

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

data class OfflineTransactionEntity(
    val id: String,
    val type: String, // 'expense', 'income', 'transfer'
    val amount: Double,
    val accountId: String,
    val sourceAccountId: String? = null,
    val destAccountId: String? = null,
    val description: String? = null,
    val categoryId: String? = null,
    val currency: String? = null,
    val transactionDate: String,
    val syncStatus: String = "pending", // 'pending', 'synced', 'failed'
    val errorMessage: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)

class VeltisDatabaseHelper(context: Context) : SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE $TABLE_OFFLINE_TXNS (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                amount REAL NOT NULL,
                account_id TEXT NOT NULL,
                source_account_id TEXT,
                dest_account_id TEXT,
                description TEXT,
                category_id TEXT,
                currency TEXT,
                transaction_date TEXT NOT NULL,
                sync_status TEXT NOT NULL,
                error_message TEXT,
                created_at INTEGER NOT NULL
            )
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE $TABLE_CACHE (
                cache_key TEXT PRIMARY KEY,
                json_data TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            )
        """.trimIndent())
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS $TABLE_OFFLINE_TXNS")
        db.execSQL("DROP TABLE IF EXISTS $TABLE_CACHE")
        onCreate(db)
    }

    fun insertOfflineTransaction(txn: OfflineTransactionEntity) {
        val db = writableDatabase
        val values = ContentValues().apply {
            put("id", txn.id)
            put("type", txn.type)
            put("amount", txn.amount)
            put("account_id", txn.accountId)
            put("source_account_id", txn.sourceAccountId)
            put("dest_account_id", txn.destAccountId)
            put("description", txn.description)
            put("category_id", txn.categoryId)
            put("currency", txn.currency)
            put("transaction_date", txn.transactionDate)
            put("sync_status", txn.syncStatus)
            put("error_message", txn.errorMessage)
            put("created_at", txn.createdAt)
        }
        db.insertWithOnConflict(TABLE_OFFLINE_TXNS, null, values, SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun getPendingTransactions(): List<OfflineTransactionEntity> {
        val list = mutableListOf<OfflineTransactionEntity>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT * FROM $TABLE_OFFLINE_TXNS WHERE sync_status = 'pending' ORDER BY created_at ASC",
            null
        )
        cursor.use {
            while (it.moveToNext()) {
                list.add(
                    OfflineTransactionEntity(
                        id = it.getString(it.getColumnIndexOrThrow("id")),
                        type = it.getString(it.getColumnIndexOrThrow("type")),
                        amount = it.getDouble(it.getColumnIndexOrThrow("amount")),
                        accountId = it.getString(it.getColumnIndexOrThrow("account_id")),
                        sourceAccountId = it.getString(it.getColumnIndexOrThrow("source_account_id")),
                        destAccountId = it.getString(it.getColumnIndexOrThrow("dest_account_id")),
                        description = it.getString(it.getColumnIndexOrThrow("description")),
                        categoryId = it.getString(it.getColumnIndexOrThrow("category_id")),
                        currency = it.getString(it.getColumnIndexOrThrow("currency")),
                        transactionDate = it.getString(it.getColumnIndexOrThrow("transaction_date")),
                        syncStatus = it.getString(it.getColumnIndexOrThrow("sync_status")),
                        errorMessage = it.getString(it.getColumnIndexOrThrow("error_message")),
                        createdAt = it.getLong(it.getColumnIndexOrThrow("created_at"))
                    )
                )
            }
        }
        return list
    }

    fun updateSyncStatus(id: String, status: String, errorMessage: String? = null) {
        val db = writableDatabase
        val values = ContentValues().apply {
            put("sync_status", status)
            put("error_message", errorMessage)
        }
        db.update(TABLE_OFFLINE_TXNS, values, "id = ?", arrayOf(id))
    }

    fun getAllOfflineTransactions(): List<OfflineTransactionEntity> {
        val list = mutableListOf<OfflineTransactionEntity>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT * FROM $TABLE_OFFLINE_TXNS ORDER BY created_at DESC LIMIT 100",
            null
        )
        cursor.use {
            while (it.moveToNext()) {
                list.add(
                    OfflineTransactionEntity(
                        id = it.getString(it.getColumnIndexOrThrow("id")),
                        type = it.getString(it.getColumnIndexOrThrow("type")),
                        amount = it.getDouble(it.getColumnIndexOrThrow("amount")),
                        accountId = it.getString(it.getColumnIndexOrThrow("account_id")),
                        sourceAccountId = it.getString(it.getColumnIndexOrThrow("source_account_id")),
                        destAccountId = it.getString(it.getColumnIndexOrThrow("dest_account_id")),
                        description = it.getString(it.getColumnIndexOrThrow("description")),
                        categoryId = it.getString(it.getColumnIndexOrThrow("category_id")),
                        currency = it.getString(it.getColumnIndexOrThrow("currency")),
                        transactionDate = it.getString(it.getColumnIndexOrThrow("transaction_date")),
                        syncStatus = it.getString(it.getColumnIndexOrThrow("sync_status")),
                        errorMessage = it.getString(it.getColumnIndexOrThrow("error_message")),
                        createdAt = it.getLong(it.getColumnIndexOrThrow("created_at"))
                    )
                )
            }
        }
        return list
    }

    fun saveCache(key: String, json: String) {
        val db = writableDatabase
        val values = ContentValues().apply {
            put("cache_key", key)
            put("json_data", json)
            put("updated_at", System.currentTimeMillis())
        }
        db.insertWithOnConflict(TABLE_CACHE, null, values, SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun getCache(key: String): String? {
        val db = readableDatabase
        val cursor = db.rawQuery("SELECT json_data FROM $TABLE_CACHE WHERE cache_key = ?", arrayOf(key))
        cursor.use {
            if (it.moveToFirst()) {
                return it.getString(0)
            }
        }
        return null
    }

    fun deleteCache(key: String) {
        val db = writableDatabase
        db.delete(TABLE_CACHE, "cache_key = ?", arrayOf(key))
    }

    fun deleteCaches(vararg keys: String) {
        val db = writableDatabase
        for (key in keys) {
            db.delete(TABLE_CACHE, "cache_key = ?", arrayOf(key))
        }
    }

    companion object {
        private const val DATABASE_NAME = "veltis_local.db"
        private const val DATABASE_VERSION = 1
        private const val TABLE_OFFLINE_TXNS = "offline_transactions"
        private const val TABLE_CACHE = "cached_blobs"
    }
}
