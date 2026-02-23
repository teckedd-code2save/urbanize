import { BaseMap } from '@/features/map/components/base-map';

export default async function MapPage() {
    return (
        <div className="flex h-[calc(100dvh-theme(spacing.16))] w-full flex-col">
            <main className="flex-1 relative">
                <BaseMap />
            </main>
        </div>
    );
}
