import { db } from '../db';
import { sql } from 'kysely';

export function elementToWkt(element: any): string | null {
    if (element.type === 'node' && element.lat !== undefined && element.lon !== undefined) {
        return `POINT(${element.lon} ${element.lat})`;
    } else if (element.type === 'way' && element.geometry) {
        if (element.geometry.length >= 4 &&
            element.geometry[0].lon === element.geometry[element.geometry.length - 1].lon &&
            element.geometry[0].lat === element.geometry[element.geometry.length - 1].lat) {
            const coords = element.geometry.map((g: any) => `${g.lon} ${g.lat}`).join(', ');
            return `POLYGON((${coords}))`;
        } else if (element.geometry.length >= 2) {
            const coords = element.geometry.map((g: any) => `${g.lon} ${g.lat}`).join(', ');
            return `LINESTRING(${coords})`;
        } else if (element.geometry.length === 1) {
            return `POINT(${element.geometry[0].lon} ${element.geometry[0].lat})`;
        }
    } else if (element.type === 'relation' && element.members) {
        const outerWays = element.members.filter((m: any) => m.type === 'way' && m.role === 'outer' && m.geometry);
        if (outerWays.length > 0) {
            const rings = outerWays.map((way: any) => {
                if (way.geometry.length >= 4 &&
                    way.geometry[0].lon === way.geometry[way.geometry.length - 1].lon &&
                    way.geometry[0].lat === way.geometry[way.geometry.length - 1].lat) {
                    return `(${way.geometry.map((g: any) => `${g.lon} ${g.lat}`).join(', ')})`;
                }
                return null;
            }).filter(Boolean);

            if (rings.length > 0) {
                return `MULTIPOLYGON((${rings.join(', ')}))`;
            }
        }
    }
    return null;
}

export async function processAndInsertGeometry(elements: {
    osmId: number;
    osmType: string;
    tags: any;
    wkt: string;
}[]) {
    if (elements.length === 0) return;

    const BATCH_SIZE = 1000;
    for (let i = 0; i < elements.length; i += BATCH_SIZE) {
        const batch = elements.slice(i, i + BATCH_SIZE);
        await db.insertInto('osmData')
            .values(batch.map((data: any) => ({
                osmId: data.osmId,
                osmType: data.osmType,
                tags: data.tags,
                geom: sql`ST_Transform(ST_MakeValid(ST_GeomFromText(${data.wkt}, 4326)), 5070)`
            })))
            .execute();
    }
}
