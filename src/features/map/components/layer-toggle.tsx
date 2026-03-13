import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Building2, Route, Layers } from 'lucide-react';

interface LayerToggleProps {
    readonly visibleLayers: {
        readonly buildings: boolean;
        readonly roads: boolean;
    };
    readonly onToggleLayer: (layer: 'buildings' | 'roads') => void;
}

export function LayerToggle({ visibleLayers, onToggleLayer }: LayerToggleProps) {
    return (
        <Card className="w-48 shadow-lg bg-background/95 backdrop-blur border-border/50">
            <CardContent className="p-3 flex flex-col gap-3">
                <div className="flex items-center gap-2 mb-1">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Map Layers</span>
                </div>
                
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <Label htmlFor="buildings-toggle" className="text-sm font-medium">Buildings</Label>
                    </div>
                    <Switch 
                        id="buildings-toggle" 
                        checked={visibleLayers.buildings} 
                        onCheckedChange={() => onToggleLayer('buildings')}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Route className="h-4 w-4 text-amber-500" />
                        <Label htmlFor="roads-toggle" className="text-sm font-medium">Roads</Label>
                    </div>
                    <Switch 
                        id="roads-toggle" 
                        checked={visibleLayers.roads} 
                        onCheckedChange={() => onToggleLayer('roads')}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
