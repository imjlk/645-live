-- Only new clients enroll. Legacy clients keep their existing attendance contract.
CREATE TABLE IF NOT EXISTS ait_lotto_attendance_experiments (
  user_id BLOB PRIMARY KEY REFERENCES _user(id) ON DELETE CASCADE,
  experiment TEXT NOT NULL CHECK (experiment = 'generation-cadence-v3'),
  enrolled_at INTEGER NOT NULL
) STRICT;
