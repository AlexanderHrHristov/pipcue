# PiPCue

**Picture-in-Picture subtitles for better online learning.**

PiPCue is a browser extension designed primarily to solve a simple but frustrating problem: **subtitles disappearing when online course videos are moved into Picture-in-Picture mode.**
The project was originally built around the Udemy learning experience, allowing users to keep course subtitles visible while watching a lesson in a floating Picture-in-Picture window.
This makes it easier to watch a course while coding, taking notes, reading documentation, or working in another application.

---

## Why PiPCue?

Picture-in-Picture is extremely useful for online learning, but subtitle support is often limited.
A typical workflow might look like this:

1. Start a course video.
2. Enable subtitles.
3. Move the video into Picture-in-Picture.
4. Open an IDE, notes, documentation, or another application.
5. The subtitles disappear from the PiP window.

PiPCue was created to solve this problem.

### The goal

> Keep the video small. Keep the subtitles visible. Keep learning.

---

## Primary Use Case — Udemy

PiPCue was developed primarily for **Udemy courses with subtitles or closed captions**.
It is intended for learners who want to:

- watch programming courses while coding;
- follow technical tutorials while using another application;
- take notes without constantly switching windows;
- use subtitles while studying in a second language;
- keep a course visible while reading documentation;
- make better use of limited screen space.

PiPCue may also work with compatible video players on other websites.
Compatibility depends on how each website implements video playback and subtitles.

---

## Features

- Picture-in-Picture video playback
- Subtitle support inside the PiP experience
- Designed primarily for Udemy learning
- Works with additional compatible HTML5 video platforms
- Lightweight browser extension
- Simple user interface
- No user account required
- Local browser-based processing for core functionality
- No advertising
- No unnecessary tracking

---

## Supported Platforms

PiPCue has been tested with the following learning and video platforms:

| Platform | Picture-in-Picture | Subtitles |
| --- | --- | --- |
| Udemy | ✅ Supported | ✅ Supported |
| YouTube | ✅ Supported | ✅ Supported |
| LinkedIn Learning | ✅ Supported | ✅ Supported |
| Vimeo | ✅ Supported | ✅ Supported |
| Coursera | ⚠️ Limited support | ⚠️ Embedded player restrictions |
| edX | 🧪 Not yet tested | 🧪 Not yet tested |

Platform compatibility may change when websites update their video players.

## How to Use PiPCue

### 1. Open a supported video

Open a course lesson or compatible video in your browser.

### 2. Enable subtitles

Turn on subtitles or closed captions in the original video player.

### 3. Launch PiPCue

Open the PiPCue extension and activate Picture-in-Picture.

### 4. Continue working

Move to your IDE, notes, documentation, browser tab, or another application.
Your PiP video can remain visible together with its subtitles when supported.

---

## Supported Platforms

PiPCue is primarily developed and tested around:

- Udemy
- YouTube
- LinkedIn Learning
- Vimeo

Support for individual websites may change because video platforms can modify their players, subtitle systems, embedded frames, or security restrictions.

PiPCue does not guarantee compatibility with every website or video player.

---

## Installation

### Chrome Web Store

PiPCue is intended to be distributed through the Chrome Web Store.

**Chrome Web Store link:** Coming soon.

### Development Installation

To test the source version locally:

1. Clone or download this repository.
2. Open Google Chrome.
3. Navigate to `chrome://extensions/`.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the PiPCue project directory.
7. Open a supported video and enable subtitles.
8. Launch PiPCue.

---

## Project Structure

```text
pipcue/
│
├── manifest.json
├── content.js
├── popup.html
├── popup.css
│
├── icons/
│
├── docs/
│   ├── HELP.md
│   ├── PRIVACY.md
│   ├── EULA.md
│   └── THIRD_PARTY_NOTICES.txt
│
├── README.md
└── LICENSE
```

The exact structure may evolve as PiPCue develops.

---

## Privacy

PiPCue is designed to use only the browser access required for its user-facing functionality.
The extension does not require a PiPCue account.
PiPCue does not sell user data or use browsing activity for advertising.
For complete information about data handling and permissions, see:

**`docs/PRIVACY.md`**

---

## Permissions

Browser extensions sometimes require access to webpage elements in order to interact with video players and subtitles.
PiPCue's permissions are intended only to support its declared Picture-in-Picture and subtitle functionality.
Permissions are not intended for advertising, unrelated tracking, or user profiling.

---

## Limitations

PiPCue depends partly on the structure and behavior of third-party websites.
A platform update may therefore temporarily affect compatibility.
Some websites may also prevent Picture-in-Picture functionality through browser security restrictions, embedded frames, custom players, or unsupported subtitle implementations.

---

## Independent Project

PiPCue is an independent software project.
PiPCue is **not affiliated with, sponsored by, endorsed by, or officially associated with Udemy, YouTube, LinkedIn Learning, Vimeo, or their respective owners.**

All third-party product names, trademarks, and registered trademarks belong to their respective owners.

---

## Source Availability and License

PiPCue is **source-available software**.
The source code in this repository is publicly accessible for:

- transparency;
- evaluation;
- security review;
- educational inspection;
- and portfolio demonstration.

Public availability of the source code does **not** mean that PiPCue is released under an open-source license.
Unless explicitly permitted by the PiPCue Software License, you may not redistribute, republish, sell, sublicense, or commercially distribute PiPCue or modified versions of its source code.

See the **`LICENSE`** file for the complete terms.

---

## Contributing

PiPCue is currently maintained as an independently developed product rather than a community-governed open-source project.
Bug reports, compatibility reports, and feature suggestions are welcome.
Code contributions or redistribution rights are not automatically granted by the public availability of this repository.

---

## Reporting an Issue

When reporting a compatibility problem, please include:

- website/platform;
- browser version;
- whether subtitles were enabled;
- whether normal Picture-in-Picture worked;
- what PiPCue displayed;
- and the steps required to reproduce the issue.

Please do not include passwords, account credentials, private course materials, or other sensitive information.

---

## Documentation

Additional documentation is available in the `docs` directory:

- **HELP.md** — user guide and troubleshooting
- **PRIVACY.md** — privacy policy
- **EULA.md** — end-user license agreement
- **THIRD_PARTY_NOTICES.txt** — applicable third-party notices

---

## Roadmap

Potential future development areas include:

- broader compatibility with learning platforms;
- improved subtitle detection;
- additional subtitle customization;
- improved PiP controls;
- accessibility improvements;
- additional language support;
- enhanced compatibility handling.

Features listed here are potential development directions and are not commitments to specific future releases.

---

## About the Project

PiPCue started from a real usability problem encountered while using online courses: Picture-in-Picture is ideal for following a lesson while working, but losing the subtitles significantly reduces its usefulness.
Instead of treating PiP as only a video feature, PiPCue treats it as a **learning workspace feature**.

The project is developed and maintained by **Alexander Hristov**.

---

## Contact

For support, bug reports, licensing inquiries, or other questions:

**Email:** ahri.devbox@gmail.com

---

## License

Copyright © 2026 Alexander Hristov.
All rights reserved.
PiPCue is source-available proprietary software.

See the `LICENSE` file for full licensing terms.
