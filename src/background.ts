import { getNotesFileHandle, removeNotesFileHandle, writeNotesToFile } from "./shared/notes-file";
import type {
  DeleteNoteMessage,
  GetNotesFileStatusMessage,
  GetNotesMessage,
  NotesFileStatusResponse,
  NotesResponse,
  OpenNotesFilePageMessage,
  ResearchNote,
  SyncNotesFileMessage,
  StoreNoteMessage,
  UnlinkNotesFileMessage,
} from "./shared/messages";

const NOTES_STORAGE_KEY = "researchHelperNotes";

chrome.runtime.onMessage.addListener(
  (
    message: StoreNoteMessage | GetNotesMessage | DeleteNoteMessage |
      OpenNotesFilePageMessage | GetNotesFileStatusMessage | SyncNotesFileMessage | UnlinkNotesFileMessage,
    sender,
    sendResponse,
  ) => {
    const fromContentScript = sender.id === chrome.runtime.id && sender.tab?.id !== undefined;
    const fromNotesPage = sender.id === chrome.runtime.id &&
      sender.url === chrome.runtime.getURL("notes/index.html");
    if (!fromContentScript && !fromNotesPage) return false;

    if (message.type === "OPEN_NOTES_FILE_PAGE") {
      if (!fromContentScript) return false;
      chrome.tabs.create({ url: chrome.runtime.getURL("notes/index.html") }, (tab) => {
        if (chrome.runtime.lastError || tab.id === undefined) {
          sendResponse({ ok: false, error: "Could not open the local text file settings." });
          return;
        }
        sendResponse({ ok: true });
      });
      return true;
    }

    if (message.type === "GET_NOTES_FILE_STATUS") {
      if (!fromNotesPage) return false;
      void getNotesFileHandle().then(async (handle) => {
        if (!handle) {
          sendResponse({ ok: true, linked: false } satisfies NotesFileStatusResponse);
          return;
        }
        const permission = await handle.queryPermission({ mode: "readwrite" });
        sendResponse({ ok: true, linked: true, name: handle.name, permission } satisfies NotesFileStatusResponse);
      }).catch(() => {
        sendResponse({ ok: false, error: "Could not read the linked text file setting." } satisfies NotesFileStatusResponse);
      });
      return true;
    }

    if (message.type === "SYNC_NOTES_FILE") {
      if (!fromNotesPage) return false;
      void syncNotesFileFromStorage().then(sendResponse);
      return true;
    }

    if (message.type === "UNLINK_NOTES_FILE") {
      if (!fromNotesPage) return false;
      void removeNotesFileHandle().then(() => {
        sendResponse({ ok: true });
      }).catch(() => {
        sendResponse({ ok: false, error: "Could not unlink the text file." });
      });
      return true;
    }

    if (!fromContentScript) return false;

    if (message.type === "STORE_NOTE") {
      if (!isValidNote(message.note)) {
        sendResponse({ ok: false, error: "This note could not be saved." } satisfies NotesResponse);
        return false;
      }

      chrome.storage.local.get(NOTES_STORAGE_KEY, (stored) => {
        if (chrome.runtime.lastError) {
          sendResponse({ ok: false, error: "Could not open the notes notebook." } satisfies NotesResponse);
          return;
        }
        const existing = Array.isArray(stored[NOTES_STORAGE_KEY])
          ? stored[NOTES_STORAGE_KEY] as ResearchNote[]
          : [];
        chrome.storage.local.set({ [NOTES_STORAGE_KEY]: [message.note, ...existing] }, () => {
          if (chrome.runtime.lastError) {
            sendResponse({ ok: false, error: "The notebook storage limit was reached." } satisfies NotesResponse);
            return;
          }
          sendResponse({ ok: true } satisfies NotesResponse);
        });
      });
      return true;
    }

    if (message.type === "GET_NOTES") {
      chrome.storage.local.get(NOTES_STORAGE_KEY, (stored) => {
        if (chrome.runtime.lastError) {
          sendResponse({ ok: false, error: "Could not open the notes notebook." } satisfies NotesResponse);
          return;
        }
        const notes = Array.isArray(stored[NOTES_STORAGE_KEY])
          ? stored[NOTES_STORAGE_KEY] as ResearchNote[]
          : [];
        sendResponse({ ok: true, notes } satisfies NotesResponse);
      });
      return true;
    }

    if (message.type === "DELETE_NOTE") {
      if (typeof message.noteId !== "string" || !message.noteId || message.noteId.length > 100) {
        sendResponse({ ok: false, error: "This note could not be deleted." } satisfies NotesResponse);
        return false;
      }

      chrome.storage.local.get(NOTES_STORAGE_KEY, (stored) => {
        if (chrome.runtime.lastError) {
          sendResponse({ ok: false, error: "Could not open the notes notebook." } satisfies NotesResponse);
          return;
        }
        const existing = Array.isArray(stored[NOTES_STORAGE_KEY])
          ? stored[NOTES_STORAGE_KEY] as ResearchNote[]
          : [];
        const remaining = existing.filter((note) => note.id !== message.noteId);
        chrome.storage.local.set({ [NOTES_STORAGE_KEY]: remaining }, () => {
          if (chrome.runtime.lastError) {
            sendResponse({ ok: false, error: "The note could not be deleted from storage." } satisfies NotesResponse);
            return;
          }
          sendResponse({ ok: true } satisfies NotesResponse);
        });
      });
      return true;
    }

    return false;
  }
);

let notesFileSyncQueue: Promise<void> = Promise.resolve();

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes[NOTES_STORAGE_KEY]) return;
  const notes = Array.isArray(changes[NOTES_STORAGE_KEY].newValue)
    ? changes[NOTES_STORAGE_KEY].newValue as ResearchNote[]
    : [];
  notesFileSyncQueue = notesFileSyncQueue
    .then(() => writeCurrentNotesToLinkedFile(notes))
    .catch(() => {
      // The Chrome notebook remains the source of truth if the optional file cannot be written.
    });
});

async function syncNotesFileFromStorage(): Promise<NotesFileStatusResponse> {
  try {
    const stored = await chrome.storage.local.get(NOTES_STORAGE_KEY);
    const notes = Array.isArray(stored[NOTES_STORAGE_KEY])
      ? stored[NOTES_STORAGE_KEY] as ResearchNote[]
      : [];
    const handle = await getNotesFileHandle();
    if (!handle) return { ok: false, linked: false, error: "Choose a text file first." };

    const permission = await handle.queryPermission({ mode: "readwrite" });
    if (permission !== "granted") {
      return {
        ok: false,
        linked: true,
        name: handle.name,
        permission,
        error: "Click Reconnect and update to let Chrome write to this file again.",
      };
    }

    await writeNotesToFile(handle, notes);
    return { ok: true, linked: true, name: handle.name, permission };
  } catch {
    return { ok: false, error: "Could not update the linked text file. Your Chrome notebook is still saved." };
  }
}

async function writeCurrentNotesToLinkedFile(notes: ResearchNote[]): Promise<void> {
  try {
    const handle = await getNotesFileHandle();
    if (!handle || await handle.queryPermission({ mode: "readwrite" }) !== "granted") return;
    await writeNotesToFile(handle, notes);
  } catch {
    // File access is optional; note save and deletion still succeed in chrome.storage.local.
  }
}

function isValidNote(value: ResearchNote): boolean {
  if (!value || typeof value !== "object") return false;
  if (typeof value.id !== "string" || typeof value.text !== "string" || !value.text.trim()) return false;
  if (typeof value.pageTitle !== "string" || !Number.isFinite(value.createdAt)) return false;
  try {
    const url = new URL(value.url);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

chrome.commands.onCommand.addListener((command) => {
  if (command !== "save-selected-note") return;
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) return;
    const tabId = tabs[0]?.id;
    if (tabId === undefined) return;
    chrome.tabs.sendMessage(tabId, { type: "CAPTURE_SELECTION" }, () => {
      // A missing receiver means the active tab is a restricted Chrome page.
      void chrome.runtime.lastError;
    });
  });
});
