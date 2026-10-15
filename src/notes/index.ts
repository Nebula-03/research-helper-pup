import { getNotesFileHandle, removeNotesFileHandle, saveNotesFileHandle } from "../shared/notes-file";
import type { WritableNotesFileHandle } from "../shared/notes-file";
import type {
  GetNotesFileStatusMessage,
  NotesFileStatusResponse,
  SyncNotesFileMessage,
  UnlinkNotesFileMessage,
} from "../shared/messages";

interface SavePickerWindow extends Window {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: Array<{ description: string; accept: Record<string, string[]> }>;
  }) => Promise<WritableNotesFileHandle>;
}

const statusText = document.querySelector<HTMLParagraphElement>("#file-status")!;
const chooseButton = document.querySelector<HTMLButtonElement>("#choose-file")!;
const reconnectButton = document.querySelector<HTMLButtonElement>("#reconnect-file")!;
const unlinkButton = document.querySelector<HTMLButtonElement>("#unlink-file")!;
let linkedFileHandle: WritableNotesFileHandle | null = null;

function send<T>(message: object): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: T | undefined) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message ?? "The extension could not respond."));
        return;
      }
      if (response === undefined) {
        reject(new Error("The extension did not return a response."));
        return;
      }
      resolve(response);
    });
  });
}

function setBusy(busy: boolean): void {
  chooseButton.disabled = busy;
  reconnectButton.disabled = busy;
  unlinkButton.disabled = busy;
}

function showLinkedStatus(response: NotesFileStatusResponse): void {
  if (!response.ok) {
    statusText.textContent = response.error ?? "Could not check the file connection.";
    return;
  }
  if (!response.linked) {
    statusText.textContent = "No text file is connected. Your notes are still saved in Chrome.";
    reconnectButton.hidden = true;
    unlinkButton.hidden = true;
    return;
  }

  statusText.textContent = response.permission === "granted"
    ? `Connected to “${response.name}”. Updates will be copied when notes are saved or deleted.`
    : `“${response.name}” is remembered, but Chrome needs permission before it can update the file.`;
  reconnectButton.hidden = response.permission === "granted";
  unlinkButton.hidden = false;
}

async function refreshStatus(): Promise<void> {
  statusText.textContent = "Checking…";
  try {
    linkedFileHandle = await getNotesFileHandle();
    const request: GetNotesFileStatusMessage = { type: "GET_NOTES_FILE_STATUS" };
    const response = await send<NotesFileStatusResponse>(request);
    showLinkedStatus(response);
  } catch (error) {
    statusText.textContent = error instanceof Error ? error.message : "Could not check the file connection.";
  }
}

chooseButton.addEventListener("click", async () => {
  const pickerWindow = window as SavePickerWindow;
  if (!pickerWindow.showSaveFilePicker) {
    statusText.textContent = "This Chrome version does not support choosing a text file here. Your Chrome notebook still works.";
    return;
  }

  // Open the picker directly from this click so Chrome sees a user gesture.
  let pickerPromise: Promise<WritableNotesFileHandle>;
  try {
    pickerPromise = pickerWindow.showSaveFilePicker({
      suggestedName: "Research Helper Pup Notes.txt",
      types: [{ description: "Text file", accept: { "text/plain": [".txt"] } }],
    });
  } catch (error) {
    statusText.textContent = error instanceof Error ? error.message : "Could not open the file picker.";
    return;
  }

  setBusy(true);
  statusText.textContent = "Choose where to keep your notes file…";
  try {
    const handle = await pickerPromise;
    linkedFileHandle = handle;
    await saveNotesFileHandle(handle);
    const syncRequest: SyncNotesFileMessage = { type: "SYNC_NOTES_FILE" };
    const response = await send<NotesFileStatusResponse>(syncRequest);
    showLinkedStatus(response);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      statusText.textContent = "No file was selected. Your Chrome notebook is unchanged.";
    } else {
      statusText.textContent = error instanceof Error ? error.message : "Could not connect the text file.";
    }
  } finally {
    setBusy(false);
  }
});

reconnectButton.addEventListener("click", async () => {
  const handle = linkedFileHandle;
  if (!handle) {
    await refreshStatus();
    return;
  }

  setBusy(true);
  statusText.textContent = "Asking Chrome to reconnect to the file…";
  try {
    const permissionPromise = handle.requestPermission({ mode: "readwrite" });
    const permission = await permissionPromise;
    if (permission !== "granted") {
      statusText.textContent = "Chrome did not grant write access. Your notes remain in the Chrome notebook.";
      return;
    }
    const syncRequest: SyncNotesFileMessage = { type: "SYNC_NOTES_FILE" };
    showLinkedStatus(await send<NotesFileStatusResponse>(syncRequest));
  } catch (error) {
    statusText.textContent = error instanceof Error ? error.message : "Could not reconnect to the file.";
  } finally {
    setBusy(false);
  }
});

unlinkButton.addEventListener("click", async () => {
  setBusy(true);
  try {
    const request: UnlinkNotesFileMessage = { type: "UNLINK_NOTES_FILE" };
    const response = await send<NotesFileStatusResponse>(request);
    linkedFileHandle = null;
    statusText.textContent = response.ok
      ? "Disconnected. The text file was left on your device, and your Chrome notebook is unchanged."
      : response.error ?? "Could not disconnect the text file.";
    await refreshStatus();
  } catch (error) {
    statusText.textContent = error instanceof Error ? error.message : "Could not disconnect the text file.";
  } finally {
    setBusy(false);
  }
});

void refreshStatus();
