export const MAX_CIRCLE_RADIUS_KM = 3;

export const SUPPORTED_CITIES = [
    {
        id: "accra",
        label: "Accra, Ghana",
        longitude: -0.1870,
        latitude: 5.6037,
        zoom: 11,
    },
    {
        id: "kumasi",
        label: "Kumasi, Ghana",
        longitude: -1.6244,
        latitude: 6.6885,
        zoom: 11,
    },
    {
        id: "tamale",
        label: "Tamale, Ghana",
        longitude: -0.8393,
        latitude: 9.4008,
        zoom: 11,
    },
] as const;

export type SupportedCityId = (typeof SUPPORTED_CITIES)[number]["id"];
