package com.marketplace.ai.core.constants

object AppConstants {
    const val BASE_URL = "https://api.marketplace.ai/v1/"
    const val DATABASE_NAME = "marketplace_db"
    const val DATASTORE_NAME = "marketplace_prefs"

    const val PAGE_SIZE = 20
    const val SEARCH_DEBOUNCE_MS = 300L
    const val ANIMATION_DURATION_MS = 300
    const val SHIMMER_DURATION_MS = 1000

    object Prefs {
        const val AUTH_TOKEN = "auth_token"
        const val USER_ID = "user_id"
        const val IS_LOGGED_IN = "is_logged_in"
        const val LANGUAGE = "language"
        const val DARK_MODE = "dark_mode"
    }
}
