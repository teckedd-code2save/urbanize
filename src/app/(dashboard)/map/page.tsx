import { auth } from '@clerk/nextjs/server';
import { BaseMap } from '@/features/map/components/base-map';

export default async function MapPage() {
    await auth();

    return (
        <div className="flex h-[calc(100dvh-theme(spacing.16))] w-full flex-col">
            {/* Subtracting spacing.16 as a placeholder for potential header height */}
            <main className="flex-1 relative">
                <BaseMap />
            </main>
        </div>
    );
}
