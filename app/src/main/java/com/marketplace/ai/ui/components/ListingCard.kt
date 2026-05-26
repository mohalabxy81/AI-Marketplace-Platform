package com.marketplace.ai.ui.components

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.BrokenImage
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.SubcomposeAsyncImage
import com.marketplace.ai.core.extensions.toCurrencyString
import com.marketplace.ai.domain.model.ContentType
import com.marketplace.ai.domain.model.Listing
import com.marketplace.ai.ui.theme.*

@Composable
fun ListingCard(
    listing: Listing,
    onClick: () -> Unit,
    onSaveClick: () -> Unit,
    modifier: Modifier = Modifier,
    isCompact: Boolean = true,
    animateEntry: Boolean = false,
    entryIndex: Int = 0,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.97f else 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
        label = "card_press_scale",
    )

    // Animate entry
    var visible by remember { mutableStateOf(!animateEntry) }
    LaunchedEffect(Unit) { visible = true }

    val alpha by animateFloatAsState(
        targetValue = if (visible) 1f else 0f,
        animationSpec = tween(300, delayMillis = entryIndex * 60, easing = FastOutSlowInEasing),
        label = "card_alpha",
    )
    val offsetY by animateFloatAsState(
        targetValue = if (visible) 0f else 30f,
        animationSpec = tween(350, delayMillis = entryIndex * 60, easing = FastOutSlowInEasing),
        label = "card_offset",
    )

    Card(
        modifier = modifier
            .fillMaxWidth()
            .scale(scale)
            .graphicsLayer {
                this.alpha = alpha
                this.translationY = offsetY
            },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(
            defaultElevation = 2.dp,
            pressedElevation = 0.dp,
        ),
        onClick = onClick,
        interactionSource = interactionSource,
    ) {
        if (isCompact) CompactCardContent(listing, onSaveClick)
        else DetailedCardContent(listing, onSaveClick)
    }
}

@Composable
private fun CompactCardContent(listing: Listing, onSaveClick: () -> Unit) {
    Column {
        Box {
            ListingImage(
                url = listing.imageUrls.firstOrNull(),
                contentDescription = listing.title,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)),
            )
            // Gradient overlay at bottom of image
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(60.dp)
                    .align(Alignment.BottomCenter)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.3f)),
                        ),
                    ),
            )
            ContentTypeBadge(
                contentType = listing.contentType,
                modifier = Modifier.align(Alignment.TopStart).padding(10.dp),
            )
            AnimatedSaveButton(
                isSaved = listing.isSaved,
                onClick = onSaveClick,
                modifier = Modifier.align(Alignment.TopEnd).padding(4.dp),
                tintOnUnsaved = Color.White,
            )
        }
        Column(modifier = Modifier.padding(14.dp)) {
            Text(
                text = listing.title,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(modifier = Modifier.height(6.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.LocationOn, null, modifier = Modifier.size(13.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.width(3.dp))
                Text(listing.location, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Spacer(modifier = Modifier.height(10.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    text = listing.price.toCurrencyString(listing.currency),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                )
                RatingChip(rating = listing.rating, reviewCount = listing.reviewCount)
            }
        }
    }
}

@Composable
private fun DetailedCardContent(listing: Listing, onSaveClick: () -> Unit) {
    Row(modifier = Modifier.height(IntrinsicSize.Min)) {
        Box {
            ListingImage(
                url = listing.imageUrls.firstOrNull(),
                contentDescription = listing.title,
                modifier = Modifier
                    .width(150.dp)
                    .fillMaxHeight()
                    .clip(RoundedCornerShape(topStart = 16.dp, bottomStart = 16.dp)),
            )
        }
        Column(modifier = Modifier.padding(14.dp).weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                ContentTypeBadge(listing.contentType)
                Spacer(modifier = Modifier.weight(1f))
                AnimatedSaveButton(
                    isSaved = listing.isSaved,
                    onClick = onSaveClick,
                    modifier = Modifier.size(32.dp),
                )
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(listing.title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Spacer(modifier = Modifier.height(4.dp))
            Text(listing.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Spacer(modifier = Modifier.weight(1f))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(listing.price.toCurrencyString(listing.currency), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                Spacer(modifier = Modifier.weight(1f))
                RatingChip(rating = listing.rating, reviewCount = listing.reviewCount)
            }
        }
    }
}

@Composable
fun AnimatedSaveButton(
    isSaved: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    tintOnUnsaved: Color = MaterialTheme.colorScheme.onSurfaceVariant,
) {
    val scale by animateFloatAsState(
        targetValue = if (isSaved) 1.2f else 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMedium),
        label = "save_bounce",
    )

    IconButton(onClick = onClick, modifier = modifier) {
        Icon(
            imageVector = if (isSaved) Icons.Filled.Bookmark else Icons.Outlined.BookmarkBorder,
            contentDescription = if (isSaved) "Saved" else "Save",
            tint = if (isSaved) Amber600 else tintOnUnsaved,
            modifier = Modifier.scale(scale),
        )
    }
}

@Composable
fun RatingChip(rating: Float, reviewCount: Int) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Filled.Star, null, modifier = Modifier.size(12.dp), tint = Amber500)
            Spacer(modifier = Modifier.width(2.dp))
            Text("$rating", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold)
            if (reviewCount > 0) {
                Text(" ($reviewCount)", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
fun ListingImage(
    url: String?,
    contentDescription: String,
    modifier: Modifier = Modifier,
) {
    SubcomposeAsyncImage(
        model = url,
        contentDescription = contentDescription,
        modifier = modifier,
        contentScale = ContentScale.Crop,
        loading = {
            ShimmerEffect(modifier = Modifier.matchParentSize())
        },
        error = {
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .background(MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Outlined.BrokenImage,
                    contentDescription = "Failed to load",
                    modifier = Modifier.size(32.dp),
                    tint = MaterialTheme.colorScheme.outline,
                )
            }
        },
    )
}

@Composable
fun ContentTypeBadge(contentType: ContentType, modifier: Modifier = Modifier) {
    val (color, label) = when (contentType) {
        ContentType.REAL_ESTATE -> Emerald500 to "Real Estate"
        ContentType.PRODUCT -> Blue500 to "Product"
        ContentType.SERVICE -> Orange500 to "Service"
        ContentType.LOCAL_OFFER -> Rose500 to "Offer"
        ContentType.TRENDING -> Teal500 to "Trending"
    }
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(8.dp),
        color = color.copy(alpha = 0.85f),
        shadowElevation = 2.dp,
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            color = Color.White,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
fun HorizontalListingCard(
    listing: Listing,
    onClick: () -> Unit,
    onSaveClick: () -> Unit,
    modifier: Modifier = Modifier,
    animateEntry: Boolean = false,
    entryIndex: Int = 0,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.96f else 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
        label = "h_card_press",
    )

    var visible by remember { mutableStateOf(!animateEntry) }
    LaunchedEffect(Unit) { visible = true }
    val alpha by animateFloatAsState(
        targetValue = if (visible) 1f else 0f,
        animationSpec = tween(250, delayMillis = entryIndex * 80),
        label = "h_card_alpha",
    )
    val offsetX by animateFloatAsState(
        targetValue = if (visible) 0f else 60f,
        animationSpec = tween(300, delayMillis = entryIndex * 80, easing = FastOutSlowInEasing),
        label = "h_card_offset",
    )

    Card(
        modifier = modifier
            .width(210.dp)
            .scale(scale)
            .graphicsLayer {
                this.alpha = alpha
                this.translationX = offsetX
            },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp, pressedElevation = 0.dp),
        onClick = onClick,
        interactionSource = interactionSource,
    ) {
        Column {
            Box {
                ListingImage(
                    url = listing.imageUrls.firstOrNull(),
                    contentDescription = listing.title,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(130.dp)
                        .clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)),
                )
                ContentTypeBadge(listing.contentType, Modifier.align(Alignment.TopStart).padding(8.dp))
                AnimatedSaveButton(
                    isSaved = listing.isSaved,
                    onClick = onSaveClick,
                    modifier = Modifier.align(Alignment.TopEnd).size(36.dp),
                    tintOnUnsaved = Color.White,
                )
            }
            Column(modifier = Modifier.padding(10.dp)) {
                Text(listing.title, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Spacer(modifier = Modifier.height(2.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(listing.price.toCurrencyString(listing.currency), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Star, null, Modifier.size(11.dp), Amber500)
                        Text(" ${listing.rating}", style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
        }
    }
}

