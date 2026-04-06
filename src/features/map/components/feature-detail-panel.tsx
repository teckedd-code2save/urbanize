'use client';

import * as React from 'react';
import { X, Star, Clock, Globe, Phone, MapPin, Building2, Route, MapPinned } from 'lucide-react';
import type { PlaceResult } from '@/lib/google-places';

interface FeatureDetailPanelProps {
    readonly feature: any; // mapboxgl.MapGeoJSONFeature
    readonly placeDetails: PlaceResult | null;
    readonly isLoadingPlace: boolean;
    readonly onClose: () => void;
}

// ── Label helpers ──────────────────────────────────────────────────────────────

const HIGHWAY_LABELS: Record<string, string> = {
    motorway: 'Motorway',
    trunk: 'Trunk Road',
    primary: 'Primary Road',
    secondary: 'Secondary Road',
    tertiary: 'Tertiary Road',
    residential: 'Residential Road',
    unclassified: 'Unclassified Road',
    service: 'Service Road',
    track: 'Track',
    footway: 'Footway / Path',
    cycleway: 'Cycleway',
    path: 'Path',
};

const AMENITY_LABELS: Record<string, string> = {
    school: 'School',
    kindergarten: 'Kindergarten',
    university: 'University',
    college: 'College',
    hospital: 'Hospital',
    clinic: 'Clinic',
    doctors: 'Doctors / Clinic',
    health_centre: 'Health Centre',
    pharmacy: 'Pharmacy',
    bank: 'Bank',
    atm: 'ATM',
    marketplace: 'Market',
    restaurant: 'Restaurant',
    fast_food: 'Fast Food',
    cafe: 'Café',
    fuel: 'Fuel Station',
    police: 'Police Station',
    place_of_worship: 'Place of Worship',
    taxi: 'Taxi Station',
    bus_station: 'Bus / Lorry Station',
    supermarket: 'Supermarket',
};

const BUILDING_LABELS: Record<string, string> = {
    yes: 'Building',
    residential: 'Residential',
    commercial: 'Commercial',
    industrial: 'Industrial',
    retail: 'Retail',
    school: 'School',
    hospital: 'Hospital',
    church: 'Church',
    mosque: 'Mosque',
    warehouse: 'Warehouse',
    garage: 'Garage',
    apartments: 'Apartments',
    house: 'House',
    hut: 'Hut',
};

function featureCategory(props: Record<string, any>): { icon: React.ReactNode; label: string; sublabel?: string } {
    const highway = props.highway as string | undefined;
    const amenity = props.amenity as string | undefined;
    const building = props.building as string | undefined;
    const shop = props.shop as string | undefined;
    const leisure = props.leisure as string | undefined;
    const publicTransport = props.public_transport as string | undefined;

    if (highway) {
        return {
            icon: <Route className="h-4 w-4 text-orange-400" />,
            label: HIGHWAY_LABELS[highway] ?? highway,
            sublabel: props.surface ? `Surface: ${props.surface}` : undefined,
        };
    }
    if (amenity) {
        return {
            icon: <MapPinned className="h-4 w-4 text-violet-400" />,
            label: AMENITY_LABELS[amenity] ?? amenity,
        };
    }
    if (shop) {
        return { icon: <MapPinned className="h-4 w-4 text-orange-400" />, label: `Shop: ${shop}` };
    }
    if (leisure) {
        return { icon: <MapPinned className="h-4 w-4 text-green-400" />, label: `Leisure: ${leisure}` };
    }
    if (publicTransport) {
        return { icon: <MapPinned className="h-4 w-4 text-violet-400" />, label: 'Transit Stop' };
    }
    if (building) {
        return {
            icon: <Building2 className="h-4 w-4 text-blue-400" />,
            label: BUILDING_LABELS[building] ?? 'Building',
        };
    }
    return { icon: <MapPin className="h-4 w-4 text-gray-400" />, label: 'Feature' };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start gap-2 text-[11px]">
            <span className="shrink-0 text-muted-foreground w-24">{label}</span>
            <span className="text-foreground break-words">{value}</span>
        </div>
    );
}

function StarRating({ rating, count }: { rating: number; count?: number }) {
    const full = Math.round(rating);
    return (
        <span className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
                <Star
                    key={i}
                    className={`h-3 w-3 ${i < full ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`}
                />
            ))}
            <span className="text-[11px] text-muted-foreground ml-0.5">
                {rating.toFixed(1)}{count ? ` (${count.toLocaleString()})` : ''}
            </span>
        </span>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function FeatureDetailPanel({
    feature,
    placeDetails,
    isLoadingPlace,
    onClose,
}: FeatureDetailPanelProps) {
    const props: Record<string, any> = feature?.properties ?? {};
    const { icon, label, sublabel } = featureCategory(props);

    const name = placeDetails?.name ?? props.name as string | undefined;
    const source = props.source as string | undefined;
    const isGoogleBuilding = source === 'google_open_buildings';
    const isGooglePlace = source === 'google_places';

    return (
        <div className="w-72 rounded-xl bg-background/95 backdrop-blur border border-border/50 shadow-xl p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    {icon}
                    <div className="min-w-0">
                        <p className="text-sm font-semibold leading-tight truncate">
                            {name ?? label}
                        </p>
                        {name && (
                            <p className="text-[10px] text-muted-foreground">{label}</p>
                        )}
                        {sublabel && (
                            <p className="text-[10px] text-muted-foreground">{sublabel}</p>
                        )}
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="shrink-0 rounded-md p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Close"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="border-t border-border/40" />

            {/* OSM / GEE tags */}
            <div className="space-y-1.5">
                {props.highway && props.name && <Row label="Name" value={props.name} />}
                {props.building && props['building:levels'] && (
                    <Row label="Levels" value={props['building:levels']} />
                )}
                {props.building && props['building:area'] && (
                    <Row label="Area" value={`${Number(props['building:area']).toLocaleString()} m²`} />
                )}
                {props['building:confidence'] && (
                    <Row
                        label="Confidence"
                        value={`${(parseFloat(props['building:confidence']) * 100).toFixed(0)}%`}
                    />
                )}
                {props.highway && props.surface && (
                    <Row label="Surface" value={props.surface} />
                )}
                {props.highway && props.maxspeed && (
                    <Row label="Speed limit" value={`${props.maxspeed} km/h`} />
                )}
                {props.amenity && props['addr:street'] && (
                    <Row label="Street" value={props['addr:street']} />
                )}
                {isGoogleBuilding && (
                    <Row label="Source" value="Google Open Buildings" />
                )}
            </div>

            {/* Google Places enrichment */}
            {isLoadingPlace && (
                <p className="text-[11px] text-muted-foreground animate-pulse">
                    Loading place details…
                </p>
            )}

            {placeDetails && !isLoadingPlace && (
                <>
                    <div className="border-t border-border/40" />
                    <div className="space-y-1.5">
                        {placeDetails.rating !== undefined && (
                            <div className="flex items-center gap-2 text-[11px]">
                                <span className="shrink-0 text-muted-foreground w-24">Rating</span>
                                <StarRating rating={placeDetails.rating} count={placeDetails.userRatingCount} />
                            </div>
                        )}
                        {placeDetails.formattedAddress && (
                            <Row
                                label="Address"
                                value={
                                    <span className="flex items-start gap-1">
                                        <MapPin className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground" />
                                        {placeDetails.formattedAddress}
                                    </span>
                                }
                            />
                        )}
                        {placeDetails.openNow !== undefined && (
                            <Row
                                label="Status"
                                value={
                                    <span className={placeDetails.openNow ? 'text-green-400' : 'text-red-400'}>
                                        {placeDetails.openNow ? 'Open now' : 'Closed'}
                                    </span>
                                }
                            />
                        )}
                        {placeDetails.weekdayDescriptions && placeDetails.weekdayDescriptions.length > 0 && (
                            <div className="text-[10px] text-muted-foreground space-y-0.5">
                                <div className="flex items-center gap-1 text-foreground mb-0.5">
                                    <Clock className="h-3 w-3" />
                                    <span className="font-medium">Opening hours</span>
                                </div>
                                {placeDetails.weekdayDescriptions.map((d, i) => (
                                    <p key={i}>{d}</p>
                                ))}
                            </div>
                        )}
                        {placeDetails.internationalPhoneNumber && (
                            <Row
                                label="Phone"
                                value={
                                    <span className="flex items-center gap-1">
                                        <Phone className="h-3 w-3 text-muted-foreground" />
                                        <a
                                            href={`tel:${placeDetails.internationalPhoneNumber}`}
                                            className="text-blue-400 hover:underline"
                                        >
                                            {placeDetails.internationalPhoneNumber}
                                        </a>
                                    </span>
                                }
                            />
                        )}
                        {placeDetails.websiteUri && (
                            <Row
                                label="Website"
                                value={
                                    <span className="flex items-center gap-1">
                                        <Globe className="h-3 w-3 text-muted-foreground" />
                                        <a
                                            href={placeDetails.websiteUri}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 hover:underline truncate max-w-[140px]"
                                        >
                                            {new URL(placeDetails.websiteUri).hostname}
                                        </a>
                                    </span>
                                }
                            />
                        )}
                        <p className="text-[9px] text-muted-foreground/60 pt-1">
                            via Google Places
                        </p>
                    </div>
                </>
            )}
        </div>
    );
}
