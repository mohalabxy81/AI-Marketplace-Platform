package com.marketplace.ai.presentation.home

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.marketplace.ai.R
import com.marketplace.ai.core.extensions.getGreetingKey
import com.marketplace.ai.domain.model.ContentType
import com.marketplace.ai.domain.model.FeedSection
import com.marketplace.ai.domain.model.FeedSectionType
import com.marketplace.ai.ui.components.*
import com.marketplace.ai.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onListingClick: (String) -> Unit,
    onSearchClick: () -> Unit,
    windowSizeClass: WindowSizeClass,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val deviceType = windowSizeClass.toDeviceType()
    val isCompact = deviceType == DeviceType.PHONE
    val listState = rememberLazyListState()

    PullToRefreshBox(
        isRefreshing = state.isRefreshing,
        onRefresh = viewModel::refresh,
    ) {
        LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 24.dp),
        ) {
            // ─── AI Greeting ────────────────────────────────
            item(key = "greeting") {
                AnimatedGreetingSection()
            }

            // ─── Smart Search Bar ───────────────────────────
            item(key = "search") {
                SmartSearchBarSection(
                    placeholder = state.searchPlaceholder,
                    recentSearches = state.recentSearches,
                    onSearchClick = onSearchClick,
                )
            }

            // ─── Content Type Filter Chips ──────────────────
            item(key = "filters") {
                ContentTypeFilterRow(
                    selectedType = state.selectedContentType,
                    onTypeSelected = viewModel::selectContentType,
                )
            }

            // ─── Loading State ──────────────────────────────
            if (state.isLoading && state.feedSections.isEmpty()) {
                item(key = "shimmer_greeting") { ShimmerGreeting() }
                item(key = "shimmer_search") { ShimmerSearchBar() }
                items(3) { index ->
                    ShimmerFeedSection(modifier = Modifier.padding(top = if (index == 0) 0.dp else 8.dp))
                }
            }

            // ─── Error State ────────────────────────────────
            else if (state.error != null && state.feedSections.isEmpty()) {
                item(key = "error") {
                    ErrorState(
                        message = state.error ?: stringResource(R.string.error_generic),
                        onRetry = viewModel::loadFeed,
                        modifier = Modifier.fillParentMaxHeight(0.5f),
                    )
                }
            }

            // ─── Feed Sections ──────────────────────────────
            else {
                itemsIndexed(
                    items = state.feedSections,
                    key = { _, section -> section.id },
                ) { index, section ->
                    AnimatedFeedSection(
                        section = section,
                        sectionIndex = index,
                        onListingClick = { id ->
                            viewModel.onListingViewed(id)
                            onListingClick(id)
                        },
                        onSaveClick = { id ->
                            viewModel.onListingSaved(id, true)
                        },
                        deviceType = deviceType,
                    )
                    if (index < state.feedSections.lastIndex) {
                        Spacer(modifier = Modifier.height(AdaptiveSpacing.sectionGap(deviceType)))
                    }
                }
            }
        }
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI Greeting — Animated, time-aware, language-aware
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@Composable
private fun AnimatedGreetingSection() {
    val greetingRes = when (getGreetingKey()) {
        "morning" -> R.string.greeting_morning
        "afternoon" -> R.string.greeting_afternoon
        else -> R.string.greeting_evening
    }

    val greetingIcon = when (getGreetingKey()) {
        "morning" -> "☀️"
        "afternoon" -> "🌤️"
        else -> "🌙"
    }

    // Fade in on first composition
    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { visible = true }

    val alpha by animateFloatAsState(
        targetValue = if (visible) 1f else 0f,
        animationSpec = tween(500, easing = FastOutSlowInEasing),
        label = "greeting_alpha",
    )
    val offsetY by animateFloatAsState(
        targetValue = if (visible) 0f else 20f,
        animationSpec = tween(600, easing = FastOutSlowInEasing),
        label = "greeting_offset",
    )

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 12.dp)
            .padding(top = 12.dp)
            .graphicsLayer {
                this.alpha = alpha
                translationY = offsetY
            },
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = stringResource(greetingRes),
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(text = greetingIcon, style = MaterialTheme.typography.headlineMedium)
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = stringResource(R.string.greeting_subtitle),
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Smart Search Bar — Rotating placeholder, recent searches
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@Composable
private fun SmartSearchBarSection(
    placeholder: String,
    recentSearches: List<String>,
    onSearchClick: () -> Unit,
) {
    Column {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 6.dp),
            shape = RoundedCornerShape(28.dp),
            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
            shadowElevation = 1.dp,
            onClick = onSearchClick,
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 18.dp, vertical = 15.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    Icons.Outlined.Search,
                    stringResource(R.string.cd_search),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(22.dp),
                )
                Spacer(modifier = Modifier.width(14.dp))
                AnimatedContent(
                    targetState = placeholder,
                    transitionSpec = {
                        (fadeIn(tween(300)) + slideInVertically { it / 2 }) togetherWith
                            (fadeOut(tween(200)) + slideOutVertically { -it / 2 })
                    },
                    label = "placeholder_anim",
                ) { text ->
                    Text(
                        text = text,
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                        maxLines = 1,
                    )
                }
                Spacer(modifier = Modifier.weight(1f))
                Surface(
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.tertiary.copy(alpha = 0.15f),
                    modifier = Modifier.size(32.dp),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            Icons.Outlined.AutoAwesome,
                            "AI",
                            tint = MaterialTheme.colorScheme.tertiary,
                            modifier = Modifier.size(16.dp),
                        )
                    }
                }
            }
        }

        // Recent searches chips
        if (recentSearches.isNotEmpty()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 20.dp, top = 8.dp)
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Icon(
                    Icons.Outlined.History,
                    null,
                    modifier = Modifier.size(16.dp).align(Alignment.CenterVertically),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                )
                recentSearches.take(4).forEach { search ->
                    SuggestionChip(
                        onClick = {},
                        label = {
                            Text(search, style = MaterialTheme.typography.labelSmall)
                        },
                        shape = RoundedCornerShape(20.dp),
                    )
                }
            }
        }
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Content Type Filter Chips
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@Composable
private fun ContentTypeFilterRow(
    selectedType: ContentType?,
    onTypeSelected: (ContentType?) -> Unit,
) {
    val filters = listOf(
        null to stringResource(R.string.type_all),
        ContentType.REAL_ESTATE to stringResource(R.string.type_real_estate),
        ContentType.PRODUCT to stringResource(R.string.type_product),
        ContentType.SERVICE to stringResource(R.string.type_service),
        ContentType.LOCAL_OFFER to stringResource(R.string.type_local_offer),
        ContentType.TRENDING to stringResource(R.string.type_trending),
    )

    val icons = mapOf(
        null to Icons.Outlined.Dashboard,
        ContentType.REAL_ESTATE to Icons.Outlined.Home,
        ContentType.PRODUCT to Icons.Outlined.ShoppingBag,
        ContentType.SERVICE to Icons.Outlined.Handyman,
        ContentType.LOCAL_OFFER to Icons.Outlined.LocalOffer,
        ContentType.TRENDING to Icons.Outlined.TrendingUp,
    )

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 10.dp)
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        filters.forEach { (type, label) ->
            val isSelected = selectedType == type
            FilterChip(
                selected = isSelected,
                onClick = { onTypeSelected(type) },
                label = { Text(label, style = MaterialTheme.typography.labelMedium) },
                leadingIcon = {
                    Icon(
                        icons[type] ?: Icons.Outlined.Dashboard,
                        null,
                        modifier = Modifier.size(16.dp),
                    )
                },
                shape = RoundedCornerShape(20.dp),
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = MaterialTheme.colorScheme.primary,
                    selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                    selectedLeadingIconColor = MaterialTheme.colorScheme.onPrimary,
                ),
            )
        }
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Animated Feed Section — Staggered entry, adaptive layout
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@Composable
private fun AnimatedFeedSection(
    section: FeedSection,
    sectionIndex: Int,
    onListingClick: (String) -> Unit,
    onSaveClick: (String) -> Unit,
    deviceType: DeviceType,
) {
    // Animate section entry
    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { visible = true }

    val alpha by animateFloatAsState(
        targetValue = if (visible) 1f else 0f,
        animationSpec = tween(350, delayMillis = sectionIndex * 100, easing = FastOutSlowInEasing),
        label = "section_alpha_$sectionIndex",
    )

    val isHorizontal = section.type in listOf(
        FeedSectionType.RECOMMENDED,
        FeedSectionType.BASED_ON_ACTIVITY,
        FeedSectionType.NEARBY,
        FeedSectionType.SMART_SUGGESTIONS,
    )

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .graphicsLayer { this.alpha = alpha },
    ) {
        // Section header
        SectionHeader(
            title = section.title,
            type = section.type,
            onSeeAll = {},
        )

        if (section.listings.isEmpty()) {
            // Empty section
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp)
                    .padding(horizontal = 16.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    "No items available in this category",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )
            }
        } else if (isHorizontal) {
            LazyRow(
                contentPadding = PaddingValues(horizontal = AdaptiveSpacing.screenPadding(deviceType)),
                horizontalArrangement = Arrangement.spacedBy(AdaptiveSpacing.cardGap(deviceType)),
            ) {
                itemsIndexed(section.listings, key = { _, it -> it.id }) { index, listing ->
                    HorizontalListingCard(
                        listing = listing,
                        onClick = { onListingClick(listing.id) },
                        onSaveClick = { onSaveClick(listing.id) },
                        modifier = Modifier.width(AdaptiveSpacing.horizontalCardWidth(deviceType)),
                        animateEntry = true,
                        entryIndex = index,
                    )
                }
            }
        } else {
            // Vertical — use adaptive grid for tablet/desktop
            if (deviceType == DeviceType.PHONE) {
                Column(
                    modifier = Modifier.padding(horizontal = AdaptiveSpacing.screenPadding(deviceType)),
                    verticalArrangement = Arrangement.spacedBy(AdaptiveSpacing.cardGap(deviceType)),
                ) {
                    section.listings.forEachIndexed { index, listing ->
                        ListingCard(
                            listing = listing,
                            onClick = { onListingClick(listing.id) },
                            onSaveClick = { onSaveClick(listing.id) },
                            isCompact = false,
                            animateEntry = true,
                            entryIndex = index,
                        )
                    }
                }
            } else {
                AdaptiveListingGrid(
                    listings = section.listings,
                    deviceType = deviceType,
                    onListingClick = onListingClick,
                    onSaveClick = onSaveClick,
                )
            }
        }
    }
}

@Composable
private fun SectionHeader(
    title: String,
    type: FeedSectionType,
    onSeeAll: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            val icon = when (type) {
                FeedSectionType.RECOMMENDED -> Icons.Outlined.AutoAwesome
                FeedSectionType.BASED_ON_ACTIVITY -> Icons.Outlined.Psychology
                FeedSectionType.NEARBY -> Icons.Outlined.NearMe
                FeedSectionType.TRENDING -> Icons.Filled.TrendingUp
                FeedSectionType.SMART_SUGGESTIONS -> Icons.Outlined.Lightbulb
                FeedSectionType.DISCOVER -> Icons.Outlined.Explore
            }
            val iconColor = when (type) {
                FeedSectionType.TRENDING -> MaterialTheme.colorScheme.tertiary
                FeedSectionType.RECOMMENDED -> Amber600
                FeedSectionType.SMART_SUGGESTIONS -> Teal500
                else -> MaterialTheme.colorScheme.onSurfaceVariant
            }
            Icon(icon, null, modifier = Modifier.size(20.dp), tint = iconColor)
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )
        }
        TextButton(onClick = onSeeAll) {
            Text(
                stringResource(R.string.feed_see_all),
                color = MaterialTheme.colorScheme.tertiary,
                style = MaterialTheme.typography.labelLarge,
            )
            Spacer(modifier = Modifier.width(2.dp))
            Icon(
                Icons.Filled.ChevronRight,
                null,
                modifier = Modifier.size(16.dp),
                tint = MaterialTheme.colorScheme.tertiary,
            )
        }
    }
}
