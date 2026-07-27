// Lecteur vidéo YouTube (contenu réel en français), mais SANS l'interface YouTube :
// contrôles natifs désactivés (controls:0), remplacés par nos propres boutons/barre de
// progression. L'image vidéo reste visible (c'est le contenu), mais aucune marque ni
// contrôle YouTube n'apparaît. Utilise l'API officielle YouTube IFrame Player.
// loadYouTubeApi() est défini dans js/audioPlayer.js (chargé avant ce fichier).

let currentVideoPlayer = null;
let videoPollTimer = null;
let currentVideoHostId = null;
let currentVideoPreviewLimit = null;
let videoPendingAutoplay = false;
let videoPosterRevealTimer = null;
let videoHasStartedOnce = false;

function destroyVideoPlayer() {
  if (videoPollTimer) {
    clearInterval(videoPollTimer);
    videoPollTimer = null;
  }
  if (videoPosterRevealTimer) {
    clearTimeout(videoPosterRevealTimer);
    videoPosterRevealTimer = null;
  }
  if (currentVideoPlayer) {
    try { currentVideoPlayer.destroy(); } catch (e) {}
    currentVideoPlayer = null;
  }
  currentVideoHostId = null;
  currentVideoPreviewLimit = null;
  videoPendingAutoplay = false;
  videoHasStartedOnce = false;
}

function formatVideoTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// previewLimitSeconds : null si accès complet, sinon durée max de lecture (aperçu gratuit).
// startAtSeconds : saute l'intro ("bienvenue sur ma chaîne...") de certaines vidéos.
function initVideoPlayer(youtubeId, hostId, previewLimitSeconds, startAtSeconds) {
  destroyVideoPlayer();
  currentVideoHostId = hostId;
  currentVideoPreviewLimit = previewLimitSeconds || null;
  loadYouTubeApi().then(() => {
    if (currentVideoHostId !== hostId) return; // l'utilisateur a déjà changé de page
    const hostEl = document.getElementById(hostId);
    if (!hostEl) return;
    currentVideoPlayer = new YT.Player(hostId, {
      playerVars: {
        controls: 0,
        disablekb: 1,
        modestbranding: 1,
        rel: 0,
        iv_load_policy: 3,
        cc_load_policy: 0,
        playsinline: 1,
        start: startAtSeconds || 0
      },
      videoId: youtubeId,
      events: {
        onReady: () => {
          updateVideoPlayButton(hostId, false);
          if (videoPendingAutoplay) {
            videoPendingAutoplay = false;
            currentVideoPlayer.playVideo();
          }
        },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.PLAYING) {
            updateVideoPlayButton(hostId, true);
            startVideoPoll(hostId);
            // Certaines vidéos réactivent les sous-titres automatiques au démarrage : on les coupe.
            try { currentVideoPlayer.unloadModule("captions"); } catch (e) {}
          } else if (e.data === YT.PlayerState.PAUSED) {
            updateVideoPlayButton(hostId, false);
          } else if (e.data === YT.PlayerState.ENDED) {
            updateVideoPlayButton(hostId, false);
            const seek = document.querySelector(`[data-video-seek="${hostId}"]`);
            if (seek) seek.value = 0;
            if (typeof showEndOfSessionQuiz === "function") showEndOfSessionQuiz();
          }
        }
      }
    });
  });
}

function updateVideoPlayButton(hostId, playing) {
  const btn = document.querySelector(`[data-video-playbtn="${hostId}"]`);
  if (btn) btn.textContent = playing ? "⏸" : "▶";
  const overlay = document.querySelector(`[data-video-bigplay="${hostId}"]`);
  if (overlay) overlay.classList.toggle("hidden", playing);
  // Recouvre systématiquement l'iframe dès que la vidéo n'est pas en lecture : évite que
  // l'écran de pause / fin natif de YouTube (miniatures suggérées, logo) ne soit visible.
  const poster = document.querySelector(`[data-video-poster="${hostId}"]`);
  if (!poster) return;
  if (videoPosterRevealTimer) {
    clearTimeout(videoPosterRevealTimer);
    videoPosterRevealTimer = null;
  }
  const wrap = poster.closest(".youtube-wrap");
  if (playing) {
    if (!videoHasStartedOnce) {
      // Au tout premier lancement seulement, YouTube affiche brièvement titre/chaîne par-dessus
      // la vidéo : on garde notre couverture le temps que cet écran disparaisse tout seul.
      videoHasStartedOnce = true;
      videoPosterRevealTimer = setTimeout(() => {
        poster.classList.add("hidden");
        if (wrap) wrap.classList.add("video-revealed");
        videoPosterRevealTimer = null;
      }, 6000);
    } else {
      // Sur les pauses/reprises suivantes, pas d'écran YouTube à masquer : révélation immédiate.
      poster.classList.add("hidden");
      if (wrap) wrap.classList.add("video-revealed");
    }
  } else {
    poster.classList.remove("hidden");
  }
}

function startVideoPoll(hostId) {
  if (videoPollTimer) clearInterval(videoPollTimer);
  videoPollTimer = setInterval(() => {
    if (!currentVideoPlayer || typeof currentVideoPlayer.getCurrentTime !== "function") return;
    const cur = currentVideoPlayer.getCurrentTime();
    const dur = currentVideoPlayer.getDuration();

    if (currentVideoPreviewLimit && cur >= currentVideoPreviewLimit) {
      currentVideoPlayer.pauseVideo();
      currentVideoPlayer.seekTo(currentVideoPreviewLimit, true);
      const hostEl = document.getElementById(hostId);
      const wrap = hostEl && hostEl.closest(".preview-wrap");
      const overlay = wrap && wrap.querySelector("[data-preview-overlay]");
      if (overlay) overlay.classList.add("show");
      clearInterval(videoPollTimer);
      videoPollTimer = null;
      return;
    }

    const seek = document.querySelector(`[data-video-seek="${hostId}"]`);
    const curEl = document.querySelector(`[data-video-current="${hostId}"]`);
    const durEl = document.querySelector(`[data-video-durationlabel="${hostId}"]`);
    const effectiveDur = currentVideoPreviewLimit || dur;
    if (seek && effectiveDur) seek.value = String((cur / effectiveDur) * 100);
    if (curEl) curEl.textContent = formatVideoTime(cur);
    if (durEl && effectiveDur) durEl.textContent = formatVideoTime(currentVideoPreviewLimit ? currentVideoPreviewLimit : dur);
  }, 500);
}

function toggleVideoPlay() {
  if (!currentVideoPlayer || typeof currentVideoPlayer.getPlayerState !== "function") {
    videoPendingAutoplay = true; // le lecteur n'est pas encore prêt : on lance dès qu'il l'est
    return;
  }
  const state = currentVideoPlayer.getPlayerState();
  if (state === YT.PlayerState.PLAYING) currentVideoPlayer.pauseVideo();
  else currentVideoPlayer.playVideo();
}

function seekVideo(percent) {
  if (!currentVideoPlayer || typeof currentVideoPlayer.getDuration !== "function") return;
  const dur = currentVideoPlayer.getDuration();
  if (!dur) return;
  let target = (percent / 100) * dur;
  if (currentVideoPreviewLimit && target > currentVideoPreviewLimit) target = currentVideoPreviewLimit;
  currentVideoPlayer.seekTo(target, true);
}
