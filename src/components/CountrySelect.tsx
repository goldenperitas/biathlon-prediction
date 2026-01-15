"use client";

import { useState, useEffect, useRef } from "react";

// Top biathlon nations (IOC codes)
const BIATHLON_COUNTRIES = [
  { code: "NOR", name: "Norway" },
  { code: "FRA", name: "France" },
  { code: "GER", name: "Germany" },
  { code: "SWE", name: "Sweden" },
  { code: "ITA", name: "Italy" },
  { code: "AUT", name: "Austria" },
  { code: "SUI", name: "Switzerland" },
  { code: "SLO", name: "Slovenia" },
  { code: "FIN", name: "Finland" },
  { code: "CZE", name: "Czech Republic" },
  { code: "USA", name: "United States" },
  { code: "CAN", name: "Canada" },
  { code: "UKR", name: "Ukraine" },
  { code: "BEL", name: "Belgium" },
  { code: "POL", name: "Poland" },
  { code: "EST", name: "Estonia" },
  { code: "LAT", name: "Latvia" },
  { code: "LTU", name: "Lithuania" },
  { code: "BLR", name: "Belarus" },
  { code: "KAZ", name: "Kazakhstan" },
  { code: "CHN", name: "China" },
  { code: "JPN", name: "Japan" },
  { code: "KOR", name: "South Korea" },
  { code: "SVK", name: "Slovakia" },
  { code: "BUL", name: "Bulgaria" },
  { code: "ROU", name: "Romania" },
];

interface CountrySelectProps {
  label: string;
  value: string | null;
  onChange: (countryCode: string | null) => void;
}

export function CountrySelect({ label, value, onChange }: CountrySelectProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredCountries = query.length > 0
    ? BIATHLON_COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.code.toLowerCase().includes(query.toLowerCase())
      )
    : BIATHLON_COUNTRIES;

  const selectedCountry = value
    ? BIATHLON_COUNTRIES.find((c) => c.code === value)
    : null;

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

  const handleSelect = (code: string) => {
    onChange(code);
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

      {selectedCountry ? (
        <div className="flex items-center justify-between px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-900">
          <span>
            {selectedCountry.name}
            <span className="ml-2 text-zinc-500 text-sm">
              ({selectedCountry.code})
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
          placeholder="Search country..."
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
        />
      )}

      {isOpen && !selectedCountry && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg max-h-60 overflow-auto">
          {filteredCountries.length > 0 ? (
            filteredCountries.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => handleSelect(country.code)}
                className="w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {country.name}
                <span className="ml-2 text-zinc-500 text-sm">
                  ({country.code})
                </span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-zinc-500">No countries found</div>
          )}
        </div>
      )}
    </div>
  );
}
