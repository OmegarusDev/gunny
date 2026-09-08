import { TRACK_METERS } from '../config.js';
import { biomeFor } from '../data/biomes.js';
import { RECEIVERS } from '../data/receivers.js';
import { PARTS } from '../data/attachments.js';
import { gunnerLevel } from '../data/skills.js';
import { equippedLabel, resolveStats } from '../entities/loadout.js';
import { fmtMoney } from './overlays.js';

export function renderHub(el, profile, handlers) {
  const stats = resolveStats(profile);
  const rec = RECEIVERS[profile.loadout.receiver];
  const next = biomeFor(profile.unlockedLevel);
  const mag = PARTS[profile.loadout.magazine]?.name ?? '—';
  const barrel = PARTS[profile.loadout.barrel]?.name ?? '—';
  el.innerHTML = `
    <div class="ledger">
      <div>
        <span class="ledger-label">Cash</span>
        <span class="ledger-value">${fmtMoney(profile.cash)}</span>
      </div>
      <div>
        <span class="ledger-label">XP</span>
        <span class="ledger-value">${Math.floor(profile.xp)}</span>
      </div>
      <div>
        <span class="ledger-label">Gunner</span>
        <span class="ledger-value">Lv ${gunnerLevel(profile)}</span>
      </div>
    </div>
    <p class="kicker">Camp</p>
    <h1>GUNNY</h1>
    <p class="lede">They’re faster than you. Shoot over your shoulder and don’t let them touch you.</p>
    <div class="facilities">
      <button class="facility start" data-act="deploy">
        <span class="facility-kicker">Mission</span>
        <span class="facility-title">Start Run</span>
        <span class="facility-sub">${next.place} · ${TRACK_METERS}m</span>
      </button>
      <button class="facility" data-act="gunsmith">
        <span class="facility-kicker">Facility</span>
        <span class="facility-title">Gunsmith</span>
        <span class="facility-sub">${rec?.name ?? 'Receiver'}</span>
      </button>
      <button class="facility" data-act="training">
        <span class="facility-kicker">Facility</span>
        <span class="facility-title">Training</span>
        <span class="facility-sub">Spend XP</span>
      </button>
    </div>
    <div class="stats">
      <div><span>Receiver</span>${equippedLabel(profile)}</div>
      <div><span>Damage</span>${stats.damage.toFixed(1)}</div>
      <div><span>Mag</span>${stats.magSize}</div>
      <div><span>ROF</span>${stats.rof.toFixed(1)}</div>
      <div><span>Reload</span>${stats.reload.toFixed(2)}s</div>
      <div><span>Next road</span>L${profile.unlockedLevel + 1}</div>
    </div>
    <p class="muted kit-line">${barrel} · ${mag}</p>
    <button class="text-btn" data-act="endless">Endless hunt — random theme, same chase</button>
  `;
  el.querySelector('[data-act="deploy"]').onclick = () => handlers.deploy(profile.unlockedLevel);
  el.querySelector('[data-act="gunsmith"]').onclick = () => handlers.gunsmith();
  el.querySelector('[data-act="training"]').onclick = () => handlers.training();
  el.querySelector('[data-act="endless"]').onclick = () => handlers.endless();
}

export function renderEnd(el, { title, run, profile, handlers, extract }) {
  const biome = run.biome;
  const next = biomeFor(profile.unlockedLevel);
  el.innerHTML = `
    <div class="ledger">
      <div>
        <span class="ledger-label">Cash</span>
        <span class="ledger-value">${fmtMoney(profile.cash)}</span>
      </div>
      <div>
        <span class="ledger-label">XP</span>
        <span class="ledger-value">${Math.floor(profile.xp)}</span>
      </div>
      <div>
        <span class="ledger-label">Gunner</span>
        <span class="ledger-value">Lv ${gunnerLevel(profile)}</span>
      </div>
    </div>
    <p class="kicker">${biome ? biome.place : 'The road'}</p>
    <h2>${title}</h2>
    <p class="muted">${biome ? biome.foe : ''}</p>
    <div class="stats">
      <div><span>Distance</span>${run.score.lastMetersPaid.toFixed(1)}m</div>
      <div><span>Kills</span>${run.score.kills}</div>
      <div><span>Headshots</span>${run.score.headshots}</div>
      <div><span>Perfects</span>${run.score.perfects}</div>
      <div><span>Cash</span>+${fmtMoney(run.score.cash)}</div>
      <div><span>XP</span>+${Math.floor(run.score.xp)}</div>
    </div>
    <p class="muted">${extract ? `Clear bonus paid. Next: ${next.place}.` : 'Cash from kills only. Extract pays a small clear bonus.'}</p>
    <div class="facilities end-actions">
      ${extract ? '' : `<button class="facility start" data-act="retry">
        <span class="facility-kicker">Mission</span>
        <span class="facility-title">Retry</span>
        <span class="facility-sub">Same road, same seed</span>
      </button>`}
      <button class="facility" data-act="hub">
        <span class="facility-kicker">Camp</span>
        <span class="facility-title">Return</span>
        <span class="facility-sub">Ledger and kit</span>
      </button>
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
  `;
  const retry = el.querySelector('[data-act="retry"]');
  if (retry) retry.onclick = () => handlers.retry();
  el.querySelector('[data-act="hub"]').onclick = () => handlers.hub();
  el.querySelector('[data-act="gunsmith"]').onclick = () => handlers.gunsmith();
  el.querySelector('[data-act="training"]').onclick = () => handlers.training();
}
