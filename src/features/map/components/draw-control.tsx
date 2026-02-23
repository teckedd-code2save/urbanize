import { MousePointer2, X } from 'lucide-react';

interface DrawControlProps {
    drawingState: 'idle' | 'drawing' | 'drawn';
    onToggleDraw: () => void;
    onClear: () => void;
}

export function DrawControl({ drawingState, onToggleDraw, onClear }: DrawControlProps) {
    return (
        <div className="flex flex-col gap-2 bg-background p-2 rounded-lg shadow-md border border-border">
            <button
                type="button"
                onClick={onToggleDraw}
                className={`p-2 rounded flex items-center justify-center transition-colors ${drawingState !== 'idle' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
                title={drawingState !== 'idle' ? 'Cancel Drawing' : 'Draw Circle'}
                aria-label={drawingState !== 'idle' ? 'Cancel Drawing' : 'Draw Circle'}
            >
                <MousePointer2 className="w-5 h-5" />
            </button>
            {drawingState === 'drawn' && (
                <button
                    type="button"
                    onClick={onClear}
                    className="p-2 rounded flex items-center justify-center hover:bg-destructive/20 text-destructive transition-colors"
                    title="Clear Circle"
                    aria-label="Clear Circle"
                >
                    <X className="w-5 h-5" />
                </button>
            )}
        </div>
    );
}
