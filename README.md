<p align="center">
  <a href="https://omegarusdev.github.io/gunny/" style="display:inline-block;padding:16px 52px;font:bold 26px sans-serif;color:#fff;background:#1f9d2f;border-radius:12px;text-decoration:none;">▶ PLAY GUNNY</a>
</p>
<p align="center">
  <a href="https://omegarusdev.github.io/gunny/">
    <img src="https://img.shields.io/badge/▶_PLAY_NOW-playable_in_browser-brightgreen?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Play Now" height="40" />
  </a>
</p>
<p align="center"><strong>Play in the browser</strong> — or install as an app from the live game page.</p>

# Gunny

Shoulder-fire auto-runner. You’re locked on the left, walking backward. They’re faster. Don’t let them touch you.

A 2D HTML5 Canvas chase. Zero art files, zero audio files, no runtime deps beyond the Vite dev/build tooling.

- **Zero assets** — scenery, characters, muzzle, and UI are all drawn; sound is synthesized
- **No runtime deps** — vanilla JS modules
- **Works on desktop &amp; mobile** — landscape; click/touch to fire

## Controls

- **Aim** — mouse / touch
- **Fire** — click / tap and hold
- **Reload** — tap the reload bar after the mag is empty (`R` also taps it)
- **Pause** — `P` / Esc / Space (or leave the tab). **Tap the pause screen to resume.** Runs start paused.

Perfect reloads are a timing tap on the reload bar. Miss after the forgive window and you jam.

## How to play

`Camp → Start Run → shoot over your shoulder → extract or die → Gunsmith / Training`

Cash comes from **kills** (and a 200m extract bonus). Spend it in Gunsmith. XP is for Training. Clear 200m to unlock the next road. The loop is Forest Road, Fen Causeway, Transylvanian Lane, Desert Wadi, Bone Quarry. Endless Hunt picks one biome and keeps it.

Contact with a living enemy’s head or torso ends the run. Legs don’t.

## Run locally

```bash
npm install && npm run dev
```

Open [http://localhost:5174/](http://localhost:5174/).

## Mobile / install (PWA)

Landscape only (portrait shows a rotate prompt). Touch-first: tap-hold to fire, tap the pause screen to resume.

**Install as an app** (standalone window, no URL bar) from the live game page — not from the GitHub README itself:

1. Open [omegarusdev.github.io/gunny](https://omegarusdev.github.io/gunny/) (the PLAY button).
2. Install from that page:
   - **Android Chrome:** address-bar install icon or menu → Install app / Add to Home screen
   - **iPhone/iPad (Safari):** Share → Add to Home Screen
3. Later launches use the home-screen icon. Pushes to `main` deploy a new Pages build; the installed app picks it up (auto-refresh when you’re not mid-run, or an “Update ready” tap if you are).

Deploy / Endless also requests browser fullscreen when the OS allows it (stronger on Android; iOS prefers the installed PWA).

## Development

Vite app (`npm run build` → `dist/`). Push to `main` runs `.github/workflows/deploy-pages.yml`.

```bash
npm run build      # production bundle
npm run preview    # serve dist locally
```

## Links

- [GitHub](https://github.com/OmegarusDev/gunny)
- Live: [omegarusdev.github.io/gunny](https://omegarusdev.github.io/gunny/)
