const { readFileSync } = require('fs');
const path = require('path');

(() => {
  // Charger le script video-swap-new localement
  try {
    const scriptPath = path.join(__dirname, 'assets', 'video-swap-new.js');
    const scriptText = readFileSync(scriptPath, 'utf-8');
    const script = document.createElement('script');
    script.textContent = scriptText;
    document.head.appendChild(script);
    console.log('✅ Script video-swap-new chargé localement');
  } catch (e) {
    console.error('Erreur lors du chargement de video-swap-new:', e);
  }

  // Intercepter les requêtes fetch pour bloquer les anciennes publicités
  const origFetch = window.fetch;
  window.fetch = async function(url, options) {
    if (typeof url === 'string' && url.includes('/gql')) {
      try {
        const body = options?.body || '';
        if (body.includes('PlaybackAccessToken_Ads')) {
          console.log('🛑 PlaybackAccessToken_Ads détecté → faux token renvoyé');
          const fakeResponse = {
            data: {
              streamPlaybackAccessToken: {
                value: '',
                signature: ''
              }
            }
          };
          const json = JSON.stringify(fakeResponse);
          const blob = new Blob([json], { type: 'application/json' });
          return Promise.resolve(new Response(blob, {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }));
        }
      } catch (e) {
        console.error('Erreur spoof fetch PlaybackAccessToken:', e);
      }
    }
    return origFetch.apply(this, arguments);
  };
})();