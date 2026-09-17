<p align="center">
  <a href="https://omegarusdev.github.io/gunny/">
    <img src="https://img.shields.io/badge/▶_PLAY_NOW-playable_in_browser-brightgreen?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Play Now" height="40" />
  </a>
</p>
<p align="center"><strong>Play in the browser</strong> — or install as an app from the live game page.</p>

# Gunny

Shoulder-fire auto-runner. You’re locked on the left, walking backward. They’re faster. Don’t let them touch you.

A 2D HTML5 Canvas chase. Scenery, characters, and UI are drawn; sound is synthesized. No runtime deps beyond Vite.

## Controls

- **Aim** — mouse / touch
- **Fire** — click / tap and hold
- **Reload** — only when the mag is empty; tap anywhere (`R` also taps it)
- **Pause** — `P` / Esc / Space (or leave the tab). **Tap the pause screen to resume.**

A perfect reload is a timing tap on the gold band. Miss after the forgive window and you jam.

## How to play

`Camp → Start Run → shoot over your shoulder → extract or die → Gunsmith / Training`

Cash from kills (and a $150 Forest clear, then +$50 per later road, capped at $400) buys kit. XP buys Training — kills start at 5 XP and scale with the road. Clear 250m to unlock the next road. Campaign cycles Forest Road → Fen Causeway → Transylvanian Lane → Desert Wadi → Bone Quarry. Endless uses any road you’ve already extracted from, and is about twice as hard as the same campaign metres.

**ROF** is cyclic rounds per minute. Shoddy starts at 40 RPM with a 1-round mag and a 3s reload (reload is separate). A perfect tap on the gold band, just before two-thirds of the bar, adds 10% cyclic rate for that mag. Its three parts are mag, bolt (RoF), and ammo (damage + a little pen). Each later receiver is a fresh kit: Militia barrel and springs; Ordnance grip and optic; Duty stock and trigger; Advanced muzzle, gas, and laser. Switching back keeps that gun’s parts. Receivers still raise damage and RoF about 1.5× each rank ($500 / $2k / $4k / $8k — about 30m, then +1h / +2h / +4h). Kit rungs sit in those gaps, scaled to the gun that unlocks them. Muzzle devices are compensators and brakes, not a suppressor. Past effective range, rounds keep flying but damage and accuracy fall with distance squared. Forest walkers start at 50 torso and climb 20% through the road; each later road opens 10% harder than the last.

Walkers: Walker, Tank (Road 3 / Endless 200m), Heavy Tank (Road 7 / Endless 400m), Behemoth (Road 15 / Endless 800m). Each heavy shows up a road before that receiver’s typical payday and pays 2× / 4× / 8× a grunt’s cash and XP. Heavies are bigger versions of that road’s creature, not unique models.

Contact with a living enemy’s **head or torso** ends the run. Legs don’t.

## Play notes (not bugs)

- You cannot reload until the mag is dry. That is the gun.
- Mag and receiver prices are a grind. Buying the next rung to clear a road is the loop.
- Road 15 and Endless 800m will wreck a starter kit. Upgrade first.
- Forest’s first clear and Militia are both about a half-hour for a decent shot. Later roads take longer until you buy the next gun.
- Tanks and the Behemoth look like larger biome walkers (bigger zombie, bigger vampire, …).
- Crits are a Training RNG roll. They are not headshots. Both add 0.12 pen and stack.
- Shoddy only punches through with magnum ammo plus a headshot and a crit together. Militia starts at 0.9 and needs a headshot, a crit, or barrel pen.
- If a round does exit a body, leftover travel can still wound the next one.
- A new app update waits until you are back at camp. It will not reload mid-run or on the extract/death screen.
- Portrait mode pauses the sim and asks you to rotate.

## Run locally

```bash
npm install && npm run dev
```

Open [http://localhost:5174/](http://localhost:5174/).

## Install as an app

Gunny is a **progressive web app**: a website you can install like a normal app. Same game, own home-screen icon, no App Store. Play in the browser if you prefer.

Landscape only. Touch-first: tap-hold to fire, tap the pause screen to resume.

**Install** from the live game page — not from this README:

1. Open [omegarusdev.github.io/gunny](https://omegarusdev.github.io/gunny/).
2. **Android Chrome:** menu → Install app / Add to Home screen.
3. **iPhone/iPad (Safari):** Share → Add to Home Screen.
4. **Desktop Chrome:** install icon in the address bar.

The installed Android app launches fullscreen (hides the status bar). Desktop and browser tabs stay windowed unless **Fullscreen in all modes** is on in Options. If an older home-screen icon still shows the clock, remove it and install again after this build is live.

## Development

Vite (`npm run build` → `dist/`). Push to `main` runs `.github/workflows/deploy-pages.yml`.

```bash
npm run build      # production bundle
npm run preview    # serve dist locally
```

## Links

- [GitHub](https://github.com/OmegarusDev/gunny)
- Live: [omegarusdev.github.io/gunny](https://omegarusdev.github.io/gunny/)
