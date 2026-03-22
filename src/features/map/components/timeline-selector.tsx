"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

type Availability = "full" | "partial" | "none" | "loading";

interface YearAvailability {
  year: number;
  available: "full" | "partial" | "none";
}

interface TimelineSelectorProps {
  readonly lat?: number;
  readonly lon?: number;
  readonly radiusKm?: number;
  /** Called when both yearA and yearB are validly selected */
  readonly onYearsSelected: (yearA: number, yearB: number) => void;
  /** Resets the comparison when called without years */
  readonly onReset?: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// Availability colour helpers
// ────────────────────────────────────────────────────────────────────────────

function availabilityColor(avail: Availability): string {
  switch (avail) {
    case "full":
      return "bg-emerald-500";
    case "partial":
      return "bg-amber-400";
    case "none":
      return "bg-red-500/60";
    case "loading":
    default:
      return "bg-slate-500/40";
  }
}

function availabilityLabel(avail: Availability): string {
  switch (avail) {
    case "full":
      return "Sufficient data";
    case "partial":
      return "Partial data";
    case "none":
      return "No data";
    case "loading":
    default:
      return "Loading…";
  }
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_RANGE = Array.from(
  { length: CURRENT_YEAR - 2015 + 1 },
  (_, i) => 2015 + i
);

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

export function TimelineSelector({
  lat,
  lon,
  radiusKm,
  onYearsSelected,
  onReset,
}: TimelineSelectorProps) {
  const [yearA, setYearA] = useState<number | null>(null);
  const [yearB, setYearB] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availabilityMap, setAvailabilityMap] = useState<
    Record<number, Availability>
  >(Object.fromEntries(YEAR_RANGE.map((y) => [y, "loading"])));

  // ── Fetch data availability ─────────────────────────────────────────────
  const fetchAvailability = useCallback(async () => {
    if (lat === undefined || lon === undefined || radiusKm === undefined) return;

    setAvailabilityMap(
      Object.fromEntries(YEAR_RANGE.map((y) => [y, "loading"]))
    );

    try {
      const res = await fetch(
        `/api/data-availability?lat=${lat}&lon=${lon}&radiusKm=${radiusKm}`
      );
      if (!res.ok) return;
      const data: { availability: YearAvailability[] } = await res.json();

      setAvailabilityMap(
        Object.fromEntries(
          data.availability.map((a: YearAvailability) => [a.year, a.available])
        )
      );
    } catch {
      // silently degrade — markers will remain grey
    }
  }, [lat, lon, radiusKm]);

  useEffect(() => {
    void fetchAvailability();
  }, [fetchAvailability]);

  // ── Year selection logic ─────────────────────────────────────────────────
  const handleYearClick = (year: number) => {
    setError(null);

    if (yearA === null) {
      setYearA(year);
      return;
    }

    if (year === yearA) {
      setError("Please select two different years.");
      return;
    }

    const a = Math.min(yearA, year);
    const b = Math.max(yearA, year);
    setYearB(year);
    onYearsSelected(a, b);
  };

  const handleReset = () => {
    setYearA(null);
    setYearB(null);
    setError(null);
    onReset?.();
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 w-[min(90vw,700px)] rounded-2xl border border-white/10 bg-slate-900/85 p-4 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Time Travel</h3>
          <p className="text-xs text-slate-400">
            {yearA === null
              ? "Click a year to set Period A (Past)"
              : yearB === null
              ? `Period A: ${yearA} — now click Period B (Present)`
              : `Comparing ${Math.min(yearA, yearB)} → ${Math.max(yearA, yearB)}`}
          </p>
        </div>
        {(yearA !== null || yearB !== null) && (
          <button
            onClick={handleReset}
            className="text-xs text-slate-400 hover:text-white transition-colors"
            aria-label="Reset year selection"
          >
            Reset
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="mb-2 text-xs text-amber-400" role="alert">
          ⚠️ {error}
        </p>
      )}

      {/* Year track */}
      <div className="flex items-end gap-1 overflow-x-auto pb-1">
        {YEAR_RANGE.map((year) => {
          const avail = availabilityMap[year] ?? "loading";
          const isA = year === yearA;
          const isB = year === yearB;
          const isSelected = isA || isB;

          return (
            <button
              key={year}
              onClick={() => handleYearClick(year)}
              title={`${year}: ${availabilityLabel(avail)}`}
              aria-label={`Select year ${year} (${availabilityLabel(avail)})`}
              aria-pressed={isSelected}
              className={cn(
                "group relative flex-1 min-w-[32px] flex flex-col items-center gap-1 rounded-lg px-1 py-2 transition-all duration-150",
                isSelected
                  ? "bg-white/15 ring-1 ring-white/40"
                  : "hover:bg-white/10"
              )}
            >
              {/* Colour indicator dot */}
              <span
                className={cn(
                  "h-2 w-2 rounded-full transition-transform group-hover:scale-110",
                  isSelected ? "scale-125" : "",
                  avail === "loading" ? "animate-pulse" : "",
                  isA
                    ? "bg-blue-400"
                    : isB
                    ? "bg-emerald-400"
                    : availabilityColor(avail)
                )}
              />

              {/* Year label */}
              <span
                className={cn(
                  "text-[9px] font-mono leading-none transition-colors",
                  isA
                    ? "text-blue-300 font-bold"
                    : isB
                    ? "text-emerald-300 font-bold"
                    : "text-slate-400"
                )}
              >
                {year}
              </span>

              {/* A / B badge */}
              {isSelected && (
                <span
                  className={cn(
                    "absolute -top-2 left-1/2 -translate-x-1/2 rounded px-1 text-[8px] font-bold leading-tight",
                    isA ? "bg-blue-500 text-white" : "bg-emerald-500 text-white"
                  )}
                >
                  {isA ? "A" : "B"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 border-t border-white/10 pt-2">
        {(
          [
            ["bg-emerald-500", "Full data"],
            ["bg-amber-400", "Partial"],
            ["bg-red-500/60", "No data"],
            ["bg-blue-400", "Period A"],
            ["bg-emerald-400", "Period B"],
          ] as [string, string][]
        ).map(([color, label]) => (
          <span key={label} className="flex items-center gap-1">
            <span className={cn("h-2 w-2 rounded-full", color)} />
            <span className="text-[9px] text-slate-400">{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
