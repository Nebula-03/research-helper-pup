import type {
  CaptureSelectionMessage,
  CheckRequest,
  CheckResponse,
  DeleteNoteMessage,
  GetNotesMessage,
  NotesResponse,
  ResearchNote,
  StoreNoteMessage,
  Verdict,
} from "../shared/messages";
import { readResearchPage } from "./research";

// ── Constants ────────────────────────────────────────────────────────────────
const HOVER_DELAY_MS = 400;
const MSG_APPEAR_DELAY_MS = 8000;    // message appears after 8 seconds
const MSG_SAFE_UPGRADE_MS = 8000;    // follow-up is timed from hover start
const MSG_HIDE_DELAY_MS = 10000;     // each message stays for 10 seconds
const IDLE_MESSAGE_DELAY_MS = 10 * 60 * 1000;
const IDLE_MESSAGES = ["Hellooo", "Where are you?"];
const SAFE_PROTOCOLS = ["https:", "http:"];
const MAX_URL_LENGTH = 2048;
const CHECK_RATE_LIMIT_MS = 200;
const RESEARCH_RESULT_LIMIT = 12;
const GREETING_DURATION_MS = 3000;
const CONSENT_STORAGE_KEY = "researchHelperPageDataConsentVersion";
const SOUND_MUTED_STORAGE_KEY = "researchHelperPupSoundsMuted";
const CONSENT_VERSION = 1;
const CONSENT_DECLINED = "declined";

// ── URL Validation ───────────────────────────────────────────────────────────
function isSafeToCheck(url: string): boolean {
  if (url.length > MAX_URL_LENGTH) return false;
  try {
    const parsed = new URL(url);
    return SAFE_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

// ── Sound Engine (Web Audio API — no files needed) ───────────────────────────
let audioCtx: AudioContext | null = null;
let barkNoiseBuffer: AudioBuffer | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playBark(): void {
  if (!soundPreferenceLoaded || pupSoundsMuted) return;
  try {
    const ctx = getAudioCtx();
    if (!barkNoiseBuffer) {
      const bufferLength = Math.floor(ctx.sampleRate * 0.18);
      barkNoiseBuffer = ctx.createBuffer(1, bufferLength, ctx.sampleRate);
      const noise = barkNoiseBuffer.getChannelData(0);
      for (let i = 0; i < noise.length; i++) {
        noise[i] = (Math.random() * 2 - 1) * (1 - i / noise.length * 0.35);
      }
    }

    // Two short, rough bark pulses: a falling growl with a filtered noise edge.
    [0, 0.25].forEach((startOffset) => {
      const startAt = ctx.currentTime + startOffset;
      const endAt = startAt + 0.17;
      const bodyOsc = ctx.createOscillator();
      const overtoneOsc = ctx.createOscillator();
      const bodyFilter = ctx.createBiquadFilter();
      const bodyGain = ctx.createGain();

      bodyOsc.type = "sawtooth";
      bodyOsc.frequency.setValueAtTime(280, startAt);
      bodyOsc.frequency.exponentialRampToValueAtTime(95, endAt);
      overtoneOsc.type = "triangle";
      overtoneOsc.frequency.setValueAtTime(560, startAt);
      overtoneOsc.frequency.exponentialRampToValueAtTime(190, endAt);
      bodyFilter.type = "lowpass";
      bodyFilter.frequency.setValueAtTime(1400, startAt);
      bodyFilter.Q.setValueAtTime(0.8, startAt);
      bodyOsc.connect(bodyFilter);
      overtoneOsc.connect(bodyFilter);
      bodyFilter.connect(bodyGain);
      bodyGain.connect(ctx.destination);

      bodyGain.gain.setValueAtTime(0.001, startAt);
      bodyGain.gain.linearRampToValueAtTime(0.22, startAt + 0.015);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, endAt);

      const noiseSource = ctx.createBufferSource();
      const noiseFilter = ctx.createBiquadFilter();
      const noiseGain = ctx.createGain();
      noiseSource.buffer = barkNoiseBuffer;
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(950, startAt);
      noiseFilter.Q.setValueAtTime(0.7, startAt);
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseGain.gain.setValueAtTime(0.001, startAt);
      noiseGain.gain.linearRampToValueAtTime(0.1, startAt + 0.012);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, endAt);

      bodyOsc.start(startAt);
      overtoneOsc.start(startAt);
      noiseSource.start(startAt);
      bodyOsc.stop(endAt);
      overtoneOsc.stop(endAt);
      noiseSource.stop(endAt);
    });
  } catch {
    // Audio not available — fail silently
  }
}

function playWhine(): void {
  if (!soundPreferenceLoaded || pupSoundsMuted) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.5);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // Audio not available — fail silently
  }
}

// ── Puppy Template ───────────────────────────────────────────────────────────
// Static string only — never interpolate external data here (XSS risk)
const PUPPY_TEMPLATE = `
  <svg id="sus-pup-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">

    <!-- Broad, tufted plume tail — behind the body, anchored at the right hip -->
    <g class="pup-tail" style="transform-origin: 74px 68px">
      <path class="pup-tail-fill"
        d="M 70 72
           C 74 68, 74 64, 78 60
           C 71 57, 72 50, 79 47
           C 73 42, 75 35, 82 32
           C 77 25, 81 18, 88 18
           C 88 10, 97 7, 103 13
           C 110 10, 117 17, 114 24
           C 121 29, 119 38, 111 41
           C 115 48, 110 56, 102 57
           C 100 65, 93 70, 86 69
           C 81 75, 73 76, 70 72 Z"
        fill="#c8a165" stroke="#b8915a" stroke-width="1.8" stroke-linejoin="round"/>
      <path class="pup-tail-detail"
        d="M 81 58 C 87 53, 89 47, 95 42 M 84 39 C 90 33, 94 27, 93 20"
        fill="none" stroke="#a9824f" stroke-width="2" stroke-linecap="round"/>
    </g>

    <!-- Body, front legs, and paws — a seated pose -->
    <g class="pup-body">
      <ellipse class="pup-body-fill" cx="50" cy="70"
        rx="28" ry="22" fill="#e8c07a"/>
      <ellipse class="pup-leg-fill pup-hind-leg" cx="31" cy="80" rx="13" ry="12"/>
      <ellipse class="pup-leg-fill pup-hind-leg" cx="69" cy="80" rx="13" ry="12"/>
      <g class="pup-stretch-paw pup-stretch-paw-left">
        <path class="pup-leg-fill pup-front-leg"
          d="M 42 62 C 38 70, 39 83, 41 89 Q 44 93, 47 89 C 49 80, 48 70, 47 63 Z"/>
        <path class="pup-paw-fill"
          d="M 34 91 C 34 86, 37 84, 43 84 C 49 84, 52 88, 52 92 C 52 96, 48 98, 42 98 C 37 98, 34 96, 34 91 Z"/>
        <path class="pup-paw-detail" d="M 39 91 Q 40 94 39 96 M 46 91 Q 47 94 46 96"/>
      </g>
      <g class="pup-stretch-paw pup-stretch-paw-right">
        <path class="pup-leg-fill pup-front-leg"
          d="M 53 63 C 52 70, 51 80, 53 89 Q 56 93, 59 89 C 61 83, 62 70, 58 62 Z"/>
        <path class="pup-paw-fill"
          d="M 48 92 C 48 88, 51 84, 57 84 C 63 84, 66 86, 66 91 C 66 96, 63 98, 58 98 C 52 98, 48 96, 48 92 Z"/>
        <path class="pup-paw-detail" d="M 54 91 Q 55 94 54 96 M 61 91 Q 62 94 61 96"/>
      </g>
    </g>

    <!-- Head -->
    <g class="pup-idle">
      <circle class="pup-body-fill" cx="50" cy="38" r="24" fill="#e8c07a"/>

      <!-- Ears — long floppy hanging -->
      <ellipse class="pup-ear-fill" cx="26" cy="30" rx="11" ry="18"
        fill="#c8a165" transform="rotate(-15 26 30)"/>
      <ellipse class="pup-ear-fill" cx="74" cy="30" rx="11" ry="18"
        fill="#c8a165" transform="rotate(15 74 30)"/>

      <g class="pup-eyes">
        <!-- Eyes -->
        <circle id="pup-eye-left"  cx="40" cy="34" r="5.5" fill="#2c1a0e"/>
        <circle id="pup-eye-right" cx="60" cy="34" r="5.5" fill="#2c1a0e"/>

        <!-- Eye shine -->
        <circle cx="42" cy="32" r="2" fill="#fff"/>
        <circle cx="62" cy="32" r="2" fill="#fff"/>
      </g>

      <!-- Nose -->
      <g class="pup-nose">
        <ellipse cx="50" cy="44" rx="7" ry="5" fill="#2c1a0e"/>
        <circle cx="48" cy="43" r="2" fill="#555"/>
      </g>

      <!-- Mouth — happy default -->
      <path id="pup-mouth" d="M 42 50 Q 50 58 58 50"
        stroke="#2c1a0e" stroke-width="2.5" fill="none"
        stroke-linecap="round"/>
      <path class="pup-greeting-mouth"
        d="M 42 50 Q 50 53 58 50 C 58 56, 55 60, 50 60 C 45 60, 42 56, 42 50 Z"
        fill="#2c1a0e"/>

      <!-- Tongue (hidden by default) -->
      <ellipse id="pup-tongue" cx="50" cy="57" rx="6" ry="4"
        fill="#e74c6b" opacity="0"/>

      <!-- Blush (hidden by default) -->
      <ellipse id="pup-blush-l" cx="32" cy="42" rx="7" ry="4"
        fill="#e88" opacity="0"/>
      <ellipse id="pup-blush-r" cx="68" cy="42" rx="7" ry="4"
        fill="#e88" opacity="0"/>
    </g>

  </svg>
  <div id="sus-pup-msg"></div>
  <button id="sus-pup-options-button" type="button" aria-label="Pup options" title="Pup options">⋯</button>
  <div id="sus-pup-options-menu" class="sus-pup-popup" role="menu" hidden>
    <button id="sus-pup-enable-research" type="button" role="menuitem" hidden>Enable research features</button>
    <button id="sus-pup-see-notes" type="button" role="menuitem">See notes</button>
    <button id="sus-pup-toggle-sound" type="button" role="menuitemcheckbox" aria-checked="false">
      <svg class="sus-pup-sound-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm-7-4a7 7 0 0 0 14 0m-7 7v3m-4 0h8" />
        <path class="sus-pup-sound-muted-mark" d="m4 4 16 16" />
      </svg>
      <span id="sus-pup-sound-label">Mute pup sounds</span>
    </button>
  </div>
  <section id="sus-pup-notebook" class="sus-pup-popup" aria-label="Research notes" hidden>
    <header class="sus-pup-notebook-header">
      <strong>My research notes</strong>
      <button id="sus-pup-close-notes" type="button" aria-label="Close notes">×</button>
    </header>
    <div class="sus-pup-notes-file-tools">
      <button id="sus-pup-link-notes-file" type="button">Connect a local .txt file</button>
    </div>
    <div id="sus-pup-notes-content" aria-live="polite"></div>
  </section>
  <div id="sus-pup-consent-overlay" role="dialog" aria-modal="true" aria-labelledby="sus-pup-consent-title" hidden>
    <section id="sus-pup-consent-card">
      <h2 id="sus-pup-consent-title">A quick privacy choice</h2>
      <p>Research Helper Pup can help with web research by checking the page information below. These features stay off until you choose <strong>Enable these features</strong>.</p>
      <ul>
        <li><strong>Search results:</strong> On Google, Bing, and DuckDuckGo results pages, it checks up to 12 result destination URLs for safety. It does not read your search query, result titles, or snippets.</li>
        <li><strong>Hovered links:</strong> On other pages, it checks a link destination URL after you hover over it.</li>
        <li><strong>Notes:</strong> Only when you use the Notes shortcut, it captures your selected text, page title, page URL, and save time.</li>
      </ul>
      <p>Checks happen on this device. Notes stay in this Chrome profile unless you choose to connect a local .txt file. This extension does not send this information to the developer or another service. It does not read text you type in the Chrome address bar.</p>
      <a id="sus-pup-privacy-link" href="https://github.com/Nebula-03/research-helper-pup-support/blob/main/PRIVACY.md" target="_blank" rel="noopener noreferrer">Read the privacy policy</a>
      <p id="sus-pup-consent-status" role="status" aria-live="polite"></p>
      <div id="sus-pup-consent-actions">
        <button id="sus-pup-consent-not-now" type="button">Not now</button>
        <button id="sus-pup-consent-enable" type="button">Enable these features</button>
      </div>
    </section>
  </div>
`;

// ── Build the puppy DOM ──────────────────────────────────────────────────────
function createPuppy(): HTMLElement {
  const container = document.createElement("div");
  container.id = "sus-pup-container";
  container.style.bottom = "24px";
  container.style.right = "24px";
  container.style.left = "auto";
  container.style.top = "auto";
  container.innerHTML = PUPPY_TEMPLATE;
  return container;
}

// ── State ────────────────────────────────────────────────────────────────────
let currentVerdict: Verdict = "safe";
let msgTimeout: ReturnType<typeof setTimeout> | null = null;
let msgAppearTimeout: ReturnType<typeof setTimeout> | null = null;
let hoverTimeout: ReturnType<typeof setTimeout> | null = null;
let safeLingerTimeout: ReturnType<typeof setTimeout> | null = null;
let idleMessageTimeout: ReturnType<typeof setTimeout> | null = null;
let idleMessageIndex = 0;
let isSniffing = false;
let lastCheckTime = 0;
let hoveredLink: HTMLAnchorElement | null = null;
let hoverStartedAt = 0;
let hoverSequence = 0;
let isLinkHoverActive = false;
let researchSequence = 0;
let lastResearchSignature = "";
let researchTimer: ReturnType<typeof setTimeout> | null = null;
let notesLoadSequence = 0;
let greetingTimeout: ReturnType<typeof setTimeout> | null = null;
let hasPageDataConsent = false;
let dataFeaturesInitialized = false;
let pupSoundsMuted = false;
let soundPreferenceLoaded = false;

// ── DOM refs ─────────────────────────────────────────────────────────────────
let container: HTMLElement;
let svg: SVGElement;
let tail: SVGElement;
let nose: SVGElement;
let body: SVGElement;
let mouth: SVGElement;
let tongue: SVGElement;
let blushL: SVGElement;
let blushR: SVGElement;
let msgBox: HTMLElement;
let optionsButton: HTMLButtonElement;
let optionsMenu: HTMLDivElement;
let enableResearchButton: HTMLButtonElement;
let consentOverlay: HTMLDivElement;
let consentStatus: HTMLElement;
let consentEnableButton: HTMLButtonElement;
let consentNotNowButton: HTMLButtonElement;
let seeNotesButton: HTMLButtonElement;
let soundToggleButton: HTMLButtonElement;
let soundToggleLabel: HTMLSpanElement;
let linkNotesFileButton: HTMLButtonElement;
let notebookPanel: HTMLElement;
let closeNotesButton: HTMLButtonElement;
let notesContent: HTMLElement;

// ── Animation states ─────────────────────────────────────────────────────────
function cancelPupGreeting(): void {
  if (greetingTimeout) clearTimeout(greetingTimeout);
  greetingTimeout = null;
  svg.classList.remove("greeting");
}

function startPupGreeting(): void {
  if (currentVerdict !== "safe" || isSniffing || greetingTimeout || svg.classList.contains("danger")) return;
  svg.classList.add("greeting");
  greetingTimeout = setTimeout(() => {
    svg.classList.remove("greeting");
    greetingTimeout = null;
  }, GREETING_DURATION_MS);
}
function setIdle(preserveMessage = false): void {
  currentVerdict = "safe";
  isSniffing = false;

  svg.classList.remove("danger");
  tail.classList.remove("fast");
  tail.classList.remove("checking");
  nose.style.animationPlayState = "paused";
  body.classList.remove("barking");

  mouth.setAttribute("d", "M 42 50 Q 50 58 58 50");
  tongue.setAttribute("opacity", "0");
  blushL.setAttribute("opacity", "0");
  blushR.setAttribute("opacity", "0");

  if (!preserveMessage) hideMsg();
}

function setSniff(): void {
  cancelPupGreeting();
  isSniffing = true;
  svg.classList.remove("danger");
  tail.classList.remove("fast");
  tail.classList.add("checking");
  nose.style.animationPlayState = "running";
  body.classList.remove("barking");
  mouth.setAttribute("d", "M 42 50 Q 50 54 58 50");
  tongue.setAttribute("opacity", "0");

  // Whine sound while sniffing
  playWhine();
  showMsg("Um... let me check.", "checking");
}

function setSafe(startedAt: number, sequence: number): void {
  cancelPupGreeting();
  currentVerdict = "safe";
  isSniffing = false;

  svg.classList.remove("danger");
  tail.classList.add("fast");
  tail.classList.remove("checking");
  nose.style.animationPlayState = "paused";
  body.classList.remove("barking");

  mouth.setAttribute("d", "M 40 50 Q 50 62 60 50");
  tongue.setAttribute("opacity", "1");
  blushL.setAttribute("opacity", "0.5");
  blushR.setAttribute("opacity", "0.5");

  if (msgAppearTimeout) clearTimeout(msgAppearTimeout);
  if (safeLingerTimeout) clearTimeout(safeLingerTimeout);

  const followUpAt = startedAt + MSG_SAFE_UPGRADE_MS;
  const followUpDelay = Math.max(0, followUpAt - Date.now());
  if (isLinkHoverActive && sequence === hoverSequence && followUpDelay === 0) {
    showMsg("Yeah yeah, open! I checked — no red flags 🐾", "safe");
    return;
  }

  showMsg("Open open.. ✅", "safe");
  if (isLinkHoverActive && sequence === hoverSequence) {
    safeLingerTimeout = setTimeout(() => {
      if (isLinkHoverActive && sequence === hoverSequence) {
        showMsg("open! I checked — no red flags 🐾", "safe");
      }
    }, followUpDelay);
  }
}

function setUnsafe(reason: string): void {
  cancelPupGreeting();
  currentVerdict = "unsafe";
  isSniffing = false;

  svg.classList.add("danger");
  tail.classList.remove("fast");
  tail.classList.remove("checking");
  nose.style.animationPlayState = "paused";

  mouth.setAttribute("d", "M 42 54 Q 50 48 58 54");
  tongue.setAttribute("opacity", "0");
  blushL.setAttribute("opacity", "0");
  blushR.setAttribute("opacity", "0");

  body.classList.remove("barking");
  void body.getBoundingClientRect().width;
  body.classList.add("barking");

  // Bark sound immediately on danger
  playBark();

  if (msgAppearTimeout) clearTimeout(msgAppearTimeout);
  if (safeLingerTimeout) clearTimeout(safeLingerTimeout);
  showMsg(`🚨 Danger: ${reason}`, "unsafe");
}

function setUnknown(reason: string): void {
  cancelPupGreeting();
  currentVerdict = "unknown";
  isSniffing = false;

  svg.classList.remove("danger");
  tail.classList.remove("fast");
  tail.classList.remove("checking");
  nose.style.animationPlayState = "paused";
  body.classList.remove("barking");

  mouth.setAttribute("d", "M 42 50 Q 50 54 58 50");
  tongue.setAttribute("opacity", "0");

  if (msgAppearTimeout) clearTimeout(msgAppearTimeout);
  msgAppearTimeout = setTimeout(() => {
    showMsg(`⚠️ Suspicious: ${reason}`, "unknown");
  }, MSG_APPEAR_DELAY_MS);
}

// ── Message box ──────────────────────────────────────────────────────────────
function showMsg(text: string, type: "safe" | "unsafe" | "unknown" | "checking" | "note" | "idle"): void {
  if (msgTimeout) clearTimeout(msgTimeout);
  msgBox.textContent = text;
  msgBox.className = `visible ${type}`;
  positionMessage();

  msgTimeout = setTimeout(() => {
    hideMsg();
  }, MSG_HIDE_DELAY_MS);
}

function positionMessage(): void {
  if (!msgBox?.classList.contains("visible")) return;

  const pupRect = svg.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const msgRect = msgBox.getBoundingClientRect();
  const margin = 8;
  const gap = 12;
  const tailSweepClearance = 52;
  const rightFits = pupRect.right + gap + tailSweepClearance + msgRect.width <= window.innerWidth - margin;
  const leftFits = pupRect.left - gap - msgRect.width >= margin;
  const centeredTop = pupRect.top + (pupRect.height - msgRect.height) / 2;

  let x: number;
  let y: number;
  if (rightFits) {
    x = pupRect.right + gap + tailSweepClearance;
    y = centeredTop;
  } else if (leftFits) {
    x = pupRect.left - gap - msgRect.width;
    y = centeredTop;
  } else {
    x = pupRect.left + (pupRect.width - msgRect.width) / 2;
    const aboveY = pupRect.top - gap - msgRect.height;
    const belowY = pupRect.bottom + gap;
    const aboveFits = aboveY >= margin;
    const belowFits = belowY + msgRect.height <= window.innerHeight - margin;

    if (aboveFits) y = aboveY;
    else if (belowFits) y = belowY;
    else {
      const spaceAbove = pupRect.top - margin;
      const spaceBelow = window.innerHeight - margin - pupRect.bottom;
      y = spaceAbove >= spaceBelow ? aboveY : belowY;
    }
  }

  const maxX = Math.max(margin, window.innerWidth - margin - msgRect.width);
  const maxY = Math.max(margin, window.innerHeight - margin - msgRect.height);
  x = Math.min(maxX, Math.max(margin, x));
  y = Math.min(maxY, Math.max(margin, y));

  msgBox.style.left = `${x - containerRect.left}px`;
  msgBox.style.top = `${y - containerRect.top}px`;
  msgBox.style.right = "auto";
  msgBox.style.bottom = "auto";
  msgBox.style.transform = "none";
}

function hideMsg(): void {
  if (msgTimeout) clearTimeout(msgTimeout);
  if (msgAppearTimeout) clearTimeout(msgAppearTimeout);
  if (safeLingerTimeout) clearTimeout(safeLingerTimeout);
  msgBox.className = "";
}

function positionPopup(popup: HTMLElement, anchor: DOMRect): void {
  const pupRect = container.getBoundingClientRect();
  const popupRect = popup.getBoundingClientRect();
  const margin = 8;
  const gap = 8;
  const maxX = Math.max(margin, window.innerWidth - popupRect.width - margin);
  const maxY = Math.max(margin, window.innerHeight - popupRect.height - margin);
  const x = Math.min(maxX, Math.max(margin, anchor.right - popupRect.width));
  const above = anchor.top - popupRect.height - gap;
  const below = anchor.bottom + gap;
  const y = above >= margin ? above : Math.min(maxY, Math.max(margin, below));
  popup.style.left = `${x - pupRect.left}px`;
  popup.style.top = `${y - pupRect.top}px`;
}

function positionNotesPopups(): void {
  if (!optionsButton) return;
  const anchor = optionsButton.getBoundingClientRect();
  if (!optionsMenu.hidden) positionPopup(optionsMenu, anchor);
  if (!notebookPanel.hidden) positionPopup(notebookPanel, anchor);
}

function renderNotes(notes: ResearchNote[]): void {
  notesContent.replaceChildren();
  if (notes.length === 0) {
    const empty = document.createElement("p");
    empty.className = "sus-pup-notes-empty";
    empty.textContent = "No notes yet. Select webpage text and press Ctrl+Shift+Y to save it.";
    notesContent.appendChild(empty);
    return;
  }

  for (const note of notes) {
    const card = document.createElement("article");
    card.className = "sus-pup-note-card";

    const noteHeader = document.createElement("div");
    noteHeader.className = "sus-pup-note-header";

    const text = document.createElement("p");
    text.className = "sus-pup-note-text";
    text.textContent = note.text;
    noteHeader.appendChild(text);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "sus-pup-note-delete";
    deleteButton.textContent = "🗑";
    deleteButton.title = "Delete this note";
    deleteButton.setAttribute("aria-label", "Delete this note");
    deleteButton.addEventListener("click", () => {
      deleteButton.disabled = true;
      const request: DeleteNoteMessage = { type: "DELETE_NOTE", noteId: note.id };
      chrome.runtime.sendMessage(request, (response: NotesResponse | undefined) => {
        if (chrome.runtime.lastError || !response?.ok) {
          deleteButton.disabled = false;
          showMsg(response?.error ?? "I couldn't delete that note.", "unknown");
          return;
        }
        openNotes();
      });
    });
    noteHeader.appendChild(deleteButton);
    card.appendChild(noteHeader);

    const source = document.createElement("a");
    source.className = "sus-pup-note-source";
    source.textContent = note.pageTitle || note.url;
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    try {
      const url = new URL(note.url);
      if (url.protocol === "http:" || url.protocol === "https:") {
        source.href = url.href;
        card.appendChild(source);
      }
    } catch {
      // Keep the saved passage visible even if an old source URL is invalid.
    }

    const date = document.createElement("time");
    date.className = "sus-pup-note-date";
    const createdAt = Number.isFinite(note.createdAt) ? new Date(note.createdAt) : new Date();
    date.dateTime = createdAt.toISOString();
    date.textContent = createdAt.toLocaleString();
    card.appendChild(date);
    notesContent.appendChild(card);
  }
}

function openNotes(): void {
  optionsMenu.hidden = true;
  notebookPanel.hidden = false;
  notesContent.textContent = "Loading notes…";
  positionNotesPopups();
  const sequence = ++notesLoadSequence;
  const request: GetNotesMessage = { type: "GET_NOTES" };
  chrome.runtime.sendMessage(request, (response: NotesResponse | undefined) => {
    if (sequence !== notesLoadSequence || notebookPanel.hidden) return;
    if (chrome.runtime.lastError || !response?.ok) {
      notesContent.textContent = response?.error ?? "Could not open your notes.";
      return;
    }
    renderNotes(response.notes ?? []);
    positionNotesPopups();
  });
}

function showNoteSaved(): void {
  showMsg("Saved to your notes 🐾", "note");
}

function initNotesControls(): void {
  optionsButton.addEventListener("click", () => {
    notebookPanel.hidden = true;
    optionsMenu.hidden = !optionsMenu.hidden;
    if (!optionsMenu.hidden) positionNotesPopups();
  });
  enableResearchButton.addEventListener("click", () => {
    optionsMenu.hidden = true;
    showConsentPrompt();
  });
  seeNotesButton.addEventListener("click", openNotes);
  linkNotesFileButton.addEventListener("click", () => {
    const request = { type: "OPEN_NOTES_FILE_PAGE" as const };
    chrome.runtime.sendMessage(request, (response: { ok?: boolean; error?: string } | undefined) => {
      if (chrome.runtime.lastError || !response?.ok) {
        showMsg(response?.error ?? "I couldn't open the local text file settings.", "unknown");
      }
    });
  });
  closeNotesButton.addEventListener("click", () => {
    notebookPanel.hidden = true;
    notesLoadSequence++;
  });
  document.addEventListener("mousedown", (event: MouseEvent) => {
    if (event.target instanceof Node && container.contains(event.target)) return;
    optionsMenu.hidden = true;
    notebookPanel.hidden = true;
    notesLoadSequence++;
  });
  window.addEventListener("resize", positionNotesPopups);

  chrome.runtime.onMessage.addListener(
    (message: CaptureSelectionMessage, _sender, sendResponse) => {
      if (message.type !== "CAPTURE_SELECTION") return false;
      if (!hasPageDataConsent) {
        showConsentPrompt("Enable these features before saving selected text as a note.");
        sendResponse({ ok: false, error: "Research Helper Pup is waiting for your consent." });
        return false;
      }
      const selectedText = window.getSelection()?.toString().trim() ?? "";
      if (!selectedText) {
        showMsg("Select webpage text, then press Ctrl+Shift+Y.", "unknown");
        sendResponse({ ok: false });
        return false;
      }

      const note: ResearchNote = {
        id: crypto.randomUUID(),
        text: selectedText,
        pageTitle: document.title || location.hostname,
        url: location.href,
        createdAt: Date.now(),
      };
      const request: StoreNoteMessage = { type: "STORE_NOTE", note };
      chrome.runtime.sendMessage(request, (response: NotesResponse | undefined) => {
        if (chrome.runtime.lastError || !response?.ok) {
          showMsg(response?.error ?? "I couldn't save that note.", "unknown");
          sendResponse({ ok: false });
          return;
        }
        showNoteSaved();
        sendResponse({ ok: true });
      });
      return true;
    },
  );
}

function renderSoundToggle(): void {
  soundToggleButton.setAttribute("aria-checked", String(pupSoundsMuted));
  soundToggleButton.setAttribute("aria-label", pupSoundsMuted ? "Unmute pup sounds" : "Mute pup sounds");
  soundToggleLabel.textContent = pupSoundsMuted ? "Unmute pup sounds" : "Mute pup sounds";
}

function initSoundControls(): void {
  soundToggleButton.addEventListener("click", () => {
    const previousValue = pupSoundsMuted;
    pupSoundsMuted = !pupSoundsMuted;
    renderSoundToggle();
    chrome.storage.local.set({ [SOUND_MUTED_STORAGE_KEY]: pupSoundsMuted }, () => {
      if (!chrome.runtime.lastError) return;
      pupSoundsMuted = previousValue;
      renderSoundToggle();
      showMsg("I couldn't save the sound setting. Please try again.", "unknown");
    });
  });

  soundToggleButton.disabled = true;
  chrome.storage.local.get(SOUND_MUTED_STORAGE_KEY, (items) => {
    soundToggleButton.disabled = false;
    soundPreferenceLoaded = true;
    if (chrome.runtime.lastError) return;
    pupSoundsMuted = items[SOUND_MUTED_STORAGE_KEY] === true;
    renderSoundToggle();
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    const change = changes[SOUND_MUTED_STORAGE_KEY];
    if (areaName !== "local" || !change) return;
    soundPreferenceLoaded = true;
    pupSoundsMuted = change.newValue === true;
    renderSoundToggle();
  });
}

// Show a playful check-in after the visible page has had no user activity.
function scheduleIdleMessage(): void {
  if (idleMessageTimeout) clearTimeout(idleMessageTimeout);
  idleMessageTimeout = null;
  if (document.visibilityState !== "visible" || !container?.isConnected) return;

  idleMessageTimeout = setTimeout(() => {
    idleMessageTimeout = null;
    showMsg(IDLE_MESSAGES[idleMessageIndex], "idle");
    idleMessageIndex = (idleMessageIndex + 1) % IDLE_MESSAGES.length;
    scheduleIdleMessage();
  }, IDLE_MESSAGE_DELAY_MS);
}

function initIdleMessages(): void {
  const activityEvents = ["pointermove", "pointerdown", "keydown", "input", "wheel", "touchstart", "click"];
  for (const eventName of activityEvents) {
    document.addEventListener(eventName, scheduleIdleMessage, { passive: true });
  }
  document.addEventListener("scroll", scheduleIdleMessage, { capture: true, passive: true });
  document.addEventListener("visibilitychange", scheduleIdleMessage);
  window.addEventListener("pageshow", scheduleIdleMessage);
  scheduleIdleMessage();
}

// ── Safety check ─────────────────────────────────────────────────────────────
function checkUrl(url: string, startedAt: number, sequence: number): void {
  setSniff();
  const msg: CheckRequest = { type: "CHECK_URL", url };
  chrome.runtime.sendMessage(msg, (response: CheckResponse) => {
    if (sequence !== hoverSequence) return;
    if (chrome.runtime.lastError) {
      setIdle();
      return;
    }
    if (response.verdict === "safe") setSafe(startedAt, sequence);
    else if (response.verdict === "unsafe") setUnsafe(response.reason);
    else setUnknown(response.reason);
  });
}

function isSearchResultsLocation(): boolean {
  try {
    const url = new URL(location.href);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const supportedHost = host === "google.com" || /^google\.[a-z]{2,3}(?:\.[a-z]{2})?$/.test(host) ||
      host === "bing.com" || host === "duckduckgo.com";
    return supportedHost && url.searchParams.has("q") &&
      ((host === "google.com" || host.startsWith("google.")) ? url.pathname === "/search" :
        host === "bing.com" ? url.pathname === "/search" : true);
  } catch {
    return false;
  }
}

function reviewUrl(url: string): Promise<CheckResponse> {
  return new Promise((resolve) => {
    const request: CheckRequest = { type: "CHECK_URL", url };
    chrome.runtime.sendMessage(request, (response: CheckResponse | undefined) => {
      if (chrome.runtime.lastError || !response) {
        resolve({ verdict: "unknown", reason: "Could not check this site's safety" });
      } else {
        resolve(response);
      }
    });
  });
}

async function reviewSearchResults(): Promise<void> {
  if (!isSearchResultsLocation()) return;
  const page = readResearchPage();
  if (!page) return;
  const results = page.results.slice(0, RESEARCH_RESULT_LIMIT);
  const signature = results.map((result) => result.url).join("|");
  if (signature === lastResearchSignature) return;
  lastResearchSignature = signature;
  const sequence = ++researchSequence;

  setSniff();
  const checked = await Promise.all(results.map(async (result) => ({
    result,
    safety: await reviewUrl(result.url),
  })));
  if (sequence !== researchSequence || !container.isConnected) return;

  const unsafe = checked.find(({ safety }) => safety.verdict === "unsafe");
  if (unsafe) {
    setUnsafe(unsafe.safety.reason);
    return;
  }

  const suspicious = checked.find(({ safety }) => safety.verdict === "unknown");
  if (suspicious) {
    setResearchWarning(`I found a possible safety concern: ${suspicious.safety.reason}`);
    return;
  }

  setResearchGood();
}

function setResearchGood(): void {
  cancelPupGreeting();
  currentVerdict = "safe";
  isSniffing = false;
  svg.classList.remove("danger");
  tail.classList.remove("checking");
  tail.classList.add("fast");
  nose.style.animationPlayState = "paused";
  body.classList.remove("barking");
  mouth.setAttribute("d", "M 40 50 Q 50 62 60 50");
  tongue.setAttribute("opacity", "1");
  blushL.setAttribute("opacity", "0.5");
  blushR.setAttribute("opacity", "0.5");
  showMsg("I checked the search links. No red flags so far! 🐾", "safe");
}

function setResearchWarning(message: string): void {
  cancelPupGreeting();
  currentVerdict = "unknown";
  isSniffing = false;
  svg.classList.remove("danger");
  tail.classList.remove("checking", "fast");
  nose.style.animationPlayState = "paused";
  body.classList.remove("barking");
  mouth.setAttribute("d", "M 42 50 Q 50 54 58 50");
  tongue.setAttribute("opacity", "0");
  blushL.setAttribute("opacity", "0");
  blushR.setAttribute("opacity", "0");
  showMsg(message, "unknown");
}

function initResearchReview(): void {
  if (!isSearchResultsLocation()) return;
  const schedule = () => {
    if (researchTimer) clearTimeout(researchTimer);
    researchTimer = setTimeout(() => void reviewSearchResults(), 900);
  };
  schedule();

  const observer = new MutationObserver((mutations) => {
    const pageChanged = mutations.some((mutation) => {
      const target = mutation.target;
      return !container.contains(target);
    });
    if (pageChanged) schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  window.addEventListener("popstate", schedule);
}

// ── Drag ──────────────────────────────────────────────────────────────────────
function initDrag(): void {
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let origLeft = 0;
  let origTop = 0;

  container.addEventListener("mousedown", (e: MouseEvent) => {
    if (e.target instanceof Element && e.target.closest("button, .sus-pup-popup")) return;
    dragging = true;
    container.classList.add("dragging");
    startX = e.clientX;
    startY = e.clientY;
    const rect = container.getBoundingClientRect();
    origLeft = rect.left;
    origTop = rect.top;
    container.style.left = `${origLeft}px`;
    container.style.top = `${origTop}px`;
    container.style.right = "auto";
    container.style.bottom = "auto";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e: MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    container.style.left = `${origLeft + dx}px`;
    container.style.top = `${origTop + dy}px`;
    positionMessage();
    positionNotesPopups();
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
    container.classList.remove("dragging");
  });
}

// ── Pup greeting ──────────────────────────────────────────────────────────────
function initPupGreeting(): void {
  svg.addEventListener("pointerenter", startPupGreeting, { passive: true });
}

// ── Hover detection ───────────────────────────────────────────────────────────
function initHover(): void {
  window.addEventListener("resize", positionMessage);

  document.addEventListener("mouseover", (e: MouseEvent) => {
    if (isSearchResultsLocation()) return;
    if (e.target instanceof Node && container.contains(e.target)) return;
    const target = e.target as HTMLElement;
    const link = target.closest("a") as HTMLAnchorElement | null;

    if (!link || !link.href || !isSafeToCheck(link.href)) return;
    if (e.relatedTarget instanceof Node && link.contains(e.relatedTarget)) return;
    if (link === hoveredLink) return;

    if (hoverTimeout) clearTimeout(hoverTimeout);
    if (safeLingerTimeout) clearTimeout(safeLingerTimeout);
    if (msgAppearTimeout) clearTimeout(msgAppearTimeout);
    hideMsg();

    hoveredLink = link;
    hoverStartedAt = Date.now();
    isLinkHoverActive = true;
    const sequence = ++hoverSequence;
    const startedAt = hoverStartedAt;

    hoverTimeout = setTimeout(() => {
      const now = Date.now();
      if (now - lastCheckTime < CHECK_RATE_LIMIT_MS) return;
      lastCheckTime = now;
      checkUrl(link.href, startedAt, sequence);
    }, HOVER_DELAY_MS);
  });

  document.addEventListener("mouseout", (e: MouseEvent) => {
    if (isSearchResultsLocation()) return;
    if (e.target instanceof Node && container.contains(e.target)) return;
    const target = e.target as HTMLElement;
    const link = target.closest("a") as HTMLAnchorElement | null;
    if (!link) return;
    if (e.relatedTarget instanceof Node && link.contains(e.relatedTarget)) return;
    if (link !== hoveredLink) return;

    if (hoverTimeout) clearTimeout(hoverTimeout);
    if (safeLingerTimeout) clearTimeout(safeLingerTimeout);
    if (msgAppearTimeout) clearTimeout(msgAppearTimeout);
    hoveredLink = null;
    hoverStartedAt = 0;
    isLinkHoverActive = false;

    if (!isSniffing) {
      setIdle(true);
    }
  });
}

// ── Mount ─────────────────────────────────────────────────────────────────────
function showConsentPrompt(message = ""): void {
  consentStatus.textContent = message;
  consentOverlay.hidden = false;
  enableResearchButton.hidden = true;
  consentEnableButton.focus();
}

function dismissConsentPrompt(): void {
  consentOverlay.hidden = true;
  enableResearchButton.hidden = false;
  optionsButton.focus();
  showMsg("No problem. Research features are off. Open ⋯ and choose Enable research features when you are ready.", "idle");
  chrome.storage.local.set({ [CONSENT_STORAGE_KEY]: CONSENT_DECLINED }, () => {
    if (chrome.runtime.lastError) {
      showMsg("Your choice applies on this page; I may ask again after a reload.", "idle");
    }
  });
}

function enablePageDataFeatures(): void {
  if (dataFeaturesInitialized) return;
  dataFeaturesInitialized = true;
  hasPageDataConsent = true;
  enableResearchButton.hidden = true;
  consentOverlay.hidden = true;
  initHover();
  initResearchReview();
}

function initConsentGate(): void {
  consentOverlay.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      dismissConsentPrompt();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...consentOverlay.querySelectorAll<HTMLElement>(
      "a[href], button:not([disabled])",
    )].filter((element) => element.getClientRects().length > 0);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  consentNotNowButton.addEventListener("click", dismissConsentPrompt);
  consentEnableButton.addEventListener("click", () => {
    consentEnableButton.disabled = true;
    consentStatus.textContent = "Saving your choice…";
    chrome.storage.local.set({ [CONSENT_STORAGE_KEY]: CONSENT_VERSION }, () => {
      consentEnableButton.disabled = false;
      if (chrome.runtime.lastError) {
        consentStatus.textContent = "I could not save your choice. Please try again; research features remain off until it is saved.";
        return;
      }
      enablePageDataFeatures();
    });
  });

  chrome.storage.local.get(CONSENT_STORAGE_KEY, (items) => {
    if (chrome.runtime.lastError) {
      showConsentPrompt("I could not verify a saved choice. Please choose whether to enable these features.");
      return;
    }
    if (items[CONSENT_STORAGE_KEY] === CONSENT_VERSION) {
      enablePageDataFeatures();
      return;
    }
    if (items[CONSENT_STORAGE_KEY] === CONSENT_DECLINED) {
      enableResearchButton.hidden = false;
      return;
    }
    showConsentPrompt();
  });
}

function mount(): void {
  container = createPuppy();
  document.body.appendChild(container);

  svg    = container.querySelector("#sus-pup-svg") as SVGElement;
  tail   = container.querySelector(".pup-tail")    as SVGElement;
  nose   = container.querySelector(".pup-nose")    as SVGElement;
  body   = container.querySelector(".pup-body")    as SVGElement;
  mouth  = container.querySelector("#pup-mouth")   as SVGElement;
  tongue = container.querySelector("#pup-tongue")  as SVGElement;
  blushL = container.querySelector("#pup-blush-l") as SVGElement;
  blushR = container.querySelector("#pup-blush-r") as SVGElement;
  msgBox = container.querySelector("#sus-pup-msg") as HTMLElement;
  optionsButton = container.querySelector("#sus-pup-options-button") as HTMLButtonElement;
  optionsMenu = container.querySelector("#sus-pup-options-menu") as HTMLDivElement;
  enableResearchButton = container.querySelector("#sus-pup-enable-research") as HTMLButtonElement;
  consentOverlay = container.querySelector("#sus-pup-consent-overlay") as HTMLDivElement;
  consentStatus = container.querySelector("#sus-pup-consent-status") as HTMLElement;
  consentEnableButton = container.querySelector("#sus-pup-consent-enable") as HTMLButtonElement;
  consentNotNowButton = container.querySelector("#sus-pup-consent-not-now") as HTMLButtonElement;
  seeNotesButton = container.querySelector("#sus-pup-see-notes") as HTMLButtonElement;
  soundToggleButton = container.querySelector("#sus-pup-toggle-sound") as HTMLButtonElement;
  soundToggleLabel = container.querySelector("#sus-pup-sound-label") as HTMLSpanElement;
  linkNotesFileButton = container.querySelector("#sus-pup-link-notes-file") as HTMLButtonElement;
  notebookPanel = container.querySelector("#sus-pup-notebook") as HTMLElement;
  closeNotesButton = container.querySelector("#sus-pup-close-notes") as HTMLButtonElement;
  notesContent = container.querySelector("#sus-pup-notes-content") as HTMLElement;

  nose.style.animationPlayState = "paused";

  initPupGreeting();
  initDrag();
  initNotesControls();
  initSoundControls();
  initConsentGate();
  initIdleMessages();

  // Clean up timers on page unload
  window.addEventListener("pagehide", () => {
    cancelPupGreeting();
    if (hoverTimeout) clearTimeout(hoverTimeout);
    if (safeLingerTimeout) clearTimeout(safeLingerTimeout);
    if (idleMessageTimeout) clearTimeout(idleMessageTimeout);
    if (msgTimeout) clearTimeout(msgTimeout);
    if (msgAppearTimeout) clearTimeout(msgAppearTimeout);
    if (researchTimer) clearTimeout(researchTimer);
  });
}

// Wait for body
if (document.body) {
  mount();
} else {
  document.addEventListener("DOMContentLoaded", mount);
}
