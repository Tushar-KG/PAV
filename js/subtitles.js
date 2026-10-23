/* VLC Plus - Subtitle Management & Visual Sync Timeline Engine
 * Implements SRT/VTT parsing, millisecond offset synchronization,
 * per-title preset persistence, and custom styled rendering.
 */

class VLCSubtitleEngine {
  constructor(player) {
    this.player = player;
    this.mediaElement = player.video;
    this.overlayElement = document.getElementById('subtitle-text');
    this.cues = [];
    this.syncOffsetMs = 0; // Negative = earlier, Positive = later
    this.activeCue = null;
    this.currentTrackName = 'Off';
    this.presets = this.loadPresets();
    this.currentMediaId = 'default';

    // Appearance settings
    this.settings = {
      fontSize: 24,
      textColor: '#FFFFFF',
      bgColor: 'rgba(0, 0, 0, 0.6)',
      outline: true
    };
  }

  loadPresets() {
    try {
      const data = localStorage.getItem('vlc_subtitle_presets');
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  savePresets() {
    try {
      localStorage.setItem('vlc_subtitle_presets', JSON.stringify(this.presets));
    } catch (e) {}
  }

  setMediaId(id) {
    this.currentMediaId = id;
    if (this.presets[id]) {
      this.syncOffsetMs = this.presets[id].syncOffsetMs || 0;
      if (this.presets[id].settings) {
        this.settings = { ...this.settings, ...this.presets[id].settings };
      }
      this.applySettingsToDOM();
    } else {
      this.syncOffsetMs = 0;
    }
  }

  saveCurrentPreset(persist = true) {
    if (persist && this.currentMediaId) {
      this.presets[this.currentMediaId] = {
        syncOffsetMs: this.syncOffsetMs,
        settings: { ...this.settings }
      };
      this.savePresets();
    }
  }

  parseSRTorVTT(text) {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const cues = [];
    let i = 0;

    // Check if WEBVTT header exists
    if (lines[0] && lines[0].includes('WEBVTT')) {
      i = 1;
    }

    const timeRegex = /(?:(\d{1,2}):)?(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(?:(\d{1,2}):)?(\d{2}):(\d{2})[,.](\d{3})/;

    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line) {
        i++;
        continue;
      }

      // Check for timestamp line
      const match = line.match(timeRegex);
      if (match) {
        const startSec = this.timeToSeconds(match[1], match[2], match[3], match[4]);
        const endSec = this.timeToSeconds(match[5], match[6], match[7], match[8]);

        i++;
        const textLines = [];
        while (i < lines.length && lines[i].trim() !== '') {
          textLines.push(lines[i].trim());
          i++;
        }

        cues.push({
          start: startSec,
          end: endSec,
          text: textLines.join('\n')
        });
      } else {
        i++;
      }
    }

    return cues;
  }

  timeToSeconds(h, m, s, ms) {
    const hours = h ? parseInt(h, 10) : 0;
    const minutes = parseInt(m, 10);
    const seconds = parseInt(s, 10);
    const milliseconds = parseInt(ms, 10);
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
  }

  loadSubtitlesFromText(text, trackName = 'Custom Track') {
    this.cues = this.parseSRTorVTT(text);
    this.currentTrackName = trackName;
    return this.cues.length;
  }

  loadSampleSubtitles() {
    const sampleVTT = `
1
00:00:01.000 --> 00:00:04.500
Welcome to VLC Plus: The Modern Media Player.

2
00:00:05.000 --> 00:00:09.000
Featuring Juxtopposed's intuitive left-aligned controls.

3
00:00:09.500 --> 00:00:14.000
Thick scrubbing seek bar with instant hover preview.

4
00:00:14.500 --> 00:00:19.000
And interactive visual subtitle timeline synchronization!
`;
    return this.loadSubtitlesFromText(sampleVTT, 'English [Sample]');
  }

  update(currentTimeSec) {
    if (!this.overlayElement || this.cues.length === 0) {
      if (this.overlayElement) this.overlayElement.textContent = '';
      return;
    }

    // Apply sync offset in seconds
    const adjustedTime = currentTimeSec - (this.syncOffsetMs / 1000);

    const activeCue = this.cues.find(c => adjustedTime >= c.start && adjustedTime <= c.end);
    if (activeCue) {
      this.overlayElement.textContent = activeCue.text;
    } else {
      this.overlayElement.textContent = '';
    }
  }

  setSyncOffset(offsetMs) {
    this.syncOffsetMs = offsetMs;
    // Notify visual sync UI if open
    if (this.onSyncChange) {
      this.onSyncChange(this.syncOffsetMs);
    }
  }

  nudgeSyncOffset(deltaMs) {
    this.setSyncOffset(this.syncOffsetMs + deltaMs);
    return this.syncOffsetMs;
  }

  applySettingsToDOM() {
    if (!this.overlayElement) return;
    this.overlayElement.style.fontSize = `${this.settings.fontSize}px`;
    this.overlayElement.style.color = this.settings.textColor;
    this.overlayElement.style.backgroundColor = this.settings.bgColor;
  }
}

window.VLCSubtitleEngine = VLCSubtitleEngine;
