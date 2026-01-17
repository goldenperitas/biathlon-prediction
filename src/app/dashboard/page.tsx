import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SyncButton } from "@/components/SyncButton";
import { BiathlonTargets } from "@/components/BiathlonTargets";
import type { Race } from "@/lib/types";

interface PredictionWithScore {
  race_id: string;
  score: Array<{ hits: number; total_score: number }> | { hits: number; total_score: number } | null;
}

// Helper function to extract timezone from ISO string or determine from location
function getTimezoneLabel(startTime: string, location: string | null): string {
  try {
    const date = new Date(startTime);
    // Check if ISO string includes timezone offset (e.g., +01:00, -05:00)
    const isoMatch = startTime.match(/[+-]\d{2}:\d{2}$/);
    if (isoMatch) {
      // Format timezone offset (e.g., "+01:00" -> "UTC+1")
      const offset = isoMatch[0];
      const hours = parseInt(offset.substring(1, 3), 10);
      const sign = offset[0] === '+' ? '+' : '-';
      return `UTC${sign}${hours}`;
    }
    // Try to get timezone from date object using Intl API
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timeZone;
  } catch {
    // Fallback to UTC if parsing fails
    return 'UTC';
  }
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch upcoming races
  const { data: upcomingRaces } = await supabase
    .from("races")
    .select("*")
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(20);

  // Fetch recent past races
  const { data: pastRaces } = await supabase
    .from("races")
    .select("*")
    .lt("start_time", new Date().toISOString())
    .order("start_time", { ascending: false })
    .limit(10);

  // Fetch user's predictions with scores
  const { data: predictions } = await supabase
    .from("predictions")
    .select(`
      race_id,
      score:prediction_scores!fk_prediction_scores_prediction!left(hits, total_score)
    `)
    .eq("user_id", user.id);

  const predictionMap = new Map<string, PredictionWithScore>(
    predictions?.map((p) => [p.race_id, p]) || []
  );

  return (
    <main className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Welcome, {user.user_metadata.display_name || user.email}!
          </p>
        </div>
        <SyncButton />
      </div>

      {/* Upcoming Races */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Upcoming Races</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
          All times are in UTC
        </p>
        {upcomingRaces && upcomingRaces.length > 0 ? (
          <div className="space-y-3">
            {(upcomingRaces as Race[]).map((race) => {
              const prediction = predictionMap.get(race.id);
              const hasPrediction = !!prediction;
              const timezone = getTimezoneLabel(race.start_time, race.location);
              const raceDate = new Date(race.start_time);

              return (
                <Link
                  key={race.id}
                  href={`/races/${race.id}`}
                  className="block p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium">{race.short_description}</h3>
                      <p className="text-sm text-zinc-500 mt-1">
                        {race.location}
                        <span className="ml-2">
                          {raceDate.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </p>
                    </div>
                    <div className="ml-4 text-right">
                      {hasPrediction ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Predicted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-sm font-medium bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="9" strokeWidth={2} />
                          </svg>
                          No prediction
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-lg">
            <p className="text-zinc-500">
              No upcoming races. Click &quot;Sync Races&quot; to fetch from biathlonresults.com.
            </p>
          </div>
        )}
      </section>

      {/* Recent Results */}
      {pastRaces && pastRaces.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Recent Results</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
            All times are in {timezone}
          </p>
          <div className="space-y-3">
            {(pastRaces as Race[]).map((race) => {
              const prediction = predictionMap.get(race.id);
              // Handle score as either array or object (Supabase one-to-one returns object)
              // When no match, Supabase returns null, but typeof null === "object" in JavaScript
              const rawScore = prediction?.score;
              let score: { hits: number; total_score: number } | null = null;
              
              if (rawScore !== null && rawScore !== undefined) {
                if (Array.isArray(rawScore)) {
                  score = rawScore[0] || null;
                } else if (typeof rawScore === 'object' && rawScore !== null && 'hits' in rawScore && 'total_score' in rawScore) {
                  // Valid score object with required properties
                  score = rawScore as { hits: number; total_score: number };
                }
                // If rawScore is {} (empty object), score remains null
              }

              const timezone = getTimezoneLabel(race.start_time, race.location);
              const raceDate = new Date(race.start_time);

              return (
                <Link
                  key={race.id}
                  href={`/races/${race.id}`}
                  className="block p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium">{race.short_description}</h3>
                      <p className="text-sm text-zinc-500 mt-1">
                        {race.location}
                        <span className="ml-2">
                          {raceDate.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </p>
                    </div>
                    <div className="ml-4 text-right">
                      {score ? (
                        <BiathlonTargets hits={score.hits} totalScore={score.total_score} />
                      ) : prediction ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Predicted
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-sm font-medium bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="9" strokeWidth={2} />
                          </svg>
                          No prediction
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
