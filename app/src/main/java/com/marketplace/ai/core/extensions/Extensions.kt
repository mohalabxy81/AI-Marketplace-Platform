package com.marketplace.ai.core.extensions

import java.text.NumberFormat
import java.util.Calendar
import java.util.Currency
import java.util.Locale

fun Double.toCurrencyString(currencyCode: String = "USD"): String {
    val format = NumberFormat.getCurrencyInstance().apply {
        currency = Currency.getInstance(currencyCode)
        maximumFractionDigits = 0
    }
    return format.format(this)
}

fun Long.toRelativeTimeString(): String {
    val now = System.currentTimeMillis()
    val diff = now - this
    val seconds = diff / 1000
    val minutes = seconds / 60
    val hours = minutes / 60
    val days = hours / 24

    return when {
        days > 30 -> "${days / 30}mo ago"
        days > 0 -> "${days}d ago"
        hours > 0 -> "${hours}h ago"
        minutes > 0 -> "${minutes}m ago"
        else -> "Just now"
    }
}

fun getGreetingKey(): String {
    val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
    return when {
        hour < 12 -> "morning"
        hour < 17 -> "afternoon"
        else -> "evening"
    }
}

fun String.isValidEmail(): Boolean {
    return android.util.Patterns.EMAIL_ADDRESS.matcher(this).matches()
}

fun String.isValidPassword(): Boolean {
    return this.length >= 8
}
