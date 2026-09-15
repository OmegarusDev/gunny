import { TRACK_METERS } from '../config.js';
import { biomeFor } from '../data/biomes.js';
import { RECEIVERS } from '../data/receivers.js';
import { PARTS } from '../data/attachments.js';
import { equippedLabel, resolveStats } from '../entities/loadout.js';
import { ledgerBlock, statsGrid } from './overlays.js';
import { facilityButton } from './icons.js';

export function renderHub(el, profile, handlers) {
  const stats = resolveStats(profile);
  const rec = RECEIVERS[profile.loadout.receiver];
  const next = biomeFor(profile.unlockedLevel);
  const mag = PARTS[profile.loadout.magazine]?.name ?? '—';
  const barrel = PARTS[profile.loadout.barrel]?.name ?? '—';
  el.innerHTML = `
    <div class="panel-stack camp-stack">
      ${ledgerBlock(profile)}
      <header class="camp-brand">
        <h1>GUNNY</h1>
        <p class="lede">a game with a gun</p>
      </header>
      <div class="facilities">
        ${facilityButton({
          act: 'gunsmith',
          icon: 'gunsmith',
          title: 'Gunsmith',
          sub: rec?.short ?? rec?.name ?? 'Receiver',
        })}
        ${facilityButton({
          act: 'training',
          icon: 'training',
          title: 'Training',
          sub: 'Spend XP',
        })}
      </div>
      <div class="sheet-foot camp-foot">
        ${facilityButton({
          act: 'deploy',
          icon: 'deploy',
          title: 'Start Run',
          sub: `${next.place} · ${TRACK_METERS}m`,
          variant: 'start',
        })}
        ${facilityButton({
          act: 'endless',
          icon: 'endless',
          title: 'Endless',
          sub: 'Random',
          variant: 'side',
        })}
      </div>
      ${statsGrid([
        ['Kit', equippedLabel(profile)],
        ['DMG', stats.damage.toFixed(1)],
        ['Mag', stats.magSize],
        ['ROF', stats.rof.toFixed(1)],
        ['Reload', `${stats.reload.toFixed(2)}s`],
        ['Road', `L${profile.unlockedLevel + 1}`],
      ])}
      <p class="muted kit-line">${barrel} · ${mag}</p>
    </div>
  `;
  el.querySelector('[data-act="deploy"]').onclick = () => handlers.deploy(profile.unlockedLevel);
  el.querySelector('[data-act="gunsmith"]').onclick = () => handlers.gunsmith();
  el.querySelector('[data-act="training"]').onclick = () => handlers.training();
  el.querySelector('[data-act="endless"]').onclick = () => handlers.endless();
}

export function renderEnd(el, { title, run, profile, handlers, extract }) {
  const biome = run.biome;
  el.innerHTML = `
    <div class="panel-stack camp-stack">
      ${ledgerBlock(profile)}
      <header class="camp-brand">
        <p class="kicker">${biome ? biome.place : 'The road'}</p>
        <h2>${title}</h2>
      </header>
      ${statsGrid([
        ['Distance', `${run.score.lastMetersPaid.toFixed(1)}m`],
        ['Kills', run.score.kills],
        ['Heads', run.score.headshots],
        ['Perfects', run.score.perfects],
        ['Cash', `+$${Math.floor(run.score.cash)}`],
        ['XP', `+${Math.floor(run.score.xp)}`],
      ])}
      <div class="facilities">
        ${facilityButton({
          act: 'gunsmith',
          icon: 'gunsmith',
          title: 'Gunsmith',
          sub: 'Spend cash',
        })}
        ${facilityButton({
          act: 'training',
          icon: 'training',
          title: 'Training',
          sub: 'Spend XP',
        })}
      </div>
      <div class="sheet-foot camp-foot">
        ${
          extract
            ? ''
            : facilityButton({
                act: 'retry',
                icon: 'retry',
                title: 'Retry',
                sub: 'Same road',
                variant: 'start',
              })
        }
        ${facilityButton({
          act: 'hub',
          icon: 'camp',
          title: extract ? 'Return' : 'Camp',
          sub: 'Ledger and kit',
          variant: extract ? 'start' : 'side',
        })}
      </div>
    </div>
  `;
  const retry = el.querySelector('[data-act="retry"]');
  if (retry) retry.onclick = () => handlers.retry();
  el.querySelector('[data-act="hub"]').onclick = () => handlers.hub();
  el.querySelector('[data-act="gunsmith"]').onclick = () => handlers.gunsmith();
  el.querySelector('[data-act="training"]').onclick = () => handlers.training();
}
