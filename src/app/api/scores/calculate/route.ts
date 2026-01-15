import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  calculatePredictionResults,
  calculateTotalScore,
} from "@/lib/scoring";
import type { PredictionTarget, RaceResult } from "@/lib/types";

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

  // Get the race to check if it's a relay
  const { data: race, error: raceError } = await supabase
    .from("races")
    .select("id, short_description, results_synced_at")
    .eq("id", race_id)
    .single();

  if (raceError || !race) {
    return NextResponse.json({ error: "Race not found" }, { status: 404 });
  }

  if (!race.results_synced_at) {
    return NextResponse.json(
      { error: "Race results have not been synced yet" },
      { status: 400 }
    );
  }

  const isRelay = race.short_description?.toLowerCase().includes("relay") ?? false;

  // Get all race results
  const { data: raceResults, error: resultsError } = await supabase
    .from("race_results")
    .select("*")
    .eq("race_id", race_id);

  if (resultsError) {
    console.error("Results fetch error:", resultsError);
    return NextResponse.json({ error: resultsError.message }, { status: 500 });
  }

  if (!raceResults || raceResults.length === 0) {
    return NextResponse.json(
      { error: "No race results found" },
      { status: 404 }
    );
  }

  // Get all predictions for this race with their targets
  const { data: predictions, error: predictionsError } = await supabase
    .from("predictions")
    .select(`
      id,
      user_id,
      targets:prediction_targets(*)
    `)
    .eq("race_id", race_id);

  if (predictionsError) {
    console.error("Predictions fetch error:", predictionsError);
    return NextResponse.json({ error: predictionsError.message }, { status: 500 });
  }

  if (!predictions || predictions.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No predictions to score",
      scores_calculated: 0,
    });
  }

  // Calculate scores for each prediction
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

    // Calculate results for each target
    const targetResults = calculatePredictionResults(targets, results, isRelay);

    // Calculate total score
    const score = calculateTotalScore(targetResults);

    scoresToUpsert.push({
      prediction_id: prediction.id,
      hits: score.hits,
      precise_hits: score.preciseHits,
      range_hits: score.rangeHits,
      total_score: score.totalScore,
    });
  }

  // Upsert all scores
  const { error: upsertError } = await supabase
    .from("prediction_scores")
    .upsert(scoresToUpsert, {
      onConflict: "prediction_id",
    });

  if (upsertError) {
    console.error("Score upsert error:", upsertError);
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    scores_calculated: scoresToUpsert.length,
  });
}
