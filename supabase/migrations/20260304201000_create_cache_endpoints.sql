-------------------------------------------------------------------------------
-- 1. api_endpoints table
-------------------------------------------------------------------------------
CREATE TABLE api_endpoints (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    env_slug text NOT NULL,
    resource text NOT NULL,
    enabled boolean NOT NULL DEFAULT true,
    cache_ttl_seconds int NOT NULL DEFAULT 3600,
    require_api_key boolean NOT NULL DEFAULT true,
    api_key_hash text NOT NULL,
    request_template jsonb NOT NULL,
    response_template jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, env_slug, resource)
);

CREATE INDEX idx_api_endpoints_user_id_env_slug_resource ON api_endpoints(user_id, env_slug, resource);

CREATE TRIGGER update_api_endpoints_updated_at
BEFORE UPDATE ON api_endpoints
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-------------------------------------------------------------------------------
-- 2. api_endpoint_cache table
-------------------------------------------------------------------------------
CREATE TABLE api_endpoint_cache (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    api_endpoint_id uuid NOT NULL REFERENCES api_endpoints(id) ON DELETE CASCADE,
    cache_key text NOT NULL UNIQUE,
    params jsonb NOT NULL,
    payload jsonb,
    status text NOT NULL DEFAULT 'success',
    error_message text,
    fetched_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_endpoint_cache_api_endpoint_id_expires_at ON api_endpoint_cache(api_endpoint_id, expires_at);

CREATE TRIGGER update_api_endpoint_cache_updated_at
BEFORE UPDATE ON api_endpoint_cache
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
