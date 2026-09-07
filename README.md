<p align="center">
  <a href="https://omegarusdev.github.io/gunny/" style="display:inline-block;padding:16px 52px;font:bold 26px sans-serif;color:#fff;background:#1f9d2f;border-radius:12px;text-decoration:none;">▶ PLAY GUNNY</a>
</p>
<p align="center">
  <a href="https://omegarusdev.github.io/gunny/">
    <img src="https://img.shields.io/badge/▶_PLAY_NOW-playable_in_browser-brightgreen?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Play Now" height="40" />
  </a>
</p>
<p align="center"><strong>No install.</strong> Works in the browser (desktop &amp; mobile).</p>

# Gunny

Shoulder-fire auto-runner. You’re locked on the left, walking backward. They’re faster. Don’t let them touch you.

A 2D HTML5 Canvas chase. Zero art files, zero audio files, no runtime deps beyond the Vite dev/build tooling.

- **Zero assets** — scenery, characters, muzzle, and UI are all drawn; sound is synthesized
- **No runtime deps** — vanilla JS modules
- **Works on desktop &amp; mobile** — landscape; click/touch to fire

## Controls

- **Aim** — mouse / touch
- **Fire** — click / tap and hold
- **Reload** — click the arc after the mag is empty (`R` also taps it)
- **Pause** — `P`

Perfect reloads are a timing tap on that arc. Miss after the forgive window and you jam.

## How to play

`Camp → Start Run → shoot over your shoulder → extract or die → Gunsmith / Training`

Cash comes from **kills** (and a 200m extract bonus). Spend it in Gunsmith. XP is for Training. Clear 200m to unlock the next road; Endless Hunt picks one biome and keeps it.

Contact with a living enemy’s head or torso ends the run. Legs don’t.

## Run locally

```bash
npm install && npm run dev
```

Open [http://localhost:5174/](http://localhost:5174/).

## Development

Vite app (`npm run build` → `dist/`). Push to `main` runs `.github/workflows/deploy-pages.yml`.

```bash
npm run build      # production bundle
npm run preview    # serve dist locally
```

## Links

- [GitHub](https://github.com/OmegarusDev/gunny)
- Live: [omegarusdev.github.io/gunny](https://omegarusdev.github.io/gunny/)
