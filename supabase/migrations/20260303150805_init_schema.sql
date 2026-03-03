-- Enable pgcrypto for gen_random_uuid() (Useful for older PG versions, built-in on PG13+)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to automatically update the 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-------------------------------------------------------------------------------
-- 1. environments table
-------------------------------------------------------------------------------
CREATE TABLE environments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    name text NOT NULL,
    match_host text NOT NULL,
    match_type text NOT NULL CHECK (match_type IN ('exact', 'suffix', 'wildcard', 'regex')),
    match_path_regex text,
    priority int NOT NULL DEFAULT 100,
    default_wait_selector text,
    default_scroll_count int NOT NULL DEFAULT 0,
    default_formats jsonb NOT NULL DEFAULT '["markdown", "html", "json"]'::jsonb,
    default_headers jsonb NOT NULL DEFAULT '{}'::jsonb,
    cookie_jar jsonb,
    proxy_profile_id uuid,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_environments_user_id_match_host ON environments(user_id, match_host);
CREATE INDEX idx_environments_user_id_priority ON environments(user_id, priority);

CREATE TRIGGER update_environments_updated_at
BEFORE UPDATE ON environments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-------------------------------------------------------------------------------
-- 2. extract_schemas table
-------------------------------------------------------------------------------
CREATE TABLE extract_schemas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    name text NOT NULL,
    schema_json jsonb NOT NULL,
    instructions text,
    model text NOT NULL DEFAULT 'gemini-3-flash-preview',
    max_chars int NOT NULL DEFAULT 100000,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_extract_schemas_updated_at
BEFORE UPDATE ON extract_schemas
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-------------------------------------------------------------------------------
-- 3. webhooks table
-------------------------------------------------------------------------------
CREATE TABLE webhooks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    headers jsonb,
    secret_id uuid,
    enabled bool NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_webhooks_updated_at
BEFORE UPDATE ON webhooks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-------------------------------------------------------------------------------
-- 4. scrape_configurations table
-------------------------------------------------------------------------------
CREATE TABLE scrape_configurations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    environment_id uuid REFERENCES environments(id) ON DELETE SET NULL,
    name text NOT NULL,
    example_url text,
    wait_selector text,
    scroll_count int,
    formats jsonb,
    extract_schema_id uuid REFERENCES extract_schemas(id) ON DELETE SET NULL,
    webhook_id uuid REFERENCES webhooks(id) ON DELETE SET NULL,
    options jsonb,
    is_favorite bool NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_scrape_configurations_user_id_name ON scrape_configurations(user_id, name);

CREATE TRIGGER update_scrape_configurations_updated_at
BEFORE UPDATE ON scrape_configurations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
