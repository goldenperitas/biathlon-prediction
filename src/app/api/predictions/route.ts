import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { validatePredictionTargets } from "@/lib/scoring";

interface TargetInput {
  target_number: 1 | 2 | 3 | 4 | 5;
  athlete_id?: string | null;
  country_code?: string | null;
  predicted_position: number;
  extra_rounds: number;
}

interface PredictionInput {
  race_id: string;
  targets: TargetInput[];
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: PredictionInput = await request.json();
  const { race_id, targets } = body;

  if (!race_id || !targets) {
    return NextResponse.json(
      { error: "race_id and targets are required" },
      { status: 400 }
    );
  }

  // Check if race exists and get its type
  const { data: race, error: raceError } = await supabase
    .from("races")
    .select("id, short_description, start_time")
    .eq("id", race_id)
    .single();

  if (raceError || !race) {
    return NextResponse.json({ error: "Race not found" }, { status: 404 });
  }

  // Check if race has already started (bypass in test mode)
  const allowPastPredictions = process.env.NEXT_PUBLIC_ALLOW_PAST_PREDICTIONS === 'true';
  if (new Date(race.start_time) <= new Date() && !allowPastPredictions) {
    return NextResponse.json(
      { error: "Cannot modify prediction after race has started" },
      { status: 400 }
    );
  }

  // Determine if this is a relay race
  const isRelay = race.short_description?.toLowerCase().includes("relay") ?? false;

  // Validate targets
  const validation = validatePredictionTargets(targets, isRelay);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Start a transaction-like operation
  // First, check if prediction exists
  const { data: existingPrediction } = await supabase
    .from("predictions")
    .select("id")
    .eq("user_id", user.id)
    .eq("race_id", race_id)
    .single();

  let predictionId: string;

  if (existingPrediction) {
    // Update existing prediction
    predictionId = existingPrediction.id;

    const { error: updateError } = await supabase
      .from("predictions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", predictionId);

    if (updateError) {
      console.error("Update prediction error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Delete existing targets
    const { error: deleteError } = await supabase
      .from("prediction_targets")
      .delete()
      .eq("prediction_id", predictionId);

    if (deleteError) {
      console.error("Delete targets error:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
  } else {
    // Create new prediction
    const { data: newPrediction, error: insertError } = await supabase
      .from("predictions")
      .insert({
        user_id: user.id,
        race_id,
      })
      .select("id")
      .single();

    if (insertError || !newPrediction) {
      console.error("Insert prediction error:", insertError);
      return NextResponse.json({ error: insertError?.message || "Failed to create prediction" }, { status: 500 });
    }

    predictionId = newPrediction.id;
  }

  // Insert new targets
  const targetRows = targets.map((t) => ({
    prediction_id: predictionId,
    target_number: t.target_number,
    athlete_id: isRelay ? null : t.athlete_id,
    country_code: isRelay ? t.country_code : null,
    predicted_position: t.predicted_position,
    extra_rounds: t.extra_rounds,
  }));

  const { error: targetsError } = await supabase
    .from("prediction_targets")
    .insert(targetRows);

  if (targetsError) {
    console.error("Insert targets error:", targetsError);
    return NextResponse.json({ error: targetsError.message }, { status: 500 });
  }

  // Fetch the complete prediction with targets
  const { data: prediction, error: fetchError } = await supabase
    .from("predictions")
    .select(`
      *,
      targets:prediction_targets(
        *,
        athlete:athletes(*)
      )
    `)
    .eq("id", predictionId)
    .single();

  if (fetchError) {
    console.error("Fetch prediction error:", fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  return NextResponse.json(prediction);
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const raceId = searchParams.get("race_id");

  if (!raceId) {
    return NextResponse.json({ error: "race_id is required" }, { status: 400 });
  }

  const { data: prediction, error } = await supabase
    .from("predictions")
    .select(`
      *,
      targets:prediction_targets(
        *,
        athlete:athletes(*)
      ),
      score:prediction_scores!fk_prediction_scores_prediction!left(*)
    `)
    .eq("user_id", user.id)
    .eq("race_id", raceId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No prediction found
      return NextResponse.json(null);
    }
    console.error("Fetch prediction error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(prediction);
}
