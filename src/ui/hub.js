import { TRACK_METERS } from '../config.js';
import { beatenRoadIndexes, biomeFor } from '../data/biomes.js';
import { PARTS } from '../data/attachments.js';
import { equippedLabel, resolveStats } from '../entities/loadout.js';
import { ledgerBlock, statsGrid } from './overlays.js';
import { facilityButton } from './icons.js';

export function renderHub(el, profile, handlers) {
  const stats = resolveStats(profile);
  const next = biomeFor(profile.unlockedLevel);
  const roads = beatenRoadIndexes(profile.unlockedLevel);
  const endlessPick = roads.includes(handlers.endlessBiome)
    ? handlers.endlessBiome
    : roads[roads.length - 1];
  const endlessPlace = biomeFor(endlessPick).place;
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
          sub: 'Upgrade your gun',
        })}
        ${facilityButton({
          act: 'training',
          icon: 'training',
          title: 'Training',
          sub: 'Upgrade your skills',
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
          sub: endlessPlace,
          variant: 'side',
        })}
      </div>
      ${
        roads.length > 1
          ? `<div class="skin-picks" role="listbox" aria-label="Endless road">
        ${roads
          .map(
            (idx) =>
              `<button class="chip ${idx === endlessPick ? 'selected' : ''}" type="button" data-biome="${idx}">${biomeFor(idx).place}</button>`,
          )
          .join('')}
      </div>`
          : ''
      }
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
  el.querySelector('[data-act="endless"]').onclick = () => handlers.endless(endlessPick);
  el.querySelectorAll('[data-biome]').forEach((btn) => {
    btn.onclick = () => handlers.pickEndless(Number(btn.dataset.biome));
  });
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
          sub: 'Upgrade your gun',
        })}
        ${facilityButton({
          act: 'training',
          icon: 'training',
          title: 'Training',
          sub: 'Upgrade your skills',
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
