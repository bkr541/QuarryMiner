import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Try loading environment variables
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
    console.log("Fetching users...");
    let userId: string | null = null;

    // Try to get a user from auth.users (requires service role key)
    try {
        const { data: { users }, error } = await supabase.auth.admin.listUsers();
        if (!error && users && users.length > 0) {
            userId = users[0].id;
        }
    } catch (e) {
        console.log("Could not use admin API, falling back to manual query if possible.");
    }

    // If we couldn't get it via admin, try fetching from a public table that depends on user_id, 
    // like environments or scrape_configurations.
    if (!userId) {
        const { data: envs } = await supabase.from('environments').select('user_id').limit(1);
        if (envs && envs.length > 0) {
            userId = envs[0].user_id;
        }
    }

    if (!userId) {
        console.error("Could not determine a user_id to associate the secret with.");
        process.exit(1);
    }

    const apiKey = "qm_" + crypto.randomBytes(32).toString('hex');

    console.log(`Creating QUARRY_MINER_API_KEY for user: ${userId}`);

    const { data, error } = await supabase
        .from('secrets')
        .insert([
            { user_id: userId, name: 'QUARRY_MINER_API_KEY', value: apiKey }
        ])
        .select();

    if (error) {
        console.error("Error inserting secret:", error.message);

        if (error.code === '23505') { // Unique constraint violation
            console.log("Secret already exists! Updating instead...");
            const { error: updateError } = await supabase
                .from('secrets')
                .update({ value: apiKey })
                .eq('user_id', userId)
                .eq('name', 'QUARRY_MINER_API_KEY');

            if (updateError) {
                console.error("Failed to update secret:", updateError);
            } else {
                console.log("Secret updated successfully.");
                console.log("New API Key:", apiKey);
            }
        }
    } else {
        console.log("Secret created successfully.");
        console.log("API Key:", apiKey);
    }
}

run();
