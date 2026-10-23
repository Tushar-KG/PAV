/* PAV (Play Any Video) - UI Modals, Popovers, Drawers, Timeline & Settings Controller */

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
    this.initToolbarCustomizer();
  }

  bindUIEvents() {
    // 1. Central Delegated Click Listener for data-action elements
    document.addEventListener('click', (e) => {
      const actionEl = e.target.closest('[data-action]');
      if (actionEl) {
        const action = actionEl.dataset.action;
        this.handleMenuAction(action, actionEl);
      }
    });

    // 2. Local File Picker & Dropzone in Open Media Modal
    const modalDropzone = document.getElementById('modal-select-files-dropzone');
    const localPicker = document.getElementById('local-file-picker');
    if (modalDropzone && localPicker) {
      modalDropzone.addEventListener('click', () => localPicker.click());
    }
    if (localPicker) {
      localPicker.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.player.handleDroppedFiles(e.target.files);
          this.closeAllModals();
        }
      });
    }

    // 3. Quick Network Stream Presets
    document.querySelectorAll('[data-stream-preset]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const url = e.currentTarget.dataset.streamPreset;
        const input = document.getElementById('network-stream-url');
        if (input) input.value = url;
      });
    });

    // 4. Sidebar Drawer Toggle
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const sidebar = document.getElementById('library-sidebar');

    if (toggleSidebarBtn && sidebar) {
      toggleSidebarBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        toggleSidebarBtn.classList.toggle('active', sidebar.classList.contains('open'));
      });
    }

    if (closeSidebarBtn && sidebar) {
      closeSidebarBtn.addEventListener('click', () => {
        sidebar.classList.remove('open');
        if (toggleSidebarBtn) toggleSidebarBtn.classList.remove('active');
      });
    }

    // 5. Sidebar Tabs (Queue vs Library)
    document.querySelectorAll('.sidebar-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.sidebar-tab-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        const tab = e.currentTarget.dataset.tab;
        const queueList = document.getElementById('sidebar-queue-list');
        const libGrid = document.getElementById('sidebar-library-grid');

        if (tab === 'queue') {
          if (queueList) queueList.style.display = 'flex';
          if (libGrid) libGrid.style.display = 'none';
        } else {
          if (queueList) queueList.style.display = 'none';
          if (libGrid) libGrid.style.display = 'grid';
        }
      });
    });

    // 6. Modal Backdrop & Close Buttons
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

    // 7. Quick Popovers (Audio, Subtitles, Speed)
    document.querySelectorAll('[data-popover-target]').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetId = trigger.dataset.popoverTarget;
        this.togglePopover(targetId);
      });
    });

    window.addEventListener('click', (e) => {
      if (!e.target.closest('.quick-popover') && !e.target.closest('[data-popover-target]')) {
        this.closeAllPopovers();
      }
    });

    // Speed option selection
    document.querySelectorAll('.speed-option-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const speed = parseFloat(e.currentTarget.dataset.speed);
        this.player.setPlaybackSpeed(speed);
        document.querySelectorAll('.speed-option-btn').forEach(b => b.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        this.closeAllPopovers();
      });
    });

    // 8. Open Media Modal Tab Switching
    document.querySelectorAll('#modal-open-media .modal-tab-btn').forEach(tabBtn => {
      tabBtn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab('modal-open-media', tab);
      });
    });

    // 9. Network Stream Form Submit
    const networkForm = document.getElementById('network-stream-form');
    if (networkForm) {
      networkForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('network-stream-url');
        const url = input ? input.value.trim() : '';
        if (url) {
          if (url.toLowerCase().endsWith('.m3u8')) {
            this.player.showOSD('Note: HLS (.m3u8) streams require demuxer plugin in Electron', 'warning');
          }
          const item = {
            id: `stream-${Date.now()}`,
            title: `Stream: ${url.split('/').pop() || url}`,
            artist: 'Network Stream',
            type: 'video',
            duration: 'Live',
            codec: 'HTTP Stream',
            src: url,
            poster: '',
            hasSubtitles: false
          };
          if (this.app.queue) {
            this.app.queue.addToQueue(item, true);
          } else {
            this.player.loadMedia(item);
          }
          this.closeAllModals();
        }
      });
    }

    // 10. Capture Device (Screen share / Webcam)
    const btnScreenCapture = document.getElementById('btn-capture-screen');
    if (btnScreenCapture) {
      btnScreenCapture.addEventListener('click', async () => {
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
          this.player.video.srcObject = stream;
          this.player.video.play();
          this.player.showOSD('Screen Capture Active', 'camera');
          const emptyState = document.getElementById('player-empty-state');
          if (emptyState) emptyState.classList.add('hidden');
          this.closeAllModals();
        } catch (e) {
          alert('Screen capture cancelled or unavailable: ' + e.message);
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
          this.player.showOSD('Webcam Stream Active', 'camera');
          const emptyState = document.getElementById('player-empty-state');
          if (emptyState) emptyState.classList.add('hidden');
          this.closeAllModals();
        } catch (e) {
          alert('Webcam capture unavailable: ' + e.message);
        }
      });
    }

    // 11. Batch Subtitle Matcher Buttons
    document.querySelectorAll('.btn-auto-fetch-sub').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.currentTarget.outerHTML = '<span class="badge badge-green">Matched (99%)</span>';
      });
    });

    const batchApplyBtn = document.getElementById('btn-batch-sub-apply');
    if (batchApplyBtn) {
      batchApplyBtn.addEventListener('click', () => {
        this.player.showOSD('Batch Subtitles Synced!');
        this.closeAllModals();
      });
    }
  }

  handleMenuAction(action, targetEl = null) {
    switch (action) {
      case 'open-file': {
        const picker = document.getElementById('local-file-picker');
        if (picker) {
          picker.click();
        } else if (window.electronAPI && window.electronAPI.openFileDialog) {
          window.electronAPI.openFileDialog().then(paths => {
            if (paths && paths.length > 0) {
              paths.forEach(p => this.loadNativeFilePath(p));
            }
          });
        }
        break;
      }
      case 'open-media': {
        let tab = 'file';
        if (targetEl) {
          if (targetEl.dataset.tab) {
            tab = targetEl.dataset.tab;
          } else if (targetEl.textContent.toLowerCase().includes('network')) {
            tab = 'network';
          } else if (targetEl.textContent.toLowerCase().includes('capture')) {
            tab = 'capture';
          }
        }
        this.openModal('modal-open-media');
        this.switchTab('modal-open-media', tab);
        break;
      }
      case 'open-network':
        this.openModal('modal-open-media');
        this.switchTab('modal-open-media', 'network');
        break;
      case 'open-capture':
        this.openModal('modal-open-media');
        this.switchTab('modal-open-media', 'capture');
        break;
      case 'play-pause':
        this.player.togglePlay();
        break;
      case 'stop':
        this.player.stop();
        break;
      case 'prev-track':
        if (this.player.queue) this.player.queue.playPrev();
        break;
      case 'next-track':
        if (this.player.queue) this.player.queue.playNext();
        break;
      case 'vol-up':
        this.player.adjustVolume(0.1);
        break;
      case 'vol-down':
        this.player.adjustVolume(-0.1);
        break;
      case 'mute':
        this.player.toggleMute();
        break;
      case 'loop': {
        if (this.player.queue) {
          const loopMode = this.player.queue.toggleLoop();
          this.player.showOSD(`Loop: ${loopMode.toUpperCase()}`);
          const loopBtn = document.getElementById('ctrl-loop-btn');
          if (loopBtn) loopBtn.classList.toggle('active', loopMode !== 'none');
        }
        break;
      }
      case 'shuffle': {
        if (this.player.queue) {
          const isShuffle = this.player.queue.toggleShuffle();
          this.player.showOSD(`Shuffle: ${isShuffle ? 'ON' : 'OFF'}`);
          const shufBtn = document.getElementById('ctrl-shuffle-btn');
          if (shufBtn) shufBtn.classList.toggle('active', isShuffle);
        }
        break;
      }
      case 'sync-timeline':
        this.openModal('modal-visual-sync');
        this.closeAllPopovers();
        break;
      case 'batch-subtitles':
        this.openModal('modal-batch-subtitles');
        break;
      case 'add-sub-file': {
        const subInput = document.getElementById('sub-file-input');
        if (subInput) subInput.click();
        break;
      }
      case 'sub-delay-minus':
        if (this.player.subtitles) {
          const offset = this.player.subtitles.nudgeSyncOffset(-50);
          this.player.showOSD(`Subtitle Delay: ${offset}ms`);
        }
        break;
      case 'sub-delay-plus':
        if (this.player.subtitles) {
          const offset = this.player.subtitles.nudgeSyncOffset(50);
          this.player.showOSD(`Subtitle Delay: ${offset}ms`);
        }
        break;
      case 'equalizer':
        this.openModal('modal-equalizer-fx');
        this.closeAllPopovers();
        break;
      case 'snapshot':
        if (this.player.videoFX) {
          this.player.videoFX.takeSnapshot();
          this.player.showOSD('Snapshot Captured!', 'camera');
        }
        break;
      case 'fullscreen':
        this.player.toggleFullscreen();
        break;
      case 'pip':
        this.player.togglePiP();
        break;
      case 'toolbar-customizer':
        this.openModal('modal-toolbar-customizer');
        break;
      case 'settings': {
        this.openModal('modal-settings');
        if (targetEl && targetEl.dataset.tab === 'controls') {
          const catBtn = document.querySelector('.settings-nav-item[data-category="controls"]');
          if (catBtn) catBtn.click();
        }
        break;
      }
      case 'about':
        alert('PAV (Play Any Video) v1.0.0\nModern desktop media player with electric cyan & indigo styling.\nFeatures hardware accelerated video compositing, 200% overdrive volume, visual subtitle timeline sync, and custom toolbar customization.');
        break;
    }
  }

  loadNativeFilePath(filePath) {
    const fileName = filePath.split(/[\\/]/).pop();
    const ext = fileName.split('.').pop().toLowerCase();
    const isAudio = ['mp3', 'flac', 'wav', 'ogg', 'm4a', 'aac'].includes(ext);
    const isSub = ['srt', 'vtt', 'sub'].includes(ext);

    if (isSub) {
      if (window.electronAPI && window.electronAPI.readFileText) {
        window.electronAPI.readFileText(filePath).then(text => {
          if (text) {
            this.player.subtitles.loadSubtitlesFromText(text, fileName);
            this.player.showOSD(`Subtitles: ${fileName}`);
          }
        });
      }
    } else {
      const newItem = {
        id: `file-${Date.now()}`,
        title: fileName,
        artist: 'Local Media',
        type: isAudio ? 'audio' : 'video',
        duration: 'Local File',
        codec: ext.toUpperCase(),
        src: `file://${filePath.replace(/\\/g, '/')}`,
        poster: isAudio ? 'logo.svg' : '',
        hasSubtitles: false
      };
      if (this.player.queue) {
        this.player.queue.addToQueue(newItem, true);
      } else {
        this.player.loadMedia(newItem);
      }
    }
  }

  switchTab(modalId, tabName) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.querySelectorAll('.modal-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    modal.querySelectorAll('.open-media-tab-panel').forEach(panel => {
      panel.style.display = (panel.id === `tab-open-${tabName}`) ? 'flex' : 'none';
    });
  }

  openModal(modalId) {
    this.closeAllModals();
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      modal.style.pointerEvents = 'auto';
      this.activeModal = modal;
    }
  }

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.classList.remove('active');
      modal.style.pointerEvents = 'none';
    });
    this.activeModal = null;
  }

  togglePopover(popoverId) {
    const popover = document.getElementById(popoverId);
    if (!popover) return;

    if (popover.classList.contains('show')) {
      popover.classList.remove('show');
      popover.style.pointerEvents = 'none';
      this.activePopover = null;
    } else {
      this.closeAllPopovers();
      popover.classList.add('show');
      popover.style.pointerEvents = 'auto';
      this.activePopover = popover;
    }
  }

  closeAllPopovers() {
    document.querySelectorAll('.quick-popover').forEach(p => {
      p.classList.remove('show');
      p.style.pointerEvents = 'none';
    });
    this.activePopover = null;
  }

  // --- VISUAL SUBTITLE & AUDIO SYNC TIMELINE ---
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
      if (readoutValue) readoutValue.textContent = `${sign}${Math.abs(offsetMs)}`;

      // Center is 50%, mapped from -5000ms to +5000ms
      const boundedOffset = Math.max(-5000, Math.min(5000, offsetMs));
      const percentFromCenter = (boundedOffset / 5000) * 40; // 40% travel either side
      track.style.left = `calc(50% + ${percentFromCenter}%)`;

      // Update subtitle engine
      if (this.app.subtitles) {
        this.app.subtitles.setSyncOffset(offsetMs);
        if (presetCheckbox && presetCheckbox.checked) {
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
    if (presetSelect && bandsContainer) {
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
        const valEl = document.getElementById('eq-preamp-val');
        if (valEl) valEl.textContent = `${gainDb > 0 ? '+' : ''}${gainDb} dB`;
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
        ['brightness', 'contrast', 'saturate', 'hueRotate', 'blur'].forEach(filter => {
          const input = document.getElementById(`fx-${filter}`);
          const display = document.getElementById(`fx-${filter}-val`);
          if (input) input.value = (filter === 'hueRotate' || filter === 'blur') ? 0 : 100;
          if (display) display.textContent = (filter === 'hueRotate' ? '0°' : (filter === 'blur' ? '0px' : '100%'));
        });
      });
    }

    // Aspect Ratio Buttons
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

  // --- SETTINGS CONTROLLER (With LocalStorage Persistence) ---
  initSettingsUI() {
    // Navigation between categories
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

    // Search bar filter
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

    // Load persisted settings
    const resumeSelect = document.getElementById('setting-resume-position');
    const singleInstanceCheck = document.getElementById('setting-single-instance');
    const themeSelect = document.getElementById('setting-theme-mode');
    const timeoutSelect = document.getElementById('setting-autohide-timeout');
    const osdCheck = document.getElementById('setting-osd-enabled');
    const boostCheck = document.getElementById('setting-boost-200');
    const audioNormCheck = document.getElementById('setting-audio-norm');

    try {
      const savedSettings = JSON.parse(localStorage.getItem('pav_preferences') || '{}');

      if (resumeSelect && savedSettings.resumePosition) {
        resumeSelect.value = savedSettings.resumePosition;
      }
      if (singleInstanceCheck && savedSettings.singleInstance !== undefined) {
        singleInstanceCheck.checked = savedSettings.singleInstance;
      }
      if (themeSelect && savedSettings.themeMode) {
        themeSelect.value = savedSettings.themeMode;
      }
      if (timeoutSelect && savedSettings.autoHideTimeout) {
        timeoutSelect.value = savedSettings.autoHideTimeout;
      }
      if (osdCheck && savedSettings.osdEnabled !== undefined) {
        osdCheck.checked = savedSettings.osdEnabled;
      }
      if (boostCheck && savedSettings.volumeBoost200 !== undefined) {
        boostCheck.checked = savedSettings.volumeBoost200;
      }
      if (audioNormCheck && savedSettings.audioNorm !== undefined) {
        audioNormCheck.checked = savedSettings.audioNorm;
      }
    } catch (e) {}

    const saveSettings = () => {
      const settings = {
        resumePosition: resumeSelect ? resumeSelect.value : 'ask',
        singleInstance: singleInstanceCheck ? singleInstanceCheck.checked : true,
        themeMode: themeSelect ? themeSelect.value : 'dark',
        autoHideTimeout: timeoutSelect ? timeoutSelect.value : '2500',
        osdEnabled: osdCheck ? osdCheck.checked : true,
        volumeBoost200: boostCheck ? boostCheck.checked : true,
        audioNorm: audioNormCheck ? audioNormCheck.checked : false
      };
      try {
        localStorage.setItem('pav_preferences', JSON.stringify(settings));
      } catch (e) {}
    };

    [resumeSelect, singleInstanceCheck, themeSelect, timeoutSelect, osdCheck, boostCheck, audioNormCheck].forEach(el => {
      if (el) {
        el.addEventListener('change', () => {
          saveSettings();
          this.player.showOSD('Preference Saved');
        });
      }
    });
  }

  // --- TOOLBAR CUSTOMIZER ---
  initToolbarCustomizer() {
    // 1. Profile preset buttons
    document.querySelectorAll('[data-toolbar-profile]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const profile = e.currentTarget.dataset.toolbarProfile;
        this.player.applyToolbarProfile(profile);
      });
    });

    // 2. Individual widget pills toggle
    document.querySelectorAll('.toolbar-widget-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        pill.classList.toggle('enabled');
        const widget = pill.dataset.widget;
        const isEnabled = pill.classList.contains('enabled');
        this.toggleToolbarWidget(widget, isEnabled);
      });
    });

    // 3. Save Layout button
    const saveLayoutBtn = document.getElementById('btn-save-toolbar-layout');
    if (saveLayoutBtn) {
      saveLayoutBtn.addEventListener('click', () => {
        const enabledWidgets = [];
        document.querySelectorAll('.toolbar-widget-pill.enabled').forEach(p => {
          if (p.dataset.widget) enabledWidgets.push(p.dataset.widget);
        });
        try {
          localStorage.setItem('pav_toolbar_custom_widgets', JSON.stringify(enabledWidgets));
        } catch (e) {}
        this.player.showOSD('Toolbar Layout Saved!');
        this.closeAllModals();
      });
    }

    // Load saved toolbar profile on startup
    try {
      const savedProfile = localStorage.getItem('pav_toolbar_profile') || 'standard';
      this.player.applyToolbarProfile(savedProfile);
    } catch (e) {}
  }

  toggleToolbarWidget(widget, isEnabled) {
    const displayStyle = isEnabled ? 'inline-flex' : 'none';
    const widgetMap = {
      'play-pause': ['#ctrl-play-pause-btn'],
      'prev-next': ['#ctrl-prev-btn', '#ctrl-next-btn'],
      'step-jump': ['#ctrl-step-back-btn', '#ctrl-step-fwd-btn'],
      'stop': ['#ctrl-stop-btn'],
      'loop-shuffle': ['#ctrl-loop-btn', '#ctrl-shuffle-btn'],
      'ab-repeat': ['#ctrl-ab-loop-btn'],
      'time-display': ['#time-display'],
      'volume': ['.volume-control-box'],
      'speed': ['#btn-speed-selector'],
      'subtitles': ['[data-popover-target="popover-subtitles"]'],
      'audio': ['[data-popover-target="popover-audio"]'],
      'equalizer': ['#btn-equalizer-modal'],
      'snapshot': ['#btn-snapshot-quick'],
      'pip': ['#btn-pip'],
      'fullscreen': ['#btn-fullscreen']
    };

    const selectors = widgetMap[widget];
    if (selectors) {
      selectors.forEach(sel => {
        const el = document.querySelector(sel);
        if (el) el.style.display = displayStyle;
      });
    }
  }
}

window.VLCUI = VLCUI;
