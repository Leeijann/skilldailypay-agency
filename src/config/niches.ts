/**
 * Brand Niches — Each channel has its own purpose and content style.
 * NEVER mix content between niches. Each brand gets unique, niche-specific content.
 */

export interface BrandNiche {
  id: string;
  brand: string;
  niche: string;
  topics: string[];
  tone: string;
  style: string;
  hashtags: string[];
  platforms: PlatformTarget[];
}

export interface PlatformTarget {
  platform: "facebook" | "instagram" | "twitter" | "linkedin" | "pinterest" | "tiktok" | "youtube" | "blogger";
  accountId: string;
  accountName: string;
  /** Facebook page ID (only for facebook) */
  pageId?: string;
  /** Pinterest board ID (only for pinterest) */
  boardId?: string;
  /** Content format hints */
  format: string;
}

// ═══════════════════════════════════════
//  BRAND 1: SkillDailyPay
//  Niche: Online skills, side hustles, making money, entrepreneurship
//  Platforms: FB Skill Sprint, X, Instagram, Pinterest, LinkedIn
// ═══════════════════════════════════════

export const SKILLDAILYPAY: BrandNiche = {
  id: "skilldailypay",
  brand: "SkillDailyPay",
  niche: "Online skills, side hustles, making money, digital entrepreneurship",
  topics: [
    "Freelancing skills that pay $100+/hour",
    "AI tools that replace 9-to-5 jobs",
    "Side hustles you can start with $0",
    "Building multiple income streams",
    "Digital skills employers are desperate for",
    "From zero to $5K/month online",
    "The skill-stacking strategy for wealth",
    "Remote work opportunities in 2026",
    "Passive income through digital products",
    "How to monetize any skill in 30 days",
  ],
  tone: "Motivational, actionable, direct. Speak to hustlers and go-getters who want financial freedom.",
  style: "Bold claims backed by specific examples. Use numbers and results. No fluff.",
  hashtags: ["#skilldailypay", "#sidehustle", "#makemoneyonline", "#entrepreneur", "#digitalskills", "#passiveincome", "#freelancing", "#onlinebusiness"],
  platforms: [
    { platform: "facebook", accountId: "26869", accountName: "Skill Sprint", pageId: "119491680317834", format: "200 words max, 3-5 hashtags, motivational with actionable tip" },
    { platform: "twitter", accountId: "16241", accountName: "@daily_skill", format: "280 chars max, 1-2 hashtags, punchy viral tweet" },
    { platform: "instagram", accountId: "41072", accountName: "@skilldailypay", format: "150 words max, line breaks, MAXIMUM 5 hashtags at end (Instagram enforces a strict 5 hashtag limit)" },
    // Pinterest requires Blotato verification — email help@blotato.com to enable
    // { platform: "pinterest", accountId: "5544", accountName: "skilldailypay", boardId: "TBD", format: "Pin title + 100 word SEO-rich description" },
    { platform: "linkedin", accountId: "17909", accountName: "Skill Daily Pay", format: "200 words max, professional thought leadership, no hashtags" },
  ],
};

// ═══════════════════════════════════════
//  BRAND 2: Leeijann Design
//  Niche: Fashion, women's lifestyle, design, beauty, empowerment
//  Platforms: FB Leeijann Design, Blogger
// ═══════════════════════════════════════

export const LEEIJANN_DESIGN: BrandNiche = {
  id: "leeijann",
  brand: "Leeijann Design",
  niche: "Fashion, women's lifestyle, beauty, interior design, female empowerment",
  topics: [
    "Spring/summer fashion trends for 2026",
    "Affordable luxury outfit ideas",
    "Home decor inspiration on a budget",
    "Skincare routines that actually work",
    "Color palettes and mood boards for your wardrobe",
    "Boss woman style — dressing for success",
    "DIY beauty hacks from natural ingredients",
    "Interior design trends transforming homes",
    "Self-care rituals every woman needs",
    "Building a capsule wardrobe that slays",
  ],
  tone: "Elegant, empowering, creative. Speak to women who love design, fashion, and living beautifully.",
  style: "Visual-first, aesthetic, inspiring. Use vivid descriptions. Sophisticated but approachable.",
  hashtags: ["#leeijanndesign", "#fashion", "#womensstyle", "#lifestyle", "#beauty", "#interiordesign", "#ootd", "#selfcare"],
  platforms: [
    { platform: "facebook", accountId: "26869", accountName: "Leeijann Design", pageId: "110264651436978", format: "200 words max, 3-5 hashtags, elegant and inspiring" },
    { platform: "blogger", accountId: "blogger", accountName: "Leeijann Design Blog", format: "500-800 word HTML article with h2 subheadings, SEO-friendly" },
  ],
};

// ═══════════════════════════════════════
//  BRAND 3: Smooth CUT
//  Niche: Barbering, men's grooming, barbershop culture
//  Platforms: FB Smooth CUT
// ═══════════════════════════════════════

export const SMOOTH_CUT: BrandNiche = {
  id: "smoothcut",
  brand: "Smooth CUT Barbershop",
  niche: "Barbering, men's grooming, haircuts, beard care, barbershop culture",
  topics: [
    "Top fade hairstyles trending right now",
    "Beard grooming tips for a clean look",
    "How to maintain your haircut between visits",
    "Classic vs modern barbering techniques",
    "Best products for men's hair care",
    "The art of the perfect lineup",
    "Barbershop etiquette every man should know",
    "Skincare for men — beyond just shaving",
    "Hot towel shave — the luxury experience",
    "Building confidence through grooming",
  ],
  tone: "Cool, confident, community-driven. Speak to men who take pride in their appearance.",
  style: "Direct, visual, culture-forward. Barbershop vibe — brotherhood and style.",
  hashtags: ["#smoothcut", "#barber", "#barbershop", "#fade", "#mensgrooming", "#haircut", "#beard", "#freshcut"],
  platforms: [
    { platform: "facebook", accountId: "26869", accountName: "Smooth CUT", pageId: "112057537294624", format: "200 words max, 3-5 hashtags, cool and confident" },
  ],
};

// ═══════════════════════════════════════
//  BRAND 4: TikTok — ironrive1
//  Niche: Motivational/hustle content, money mindset
//  Platform: TikTok
// ═══════════════════════════════════════

export const TIKTOK_IRONRIVE: BrandNiche = {
  id: "tiktok-ironrive",
  brand: "ironrive1",
  niche: "Money mindset, motivation, wealth building, entrepreneurship shorts",
  topics: [
    "Morning routine of millionaires",
    "The 5-second rule that changed my life",
    "Why broke people stay broke — mindset shift",
    "One habit that 10x your income",
    "Things rich people never waste money on",
    "How I went from $0 to $10K/month",
    "The side hustle nobody is talking about",
    "Financial mistakes I made in my 20s",
    "Why your 9-5 is keeping you poor",
    "3 books that made me wealthy",
  ],
  tone: "Raw, direct, urgent. Like a friend giving you a wake-up call about money.",
  style: "Short punchy lines. Hook in first 2 seconds. Controversial takes welcome.",
  hashtags: ["#moneymindset", "#hustle", "#entrepreneur", "#motivation", "#sidehustle", "#wealth", "#grind", "#fyp"],
  platforms: [
    { platform: "tiktok", accountId: "37990", accountName: "ironrive1", format: "Under 100 words, 3-5 trending hashtags, hook-first" },
  ],
};

// ═══════════════════════════════════════
//  BRAND 5: TikTok — tren_dz
//  Niche: Trending/viral content, pop culture, what's hot
//  Platform: TikTok
// ═══════════════════════════════════════

export const TIKTOK_TRENDZ: BrandNiche = {
  id: "tiktok-trendz",
  brand: "tren_dz",
  niche: "Trending topics, viral moments, pop culture, what's hot right now",
  topics: [
    "Things that are trending this week",
    "AI tools going viral right now",
    "The internet is obsessed with this",
    "Trends that will blow up in 2026",
    "Tech gadgets everyone is buying",
    "Viral life hacks that actually work",
    "Hot takes on trending topics",
    "Products TikTok made me buy",
    "Aesthetic trends taking over",
    "What everyone is talking about today",
  ],
  tone: "Trendy, energetic, in-the-know. Like a trend curator who catches everything first.",
  style: "Fast-paced, listicle format, eye-catching. Use trending sounds and formats.",
  hashtags: ["#trending", "#viral", "#fyp", "#trend", "#whatshot", "#foryou", "#trendalert", "#mustknow"],
  platforms: [
    { platform: "tiktok", accountId: "38001", accountName: "tren_dz", format: "Under 100 words, 3-5 trending hashtags, trend-focused" },
  ],
};

// ═══════════════════════════════════════
//  BRAND 6: YouTube — SO ADORABLE
//  Niche: Cute/adorable content, feel-good, heartwarming
//  Platform: YouTube
// ═══════════════════════════════════════

export const YT_SO_ADORABLE: BrandNiche = {
  id: "yt-adorable",
  brand: "SO ADORABLE",
  niche: "Cute animals, adorable moments, heartwarming stories, feel-good content",
  topics: [
    "The cutest animal moments caught on camera",
    "Puppies meeting babies for the first time",
    "Rescue animals getting their forever homes",
    "Adorable animal friendships across species",
    "Kittens doing the funniest things",
    "Heartwarming pet reunion stories",
    "Animals being unexpectedly smart",
    "The most wholesome moments of the week",
    "Baby animals taking their first steps",
    "Pets who think they are human",
  ],
  tone: "Warm, joyful, wholesome. Makes people smile and hit share.",
  style: "Emotional storytelling, feel-good narration, family-friendly.",
  hashtags: ["#soadorable", "#cute", "#animals", "#puppies", "#kittens", "#heartwarming", "#wholesome", "#adorable"],
  platforms: [
    { platform: "youtube", accountId: "33403", accountName: "SO ADORABLE", format: "Compelling title + 200 word description + 5 tags" },
  ],
};

// ═══════════════════════════════════════
//  BRAND 7: YouTube — The Health Corner
//  Niche: Health, wellness, fitness, nutrition
//  Platform: YouTube
// ═══════════════════════════════════════

export const YT_HEALTH_CORNER: BrandNiche = {
  id: "yt-health",
  brand: "The Health Corner",
  niche: "Healthy meal prep, high-protein recipes, quick healthy breakfasts, clean eating, aesthetic food content",
  topics: [
    "High protein breakfast meal prep — 10 min prep, under 300 calories",
    "Healthy overnight oats restock — ASMR breakfast cup prep",
    "5 healthy breakfast ideas you can meal prep on Sunday",
    "Avocado & egg meal prep — quick, high protein, low calorie",
    "Aesthetic smoothie bowl prep for the whole week",
    "High protein lunch meal prep under 400 calories",
    "Healthy snack restock — fridge organization ASMR",
    "3-ingredient healthy meals for busy people",
    "Weekly meal prep for weight loss — full day of eating",
    "Protein-packed overnight oats — 4 flavors in 15 minutes",
    "Clean eating grocery haul + meal prep Sunday",
    "Quick healthy dinners — 20 minutes, high protein, low carb",
    "Healthy wrap and salad jar meal prep ideas",
    "Aesthetic pantry restock + healthy snack organization",
    "Budget-friendly meal prep — eat healthy for $30/week",
  ],
  tone: "Clean, satisfying, visual-first. ASMR-style food prep vibes. Simple, no talking needed — let the food speak.",
  style: "YouTube Shorts format: vertical video, aesthetic food visuals, satisfying prep sequences, calorie/protein counts in text overlays, clean kitchen aesthetic. Think FeelGoodFoodie, fitfoodieselma style. Short punchy titles with emoji.",
  hashtags: ["#mealprep", "#healthyrecipes", "#highprotein", "#healthybreakfast", "#overnightoats", "#cleaneating", "#healthyfood", "#mealprepping", "#breakfastideas", "#shorts"],
  platforms: [
    { platform: "youtube", accountId: "33404", accountName: "The Health Corner", format: "Short punchy title with emoji + calorie/protein count. 100 word description with recipe highlights. Tags: #mealprep #healthyrecipes #highprotein #shorts #breakfastideas" },
  ],
};

// ═══════════════════════════════════════
//  ALL BRANDS
// ═══════════════════════════════════════

export const ALL_BRANDS: BrandNiche[] = [
  SKILLDAILYPAY,
  LEEIJANN_DESIGN,
  SMOOTH_CUT,
  TIKTOK_IRONRIVE,
  TIKTOK_TRENDZ,
  YT_SO_ADORABLE,
  YT_HEALTH_CORNER,
];

/** Get a random topic for a brand */
export function getRandomTopic(brand: BrandNiche): string {
  return brand.topics[Math.floor(Math.random() * brand.topics.length)];
}

/** Get brand by ID */
export function getBrand(id: string): BrandNiche | undefined {
  return ALL_BRANDS.find(b => b.id === id);
}

/** Get all platforms that need images (non-video) */
export function getImagePlatforms(): PlatformTarget[] {
  return ALL_BRANDS.flatMap(b =>
    b.platforms.filter(p => !["tiktok", "youtube"].includes(p.platform))
  );
}

/** Get all platforms that need video */
export function getVideoPlatforms(): PlatformTarget[] {
  return ALL_BRANDS.flatMap(b =>
    b.platforms.filter(p => ["tiktok", "youtube"].includes(p.platform))
  );
}
