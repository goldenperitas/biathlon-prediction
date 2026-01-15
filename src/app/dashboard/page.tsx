import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SyncButton } from "@/components/SyncButton";
import type { Race } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch upcoming races
  const { data: races } = await supabase
    .from("races")
    .select("*")
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(20);

  // Fetch user's predictions to show status on race cards
  const { data: predictions } = await supabase
    .from("predictions")
    .select("race_id")
    .eq("user_id", user.id);

  const predictedRaceIds = new Set(predictions?.map((p) => p.race_id) || []);

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

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Upcoming Races</h2>
        {races && races.length > 0 ? (
          <div className="space-y-3">
            {(races as Race[]).map((race) => (
              <Link
                key={race.id}
                href={`/races/${race.id}`}
                className="block p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 ${predictedRaceIds.has(race.id) ? "text-green-600" : "text-zinc-300 dark:text-zinc-600"}`}
                      title={predictedRaceIds.has(race.id) ? "Prediction submitted" : "No prediction yet"}
                    >
                      {predictedRaceIds.has(race.id) ? (
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
            ))}
          </div>
        ) : (
          <div className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-lg">
            <p className="text-zinc-500">
              No upcoming races. Click &quot;Sync Races&quot; to fetch from biathlonresults.com.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
