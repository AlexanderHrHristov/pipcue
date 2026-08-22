# PiPCue – Picture-in-Picture Subtitles for Udemy

PiPCue is a privacy-friendly Chrome extension built primarily for Udemy learners who want synchronized subtitles inside a Picture-in-Picture window.

Udemy subtitles normally remain inside the course page and may disappear when the video is moved to Picture-in-Picture mode. PiPCue solves this problem by displaying the current subtitles directly inside its own PiP player.

## Why PiPCue?

PiPCue was created to solve a real learning problem:

> Watching an Udemy course in Picture-in-Picture while coding or taking notes, without losing the subtitles.

It is especially useful for:

- developers coding along with Udemy courses;
- learners using a single monitor;
- non-native English speakers;
- students taking notes while watching;
- anyone who needs subtitles to remain visible in PiP mode.

## Main Features

- Synchronized Udemy subtitles inside Picture-in-Picture
- Automatic transition to the next Udemy lecture
- Responsive playback controls
- Video progress bar with current and total time
- Play and pause controls
- Skip backward or forward by 10 seconds
- Mute and unmute
- Adjustable playback speed in 0.1 increments
- Adjustable subtitle size and position
- Replay the current caption
- Recent caption history
- Resume playback after closing the PiP window

## Additional Website Support

PiPCue is designed primarily for Udemy, but it also supports:

- YouTube
- LinkedIn Learning
- Vimeo
- selected edX video players

Website support may vary depending on the video player and caption implementation used by each platform.

## Privacy

PiPCue:

- does not collect personal information;
- does not track browsing activity;
- does not transmit subtitles or video content;
- does not use analytics;
- does not contain advertisements;
- does not use remote code.

All video and subtitle processing happens locally in the browser.

## How to Use

1. Open an Udemy course lecture.
2. Start the video.
3. Enable subtitles in the Udemy player.
4. Click the **PiP + CC** button.
5. Continue learning with synchronized subtitles inside the PiP window.

## Installation

### Chrome Web Store

Install PiPCue from the Chrome Web Store:

**Chrome Web Store link coming soon.**

### Manual Installation

1. Download or clone this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the folder containing `manifest.json`.

## Project Background

PiPCue started as a personal solution to a practical problem: existing Picture-in-Picture tools did not reliably display Udemy subtitles inside the floating player.

The project grew into a complete browser extension with custom controls, responsive layout, caption history, playback speed adjustment and automatic lecture handoff.

## Technology

PiPCue is built with:

- JavaScript
- HTML
- CSS
- Chrome Extensions Manifest V3
- Document Picture-in-Picture API
- MutationObserver
- HTMLMediaElement API

## Disclaimer

PiPCue is an independent project and is not affiliated with, endorsed by or sponsored by Udemy, YouTube, LinkedIn, Vimeo or edX.

All trademarks belong to their respective owners.

## License

See the [LICENSE](LICENSE) file for licensing terms.