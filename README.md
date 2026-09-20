<p align="center">
  <a href="https://omegarusdev.github.io/gunny/">
    <img src="https://img.shields.io/badge/▶_PLAY_NOW-playable_in_browser-brightgreen?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Play Now" height="40" />
  </a>
</p>
<p align="center"><strong>Play in the browser</strong> — or install as an app from the live game page.</p>

# Gunny

Shoulder-fire auto-runner. You’re locked on the left, walking backward. They’re faster. Don’t let them touch you.

A 2D HTML5 Canvas chase. Scenery, characters, and UI are drawn; sound is synthesized. No runtime deps beyond Vite. Landscape only.

## Controls

- **Aim** — mouse / touch. A tap or click snaps the muzzle *before* the round leaves, so you do not waste the first shot on the old angle.
- **Fire** — hold. Cyclic rate is the limiter; a dry click means the gun is not ready. Holding also builds **Heat**, which opens the cone until you let off.
- **Reload** — only when the mag is empty. Tap anywhere (`R` also taps). The prompt sits near the top: **Reload** / **Tap Anywhere**.
- **Pause** — `P` / Esc / Space, or leave the tab. **Tap the pause screen to resume.** Portrait mode pauses and hushes the background.

A **perfect** reload is a timing tap on the gold band. On a 3s seat, that mark is at **2s** (just before two-thirds of the bar). A perfect adds **10% cyclic rate** for the mag you just seated, and a little XP. Miss after the forgive window and you **jam**.

Mouse and pen get a software cursor in camp. Touch hides it. Combat uses the on-canvas reticule.

## How to play

`Camp → Start Run → shoot over your shoulder → extract or die → Gunsmith / Training`

You start with a **Shoddy** receiver, **$0**, and Road 1 (**Forest Road**). Clear **250m** (about two minutes at 2 m/s) to unlock the next road and take the extract payday. Contact with a living enemy’s **head or torso** ends the run — legs do not. A crawler whose legs have given out can still kill if the body touches you. Extracting on the line still counts even if someone is touching.

Death flavour is an escape (`You barely escape alive...`). Extract is `You made it`. Retry from death is the same road; Return goes to camp.

**Endless** is a separate start once you have extracted. Pick any beaten road’s skin. It is about **twice as hard** as the same campaign metres, and it does not unlock the next campaign road.

## The gun

**ROF** on the HUD and in Gunsmith is **cyclic rounds per minute**. Reload is separate. Shoddy starts at **15 damage**, **40 RPM**, a **1-round mag**, a **3s** reload, and a **4°** first-shot half-cone.

**Irons** hold the reticle about a third of the way across the screen. **Optics** push that sight picture out; high optic ranks (50+) fill the viewport. **Barrels** extend how far a round keeps full energy — they do not stretch the reticle. Marksman does not add sight reach.

Past effective range, tracers **keep flying**. Damage and accuracy fall with **distance squared**; a spent round can still wound if it geometrically hits.

**Penetration** is a budget of 1 to exit a body. Leftover pen can wound the next one. Headshots and crits each add **0.12** pen and **stack**. Crits are a Training RNG roll, not headshots.

- **Shoddy** starts at **0.5**. Ammo around rank **60** plus a **headshot and a crit together** can punch through. Anything short of that stays in the first body.
- **Basic** starts at **0.9**. A headshot or a crit is enough; a long barrel also gets you there. Unupgraded Basic without those does not overpen.

**SPRD** is first-shot half-cone. Later receivers start a little tighter. Bloom and heat stack on top — they are not this stat. A finished Elite kit plus max Marksman can settle first-shot to **0°**; earlier guns cannot.

## Gunsmith

Receiver **tabs**: Shoddy → Basic → Advanced → Expert → Elite. Each gun is its **own kit**. Buying the next receiver starts that gun stub; switching back keeps the old ranks. You cannot spend upgrades on a gun you have not bought — the parts fade and **Buy** sits on the pane.

Slot upgrades are **0–100**, bought one level at a time. The cap is silent: the button reads **Upgrade** until **MAX**. First mag is **$100** (about ten grunt kills). Costs then climb about **6%** per level, always at least $10 more than the last. Big mags (past 8) take a little longer to seat.

Shoddy opens **mag, bolt, and ammo**. Each later gun opens two more slots; Elite opens the last three:

| Receiver | Cost | Opens |
| --- | ---: | --- |
| Shoddy | — | Mag, bolt, ammo |
| Basic | $500 | Barrel, spring |
| Advanced | $2,000 | Grip, optic |
| Expert | $4,000 | Stock, trigger |
| Elite | $8,000 | Muzzle, gas, laser |

Receivers raise **damage and RoF about 1.5×** each rank. Slot levels fill the grind between guns. Muzzle devices are compensators and brakes, **not** a suppressor. A laser (rank 1+) draws a beam while you aim.

Tap a stat chip or a part card for a footer hint. Gunsmith’s part grid is the **only** scrolling list in camp.

## Training

XP buys skills (max 20 each). Every skill starts at **40 XP**, then **+20 XP** per rank. Gunner level is 1 + total XP earned (spent + banked) / 100.

- **Recoil** — less bloom per shot
- **Reload** — faster seats, wider perfect band
- **Marksman** — tighter first-shot cone, faster settle
- **Scavenger** — more cash per kill
- **Crit %** — RNG crit chance (adds pen on a crit)
- **Crit ×** — crit damage (crits still add flat pen)
- **Speed** — walk the road a little faster; they still close
- **Firing** — a little more cyclic rate; bolt and trigger still do the heavy lifting

The one-row strip is the live values those skills change. Hover or tap a row or a chip for the hint. Nothing stays “selected.”

## Roads and walkers

Campaign cycles **Forest Road → Fen Causeway → Transylvanian Lane → Desert Wadi → Bone Quarry**, then wraps. Each road is a **reskin** (zombie, drowned, vampire, mummy, ghoul) — same walk, different paint.

Forest walkers start at **50 HP** and climb **20%** through the 250m. That is one body pool: headshots are **2×** on the same bar, not a second life. Legs take normal damage into that pool and also have an **80%** sub-pool; emptying it knocks them into a crawl. Each later road **opens 10% harder** than the last open, and still **easier than the last extract**. Density uses the same pair. Packs and short rests keep it from being a metronome.

Four roles, same body, bigger as they get meaner:

- **Walker** — the grunt
- **Tank** — Road 3 / Endless 200m — 2× cash and XP
- **Heavy Tank** — Road 7 / Endless 400m — 4×
- **Behemoth** — Road 15 / Endless 800m — 8×

Heavies land a road before that receiver’s typical payday. They look like larger biome walkers, not unique models. Road 15 / Endless 800m will wreck a starter kit.

## Economy

- **$10** per grunt kill (roles multiply). Scavenger scales cash.
- **5 XP** per grunt, plus **0.1 XP/m**, **+2** on a head, **+1** on a perfect. Road HP multiplies kill XP. A clear does **not** pay XP.
- Forest clear **$150**, then **+$50** per later road, **capped at $400**. That payday is on top of kill cash. It is not a receiver ($500 Basic).

Buying the next Upgrade to clear a road is the loop. Mag and receiver prices are a grind on purpose.

## Camp chrome

One **4:3** wood card, floating on the canvas. Ledger is Gunner level, cash, and XP. Options is the cog outside the card: **Sound** (mute, gunshot / footsteps / background), **Fullscreen in all modes**, and **Reset progress** (hold to confirm). Install is the download glyph next to it.

## Play notes (not bugs)

- You cannot reload until the mag is dry. That is the gun.
- Mag and receiver prices are a grind. Buying the next Upgrade to clear a road is the loop.
- Forest’s first clear and Basic are both about a half-hour for a decent shot. Later roads take longer until you buy the next gun.
- Tanks and the Behemoth look like larger biome walkers (bigger zombie, bigger vampire, …).
- Headshots are 2× on the same body HP. Legs share that pool and also have an 80% crawl bar (40 damage to the legs of a 50 HP walker puts it on the ground with 10 left).
- Crits are a Training RNG roll. They are not headshots. Both add 0.12 pen and stack.
- Shoddy only punches through with ammo around rank 60 plus a headshot **and** a crit together. Basic starts at 0.9 and overpens with a headshot, a crit, or enough barrel.
- If a round does exit a body, leftover travel can still wound the next one.
- A new app update waits until you are back at **camp**. It will not reload mid-run, on Gunsmith/Training, or on the extract/death screen.
- Portrait mode pauses the sim and asks you to rotate. Background sound hushes until you are landscape again.
- Hitchy phones may drop muzzle FX. The road and the side light stay put so the vignette cannot hop.

## Run locally

```bash
npm install && npm run dev
```

Vite is pinned to **http://localhost:5174/** (`vite.config.js`).

```bash
npm test           # vitest once (also runs on every Pages deploy)
npm run test:watch
npm run build      # production bundle → dist/
npm run preview    # serve dist locally
```

Push to `main` runs [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) (test, then GitHub Pages).

## Install as an app

Gunny is a **progressive web app**: a website you can install like a normal app. Same game, own home-screen icon, no App Store. Play in the browser if you prefer. The cached payload is about **1 MB**.

Landscape only. Touch-first: tap-hold to fire, tap the pause screen to resume.

**Install** from the live game page — not from this README:

1. Open [omegarusdev.github.io/gunny](https://omegarusdev.github.io/gunny/).
2. **Android Chrome:** menu → **Install app** (or **Install**). Do not use **Add to Home screen** — that is only a Chrome shortcut, not the app.
3. **iPhone/iPad (Safari):** Share → **Add to Home Screen**. On iOS that *is* the install.
4. **Desktop Chrome:** install icon in the address bar, or menu → **Install Gunny**.

The Android **Install app** build launches fullscreen (hides the status bar). A home-screen shortcut still shows the clock because it is still Chrome. Delete that shortcut and install from the menu if you already added one. Desktop and browser tabs stay windowed unless **Fullscreen in all modes** is on in Options.

## Links

- [GitHub](https://github.com/OmegarusDev/gunny)
- Live: [omegarusdev.github.io/gunny](https://omegarusdev.github.io/gunny/)
