import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { link_id, outcome, device } = req.body;

  if (!link_id || !outcome) return res.status(400).json({ error: 'Missing params' });

  await supabase.from('clicks').insert({
    link_id,
    outcome,
    device: device || 'unknown',
    clicked_at: new Date().toISOString()
  });

  res.status(200).json({ ok: true });
}
