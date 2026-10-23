/* VLC Plus - Media Queue, Library & Sample Catalog Manager
 * Differentiates temporary drag-and-drop playback queue from permanent saved collections.
 */

class VLCQueueManager {
  constructor(player) {
    this.player = player;
    this.activeQueue = [];
    this.savedLibrary = [];
    this.currentIndex = -1;
    this.isShuffle = false;
    this.loopMode = 'none'; // 'none', 'all', 'one'

    this.initSampleCatalog();
  }

  initSampleCatalog() {
    // Rich royalty-free sample media to demonstrate full capabilities immediately
    this.savedLibrary = [
      {
        id: 'sample-video-1',
        title: 'Big Buck Bunny (4K Ultra HD)',
        artist: 'Blender Foundation',
        type: 'video',
        duration: '09:56',
        codec: '4K • H.264 • AAC 5.1 • 60fps',
        src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        poster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
        hasSubtitles: true
      },
      {
        id: 'sample-video-2',
        title: 'Elephants Dream (Sci-Fi Animation)',
        artist: 'Orange Open Movie',
        type: 'video',
        duration: '10:53',
        codec: '1080p • H.264 • Stereo',
        src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
        hasSubtitles: false
      },
      {
        id: 'sample-video-3',
        title: 'For Bigger Blazes (Action Demo)',
        artist: 'Chromecast Samples',
        type: 'video',
        duration: '00:15',
        codec: '1080p • H.264 • Stereo',
        src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        poster: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
        hasSubtitles: false
      },
      {
        id: 'sample-video-4',
        title: 'Tears of Steel (VFX Sci-Fi Short)',
        artist: 'Blender Foundation',
        type: 'video',
        duration: '12:14',
        codec: '4K • H.264 • 5.1 Surround',
        src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
        hasSubtitles: true
      },
      {
        id: 'sample-audio-1',
        title: 'Synthwave Night Horizon',
        artist: 'Neon Cyber Collective',
        type: 'audio',
        duration: '03:45',
        codec: 'FLAC Lossless • 24-bit 96kHz',
        src: 'https://actions.google.com/sounds/v1/science_fiction/deep_drone.ogg',
        poster: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
        hasSubtitles: false
      },
      {
        id: 'sample-audio-2',
        title: 'Ambient Rain & City Lights',
        artist: 'Lofi Sessions',
        type: 'audio',
        duration: '02:30',
        codec: 'MP3 320kbps • Stereo',
        src: 'https://actions.google.com/sounds/v1/weather/rain_heavy.ogg',
        poster: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&auto=format&fit=crop&q=80',
        hasSubtitles: false
      }
    ];

    // Initialize active queue with first few items
    this.activeQueue = [
      { ...this.savedLibrary[0] },
      { ...this.savedLibrary[1] },
      { ...this.savedLibrary[4] }
    ];
    this.currentIndex = 0;
  }

  getCurrentItem() {
    if (this.currentIndex >= 0 && this.currentIndex < this.activeQueue.length) {
      return this.activeQueue[this.currentIndex];
    }
    return null;
  }

  addToQueue(item, playImmediately = false) {
    this.activeQueue.push(item);
    this.renderQueueUI();
    if (playImmediately || this.activeQueue.length === 1) {
      this.playIndex(this.activeQueue.length - 1);
    }
  }

  addToLibrary(item) {
    this.savedLibrary.unshift(item);
    this.renderLibraryUI();
  }

  playIndex(index) {
    if (index >= 0 && index < this.activeQueue.length) {
      this.currentIndex = index;
      const item = this.activeQueue[index];
      this.player.loadMedia(item);
      this.renderQueueUI();
    }
  }

  playNext() {
    if (this.activeQueue.length === 0) return;

    if (this.loopMode === 'one') {
      this.player.seekTo(0);
      this.player.play();
      return;
    }

    if (this.isShuffle) {
      const nextIdx = Math.floor(Math.random() * this.activeQueue.length);
      this.playIndex(nextIdx);
      return;
    }

    if (this.currentIndex < this.activeQueue.length - 1) {
      this.playIndex(this.currentIndex + 1);
    } else if (this.loopMode === 'all') {
      this.playIndex(0);
    }
  }

  playPrev() {
    if (this.activeQueue.length === 0) return;

    // If more than 3 seconds in, restart current track
    if (this.player.video.currentTime > 3) {
      this.player.seekTo(0);
      return;
    }

    if (this.currentIndex > 0) {
      this.playIndex(this.currentIndex - 1);
    } else if (this.loopMode === 'all') {
      this.playIndex(this.activeQueue.length - 1);
    }
  }

  removeFromQueue(index, e) {
    if (e) e.stopPropagation();
    if (index === this.currentIndex) {
      this.playNext();
    }
    this.activeQueue.splice(index, 1);
    if (index < this.currentIndex) {
      this.currentIndex--;
    }
    this.renderQueueUI();
  }

  clearQueue() {
    this.activeQueue = [];
    this.currentIndex = -1;
    this.player.stop();
    this.renderQueueUI();
  }

  toggleLoop() {
    if (this.loopMode === 'none') {
      this.loopMode = 'all';
    } else if (this.loopMode === 'all') {
      this.loopMode = 'one';
    } else {
      this.loopMode = 'none';
    }
    return this.loopMode;
  }

  toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    return this.isShuffle;
  }

  renderQueueUI() {
    const container = document.getElementById('sidebar-queue-list');
    if (!container) return;

    if (this.activeQueue.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 40px 16px; color: var(--text-muted);">
          <p style="font-weight: 600; margin-bottom: 4px;">Queue is empty</p>
          <p style="font-size: 12px;">Drag and drop media files or add items from Library</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.activeQueue.map((item, idx) => {
      const isPlaying = idx === this.currentIndex;
      return `
        <div class="queue-item-card ${isPlaying ? 'playing' : ''}" onclick="window.vlcApp.queue.playIndex(${idx})">
          <div class="queue-item-drag-handle" title="Drag to reorder">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle>
              <circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle>
            </svg>
          </div>
          <div class="queue-item-thumb">
            <img src="${item.poster}" alt="${item.title}" />
          </div>
          <div class="queue-item-info">
            <span class="queue-item-title">${item.title}</span>
            <div class="queue-item-meta">
              <span>${item.duration}</span>
              <span>•</span>
              <span>${item.type.toUpperCase()}</span>
            </div>
          </div>
          <div class="queue-item-actions">
            <button class="queue-action-btn" title="Remove" onclick="window.vlcApp.queue.removeFromQueue(${idx}, event)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  renderLibraryUI() {
    const container = document.getElementById('sidebar-library-grid');
    if (!container) return;

    container.innerHTML = this.savedLibrary.map((item, idx) => {
      return `
        <div class="library-card" onclick="window.vlcApp.queue.addToQueue(window.vlcApp.queue.savedLibrary[${idx}], true)">
          <div class="library-card-thumb ${item.type === 'audio' ? 'music-thumb' : ''}">
            <img src="${item.poster}" alt="${item.title}" />
            <span class="badge ${item.type === 'video' ? 'badge-orange' : 'badge-green'}" style="position: absolute; bottom: 4px; right: 4px;">
              ${item.type.toUpperCase()}
            </span>
          </div>
          <div class="library-card-title">${item.title}</div>
          <div class="library-card-subtitle">${item.artist || 'Unknown'} • ${item.duration}</div>
        </div>
      `;
    }).join('');
  }
}

window.VLCQueueManager = VLCQueueManager;
