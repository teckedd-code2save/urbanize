export const MAX_CIRCLE_RADIUS_KM = 3;

export const SUPPORTED_CITIES = [
    // ── Ghana ────────────────────────────────────────────────
    { id: "accra",     label: "Accra, Ghana",       longitude: -0.1870,   latitude:  5.6037,  zoom: 11 },
    { id: "kumasi",    label: "Kumasi, Ghana",       longitude: -1.6244,   latitude:  6.6885,  zoom: 11 },
    { id: "tamale",    label: "Tamale, Ghana",       longitude: -0.8393,   latitude:  9.4008,  zoom: 11 },
    { id: "takoradi",  label: "Takoradi, Ghana",     longitude: -1.7548,   latitude:  4.8975,  zoom: 12 },
    { id: "sunyani",   label: "Sunyani, Ghana",      longitude: -2.3304,   latitude:  7.3378,  zoom: 12 },
    { id: "cape-coast",label: "Cape Coast, Ghana",   longitude: -1.2497,   latitude:  5.1053,  zoom: 12 },
    // ── West Africa ──────────────────────────────────────────
    { id: "lagos",     label: "Lagos, Nigeria",      longitude:  3.3792,   latitude:  6.5244,  zoom: 11 },
    { id: "abuja",     label: "Abuja, Nigeria",      longitude:  7.4951,   latitude:  9.0579,  zoom: 11 },
    { id: "dakar",     label: "Dakar, Senegal",      longitude: -17.4441,  latitude: 14.6928,  zoom: 12 },
    { id: "abidjan",   label: "Abidjan, Côte d'Ivoire", longitude: -4.0083, latitude: 5.3600, zoom: 11 },
    { id: "ouagadougou",label:"Ouagadougou, Burkina Faso", longitude: -1.5228, latitude: 12.3714, zoom: 12 },
    // ── East Africa ──────────────────────────────────────────
    { id: "nairobi",   label: "Nairobi, Kenya",      longitude: 36.8219,   latitude: -1.2921,  zoom: 11 },
    { id: "dar-es-salaam", label: "Dar es Salaam, Tanzania", longitude: 39.2083, latitude: -6.7924, zoom: 11 },
    { id: "kampala",   label: "Kampala, Uganda",     longitude: 32.5825,   latitude:  0.3476,  zoom: 12 },
    { id: "addis-ababa",label:"Addis Ababa, Ethiopia",longitude: 38.7578,  latitude:  9.0250,  zoom: 11 },
    // ── Southern Africa ──────────────────────────────────────
    { id: "johannesburg", label: "Johannesburg, South Africa", longitude: 28.0473, latitude: -26.2041, zoom: 11 },
    { id: "cape-town", label: "Cape Town, South Africa", longitude: 18.4241, latitude: -33.9249, zoom: 11 },
    { id: "lusaka",    label: "Lusaka, Zambia",      longitude: 28.3228,   latitude: -15.3875, zoom: 12 },
    // ── North Africa ─────────────────────────────────────────
    { id: "cairo",     label: "Cairo, Egypt",        longitude: 31.2357,   latitude: 30.0444,  zoom: 11 },
    { id: "casablanca",label: "Casablanca, Morocco", longitude: -7.5898,   latitude: 33.5731,  zoom: 11 },
    // ── Global research / comparison cities ──────────────────
    { id: "london",    label: "London, UK",          longitude: -0.1276,   latitude: 51.5072,  zoom: 11 },
    { id: "paris",     label: "Paris, France",       longitude:  2.3488,   latitude: 48.8534,  zoom: 12 },
    { id: "new-york",  label: "New York, USA",       longitude: -74.0060,  latitude: 40.7128,  zoom: 11 },
    { id: "singapore", label: "Singapore",           longitude: 103.8198,  latitude:  1.3521,  zoom: 12 },
    { id: "dubai",     label: "Dubai, UAE",          longitude: 55.2708,   latitude: 25.2048,  zoom: 11 },
] as const;

export type SupportedCityId = (typeof SUPPORTED_CITIES)[number]["id"];
