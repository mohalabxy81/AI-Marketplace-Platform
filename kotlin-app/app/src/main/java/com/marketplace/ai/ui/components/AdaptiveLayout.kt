package com.marketplace.ai.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.marketplace.ai.domain.model.Listing

enum class DeviceType { PHONE, TABLET, DESKTOP }

fun WindowSizeClass.toDeviceType(): DeviceType = when (widthSizeClass) {
    WindowWidthSizeClass.Compact -> DeviceType.PHONE
    WindowWidthSizeClass.Medium -> DeviceType.TABLET
    WindowWidthSizeClass.Expanded -> DeviceType.DESKTOP
    else -> DeviceType.PHONE
}

object AdaptiveSpacing {
    fun screenPadding(device: DeviceType): Dp = when (device) {
        DeviceType.PHONE -> 16.dp
        DeviceType.TABLET -> 24.dp
        DeviceType.DESKTOP -> 32.dp
    }

    fun cardGap(device: DeviceType): Dp = when (device) {
        DeviceType.PHONE -> 12.dp
        DeviceType.TABLET -> 16.dp
        DeviceType.DESKTOP -> 20.dp
    }

    fun sectionGap(device: DeviceType): Dp = when (device) {
        DeviceType.PHONE -> 16.dp
        DeviceType.TABLET -> 20.dp
        DeviceType.DESKTOP -> 28.dp
    }

    fun contentMaxWidth(device: DeviceType): Dp = when (device) {
        DeviceType.PHONE -> Dp.Unspecified
        DeviceType.TABLET -> 840.dp
        DeviceType.DESKTOP -> 1200.dp
    }

    fun gridColumns(device: DeviceType): Int = when (device) {
        DeviceType.PHONE -> 1
        DeviceType.TABLET -> 2
        DeviceType.DESKTOP -> 3
    }

    fun horizontalCardWidth(device: DeviceType): Dp = when (device) {
        DeviceType.PHONE -> 210.dp
        DeviceType.TABLET -> 240.dp
        DeviceType.DESKTOP -> 280.dp
    }
}

@Composable
fun AdaptiveListingGrid(
    listings: List<Listing>,
    deviceType: DeviceType,
    onListingClick: (String) -> Unit,
    onSaveClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val columns = AdaptiveSpacing.gridColumns(deviceType)
    val gap = AdaptiveSpacing.cardGap(deviceType)
    val padding = AdaptiveSpacing.screenPadding(deviceType)

    if (columns == 1) {
        // Single column for phones
        Column(
            modifier = modifier.padding(horizontal = padding),
            verticalArrangement = Arrangement.spacedBy(gap),
        ) {
            listings.forEachIndexed { index, listing ->
                ListingCard(
                    listing = listing,
                    onClick = { onListingClick(listing.id) },
                    onSaveClick = { onSaveClick(listing.id) },
                    isCompact = true,
                    animateEntry = true,
                    entryIndex = index,
                )
            }
        }
    } else {
        // Multi-column grid for tablet/desktop
        LazyVerticalGrid(
            columns = GridCells.Fixed(columns),
            modifier = modifier
                .padding(horizontal = padding)
                .heightIn(max = (listings.size / columns + 1).coerceAtLeast(1) * 320.dp.value.toInt().dp),
            horizontalArrangement = Arrangement.spacedBy(gap),
            verticalArrangement = Arrangement.spacedBy(gap),
        ) {
            items(listings, key = { it.id }) { listing ->
                ListingCard(
                    listing = listing,
                    onClick = { onListingClick(listing.id) },
                    onSaveClick = { onSaveClick(listing.id) },
                    isCompact = true,
                    animateEntry = true,
                    entryIndex = listings.indexOf(listing),
                )
            }
        }
    }
}

@Composable
fun Modifier.adaptiveMaxWidth(deviceType: DeviceType): Modifier {
    val maxWidth = AdaptiveSpacing.contentMaxWidth(deviceType)
    return if (maxWidth != Dp.Unspecified) {
        this.widthIn(max = maxWidth)
    } else {
        this
    }
}
