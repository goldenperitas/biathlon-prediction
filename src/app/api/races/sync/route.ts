import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { BiathlonEvent, BiathlonCompetition } from "@/lib/types";

const BIATHLON_API_BASE =
  "http://biathlonresults.com/modules/sportapi/api";

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

    return NextResponse.json({
      success: true,
      count: allRaces.length,
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync races" },
      { status: 500 }
    );
  }
}
