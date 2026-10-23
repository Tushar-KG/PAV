/* VLC Plus - Video Effects, Filters, Aspect Ratio & Frame Capture Engine */

class VLCVideoFX {
  constructor(videoElement) {
    this.video = videoElement;
    this.filters = {
      brightness: 100, // %
      contrast: 100,   // %
      saturate: 100,   // %
      hueRotate: 0,    // deg
      blur: 0,         // px
      invert: 0,       // %
      sepia: 0         // %
    };

    this.aspectRatio = 'default';
    this.abLoop = {
      pointA: null,
      pointB: null,
      enabled: false
    };
  }

  setFilter(filterName, value) {
    if (this.filters.hasOwnProperty(filterName)) {
      this.filters[filterName] = value;
      this.applyFilters();
    }
  }

  resetFilters() {
    this.filters = {
      brightness: 100,
      contrast: 100,
      saturate: 100,
      hueRotate: 0,
      blur: 0,
      invert: 0,
      sepia: 0
    };
    this.applyFilters();
    return this.filters;
  }

  applyFilters() {
    if (!this.video) return;
    const filterString = `
      brightness(${this.filters.brightness}%)
      contrast(${this.filters.contrast}%)
      saturate(${this.filters.saturate}%)
      hue-rotate(${this.filters.hueRotate}deg)
      blur(${this.filters.blur}px)
      invert(${this.filters.invert}%)
      sepia(${this.filters.sepia}%)
    `.trim();

    this.video.style.filter = filterString;
  }

  setAspectRatio(ratio) {
    this.aspectRatio = ratio;
    if (!this.video) return;

    switch (ratio) {
      case '16:9':
        this.video.style.aspectRatio = '16 / 9';
        this.video.style.objectFit = 'fill';
        break;
      case '4:3':
        this.video.style.aspectRatio = '4 / 3';
        this.video.style.objectFit = 'fill';
        break;
      case '21:9':
        this.video.style.aspectRatio = '21 / 9';
        this.video.style.objectFit = 'fill';
        break;
      case 'fill':
        this.video.style.aspectRatio = 'unset';
        this.video.style.objectFit = 'cover';
        break;
      case 'default':
      default:
        this.video.style.aspectRatio = 'unset';
        this.video.style.objectFit = 'contain';
        break;
    }
  }

  stepFrame(forward = true, fps = 30) {
    if (!this.video) return;
    const step = 1 / fps;
    this.video.pause();
    this.video.currentTime = Math.max(0, this.video.currentTime + (forward ? step : -step));
  }

  takeSnapshot() {
    if (!this.video || !this.video.videoWidth) return null;

    const canvas = document.createElement('canvas');
    canvas.width = this.video.videoWidth;
    canvas.height = this.video.videoHeight;
    const ctx = canvas.getContext('2d');

    // Apply current video filter string to canvas context
    ctx.filter = this.video.style.filter || 'none';
    ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/png');
    const filename = `vlc_snapshot_${Math.floor(this.video.currentTime)}s.png`;

    // Trigger download
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();

    return { filename, dataUrl };
  }

  setABLoopPointA() {
    this.abLoop.pointA = this.video.currentTime;
    this.abLoop.enabled = false;
    return this.abLoop.pointA;
  }

  setABLoopPointB() {
    if (this.abLoop.pointA !== null) {
      this.abLoop.pointB = this.video.currentTime;
      this.abLoop.enabled = true;
      return this.abLoop.pointB;
    }
    return null;
  }

  clearABLoop() {
    this.abLoop = { pointA: null, pointB: null, enabled: false };
  }

  checkABLoop() {
    if (this.abLoop.enabled && this.abLoop.pointA !== null && this.abLoop.pointB !== null) {
      if (this.video.currentTime >= this.abLoop.pointB || this.video.currentTime < this.abLoop.pointA) {
        this.video.currentTime = this.abLoop.pointA;
      }
    }
  }
}

window.VLCVideoFX = VLCVideoFX;
