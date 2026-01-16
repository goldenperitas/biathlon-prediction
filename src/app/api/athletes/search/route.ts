import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const gender = searchParams.get("gender");

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const supabase = await createClient();

  // Search by family name or given name (case insensitive)
  let dbQuery = supabase
    .from("athletes")
    .select("id, ibu_id, given_name, family_name, nationality, gender")
    .or(`family_name.ilike.%${query}%,given_name.ilike.%${query}%`);

  // Filter by gender if provided
  if (gender) {
    dbQuery = dbQuery.eq("gender", gender);
  }

  const { data: athletes, error } = await dbQuery
    .order("family_name")
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(athletes);
}
