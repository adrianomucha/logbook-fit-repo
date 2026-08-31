# Home-screen install guide (PDF)

Source for `public/install-guide.pdf` — a printable, on-brand guide that walks
users through pinning Logbook to their home screen on iPhone (Safari) and
Android (Chrome), with a QR code to logbook.fit.

The deployed PDF is served at `https://logbook.fit/install-guide.pdf`.

## Regenerating the PDF

Edit `install-guide.html`, then print it with headless Chromium:

```sh
cd docs/install-guide
chromium --headless=new --disable-gpu --no-pdf-header-footer \
  --print-to-pdf=../../public/install-guide.pdf install-guide.html
```

Notes:

- The page is A4 with `@page { margin: 0 }`; all layout lives in the HTML.
- Fonts are self-contained: latin subsets of IBM Plex Sans (variable, 100–700)
  and IBM Plex Mono (400/500) in `fonts/`, so no network is needed to render.
- `qr.svg` encodes `https://logbook.fit`. Regenerate with the `qrcode` Python
  package if the URL ever changes.
- Brand tokens match the app: ink `#17180F`, paper `#F4F5EC`, volt `#C9F53B`
  (see `src/app/icon.svg` and `--brand` in `src/app/globals.css`).
