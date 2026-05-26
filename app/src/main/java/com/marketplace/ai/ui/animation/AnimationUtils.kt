package com.marketplace.ai.ui.animation

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.IntOffset

object AnimationSpecs {
    val FastEaseOut = tween<Float>(200, easing = FastOutSlowInEasing)
    val MediumEaseOut = tween<Float>(300, easing = FastOutSlowInEasing)
    val SlowEaseOut = tween<Float>(400, easing = FastOutSlowInEasing)

    val StaggerDelay = 50 // ms between staggered items
    val CardEnterDuration = 350
    val FadeInDuration = 250
    val ScaleInDuration = 300

    val SpringBouncy = spring<Float>(
        dampingRatio = Spring.DampingRatioMediumBouncy,
        stiffness = Spring.StiffnessLow,
    )

    val SpringGentle = spring<Float>(
        dampingRatio = Spring.DampingRatioNoBouncy,
        stiffness = Spring.StiffnessMediumLow,
    )
}

@Composable
fun Modifier.staggeredFadeIn(index: Int, visible: Boolean): Modifier {
    val delay = index * AnimationSpecs.StaggerDelay
    val alpha by animateFloatAsState(
        targetValue = if (visible) 1f else 0f,
        animationSpec = tween(
            durationMillis = AnimationSpecs.FadeInDuration,
            delayMillis = delay,
            easing = FastOutSlowInEasing,
        ),
        label = "stagger_fade_$index",
    )
    val translationY by animateFloatAsState(
        targetValue = if (visible) 0f else 40f,
        animationSpec = tween(
            durationMillis = AnimationSpecs.CardEnterDuration,
            delayMillis = delay,
            easing = FastOutSlowInEasing,
        ),
        label = "stagger_translate_$index",
    )
    return this
        .alpha(alpha)
        .graphicsLayer { this.translationY = translationY }
}

@Composable
fun Modifier.scaleOnPress(isPressed: Boolean): Modifier {
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.96f else 1f,
        animationSpec = AnimationSpecs.SpringBouncy,
        label = "press_scale",
    )
    return this.scale(scale)
}

@Composable
fun Modifier.parallaxScroll(scrollState: LazyListState, index: Int, factor: Float = 0.3f): Modifier {
    val firstVisibleIndex = scrollState.firstVisibleItemIndex
    val scrollOffset = scrollState.firstVisibleItemScrollOffset

    val offset = if (index >= firstVisibleIndex) {
        (index - firstVisibleIndex) * scrollOffset * factor
    } else {
        0f
    }

    return this.graphicsLayer {
        translationY = -offset
    }
}

@Composable
fun AnimatedCounter(
    count: Int,
    modifier: Modifier = Modifier,
    content: @Composable (Int) -> Unit,
) {
    AnimatedContent(
        targetState = count,
        transitionSpec = {
            if (targetState > initialState) {
                slideInVertically { -it } + fadeIn() togetherWith
                    slideOutVertically { it } + fadeOut()
            } else {
                slideInVertically { it } + fadeIn() togetherWith
                    slideOutVertically { -it } + fadeOut()
            }.using(SizeTransform(clip = false))
        },
        modifier = modifier,
        label = "counter",
    ) { target ->
        content(target)
    }
}

@Composable
fun PulseAnimation(
    modifier: Modifier = Modifier,
    content: @Composable (Float) -> Unit,
) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val scale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "pulse_scale",
    )
    content(scale)
}
