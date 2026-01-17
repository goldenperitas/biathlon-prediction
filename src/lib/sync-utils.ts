import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculatePredictionResults,
  calculateTotalScore,
} from "@/lib/scoring";
import type { PredictionTarget, RaceResult } from "@/lib/types";

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
}

export async function syncRaceResults(
  supabase: SupabaseClient,
  raceId: string
): Promise<{ success: boolean; error?: string; results_count?: number }> {
  const { data: race, error: raceError } = await supabase
    .from("races")
    .select("id, external_id, short_description")
    .eq("id", raceId)
    .single();

  if (raceError || !race) {
    return { success: false, error: "Race not found" };
  }

  const isRelay = race.short_description?.toLowerCase().includes("relay") ?? false;

  try {
    const response = await fetch(
      `${BIATHLON_API_BASE}/Results?RaceId=${race.external_id}`
    );

    if (!response.ok) {
      return { success: false, error: "Failed to fetch results from biathlon API" };
    }

    const data: ResultsResponse = await response.json();
    const apiResults = data.Results || [];

    if (apiResults.length === 0) {
      return { success: false, error: "No results found in API response" };
    }

    // Delete existing results first to avoid duplicate key errors
    await supabase.from("race_results").delete().eq("race_id", race.id);

    let raceResults: Array<{
      race_id: string;
      athlete_id: string | null;
      country_code: string | null;
      finish_position: number;
      total_time: string | null;
      behind: string | null;
      status: string;
    }>;

    if (isRelay) {
      // For relay races, group by country (Nat) and use the best rank for each country
      const countryResults = new Map<string, {
        rank: number;
        total_time: string | null;
        behind: string | null;
      }>();

      for (const r of apiResults) {
        if (!r.Nat || !r.Rank) continue;
        const rank = parseInt(r.Rank, 10);
        const existing = countryResults.get(r.Nat);
        if (!existing || rank < existing.rank) {
          countryResults.set(r.Nat, {
            rank,
            total_time: r.TotalTime || null,
            behind: r.Behind || null,
          });
        }
      }

      raceResults = Array.from(countryResults.entries()).map(([country, result]) => ({
        race_id: race.id,
        athlete_id: null,
        country_code: country,
        finish_position: result.rank,
        total_time: result.total_time,
        behind: result.behind,
        status: "finished",
      }));
    } else {
      // For non-relay races, map by athlete IBU ID
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

      const ibuIds = parsedResults.map((r) => r.ibu_id);
      const { data: athletes, error: athletesError } = await supabase
        .from("athletes")
        .select("id, ibu_id")
        .in("ibu_id", ibuIds);

      if (athletesError) {
        return { success: false, error: athletesError.message };
      }

      const ibuToAthleteId = new Map<string, string>();
      athletes?.forEach((a) => {
        ibuToAthleteId.set(a.ibu_id, a.id);
      });

      raceResults = parsedResults
        .filter((r) => ibuToAthleteId.has(r.ibu_id))
        .map((r) => ({
          race_id: race.id,
          athlete_id: ibuToAthleteId.get(r.ibu_id)!,
          country_code: null,
          finish_position: r.rank,
          total_time: r.total_time,
          behind: r.behind,
          status: "finished",
        }));
    }

    const { error: insertError } = await supabase
      .from("race_results")
      .insert(raceResults);

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    await supabase
      .from("races")
      .update({ results_synced_at: new Date().toISOString() })
      .eq("id", race.id);

    return { success: true, results_count: raceResults.length };
  } catch (error) {
    console.error("Results sync error:", error);
    return { success: false, error: "Failed to sync results" };
  }
}

export async function calculateRaceScores(
  supabase: SupabaseClient,
  raceId: string
): Promise<{ success: boolean; error?: string; scores_calculated?: number }> {
  const { data: race, error: raceError } = await supabase
    .from("races")
    .select("id, short_description, results_synced_at")
    .eq("id", raceId)
    .single();

  if (raceError || !race) {
    return { success: false, error: "Race not found" };
  }

  if (!race.results_synced_at) {
    return { success: false, error: "Race results have not been synced yet" };
  }

  const isRelay = race.short_description?.toLowerCase().includes("relay") ?? false;

  const { data: raceResults, error: resultsError } = await supabase
    .from("race_results")
    .select("*")
    .eq("race_id", raceId);

  if (resultsError) {
    return { success: false, error: resultsError.message };
  }

  if (!raceResults || raceResults.length === 0) {
    return { success: false, error: "No race results found" };
  }

  const { data: predictions, error: predictionsError } = await supabase
    .from("predictions")
    .select(`
      id,
      user_id,
      targets:prediction_targets(*)
    `)
    .eq("race_id", raceId);

  if (predictionsError) {
    return { success: false, error: predictionsError.message };
  }

  if (!predictions || predictions.length === 0) {
    return { success: true, scores_calculated: 0 };
  }

  const scoresToUpsert: Array<{
    prediction_id: string;
    hits: number;
    precise_hits: number;
    range_hits: number;
    total_score: number;
  }> = [];

  for (const prediction of predictions) {
    const targets = prediction.targets as PredictionTarget[];
    const results = raceResults as RaceResult[];

    const targetResults = calculatePredictionResults(targets, results, isRelay);
    const score = calculateTotalScore(targetResults);

    scoresToUpsert.push({
      prediction_id: prediction.id,
      hits: score.hits,
      precise_hits: score.preciseHits,
      range_hits: score.rangeHits,
      total_score: score.totalScore,
    });
  }

  const { error: upsertError } = await supabase
    .from("prediction_scores")
    .upsert(scoresToUpsert, {
      onConflict: "prediction_id",
    });

  if (upsertError) {
    return { success: false, error: upsertError.message };
  }

  return { success: true, scores_calculated: scoresToUpsert.length };
}
