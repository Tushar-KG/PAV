/* VLC Plus - Web Audio Engine
 * Provides 10-Band Graphic Equalizer, 200% Volume Overdrive, and Real-Time Spectrum Visualizer
 */

class VLCAudioEngine {
  constructor(mediaElement) {
    this.mediaElement = mediaElement;
    this.audioCtx = null;
    this.sourceNode = null;
    this.preampNode = null;
    this.volumeNode = null;
    this.analyserNode = null;
    this.equalizerBands = [];
    this.initialized = false;
    this.volumeRatio = 1.0; // 1.0 = 100%, 2.0 = 200%

    this.bandFrequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

    this.presets = {
      'flat': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      'rock': [4.5, 3.0, 1.5, 0, -1.0, -0.5, 1.5, 3.0, 4.0, 5.0],
      'techno': [5.0, 4.0, 2.0, 0, -2.0, 0, 2.0, 4.0, 5.0, 4.5],
      'bass-boost': [7.0, 6.0, 5.0, 3.0, 1.0, 0, 0, 0, 0, 0],
      'club': [0, 0, 2.0, 3.5, 3.5, 3.5, 2.0, 0, 0, 0],
      'pop': [-1.5, -1.0, 1.5, 3.5, 4.0, 3.0, 0.5, -1.0, -1.5, -1.5],
      'vocal': [-2.0, -3.0, -1.0, 2.5, 4.5, 4.5, 3.0, 1.0, -1.0, -2.0],
      'classical': [4.0, 3.0, 2.5, 2.0, -1.5, -1.5, 0, 2.0, 3.0, 3.5]
    };
  }

  init() {
    if (this.initialized) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();

      // Create nodes
      this.sourceNode = this.audioCtx.createMediaElementSource(this.mediaElement);
      this.preampNode = this.audioCtx.createGain();
      this.volumeNode = this.audioCtx.createGain();
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 128;

      // Create 10 Equalizer BiquadFilterNodes
      let prevNode = this.sourceNode;

      // Preamp first
      prevNode.connect(this.preampNode);
      prevNode = this.preampNode;

      this.equalizerBands = this.bandFrequencies.map((freq, index) => {
        const filter = this.audioCtx.createBiquadFilter();
        if (index === 0) {
          filter.type = 'lowshelf';
        } else if (index === this.bandFrequencies.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
          filter.Q.value = 1.4;
        }
        filter.frequency.value = freq;
        filter.gain.value = 0;

        prevNode.connect(filter);
        prevNode = filter;
        return filter;
      });

      // Connect to Volume Gain Node (handles up to 200% overdrive)
      prevNode.connect(this.volumeNode);
      this.volumeNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioCtx.destination);

      this.initialized = true;
      this.setVolume(this.volumeRatio);
    } catch (e) {
      console.warn('AudioContext initialization deferred until user interaction or cross-origin policy:', e);
    }
  }

  ensureContext() {
    if (!this.initialized) {
      this.init();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  setVolume(ratio) {
    this.volumeRatio = Math.max(0, Math.min(2.0, ratio)); // 0% to 200%
    if (this.volumeNode && this.audioCtx) {
      // Scale gain linearly: 1.0 = standard, 2.0 = double gain (overdrive)
      this.volumeNode.gain.setValueAtTime(this.volumeRatio, this.audioCtx.currentTime);
      // Native element stays at min(1, ratio) for basic safety
      this.mediaElement.volume = Math.min(1.0, this.volumeRatio);
    } else {
      this.mediaElement.volume = Math.min(1.0, this.volumeRatio);
    }
  }

  setPreamp(gainDb) {
    if (!this.preampNode || !this.audioCtx) return;
    // convert dB to linear gain: 10^(dB/20)
    const linearGain = Math.pow(10, gainDb / 20);
    this.preampNode.gain.setValueAtTime(linearGain, this.audioCtx.currentTime);
  }

  setBandGain(bandIndex, gainDb) {
    if (this.equalizerBands[bandIndex] && this.audioCtx) {
      this.equalizerBands[bandIndex].gain.setValueAtTime(gainDb, this.audioCtx.currentTime);
    }
  }

  applyPreset(presetName) {
    const values = this.presets[presetName];
    if (!values) return;
    values.forEach((gain, index) => {
      this.setBandGain(index, gain);
    });
    return values;
  }

  getFrequencyData() {
    if (!this.analyserNode) return null;
    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyserNode.getByteFrequencyData(dataArray);
    return dataArray;
  }
}

window.VLCAudioEngine = VLCAudioEngine;
