-------------------------------------------------------------------------------
-- 5. scraping_runs table
-------------------------------------------------------------------------------
CREATE TABLE scraping_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    scrape_configuration_id uuid REFERENCES scrape_configurations(id) ON DELETE SET NULL,
    url text NOT NULL,
    status text NOT NULL CHECK (status IN ('success', 'failed')),
    error_message text,
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_scraping_runs_user_id_url ON scraping_runs(user_id, url);
CREATE INDEX idx_scraping_runs_created_at ON scraping_runs(created_at);

CREATE TRIGGER update_scraping_runs_updated_at
BEFORE UPDATE ON scraping_runs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
