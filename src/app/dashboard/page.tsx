import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
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
              <div
                key={race.id}
                className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{race.short_description}</h3>
                    <p className="text-sm text-zinc-500 mt-1">
                      {race.location}
                    </p>
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
              </div>
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
