# Chrome Web Store listing — draft

Review and edit before submission. Keep the data-handling disclosure visible in the final listing and complete the Dashboard privacy declarations to match the actual build.

## Name

Research Helper Pup

## Short description

A local research companion that checks search-result links and saves selected passages to your notebook.

## Single-purpose description

Research Helper Pup supports web research by checking search-result destination URLs and hovered-link URLs for safety warning signs, then saving passages the user selects into a local notebook.

## Prominent data-handling disclosure

Before processing page information, the extension asks you to enable these features. After you enable them, it checks up to 12 result destination URLs for safety on Google, Bing, and DuckDuckGo pages. It does not read your submitted search query, result titles, or snippets, assess relevance, or scroll to and highlight a result. On other pages, it checks a link destination URL when you hover over it. Only when you use the Notes shortcut, it captures your selected text with that page’s title, URL, and save time. This processing stays on your device. Notes, your consent choice, and the pup’s sound mute setting are stored in your current Chrome profile. If you choose to connect a `.txt` file, the extension remembers that local file connection and writes notes to the file at the location you select. The extension does not read text typed in Chrome’s address bar or send this information to the developer or an external service. Choosing **Not now** keeps these page-data features off; you can reopen the choice from the pup’s options menu.

## Feature details

- Link checks use bundled heuristics and a bundled blocklist. They are not a substitute for browser protections or careful judgment.
- Notes stay in the Chrome profile unless you opt into the separate local text file. The page-data features do not run until the user enables them in the first-use prompt.
- Chrome may require you to reconnect the text file before it can write after a browser restart or permission change.

## Permission rationale

- **Storage:** needed to keep the local notebook.
- **All websites:** needed to show the pup; after consent, to check hovered-link destinations on ordinary pages and result destinations on supported search pages; and when the user saves a selected passage.

## Privacy policy and support

- Privacy policy: [Research Helper Pup Privacy Policy](https://github.com/Nebula-03/research-helper-pup-support/blob/main/PRIVACY.md)
- Support: [GitHub Issues](https://github.com/Nebula-03/research-helper-pup-support/issues). Issues are public; users should not include private notes, personal information, or sensitive search terms or URLs.

## Store screenshots prepared

These five screenshots are genuine extension screens supplied during testing. They were cropped to the Store aspect ratio and exported as 1280x800, 24-bit PNG files:

1. `store-assets/store-ready-2026-10-15/01-search-results-pup.png` — search page with the pup.
2. `store-assets/store-ready-2026-10-15/02-note-saved.png` — note-saved confirmation.
3. `store-assets/store-ready-2026-10-15/03-sound-menu.png` — options menu with sound control.
4. `store-assets/store-ready-2026-10-15/04-delete-note.png` — notebook delete control.
5. `store-assets/store-ready-2026-10-15/05-local-text-file.png` — optional local text-file settings.

## Listing submission fields still needed

- Upload the five prepared screenshots from `store-assets/store-ready-2026-10-15/` (1280x800, 24-bit PNG).
- Complete the Chrome Web Store Dashboard privacy declarations so they match the disclosures above and the final code.
