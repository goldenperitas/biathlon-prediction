import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PredictionForm } from "./PredictionForm";
import Link from "next/link";
import { calculateHitRange } from "@/lib/scoring";
import type { Prediction, PredictionTarget, Athlete } from "@/lib/types";

function formatOrdinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default async function RaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch race
  const { data: race } = await supabase
    .from("races")
    .select("*")
    .eq("id", id)
    .single();

  if (!race) {
    notFound();
  }

  // Fetch existing prediction with targets and athlete details
  const { data: prediction } = await supabase
    .from("predictions")
    .select(`
      *,
      targets:prediction_targets(
        *,
        athlete:athletes(*)
      ),
      score:prediction_scores(*)
    `)
    .eq("race_id", id)
    .eq("user_id", user.id)
    .single();

  const raceDate = new Date(race.start_time);
  const isPast = raceDate < new Date();

  // Parse gender from short_description (starts with "Men" or "Women")
  const raceGender = race.short_description?.startsWith("Men")
    ? "M"
    : race.short_description?.startsWith("Women")
      ? "W"
      : null;

  // Check if this is a relay race
  const isRelay = race.short_description?.includes("Relay") ?? false;

  // Sort targets by target_number for display
  const sortedTargets = prediction?.targets
    ?.sort((a: PredictionTarget, b: PredictionTarget) => a.target_number - b.target_number) || [];

  return (
    <main className="max-w-2xl mx-auto p-8">
      <Link
        href="/dashboard"
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        ← Back to dashboard
      </Link>

      <div className="mt-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {race.short_description}
        </h1>
        <p className="mt-1 text-zinc-500">{race.location}</p>
        <p className="mt-1 text-sm text-zinc-400">
          {raceDate.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Your Prediction</h2>

        {isPast ? (
          <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900">
            <p className="text-zinc-500 mb-4">
              This race has already started. Predictions are locked.
            </p>
            {sortedTargets.length > 0 ? (
              <div className="space-y-3">
                {sortedTargets.map((target: PredictionTarget & { athlete?: Athlete }) => {
                  const { min, max } = calculateHitRange(
                    target.predicted_position,
                    target.extra_rounds
                  );
                  const athleteName = isRelay
                    ? target.country_code
                    : target.athlete
                      ? `${target.athlete.given_name} ${target.athlete.family_name}`
                      : "Unknown";

                  return (
                    <div
                      key={target.target_number}
                      className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-950 rounded-lg"
                    >
                      <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center text-sm font-bold">
                        {target.target_number}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{athleteName}</div>
                        <div className="text-sm text-zinc-500">
                          {formatOrdinal(target.predicted_position)} place
                          {target.extra_rounds > 0 && (
                            <span className="ml-2">
                              (+{target.extra_rounds} rounds → {formatOrdinal(min)}-{formatOrdinal(max)})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Score display if available */}
                {prediction?.score && Array.isArray(prediction.score) && prediction.score.length > 0 && (
                  <div className="mt-4 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                    <div className="text-center">
                      <div className="text-3xl font-bold">
                        {prediction.score[0].hits}/5
                      </div>
                      <div className="text-sm text-zinc-500">Hits</div>
                      <div className="mt-2 text-2xl font-semibold">
                        {prediction.score[0].total_score} pts
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-zinc-400">No prediction was made for this race.</p>
            )}
          </div>
        ) : (
          <PredictionForm
            raceId={id}
            existingPrediction={prediction}
            gender={raceGender}
            isRelay={isRelay}
          />
        )}
      </div>
    </main>
  );
}
