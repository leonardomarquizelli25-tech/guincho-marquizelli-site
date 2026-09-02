BEGIN;

CREATE TYPE content_state AS ENUM (
  'IDEA','STRATEGY_READY','COPY_DRAFT','COPY_REVIEW','COPY_APPROVED',
  'VISUAL_DIRECTION','ASSET_PRODUCTION','VISUAL_PRODUCTION','VISUAL_REVIEW',
  'CHANGES_REQUESTED','AWAITING_APPROVAL','APPROVED','SCHEDULED','PUBLISHING',
  'PUBLISHED','PUBLISHED_SIMULATED','REJECTED','FAILED'
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_provider text,
  external_id text,
  display_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin','editor','approver','publisher','viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (external_provider, external_id)
);

CREATE TABLE contents (
  id text PRIMARY KEY,
  state content_state NOT NULL DEFAULT 'IDEA',
  current_version integer NOT NULL DEFAULT 1 CHECK (current_version > 0),
  planned_at timestamptz,
  published_at timestamptz,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id text NOT NULL REFERENCES contents(id),
  version integer NOT NULL CHECK (version > 0),
  snapshot_hash char(64) NOT NULL,
  status content_state NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(content_id, version)
);

CREATE TABLE briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_version_id uuid NOT NULL REFERENCES content_versions(id),
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_version_id uuid NOT NULL REFERENCES content_versions(id),
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE copies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_version_id uuid NOT NULL REFERENCES content_versions(id),
  payload jsonb NOT NULL,
  caption_hash char(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE visual_directions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_version_id uuid NOT NULL REFERENCES content_versions(id),
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_version_id uuid REFERENCES content_versions(id),
  role text NOT NULL,
  storage_path text NOT NULL,
  sha256 char(64) NOT NULL,
  locked boolean NOT NULL DEFAULT false,
  source_asset_id uuid REFERENCES assets(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE renders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_version_id uuid NOT NULL REFERENCES content_versions(id),
  template text NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  image_path text NOT NULL,
  preview_path text NOT NULL,
  image_hash char(64) NOT NULL,
  manifest jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(content_version_id, image_hash)
);

CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_version_id uuid NOT NULL REFERENCES content_versions(id),
  kind text NOT NULL CHECK (kind IN ('copy','visual')),
  approved boolean NOT NULL,
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  payload jsonb NOT NULL,
  automatic_attempt integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_version_id uuid NOT NULL REFERENCES content_versions(id),
  approver_user_id uuid REFERENCES users(id),
  approver_external_id text NOT NULL,
  chat_id text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approved','changes_requested','rejected','postponed')),
  approved_image_hash char(64),
  approved_caption_hash char(64),
  comment text NOT NULL DEFAULT '',
  decided_at timestamptz NOT NULL,
  simulated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id text NOT NULL REFERENCES contents(id),
  from_version integer NOT NULL,
  to_version integer NOT NULL,
  instruction text NOT NULL,
  requested_by uuid REFERENCES users(id),
  return_stage content_state NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (to_version > from_version)
);

CREATE TABLE publication_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_version_id uuid NOT NULL REFERENCES content_versions(id),
  idempotency_key text NOT NULL UNIQUE,
  scheduled_at timestamptz,
  status text NOT NULL CHECK (status IN ('pending','processing','completed','failed','cancelled')),
  attempts integer NOT NULL DEFAULT 0,
  last_error jsonb,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_version_id uuid NOT NULL UNIQUE REFERENCES content_versions(id),
  publication_job_id uuid NOT NULL UNIQUE REFERENCES publication_jobs(id),
  provider_media_id text NOT NULL UNIQUE,
  permalink text,
  mode text NOT NULL CHECK (mode IN ('dry-run','staging','production')),
  simulated boolean NOT NULL,
  provider_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz NOT NULL
);

CREATE TABLE metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES publications(id),
  reach bigint, impressions bigint, likes bigint, comments bigint, saves bigint,
  shares bigint, profile_visits bigint, clicks bigint, followers_gained bigint,
  messages_received bigint,
  collected_at timestamptz NOT NULL,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(publication_id, collected_at)
);

CREATE TABLE audit_logs (
  id bigserial PRIMARY KEY,
  content_id text REFERENCES contents(id),
  content_version integer,
  actor_type text NOT NULL,
  actor_id text NOT NULL,
  action text NOT NULL,
  from_state content_state,
  to_state content_state,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX contents_state_idx ON contents(state);
CREATE INDEX contents_planned_at_idx ON contents(planned_at) WHERE planned_at IS NOT NULL;
CREATE INDEX versions_content_idx ON content_versions(content_id, version DESC);
CREATE INDEX reviews_version_idx ON reviews(content_version_id, kind);
CREATE INDEX audit_content_idx ON audit_logs(content_id, created_at DESC);
CREATE INDEX metrics_publication_idx ON metrics(publication_id, collected_at DESC);

COMMIT;
