-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id integer PRIMARY KEY DEFAULT 1,
  include_intercepted_responses boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  -- Ensure only one row exists
  CONSTRAINT system_settings_single_row CHECK (id = 1)
);

-- Enable RLS (though local typical assumes service role, good practice)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow all access for now (or adjust as governed by service role policies)
CREATE POLICY "Enable all operations for all users"
ON public.system_settings
FOR ALL USING (true) WITH CHECK (true);

-- Create updated_at trigger logic if it doesn't already exist from previous migrations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
    CREATE FUNCTION public.handle_updated_at()
    RETURNS TRIGGER AS $trigger$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $trigger$ LANGUAGE plpgsql;
  END IF;
END
$$;

-- Attach trigger to system_settings table
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert the default configuration row
INSERT INTO public.system_settings (id, include_intercepted_responses)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;
