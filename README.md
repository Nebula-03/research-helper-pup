# Research Helper Pup

A draggable Chrome companion for saving useful passages as local research notes.

## How to save a note

1. Select the text you want to keep on a webpage.
2. Press **Ctrl+Shift+Y** (on Mac, **Command+Shift+Y**).
3. Open the pup menu (**⋯ → See notes**) to find, search, copy, or delete your notes.

Notes are saved in this Chrome profile on your device, with the page title, web address, and save time. To also keep a readable `.txt` copy on your computer, open **See notes → Connect a local .txt file**. When connected and permitted by Chrome, the file is updated when notes are saved or deleted. Chrome may ask you to reconnect the file later.

The shortcut can be changed at `chrome://extensions/shortcuts`. Chrome-restricted pages, such as its own settings pages, cannot be captured.

## The pup

- The pup appears automatically on webpages and can be dragged.
- On first use, it greets you and shows the three steps above. Choose **Start saving notes** to enable saving, or **Not now** to decide later from **⋯ → Enable note saving**.
- When a note saves, the pup woofs and celebrates. Use **Mute pup** to silence the woof and stop tail wagging; unmuting restores both. This setting is saved in your Chrome profile.

## Privacy

The extension does not check links. It only captures selected text, the page title, web address, and save time when you use the shortcut. Notes are stored in Chrome on your device and are not sent to the developer or an external service. If you connect a `.txt` file, notes are also written to the file you chose. The pup appears across websites, so Chrome asks for broad site access.

See the [privacy policy](https://github.com/Nebula-03/research-helper-pup-support/blob/main/PRIVACY.md) for details and [PRE-PUBLISH.md](PRE-PUBLISH.md) for the release checklist. For help, [open an issue in the support repo](https://github.com/Nebula-03/research-helper-pup-support/issues); issues are public, so do not include private notes or personal information.

## Build and load

Install the listed development dependencies, run `npm run build`, then load the generated `dist` folder as an unpacked extension from `chrome://extensions` with Developer mode enabled.
