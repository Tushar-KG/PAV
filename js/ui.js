/* VLC Plus - UI Modals, Popovers, Drawers & Visual Sync Interactive Timeline */

class VLCUI {
  constructor(app) {
    this.app = app;
    this.player = app.player;
    this.activeModal = null;
    this.activePopover = null;

    this.bindUIEvents();
    this.initVisualSyncTimeline();
    this.initEqualizerAndVideoFXUI();
    this.initSettingsUI();
  }

  bindUIEvents() {
    // Menu bar triggers
    document.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.handleMenuAction(action);
      });
    });

    // Sidebar drawer toggle
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const sidebar = document.getElementById('library-sidebar');

    toggleSidebarBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      toggleSidebarBtn.classList.toggle('active', sidebar.classList.contains('open'));
    });

    closeSidebarBtn.addEventListener('click', () => {
      sidebar.classList.remove('open');
      toggleSidebarBtn.classList.remove('active');
    });

    // Sidebar tabs (Queue vs Library)
    document.querySelectorAll('.sidebar-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.sidebar-tab-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        const tab = e.currentTarget.dataset.tab;
        const queueList = document.getElementById('sidebar-queue-list');
        const libGrid = document.getElementById('sidebar-library-grid');

        if (tab === 'queue') {
          queueList.style.display = 'flex';
          libGrid.style.display = 'none';
        } else {
          queueList.style.display = 'none';
          libGrid.style.display = 'grid';
        }
      });
    });

    // Modal close buttons & backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          this.closeAllModals();
        }
      });
    });

    document.querySelectorAll('.modal-close-btn, .modal-cancel-btn').forEach(btn => {
      btn.addEventListener('click', () => this.closeAllModals());
    });

    // Popover outside clicks
    window.addEventListener('click', (e) => {
      if (!e.target.closest('.quick-popover') && !e.target.closest('[data-popover-target]')) {
        this.closeAllPopovers();
      }
    });

    // Popover triggers (Speed, Audio, Subtitles)
    document.querySelectorAll('[data-popover-target]').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetId = trigger.dataset.popoverTarget;
        this.togglePopover(targetId);
      });
    });

    // Speed options selection
    document.querySelectorAll('.speed-option-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const speed = parseFloat(e.currentTarget.dataset.speed);
        this.player.setPlaybackSpeed(speed);
        document.querySelectorAll('.speed-option-btn').forEach(b => b.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        this.closeAllPopovers();
      });
    });

    // Open Media Modal Tabs
    document.querySelectorAll('#modal-open-media .modal-tab-btn').forEach(tabBtn => {
      tabBtn.addEventListener('click', (e) => {
        document.querySelectorAll('#modal-open-media .modal-tab-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        const tab = e.currentTarget.dataset.tab;
        document.querySelectorAll('.open-media-tab-panel').forEach(panel => {
          panel.style.display = (panel.id === `tab-open-${tab}`) ? 'flex' : 'none';
        });
      });
    });

    // Network Stream Form Submit
    const networkForm = document.getElementById('network-stream-form');
    if (networkForm) {
      networkForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const url = document.getElementById('network-stream-url').value.trim();
        if (url) {
          const item = {
            id: `stream-${Date.now()}`,
            title: `Stream: ${url.split('/').pop() || url}`,
            artist: 'Network Stream',
            type: 'video',
            duration: 'Live / Stream',
            codec: 'HLS / HTTPS Stream',
            src: url,
            poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
            hasSubtitles: false
          };
          this.app.queue.addToQueue(item, true);
          this.closeAllModals();
        }
      });
    }

    // Capture Device (Screen share / Webcam)
    const btnScreenCapture = document.getElementById('btn-capture-screen');
    if (btnScreenCapture) {
      btnScreenCapture.addEventListener('click', async () => {
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
          this.player.video.srcObject = stream;
          this.player.video.play();
          this.player.showOSD('Screen Capture Active', 'camera');
          this.closeAllModals();
        } catch (e) {
          alert('Screen capture cancelled or not allowed: ' + e.message);
        }
      });
    }

    const btnWebcamCapture = document.getElementById('btn-capture-webcam');
    if (btnWebcamCapture) {
      btnWebcamCapture.addEventListener('click', async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          this.player.video.srcObject = stream;
          this.player.video.play();
          this.player.showOSD('Webcam Live Stream Active', 'camera');
          this.closeAllModals();
        } catch (e) {
          alert('Webcam capture failed or permission denied: ' + e.message);
        }
      });
    }
  }

  handleMenuAction(action) {
    switch (action) {
      case 'open-file':
        if (window.electronAPI) {
          window.electronAPI.openFileDialog().then(paths => {
            if (paths && paths.length > 0) {
              paths.forEach(filePath => {
                const fileName = filePath.split(/[\\/]/).pop();
                const ext = fileName.split('.').pop().toLowerCase();
                const isAudio = ['mp3', 'flac', 'wav', 'ogg', 'm4a', 'aac'].includes(ext);
                const isSub = ['srt', 'vtt', 'sub'].includes(ext);

                if (isSub) {
                  fetch(`file://${filePath.replace(/\\/g, '/')}`).then(r => r.text()).then(txt => {
                    this.player.subtitles.loadSubtitlesFromText(txt, fileName);
                    this.player.showOSD(`Subtitles: ${fileName}`);
                  });
                } else {
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
                  this.player.queue.addToQueue(newItem, true);
                }
              });
            }
          });
          break;
        }
        this.openModal('modal-open-media');
        break;
      case 'open-media':
        this.openModal('modal-open-media');
        break;
      case 'sync-timeline':
        this.openModal('modal-visual-sync');
        break;
      case 'equalizer':
        this.openModal('modal-equalizer-fx');
        break;
      case 'settings':
        this.openModal('modal-settings');
        break;
      case 'snapshot':
        this.player.videoFX.takeSnapshot();
        this.player.showOSD('Snapshot Captured!', 'camera');
        break;
      case 'loop':
        const loopMode = this.player.queue.toggleLoop();
        this.player.showOSD(`Loop: ${loopMode.toUpperCase()}`);
        document.getElementById('ctrl-loop-btn').classList.toggle('active', loopMode !== 'none');
        break;
      case 'shuffle':
        const isShuffle = this.player.queue.toggleShuffle();
        this.player.showOSD(`Shuffle: ${isShuffle ? 'ON' : 'OFF'}`);
        document.getElementById('ctrl-shuffle-btn').classList.toggle('active', isShuffle);
        break;
      case 'pip':
        this.player.togglePiP();
        break;
      case 'fullscreen':
        this.player.toggleFullscreen();
        break;
      case 'toolbar-customizer':
        this.openModal('modal-toolbar-customizer');
        break;
      case 'batch-subtitles':
        this.openModal('modal-batch-subtitles');
        break;
      case 'about':
        alert('VLC Plus (Modern Concept)\nRedesigned after 25 years with Juxtopposed UX principles.\nTraffic Cone Orange • Utilitarian Softened Rectangles • Left-aligned Playback.');
        break;
    }
  }

  openModal(modalId) {
    this.closeAllModals();
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      this.activeModal = modal;
    }
  }

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.classList.remove('active');
    });
    this.activeModal = null;
  }

  togglePopover(popoverId) {
    const popover = document.getElementById(popoverId);
    if (!popover) return;

    if (popover.classList.contains('show')) {
      popover.classList.remove('show');
      this.activePopover = null;
    } else {
      this.closeAllPopovers();
      popover.classList.add('show');
      this.activePopover = popover;
    }
  }

  closeAllPopovers() {
    document.querySelectorAll('.quick-popover').forEach(p => p.classList.remove('show'));
    this.activePopover = null;
  }

  // --- VISUAL SUBTITLE & AUDIO SYNC TIMELINE (Juxtopposed Concept) ---
  initVisualSyncTimeline() {
    const track = document.getElementById('sync-draggable-track');
    const container = document.getElementById('sync-visual-timeline');
    const readoutValue = document.getElementById('sync-offset-value');
    const presetCheckbox = document.getElementById('sync-save-preset-checkbox');

    if (!track || !container) return;

    let isDragging = false;
    let startX = 0;
    let initialOffsetMs = 0;

    const updateDisplay = (offsetMs) => {
      const sign = offsetMs > 0 ? '+' : (offsetMs < 0 ? '-' : '');
      readoutValue.textContent = `${sign}${Math.abs(offsetMs)}`;

      // Center is 50%, mapped from -5000ms to +5000ms
      const boundedOffset = Math.max(-5000, Math.min(5000, offsetMs));
      const percentFromCenter = (boundedOffset / 5000) * 40; // 40% travel either side
      track.style.left = `calc(50% + ${percentFromCenter}%)`;

      // Update engine
      if (this.app.subtitles) {
        this.app.subtitles.setSyncOffset(offsetMs);
        if (presetCheckbox.checked) {
          this.app.subtitles.saveCurrentPreset(true);
        }
      }
    };

    track.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      initialOffsetMs = this.app.subtitles ? this.app.subtitles.syncOffsetMs : 0;
      track.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - startX;
      // 1 pixel = 15 milliseconds
      const deltaMs = Math.round(deltaX * 15);
      const newOffset = initialOffsetMs + deltaMs;
      updateDisplay(newOffset);
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        track.style.cursor = 'grab';
      }
    });

    // Nudge buttons
    document.querySelectorAll('[data-nudge]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const delta = parseInt(e.currentTarget.dataset.nudge, 10);
        if (delta === 0) {
          updateDisplay(0);
        } else {
          const current = this.app.subtitles ? this.app.subtitles.syncOffsetMs : 0;
          updateDisplay(current + delta);
        }
      });
    });

    // Subtitle appearance controls
    const sizeInput = document.getElementById('sub-font-size-input');
    const colorInput = document.getElementById('sub-text-color-input');
    const bgOpacityInput = document.getElementById('sub-bg-opacity-input');

    if (sizeInput) {
      sizeInput.addEventListener('input', (e) => {
        if (this.app.subtitles) {
          this.app.subtitles.settings.fontSize = parseInt(e.target.value, 10);
          this.app.subtitles.applySettingsToDOM();
        }
      });
    }

    if (colorInput) {
      colorInput.addEventListener('input', (e) => {
        if (this.app.subtitles) {
          this.app.subtitles.settings.textColor = e.target.value;
          this.app.subtitles.applySettingsToDOM();
        }
      });
    }

    if (bgOpacityInput) {
      bgOpacityInput.addEventListener('input', (e) => {
        if (this.app.subtitles) {
          const opacity = parseFloat(e.target.value);
          this.app.subtitles.settings.bgColor = `rgba(0, 0, 0, ${opacity})`;
          this.app.subtitles.applySettingsToDOM();
        }
      });
    }
  }

  // --- EQUALIZER & VIDEO FX UI ---
  initEqualizerAndVideoFXUI() {
    // 10-Band Equalizer Sliders
    const bandsContainer = document.getElementById('equalizer-bands-row');
    if (bandsContainer) {
      const frequencies = [32, 64, 125, 250, 500, '1k', '2k', '4k', '8k', '16k'];
      bandsContainer.innerHTML = frequencies.map((freq, idx) => `
        <div class="eq-band-column">
          <input type="range" class="eq-slider" min="-12" max="12" step="0.5" value="0" data-band="${idx}" />
          <span class="eq-band-label">${freq}</span>
        </div>
      `).join('');

      bandsContainer.querySelectorAll('.eq-slider').forEach(slider => {
        slider.addEventListener('input', (e) => {
          const bandIdx = parseInt(e.target.dataset.band, 10);
          const gain = parseFloat(e.target.value);
          if (this.app.player.audioEngine) {
            this.app.player.audioEngine.setBandGain(bandIdx, gain);
          }
        });
      });
    }

    // EQ Preset Selector
    const presetSelect = document.getElementById('eq-preset-select');
    if (presetSelect) {
      presetSelect.addEventListener('change', (e) => {
        const preset = e.target.value;
        if (this.app.player.audioEngine) {
          const values = this.app.player.audioEngine.applyPreset(preset);
          if (values) {
            bandsContainer.querySelectorAll('.eq-slider').forEach((slider, idx) => {
              slider.value = values[idx];
            });
          }
        }
      });
    }

    // Preamp Slider
    const preampSlider = document.getElementById('eq-preamp-slider');
    if (preampSlider) {
      preampSlider.addEventListener('input', (e) => {
        const gainDb = parseFloat(e.target.value);
        if (this.app.player.audioEngine) {
          this.app.player.audioEngine.setPreamp(gainDb);
        }
        document.getElementById('eq-preamp-val').textContent = `${gainDb > 0 ? '+' : ''}${gainDb} dB`;
      });
    }

    // Video FX Sliders
    ['brightness', 'contrast', 'saturate', 'hueRotate', 'blur'].forEach(filter => {
      const input = document.getElementById(`fx-${filter}`);
      if (input) {
        input.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          this.app.player.videoFX.setFilter(filter, val);
          const unit = filter === 'hueRotate' ? '°' : (filter === 'blur' ? 'px' : '%');
          const valDisplay = document.getElementById(`fx-${filter}-val`);
          if (valDisplay) valDisplay.textContent = `${val}${unit}`;
        });
      }
    });

    // Reset Video FX
    const resetFXBtn = document.getElementById('btn-reset-video-fx');
    if (resetFXBtn) {
      resetFXBtn.addEventListener('click', () => {
        this.app.player.videoFX.resetFilters();
        document.getElementById('fx-brightness').value = 100;
        document.getElementById('fx-contrast').value = 100;
        document.getElementById('fx-saturate').value = 100;
        document.getElementById('fx-hueRotate').value = 0;
        document.getElementById('fx-blur').value = 0;
        document.getElementById('fx-brightness-val').textContent = '100%';
        document.getElementById('fx-contrast-val').textContent = '100%';
        document.getElementById('fx-saturate-val').textContent = '100%';
        document.getElementById('fx-hueRotate-val').textContent = '0°';
        document.getElementById('fx-blur-val').textContent = '0px';
      });
    }

    // Aspect Ratio buttons
    document.querySelectorAll('[data-aspect-ratio]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const ratio = e.currentTarget.dataset.aspectRatio;
        this.app.player.videoFX.setAspectRatio(ratio);
        document.querySelectorAll('[data-aspect-ratio]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.player.showOSD(`Aspect Ratio: ${ratio.toUpperCase()}`);
      });
    });
  }

  // --- SETTINGS (Juxtopposed 10-category reorganization) ---
  initSettingsUI() {
    // Navigation between 10 categories
    document.querySelectorAll('.settings-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
        e.currentTarget.classList.add('active');

        const cat = e.currentTarget.dataset.category;
        document.querySelectorAll('.settings-category-panel').forEach(panel => {
          panel.style.display = (panel.id === `settings-panel-${cat}`) ? 'flex' : 'none';
        });
      });
    });

    // Search bar filtering
    const searchInput = document.getElementById('settings-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        document.querySelectorAll('.setting-row').forEach(row => {
          const text = row.textContent.toLowerCase();
          row.style.display = text.includes(query) ? 'flex' : 'none';
        });
      });
    }
  }
}

window.VLCUI = VLCUI;
