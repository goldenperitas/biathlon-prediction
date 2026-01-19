-- Hit or Miss: 5-Target Prediction System Schema
-- Run this in Supabase SQL Editor

-- Step 1: Drop old predictions table (since we're rebuilding fresh)
DROP TABLE IF EXISTS predictions CASCADE;

-- Step 2: Add columns to races table
ALTER TABLE races ADD COLUMN IF NOT EXISTS results_synced_at TIMESTAMPTZ;
ALTER TABLE races ADD COLUMN IF NOT EXISTS is_relay BOOLEAN DEFAULT FALSE;

-- Step 3: Create race_results table
CREATE TABLE race_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id UUID NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  athlete_id UUID REFERENCES athletes(id),
  country_code VARCHAR(3),
  finish_position INTEGER NOT NULL,
  total_time VARCHAR(20),
  behind VARCHAR(20),
  status VARCHAR(20) DEFAULT 'finished',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT check_athlete_or_country CHECK (
    (athlete_id IS NOT NULL AND country_code IS NULL) OR
    (athlete_id IS NULL AND country_code IS NOT NULL)
  )
);

CREATE INDEX idx_race_results_race ON race_results(race_id);
CREATE INDEX idx_race_results_athlete ON race_results(athlete_id);
CREATE UNIQUE INDEX idx_race_results_unique_athlete ON race_results(race_id, athlete_id) WHERE athlete_id IS NOT NULL;
CREATE UNIQUE INDEX idx_race_results_unique_country ON race_results(race_id, country_code) WHERE country_code IS NOT NULL;

-- Step 4: Create predictions table (new structure)
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  race_id UUID NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_user_race UNIQUE (user_id, race_id)
);

CREATE INDEX idx_predictions_user ON predictions(user_id);
CREATE INDEX idx_predictions_race ON predictions(race_id);

-- Step 5: Create prediction_targets table (5 targets per prediction)
CREATE TABLE prediction_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  target_number INTEGER NOT NULL CHECK (target_number BETWEEN 1 AND 5),
  athlete_id UUID REFERENCES athletes(id),
  country_code VARCHAR(3),
  predicted_position INTEGER NOT NULL CHECK (predicted_position BETWEEN 1 AND 120),
  extra_rounds INTEGER NOT NULL DEFAULT 0 CHECK (extra_rounds >= 0 AND extra_rounds <= 15),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_prediction_target UNIQUE (prediction_id, target_number),
  CONSTRAINT check_target_athlete_or_country CHECK (
    (athlete_id IS NOT NULL AND country_code IS NULL) OR
    (athlete_id IS NULL AND country_code IS NOT NULL)
  )
);

CREATE INDEX idx_prediction_targets_prediction ON prediction_targets(prediction_id);

-- Step 6: Create prediction_scores table
CREATE TABLE prediction_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  hits INTEGER NOT NULL DEFAULT 0 CHECK (hits BETWEEN 0 AND 5),
  precise_hits INTEGER NOT NULL DEFAULT 0 CHECK (precise_hits BETWEEN 0 AND 5),
  range_hits INTEGER NOT NULL DEFAULT 0 CHECK (range_hits BETWEEN 0 AND 5),
  total_score INTEGER NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_prediction_score UNIQUE (prediction_id)
);

-- Step 7: Row Level Security (RLS)

-- race_results: anyone can read
ALTER TABLE race_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view race results" ON race_results FOR SELECT USING (true);
CREATE POLICY "Service role can insert results" ON race_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update results" ON race_results FOR UPDATE USING (true);

-- predictions: users manage their own
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own predictions" ON predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own predictions" ON predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own predictions" ON predictions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own predictions" ON predictions FOR DELETE USING (auth.uid() = user_id);

-- prediction_targets: managed through predictions
ALTER TABLE prediction_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own prediction targets" ON prediction_targets FOR SELECT
  USING (EXISTS (SELECT 1 FROM predictions WHERE id = prediction_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own prediction targets" ON prediction_targets FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM predictions WHERE id = prediction_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own prediction targets" ON prediction_targets FOR UPDATE
  USING (EXISTS (SELECT 1 FROM predictions WHERE id = prediction_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own prediction targets" ON prediction_targets FOR DELETE
  USING (EXISTS (SELECT 1 FROM predictions WHERE id = prediction_id AND user_id = auth.uid()));

-- prediction_scores: anyone can read (for leaderboards)
ALTER TABLE prediction_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view scores" ON prediction_scores FOR SELECT USING (true);
CREATE POLICY "Service role can manage scores" ON prediction_scores FOR ALL USING (true);
