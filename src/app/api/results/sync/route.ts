import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const BIATHLON_API_BASE = "http://biathlonresults.com/modules/sportapi/api";

interface ParsedResult {
  ibu_id: string;
  rank: number;
  family_name: string;
  given_name: string;
  nationality: string;
  total_time: string | null;
  behind: string | null;
}

function parseResultsXML(xml: string): ParsedResult[] {
  const results: ParsedResult[] = [];

  // Extract all ResultRow elements
  const resultRowRegex = /<ResultRow>([\s\S]*?)<\/ResultRow>/g;
  let match;

  while ((match = resultRowRegex.exec(xml)) !== null) {
    const rowXml = match[1];

    // Extract fields from each row
    const ibuId = rowXml.match(/<IBUId>([^<]+)<\/IBUId>/)?.[1];
    const rank = rowXml.match(/<Rank>(\d+)<\/Rank>/)?.[1];
    const familyName = rowXml.match(/<FamilyName>([^<]+)<\/FamilyName>/)?.[1];
    const givenName = rowXml.match(/<GivenName>([^<]+)<\/GivenName>/)?.[1];
    const nationality = rowXml.match(/<Nat>([^<]+)<\/Nat>/)?.[1];
    const totalTime = rowXml.match(/<TotalTime>([^<]+)<\/TotalTime>/)?.[1];
    const behind = rowXml.match(/<Behind>([^<]+)<\/Behind>/)?.[1];

    // Only include results with valid rank (skip DNF/DNS without rank)
    if (ibuId && rank) {
      results.push({
        ibu_id: ibuId,
        rank: parseInt(rank, 10),
        family_name: familyName || "",
        given_name: givenName || "",
        nationality: nationality || "",
        total_time: totalTime || null,
        behind: behind || null,
      });
    }
  }

  return results;
}

function isRelayRace(xml: string): boolean {
  const shortDesc = xml.match(/<ShortDescription>([^<]+)<\/ShortDescription>/)?.[1] || "";
  return shortDesc.toLowerCase().includes("relay");
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

    const xml = await response.text();

    // Check if this is a relay race
    const isRelay = isRelayRace(xml) || race.short_description?.toLowerCase().includes("relay");

    if (isRelay) {
      // For relay races, we'd need different parsing logic
      // For now, return a message
      return NextResponse.json(
        { error: "Relay race results sync not yet implemented" },
        { status: 501 }
      );
    }

    // Parse individual race results
    const parsedResults = parseResultsXML(xml);

    if (parsedResults.length === 0) {
      return NextResponse.json(
        { error: "No results found in API response" },
        { status: 404 }
      );
    }

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
