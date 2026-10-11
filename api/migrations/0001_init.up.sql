CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid  text NOT NULL UNIQUE,
  email         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE itineraries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source      text NOT NULL CHECK (source IN ('scan', 'manual')),
  scanned_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX itineraries_user_created_idx ON itineraries (user_id, created_at DESC);

CREATE TABLE stops (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id     uuid NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
  stop_number      integer NOT NULL CHECK (stop_number > 0),
  address          text NOT NULL CHECK (length(address) BETWEEN 1 AND 500),
  window_start_min integer CHECK (window_start_min BETWEEN 0 AND 1439),
  window_end_min   integer CHECK (window_end_min BETWEEN 0 AND 1439),
  package_count    integer CHECK (package_count >= 0),
  needs_review     boolean NOT NULL DEFAULT false,
  UNIQUE (itinerary_id, stop_number)
);
