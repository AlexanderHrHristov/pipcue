(() => {
  'use strict';

  const BUTTON_ID = 'pipsub-pip-button';
  const STATUS_ID = 'pipsub-pip-status';
  const SUBTITLE_ID = 'pipsub-pip-subtitle';
  const HISTORY_ID = 'pipsub-caption-history';

  let pipWindow = null;
  let activeVideo = null;
  let originalParent = null;
  let originalNextSibling = null;
  let originalControls = false;
  let sourceVideoRect = null;
  let subtitleObserver = null;
  let subtitlePoller = null;
  let videoHandoffPoller = null;
  let keyboardHandler = null;
  let videoHandoffInProgress = false;
  let resumePlaybackOnRestore = false;
  let lastSubtitle = '';
  let captionHistory = [];
  let subtitleScale = 1;
  let subtitlePosition = 'bottom';

  const captionSelectors = [
    // YouTube
    '.ytp-caption-segment',
    // Udemy
    "[data-purpose='captions-cue-text']",
    "[data-purpose='caption-cue-text']",
    "[data-purpose*='caption'] [class*='cue']",
    // Common players: Video.js, Shaka, JW Player and Plyr
    '.vjs-text-track-display div',
    '.shaka-text-container span',
    '.jw-text-track-display',
    '.plyr__captions span',
    // Coursera and other React-based learning players
    "[data-testid*='caption']",
    "[data-e2e*='caption']",
    // Generic fallbacks
    "[class*='captions-display']",
    "[class*='caption-cue']",
    "[class*='subtitle']",
  ];

  function normalizeText(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function collectSearchRoots(root = document) {
    const roots = [root];

    for (let index = 0; index < roots.length; index += 1) {
      const currentRoot = roots[index];
      for (const element of currentRoot.querySelectorAll('*')) {
        if (element.shadowRoot) roots.push(element.shadowRoot);
      }
    }

    return roots;
  }

  function querySelectorAllDeep(selector) {
    return collectSearchRoots().flatMap((root) => [
      ...root.querySelectorAll(selector),
    ]);
  }

  function findBestVideo() {
    return (
      querySelectorAllDeep('video')
        .filter((video) => video.readyState > 0)
        .sort((a, b) => {
          const aArea =
            a.getBoundingClientRect().width * a.getBoundingClientRect().height;
          const bArea =
            b.getBoundingClientRect().width * b.getBoundingClientRect().height;
          return bArea - aArea;
        })[0] || null
    );
  }

  function readTextTrack(video) {
    if (!video?.textTracks) return '';

    for (const track of video.textTracks) {
      if (!track.activeCues?.length) continue;
      const text = [...track.activeCues].map((cue) => cue.text).join(' ');
      if (normalizeText(text)) return normalizeText(text);
    }

    return '';
  }

  function isLikelyCaptionElement(element, videoRect) {
    if (!(element instanceof HTMLElement)) return false;

    const text = normalizeText(element.innerText || element.textContent);
    if (!text || text.length > 500) return false;

    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;

    const overlapsVideo = !(
      rect.right < videoRect.left ||
      rect.left > videoRect.right ||
      rect.bottom < videoRect.top ||
      rect.top > videoRect.bottom
    );

    return overlapsVideo;
  }

  function readDomCaption(video) {
    const videoRect = sourceVideoRect || video.getBoundingClientRect();

    for (const selector of captionSelectors) {
      const matches = querySelectorAllDeep(selector).filter((element) =>
        isLikelyCaptionElement(element, videoRect)
      );

      if (matches.length) {
        const text = matches
          .map((element) =>
            normalizeText(element.innerText || element.textContent)
          )
          .filter(Boolean)
          .join(' ');

        if (text) return normalizeText(text);
      }
    }

    return '';
  }

  function readCurrentSubtitle() {
    if (!activeVideo) return '';
    return readTextTrack(activeVideo) || readDomCaption(activeVideo);
  }

  function updateSubtitle() {
    if (!pipWindow || pipWindow.closed) return;

    const text = readCurrentSubtitle();
    if (text === lastSubtitle) return;
    lastSubtitle = text;

    const subtitle = pipWindow.document.getElementById(SUBTITLE_ID);
    if (!subtitle) return;

    subtitle.textContent = text;
    subtitle.hidden = !text;

    if (text && captionHistory.at(-1)?.text !== text) {
      captionHistory.push({
        text,
        time: Math.max(0, (activeVideo.currentTime || 0) - 0.2),
      });
      captionHistory = captionHistory.slice(-5);
      renderCaptionHistory();
    }
  }

  function replayCaption(entry = captionHistory.at(-1)) {
    if (!activeVideo || !entry) return;
    activeVideo.currentTime = Math.max(0, entry.time - 0.25);
    activeVideo.play().catch(() => {});
  }

  function renderCaptionHistory() {
    if (!pipWindow || pipWindow.closed) return;
    const panel = pipWindow.document.getElementById(HISTORY_ID);
    if (!panel) return;

    panel.replaceChildren();
    [...captionHistory].reverse().forEach((entry, reverseIndex) => {
      const button = pipWindow.document.createElement('button');
      button.type = 'button';
      button.textContent = entry.text;
      button.title = 'Replay this caption';
      button.className = reverseIndex === 0 ? 'current' : '';
      button.addEventListener('click', () => replayCaption(entry));
      panel.appendChild(button);
    });
  }

  function setSubtitleScale(nextScale) {
    subtitleScale = Math.min(1.6, Math.max(0.7, nextScale));
    const subtitle = pipWindow?.document.getElementById(SUBTITLE_ID);
    if (!subtitle) return;
    subtitle.style.fontSize = `clamp(${14 * subtitleScale}px, ${3.2 * subtitleScale}vw, ${24 * subtitleScale}px)`;
  }

  function toggleSubtitlePosition() {
    subtitlePosition = subtitlePosition === 'bottom' ? 'top' : 'bottom';
    const subtitle = pipWindow?.document.getElementById(SUBTITLE_ID);
    const history = pipWindow?.document.getElementById(HISTORY_ID);
    if (!subtitle || !history) return;

    const atTop = subtitlePosition === 'top';
    subtitle.style.top = atTop ? '8%' : 'auto';
    subtitle.style.bottom = atTop ? 'auto' : '17%';
    history.style.top = atTop ? '20%' : 'auto';
    history.style.bottom = atTop ? 'auto' : '28%';
  }

  function startSubtitleSync() {
    stopSubtitleSync();

    subtitleObserver = new MutationObserver(updateSubtitle);
    subtitleObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    subtitlePoller = window.setInterval(updateSubtitle, 200);
    updateSubtitle();
  }

  function stopSubtitleSync() {
    subtitleObserver?.disconnect();
    subtitleObserver = null;

    if (subtitlePoller) window.clearInterval(subtitlePoller);
    subtitlePoller = null;
  }

  function addPipStyles(targetDocument) {
    const style = targetDocument.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; }
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: #000;
      }
      #pipsub-player {
        position: relative;
        width: 100%;
        height: 100%;
        display: grid;
        place-items: center;
        background: #000;
      }
      #pipsub-player video {
        width: 100% !important;
        height: 100% !important;
        max-width: none !important;
        max-height: none !important;
        object-fit: contain !important;
      }
      #${SUBTITLE_ID} {
        position: absolute;
        left: 4%;
        right: 4%;
        bottom: 17%;
        z-index: 2147483647;
        margin: 0 auto;
        padding: 0.12em 0.3em;
        width: fit-content;
        max-width: 92%;
        color: #fff;
        background: transparent;
        border-radius: 0;
        font: 700 clamp(14px, 3.2vw, 24px)/1.25 system-ui, sans-serif;
        text-align: center;
        -webkit-text-stroke: 0.45px rgba(0, 0, 0, 0.95);
        text-shadow:
          -1px -1px 2px #000,
           1px -1px 2px #000,
          -1px  1px 2px #000,
           1px  1px 2px #000,
           0 2px 4px #000;
        pointer-events: none;
      }
      #pipsub-controls {
        position: absolute;
        left: 50%;
        bottom: 34px;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        gap: 6px;
        max-width: calc(100% - 16px);
        padding: 6px 8px;
        white-space: nowrap;
        transform: translateX(-50%);
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 999px;
        background: rgba(15, 15, 18, 0.78);
        box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
        opacity: 0;
        transition: opacity 160ms ease;
      }

      #pipsub-timeline {
        position: absolute;
        left: 10px;
        right: 10px;
        top: calc(100% + 5px);
        display: grid;
        grid-template-columns: minmax(80px, 1fr) auto;
        align-items: center;
        gap: 8px;
      }
      #pipsub-progress {
        width: 100%;
        min-width: 0;
        height: 5px;
        margin: 0;
        border-radius: 999px;
        outline: none;
        background: linear-gradient(
          to right,
          #a435f0 0%,
          #a435f0 var(--pipsub-progress, 0%),
          rgba(255, 255, 255, 0.35) var(--pipsub-progress, 0%),
          rgba(255, 255, 255, 0.35) 100%
        );
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
      }
      #pipsub-time {
        min-width: max-content;
        color: rgba(255, 255, 255, 0.88);
        font: 600 11px/1 system-ui, sans-serif;
        white-space: nowrap;
      }
      #pipsub-progress::-webkit-slider-runnable-track {
        height: 5px;
        border-radius: 999px;
        background: transparent;
      }
      #pipsub-progress::-webkit-slider-thumb {
        width: 14px;
        height: 14px;
        margin-top: -4.5px;
        border: 2px solid #fff;
        border-radius: 50%;
        background: #a435f0;
        box-shadow: 0 1px 5px rgba(0, 0, 0, 0.55);
        cursor: grab;
        appearance: none;
        -webkit-appearance: none;
      }
      #pipsub-progress:active::-webkit-slider-thumb { cursor: grabbing; }
      #pipsub-progress:focus-visible {
        outline: 2px solid #fff;
        outline-offset: 3px;
      }
      #pipsub-player:hover #pipsub-controls,
      #pipsub-controls:focus-within {
        opacity: 1;
      }
      #pipsub-speed-control {
        position: relative;
        display: flex;
        align-items: center;
      }
      #pipsub-speed-panel {
        position: absolute;
        left: 50%;
        bottom: calc(100% + 16px);
        z-index: 2;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 12px;
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 18px;
        background: rgba(15, 15, 18, 0.94);
        box-shadow: 0 8px 28px rgba(0, 0, 0, 0.55);
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transform: translateX(-50%) translateY(8px) scale(0.92);
        transform-origin: bottom center;
        transition: opacity 160ms ease, transform 160ms ease, visibility 160ms ease;
      }
      #pipsub-speed-panel.open {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
        transform: translateX(-50%) translateY(0) scale(1);
      }
      #pipsub-speed-value {
        color: #fff;
        font: 700 13px/1 system-ui, sans-serif;
      }
      #pipsub-speed-knob {
        position: relative;
        width: 58px !important;
        min-width: 58px !important;
        height: 58px !important;
        padding: 0 !important;
        border: 2px solid rgba(255, 255, 255, 0.55) !important;
        border-radius: 50% !important;
        background: radial-gradient(circle at 35% 30%, #555, #242428 48%, #111 75%) !important;
        box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.25), 0 5px 14px rgba(0, 0, 0, 0.5);
        transform: rotate(var(--pipsub-speed-rotation, 0deg));
        transition: transform 100ms ease;
        touch-action: none;
        cursor: grab !important;
      }
      #pipsub-speed-knob::after {
        content: "";
        position: absolute;
        top: 7px;
        left: 50%;
        width: 3px;
        height: 14px;
        border-radius: 999px;
        background: #a435f0;
        box-shadow: 0 0 5px rgba(164, 53, 240, 0.8);
        transform: translateX(-50%);
      }
      #pipsub-speed-knob.dragging {
        cursor: grabbing !important;
        transition: none;
      }
      #pipsub-controls button {
        min-width: 34px;
        height: 30px;
        padding: 0 8px;
        border: 0;
        border-radius: 999px;
        color: #fff;
        background: transparent;
        font: 700 12px/1 system-ui, sans-serif;
        cursor: pointer;
      }
      #pipsub-controls button:hover {
        background: rgba(255, 255, 255, 0.18);
      }
      #pipsub-controls button:focus-visible {
        outline: 2px solid #a435f0;
        outline-offset: 1px;
      }
      #${HISTORY_ID} {
        position: absolute;
        left: 5%;
        right: 5%;
        bottom: 28%;
        z-index: 2147483646;
        display: none;
        flex-direction: column;
        gap: 4px;
        max-height: 48%;
        padding: 8px;
        overflow: auto;
        border-radius: 10px;
        background: rgba(12, 12, 16, 0.9);
        box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
      }
      #${HISTORY_ID}.open { display: flex; }
      #${HISTORY_ID} button {
        padding: 7px 9px;
        border: 0;
        border-radius: 7px;
        color: rgba(255, 255, 255, 0.72);
        background: transparent;
        font: 500 12px/1.3 system-ui, sans-serif;
        text-align: left;
        cursor: pointer;
      }
      #${HISTORY_ID} button:hover { background: rgba(255, 255, 255, 0.12); }
      #${HISTORY_ID} button.current {
        color: #fff;
        background: rgba(124, 58, 237, 0.45);
      }
      @media (max-width: 620px) {
        #pipsub-controls {
          gap: 3px;
          padding: 5px 6px;
        }
        #pipsub-controls .pipsub-optional-control {
          display: none;
        }
        #pipsub-controls button {
          min-width: 30px;
          padding: 0 6px;
        }
      }
      @media (max-width: 380px) {
        #pipsub-controls {
          bottom: 32px;
        }
        #pipsub-controls button {
          min-width: 27px;
          height: 28px;
          padding: 0 4px;
          font-size: 11px;
        }
        #pipsub-timeline {
          left: 6px;
          right: 6px;
          gap: 5px;
        }
        #pipsub-time {
          font-size: 10px;
        }
      }
      @media (max-height: 240px) {
        #pipsub-controls {
          bottom: 28px;
        }
        #pipsub-timeline {
          top: calc(100% + 3px);
        }
        #${SUBTITLE_ID} {
          bottom: 30%;
        }
      }
    `;
    targetDocument.head.appendChild(style);
  }

  function createControl(label, title, onClick) {
    const button = pipWindow.document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.title = title;
    button.setAttribute('aria-label', title);
    button.addEventListener('click', onClick);
    return button;
  }


  function formatVideoTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';

    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(
        remainingSeconds
      ).padStart(2, '0')}`;
    }

    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
  }


  function createControls(video) {
    const controls = pipWindow.document.createElement('div');
    controls.id = 'pipsub-controls';

    const timeline = pipWindow.document.createElement("div");
    timeline.id = "pipsub-timeline";

    const timeDisplay = pipWindow.document.createElement("span");
    timeDisplay.id = "pipsub-time";
    timeDisplay.textContent = "0:00 / 0:00";

    const progress = pipWindow.document.createElement('input');
    progress.id = 'pipsub-progress';
    progress.type = 'range';
    progress.min = '0';
    progress.max = '1000';
    progress.step = '1';
    progress.value = '0';
    progress.title = 'Video progress';
    progress.setAttribute('aria-label', 'Video progress');

    timeline.append(progress, timeDisplay);

    const updateProgress = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const currentTime = Number.isFinite(video.currentTime)
        ? video.currentTime
        : 0;
      const ratio = duration > 0 ? currentTime / duration : 0;
      const value = Math.max(0, Math.min(1000, Math.round(ratio * 1000)));
      progress.value = String(value);
      progress.style.setProperty('--pipsub-progress', `${value / 10}%`);
      progress.disabled = duration <= 0;
      timeDisplay.textContent = `${formatVideoTime(currentTime)} / ${formatVideoTime(duration)}`;
    };

    progress.addEventListener('input', () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      video.currentTime = (Number(progress.value) / 1000) * video.duration;
      progress.style.setProperty(
        '--pipsub-progress',
        `${Number(progress.value) / 10}%`
      );
    });

    const backButton = createControl('−10', 'Back 10 seconds', () => {
      video.currentTime = Math.max(0, video.currentTime - 10);
    });

    const playButton = createControl(
      video.paused ? '▶' : '❚❚',
      'Play or pause',
      () => {
        if (video.paused) video.play();
        else video.pause();
      }
    );

    const forwardButton = createControl('+10', 'Forward 10 seconds', () => {
      video.currentTime = Math.min(
        video.duration || Infinity,
        video.currentTime + 10
      );
    });

    const replayButton = createControl(
      '↶ CC',
      'Replay current caption (R)',
      () => {
        replayCaption();
      }
    );

    const historyButton = createControl('CC ≡', 'Show recent captions', () => {
      const history = pipWindow.document.getElementById(HISTORY_ID);
      history?.classList.toggle('open');
      renderCaptionHistory();
    });

    const muteButton = createControl(
      video.muted ? 'Unmute' : 'Mute',
      'Mute or unmute',
      () => {
        video.muted = !video.muted;
      }
    );

    const minSpeed = 0.5;
    const maxSpeed = 3;
    const speedStep = 0.1;

    const speedControl = pipWindow.document.createElement('div');
    speedControl.id = 'pipsub-speed-control';

    const speedPanel = pipWindow.document.createElement('div');
    speedPanel.id = 'pipsub-speed-panel';

    const speedValue = pipWindow.document.createElement('span');
    speedValue.id = 'pipsub-speed-value';

    const speedKnob = pipWindow.document.createElement('button');
    speedKnob.id = 'pipsub-speed-knob';
    speedKnob.type = 'button';
    speedKnob.title = 'Drag or scroll to change playback speed';
    speedKnob.setAttribute(
      'aria-label',
      'Playback speed. Drag vertically or use arrow keys.'
    );

    const setPlaybackSpeed = (nextSpeed) => {
      const limitedSpeed = Math.min(maxSpeed, Math.max(minSpeed, nextSpeed));
      video.playbackRate = Math.round(limitedSpeed * 10) / 10;
    };

    let speedButton;
    const updateSpeedControl = () => {
      const currentSpeed = Math.round(video.playbackRate * 10) / 10;
      const progressRatio = (currentSpeed - minSpeed) / (maxSpeed - minSpeed);
      const rotation = -135 + progressRatio * 270;
      speedKnob.style.setProperty('--pipsub-speed-rotation', `${rotation}deg`);
      speedValue.textContent = `${currentSpeed.toFixed(1)}×`;
      if (speedButton) speedButton.textContent = `${currentSpeed.toFixed(1)}×`;
    };

    speedButton = createControl(
      `${video.playbackRate.toFixed(1)}×`,
      'Adjust playback speed',
      () => {
        const isOpen = speedPanel.classList.toggle('open');
        speedButton.setAttribute('aria-expanded', String(isOpen));
        if (isOpen) speedKnob.focus();
      }
    );
    speedButton.setAttribute('aria-expanded', 'false');

    speedPanel.append(speedValue, speedKnob);
    speedControl.append(speedButton, speedPanel);

    speedKnob.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        const direction = event.deltaY < 0 ? 1 : -1;
        setPlaybackSpeed(video.playbackRate + direction * speedStep);
      },
      { passive: false }
    );

    let dragStartY = 0;
    let dragStartSpeed = 1;
    speedKnob.addEventListener('pointerdown', (event) => {
      dragStartY = event.clientY;
      dragStartSpeed = video.playbackRate;
      speedKnob.setPointerCapture(event.pointerId);
      speedKnob.classList.add('dragging');
    });
    speedKnob.addEventListener('pointermove', (event) => {
      if (!speedKnob.hasPointerCapture(event.pointerId)) return;
      const steps = Math.round((dragStartY - event.clientY) / 12);
      setPlaybackSpeed(dragStartSpeed + steps * speedStep);
    });
    const finishSpeedDrag = (event) => {
      if (speedKnob.hasPointerCapture(event.pointerId)) {
        speedKnob.releasePointerCapture(event.pointerId);
      }
      speedKnob.classList.remove('dragging');
    };
    speedKnob.addEventListener('pointerup', finishSpeedDrag);
    speedKnob.addEventListener('pointercancel', finishSpeedDrag);

    speedKnob.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
        event.preventDefault();
        setPlaybackSpeed(video.playbackRate + speedStep);
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
        event.preventDefault();
        setPlaybackSpeed(video.playbackRate - speedStep);
      } else if (event.key === 'Escape') {
        speedPanel.classList.remove('open');
        speedButton.setAttribute('aria-expanded', 'false');
        speedButton.focus();
      }
    });

    pipWindow.document.addEventListener('pointerdown', (event) => {
      if (!speedControl.contains(event.target)) {
        speedPanel.classList.remove('open');
        speedButton.setAttribute('aria-expanded', 'false');
      }
    });

    const smallerButton = createControl('A−', 'Smaller subtitles', () => {
      setSubtitleScale(subtitleScale - 0.1);
    });

    const largerButton = createControl('A+', 'Larger subtitles', () => {
      setSubtitleScale(subtitleScale + 0.1);
    });

    const positionButton = createControl(
      '↕',
      'Move subtitles to top or bottom',
      () => {
        toggleSubtitlePosition();
      }
    );


    // Допълнителни контроли, които се скриват при тесен PiP прозорец
    replayButton.classList.add("pipsub-optional-control");
    historyButton.classList.add("pipsub-optional-control");
    speedControl.classList.add("pipsub-optional-control");
    smallerButton.classList.add("pipsub-optional-control");
    largerButton.classList.add("pipsub-optional-control");
    positionButton.classList.add("pipsub-optional-control");

    const closeButton = createControl('×', 'Close Picture-in-Picture', () => {
      resumePlaybackOnRestore =
        Boolean(activeVideo) && !activeVideo.paused && !activeVideo.ended;
      pipWindow.close();
    });

    video.addEventListener('play', () => {
      playButton.textContent = '❚❚';
    });
    video.addEventListener('pause', () => {
      playButton.textContent = '▶';
    });
    video.addEventListener('volumechange', () => {
      muteButton.textContent = video.muted ? 'Unmute' : 'Mute';
    });
    video.addEventListener('ratechange', updateSpeedControl);
    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('durationchange', updateProgress);
    video.addEventListener('loadedmetadata', updateProgress);

    controls.append(
      timeline,
      backButton,
      playButton,
      forwardButton,
      replayButton,
      historyButton,
      muteButton,
      speedControl,
      smallerButton,
      largerButton,
      positionButton,
      closeButton
    );
    updateProgress();
    updateSpeedControl();
    return controls;
  }

  function addKeyboardShortcuts() {
    if (keyboardHandler && pipWindow) {
      pipWindow.removeEventListener('keydown', keyboardHandler);
    }

    keyboardHandler = (event) => {
      if (event.target?.tagName === 'BUTTON') return;

      const video = activeVideo;
      if (!video) return;

      if (event.code === 'Space') {
        event.preventDefault();
        if (video.paused) video.play();
        else video.pause();
      } else if (event.key === 'ArrowLeft') {
        video.currentTime = Math.max(0, video.currentTime - 10);
      } else if (event.key === 'ArrowRight') {
        video.currentTime = Math.min(
          video.duration || Infinity,
          video.currentTime + 10
        );
      } else if (event.key.toLowerCase() === 'r') {
        replayCaption();
      } else if (event.key.toLowerCase() === 'c') {
        const subtitle = pipWindow.document.getElementById(SUBTITLE_ID);
        if (subtitle)
          subtitle.style.visibility =
            subtitle.style.visibility === 'hidden' ? 'visible' : 'hidden';
      }
    };

    pipWindow.addEventListener('keydown', keyboardHandler);
  }

  function restoreVideoElement(video, parent, nextSibling, controls) {
    if (!video || !parent) return;

    video.controls = controls;
    if (nextSibling?.parentNode === parent) {
      parent.insertBefore(video, nextSibling);
    } else {
      parent.appendChild(video);
    }
  }

  function switchToReplacementVideo(replacementVideo) {
    if (
      videoHandoffInProgress ||
      !replacementVideo ||
      replacementVideo === activeVideo ||
      !pipWindow ||
      pipWindow.closed
    ) {
      return;
    }

    videoHandoffInProgress = true;

    try {
      const player = pipWindow.document.getElementById('pipsub-player');
      const subtitle = pipWindow.document.getElementById(SUBTITLE_ID);
      const oldControls = pipWindow.document.getElementById('pipsub-controls');
      if (!player || !subtitle) return;

      const previousMuted = activeVideo?.muted ?? false;
      const previousVolume = activeVideo?.volume ?? 1;
      const previousPlaybackRate = activeVideo?.playbackRate ?? 1;

      restoreVideoElement(
        activeVideo,
        originalParent,
        originalNextSibling,
        originalControls
      );

      activeVideo = replacementVideo;
      sourceVideoRect = replacementVideo.getBoundingClientRect();
      originalParent = replacementVideo.parentNode;
      originalNextSibling = replacementVideo.nextSibling;
      originalControls = replacementVideo.controls;

      replacementVideo.controls = false;
      replacementVideo.volume = previousVolume;
      replacementVideo.muted = previousMuted;
      replacementVideo.playbackRate = previousPlaybackRate;
      player.insertBefore(replacementVideo, subtitle);

      replacementVideo.play().catch((error) => {
        console.warn(
          'pipsub: The next video could not start automatically.',
          error
        );
      });

      window.setTimeout(() => {
        if (replacementVideo !== activeVideo) return;
        replacementVideo.volume = previousVolume;
        replacementVideo.muted = previousMuted;
      }, 300);

      oldControls?.remove();
      player.appendChild(createControls(replacementVideo));

      lastSubtitle = '';
      captionHistory = [];
      renderCaptionHistory();
      addKeyboardShortcuts();
      updateSubtitle();
    } finally {
      videoHandoffInProgress = false;
    }
  }

  function checkForReplacementVideo() {
    if (!activeVideo || !pipWindow || pipWindow.closed) return;

    const duration = Number.isFinite(activeVideo.duration)
      ? activeVideo.duration
      : 0;
    const reachedEnd =
      activeVideo.ended ||
      (duration > 0 && activeVideo.currentTime >= duration - 0.25);

    if (!reachedEnd && activeVideo.readyState > 0) return;

    const replacementVideo = findBestVideo();
    if (!replacementVideo || replacementVideo === activeVideo) return;

    const replacementIsActive =
      !replacementVideo.paused ||
      replacementVideo.currentTime > 0 ||
      replacementVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;

    if (replacementIsActive) {
      switchToReplacementVideo(replacementVideo);
    }
  }

  function startVideoHandoffMonitor() {
    stopVideoHandoffMonitor();
    videoHandoffPoller = window.setInterval(checkForReplacementVideo, 500);
  }

  function stopVideoHandoffMonitor() {
    if (videoHandoffPoller) window.clearInterval(videoHandoffPoller);
    videoHandoffPoller = null;
  }

  function restoreVideo() {
    stopSubtitleSync();
    stopVideoHandoffMonitor();

    const videoToRestore = activeVideo;
    const shouldResume =
      resumePlaybackOnRestore ||
      Boolean(
        videoToRestore && !videoToRestore.paused && !videoToRestore.ended
      );

    if (keyboardHandler && pipWindow) {
      pipWindow.removeEventListener('keydown', keyboardHandler);
    }
    keyboardHandler = null;

    restoreVideoElement(
      videoToRestore,
      originalParent,
      originalNextSibling,
      originalControls
    );

    if (shouldResume && videoToRestore) {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          videoToRestore.play().catch((error) => {
            console.warn(
              'pipsub: Video could not resume after closing PiP.',
              error
            );
          });
        });
      });
    }

    pipWindow = null;
    activeVideo = null;
    originalParent = null;
    originalNextSibling = null;
    originalControls = false;
    sourceVideoRect = null;
    lastSubtitle = '';
    captionHistory = [];
    subtitleScale = 1;
    subtitlePosition = 'bottom';
    videoHandoffInProgress = false;
    resumePlaybackOnRestore = false;
  }

  async function openCaptionPip() {
    if (!('documentPictureInPicture' in window)) {
      showStatus(
        'Document Picture-in-Picture is not supported by this Chrome version.'
      );
      return;
    }

    const video = findBestVideo();
    if (!video) {
      showStatus('Start a video first, then try again.');
      return;
    }

    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    }

    activeVideo = video;
    sourceVideoRect = video.getBoundingClientRect();
    originalParent = video.parentNode;
    originalNextSibling = video.nextSibling;
    originalControls = video.controls;

    try {
      pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 640,
        height: 360,
      });

      addPipStyles(pipWindow.document);

      const player = pipWindow.document.createElement('div');
      player.id = 'pipsub-player';

      const subtitle = pipWindow.document.createElement('div');
      subtitle.id = SUBTITLE_ID;
      subtitle.hidden = true;

      const history = pipWindow.document.createElement('div');
      history.id = HISTORY_ID;

      video.controls = false;
      const controls = createControls(video);
      player.append(video, subtitle, history, controls);
      pipWindow.document.body.appendChild(player);

      pipWindow.addEventListener('pagehide', restoreVideo, { once: true });
      addKeyboardShortcuts();
      startSubtitleSync();
      startVideoHandoffMonitor();
    } catch (error) {
      console.error('pipsub:', error);
      const errorName = error?.name || 'PiP error';
      const errorMessage = error?.message || 'Unknown browser error';
      const frameContext =
        window.top === window ? 'top page' : 'embedded frame';
      restoreVideo();
      showStatus(`${errorName}: ${errorMessage} (${frameContext})`);
    }
  }

  function showStatus(message) {
    document.getElementById(STATUS_ID)?.remove();

    const status = document.createElement('div');
    status.id = STATUS_ID;
    status.textContent = message;
    document.body.appendChild(status);

    window.setTimeout(() => status.remove(), 4500);
  }

  function injectButton() {
    if (document.getElementById(BUTTON_ID)) return;
    if (!findBestVideo()) return;

    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.title = 'Open Picture-in-Picture with subtitles';
    button.setAttribute('aria-label', 'Open Picture-in-Picture with subtitles');
    button.innerHTML = `<span aria-hidden="true">▣</span><span>PiP + CC</span>`;
    button.addEventListener('click', openCaptionPip);
    document.body.appendChild(button);
  }

  injectButton();

  const pageObserver = new MutationObserver(injectButton);
  pageObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
