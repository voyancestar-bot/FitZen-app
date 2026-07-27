// Lecteur audio "pur" : le flux vient d'une vidéo YouTube (contenu vocal réel vérifié),
// mais celle-ci reste invisible — seuls des contrôles audio personnalisés sont affichés.
// Utilise l'API officielle YouTube IFrame Player (lecture/pause/position), pas d'extraction de flux.

let _ytApiPromise = null;
let currentAudioPlayer = null;
let audioPollTimer = null;
let currentAudioHostId = null;
let currentPreviewLimit = null;
let currentPreviewStart = 0;

function loadYouTubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (_ytApiPromise) return _ytApiPromise;
  _ytApiPromise = new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = () => resolve();
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return _ytApiPromise;
}

function formatAudioTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function destroyAudioPlayer() {
  if (audioPollTimer) {
    clearInterval(audioPollTimer);
    audioPollTimer = null;
  }
  if (currentAudioPlayer) {
    try { currentAudioPlayer.destroy(); } catch (e) {}
    currentAudioPlayer = null;
  }
  currentAudioHostId = null;
  currentPreviewLimit = null;
  currentPreviewStart = 0;
}

// previewLimitSeconds : null si accès complet, sinon durée max de lecture (aperçu gratuit).
// previewStartSeconds : position de départ de l'aperçu (pour éviter un long silence en début de piste).
function initAudioPlayer(youtubeId, hostId, previewLimitSeconds, previewStartSeconds) {
  destroyAudioPlayer();
  currentAudioHostId = hostId;
  currentPreviewLimit = previewLimitSeconds || null;
  currentPreviewStart = currentPreviewLimit ? (previewStartSeconds || 0) : 0;
  loadYouTubeApi().then(() => {
    if (currentAudioHostId !== hostId) return; // l'utilisateur a déjà changé de page
    const hostEl = document.getElementById(hostId);
    if (!hostEl) return;
    currentAudioPlayer = new YT.Player(hostId, {
      width: "1",
      height: "1",
      videoId: youtubeId,
      playerVars: { controls: 0, disablekb: 1, modestbranding: 1, rel: 0, playsinline: 1 },
      events: {
        onReady: () => {
          if (currentPreviewStart) currentAudioPlayer.seekTo(currentPreviewStart, true);
        },
        onStateChange: (e) => {
          const btn = document.querySelector(`[data-audio-playbtn="${hostId}"]`);
          if (!btn) return;
          if (e.data === YT.PlayerState.PLAYING) {
            btn.textContent = "⏸";
            startAudioPoll(hostId);
          } else if (e.data === YT.PlayerState.PAUSED) {
            btn.textContent = "▶";
          } else if (e.data === YT.PlayerState.ENDED) {
            btn.textContent = "▶";
            const seek = document.querySelector(`[data-audio-seek="${hostId}"]`);
            if (seek) seek.value = 0;
            if (typeof showEndOfSessionQuiz === "function") showEndOfSessionQuiz();
          }
        }
      }
    });
  });
}

function showAudioPreviewOverlay(hostId) {
  const hostEl = document.getElementById(hostId);
  const overlay = hostEl && hostEl.closest(".audio-player") && hostEl.closest(".audio-player").querySelector("[data-preview-overlay]");
  if (overlay) overlay.classList.add("show");
}

function startAudioPoll(hostId) {
  if (audioPollTimer) clearInterval(audioPollTimer);
  audioPollTimer = setInterval(() => {
    if (!currentAudioPlayer || typeof currentAudioPlayer.getCurrentTime !== "function") return;
    const cur = currentAudioPlayer.getCurrentTime();
    const dur = currentAudioPlayer.getDuration();
    const previewEnd = currentPreviewLimit ? currentPreviewStart + currentPreviewLimit : null;

    if (previewEnd && cur >= previewEnd) {
      currentAudioPlayer.pauseVideo();
      currentAudioPlayer.seekTo(previewEnd, true);
      showAudioPreviewOverlay(hostId);
      clearInterval(audioPollTimer);
      audioPollTimer = null;
      return;
    }

    const seek = document.querySelector(`[data-audio-seek="${hostId}"]`);
    const curEl = document.querySelector(`[data-audio-current="${hostId}"]`);
    const durEl = document.querySelector(`[data-audio-durationlabel="${hostId}"]`);
    const elapsed = cur - currentPreviewStart;
    const effectiveDur = currentPreviewLimit || dur;
    if (seek && effectiveDur) seek.value = String((elapsed / effectiveDur) * 100);
    if (curEl) curEl.textContent = formatAudioTime(elapsed);
    if (durEl && effectiveDur) durEl.textContent = formatAudioTime(currentPreviewLimit ? currentPreviewLimit : dur);
  }, 500);
}

function toggleAudioPlay() {
  if (!currentAudioPlayer || typeof currentAudioPlayer.getPlayerState !== "function") return;
  const state = currentAudioPlayer.getPlayerState();
  if (state === YT.PlayerState.PLAYING) currentAudioPlayer.pauseVideo();
  else currentAudioPlayer.playVideo();
}

function seekAudio(percent) {
  if (!currentAudioPlayer || typeof currentAudioPlayer.getDuration !== "function") return;
  const dur = currentAudioPlayer.getDuration();
  if (!dur) return;
  if (currentPreviewLimit) {
    let target = currentPreviewStart + (percent / 100) * currentPreviewLimit;
    if (target > currentPreviewStart + currentPreviewLimit) target = currentPreviewStart + currentPreviewLimit;
    currentAudioPlayer.seekTo(target, true);
  } else {
    currentAudioPlayer.seekTo((percent / 100) * dur, true);
  }
}
