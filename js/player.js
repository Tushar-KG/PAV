/* VLC Plus - Core Player Engine & Interactions
 * Implements Juxtopposed's Layout: Left-aligned controls, right-aligned utilities,
 * thick scrubbing seek bar with hover thumbnail, traffic cone volume slider up to 200%,
 * auto-hiding chrome, full keyboard shortcuts, and On-Screen Display (OSD).
 */

class VLCPlayer {
  constructor() {
    this.video = document.getElementById('main-video');
    this.container = document.getElementById('app-container');
    this.viewport = document.getElementById('player-viewport');

    // Submodules (initialized in app.js)
    this.audioEngine = null;
    this.videoFX = null;
    this.subtitles = null;
    this.queue = null;

    // State
    this.isPlaying = false;
    this.isMuted = false;
    this.volume = 1.0; // 1.0 = 100%, max 2.0 = 200%
    this.playbackRate = 1.0;
    this.showRemainingTime = false;
    this.chromeTimeout = null;
    this.isScrubbing = false;
    this.currentToolbarProfile = 'standard';

    this.bindEvents();
    this.initWaveformCanvas();
  }

  initWaveformCanvas() {
    const canvas = document.getElementById('seek-waveform-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 1200;
    canvas.height = 30;

    // Draw stylized audio peak envelope
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const numBars = 160;
    const barWidth = canvas.width / numBars;

    for (let i = 0; i < numBars; i++) {
      // Procedural audio waveform simulation
      const noise = Math.sin(i * 0.15) * 0.4 + Math.sin(i * 0.4) * 0.3 + (Math.random() * 0.3);
      const height = Math.max(4, Math.abs(noise) * (canvas.height - 4));
      const y = (canvas.height - height) / 2;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(i * barWidth, y, barWidth - 1, height);
    }
  }

  toggleABLoop() {
    if (!this.videoFX) return;
    const current = this.video.currentTime;

    if (this.videoFX.abLoop.pointA === null) {
      this.videoFX.setABLoopPointA();
      this.updateABMarkers();
      this.showOSD(`A-B Loop: Point A set (${this.formatTime(current)})`, 'repeat');
    } else if (this.videoFX.abLoop.pointB === null) {
      this.videoFX.setABLoopPointB();
      this.updateABMarkers();
      this.showOSD(`A-B Loop: Point B set (Looping ${this.formatTime(this.videoFX.abLoop.pointA)} → ${this.formatTime(current)})`, 'repeat');
    } else {
      this.videoFX.clearABLoop();
      this.updateABMarkers();
      this.showOSD('A-B Loop: Cleared', 'repeat');
    }
  }

  updateABMarkers() {
    const dur = this.video.duration || 1;
    const markerA = document.getElementById('ab-marker-a');
    const markerB = document.getElementById('ab-marker-b');
    const range = document.getElementById('ab-loop-range');

    if (!markerA || !markerB || !range) return;

    const { pointA, pointB, enabled } = this.videoFX.abLoop;

    if (pointA !== null) {
      const pctA = (pointA / dur) * 100;
      markerA.style.left = `${pctA}%`;
      markerA.style.display = 'block';
    } else {
      markerA.style.display = 'none';
    }

    if (pointB !== null) {
      const pctB = (pointB / dur) * 100;
      markerB.style.left = `${pctB}%`;
      markerB.style.display = 'block';
    } else {
      markerB.style.display = 'none';
    }

    if (enabled && pointA !== null && pointB !== null) {
      const pctA = (pointA / dur) * 100;
      const pctB = (pointB / dur) * 100;
      range.style.left = `${pctA}%`;
      range.style.width = `${pctB - pctA}%`;
      range.style.display = 'block';
    } else {
      range.style.display = 'none';
    }
  }

  applyToolbarProfile(profileName) {
    this.currentToolbarProfile = profileName;
    try {
      localStorage.setItem('pav_toolbar_profile', profileName);
    } catch (e) {}

    const stepBackBtn = document.getElementById('ctrl-step-back-btn');
    const stepFwdBtn = document.getElementById('ctrl-step-fwd-btn');
    const prevBtn = document.getElementById('ctrl-prev-btn');
    const nextBtn = document.getElementById('ctrl-next-btn');
    const stopBtn = document.getElementById('ctrl-stop-btn');
    const loopBtn = document.getElementById('ctrl-loop-btn');
    const shuffleBtn = document.getElementById('ctrl-shuffle-btn');
    const abLoopBtn = document.getElementById('ctrl-ab-loop-btn');
    const syncBtn = document.getElementById('btn-visual-sync-modal');
    const pipBtn = document.getElementById('btn-pip');
    const speedBtn = document.getElementById('btn-speed-selector');
    const eqBtn = document.getElementById('btn-equalizer-modal');

    // Update active button state in customizer modal
    ['standard', 'minimal', 'pro'].forEach(p => {
      const btn = document.getElementById(`profile-btn-${p}`);
      if (btn) btn.classList.toggle('active', p === profileName);
    });

    if (profileName === 'minimal') {
      [stepBackBtn, stepFwdBtn, prevBtn, nextBtn, stopBtn, loopBtn, shuffleBtn, abLoopBtn, syncBtn].forEach(el => {
        if (el) el.style.display = 'none';
      });
      if (speedBtn) speedBtn.style.display = 'inline-flex';
      if (pipBtn) pipBtn.style.display = 'inline-flex';
    } else if (profileName === 'pro') {
      [stepBackBtn, stepFwdBtn, prevBtn, nextBtn, stopBtn, loopBtn, shuffleBtn, abLoopBtn, syncBtn, pipBtn, speedBtn, eqBtn].forEach(el => {
        if (el) el.style.display = 'inline-flex';
      });
    } else {
      // Standard
      [stepBackBtn, stepFwdBtn, prevBtn, nextBtn, stopBtn, loopBtn, shuffleBtn, syncBtn, pipBtn, speedBtn, eqBtn].forEach(el => {
        if (el) el.style.display = 'inline-flex';
      });
      if (abLoopBtn) abLoopBtn.style.display = 'inline-flex';
    }
    this.showOSD(`Toolbar: ${profileName.toUpperCase()}`);
  }

  initEngines() {
    try {
      this.audioEngine = new VLCAudioEngine(this.video);
    } catch (e) {
      console.error('Audio engine init failed:', e);
      this.audioEngine = null;
    }
    try {
      this.videoFX = new VLCVideoFX(this.video);
      this.videoFx = this.videoFX;
    } catch (e) {
      console.error('VideoFX init failed:', e);
      this.videoFX = null;
      this.videoFx = null;
    }
    try {
      this.subtitles = new VLCSubtitleEngine(this);
    } catch (e) {
      console.error('Subtitle engine init failed:', e);
      this.subtitles = null;
    }
    try {
      this.queue = new VLCQueueManager(this);
    } catch (e) {
      console.error('Queue manager init failed:', e);
      this.queue = null;
    }
  }

  bindEvents() {
    // Video native events
    this.video.addEventListener('timeupdate', () => this.onTimeUpdate());
    this.video.addEventListener('loadedmetadata', () => this.onMetadataLoaded());
    this.video.addEventListener('play', () => this.onPlayStateChange(true));
    this.video.addEventListener('pause', () => this.onPlayStateChange(false));
    this.video.addEventListener('ended', () => this.onEnded());
    this.video.addEventListener('progress', () => this.updateBufferBar());

    // Explicit video decode/format error handler
    this.video.addEventListener('error', () => {
      const err = this.video.error;
      let msg = 'Playback Error: Media format unsupported or file unreadable';
      if (err) {
        if (err.code === 1) msg = 'Playback Aborted';
        else if (err.code === 2) msg = 'Network Error loading media';
        else if (err.code === 3) msg = 'Decoding Error: Corrupt or unsupported stream';
        else if (err.code === 4) msg = 'Format Unsupported: Codec not playable by HTML5 video';
      }
      this.showOSD(msg, 'error');
      console.error('HTML5 Video Error:', err);
    });

    // Auto-hide chrome on inactivity: wake up on any mouse movement across window
    this.isHoveringChrome = false;
    const headerEl = document.getElementById('player-header');
    const controlsEl = document.querySelector('.player-controls-container');
    const sidebarEl = document.getElementById('library-sidebar');
    [headerEl, controlsEl, sidebarEl].forEach(el => {
      if (el) {
        el.addEventListener('mouseenter', () => {
          this.isHoveringChrome = true;
          this.resetChromeTimer();
        });
        el.addEventListener('mouseleave', () => {
          this.isHoveringChrome = false;
        });
      }
    });

    window.addEventListener('mousemove', () => this.resetChromeTimer());
    document.addEventListener('mouseleave', () => this.hideChromeImmediate());

    this.viewport.addEventListener('click', (e) => {
      // Toggle play/pause on single click if not clicking controls or empty state
      if (e.target === this.video || e.target === this.viewport) {
        this.togglePlay();
      }
    });

    this.viewport.addEventListener('dblclick', (e) => {
      if (e.target === this.video || e.target === this.viewport) {
        this.toggleFullscreen();
      }
    });

    // Seek bar interactions
    const seekBar = document.getElementById('seek-bar-wrapper');
    seekBar.addEventListener('mousedown', (e) => this.startScrubbing(e));
    window.addEventListener('mousemove', (e) => {
      if (this.isScrubbing) this.scrub(e);
    });
    window.addEventListener('mouseup', () => {
      if (this.isScrubbing) this.stopScrubbing();
    });

    // Seek bar hover preview
    seekBar.addEventListener('mousemove', (e) => this.onSeekHover(e));
    seekBar.addEventListener('mouseleave', () => this.onSeekLeave());

    // Volume slider interactions
    const volumeSlider = document.getElementById('volume-slider-wrapper');
    volumeSlider.addEventListener('click', (e) => this.onVolumeBarClick(e));
    volumeSlider.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.adjustVolume(e.deltaY < 0 ? 0.05 : -0.05);
    });

    // Time display toggle (elapsed vs remaining)
    const timeDisplay = document.getElementById('time-display');
    timeDisplay.addEventListener('click', () => {
      this.showRemainingTime = !this.showRemainingTime;
      this.onTimeUpdate();
    });

    // Global keyboard shortcuts
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // Drag and Drop media files
    this.initDragAndDrop();
  }

  loadMedia(item) {
    if (!item || !item.src) return;

    // Revoke old blob URLs to prevent memory leaks
    if (this.currentBlobUrl && this.currentBlobUrl !== item.src) {
      try {
        URL.revokeObjectURL(this.currentBlobUrl);
      } catch (e) {}
      this.currentBlobUrl = null;
    }
    if (item.src && item.src.startsWith('blob:')) {
      this.currentBlobUrl = item.src;
    }

    // Set crossorigin only when necessary for remote network streams
    if (item.src.startsWith('http://') || item.src.startsWith('https://')) {
      this.video.crossOrigin = 'anonymous';
    } else {
      this.video.removeAttribute('crossorigin');
    }

    // Reset subtitles
    if (this.subtitles) {
      this.subtitles.setMediaId(item.id);
      if (item.hasSubtitles) {
        this.subtitles.loadSampleSubtitles();
      } else {
        this.subtitles.loadSubtitlesFromText('', 'Off');
      }
    }

    // Update Header metadata
    const titleEl = document.getElementById('current-media-title');
    if (titleEl) titleEl.textContent = item.title;
    const codecEl = document.getElementById('current-media-codec');
    if (codecEl) {
      codecEl.textContent = item.codec || 'Media Loaded';
      codecEl.style.display = 'inline-flex';
    }

    // Hide empty state button once media is loaded
    const emptyState = document.getElementById('player-empty-state');
    if (emptyState) emptyState.classList.add('hidden');

    // Check if music mode
    const musicModeView = document.getElementById('music-mode-view');
    if (item.type === 'audio') {
      if (musicModeView) {
        musicModeView.classList.add('active');
        document.getElementById('music-track-title').textContent = item.title;
        document.getElementById('music-artist-album').textContent = `${item.artist || 'Audio Track'} • ${item.codec || 'Stereo'}`;
        document.getElementById('music-cover-img').src = item.poster || 'logo.svg';
      }
      this.startMusicVisualizer();
    } else {
      if (musicModeView) musicModeView.classList.remove('active');
    }

    this.video.src = item.src;
    this.video.load();
    this.play();
    this.showOSD(`Loaded: ${item.title}`, 'play');
  }

  play() {
    try {
      if (this.audioEngine) this.audioEngine.ensureContext();
    } catch (e) {
      console.warn('AudioEngine context resume warning:', e);
    }
    this.video.play().catch(e => console.log('Autoplay deferred:', e));
  }

  pause() {
    this.video.pause();
  }

  togglePlay() {
    if (this.video.paused || this.video.ended) {
      this.play();
    } else {
      this.pause();
    }
  }

  stop() {
    this.video.pause();
    this.video.currentTime = 0;
    this.onTimeUpdate();
    this.showOSD('Stopped', 'stop');
  }

  seekBy(seconds) {
    this.seekTo(this.video.currentTime + seconds);
    const sign = seconds > 0 ? '+' : '';
    this.showOSD(`Seek ${sign}${seconds}s`, 'seek');
  }

  seekTo(seconds) {
    const target = Math.max(0, Math.min(this.video.duration || 0, seconds));
    this.video.currentTime = target;
    this.onTimeUpdate();
  }

  setVolume(ratio) {
    this.volume = Math.max(0, Math.min(2.0, ratio)); // up to 200%
    if (this.audioEngine) {
      this.audioEngine.setVolume(this.volume);
    } else {
      this.video.volume = Math.min(1.0, this.volume);
    }

    this.isMuted = this.volume === 0;
    this.updateVolumeUI();
    const pct = Math.round(this.volume * 100);
    this.showOSD(`Volume: ${pct}%`, 'volume', pct);
  }

  adjustVolume(delta) {
    this.setVolume(this.volume + delta);
  }

  toggleMute() {
    if (this.isMuted) {
      this.setVolume(this.lastVolume || 1.0);
      this.isMuted = false;
    } else {
      this.lastVolume = this.volume;
      this.setVolume(0);
      this.isMuted = true;
      this.showOSD('Muted', 'mute');
    }
  }

  setPlaybackSpeed(speed) {
    this.playbackRate = speed;
    this.video.playbackRate = speed;
    document.getElementById('current-speed-label').textContent = `${speed}x`;
    this.showOSD(`Speed: ${speed}x`, 'speed');
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.container.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen().catch(err => console.log(err));
    }
  }

  async togglePiP() {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled && this.video.readyState >= 2) {
        await this.video.requestPictureInPicture();
      }
    } catch (e) {
      this.showOSD('PiP Not Supported', 'pip');
    }
  }

  // --- UI Update Hooks ---
  onPlayStateChange(isPlaying) {
    this.isPlaying = isPlaying;
    const playBtn = document.getElementById('ctrl-play-pause-btn');
    const playIcon = document.getElementById('play-icon-svg');
    const pauseIcon = document.getElementById('pause-icon-svg');

    if (isPlaying) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
      this.resetChromeTimer();
      this.showOSD('Playing', 'play');
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
      this.container.classList.remove('chrome-hidden');
      this.viewport.classList.remove('cursor-hidden');
      this.showOSD('Paused', 'pause');
    }
  }

  onMetadataLoaded() {
    this.onTimeUpdate();
    this.updateBufferBar();

    const w = this.video.videoWidth;
    const h = this.video.videoHeight;
    const codecEl = document.getElementById('current-media-codec');
    if (codecEl) {
      if (w && h) {
        let res = `${w}x${h}`;
        if (w >= 3840 || h >= 2160) res = '4K UHD';
        else if (w >= 2560 || h >= 1440) res = '2K QHD';
        else if (w >= 1920 || h >= 1080) res = '1080p FHD';
        else if (w >= 1280 || h >= 720) res = '720p HD';
        codecEl.textContent = `${res} • HTML5 • Stereo`;
        codecEl.style.display = 'inline-flex';
      } else {
        codecEl.textContent = 'Audio Stream';
        codecEl.style.display = 'inline-flex';
      }
    }
  }

  onTimeUpdate() {
    const cur = this.video.currentTime || 0;
    const dur = this.video.duration || 0;

    // Update subtitles
    if (this.subtitles) {
      this.subtitles.update(cur);
    }

    // Check A-B loop
    if (this.videoFX) {
      this.videoFX.checkABLoop();
    }

    // Update Seek Bar Progress
    if (!this.isScrubbing && dur > 0) {
      const pct = (cur / dur) * 100;
      document.getElementById('seek-progress-bar').style.width = `${pct}%`;
    }

    // Update Time Display
    const curFormatted = this.formatTime(cur);
    const timeDisplayEl = document.getElementById('time-current');
    const durationEl = document.getElementById('time-duration');

    timeDisplayEl.textContent = curFormatted;

    if (this.showRemainingTime) {
      const remaining = Math.max(0, dur - cur);
      durationEl.textContent = `-${this.formatTime(remaining)}`;
      durationEl.title = 'Click to show total duration';
    } else {
      durationEl.textContent = this.formatTime(dur);
      durationEl.title = 'Click to show remaining time';
    }
  }

  updateBufferBar() {
    const dur = this.video.duration;
    if (dur > 0 && this.video.buffered.length > 0) {
      const bufferedEnd = this.video.buffered.end(this.video.buffered.length - 1);
      const pct = (bufferedEnd / dur) * 100;
      document.getElementById('seek-buffer-bar').style.width = `${pct}%`;
    }
  }

  onEnded() {
    if (this.queue) {
      this.queue.playNext();
    }
  }

  updateVolumeUI() {
    // Fill percentage: 0% to 200% mapped to slider width (where 100% is 50% width, 200% is 100% width)
    const fillPct = (this.volume / 2.0) * 100;
    const fillEl = document.getElementById('volume-bar-fill');
    const labelEl = document.getElementById('volume-pct-label');

    fillEl.style.width = `${fillPct}%`;
    const displayPct = Math.round(this.volume * 100);
    labelEl.textContent = `${displayPct}%`;

    if (displayPct > 100) {
      labelEl.classList.add('overdrive');
    } else {
      labelEl.classList.remove('overdrive');
    }
  }

  onVolumeBarClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = (clickX / rect.width) * 2.0; // Scale 0 to 200%
    this.setVolume(Math.round(ratio * 20) / 20); // round to nearest 5%
  }

  startScrubbing(e) {
    this.isScrubbing = true;
    this.scrub(e);
  }

  scrub(e) {
    const seekBar = document.getElementById('seek-bar-wrapper');
    const rect = seekBar.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = offsetX / rect.width;
    const targetTime = ratio * (this.video.duration || 0);

    document.getElementById('seek-progress-bar').style.width = `${ratio * 100}%`;
    document.getElementById('time-current').textContent = this.formatTime(targetTime);
    this.video.currentTime = targetTime;
  }

  stopScrubbing() {
    this.isScrubbing = false;
  }

  onSeekHover(e) {
    const seekBar = document.getElementById('seek-bar-wrapper');
    const rect = seekBar.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = offsetX / rect.width;
    const hoverTime = ratio * (this.video.duration || 0);

    const tooltip = document.getElementById('seek-preview-tooltip');
    tooltip.style.left = `${ratio * 100}%`;
    tooltip.classList.add('visible');
    document.getElementById('seek-preview-timecode').textContent = this.formatTime(hoverTime);
  }

  onSeekLeave() {
    document.getElementById('seek-preview-tooltip').classList.remove('visible');
  }

  // --- Auto-hiding Chrome ---
  resetChromeTimer() {
    this.container.classList.remove('chrome-hidden');
    this.viewport.classList.remove('cursor-hidden');
    clearTimeout(this.chromeTimeout);

    if (this.isPlaying) {
      this.chromeTimeout = setTimeout(() => {
        this.hideChromeImmediate();
      }, 2500);
    }
  }

  hideChromeImmediate() {
    if (this.isPlaying && !this.isScrubbing && !this.isHoveringChrome && !document.querySelector('.modal-backdrop.active')) {
      this.container.classList.add('chrome-hidden');
      this.viewport.classList.add('cursor-hidden');
    }
  }

  // --- OSD Notification Banner ---
  showOSD(text, iconType = 'info', meterPct = null) {
    const osd = document.getElementById('osd-overlay');
    const osdText = document.getElementById('osd-text');
    const osdMeter = document.getElementById('osd-meter-bar');
    const osdMeterFill = document.getElementById('osd-meter-fill');

    if (!osd || !osdText) return;
    osdText.textContent = text;

    if (meterPct !== null && osdMeter && osdMeterFill) {
      osdMeter.style.display = 'block';
      osdMeterFill.style.width = `${Math.min(100, meterPct / 2)}%`; // 200% mapped to 100% meter
    } else if (osdMeter) {
      osdMeter.style.display = 'none';
    }

    osd.classList.add('show');
    clearTimeout(this.osdTimeout);
    this.osdTimeout = setTimeout(() => {
      osd.classList.remove('show');
    }, 1200);
  }

  formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const pad = n => String(n).padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  }

  handleKeyDown(e) {
    // If typing in an input field, do not trigger player shortcuts
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      return;
    }

    switch (e.key) {
      case ' ':
      case 'k':
      case 'K':
        e.preventDefault();
        this.togglePlay();
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        this.toggleFullscreen();
        break;
      case 'i':
      case 'I':
        e.preventDefault();
        this.togglePiP();
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        this.toggleMute();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.seekBy(e.shiftKey ? -5 : -10);
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.seekBy(e.shiftKey ? 5 : 10);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.adjustVolume(0.05);
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.adjustVolume(-0.05);
        break;
      case 'n':
      case 'N':
        e.preventDefault();
        if (this.queue) this.queue.playNext();
        break;
      case 'p':
      case 'P':
        e.preventDefault();
        if (this.queue) this.queue.playPrev();
        break;
      case 'j':
      case 'J':
        e.preventDefault();
        this.showOSD(`Audio Delay: ${e.shiftKey ? '+50ms' : '-50ms'}`);
        break;
      case 'g':
      case 'G':
        e.preventDefault();
        if (this.subtitles) {
          const offset = this.subtitles.nudgeSyncOffset(-50);
          this.showOSD(`Subtitle Delay: ${offset}ms`);
        }
        break;
      case 'h':
      case 'H':
        e.preventDefault();
        if (this.subtitles) {
          const offset = this.subtitles.nudgeSyncOffset(50);
          this.showOSD(`Subtitle Delay: ${offset}ms`);
        }
        break;
      case 's':
      case 'S':
        e.preventDefault();
        if (e.shiftKey) {
          if (this.videoFX) {
            this.videoFX.takeSnapshot();
            this.showOSD('Snapshot Captured!', 'camera');
          }
        } else {
          this.stop();
        }
        break;
      case 'l':
      case 'L':
        e.preventDefault();
        if (this.queue) {
          const loop = this.queue.toggleLoop();
          this.showOSD(`Loop: ${loop.toUpperCase()}`);
          const loopBtn = document.getElementById('ctrl-loop-btn');
          if (loopBtn) loopBtn.classList.toggle('active', loop !== 'none');
        }
        break;
      case 'r':
      case 'R':
        e.preventDefault();
        if (this.queue) {
          const shuf = this.queue.toggleShuffle();
          this.showOSD(`Shuffle: ${shuf ? 'ON' : 'OFF'}`);
          const shufBtn = document.getElementById('ctrl-shuffle-btn');
          if (shufBtn) shufBtn.classList.toggle('active', shuf);
        }
        break;
      case 'e':
      case 'E':
        e.preventDefault();
        if (this.videoFX) {
          this.videoFX.stepFrame(true);
          this.showOSD('Frame Step Forward');
        }
        break;
      case 'Escape':
        if (window.vlcApp && window.vlcApp.ui) {
          window.vlcApp.ui.closeAllModals();
          window.vlcApp.ui.closeAllPopovers();
        }
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(err => console.log(err));
        }
        break;
    }
  }

  initDragAndDrop() {
    const overlay = document.getElementById('drag-drop-overlay');
    if (!overlay) return;

    let dragCounter = 0;

    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      overlay.classList.add('active');
    });

    window.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    window.addEventListener('dragleave', (e) => {
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        overlay.classList.remove('active');
      }
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      overlay.classList.remove('active');

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        this.handleDroppedFiles(files);
      }
    });

    window.addEventListener('dragend', () => {
      dragCounter = 0;
      overlay.classList.remove('active');
    });
  }

  handleDroppedFiles(files) {
    for (let file of files) {
      const ext = file.name.split('.').pop().toLowerCase();
      const fileUrl = URL.createObjectURL(file);

      if (['srt', 'vtt', 'sub'].includes(ext)) {
        // Load as subtitle
        const reader = new FileReader();
        reader.onload = (ev) => {
          this.subtitles.loadSubtitlesFromText(ev.target.result, file.name);
          this.showOSD(`Subtitles Loaded: ${file.name}`);
        };
        reader.readAsText(file);
      } else {
        // Media file (video or audio)
        const isAudio = ['mp3', 'flac', 'wav', 'ogg', 'm4a', 'aac'].includes(ext);
        const newItem = {
          id: `file-${Date.now()}`,
          title: file.name,
          artist: 'Local Media',
          type: isAudio ? 'audio' : 'video',
          duration: 'Local File',
          codec: ext.toUpperCase(),
          src: fileUrl,
          poster: isAudio ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80' : '',
          hasSubtitles: false
        };
        this.queue.addToQueue(newItem, true);
        this.showOSD(`Playing Local: ${file.name}`);
        break; // Play first file
      }
    }
  }

  startMusicVisualizer() {
    const canvas = document.getElementById('audio-visualizer-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      if (!this.isPlaying || !this.audioEngine) {
        requestAnimationFrame(render);
        return;
      }

      const freqData = this.audioEngine.getFrequencyData();
      if (!freqData) {
        requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / freqData.length) * 2.2;
      let x = 0;

      for (let i = 0; i < freqData.length; i++) {
        const barHeight = (freqData[i] / 255) * canvas.height;

        // Gradient from orange to amber
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#FF6A00');
        gradient.addColorStop(1, '#FFB300');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);

        x += barWidth;
      }

      requestAnimationFrame(render);
    };

    render();
  }
}

window.VLCPlayer = VLCPlayer;
