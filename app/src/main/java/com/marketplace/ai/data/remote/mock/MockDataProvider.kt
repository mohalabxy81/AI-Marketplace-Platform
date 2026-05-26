package com.marketplace.ai.data.remote.mock

import com.marketplace.ai.domain.model.*
import kotlinx.coroutines.delay

object MockDataProvider {

    private val mockListings = listOf(
        Listing("re_1","Modern Downtown Loft","Stunning 2-bedroom loft with floor-to-ceiling windows.",425000.0,"USD",listOf("https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"),ContentType.REAL_ESTATE,"Manhattan, NY",40.7128,-74.0060,4.8f,124,"s1","Urban Realty","https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200",false,System.currentTimeMillis()-86400000,listOf("downtown","loft")),
        Listing("re_2","Seaside Villa with Pool","Luxurious 4-bedroom villa overlooking the Mediterranean.",1250000.0,"USD",listOf("https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800"),ContentType.REAL_ESTATE,"Malibu, CA",34.0259,-118.7798,4.9f,87,"s2","Coastal Properties",null,false,System.currentTimeMillis()-172800000,listOf("villa","pool")),
        Listing("re_3","Cozy Mountain Cabin","Charming 3-bedroom log cabin in the Rockies.",340000.0,"USD",listOf("https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800"),ContentType.REAL_ESTATE,"Aspen, CO",39.1911,-106.8175,4.7f,56,"s3","Mountain Living",null,false,System.currentTimeMillis()-259200000,listOf("cabin","mountain")),
        Listing("p_1","Wireless Noise-Canceling Headphones","Premium over-ear headphones with 40-hour battery.",349.0,"USD",listOf("https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"),ContentType.PRODUCT,"San Francisco, CA",37.7749,-122.4194,4.6f,2341,"s4","TechHub","https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200",false,System.currentTimeMillis()-43200000,listOf("electronics","audio")),
        Listing("p_2","Handcrafted Leather Messenger Bag","Full-grain Italian leather messenger bag.",189.0,"USD",listOf("https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800"),ContentType.PRODUCT,"Austin, TX",30.2672,-97.7431,4.9f,567,"s5","Artisan Goods",null,false,System.currentTimeMillis()-129600000,listOf("leather","bags")),
        Listing("p_3","Smart Home Starter Kit","Complete smart home bundle with hub and sensors.",249.0,"USD",listOf("https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=800"),ContentType.PRODUCT,"Seattle, WA",47.6062,-122.3321,4.4f,1892,"s4","TechHub",null,false,System.currentTimeMillis()-216000000,listOf("smart home","IoT")),
        Listing("p_4","Minimalist Mechanical Watch","Swiss automatic movement, sapphire crystal.",595.0,"USD",listOf("https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800"),ContentType.PRODUCT,"New York, NY",40.7580,-73.9855,4.8f,312,"s6","TimeKeeper",null,false,System.currentTimeMillis()-302400000,listOf("watches","luxury")),
        Listing("sv_1","Professional Interior Design","Full-service interior design consultation.",150.0,"USD",listOf("https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800"),ContentType.SERVICE,"San Francisco, CA",37.7833,-122.4167,4.9f,203,"s7","Design Studio SF","https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",false,System.currentTimeMillis()-345600000,listOf("design","interior")),
        Listing("sv_2","Personal Fitness Training","Customized fitness programs with certified trainer.",80.0,"USD",listOf("https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800"),ContentType.SERVICE,"Los Angeles, CA",34.0522,-118.2437,4.7f,456,"s8","FitLife Pro",null,false,System.currentTimeMillis()-432000000,listOf("fitness","training")),
        Listing("sv_3","Professional Photography","2-hour portrait or event photography session.",299.0,"USD",listOf("https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800"),ContentType.SERVICE,"Austin, TX",30.2500,-97.7500,4.8f,178,"s9","Capture Moments",null,false,System.currentTimeMillis()-518400000,listOf("photography","portrait")),
        Listing("lo_1","50% Off Spa Day Package","Full spa day with massage, facial, and aromatherapy.",75.0,"USD",listOf("https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800"),ContentType.LOCAL_OFFER,"Chicago, IL",41.8781,-87.6298,4.6f,89,"s10","Serenity Spa",null,false,System.currentTimeMillis()-21600000,listOf("spa","deal")),
        Listing("lo_2","Italian Restaurant — BOGO","Authentic pizza and pasta. Buy 1 get 1 free.",25.0,"USD",listOf("https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800"),ContentType.LOCAL_OFFER,"Chicago, IL",41.8820,-87.6278,4.5f,234,"s11","Bella Cucina",null,false,System.currentTimeMillis()-10800000,listOf("food","restaurant")),
        Listing("lo_3","Weekend Yoga Retreat","2-day yoga retreat in the countryside.",199.0,"USD",listOf("https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800"),ContentType.LOCAL_OFFER,"Hudson Valley, NY",41.7000,-73.9200,4.9f,67,"s12","Mindful Escapes",null,false,System.currentTimeMillis()-7200000,listOf("yoga","retreat")),
        Listing("t_1","AI-Powered Standing Desk","Height-adjustable desk with AI posture coaching.",799.0,"USD",listOf("https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800"),ContentType.TRENDING,"San Jose, CA",37.3382,-121.8863,4.7f,892,"s13","SmartSpace",null,false,System.currentTimeMillis()-3600000,listOf("desk","AI")),
        Listing("t_2","Portable Espresso Machine","Battery-powered espresso for on-the-go.",129.0,"USD",listOf("https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800"),ContentType.TRENDING,"Portland, OR",45.5152,-122.6784,4.5f,1456,"s14","BrewAnywhere",null,false,System.currentTimeMillis()-1800000,listOf("coffee","portable")),
    )

    private val mockUser = User("u1","Alex Johnson","alex@example.com","https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200",System.currentTimeMillis()-30*86400000L,0,3)

    private val mockNotifications = listOf(
        Notification("n1","Price Drop!","Wireless Headphones dropped to \$299",null,false,System.currentTimeMillis()-3600000,NotificationType.PRICE_DROP),
        Notification("n2","New near you","3 new listings in Manhattan",null,false,System.currentTimeMillis()-7200000,NotificationType.RECOMMENDATION),
        Notification("n3","Saved item update","Modern Downtown Loft price changed",null,true,System.currentTimeMillis()-86400000,NotificationType.LISTING_UPDATE),
        Notification("n4","Welcome!","Start exploring the marketplace",null,true,System.currentTimeMillis()-172800000,NotificationType.SYSTEM),
    )

    private val searchSuggestions = listOf(
        SearchSuggestion("Modern apartments",ContentType.REAL_ESTATE,156),
        SearchSuggestion("Wireless headphones",ContentType.PRODUCT,89),
        SearchSuggestion("Fitness training",ContentType.SERVICE,45),
        SearchSuggestion("Restaurant deals",ContentType.LOCAL_OFFER,23),
        SearchSuggestion("Smart home devices",ContentType.PRODUCT,201),
    )

    private val categories = listOf(
        Category("c1","Real Estate","home",156,ContentType.REAL_ESTATE),
        Category("c2","Electronics","devices",312,ContentType.PRODUCT),
        Category("c3","Fashion","checkroom",245,ContentType.PRODUCT),
        Category("c4","Home Services","handyman",89,ContentType.SERVICE),
        Category("c5","Food & Dining","restaurant",178,ContentType.LOCAL_OFFER),
        Category("c6","Health & Wellness","spa",67,ContentType.SERVICE),
    )

    suspend fun getListings(): List<Listing> { delay(800); return mockListings }
    suspend fun getListingById(id: String): Listing? { delay(400); return mockListings.find { it.id == id } }
    suspend fun searchListings(query: String): List<Listing> {
        delay(600)
        return mockListings.filter { it.title.contains(query, true) || it.tags.any { t -> t.contains(query, true) } }
    }
    suspend fun login(email: String, password: String): User { delay(1200); return mockUser.copy(email = email) }
    suspend fun register(name: String, email: String, password: String): User { delay(1500); return mockUser.copy(name = name, email = email) }
    fun getPersonalizedFeed(): List<FeedSection> = listOf(
        FeedSection("fs1","Recommended for You",FeedSectionType.RECOMMENDED,mockListings.shuffled().take(6)),
        FeedSection("fs2","Based on Your Activity",FeedSectionType.BASED_ON_ACTIVITY,mockListings.filter { it.contentType == ContentType.PRODUCT }.take(4)),
        FeedSection("fs3","Near You",FeedSectionType.NEARBY,mockListings.filter { it.contentType in listOf(ContentType.LOCAL_OFFER, ContentType.SERVICE) }.take(4)),
        FeedSection("fs4","Trending Now",FeedSectionType.TRENDING,mockListings.filter { it.contentType == ContentType.TRENDING }),
        FeedSection("fs5","Discover",FeedSectionType.DISCOVER,mockListings.shuffled().take(8)),
    )
    fun getSearchSuggestions(query: String): List<SearchSuggestion> = if (query.isBlank()) searchSuggestions else searchSuggestions.filter { it.text.contains(query, true) }
    fun getCategories(): List<Category> = categories
    fun getNotifications(): List<Notification> = mockNotifications
    fun getUser(): User = mockUser
}
