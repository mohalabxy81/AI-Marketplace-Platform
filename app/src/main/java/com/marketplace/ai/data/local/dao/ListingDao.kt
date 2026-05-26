package com.marketplace.ai.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.marketplace.ai.data.local.entity.ListingEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ListingDao {
    @Query("SELECT * FROM listings ORDER BY createdAt DESC")
    fun getAllListings(): Flow<List<ListingEntity>>

    @Query("SELECT * FROM listings WHERE contentType = :type ORDER BY createdAt DESC")
    fun getListingsByType(type: String): Flow<List<ListingEntity>>

    @Query("SELECT * FROM listings WHERE id = :id")
    fun getListingById(id: String): Flow<ListingEntity?>

    @Query("SELECT * FROM listings WHERE title LIKE '%' || :query || '%' OR description LIKE '%' || :query || '%' ORDER BY createdAt DESC")
    fun searchListings(query: String): Flow<List<ListingEntity>>

    @Query("SELECT * FROM listings WHERE isSaved = 1 ORDER BY createdAt DESC")
    fun getSavedListings(): Flow<List<ListingEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertListings(listings: List<ListingEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertListing(listing: ListingEntity)

    @Query("UPDATE listings SET isSaved = :isSaved WHERE id = :id")
    suspend fun updateSaveStatus(id: String, isSaved: Boolean)

    @Query("DELETE FROM listings")
    suspend fun deleteAll()
}
