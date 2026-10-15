# Research Helper Pup

A draggable Chrome research companion that checks destination URLs on supported search pages and hovered links, and saves selected passages to a local notebook. Search-result checks do not assess relevance, scroll to, or highlight a result.

## What it does

- On a Google, Bing, or DuckDuckGo results page, it checks up to 12 result destination URLs with the extension's existing safety checker.
- It does not read the submitted query, result titles, or snippets, and does not assess relevance or scroll to or circle a result. Search-result safety warnings still appear in the pup’s text box.
- The pup stays where it is placed and can be dragged. On other pages, the existing link-hover safety check remains available without moving the pup.
- Use the three-dot menu to mute or unmute all pup sounds. The setting is saved in the current Chrome profile; text messages and animations continue while muted.
- If the visible tab has no mouse, keyboard, or scroll activity for 10 minutes, the pup checks in with “Did you die?” and “Where are you?” in rotation. Activity restarts the timer; while idle, it checks in again every 10 minutes. Each message stays visible for 10 seconds.
- It does not read text typed in Chrome's address bar or the submitted search query.
- Select text on a webpage and press **Ctrl+Shift+Y** to save it with the page title, source link, and save time. On macOS, the suggested shortcut is **Command+Shift+Y**. The shortcut can be changed at `chrome://extensions/shortcuts`.
- Click the three-dot button beside the pup and choose **See notes** to open the notebook. Notes are stored locally in Chrome and are not sent to an external service or synced to other devices. Removing the extension clears its local notes.
- Use the small trash icon beside any saved note to delete that note.
- From **See notes**, choose **Connect a local .txt file** if you also want a readable file on your device. Chrome asks you to choose where to create or keep it. New notes and deletions are copied there while Chrome has file permission. The notebook in Chrome remains the main copy; reconnect the file from the opened settings page if Chrome asks for permission again. Hand edits to the text file may be overwritten when the extension updates it. Disconnecting the file does not delete it.

The shortcut saves selected text from ordinary webpages. Chrome-restricted pages, such as its own settings pages, do not run extension content scripts and cannot be captured.

## Privacy and release preparation

The extension processes search-result and hovered-link URLs, plus passages the user explicitly saves. Processing and notebook storage stay on the device. It does not send page or note data to an external service. See the [privacy policy](https://github.com/Nebula-03/research-helper-pup-support/blob/main/PRIVACY.md) for data-handling details and [PRE-PUBLISH.md](PRE-PUBLISH.md) for the release checklist. For help, [open an issue in the support repo](https://github.com/Nebula-03/research-helper-pup-support/issues); issues are public, so do not include private notes, personal information, or sensitive URLs.

## Build and load

Install the listed development dependencies, run `npm run build`, then load the generated `dist` folder as an unpacked extension from `chrome://extensions` with Developer mode enabled.
