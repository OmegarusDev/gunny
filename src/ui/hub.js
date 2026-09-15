import { TRACK_METERS } from '../config.js';
import { biomeFor } from '../data/biomes.js';
import { RECEIVERS } from '../data/receivers.js';
import { equippedLabel, resolveStats } from '../entities/loadout.js';
import { fmtMoney, statsRail } from './overlays.js';

export function renderHub(el, profile, handlers) {
  const stats = resolveStats(profile);
  const rec = RECEIVERS[profile.loadout.receiver];
  const next = biomeFor(profile.unlockedLevel);
  handlers.chrome?.(
    statsRail([
      ['Kit', equippedLabel(profile)],
      ['DMG', stats.damage.toFixed(1)],
      ['Mag', stats.magSize],
      ['ROF', stats.rof.toFixed(1)],
      ['Reload', `${stats.reload.toFixed(2)}s`],
      ['Road', `L${profile.unlockedLevel + 1}`],
    ]),
    { back: false },
  );
  el.innerHTML = `
    <div class="panel-stack camp-stack">
      <header class="camp-brand">
        <p class="kicker">Camp</p>
        <h1>GUNNY</h1>
      </header>
      <div class="facilities">
        <button class="facility" data-act="gunsmith">
          <span class="facility-kicker">Facility</span>
          <span class="facility-title">Gunsmith</span>
          <span class="facility-sub">${rec?.short ?? rec?.name ?? 'Receiver'}</span>
        </button>
        <button class="facility" data-act="training">
          <span class="facility-kicker">Facility</span>
          <span class="facility-title">Training</span>
          <span class="facility-sub">Spend XP</span>
        </button>
      </div>
      <div class="sheet-foot camp-foot">
        <button class="facility start" data-act="deploy">
          <span class="facility-kicker">Mission</span>
          <span class="facility-title">Start Run</span>
          <span class="facility-sub">${next.place} · ${TRACK_METERS}m</span>
        </button>
        <button class="facility side" data-act="endless">
          <span class="facility-kicker">Hunt</span>
          <span class="facility-title">Endless</span>
          <span class="facility-sub">Random</span>
        </button>
      </div>
    </div>
  `;
  el.querySelector('[data-act="deploy"]').onclick = () => handlers.deploy(profile.unlockedLevel);
  el.querySelector('[data-act="gunsmith"]').onclick = () => handlers.gunsmith();
  el.querySelector('[data-act="training"]').onclick = () => handlers.training();
  el.querySelector('[data-act="endless"]').onclick = () => handlers.endless();
}

export function renderEnd(el, { title, run, profile, handlers, extract }) {
  const biome = run.biome;
  handlers.chrome?.(
    statsRail([
      ['Distance', `${run.score.lastMetersPaid.toFixed(1)}m`],
      ['Kills', run.score.kills],
      ['Heads', run.score.headshots],
      ['Perfects', run.score.perfects],
      ['Cash', `+${fmtMoney(run.score.cash)}`],
      ['XP', `+${Math.floor(run.score.xp)}`],
    ]),
    { back: true },
  );
  el.innerHTML = `
    <div class="panel-stack camp-stack">
      <header class="camp-brand">
        <p class="kicker">${biome ? biome.place : 'The road'}</p>
        <h2>${title}</h2>
      </header>
      <div class="facilities">
        <button class="facility" data-act="gunsmith">
          <span class="facility-kicker">Facility</span>
          <span class="facility-title">Gunsmith</span>
          <span class="facility-sub">Spend cash</span>
        </button>
        <button class="facility" data-act="training">
          <span class="facility-kicker">Facility</span>
          <span class="facility-title">Training</span>
          <span class="facility-sub">Spend XP</span>
        </button>
      </div>
      <div class="sheet-foot camp-foot">
        ${
          extract
            ? ''
            : `<button class="facility start" data-act="retry">
          <span class="facility-kicker">Mission</span>
          <span class="facility-title">Retry</span>
          <span class="facility-sub">Same road</span>
        </button>`
        }
        <button class="facility ${extract ? 'start' : 'side'}" data-act="hub">
          <span class="facility-kicker">Camp</span>
          <span class="facility-title">${extract ? 'Return' : 'Camp'}</span>
          <span class="facility-sub">Ledger and kit</span>
        </button>
      </div>
    </div>
  `;
  const retry = el.querySelector('[data-act="retry"]');
  if (retry) retry.onclick = () => handlers.retry();
  el.querySelector('[data-act="hub"]').onclick = () => handlers.hub();
  el.querySelector('[data-act="gunsmith"]').onclick = () => handlers.gunsmith();
  el.querySelector('[data-act="training"]').onclick = () => handlers.training();
}
