"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AthleteSelect } from "@/components/AthleteSelect";
import { CountrySelect } from "@/components/CountrySelect";
import type { Athlete } from "@/lib/types";

interface PredictionFormProps {
  raceId: string;
  existingPrediction: {
    first_place: Athlete | null;
    second_place: Athlete | null;
    third_place: Athlete | null;
    first_place_country?: string | null;
    second_place_country?: string | null;
    third_place_country?: string | null;
  } | null;
  gender?: "M" | "W" | null;
  isRelay?: boolean;
}

export function PredictionForm({
  raceId,
  existingPrediction,
  gender,
  isRelay = false,
}: PredictionFormProps) {
  const router = useRouter();

  // Athlete state (for individual races)
  const [firstPlace, setFirstPlace] = useState<Athlete | null>(
    existingPrediction?.first_place || null
  );
  const [secondPlace, setSecondPlace] = useState<Athlete | null>(
    existingPrediction?.second_place || null
  );
  const [thirdPlace, setThirdPlace] = useState<Athlete | null>(
    existingPrediction?.third_place || null
  );

  // Country state (for relay races)
  const [firstCountry, setFirstCountry] = useState<string | null>(
    existingPrediction?.first_place_country || null
  );
  const [secondCountry, setSecondCountry] = useState<string | null>(
    existingPrediction?.second_place_country || null
  );
  const [thirdCountry, setThirdCountry] = useState<string | null>(
    existingPrediction?.third_place_country || null
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (isRelay) {
      if (!firstCountry || !secondCountry || !thirdCountry) {
        setError("Please select all three podium positions");
        setLoading(false);
        return;
      }
    } else {
      if (!firstPlace || !secondPlace || !thirdPlace) {
        setError("Please select all three podium positions");
        setLoading(false);
        return;
      }
    }

    try {
      const body = isRelay
        ? {
            race_id: raceId,
            first_place_country: firstCountry,
            second_place_country: secondCountry,
            third_place_country: thirdCountry,
          }
        : {
            race_id: raceId,
            first_place_id: firstPlace!.id,
            second_place_id: secondPlace!.id,
            third_place_id: thirdPlace!.id,
          };

      const response = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save prediction");
      }

      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isRelay ? (
        <>
          <CountrySelect
            label="1st Place"
            value={firstCountry}
            onChange={setFirstCountry}
          />
          <CountrySelect
            label="2nd Place"
            value={secondCountry}
            onChange={setSecondCountry}
          />
          <CountrySelect
            label="3rd Place"
            value={thirdCountry}
            onChange={setThirdCountry}
          />
        </>
      ) : (
        <>
          <AthleteSelect
            label="1st Place"
            value={firstPlace}
            onChange={setFirstPlace}
            gender={gender ?? undefined}
          />
          <AthleteSelect
            label="2nd Place"
            value={secondPlace}
            onChange={setSecondPlace}
            gender={gender ?? undefined}
          />
          <AthleteSelect
            label="3rd Place"
            value={thirdPlace}
            onChange={setThirdPlace}
            gender={gender ?? undefined}
          />
        </>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {success && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Prediction saved!
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors"
      >
        {loading
          ? "Saving..."
          : existingPrediction
            ? "Update Prediction"
            : "Save Prediction"}
      </button>
    </form>
  );
}
