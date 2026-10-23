# PAV — Play Any Video

<p align="center">
  <img src="logo.svg" alt="PAV Logo" width="160" height="160" />
  <br>
  <b>Play Any Video. Any Codec. Modern Interface.</b>
</p>

> **PAV (Play Any Video)** is a complete conceptual overhaul of VLC Media Player, inspired by UX/UI designer **Juxtopposed’s** *["I Redesigned VLC After 25 Years"](https://www.youtube.com/watch?v=ERFeOgqk324)*.

---

## 🌟 Why PAV?

While celebrating the ability to play almost any codec across every platform, decades of feature additions and redundant dialogs have made legacy media player interfaces notoriously cluttered. **PAV** redesigns the media player from the ground up:

- **Minimalist P-Play Visual Identity**: A sleek matte dark slate tile (`#141721` to `#0B0D13`) featuring an electric cyan to indigo playmark (`#00F0FF` → `#7000FF`).
- **Utilitarian Softened Rectangles**: Clean precision-radiused geometry rather than generic pill-shaped streaming bubbles.
- **Left-Aligned Playback Cluster**: Play/Pause, ±10s jumps, Prev/Next, Stop, Loop, Shuffle, and A-B Loop all grouped on the left for intuitive control and content visibility.
- **Thick Scrubbing Seek Bar**: Audio waveform peak visualizer, live hover timecode preview, and dynamic A-B repeat markers.
- **Stylized Volume Meter (Up to 200%)**: Stepped volume slider capable of legendary **200% overdrive boost**.
- **Interactive Visual Subtitle & Audio Sync Timeline**: Drag subtitle blocks directly on an interactive timeline instead of typing obscure millisecond numbers.
- **In-Player Slide-Out Library**: Collapsible queue and media collection drawer that doesn't interrupt video playback.
- **Interactive Toolbar Layout Customizer**: Switch between *Standard*, *Minimalist*, and *Pro Editor* toolbar layouts, or toggle individual widgets.
- **10-Band Graphic Equalizer & Live Video Effects**: Hardware-accelerated CSS filters (brightness, contrast, saturation, hue, blur) and Web Audio API equalizer with 8 genre presets.

---

## 🚀 Quick Start

Run natively in any modern web browser or as a standalone Windows desktop application.

### Option 1: Standalone Windows Desktop App
- **Downloadable Release**: Grab the pre-built standalone zip from the [GitHub Releases](https://github.com/Tushar-KG/PAV/releases) page.
- **Direct Launcher**: Run `PAV.bat` or `npm start` after cloning.
- **Build from Source**:
  ```bash
  npm install
  npm run build:exe
  ```

### Option 2: Run with Python HTTP Server
```bash
# Clone this repository
git clone https://github.com/Tushar-KG/PAV.git
cd PAV

# Launch local server
python -m http.server 8080
```
Open **[http://localhost:8080](http://localhost:8080)** in your browser (Firefox, Chrome, Edge).

### Option 3: Open Directly in Browser
Simply double-click `index.html` to open it directly in Firefox or any modern web browser.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Space` or `K` | Play / Pause |
| `F` | Toggle Fullscreen |
| `M` | Toggle Mute |
| `←` / `→` | Seek -10s / +10s (Shift for ±5s) |
| `↑` / `↓` | Volume Up / Down (+5% / -5% up to 200%) |
| `G` / `H` | Subtitle Delay -50ms / +50ms |
| `N` / `P` | Next / Previous Track |
| `S` | Take Frame Snapshot (Full-res PNG) |
| `E` | Frame-by-frame Step Forward |
| `L` | Toggle Loop Mode (Off / All / One) |
| `R` | Toggle Shuffle Mode |
| `Ctrl + E` | Open 10-Band Graphic Equalizer & Video Filters |
| `Ctrl + T` | Open Visual Subtitle & Audio Sync Timeline |
| `Ctrl + P` | Open Preferences & Settings (10 Structured Categories) |
| `Ctrl + B` | Open Batch Subtitle Matcher |
| `Escape` | Close any open modal or sidebar |

---

## 📁 Project Architecture

```
pav/
├── index.html            # Semantic HTML5 architecture & UI modals
├── favicon.jpg           # High-resolution modern 3D traffic cone icon
├── css/
│   ├── variables.css     # Design tokens, VLC orange accents, colors & radiuses
│   ├── base.css          # Typography (Outfit, Inter, JetBrains Mono) & reset
│   ├── player.css        # Viewport, custom subtitle overlay, OSD & music mode
│   ├── controls.css      # Left-aligned controls, waveform seekbar, cone slider
│   ├── modals.css        # Visual sync timeline, equalizer, settings & toolbar
│   └── library.css       # In-player slide-out library & active queue drawer
└── js/
    ├── audio-engine.js   # Web Audio API graph (10-band EQ, 200% overdrive gain)
    ├── video-fx.js       # Live video filters, A-B repeat loop, frame snapshot
    ├── subtitles.js      # SRT/VTT parser, millisecond offset, per-series presets
    ├── queue.js          # Active queue vs. saved library separation
    ├── player.js         # Core player state, hotkeys, auto-hiding chrome
    ├── ui.js             # Modals, popovers, drag-and-drop toolbar builder
    └── app.js            # App orchestrator & event initialization
```

---

## 📄 License

Open-source project inspired by the VideoLAN VLC Media Player concept redesign. Codecs and media playback provided under MIT License.
