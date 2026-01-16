import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const BIATHLON_API_BASE = "http://biathlonresults.com/modules/sportapi/api";

interface CupResultAthlete {
  IBUId: string;
  GivenName: string;
  FamilyName: string;
  Nat: string;
  Gender: string;
}

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch cups for current season
    const cupsResponse = await fetch(
      `${BIATHLON_API_BASE}/Cups?SeasonId=2526`
    );
    const cups = await cupsResponse.json();

    // Get World Cup Overall standings (Men and Women)
    const wcCups = cups.filter(
      (cup: { CupId: string }) =>
        cup.CupId.includes("SWRLCP") || cup.CupId.includes("MWRLCP")
    );

    const athletes: {
      ibu_id: string;
      given_name: string;
      family_name: string;
      nationality: string;
      gender: string;
    }[] = [];

    const seenIds = new Set<string>();

    for (const cup of wcCups) {
      const resultsResponse = await fetch(
        `${BIATHLON_API_BASE}/CupResults?CupId=${cup.CupId}`
      );
      const results = await resultsResponse.json();

      for (const result of results.Rows || []) {
        if (!seenIds.has(result.IBUId)) {
          seenIds.add(result.IBUId);
          athletes.push({
            ibu_id: result.IBUId,
            given_name: result.GivenName,
            family_name: result.FamilyName,
            nationality: result.Nat,
            gender: cup.CupId.slice(-4, -2) === "SW" ? "W" : "M",
          });
        }
      }
    }

    // Upsert athletes
    const { error } = await supabase.from("athletes").upsert(athletes, {
      onConflict: "ibu_id",
    });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: athletes.length,
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync athletes" },
      { status: 500 }
    );
  }
}
