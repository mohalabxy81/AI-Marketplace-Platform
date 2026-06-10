package com.marketplace.ai.core.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore
import androidx.room.Room
import com.marketplace.ai.core.constants.AppConstants
import com.marketplace.ai.data.local.AppDatabase
import com.marketplace.ai.data.local.dao.ListingDao
import com.marketplace.ai.data.local.dao.UserDao
import com.marketplace.ai.data.repository.AiFeedRepositoryImpl
import com.marketplace.ai.data.repository.AuthRepositoryImpl
import com.marketplace.ai.data.repository.ListingRepositoryImpl
import com.marketplace.ai.domain.repository.AiFeedRepository
import com.marketplace.ai.domain.repository.AuthRepository
import com.marketplace.ai.domain.repository.ListingRepository
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = AppConstants.DATASTORE_NAME)

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase {
        return Room.databaseBuilder(context, AppDatabase::class.java, AppConstants.DATABASE_NAME)
            .fallbackToDestructiveMigration()
            .build()
    }

    @Provides
    fun provideListingDao(db: AppDatabase): ListingDao = db.listingDao()

    @Provides
    fun provideUserDao(db: AppDatabase): UserDao = db.userDao()

    @Provides
    @Singleton
    fun provideDataStore(@ApplicationContext context: Context): DataStore<Preferences> = context.dataStore
}

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds
    @Singleton
    abstract fun bindAuthRepository(impl: AuthRepositoryImpl): AuthRepository

    @Binds
    @Singleton
    abstract fun bindListingRepository(impl: ListingRepositoryImpl): ListingRepository

    @Binds
    @Singleton
    abstract fun bindAiFeedRepository(impl: AiFeedRepositoryImpl): AiFeedRepository
}
