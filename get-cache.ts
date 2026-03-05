import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: [".env.local", ".env"] });
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data } = await supabase
    .from('api_endpoint_cache')
    .select('payload')
    .eq('api_endpoint_id', '96164cc6-1dc2-441b-a257-b18e79d13d17')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single();

  if (data?.payload?.diagnostics?.screenshotBase64) {
    fs.writeFileSync('/tmp/b64.txt', data.payload.diagnostics.screenshotBase64);
    console.log('Saved b64');
  } else {
    console.log('No screenshot found', data?.payload);
  }
}
run();
