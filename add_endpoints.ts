import fs from 'fs';
import path from 'path';

const file = path.resolve('server.ts');
let code = fs.readFileSync(file, 'utf8');

const anchor = '  // Catch-all to ensure unmatched /api routes return JSON, preventing fallback to Vite SPA handler';
const startIndex = code.indexOf(anchor);

if (startIndex === -1) {
    throw new Error("Could not find anchor to inject API endpoints");
}

const endpointsCode = `

  // --- Admin API Endpoints for Cache-Backed Data ---
  app.post("/api/v1/admin/endpoints", async (req, res) => {
    try {
      const { env_slug, resource, cache_ttl_seconds = 3600, request_template, response_template = null, enabled = true, require_api_key = true } = req.body;
      const plaintextKey = generateApiKey();
      const api_key_hash = hashApiKey(plaintextKey);

      const { data, error } = await supabase
        .from('api_endpoints')
        .insert([{
          user_id: req.userId,
          env_slug,
          resource,
          cache_ttl_seconds,
          request_template,
          response_template,
          enabled,
          require_api_key,
          api_key_hash
        }])
        .select()
        .single();
        
      if (error) throw error;
      res.json({ success: true, data, apiKey: plaintextKey });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/v1/admin/endpoints", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('api_endpoints')
        .select('*')
        .eq('user_id', req.userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/v1/admin/endpoints/:id/rotate_key", async (req, res) => {
    try {
      const plaintextKey = generateApiKey();
      const api_key_hash = hashApiKey(plaintextKey);
      const { data, error } = await supabase
        .from('api_endpoints')
        .update({ api_key_hash })
        .eq('id', req.params.id)
        .eq('user_id', req.userId)
        .select()
        .single();
      if (error) throw error;
      res.json({ success: true, data, apiKey: plaintextKey });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- Consumer Data API ---
  app.get("/api/v1/data/:env_slug/:resource", async (req, res) => {
    try {
      const { env_slug, resource } = req.params;
      const queryParams = req.query as Record<string, any>;
      const providedKey = req.headers['x-api-key'] as string;

      // 1. Lookup endpoint
      const { data: endpoint, error: epError } = await supabase
        .from('api_endpoints')
        .select('*')
        .eq('user_id', req.userId)
        .eq('env_slug', env_slug)
        .eq('resource', resource)
        .eq('enabled', true)
        .single();

      if (epError || !endpoint) {
        return res.status(404).json({ ok: false, env: env_slug, resource, source: "fresh", params: queryParams, error: "Endpoint not found or disabled" });
      }

      // 2. verify API key
      if (endpoint.require_api_key) {
        if (!providedKey || !verifyApiKey(providedKey, endpoint.api_key_hash)) {
          return res.status(401).json({ ok: false, env: env_slug, resource, source: "fresh", params: queryParams, error: "Unauthorized: Invalid or missing X-API-Key" });
        }
      }

      // 3. Normalize & cache key
      const cache_key = generateCacheKey(endpoint.id, queryParams);

      // 5. Cache-aside Check
      const { data: cached, error: cacheErr } = await supabase
        .from('api_endpoint_cache')
        .select('*')
        .eq('cache_key', cache_key)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (cached && cached.payload) {
        return res.json({
          ok: cached.status === 'success',
          env: env_slug,
          resource,
          source: "cache",
          fetchedAt: cached.fetched_at,
          expiresAt: cached.expires_at,
          params: queryParams,
          data: cached.payload
        });
      }

      // 6. Missing/Stale: Build request and Scrape
      const scrapeArgs = { ...endpoint.request_template, userId: req.userId };

      if (env_slug === 'frontier' && resource === 'lowfares') {
         const o = queryParams.o || queryParams.origin;
         const d = queryParams.d || queryParams.destination;
         const date = queryParams.date; 
         const ftype = queryParams.ftype || 'GW';
         const adt = queryParams.adt || '1';
         
         if (!o || !d || !date) {
            return res.status(400).json({ ok: false, env: env_slug, resource, source: "fresh", params: queryParams, error: "Missing required params: o, d, date" });
         }
         
         scrapeArgs.url = \`https://booking.flyfrontier.com/Flight/InternalSelect?o1=\${o}&d1=\${d}&dd1=\${date}%2000%3A00%3A00&adt=\${adt}&umnr=false&loy=false&mon=true&ftype=\${ftype}\`;
      } else {
         if (queryParams.url) {
           scrapeArgs.url = queryParams.url;
         }
      }

      if (!scrapeArgs.url) {
        return res.status(400).json({ ok: false, env: env_slug, resource, source: "fresh", params: queryParams, error: "Missing final URL for scrape" });
      }

      const scrapeResult = await runScrapeInternal(scrapeArgs);
      
      let finalPayload = scrapeResult.body;
      let isSuccess = scrapeResult.status >= 200 && scrapeResult.status < 300 && finalPayload.ok !== false;

      // Extract from outer payload wrapper
      if (isSuccess && finalPayload.json) {
         finalPayload = finalPayload.json;
      }

      // Response shaping
      if (isSuccess && endpoint.response_template) {
         if (endpoint.response_template.mode === "primary_only") {
            let primary = finalPayload.primary || finalPayload;
            if (endpoint.response_template.pick) {
               const pickKey = endpoint.response_template.pick;
               if (pickKey.endsWith('[0]')) {
                 const key = pickKey.replace('[0]', '');
                 primary = primary[key] && Array.isArray(primary[key]) ? primary[key][0] : primary[key];
               } else {
                 primary = primary[pickKey];
               }
            }
            finalPayload = primary;
         }
      }

      // Clean intercepted payload
      if (finalPayload && finalPayload.intercepted) {
         delete finalPayload.intercepted;
      }

      const now = new Date();
      const expires = new Date(now.getTime() + (endpoint.cache_ttl_seconds * 1000));

      const cacheRow = {
        api_endpoint_id: endpoint.id,
        cache_key,
        params: queryParams,
        payload: finalPayload,
        status: isSuccess ? 'success' : 'failed',
        fetched_at: now.toISOString(),
        expires_at: expires.toISOString(),
      };

      try {
        await supabase.from('api_endpoint_cache').upsert(cacheRow, { onConflict: 'cache_key' });
      } catch (upsertErr) {
        console.error("Cache upsert error:", upsertErr);
      }

      if (!isSuccess) {
         return res.status(scrapeResult.status || 500).json({
            ok: false,
            env: env_slug,
            resource,
            source: "fresh",
            params: queryParams,
            error: finalPayload.error || finalPayload.message || "Scrape failed"
         });
      }

      return res.json({
         ok: true,
         env: env_slug,
         resource,
         source: "fresh",
         fetchedAt: now.toISOString(),
         expiresAt: expires.toISOString(),
         params: queryParams,
         data: finalPayload
      });

    } catch (err: any) {
      res.status(500).json({ ok: false, env: req.params.env_slug, resource: req.params.resource, source: "fresh", params: req.query, error: err.message });
    }
  });

`;

code = code.substring(0, startIndex) + endpointsCode + code.substring(startIndex);
fs.writeFileSync(file, code);
console.log("Endpoints appended.");
