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
  Place: string;
  NatCode: string;
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
