import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { BiathlonEvent, BiathlonCompetition } from "@/lib/types";
import { syncRaceResults, calculateRaceScores } from "@/lib/sync-utils";

const BIATHLON_API_BASE =
  "https://biathlonresults.com/modules/sportapi/api";

export async function POST() {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch World Cup events for current season (2024-2025 = 2425)
    const eventsResponse = await fetch(
      `${BIATHLON_API_BASE}/Events?SeasonId=2526&Level=1`
    );
    const events: BiathlonEvent[] = await eventsResponse.json();

    const allRaces: {
      external_id: string;
      name: string;
      short_description: string;
      event_name: string;
      location: string;
      start_time: string;
    }[] = [];

    // Fetch competitions for each event
    for (const event of events) {
      const compsResponse = await fetch(
        `${BIATHLON_API_BASE}/Competitions?EventId=${event.EventId}`
      );
      const competitions: BiathlonCompetition[] = await compsResponse.json();

      for (const comp of competitions) {
        allRaces.push({
          external_id: comp.RaceId,
          name: comp.Description,
          short_description: comp.ShortDescription,
          event_name: event.Description,
          location: `${event.Organizer}, ${event.Nat}`,
          start_time: comp.StartTime,
        });
      }
    }

    // Upsert races into database
    const { error } = await supabase.from("races").upsert(allRaces, {
      onConflict: "external_id",
    });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Find past races with predictions that need scoring
    const { data: pastRacesWithPredictions } = await supabase
      .from("races")
      .select("id, external_id, short_description, results_synced_at")
      .lt("start_time", new Date().toISOString())
      .not("short_description", "ilike", "%relay%");

    console.log(`[Sync] Found ${pastRacesWithPredictions?.length || 0} past non-relay races`);

    let scoresCalculated = 0;

    // For each past race, sync results and calculate scores if it has predictions
    for (const race of pastRacesWithPredictions || []) {
      const { count } = await supabase
        .from("predictions")
        .select("*", { count: "exact", head: true })
        .eq("race_id", race.id);

      if (count && count > 0) {
        console.log(`[Sync] Race ${race.id} (${race.short_description}) has ${count} predictions`);
        const syncResult = await syncRaceResults(supabase, race.id);
        console.log(`[Sync] Results sync:`, syncResult);

        const scoreResult = await calculateRaceScores(supabase, race.id);
        console.log(`[Sync] Score calculation:`, scoreResult);

        if (scoreResult.success && scoreResult.scores_calculated) {
          scoresCalculated += scoreResult.scores_calculated;
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: allRaces.length,
      scores_calculated: scoresCalculated,
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync races" },
      { status: 500 }
    );
  }
}
