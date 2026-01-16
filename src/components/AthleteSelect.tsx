"use client";

import { useState, useEffect, useRef } from "react";
import type { Athlete } from "@/lib/types";

interface AthleteSelectProps {
  label: string;
  value: Athlete | null;
  onChange: (athlete: Athlete | null) => void;
  gender?: "M" | "W";
}

export function AthleteSelect({
  label,
  value,
  onChange,
  gender,
}: AthleteSelectProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Athlete[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const url = new URL("/api/athletes/search", window.location.origin);
        url.searchParams.set("q", query);
        if (gender) url.searchParams.set("gender", gender);

        const response = await fetch(url);
        const data = await response.json();
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, gender]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (athlete: Athlete) => {
    onChange(athlete);
    setQuery("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium mb-1">{label}</label>

      {value ? (
        <div className="flex items-center justify-between px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-900">
          <span>
            {value.given_name} {value.family_name}
            <span className="ml-2 text-zinc-500 text-sm">
              ({value.nationality})
            </span>
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            ✕
          </button>
        </div>
      ) : (
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search athlete..."
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
        />
      )}

      {isOpen && !value && (query.length >= 2 || results.length > 0) && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="px-3 py-2 text-zinc-500">Searching...</div>
          ) : results.length > 0 ? (
            results.map((athlete) => (
              <button
                key={athlete.id}
                type="button"
                onClick={() => handleSelect(athlete)}
                className="w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {athlete.given_name} {athlete.family_name}
                <span className="ml-2 text-zinc-500 text-sm">
                  ({athlete.nationality})
                </span>
              </button>
            ))
          ) : query.length >= 2 ? (
            <div className="px-3 py-2 text-zinc-500">No athletes found</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
