'use client';

import * as React from 'react';
import { useMap } from 'react-map-gl';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

import { SUPPORTED_CITIES, SupportedCityId } from '../constants';

export function CitySearch() {
    const [open, setOpen] = React.useState(false);
    const [value, setValue] = React.useState<SupportedCityId | ''>('london');
    const { 'main-map': map } = useMap();

    const handleSelect = (currentValue: string) => {
        // CommandItem returns lowercase value string by default
        const cityId = currentValue as SupportedCityId;
        setValue(cityId);
        setOpen(false);

        const city = SUPPORTED_CITIES.find((c) => c.id === cityId);

        if (city && map) {
            map.flyTo({
                center: [city.longitude, city.latitude],
                zoom: city.zoom,
                duration: 2000,
            });
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[250px] justify-between shadow-md bg-background"
                >
                    {value
                        ? SUPPORTED_CITIES.find((city) => city.id === value)?.label
                        : "Search city..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search city..." />
                    <CommandList>
                        <CommandEmpty>No city found.</CommandEmpty>
                        <CommandGroup>
                            {SUPPORTED_CITIES.map((city) => (
                                <CommandItem
                                    key={city.id}
                                    value={city.id}
                                    onSelect={handleSelect}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === city.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {city.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
