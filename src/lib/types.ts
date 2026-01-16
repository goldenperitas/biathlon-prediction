// Database types
export interface Race {
  id: string;
  external_id: string;
  name: string;
  short_description: string | null;
  event_name: string | null;
  location: string | null;
  start_time: string;
  status: "upcoming" | "in_progress" | "completed";
  created_at: string;
}

export interface Athlete {
  id: string;
  ibu_id: string;
  given_name: string;
  family_name: string;
  nationality: string | null;
  gender: string | null;
  created_at: string;
}

// biathlonresults.com API response types
export interface BiathlonEvent {
  EventId: string;
  SeasonId: string;
  Organizer: string;
  Nat: string;
  StartDate: string;
  EndDate: string;
  Level: number;
  Description: string;
}

export interface BiathlonCompetition {
  RaceId: string;
  StartTime: string;
  Description: string;
  ShortDescription: string;
  catId: string;
  DisciplineId: string;
  StatusId: number;
  StatusText: string;
}

// Prediction types (5-target system)
export interface PredictionTarget {
  id: string;
  prediction_id: string;
  target_number: 1 | 2 | 3 | 4 | 5;
  athlete_id: string | null;
  country_code: string | null;
  predicted_position: number; // 1-30
  extra_rounds: number; // 0-10
  created_at: string;
  // Joined data
  athlete?: Athlete;
}

export interface Prediction {
  id: string;
  user_id: string;
  race_id: string;
  created_at: string;
  updated_at: string;
  // Joined data
  targets?: PredictionTarget[];
  score?: PredictionScore;
}

export interface PredictionScore {
  id: string;
  prediction_id: string;
  hits: number; // 0-5
  precise_hits: number; // 0-5
  range_hits: number; // 0-5
  total_score: number;
  calculated_at: string;
}

export interface RaceResult {
  id: string;
  race_id: string;
  athlete_id: string | null;
  country_code: string | null;
  finish_position: number;
  total_time: string | null;
  behind: string | null;
  status: "finished" | "dnf" | "dns" | "dsq";
  created_at: string;
  // Joined data
  athlete?: Athlete;
}

// For displaying target results after a race
export interface TargetResult {
  target_number: 1 | 2 | 3 | 4 | 5;
  athlete_id: string | null;
  country_code: string | null;
  athlete_name: string;
  predicted_position: number;
  actual_position: number | null;
  extra_rounds: number;
  hit_range_min: number;
  hit_range_max: number;
  is_hit: boolean;
  is_precise: boolean;
  points_earned: number;
  has_multiplier: boolean; // predicted beyond 20th
}
