import { TRACK_METERS, extractCash } from '../config.js';
import { beatenRoadIndexes, biomeFor } from '../data/biomes.js';
import { equippedLabel, resolveStats } from '../entities/loadout.js';
import { fmtMoney, ledgerBlock, statsGrid } from './overlays.js';
import { facilityButton } from './icons.js';

export function renderHub(el, profile, handlers) {
  const stats = resolveStats(profile);
  const next = biomeFor(profile.unlockedLevel);
  const roads = beatenRoadIndexes(profile.unlockedLevel);
  const endlessPick = roads.includes(handlers.endlessBiome)
    ? handlers.endlessBiome
    : roads[roads.length - 1];
  const endlessPlace = biomeFor(endlessPick).place;
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
          act: 'endless',
          icon: 'endless',
          title: 'Endless',
          sub: endlessPlace,
          variant: 'side',
        })}
        ${facilityButton({
          act: 'deploy',
          icon: 'deploy',
          title: 'Start Run',
          sub: `${next.place} · ${TRACK_METERS}m`,
          variant: 'start',
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
        ['ROF', String(Math.round(stats.rof * 60))],
        ['Reload', `${stats.reload.toFixed(2)}s`],
        ['Road', `L${profile.unlockedLevel + 1}`],
      ])}
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
  const clearPay = extract ? run.score.extractCash || extractCash(run.levelIndex) : 0;
  el.innerHTML = `
    <div class="panel-stack end-stack">
      <div class="page-head">
        ${ledgerBlock(profile)}
      </div>
      <header class="camp-brand workshop-brand">
        <p class="kicker">${run.endless ? 'Endless' : `Level ${run.levelIndex + 1}`}</p>
        <h2>${biome ? biome.place : 'The road'}</h2>
        <p class="end-verdict">${title}</p>
      </header>
      ${statsGrid([
        ['Distance', `${run.score.lastMetersPaid.toFixed(1)}m`],
        ['Kills', run.score.kills],
        ['Heads', run.score.headshots],
        extract
          ? ['Clear', `+${fmtMoney(clearPay)}`]
          : ['Perfects', run.score.perfects],
        ['Cash', `+${fmtMoney(run.score.cash)}`],
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
        ${facilityButton({
          act: 'hub',
          icon: 'camp',
          title: extract ? 'Return' : 'Camp',
          sub: 'Ledger and kit',
          variant: extract ? 'start' : 'side',
        })}
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
      </div>
    </div>
  `;
  const retry = el.querySelector('[data-act="retry"]');
  if (retry) retry.onclick = () => handlers.retry();
  el.querySelectorAll('[data-act="hub"]').forEach((btn) => {
    btn.onclick = () => handlers.hub();
  });
  el.querySelector('[data-act="gunsmith"]').onclick = () => handlers.gunsmith();
  el.querySelector('[data-act="training"]').onclick = () => handlers.training();
}
