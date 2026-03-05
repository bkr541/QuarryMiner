import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const apiKey = 'qm_9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const endpointData = {
        user_id: '00000000-0000-0000-0000-000000000000',
        env_slug: 'frontier',
        resource: 'lowfares',
        enabled: true,
        cache_ttl_seconds: 3600,
        require_api_key: true,
        api_key_hash: apiKeyHash,
        request_template: {
            formats: ["json"],
            capture: {
                primarySource: "network",
                network: { urlIncludes: "/Flight/GetLowFareAvailability" }
            }
        },
        response_template: {
            mode: "primary_only",
            pick: "lowFareData"
        }
    };

    console.log("Upserting Frontier Endpoint...");

    const { data, error } = await supabase
        .from('api_endpoints')
        .upsert(endpointData, {
            onConflict: 'user_id, env_slug, resource'
        })
        .select();

    if (error) {
        console.error("Error inserting endpoint:", error.message);
    } else {
        console.log("Endpoint created/updated successfully.");
        console.log("Inserted Row:");
        console.log(JSON.stringify(data, null, 2));
    }
}

run();
