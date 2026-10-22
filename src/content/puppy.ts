import type {
  CaptureSelectionMessage,
  DeleteNoteMessage,
  GetNotesMessage,
  NotesResponse,
  ResearchNote,
  StoreNoteMessage,
} from "../shared/messages";

// ── Constants ────────────────────────────────────────────────────────────────
const CONSENT_STORAGE_KEY = "researchHelperNotesConsentVersion";
const SOUND_MUTED_STORAGE_KEY = "researchHelperPupSoundsMuted";
const CONSENT_VERSION = 2;
const CONSENT_DECLINED = "declined";

const EXTENSION_RELOADED_MESSAGE = "Research Helper Pup was reloaded. Refresh this page to reconnect.";

function sendExtensionMessage<T>(message: object, callback: (response: T | undefined, error?: string) => void): void {
  try {
    if (!chrome.runtime?.id) {
      callback(undefined, EXTENSION_RELOADED_MESSAGE);
      return;
    }
    chrome.runtime.sendMessage(message, (response: T | undefined) => {
      let error: string | undefined;
      try {
        error = chrome.runtime.lastError?.message;
      } catch {
        error = EXTENSION_RELOADED_MESSAGE;
      }
      callback(response, normalizeExtensionError(error));
    });
  } catch {
    callback(undefined, EXTENSION_RELOADED_MESSAGE);
  }
}

function normalizeExtensionError(error?: string): string | undefined {
  if (!error) return undefined;
  return /context invalidated|receiving end does not exist|message port closed/i.test(error)
    ? EXTENSION_RELOADED_MESSAGE
    : error;
}

function getLocalSettings(
  keys: string | string[],
  callback: (items: Record<string, unknown>, error?: string) => void,
): void {
  try {
    if (!chrome.runtime?.id) {
      callback({}, EXTENSION_RELOADED_MESSAGE);
      return;
    }
    chrome.storage.local.get(keys, (items) => {
      let error: string | undefined;
      try {
        error = normalizeExtensionError(chrome.runtime.lastError?.message);
      } catch {
        error = EXTENSION_RELOADED_MESSAGE;
      }
      callback(items, error);
    });
  } catch {
    callback({}, EXTENSION_RELOADED_MESSAGE);
  }
}

function setLocalSettings(
  values: Record<string, unknown>,
  callback: (error?: string) => void,
): void {
  try {
    if (!chrome.runtime?.id) {
      callback(EXTENSION_RELOADED_MESSAGE);
      return;
    }
    chrome.storage.local.set(values, () => {
      let error: string | undefined;
      try {
        error = normalizeExtensionError(chrome.runtime.lastError?.message);
      } catch {
        error = EXTENSION_RELOADED_MESSAGE;
      }
      callback(error);
    });
  } catch {
    callback(EXTENSION_RELOADED_MESSAGE);
  }
}

// ── Pup sound ────────────────────────────────────────────────────────────────
let pupSound: HTMLAudioElement | null = null;

function getPupSound(): HTMLAudioElement {
  if (!pupSound) {
    pupSound = new Audio(chrome.runtime.getURL("assets/pup-bark.ogg"));
    pupSound.preload = "auto";
    pupSound.volume = 0.22;
  }
  return pupSound;
}

async function playBark(): Promise<boolean> {
  if (!soundPreferenceLoaded || pupSoundsMuted) return false;
  try {
    const sound = getPupSound();
    sound.currentTime = 0;
    await sound.play();
    return true;
  } catch {
    // Audio can be unavailable or blocked by the browser; keep saving notes working.
    return false;
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
  <button id="sus-pup-options-button" type="button" aria-label="Pup options" title="Pup options">⋯</button>
  <div id="sus-pup-save-status" role="status" aria-live="polite" hidden>Saved in notes 🐾</div>
  <div id="sus-pup-options-menu" class="sus-pup-popup" role="menu" hidden>
    <button id="sus-pup-enable-notes" type="button" role="menuitem" hidden>Enable note saving</button>
    <button id="sus-pup-see-notes" type="button" role="menuitem">See notes</button>
    <button id="sus-pup-toggle-sound" type="button" role="menuitemcheckbox" aria-checked="false">
      <svg class="sus-pup-sound-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm-7-4a7 7 0 0 0 14 0m-7 7v3m-4 0h8" />
        <path class="sus-pup-sound-muted-mark" d="m4 4 16 16" />
      </svg>
      <span id="sus-pup-sound-label">Mute pup</span>
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
    <p id="sus-pup-notes-status" role="status" aria-live="polite" hidden></p>
    <label id="sus-pup-notes-search-label" for="sus-pup-notes-search" hidden>Find a note</label>
    <input id="sus-pup-notes-search" type="search" placeholder="Search notes or sources" autocomplete="off" hidden>
    <div id="sus-pup-notes-content" aria-live="polite"></div>
  </section>
  <div id="sus-pup-consent-overlay" role="dialog" aria-modal="true" aria-labelledby="sus-pup-consent-title" hidden>
    <section id="sus-pup-consent-card">
      <h2 id="sus-pup-consent-title">Hi! I’m Research Helper Pup 🐾</h2>
      <p>Keep useful bits of research in three steps:</p>
      <ol class="sus-pup-welcome-steps">
        <li><strong>Select text</strong> on the webpage that you want to keep.</li>
        <li><strong>Press <kbd>Ctrl+Shift+Y</kbd></strong> (on Mac, <kbd>Command+Shift+Y</kbd>).</li>
        <li><strong>Find it in See notes.</strong> Your note is saved on this device. Connect a .txt file there if you also want a readable file copy.</li>
      </ol>
      <p>Chrome asks for access to websites so the pup can appear automatically. It saves only the text you select, the page title, web address, and time when you press the shortcut. Notes stay in this Chrome profile and are not sent to the developer or another service. The pup does not check links.</p>
      <a id="sus-pup-privacy-link" href="https://github.com/Nebula-03/research-helper-pup-support/blob/main/PRIVACY.md" target="_blank" rel="noopener noreferrer">Read the privacy policy</a>
      <p id="sus-pup-consent-status" role="status" aria-live="polite"></p>
      <div id="sus-pup-consent-actions">
        <button id="sus-pup-consent-not-now" type="button">Not now</button>
        <button id="sus-pup-consent-enable" type="button">Start saving notes</button>
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
let savedNotes: ResearchNote[] = [];
let notesLoadSequence = 0;
let hasNoteSavingConsent = false;
let noteSavingInitialized = false;
let pupSoundsMuted = false;
let soundPreferenceLoaded = false;
let welcomeSoundPending = false;
let welcomeGreetingShown = false;
let savedStatusTimeout: ReturnType<typeof setTimeout> | null = null;

// ── DOM refs ─────────────────────────────────────────────────────────────────
let container: HTMLElement;
let svg: SVGElement;
let optionsButton: HTMLButtonElement;
let optionsMenu: HTMLDivElement;
let enableNotesButton: HTMLButtonElement;
let consentOverlay: HTMLDivElement;
let consentStatus: HTMLElement;
let consentEnableButton: HTMLButtonElement;
let consentNotNowButton: HTMLButtonElement;
let seeNotesButton: HTMLButtonElement;
let soundToggleButton: HTMLButtonElement;
let soundToggleLabel: HTMLSpanElement;
let savedStatus: HTMLElement;
let linkNotesFileButton: HTMLButtonElement;
let notebookPanel: HTMLElement;
let closeNotesButton: HTMLButtonElement;
let notesContent: HTMLElement;
let notesStatus: HTMLElement;
let notesSearchInput: HTMLInputElement;

function welcomePup(): void {
  if (welcomeGreetingShown) return;
  welcomeGreetingShown = true;
  if (!soundPreferenceLoaded) {
    welcomeSoundPending = true;
  } else if (!pupSoundsMuted) {
    playWelcomeBark();
  }
}

async function playWelcomeBark(): Promise<void> {
  if (pupSoundsMuted) return;
  const played = await playBark();
  if (played || pupSoundsMuted) return;
  const retryAfterGesture = () => {
    document.removeEventListener("pointerdown", retryAfterGesture);
    document.removeEventListener("keydown", retryAfterGesture);
    if (!pupSoundsMuted) void playBark();
  };
  document.addEventListener("pointerdown", retryAfterGesture, { once: true });
  document.addEventListener("keydown", retryAfterGesture, { once: true });
}

function celebrateSavedNote(): void {
  void playBark();
  savedStatus.hidden = false;
  if (savedStatusTimeout) clearTimeout(savedStatusTimeout);
  savedStatusTimeout = setTimeout(() => {
    savedStatus.hidden = true;
    savedStatusTimeout = null;
  }, 2400);
}

function setNotesStatus(message: string): void {
  if (!notebookPanel || notebookPanel.hidden) return;
  notesStatus.textContent = message;
  notesStatus.hidden = message.length === 0;
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
  savedNotes = notes;
  const hasNotes = notes.length > 0;
  notesSearchInput.hidden = !hasNotes;
  container.querySelector<HTMLElement>("#sus-pup-notes-search-label")!.hidden = !hasNotes;
  notesContent.replaceChildren();
  if (notes.length === 0) {
    const empty = document.createElement("p");
    empty.className = "sus-pup-notes-empty";
    empty.textContent = "No notes yet. Select webpage text and press Ctrl+Shift+Y to save it.";
    notesContent.appendChild(empty);
    return;
  }

  const query = notesSearchInput.value.trim().toLocaleLowerCase();
  const visibleNotes = query
    ? notes.filter((note) => `${note.text}\n${note.pageTitle}\n${note.url}`.toLocaleLowerCase().includes(query))
    : notes;
  if (visibleNotes.length === 0) {
    const empty = document.createElement("p");
    empty.className = "sus-pup-notes-empty";
    empty.textContent = "No notes match that search.";
    notesContent.appendChild(empty);
    return;
  }

  for (const note of visibleNotes) {
    const card = document.createElement("article");
    card.className = "sus-pup-note-card";

    const noteHeader = document.createElement("div");
    noteHeader.className = "sus-pup-note-header";

    const text = document.createElement("p");
    text.className = "sus-pup-note-text";
    text.textContent = note.text;
    noteHeader.appendChild(text);

    const actions = document.createElement("div");
    actions.className = "sus-pup-note-actions";

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "sus-pup-note-copy";
    copyButton.textContent = "Copy";
    copyButton.title = "Copy this note";
    copyButton.addEventListener("click", async () => {
      copyButton.disabled = true;
      const copied = await copyNoteText(note.text);
      copyButton.disabled = false;
      setNotesStatus(copied ? "Copied." : "Couldn't copy that note.");
    });
    actions.appendChild(copyButton);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "sus-pup-note-delete";
    deleteButton.textContent = "🗑";
    deleteButton.title = "Delete this note";
    deleteButton.setAttribute("aria-label", "Delete this note");
    deleteButton.addEventListener("click", () => {
      deleteButton.disabled = true;
      const request: DeleteNoteMessage = { type: "DELETE_NOTE", noteId: note.id };
      sendExtensionMessage<NotesResponse>(request, (response, error) => {
        if (error || !response?.ok) {
          deleteButton.disabled = false;
          setNotesStatus(error ?? response?.error ?? "Couldn't delete that note.");
          return;
        }
        openNotes();
      });
    });
    actions.appendChild(deleteButton);
    noteHeader.appendChild(actions);
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

async function copyNoteText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Try the user-initiated legacy copy path below when the Clipboard API is unavailable.
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  container.appendChild(textarea);
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  textarea.remove();
  return copied;
}

function openNotes(): void {
  optionsMenu.hidden = true;
  notebookPanel.hidden = false;
  setNotesStatus("");
  notesContent.textContent = "Loading notes…";
  positionNotesPopups();
  const sequence = ++notesLoadSequence;
  const request: GetNotesMessage = { type: "GET_NOTES" };
  sendExtensionMessage<NotesResponse>(request, (response, error) => {
    if (sequence !== notesLoadSequence || notebookPanel.hidden) return;
    if (error || !response?.ok) {
      notesContent.textContent = error ?? response?.error ?? "Could not open your notes.";
      return;
    }
    renderNotes(response.notes ?? []);
    positionNotesPopups();
  });
}

function initNotesControls(): void {
  optionsButton.addEventListener("click", () => {
    notebookPanel.hidden = true;
    optionsMenu.hidden = !optionsMenu.hidden;
    if (!optionsMenu.hidden) positionNotesPopups();
  });
  enableNotesButton.addEventListener("click", () => {
    optionsMenu.hidden = true;
    showConsentPrompt();
  });
  seeNotesButton.addEventListener("click", openNotes);
  notesSearchInput.addEventListener("input", () => renderNotes(savedNotes));
  linkNotesFileButton.addEventListener("click", () => {
    const request = { type: "OPEN_NOTES_FILE_PAGE" as const };
    sendExtensionMessage<{ ok?: boolean; error?: string }>(request, (response, error) => {
      if (error || !response?.ok) {
        setNotesStatus(error ?? response?.error ?? "Couldn't open the local text file settings.");
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
      if (!hasNoteSavingConsent) {
        showConsentPrompt();
        sendResponse({ ok: false, error: "Note saving is waiting for your consent." });
        return false;
      }
      const selectedText = window.getSelection()?.toString().trim() ?? "";
      if (!selectedText) {
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
      sendExtensionMessage<NotesResponse>(request, (response, error) => {
        if (error || !response?.ok) {
          setNotesStatus(error ?? response?.error ?? "Couldn't save that note.");
          sendResponse({ ok: false });
          return;
        }
        celebrateSavedNote();
        sendResponse({ ok: true });
      });
      return true;
    },
  );
}

function renderSoundToggle(): void {
  soundToggleButton.setAttribute("aria-checked", String(pupSoundsMuted));
  soundToggleButton.setAttribute("aria-label", pupSoundsMuted ? "Unmute pup" : "Mute pup");
  soundToggleLabel.textContent = pupSoundsMuted ? "Unmute pup" : "Mute pup";
  container.classList.toggle("is-muted", pupSoundsMuted);
}

function initSoundControls(): void {
  soundToggleButton.addEventListener("click", () => {
    const previousValue = pupSoundsMuted;
    pupSoundsMuted = !pupSoundsMuted;
    renderSoundToggle();
    setLocalSettings({ [SOUND_MUTED_STORAGE_KEY]: pupSoundsMuted }, (error) => {
      if (!error) return;
      pupSoundsMuted = previousValue;
      renderSoundToggle();
      setNotesStatus(error);
    });
  });

  soundToggleButton.disabled = true;
  getLocalSettings(SOUND_MUTED_STORAGE_KEY, (items, error) => {
    soundToggleButton.disabled = false;
    soundPreferenceLoaded = true;
    if (!error) pupSoundsMuted = items[SOUND_MUTED_STORAGE_KEY] === true;
    renderSoundToggle();
    if (welcomeSoundPending) {
      welcomeSoundPending = false;
      if (!pupSoundsMuted) playWelcomeBark();
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    const change = changes[SOUND_MUTED_STORAGE_KEY];
    if (areaName !== "local" || !change) return;
    soundPreferenceLoaded = true;
    pupSoundsMuted = change.newValue === true;
    renderSoundToggle();
  });
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
    positionNotesPopups();
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
    container.classList.remove("dragging");
  });
}

// ── Pup greeting ──────────────────────────────────────────────────────────────
function initPupGreeting(): void {
  svg.addEventListener("pointerenter", () => svg.classList.add("petting"), { passive: true });
  svg.addEventListener("pointerleave", () => svg.classList.remove("petting"), { passive: true });
}

// ── Mount ─────────────────────────────────────────────────────────────────────
function showConsentPrompt(message = ""): void {
  consentStatus.textContent = message;
  consentOverlay.hidden = false;
  enableNotesButton.hidden = true;
  welcomePup();
  consentEnableButton.focus();
}

function dismissConsentPrompt(): void {
  consentOverlay.hidden = true;
  enableNotesButton.hidden = false;
  optionsButton.focus();
  setLocalSettings({ [CONSENT_STORAGE_KEY]: CONSENT_DECLINED }, (error) => {
    if (error) {
      enableNotesButton.title = error;
    }
  });
}

function enableNoteSaving(): void {
  if (noteSavingInitialized) return;
  noteSavingInitialized = true;
  hasNoteSavingConsent = true;
  enableNotesButton.hidden = true;
  consentOverlay.hidden = true;
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
    setLocalSettings({ [CONSENT_STORAGE_KEY]: CONSENT_VERSION }, (error) => {
      consentEnableButton.disabled = false;
      if (error) {
        consentStatus.textContent = `${error} Note saving remains off until your choice is saved.`;
        return;
      }
      enableNoteSaving();
    });
  });

  getLocalSettings(CONSENT_STORAGE_KEY, (items, error) => {
    if (error) {
      showConsentPrompt("I couldn't read your saved choice. Please choose whether to enable note saving.");
      return;
    }
    if (items[CONSENT_STORAGE_KEY] === CONSENT_VERSION) {
      enableNoteSaving();
      return;
    }
    if (items[CONSENT_STORAGE_KEY] === CONSENT_DECLINED) {
      enableNotesButton.hidden = false;
      return;
    }
    showConsentPrompt();
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    const change = changes[CONSENT_STORAGE_KEY];
    if (areaName === "local" && change?.newValue === CONSENT_VERSION) enableNoteSaving();
  });
}

function mount(): void {
  container = createPuppy();
  document.body.appendChild(container);

  svg    = container.querySelector("#sus-pup-svg") as SVGElement;
  optionsButton = container.querySelector("#sus-pup-options-button") as HTMLButtonElement;
  optionsMenu = container.querySelector("#sus-pup-options-menu") as HTMLDivElement;
  enableNotesButton = container.querySelector("#sus-pup-enable-notes") as HTMLButtonElement;
  consentOverlay = container.querySelector("#sus-pup-consent-overlay") as HTMLDivElement;
  consentStatus = container.querySelector("#sus-pup-consent-status") as HTMLElement;
  consentEnableButton = container.querySelector("#sus-pup-consent-enable") as HTMLButtonElement;
  consentNotNowButton = container.querySelector("#sus-pup-consent-not-now") as HTMLButtonElement;
  seeNotesButton = container.querySelector("#sus-pup-see-notes") as HTMLButtonElement;
  soundToggleButton = container.querySelector("#sus-pup-toggle-sound") as HTMLButtonElement;
  soundToggleLabel = container.querySelector("#sus-pup-sound-label") as HTMLSpanElement;
  savedStatus = container.querySelector("#sus-pup-save-status") as HTMLElement;
  linkNotesFileButton = container.querySelector("#sus-pup-link-notes-file") as HTMLButtonElement;
  notebookPanel = container.querySelector("#sus-pup-notebook") as HTMLElement;
  closeNotesButton = container.querySelector("#sus-pup-close-notes") as HTMLButtonElement;
  notesContent = container.querySelector("#sus-pup-notes-content") as HTMLElement;
  notesStatus = container.querySelector("#sus-pup-notes-status") as HTMLElement;
  notesSearchInput = container.querySelector("#sus-pup-notes-search") as HTMLInputElement;

  initPupGreeting();
  initDrag();
  initNotesControls();
  initSoundControls();
  initConsentGate();

}

// Wait for body
if (document.body) {
  mount();
} else {
  document.addEventListener("DOMContentLoaded", mount);
}
