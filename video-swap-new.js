(function() {
  // Script adapté de TwitchAdSolutions/video-swap-new
  // Remplace les segments publicitaires par un flux de résolution inférieure (480p)
  const origFetch = window.fetch;
  window.fetch = async function(url, options) {
    if (typeof url === 'string' && url.includes('.m3u8')) {
      try {
        const response = await origFetch.apply(this, arguments);
        const text = await response.text();
        if (text.includes('#EXT-X-TWITCH-AD')) {
          console.log('🛑 Publicité détectée dans le flux m3u8, bascule vers 480p');
          const lowResUrl = url.replace(/(\d+p)/, '480p');
          return origFetch(lowResUrl, options);
        }
        return new Response(new Blob([text], { type: 'application/vnd.apple.mpegurl' }), {
          status: response.status,
          headers: response.headers
        });
      } catch (e) {
        console.error('Erreur lors du traitement du flux m3u8:', e);
      }
    }
    return origFetch.apply(this, arguments);
  };
  console.log('✅ Script video-swap-new actif');
})();