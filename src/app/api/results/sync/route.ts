import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const BIATHLON_API_BASE = "https://biathlonresults.com/modules/sportapi/api";

interface ApiResult {
  IBUId: string;
  Rank: string;
  FamilyName: string;
  GivenName: string;
  Nat: string;
  TotalTime: string | null;
  Behind: string | null;
}

interface ResultsResponse {
  Results: ApiResult[];
  Competition?: {
    ShortDescription?: string;
  };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { race_id } = body;

  if (!race_id) {
    return NextResponse.json({ error: "race_id is required" }, { status: 400 });
  }

  // Get the race to find external_id
  const { data: race, error: raceError } = await supabase
    .from("races")
    .select("id, external_id, short_description")
    .eq("id", race_id)
    .single();

  if (raceError || !race) {
    return NextResponse.json({ error: "Race not found" }, { status: 404 });
  }

  try {
    // Fetch results from biathlonresults.com
    const response = await fetch(
      `${BIATHLON_API_BASE}/Results?RaceId=${race.external_id}`
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch results from biathlon API" },
        { status: 502 }
      );
    }

    const data: ResultsResponse = await response.json();
    const apiResults = data.Results || [];

    // Check if this is a relay race (but don't reject - use sync-utils which handles both)
    const isRelay = data.Competition?.ShortDescription?.toLowerCase().includes("relay") ||
                    race.short_description?.toLowerCase().includes("relay");
    
    // Note: Relay race sync is now handled by syncRaceResults in sync-utils.ts

    if (apiResults.length === 0) {
      return NextResponse.json(
        { error: "No results found in API response" },
        { status: 404 }
      );
    }

    // Map API results to our format
    const parsedResults = apiResults
      .filter((r) => r.IBUId && r.Rank)
      .map((r) => ({
        ibu_id: r.IBUId,
        rank: parseInt(r.Rank, 10),
        family_name: r.FamilyName || "",
        given_name: r.GivenName || "",
        nationality: r.Nat || "",
        total_time: r.TotalTime || null,
        behind: r.Behind || null,
      }));

    // Get all athletes by IBU ID to map them
    const ibuIds = parsedResults.map((r) => r.ibu_id);
    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select("id, ibu_id")
      .in("ibu_id", ibuIds);

    if (athletesError) {
      console.error("Athletes fetch error:", athletesError);
      return NextResponse.json({ error: athletesError.message }, { status: 500 });
    }

    // Create a map of IBU ID to athlete ID
    const ibuToAthleteId = new Map<string, string>();
    athletes?.forEach((a) => {
      ibuToAthleteId.set(a.ibu_id, a.id);
    });

    // Prepare race results for insertion
    const raceResults = parsedResults
      .filter((r) => ibuToAthleteId.has(r.ibu_id)) // Only include athletes we know
      .map((r) => ({
        race_id: race.id,
        athlete_id: ibuToAthleteId.get(r.ibu_id),
        country_code: null,
        finish_position: r.rank,
        total_time: r.total_time,
        behind: r.behind,
        status: "finished",
      }));

    // Delete existing results for this race (in case of re-sync)
    await supabase.from("race_results").delete().eq("race_id", race.id);

    // Insert new results
    const { error: insertError } = await supabase
      .from("race_results")
      .insert(raceResults);

    if (insertError) {
      console.error("Insert results error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Update race with sync timestamp
    await supabase
      .from("races")
      .update({ results_synced_at: new Date().toISOString() })
      .eq("id", race.id);

    // Log stats
    const unmatchedCount = parsedResults.length - raceResults.length;

    return NextResponse.json({
      success: true,
      results_count: raceResults.length,
      unmatched_athletes: unmatchedCount,
    });
  } catch (error) {
    console.error("Results sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync results" },
      { status: 500 }
    );
  }
}
