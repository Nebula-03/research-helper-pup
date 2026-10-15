# Before publishing Research Helper Pup

This checklist records release preparation for Research Helper Pup. Version 0.1.0 was submitted to the Chrome Web Store on October 15, 2026 and is pending review.

## Remaining release decisions and assets

- [x] Create the public support repository and GitHub Issues contact: https://github.com/Nebula-03/research-helper-pup-support/issues. Monitor new issues and remind users that they are public.
- [x] Host the privacy policy: https://github.com/Nebula-03/research-helper-pup-support/blob/main/PRIVACY.md. Keep it synchronized with the final extension behavior.
- [x] Add the extension icon assets and manifest references. Source art is icons/pup.svg; PNG sizes are 16, 48, and 128.
- [x] Submitted the listing and Dashboard privacy declarations for consent-gated, on-device checks of search-result and hovered-link URLs, and passages saved by the user. Search queries, result titles, and snippets are not read.
- [x] Create the 440x280 promotional tile draft at store-assets/research-helper-pup-small-tile.png.
- [x] Prepare five genuine current-extension screenshots at 1280x800 in `store-assets/store-ready-2026-10-15/`.
- [x] Add a first-run consent prompt before search-result review, hovered-link checks, or selected-text capture. **Not now** keeps those features off and lets the user reopen the choice from the pup menu.

## Checks to complete with a real Chrome profile

- Load the production `dist` build and check the core pup behavior on supported search pages and ordinary websites.
- Reproduce the earlier `Extension context invalidated` report by reloading the extension, then refresh the affected page. Confirm that the error does not return during normal use.
- Test sound after a user gesture and check that blocked autoplay does not break the rest of the pup.
- Use the pup’s three-dot menu to mute and unmute sounds; confirm the choice persists after reloading the extension and text/animations continue while muted.
- Save several notes, close and reopen Chrome, delete one note, and confirm the notebook persists.
- Connect a `.txt` file, save and delete notes, and confirm the file mirrors both changes. Revoke or let file permission expire and confirm notes still save in Chrome and the reconnect action works.
- Check message placement at all screen corners, drag behavior, the 10-minute idle messages, and search-result URL safety warnings on Google, Bing, and DuckDuckGo. Confirm URL checks do not assess relevance, scroll the page, or highlight a result.
- Try restricted Chrome pages and confirm the extension handles unavailable content scripts without an uncaught error.

## Build, dependency, and repository notes

- The `esbuild` dependency is now updated to `0.28.2`; the current `npm audit` result was zero vulnerabilities.
- `node_modules/` and generated `dist/` are ignored by Git. Keep the source files in GitHub; run `npm run build:release` before creating the store ZIP.
- The store ZIP must contain the contents of `dist/` at its root, including `manifest.json`, not a parent `dist/` folder.
- Review the Chrome Web Store ZIP contents and confirm it contains only the production extension files, with no source maps, `.env` files, personal notes, or local machine data.
- Recheck `PRIVACY.md` against the final code before copying its updated text to the public support repository and entering the Chrome Web Store privacy declarations. The public copy needs to match these local changes before submission.
