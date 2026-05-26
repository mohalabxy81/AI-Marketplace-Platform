package com.marketplace.ai.presentation.map

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import汇 androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.marketplace.ai.domain.model.Listing
import com.marketplace.ai.ui.components.ListingCard

@Composable
fun MapScreen(
    onListingClick: (String) -> Unit,
    viewModel: MapViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()

    // Map Pan & Zoom State
    var scale by remember { mutableFloatStateOf(1f) }
    var offset by remember { mutableStateOf(Offset.Zero) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFE0E5EC)) // Mock map background color
            .pointerInput(Unit) {
                detectTransformGestures { _, pan, zoom, _ ->
                    scale = (scale * zoom).coerceIn(0.5f, 3f)
                    offset += pan
                }
            }
    ) {
        if (state.isLoading) {
            CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
        } else {
            // Mock map grid lines
            MapGrid(modifier = Modifier.graphicsLayer(scaleX = scale, scaleY = scale, translationX = offset.x, translationY = offset.y))

            // Pins layer
            Box(modifier = Modifier
                .fillMaxSize()
                .graphicsLayer(scaleX = scale, scaleY = scale, translationX = offset.x, translationY = offset.y)
            ) {
                // Determine bounding box for scaling
                val minLat = state.listings.minOfOrNull { it.latitude } ?: 0.0
                val maxLat = state.listings.maxOfOrNull { it.latitude } ?: 0.0
                val minLon = state.listings.minOfOrNull { it.longitude } ?: 0.0
                val maxLon = state.listings.maxOfOrNull { it.longitude } ?: 0.0

                val latRange = maxLat - minLat
                val lonRange = maxLon - minLon

                val config = LocalConfiguration.current
                val screenWidth = config.screenWidthDp.dp
                val screenHeight = config.screenHeightDp.dp

                state.listings.forEachIndexed { index, listing ->
                    // Normalize coordinates (0.0 to 1.0)
                    val normX = if (lonRange == 0.0) 0.5 else (listing.longitude - minLon) / lonRange
                    val normY = if (latRange == 0.0) 0.5 else 1.0 - ((listing.latitude - minLat) / latRange) // Invert Y

                    // Apply padding so pins aren't on exact edges
                    val px = (screenWidth.value * 0.8 * normX + screenWidth.value * 0.1).dp
                    val py = (screenHeight.value * 0.6 * normY + screenHeight.value * 0.1).dp

                    // The higher the AI ranking (earlier in list), the more prominent the pin
                    val isTopResult = index < 3
                    val isSelected = state.selectedListing?.id == listing.id

                    MapPin(
                        listing = listing,
                        isTopResult = isTopResult,
                        isSelected = isSelected,
                        modifier = Modifier.offset(x = px, y = py),
                        onClick = { viewModel.selectListing(listing) }
                    )
                }
            }
        }

        // Search/Filter Header overlay
        Surface(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(16.dp)
                .fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            shadowElevation = 4.dp
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Filled.LocationOn, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Explore Nearby", style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold)
            }
        }

        // Bottom Sheet Preview
        AnimatedVisibility(
            visible = state.selectedListing != null,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.align(Alignment.BottomCenter)
        ) {
            state.selectedListing?.let { listing ->
                Box(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                    ListingCard(
                        listing = listing,
                        onClick = { onListingClick(listing.id) },
                        onSaveClick = {},
                        isCompact = false
                    )
                    
                    // Close button for bottom sheet
                    IconButton(
                        onClick = { viewModel.selectListing(null) },
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(8.dp)
                            .background(Color.Black.copy(alpha = 0.5f), CircleShape)
                            .size(32.dp)
                    ) {
                        Icon(Icons.Filled.Close, contentDescription = "Close", tint = Color.White, modifier = Modifier.size(16.dp))
                    }
                }
            }
        }
    }
}

@Composable
fun MapPin(
    listing: Listing,
    isTopResult: Boolean,
    isSelected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val pinColor = if (isSelected) MaterialTheme.colorScheme.primary else if (isTopResult) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.surfaceVariant
    val pinSize = if (isSelected || isTopResult) 48.dp else 36.dp

    Box(
        modifier = modifier
            .size(pinSize)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Surface(
            shape = CircleShape,
            color = pinColor,
            shadowElevation = if (isSelected) 8.dp else 2.dp,
            modifier = Modifier.size(pinSize)
        ) {
            Box(contentAlignment = Alignment.Center) {
                if (isSelected || isTopResult) {
                    Text(
                        text = "$${listing.price.toInt()}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onPrimary,
                        fontWeight = FontWeight.Bold
                    )
                } else {
                    Icon(
                        imageVector = Icons.Filled.LocationOn,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun MapGrid(modifier: Modifier = Modifier) {
    // Draws a simple grid pattern to make it look like a map background
    Box(modifier = modifier.fillMaxSize()) {
        for (i in 0..10) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .offset(y = (i * 100).dp)
                    .background(Color.White.copy(alpha = 0.5f))
            )
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .width(1.dp)
                    .offset(x = (i * 100).dp)
                    .background(Color.White.copy(alpha = 0.5f))
            )
        }
    }
}
