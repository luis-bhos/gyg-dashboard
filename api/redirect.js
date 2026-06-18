import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const slug = req.url.replace('/r/', '').split('?')[0];

  if (!slug) {
    return res.redirect(302, 'https://www.getyourguide.com/?partner_id=VCTDMLU&utm_medium=online_publisher');
  }

  const { data: link, error } = await supabase
    .from('links')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !link) {
    return res.redirect(302, 'https://www.getyourguide.com/?partner_id=VCTDMLU&utm_medium=online_publisher');
  }

  const ua = req.headers['user-agent'] || '';
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const deviceType = isAndroid ? 'android' : isIOS ? 'ios' : 'desktop';

  const affiliateUrl = link.destination_url;
  const cleanUrl = affiliateUrl.replace('https://', '');

  await supabase
    .from('links')
    .update({ click_count: (link.click_count || 0) + 1 })
    .eq('id', link.id);

  // Fallback URL points back to our own redirect page with ?web=1 to skip intent
  const fallbackUrl = `https://gyg-dashboard.vercel.app/r/${slug}?web=1`;
  const intentUrl = `intent://${cleanUrl}#Intent;scheme=https;package=com.getyourguide.android;S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`;

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
    #app-link { display: none; }
  </style>
</head>
<body>
<div class="loader">
  <div class="spinner"></div>
  <p>Opening...</p>
</div>
<a id="app-link" href="${intentUrl}"></a>
<script>
  var affiliateUrl = "${affiliateUrl}";
  var isAndroid = ${isAndroid};
  var isIOS = ${isIOS};
  var linkId = "${link.id}";
  var forceWeb = new URLSearchParams(window.location.search).get('web') === '1';

  function trackOutcome(outcome) {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link_id: linkId, outcome: outcome, device: isAndroid ? 'android' : isIOS ? 'ios' : 'desktop' })
    }).catch(function(){});
  }

  if (forceWeb || (!isAndroid && !isIOS)) {
    // No app — go straight to web
    trackOutcome('web');
    window.location = affiliateUrl;

  } else if (isAndroid) {
    var appOpened = false;

    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        appOpened = true;
        trackOutcome('app');
      }
    });

    document.getElementById('app-link').click();

    setTimeout(function() {
      if (!appOpened) {
        trackOutcome('web');
        window.location = affiliateUrl;
      }
    }, 2500);

  } else if (isIOS) {
    var appOpenedIOS = false;

    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        appOpenedIOS = true;
        trackOutcome('app');
      }
    });

    window.location = "getyourguide://${cleanUrl}";

    setTimeout(function() {
      if (!appOpenedIOS) {
        trackOutcome('web');
        window.location = affiliateUrl;
      }
    }, 1500);
  }
</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
