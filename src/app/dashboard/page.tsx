import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SyncButton } from "@/components/SyncButton";
import type { Race } from "@/lib/types";

interface PredictionWithScore {
  race_id: string;
  score: Array<{ hits: number; total_score: number }> | null;
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
      score:prediction_scores(hits, total_score)
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
        {upcomingRaces && upcomingRaces.length > 0 ? (
          <div className="space-y-3">
            {(upcomingRaces as Race[]).map((race) => {
              const prediction = predictionMap.get(race.id);
              const hasPrediction = !!prediction;

              return (
                <Link
                  key={race.id}
                  href={`/races/${race.id}`}
                  className="block p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1 ${hasPrediction ? "text-green-600" : "text-zinc-300 dark:text-zinc-600"}`}
                        title={hasPrediction ? "Prediction submitted" : "No prediction yet"}
                      >
                        {hasPrediction ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="9" strokeWidth={2} />
                          </svg>
                        )}
                      </span>
                      <div>
                        <h3 className="font-medium">{race.short_description}</h3>
                        <p className="text-sm text-zinc-500 mt-1">
                          {race.location}
                        </p>
                      </div>
                    </div>
                    <time className="text-sm text-zinc-500">
                      {new Date(race.start_time).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
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
          <div className="space-y-3">
            {(pastRaces as Race[]).map((race) => {
              const prediction = predictionMap.get(race.id);
              const score = prediction?.score?.[0];

              return (
                <Link
                  key={race.id}
                  href={`/races/${race.id}`}
                  className="block p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      {/* Score badge or no prediction indicator */}
                      {score ? (
                        <div
                          className={`mt-0.5 px-2 py-1 rounded text-sm font-bold ${
                            score.hits >= 4
                              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                              : score.hits >= 2
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                                : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                          }`}
                          title={`${score.total_score} points`}
                        >
                          {score.hits}/5
                        </div>
                      ) : prediction ? (
                        <div className="mt-0.5 px-2 py-1 rounded text-sm font-medium bg-zinc-100 text-zinc-500 dark:bg-zinc-800">
                          Pending
                        </div>
                      ) : (
                        <div className="mt-0.5 px-2 py-1 rounded text-sm text-zinc-400">
                          —
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium">{race.short_description}</h3>
                        <p className="text-sm text-zinc-500 mt-1">
                          {race.location}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <time className="text-sm text-zinc-500">
                        {new Date(race.start_time).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </time>
                      {score && (
                        <div className="text-sm font-medium mt-1">
                          {score.total_score} pts
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
