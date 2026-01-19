-- Update predicted_position constraint to allow 1-120 instead of 1-30
-- Run this in Supabase SQL Editor if you're getting constraint violations

-- Drop the old constraint (PostgreSQL may auto-generate different names)
ALTER TABLE prediction_targets 
DROP CONSTRAINT IF EXISTS prediction_targets_predicted_position_check;

-- Also try dropping any constraint that might be auto-named
-- This query will show you the actual constraint name if the above doesn't work:
-- SELECT conname FROM pg_constraint WHERE conrelid = 'prediction_targets'::regclass AND contype = 'c';

-- Add the correct constraint (1-120)
ALTER TABLE prediction_targets 
ADD CONSTRAINT prediction_targets_predicted_position_check 
CHECK (predicted_position BETWEEN 1 AND 120);
