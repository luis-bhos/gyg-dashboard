import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// App package map by domain
const APP_PACKAGES = {
  'getyourguide.com': 'com.getyourguide.android',
  'booking.com': 'com.booking',
  'uber.com': 'com.ubercab',
  'airbnb.com': 'com.airbnb.android',
  'expedia.com': 'com.expedia.bookings',
  'tripadvisor.com': 'com.tripadvisor.tripadvisor',
  'klook.com': 'com.klook.client',
  'viator.com': 'com.viator',
  'amazon.com': 'com.amazon.mShop.android.shopping',
};

function getAppPackage(url) {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    for (const [domain, pkg] of Object.entries(APP_PACKAGES)) {
      if (hostname.includes(domain)) return pkg;
    }
  } catch(e) {}
  return null;
}

export default async function handler(req, res) {
  const slug = req.url.replace('/r/', '').split('?')[0];
  const forceWeb = req.url.includes('web=1');

  if (!slug) {
    return res.redirect(302, 'https://www.google.com');
  }

  const { data: link, error } = await supabase
    .from('links')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !link) {
    return res.redirect(302, 'https://www.google.com');
  }

  const ua = req.headers['user-agent'] || '';
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const deviceType = isAndroid ? 'android' : isIOS ? 'ios' : 'desktop';

  const affiliateUrl = link.destination_url;
  const cleanUrl = affiliateUrl.replace('https://', '');
  const appPackage = getAppPackage(affiliateUrl);

  await supabase
    .from('links')
    .update({ click_count: (link.click_count || 0) + 1 })
    .eq('id', link.id);

  const fallbackUrl = `https://${req.headers.host}/r/${slug}?web=1`;
  const intentUrl = appPackage
    ? `intent://${cleanUrl}#Intent;scheme=https;package=${appPackage};S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`
    : null;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redirecting...</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0a0a0f; color: #fff; }
    .loader { text-align: center; }
    .spinner { width: 32px; height: 32px; border: 3px solid #222; border-top-color: #7C6FFF; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { color: #666; font-size: 14px; }
    #app-link { display: none; }
  </style>
</head>
<body>
<div class="loader">
  <div class="spinner"></div>
  <p>Opening...</p>
</div>
<a id="app-link" href="${intentUrl || affiliateUrl}"></a>
<script>
  var affiliateUrl = "${affiliateUrl}";
  var isAndroid = ${isAndroid};
  var isIOS = ${isIOS};
  var forceWeb = ${forceWeb};
  var hasAppPackage = ${!!appPackage};
  var linkId = "${link.id}";
  var cleanUrl = "${cleanUrl}";

  function trackOutcome(outcome) {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link_id: linkId, outcome: outcome, device: isAndroid ? 'android' : isIOS ? 'ios' : 'desktop' })
    }).catch(function(){});
  }

  if (forceWeb || !hasAppPackage || (!isAndroid && !isIOS)) {
    trackOutcome('web');
    window.location = affiliateUrl;

  } else if (isAndroid && hasAppPackage) {
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

    window.location = "https://" + cleanUrl;

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
