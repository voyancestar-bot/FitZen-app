// Vidéos et audios : contenu réel en français via YouTube (embed officiel, aucune clé requise).
// Vidéos : lecteur visible (voir js/videoPlayer.js). Audios : vidéo masquée, contrôles
// personnalisés (voir js/audioPlayer.js) pour un vrai rendu "audio" sans image.

const VIDEO_MEDIA = {}; // id -> { youtubeId, thumbnail }
const AUDIO_MEDIA = {}; // id -> { youtubeId, thumbnail }

VIDEOS.forEach((v) => {
  if (v.youtubeId) {
    VIDEO_MEDIA[v.id] = {
      youtubeId: v.youtubeId,
      thumbnail: `https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`
    };
  }
});

AUDIOS.forEach((a) => {
  if (a.youtubeId) {
    AUDIO_MEDIA[a.id] = {
      youtubeId: a.youtubeId,
      thumbnail: `https://img.youtube.com/vi/${a.youtubeId}/hqdefault.jpg`
    };
  }
});

// Conservé pour compatibilité avec app.js (plus de chargement asynchrone nécessaire).
function ensureVideoMedia() {
  return Promise.resolve(VIDEO_MEDIA);
}
