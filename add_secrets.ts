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

  // --- Secrets Endpoints ---
  app.get("/api/secrets", async (req, res) => {
    try {
      // Don't return the actual value for security, just the metadata
      const { data, error } = await supabase
        .from('secrets')
        .select('id, name, created_at, updated_at')
        .eq('user_id', req.userId)
        .order('name');
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/secrets", async (req, res) => {
    try {
      const { name, value } = req.body;
      if (!name || !value) {
        return res.status(400).json({ success: false, error: "Name and Value are required." });
      }

      // Check for uniqueness
      const { data: existing } = await supabase
         .from('secrets')
         .select('id')
         .eq('user_id', req.userId)
         .eq('name', name)
         .maybeSingle();

      if (existing) {
         return res.status(400).json({ success: false, error: "A secret with this name already exists." });
      }

      const { data, error } = await supabase
        .from('secrets')
        .insert([{ user_id: req.userId, name, value }])
        .select('id, name, created_at, updated_at')
        .single();

      if (error) throw error;
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/secrets/:id", async (req, res) => {
    try {
      const { error } = await supabase
        .from('secrets')
        .delete()
        .eq('id', req.params.id)
        .eq('user_id', req.userId);

      if (error) throw error;
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

`;

code = code.substring(0, startIndex) + endpointsCode + code.substring(startIndex);
fs.writeFileSync(file, code);
console.log("Secrets endpoints appended.");
