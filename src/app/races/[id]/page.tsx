import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PredictionForm } from "./PredictionForm";
import Link from "next/link";

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

  // Fetch existing prediction with athlete details
  const { data: prediction } = await supabase
    .from("predictions")
    .select(
      `
      *,
      first_place:athletes!predictions_first_place_id_fkey(*),
      second_place:athletes!predictions_second_place_id_fkey(*),
      third_place:athletes!predictions_third_place_id_fkey(*)
    `
    )
    .eq("race_id", id)
    .eq("user_id", user.id)
    .single();

  const raceDate = new Date(race.start_time);
  const isPast = raceDate < new Date();

  // Parse gender from short_description (ends with " M" or " W")
  const raceGender = race.short_description?.endsWith(" M")
    ? "M"
    : race.short_description?.endsWith(" W")
      ? "W"
      : null;

  // Check if this is a relay race
  const isRelay = race.short_description?.includes("Relay") ?? false;

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
            <p className="text-zinc-500">
              This race has already started. Predictions are locked.
            </p>
            {prediction && (
              <div className="mt-4 space-y-2">
                <p>
                  <span className="text-zinc-400">1st:</span>{" "}
                  {prediction.first_place?.given_name}{" "}
                  {prediction.first_place?.family_name}
                </p>
                <p>
                  <span className="text-zinc-400">2nd:</span>{" "}
                  {prediction.second_place?.given_name}{" "}
                  {prediction.second_place?.family_name}
                </p>
                <p>
                  <span className="text-zinc-400">3rd:</span>{" "}
                  {prediction.third_place?.given_name}{" "}
                  {prediction.third_place?.family_name}
                </p>
              </div>
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
