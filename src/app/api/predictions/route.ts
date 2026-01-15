import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    race_id,
    first_place_id,
    second_place_id,
    third_place_id,
    first_place_country,
    second_place_country,
    third_place_country,
  } = body;

  // Determine if this is a relay prediction (country codes) or individual (athlete IDs)
  const isRelay = !!first_place_country;

  if (isRelay) {
    if (!race_id || !first_place_country || !second_place_country || !third_place_country) {
      return NextResponse.json(
        { error: "All podium positions are required" },
        { status: 400 }
      );
    }
  } else {
    if (!race_id || !first_place_id || !second_place_id || !third_place_id) {
      return NextResponse.json(
        { error: "All podium positions are required" },
        { status: 400 }
      );
    }
  }

  // Build the prediction object based on race type
  const predictionData = isRelay
    ? {
        user_id: user.id,
        race_id,
        first_place_id: null,
        second_place_id: null,
        third_place_id: null,
        first_place_country,
        second_place_country,
        third_place_country,
      }
    : {
        user_id: user.id,
        race_id,
        first_place_id,
        second_place_id,
        third_place_id,
        first_place_country: null,
        second_place_country: null,
        third_place_country: null,
      };

  // Upsert prediction (update if exists, insert if not)
  const { data, error } = await supabase
    .from("predictions")
    .upsert(predictionData, {
      onConflict: "user_id,race_id",
    })
    .select()
    .single();

  if (error) {
    console.error("Prediction error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
