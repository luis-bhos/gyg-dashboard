import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Extract slug from URL path /r/abc123
  const slug = req.url.replace('/r/', '').split('?')[0];

  if (!slug) {
    return res.redirect(302, 'https://www.getyourguide.com/?partner_id=VCTDMLU&utm_medium=online_publisher');
  }

  // Fetch link from DB
  const { data: link, error } = await supabase
    .from('links')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !link) {
    return res.redirect(302, 'https://www.getyourguide.com/?partner_id=VCTDMLU&utm_medium=online_publisher');
  }

  // Detect device
  const ua = req.headers['user-agent'] || '';
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const deviceType = isAndroid ? 'android' : isIOS ? 'ios' : 'desktop';

  // Build destination URLs
  const affiliateUrl = link.destination_url;
  const cleanUrl = affiliateUrl.replace('https://', '');

  // Record click
  await supabase.from('clicks').insert({
    link_id: link.id,
    device: deviceType,
    user_agent: ua,
    clicked_at: new Date().toISOString()
  });

  // Increment click count
  await supabase
    .from('links')
    .update({ click_count: (link.click_count || 0) + 1 })
    .eq('id', link.id);

  // Serve HTML that handles the redirect with app detection
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redirecting...</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0a0a0a; color: #fff; }
    .loader { text-align: center; }
    .spinner { width: 32px; height: 32px; border: 3px solid #333; border-top-color: #00E5A0; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { color: #888; font-size: 14px; }
  </style>
</head>
<body>
<div class="loader">
  <div class="spinner"></div>
  <p>Opening...</p>
</div>
<script>
  var affiliateUrl = "${affiliateUrl}";
  var isAndroid = ${isAndroid};
  var isIOS = ${isIOS};

  function trackOutcome(outcome) {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link_id: '${link.id}', outcome: outcome })
    }).catch(function(){});
  }

  if (isAndroid) {
    var intentUrl = "intent://${cleanUrl}#Intent;scheme=https;package=com.getyourguide.android;S.browser_fallback_url=" + encodeURIComponent(affiliateUrl) + ";end";
    window.location = intentUrl;
    // If intent fails after 2s, track as web
    setTimeout(function() {
      trackOutcome('web');
    }, 2000);
    // Track as app immediately (intent launched)
    trackOutcome('app');
  } else if (isIOS) {
    window.location = "getyourguide://${cleanUrl}";
    setTimeout(function() {
      trackOutcome('web');
      window.location = affiliateUrl;
    }, 1500);
    trackOutcome('app');
  } else {
    trackOutcome('web');
    window.location = affiliateUrl;
  }
</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
