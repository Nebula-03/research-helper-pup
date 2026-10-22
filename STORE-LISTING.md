# Chrome Web Store listing — draft

Review this draft before submitting. Keep the data-handling disclosure and Dashboard privacy declarations aligned with the final build.

## Name

Research Helper Pup

## Short description

A friendly pup that helps you save selected text as local research notes.

## Single-purpose description

Research Helper Pup lets you save passages you select on webpages, then search, copy, and manage them in a local notebook. You can optionally connect a `.txt` file on your device to keep a readable copy of your notes.

## Prominent data-handling disclosure

Chrome asks for access to all websites so the pup can appear automatically and save text from the page when you use its shortcut. The extension does not check or inspect link destinations. Only when you press **Ctrl+Shift+Y** (or **Command+Shift+Y** on Mac), it saves the text you selected, the page title, page URL, and save time in this Chrome profile on your device. Notes are not sent to the developer or an external service. If you connect a `.txt` file, the extension writes the notebook to the file you choose when Chrome allows it. The pup’s sound setting is also stored in the current Chrome profile.

## Feature details

- Select a passage on a webpage and use the keyboard shortcut to save it with its source title, URL, and time.
- Open the pup’s notebook to search, copy, or delete saved notes.
- Notes remain in local Chrome storage. Connecting a `.txt` file is optional; the file you choose is updated with the current notebook as notes are saved or deleted.
- On first use, a short guide explains the workflow and asks whether to enable note saving. Choosing **Not now** leaves note capture disabled; the user can reopen the guide from **Enable note saving** in the pup menu.
- **Mute pup** silences woofs and stops tail wagging. The preference stays in the current Chrome profile.
- The extension does not check links, collect browsing history, or send notes to a server.

## Permission rationale

- **Storage:** needed to keep the local notebook, consent choice, and pup sound setting.
- **All websites:** needed to show the pup automatically on webpages and capture the selected passage, page title, URL, and save time when the user invokes the Notes shortcut.
- **Local text file:** requested only when the user chooses a `.txt` file to keep a readable copy of the notebook.

## Privacy policy and support

- Privacy policy: [Research Helper Pup Privacy Policy](https://github.com/Nebula-03/research-helper-pup-support/blob/main/PRIVACY.md)
- Support: [GitHub Issues](https://github.com/Nebula-03/research-helper-pup-support/issues). Issues are public; users should not include private notes or personal information.

## Store screenshots

The prepared October 15 screenshots show the retired link-checking bubble and are no longer accurate. Recapture genuine 1280x800 screenshots of the note-saving flow, first-use guide, notebook, local text-file settings, and mute control before submitting this update. Do not upload the old screenshots as though they show the current version.

## Listing submission fields still needed

- Upload current screenshots that match the note-only build.
- Update the Chrome Web Store Dashboard privacy declarations and public privacy policy to describe only the final note-saving behavior.
- Verify the broad site-access explanation in the listing matches the automatic pup behavior and Chrome’s permission prompt.
