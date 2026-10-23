/* VLC Plus - Application Entry Point & Orchestrator */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Core Player
  const player = new VLCPlayer();
  player.initEngines();

  // Initialize UI Controller
  const ui = new VLCUI({
    player: player,
    audioEngine: player.audioEngine,
    videoFX: player.videoFX,
    subtitles: player.subtitles,
    queue: player.queue
  });

  // Global App Registry
  window.vlcApp = {
    player: player,
    audio: player.audioEngine,
    videoFX: player.videoFX,
    subtitles: player.subtitles,
    queue: player.queue,
    ui: ui
  };

  // Render Initial Queue & Library UI
  player.queue.renderQueueUI();
  player.queue.renderLibraryUI();

  // Load first item from queue
  if (player.queue.activeQueue.length > 0) {
    player.loadMedia(player.queue.activeQueue[0]);
  }

  // Hook Volume Controls UI buttons
  const volMuteBtn = document.getElementById('volume-cone-icon-btn');
  if (volMuteBtn) {
    volMuteBtn.addEventListener('click', () => player.toggleMute());
  }

  // Hook Playback Control Buttons (Left-aligned cluster)
  document.getElementById('ctrl-play-pause-btn').addEventListener('click', () => player.togglePlay());
  document.getElementById('ctrl-prev-btn').addEventListener('click', () => player.queue.playPrev());
  document.getElementById('ctrl-next-btn').addEventListener('click', () => player.queue.playNext());
  document.getElementById('ctrl-step-back-btn').addEventListener('click', () => player.seekBy(-10));
  document.getElementById('ctrl-step-fwd-btn').addEventListener('click', () => player.seekBy(10));
  document.getElementById('ctrl-stop-btn').addEventListener('click', () => player.stop());
  document.getElementById('ctrl-loop-btn').addEventListener('click', () => {
    const loop = player.queue.toggleLoop();
    document.getElementById('ctrl-loop-btn').classList.toggle('active', loop !== 'none');
    player.showOSD(`Loop: ${loop.toUpperCase()}`);
  });
  document.getElementById('ctrl-shuffle-btn').addEventListener('click', () => {
    const shuf = player.queue.toggleShuffle();
    document.getElementById('ctrl-shuffle-btn').classList.toggle('active', shuf);
    player.showOSD(`Shuffle: ${shuf ? 'ON' : 'OFF'}`);
  });

  const abLoopBtn = document.getElementById('ctrl-ab-loop-btn');
  if (abLoopBtn) {
    abLoopBtn.addEventListener('click', () => player.toggleABLoop());
  }

  // Hook Right-aligned utility buttons
  document.getElementById('btn-fullscreen').addEventListener('click', () => player.toggleFullscreen());
  document.getElementById('btn-pip').addEventListener('click', () => player.togglePiP());
  document.getElementById('btn-equalizer-modal').addEventListener('click', () => ui.openModal('modal-equalizer-fx'));
  document.getElementById('btn-visual-sync-modal').addEventListener('click', () => ui.openModal('modal-visual-sync'));
  document.getElementById('btn-snapshot-quick').addEventListener('click', () => {
    player.videoFX.takeSnapshot();
    player.showOSD('Snapshot Captured!', 'camera');
  });

  // Subtitle quick popover actions
  const subToggleBtn = document.getElementById('popover-sub-toggle');
  if (subToggleBtn) {
    subToggleBtn.addEventListener('click', () => {
      if (player.subtitles.cues.length > 0) {
        player.subtitles.cues = [];
        player.subtitles.currentTrackName = 'Off';
        subToggleBtn.textContent = 'Enable Subtitles (Sample)';
        player.showOSD('Subtitles: OFF');
      } else {
        player.subtitles.loadSampleSubtitles();
        subToggleBtn.textContent = 'Disable Subtitles';
        player.showOSD('Subtitles: ON');
      }
      ui.closeAllPopovers();
    });
  }

  // Load custom subtitle file input
  const subFileInput = document.getElementById('sub-file-input');
  if (subFileInput) {
    subFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          player.subtitles.loadSubtitlesFromText(ev.target.result, file.name);
          player.showOSD(`Loaded: ${file.name}`);
          ui.closeAllPopovers();
        };
        reader.readAsText(file);
      }
    });
  }

  console.log('VLC Plus initialized successfully.');
});
