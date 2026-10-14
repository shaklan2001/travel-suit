/**
 * Destination catalogue for the Trip Planner. Photos are Unsplash (free licence, hot-linked).
 *
 * Cost bands are demo values in INR, used only for an indicative range. They are not fares,
 * rates, or a quote: the live price comes from the package, flight, and hotel systems.
 * Listed in context/use-cases/trip-planning.md.
 */

export type Interest = "beaches" | "mountains" | "culture" | "nature" | "city";
export type TravelStyle = "budget" | "comfort" | "luxury";
export type Region = "india" | "international";

export interface Destination {
  id: string;
  name: string;
  country: string;
  region: Region;
  tagline: string;
  interests: Interest[];
  romantic: boolean;
  familyFriendly: boolean;
  /** Unsplash photo ids. The first is the hero. */
  photos: string[];
  bestMonths: number[];
  offSeasonNote: string;
  gateway: string;
  /** Day activities in order. The itinerary uses as many as the trip has days. */
  days: string[];
  cost: {
    /** Return flight per person from an Indian metro, low to high. */
    flight: [number, number];
    /** Per room per night. */
    stay: Record<TravelStyle, number>;
    /** Transfers and sightseeing per person per day, at comfort. */
    local: number;
    /** Meals per person per day, at comfort. */
    meals: number;
  };
}

export const INTEREST_LABELS: Record<Interest, string> = {
  beaches: "Beaches",
  mountains: "Mountains & snow",
  culture: "Culture & heritage",
  nature: "Nature & wildlife",
  city: "City & shopping",
};

export const STYLE_LABELS: Record<TravelStyle, string> = {
  budget: "Budget",
  comfort: "Comfort",
  luxury: "Luxury",
};

/** Demo: visa fees and travel insurance per person on an international trip. */
export const INTERNATIONAL_EXTRAS: [number, number] = [3000, 9000];

/** Demo multipliers on local costs and meals by travel style. */
export const STYLE_MULTIPLIER: Record<TravelStyle, number> = { budget: 0.75, comfort: 1, luxury: 1.8 };

export function photoUrl(id: string, width = 900): string {
  return `https://images.unsplash.com/${id}?w=${width}&q=70&auto=format&fit=crop`;
}

export const DESTINATIONS: Destination[] = [
  {
    id: "kashmir",
    name: "Kashmir",
    country: "India",
    region: "india",
    tagline: "Houseboats on Dal Lake, meadows, and snow peaks",
    interests: ["mountains", "nature"],
    romantic: true,
    familyFriendly: true,
    photos: ["photo-1595815771614-ade9d652a65d", "photo-1715457573748-8e8a70b2c1be", "photo-1614591276564-7b3e69347a48"],
    bestMonths: [4, 5, 6, 7, 8, 9, 10],
    offSeasonNote: "Winter brings heavy snow. Lovely for snow, but some roads can close.",
    gateway: "Srinagar",
    days: [
      "Arrive in Srinagar. Shikara ride on Dal Lake and a night on a houseboat",
      "Mughal Gardens: Nishat and Shalimar Bagh",
      "Day trip to Gulmarg. Gondola ride if tickets are available",
      "Drive to Pahalgam through saffron fields",
      "Betaab Valley and Aru Valley",
      "Day trip to Sonamarg and the Thajiwas glacier",
      "Old city walk and local crafts",
    ],
    cost: { flight: [9000, 16000], stay: { budget: 3000, comfort: 7000, luxury: 16000 }, local: 2200, meals: 1200 },
  },
  {
    id: "kerala",
    name: "Kerala",
    country: "India",
    region: "india",
    tagline: "Backwaters, tea hills, and a slow coast",
    interests: ["nature", "beaches", "culture"],
    romantic: true,
    familyFriendly: true,
    photos: ["photo-1593693411515-c20261bcad6e", "photo-1602216056096-3b40cc0c9944", "photo-1772729134844-c4224e60edbf"],
    bestMonths: [9, 10, 11, 12, 1, 2, 3],
    offSeasonNote: "June to August is monsoon: very green, with heavy rain.",
    gateway: "Kochi",
    days: [
      "Arrive in Kochi. Fort Kochi walk and the Chinese fishing nets",
      "Drive to Munnar through tea estates",
      "Munnar viewpoints and a tea museum",
      "Thekkady: spice plantation and Periyar",
      "Alleppey houseboat, overnight on the backwaters",
      "Kumarakom bird sanctuary and village walk",
      "Beach day at Varkala",
    ],
    cost: { flight: [8000, 14000], stay: { budget: 3000, comfort: 7500, luxury: 18000 }, local: 2000, meals: 1100 },
  },
  {
    id: "goa",
    name: "Goa",
    country: "India",
    region: "india",
    tagline: "Beaches, forts, and Portuguese lanes",
    interests: ["beaches", "culture"],
    romantic: true,
    familyFriendly: true,
    photos: ["photo-1512343879784-a960bf40e7f2", "photo-1614082242765-7c98ca0f3df3", "photo-1757702244726-00198554c4a0"],
    bestMonths: [11, 12, 1, 2, 3],
    offSeasonNote: "June to September is monsoon. Many beach shacks close.",
    gateway: "Goa",
    days: [
      "Arrive in Goa. Sunset at a North Goa beach",
      "Fort Aguada and Chapora fort at sunset",
      "Old Goa churches and the Fontainhas Latin quarter in Panjim",
      "South Goa beach day at Palolem",
      "Spice plantation visit",
      "Water sports and a river cruise",
      "Slow morning and local markets",
    ],
    cost: { flight: [6000, 12000], stay: { budget: 3500, comfort: 8000, luxury: 20000 }, local: 1800, meals: 1300 },
  },
  {
    id: "rajasthan",
    name: "Rajasthan",
    country: "India",
    region: "india",
    tagline: "Forts, palaces, and lake cities",
    interests: ["culture"],
    romantic: true,
    familyFriendly: true,
    photos: ["photo-1695956353120-54ce5e91632b", "photo-1615836245337-f5b9b2303f10"],
    bestMonths: [10, 11, 12, 1, 2, 3],
    offSeasonNote: "April to June is very hot.",
    gateway: "Jaipur",
    days: [
      "Arrive in Jaipur. Evening at Hawa Mahal and the bazaars",
      "Amber Fort, City Palace, and Jantar Mantar",
      "Drive to Pushkar or Ajmer on the way west",
      "Arrive in Udaipur. Boat ride on Lake Pichola",
      "Udaipur City Palace and Saheliyon ki Bari",
      "Day trip to Kumbhalgarh fort",
      "Old city walk and crafts",
    ],
    cost: { flight: [7000, 13000], stay: { budget: 3000, comfort: 8000, luxury: 25000 }, local: 2200, meals: 1100 },
  },
  {
    id: "himachal",
    name: "Himachal",
    country: "India",
    region: "india",
    tagline: "Manali, valleys, and snow drives",
    interests: ["mountains", "nature"],
    romantic: true,
    familyFriendly: true,
    photos: ["photo-1712388430474-ace0c16051e2", "photo-1609920658906-8223bd289001"],
    bestMonths: [3, 4, 5, 6, 9, 10, 12, 1],
    offSeasonNote: "July and August monsoon can bring landslides on hill roads.",
    gateway: "Manali (via Chandigarh or Bhuntar)",
    days: [
      "Arrive in Manali. Mall Road and Hadimba temple",
      "Solang Valley for adventure activities",
      "Atal Tunnel and Sissu, weather permitting",
      "Kullu and river rafting",
      "Kasol and Manikaran",
      "Naggar castle and the old village",
      "Cafés and a slow day in Old Manali",
    ],
    cost: { flight: [9000, 17000], stay: { budget: 2500, comfort: 6000, luxury: 14000 }, local: 2200, meals: 1000 },
  },
  {
    id: "andaman",
    name: "Andaman",
    country: "India",
    region: "india",
    tagline: "Clear water, white sand, and island hops",
    interests: ["beaches", "nature"],
    romantic: true,
    familyFriendly: true,
    photos: ["photo-1586359716568-3e1907e4cf9f", "photo-1586053226626-febc8817962f"],
    bestMonths: [11, 12, 1, 2, 3, 4, 5],
    offSeasonNote: "June to September monsoon: ferries can be cancelled.",
    gateway: "Port Blair",
    days: [
      "Arrive in Port Blair. Cellular Jail light and sound show",
      "Ferry to Havelock. Radhanagar beach at sunset",
      "Snorkelling at Elephant beach",
      "Ferry to Neil Island. Natural bridge and Laxmanpur beach",
      "Ross Island and North Bay",
      "Scuba try-dive or glass-bottom boat",
      "Slow beach morning",
    ],
    cost: { flight: [12000, 20000], stay: { budget: 3500, comfort: 8000, luxury: 18000 }, local: 3000, meals: 1300 },
  },
  {
    id: "bali",
    name: "Bali",
    country: "Indonesia",
    region: "international",
    tagline: "Rice terraces, temples, and beach sunsets",
    interests: ["beaches", "culture", "nature"],
    romantic: true,
    familyFriendly: true,
    photos: ["photo-1555400038-63f5ba517a47", "photo-1558005530-a7958896ec60", "photo-1559628233-eb1b1a45564b"],
    bestMonths: [4, 5, 6, 7, 8, 9, 10],
    offSeasonNote: "November to March is the wet season.",
    gateway: "Denpasar",
    days: [
      "Arrive in Bali. Sunset at Seminyak",
      "Ubud: Tegalalang rice terraces and the Monkey Forest",
      "Kintamani volcano view and a coffee plantation",
      "Uluwatu temple and the Kecak fire dance",
      "Day trip to Nusa Penida",
      "Spa and a beach day",
      "Water temples: Tanah Lot and Ulun Danu",
    ],
    cost: { flight: [35000, 55000], stay: { budget: 3500, comfort: 9000, luxury: 25000 }, local: 3500, meals: 2200 },
  },
  {
    id: "dubai",
    name: "Dubai",
    country: "UAE",
    region: "international",
    tagline: "Skyline, desert, and shopping",
    interests: ["city"],
    romantic: true,
    familyFriendly: true,
    photos: ["photo-1546412414-8035e1776c9a", "photo-1651467606797-e1c660cf3fda", "photo-1772990897598-223d5fc7e8b5"],
    bestMonths: [11, 12, 1, 2, 3],
    offSeasonNote: "May to September is very hot.",
    gateway: "Dubai",
    days: [
      "Arrive in Dubai. Dhow cruise dinner at the Marina",
      "Burj Khalifa and the Dubai Mall fountain show",
      "Desert safari with dinner",
      "Day trip to Abu Dhabi and the Grand Mosque",
      "Old Dubai: souks and an abra ride",
      "Theme park day",
      "Shopping and a slow evening",
    ],
    cost: { flight: [22000, 38000], stay: { budget: 6000, comfort: 12000, luxury: 30000 }, local: 5000, meals: 3000 },
  },
  {
    id: "thailand",
    name: "Phuket and Krabi",
    country: "Thailand",
    region: "international",
    tagline: "Island hops, limestone bays, and night markets",
    interests: ["beaches", "nature", "city"],
    romantic: true,
    familyFriendly: true,
    photos: ["photo-1589394815804-964ed0be2eb5", "photo-1601225612316-b4733315a717"],
    bestMonths: [11, 12, 1, 2, 3, 4],
    offSeasonNote: "May to October is monsoon on the Andaman coast.",
    gateway: "Phuket",
    days: [
      "Arrive in Phuket. Evening at Patong",
      "Speedboat to the Phi Phi islands",
      "Big Buddha and Old Phuket town",
      "Phang Nga Bay and James Bond island",
      "Transfer to Krabi. Ao Nang beach",
      "Railay beach and the four-island tour",
      "Night market and a Thai massage",
    ],
    cost: { flight: [25000, 40000], stay: { budget: 3500, comfort: 8000, luxury: 22000 }, local: 3200, meals: 2000 },
  },
  {
    id: "singapore",
    name: "Singapore",
    country: "Singapore",
    region: "international",
    tagline: "Gardens, theme parks, and food streets",
    interests: ["city"],
    romantic: false,
    familyFriendly: true,
    photos: ["photo-1525625293386-3f8f99389edd", "photo-1496939376851-89342e90adcd", "photo-1628221680019-f28a2716e727"],
    bestMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    offSeasonNote: "Good all year. Expect short tropical showers.",
    gateway: "Singapore",
    days: [
      "Arrive in Singapore. Marina Bay and the Gardens by the Bay light show",
      "Sentosa and Universal Studios",
      "Night Safari",
      "Chinatown, Little India, and hawker food",
      "Jewel Changi and shopping on Orchard Road",
      "S.E.A. Aquarium and Sentosa beaches",
      "Free morning",
    ],
    cost: { flight: [25000, 40000], stay: { budget: 8000, comfort: 15000, luxury: 32000 }, local: 5000, meals: 2800 },
  },
  {
    id: "switzerland",
    name: "Switzerland",
    country: "Switzerland",
    region: "international",
    tagline: "Alps, lakes, and scenic trains",
    interests: ["mountains", "nature"],
    romantic: true,
    familyFriendly: true,
    photos: ["photo-1607867283465-d6792016b481", "photo-1729010733988-637a20cc5e37", "photo-1566475955255-404134a79aeb"],
    bestMonths: [5, 6, 7, 8, 9, 12, 1, 2],
    offSeasonNote: "Spring and autumn are shoulder seasons. Some high passes close.",
    gateway: "Zurich",
    days: [
      "Arrive in Zurich. Train to Lucerne and the old town",
      "Mount Titlis and the rotating cable car",
      "Interlaken and a lake cruise",
      "Jungfraujoch, the top of Europe",
      "Grindelwald and Lauterbrunnen valley",
      "Scenic panorama train",
      "Rhine Falls and Zurich",
    ],
    cost: { flight: [60000, 95000], stay: { budget: 12000, comfort: 22000, luxury: 45000 }, local: 7000, meals: 5000 },
  },
  {
    id: "maldives",
    name: "Maldives",
    country: "Maldives",
    region: "international",
    tagline: "Overwater villas and house reefs",
    interests: ["beaches"],
    romantic: true,
    familyFriendly: false,
    photos: ["photo-1514282401047-d79a71a590e8", "photo-1590523277543-a94d2e4eb00b", "photo-1586861642026-74a6da22a3cd"],
    bestMonths: [11, 12, 1, 2, 3, 4],
    offSeasonNote: "May to October is the wet season.",
    gateway: "Malé",
    days: [
      "Arrive in Malé. Speedboat or seaplane to the resort",
      "Snorkelling on the house reef",
      "Sandbank picnic and a dolphin cruise",
      "Spa and a sunset dinner",
      "Local island visit",
      "Diving or a submarine ride",
      "Slow morning at the villa",
    ],
    cost: { flight: [30000, 50000], stay: { budget: 12000, comfort: 30000, luxury: 70000 }, local: 4000, meals: 4000 },
  },
  {
    id: "vietnam",
    name: "Vietnam",
    country: "Vietnam",
    region: "international",
    tagline: "Ha Long Bay, lantern towns, and street food",
    interests: ["culture", "nature", "city"],
    romantic: true,
    familyFriendly: true,
    photos: ["photo-1528127269322-539801943592", "photo-1643029891412-92f9a81a8c16"],
    bestMonths: [2, 3, 4, 10, 11, 12],
    offSeasonNote: "Weather varies north to south. Summer is hot and rainy.",
    gateway: "Hanoi",
    days: [
      "Arrive in Hanoi. Old Quarter and a water puppet show",
      "Ha Long Bay overnight cruise",
      "Fly to Da Nang. Evening in Hoi An's lantern town",
      "Ba Na Hills and the Golden Bridge",
      "Fly to Ho Chi Minh City. Cu Chi tunnels",
      "Mekong Delta day trip",
      "Street food walk and markets",
    ],
    cost: { flight: [28000, 45000], stay: { budget: 2500, comfort: 6000, luxury: 16000 }, local: 3000, meals: 1600 },
  },
];

export function destinationById(id: string): Destination | null {
  return DESTINATIONS.find((destination) => destination.id === id) ?? null;
}

const DESTINATION_ALIASES: Record<string, string[]> = {
  kashmir: ["kashmir", "srinagar", "gulmarg", "pahalgam"],
  kerala: ["kerala", "munnar", "alleppey", "kochi", "cochin"],
  goa: ["goa"],
  rajasthan: ["rajasthan", "jaipur", "udaipur", "jodhpur"],
  himachal: ["himachal", "manali", "shimla", "kasol"],
  andaman: ["andaman", "havelock", "port blair"],
  bali: ["bali"],
  dubai: ["dubai", "abu dhabi", "uae"],
  thailand: ["thailand", "phuket", "krabi", "bangkok"],
  singapore: ["singapore"],
  switzerland: ["switzerland", "swiss", "zurich", "interlaken"],
  maldives: ["maldives"],
  vietnam: ["vietnam", "hanoi", "ha long", "halong"],
};

export function matchDestination(text: string): Destination | null {
  const lower = text.toLowerCase();
  const id = Object.entries(DESTINATION_ALIASES).find(([, aliases]) => aliases.some((alias) => lower.includes(alias)))?.[0];
  return id ? destinationById(id) : null;
}
