# Reading Log

A cozy, simple reading tracker that runs in your phone's browser and installs to your home screen like an app.

You open it to a 3D study at night. A black leather armchair sits in the corner with a footstool, a bookshelf lines one wall, and a brick fireplace burns on the other. A nightstand beside the chair holds an oil lamp, a steaming mug and your current reads. Drag to look around; tap things to get around:

| Tap… | Opens |
| --- | --- |
| **The bookshelf** | Every book you've finished, as spines on wooden shelves (their titles are painted on the 3D spines too; tap one to open it). Filter by year, or **Earlier** for older reads with no date. |
| **The books on the nightstand** | Your current reads — as many as you're rotating through. Each has a paper notebook: enter the pages you read (today's date is filled in for you) and add bulleted notes. Tabs at the top switch between books. |
| **The fireplace** | Stats and goals: streaks, pages, books this year, a reading heatmap, pages per month, levels and achievements. |

The room changes with your reading. Finished books fill the shelf, current reads stack on the nightstand, and **the fire grows the longer your streak runs.**

## Adding books you read in the past

Tap **＋** on the bookshelf. Under *When did you read it?* leave **Don't remember** selected and the book goes on your shelf without counting toward any year's goal. Use **Save & add another** to enter a backlog quickly. If you'd already added older books that picked up today's date, the shelf offers to move them to **Earlier** in one tap.

## Gamified bits

- **Streaks.** One day counts if you log any pages. Your streak stays alive until the end of the next day.
- **Daily page goal** and **yearly book goal**, both editable, with an ahead/behind pace indicator.
- **XP and levels**, from *Curious Browser* up to *Legend of Alexandria*. You earn 1 XP per page, 10 per reading day and 100 per finished book.
- **22 achievements**, including Kindling, Week of Embers, Centurion (100 pages in one day), Doorstopper (finish a 600+ page book), Night Owl and more.

## Using it on your phone

The app is a static site, so GitHub Pages can host it for free:

1. On GitHub, open the repository and go to **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**, pick the branch with this code and the `/ (root)` folder, then click **Save**.
3. After a minute your app is live at `https://<your-username>.github.io/Reading_Log/`.
4. Open that link on your phone:
   - **iPhone (Safari):** Share → **Add to Home Screen**
   - **Android (Chrome):** ⋮ → **Install app** (or **Add to Home screen**)

It then opens full-screen like a native app and works offline.

### Your data

Everything is stored **on your device** (in the browser's local storage). No account is needed and nothing is uploaded. Because of that:

- Use **⚙ Settings → Export a backup** now and then. Restore it from the same menu on a new phone.
- Clearing your browser's site data erases the log.

Want to look around first? With an empty log, **⚙ Settings → Fill with sample data** loads a small example library. Erase it from the same menu when you're ready to start for real.

## The 3D room

The room is rendered with [three.js](https://threejs.org) (vendored in `vendor/three`, MIT). Furniture models and surface textures are CC0 assets from [Poly Haven](https://polyhaven.com), compressed for phones (about 6 MB, cached after the first visit). On devices without WebGL 2, or if the 3D assets fail to load, the app automatically falls back to an illustrated 2D study. Add `?2d` to the URL to force it.

## Running it locally

There's no build step. Serve the folder with any static server:

```sh
npx serve .
# or
python3 -m http.server 8000
```

Then open the printed URL. (It must be served over http(s), not opened as a file, because it uses ES modules and a service worker.)

## Project layout

```
index.html            app shell
css/styles.css        all styling (paper texture, bookcase, stats ledger)
js/app.js             routing, rendering, gamification hooks
js/room3d.js          the 3D study (three.js)
js/scene.js           the 2D illustrated study (fallback)
js/views.js           bookshelf, notebook, nightstand, stats, forms, settings
js/stats.js           streaks, totals, goals, XP/levels
js/achievements.js    achievement definitions
js/store.js           localStorage persistence
js/dates.js           local-date helpers
js/sample.js          optional sample library
assets/               3D models and textures (Poly Haven, CC0)
vendor/three/         three.js and the add-ons it uses
sw.js                 offline cache
manifest.webmanifest  install metadata + icons
```
