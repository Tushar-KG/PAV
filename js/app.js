/* PAV (Play Any Video) - Application Entry Point & Orchestrator */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Core Player
  let player = null;
  try {
    player = new VLCPlayer();
    player.initEngines();
  } catch (err) {
    console.error('Core player initialization failed:', err);
  }

  // Initialize UI Controller
  let ui = null;
  try {
    ui = new VLCUI({
      player: player,
      audioEngine: player ? player.audioEngine : null,
      videoFX: player ? player.videoFX : null,
      subtitles: player ? player.subtitles : null,
      queue: player ? player.queue : null
    });
  } catch (err) {
    console.error('UI controller initialization failed:', err);
  }

  // Global App Registry - exposed immediately for any legacy inline handlers or console debugging
  window.vlcApp = {
    player: player,
    audio: player ? player.audioEngine : null,
    videoFX: player ? player.videoFX : null,
    videoFx: player ? player.videoFX : null,
    subtitles: player ? player.subtitles : null,
    queue: player ? player.queue : null,
    ui: ui
  };

  // Render Initial Queue & Library UI
  if (player && player.queue) {
    try {
      player.queue.renderQueueUI();
      player.queue.renderLibraryUI();
    } catch (err) {
      console.error('Initial queue/library render error:', err);
    }
  }

  // Helper for safe element click binding
  const bindClick = (id, handler) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', handler);
    }
  };

  // Volume Controls UI button (cone icon mute toggle)
  bindClick('volume-cone-icon-btn', () => {
    if (player) player.toggleMute();
  });

  // Playback Control Buttons (Left-aligned cluster)
  bindClick('ctrl-play-pause-btn', () => {
    if (player) player.togglePlay();
  });
  bindClick('ctrl-prev-btn', () => {
    if (player && player.queue) player.queue.playPrev();
  });
  bindClick('ctrl-next-btn', () => {
    if (player && player.queue) player.queue.playNext();
  });
  bindClick('ctrl-step-back-btn', () => {
    if (player) player.seekBy(-10);
  });
  bindClick('ctrl-step-fwd-btn', () => {
    if (player) player.seekBy(10);
  });
  bindClick('ctrl-stop-btn', () => {
    if (player) player.stop();
  });
  bindClick('ctrl-loop-btn', () => {
    if (player && player.queue) {
      const loop = player.queue.toggleLoop();
      const btn = document.getElementById('ctrl-loop-btn');
      if (btn) btn.classList.toggle('active', loop !== 'none');
      player.showOSD(`Loop: ${loop.toUpperCase()}`);
    }
  });
  bindClick('ctrl-shuffle-btn', () => {
    if (player && player.queue) {
      const shuf = player.queue.toggleShuffle();
      const btn = document.getElementById('ctrl-shuffle-btn');
      if (btn) btn.classList.toggle('active', shuf);
      player.showOSD(`Shuffle: ${shuf ? 'ON' : 'OFF'}`);
    }
  });
  bindClick('ctrl-ab-loop-btn', () => {
    if (player) player.toggleABLoop();
  });

  // Right-aligned utility buttons
  bindClick('btn-fullscreen', () => {
    if (player) player.toggleFullscreen();
  });
  bindClick('btn-pip', () => {
    if (player) player.togglePiP();
  });
  bindClick('btn-equalizer-modal', () => {
    if (ui) ui.openModal('modal-equalizer-fx');
  });
  bindClick('btn-visual-sync-modal', () => {
    if (ui) ui.openModal('modal-visual-sync');
  });
  bindClick('btn-snapshot-quick', () => {
    if (player && player.videoFX) {
      player.videoFX.takeSnapshot();
      player.showOSD('Snapshot Captured!', 'camera');
    }
  });

  // Subtitle quick popover actions
  const subToggleBtn = document.getElementById('popover-sub-toggle');
  if (subToggleBtn) {
    subToggleBtn.addEventListener('click', () => {
      if (player && player.subtitles) {
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
      }
      if (ui) ui.closeAllPopovers();
    });
  }

  // Load custom subtitle file input
  const subFileInput = document.getElementById('sub-file-input');
  if (subFileInput) {
    subFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file && player && player.subtitles) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          player.subtitles.loadSubtitlesFromText(ev.target.result, file.name);
          player.showOSD(`Loaded: ${file.name}`);
          if (ui) ui.closeAllPopovers();
        };
        reader.readAsText(file);
      }
    });
  }

  // --- Desktop Application Integration (Electron) ---
  if (window.electronAPI) {
    bindClick('win-btn-minimize', () => {
      window.electronAPI.minimize();
    });

    bindClick('win-btn-maximize', () => {
      window.electronAPI.maximize();
    });

    bindClick('win-btn-close', () => {
      window.electronAPI.close();
    });

    if (typeof window.electronAPI.onWindowStateChange === 'function') {
      window.electronAPI.onWindowStateChange((isMaximized) => {
        const maxBtn = document.getElementById('win-btn-maximize');
        if (maxBtn) {
          maxBtn.title = isMaximized ? 'Restore' : 'Maximize';
        }
      });
    }

    // Native file open on startup or second instance (e.g. Open with PAV)
    const handleOpenedFile = (filePath) => {
      if (!filePath || !player) return;
      const fileName = filePath.split(/[\\/]/).pop();
      const ext = fileName.split('.').pop().toLowerCase();
      const isAudio = ['mp3', 'flac', 'wav', 'ogg', 'm4a', 'aac'].includes(ext);

      const newItem = {
        id: `file-${Date.now()}`,
        title: fileName,
        artist: 'Local Media',
        type: isAudio ? 'audio' : 'video',
        duration: 'Local File',
        codec: ext.toUpperCase(),
        src: `file://${filePath.replace(/\\/g, '/')}`,
        poster: isAudio ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80' : '',
        hasSubtitles: false
      };
      if (player.queue) {
        player.queue.addToQueue(newItem, true);
      }
      player.showOSD(`Playing: ${fileName}`);
    };

    if (typeof window.electronAPI.onOpenFile === 'function') {
      window.electronAPI.onOpenFile(handleOpenedFile);
    }

    if (typeof window.electronAPI.getInitialFile === 'function') {
      window.electronAPI.getInitialFile().then((initialFile) => {
        if (initialFile) {
          handleOpenedFile(initialFile);
        }
      }).catch((err) => {
        console.warn('getInitialFile error:', err);
      });
    }
  }

  console.log('PAV (Play Any Video) initialized successfully.');
});
