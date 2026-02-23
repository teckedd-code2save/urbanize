export const MAX_CIRCLE_RADIUS_KM = 3;

export const SUPPORTED_CITIES = [
    {
        id: "london",
        label: "London, UK",
        longitude: -0.1276,
        latitude: 51.5072,
        zoom: 11,
    },
    {
        id: "nyc",
        label: "New York City, USA",
        longitude: -74.006,
        latitude: 40.7128,
        zoom: 11,
    },
    {
        id: "singapore",
        label: "Singapore",
        longitude: 103.8198,
        latitude: 1.3521,
        zoom: 11,
    },
] as const;

export type SupportedCityId = (typeof SUPPORTED_CITIES)[number]["id"];
