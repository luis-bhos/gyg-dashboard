import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { link_id, outcome } = req.body;

  if (!link_id || !outcome) return res.status(400).json({ error: 'Missing params' });

  // Update the most recent click for this link with the outcome
  const { data: recentClick } = await supabase
    .from('clicks')
    .select('id')
    .eq('link_id', link_id)
    .is('outcome', null)
    .order('clicked_at', { ascending: false })
    .limit(1)
    .single();

  if (recentClick) {
    await supabase
      .from('clicks')
      .update({ outcome })
      .eq('id', recentClick.id);
  }

  res.status(200).json({ ok: true });
}
