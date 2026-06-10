package com.marketplace.ai.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.marketplace.ai.data.local.dao.ListingDao
import com.marketplace.ai.data.local.dao.UserDao
import com.marketplace.ai.data.local.entity.ListingEntity
import com.marketplace.ai.data.local.entity.SavedItemEntity
import com.marketplace.ai.data.local.entity.UserEntity

@Database(
    entities = [
        ListingEntity::class,
        UserEntity::class,
        SavedItemEntity::class,
    ],
    version = 1,
    exportSchema = false,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun listingDao(): ListingDao
    abstract fun userDao(): UserDao
}
