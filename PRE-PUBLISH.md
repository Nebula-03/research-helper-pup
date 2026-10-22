# Before publishing Research Helper Pup

Version 0.1.0 was published to the Chrome Web Store on October 16, 2026. Version 0.2.0 is now a note-saving-focused update. Complete the real-Chrome checks and refresh the public disclosures before submitting it.

## Release decisions and assets

- [x] Create the public support repository and GitHub Issues contact: https://github.com/Nebula-03/research-helper-pup-support/issues. Monitor new issues and remind users that they are public.
- [x] Host the privacy policy: https://github.com/Nebula-03/research-helper-pup-support/blob/main/PRIVACY.md. The public copy still needs to be updated to match this note-only build before submission.
- [x] Add the extension icon assets and manifest references. Source art is icons/pup.svg; PNG sizes are 16, 48, and 128.
- [x] Create the 440x280 promotional tile draft at store-assets/research-helper-pup-small-tile.png.
- [ ] Replace the old store screenshots: they show the retired URL-checking bubble. Capture the first-use guide, note saving, notebook, text-file settings, and mute behavior at 1280x800.
- [ ] Update the Chrome Web Store Dashboard privacy declarations and prominent disclosure to describe only selected text and its source details being saved when the user presses the shortcut.
- [x] Keep the pup visible automatically on webpages. The broad site-access prompt is still needed for automatic display and selected-text capture.

## Checks to complete with a real Chrome profile

- Install or load the release build on a fresh profile. Confirm the pup appears automatically, greets the user, attempts its woof, and shows the three-step guide. Chrome may block audio until a user gesture; confirm the fallback works.
- Read the note-only consent copy. Choose **Not now** and confirm the pup menu offers **Enable note saving**; reopen the guide and enable saving.
- Select text on a normal webpage, press **Ctrl+Shift+Y**, and confirm the note is saved with page title, URL, and time. Confirm the pup woofs and celebrates without showing a text bubble.
- Open the notebook, search by note text and source title, copy a note, delete a note, and confirm the notebook remains saved after reloading Chrome.
- Connect a `.txt` file, save and delete notes, and confirm the file mirrors the notebook. Revoke or let file permission expire and confirm notes still save in Chrome and the reconnect action works.
- Use **Mute pup** and confirm it silences woofs and stops tail wagging, including when hovering to pet it. Unmute and confirm sound and wagging return. Confirm the choice persists after reloading.
- Confirm link hovering and Google, Bing, and DuckDuckGo search pages no longer trigger URL checks or pup warning messages. Confirm there are no recurring idle messages.
- Check dragging, menu and notebook placement near each screen corner, and restricted Chrome pages. Confirm unavailable content scripts do not cause uncaught errors.
- Reproduce the earlier “Extension context invalidated” report by reloading the extension. Refresh an already-open page and confirm note capture reconnects.

## Build and release notes

- The `esbuild` dependency is updated to `0.28.2`; the current `npm audit` result was zero vulnerabilities.
- `node_modules/` and generated `dist/` are ignored by Git. Run `npm run build:release` before creating the store ZIP.
- The store ZIP must contain the contents of `dist/` at its root, including `manifest.json`, not a parent `dist/` folder.
- Review the Chrome Web Store ZIP contents and confirm it contains only production extension files, with no source maps, `.env` files, personal notes, or local machine data.
- The local `PRIVACY.md` is intentionally ignored by Git. Update the separate public support-repository policy manually, then recheck the Dashboard privacy declarations against the final build before submission.
