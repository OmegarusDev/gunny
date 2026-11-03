import { TRACK_METERS, extractCash } from '../config.js';
import { beatenRoadIndexes, biomeFor } from '../data/biomes.js';
import { equippedLabel, resolveStats } from '../entities/loadout.js';
import { fmtMoney, formatMetres, formatReload, pageHead, statsGrid } from './overlays.js';
import { facilityButton } from './icons.js';

function bindLedger(el, handlers) {
  const opt = el.querySelector('[data-act="options"]');
  if (opt) opt.onclick = () => handlers.options?.();
  el.querySelectorAll('[data-act="gunsmith"]').forEach((btn) => {
    btn.onclick = () => handlers.gunsmith();
  });
  el.querySelectorAll('[data-act="training"]').forEach((btn) => {
    btn.onclick = () => handlers.training();
  });
}

export function renderHub(el, profile, handlers) {
  const roads = beatenRoadIndexes(profile.unlockedLevel);
  if (el.dataset.pick === 'endless') {
    el.innerHTML = `
      <div class="panel-stack camp-stack">
        ${pageHead(profile, 'Endless')}
        <div class="facilities biome-picks" role="listbox" aria-label="Endless road">
          ${roads
            .map((idx) => {
              const biome = biomeFor(idx);
              return facilityButton({
                icon: 'endless',
                title: biome.place,
                sub: biome.foe,
                data: { biome: idx },
              });
            })
            .join('')}
        </div>
      </div>
    `;
    el.querySelector('[data-act="hub"]').onclick = () => {
      el.dataset.pick = '';
      renderHub(el, profile, handlers);
    };
    el.querySelectorAll('[data-biome]').forEach((btn) => {
      btn.onclick = () => (handlers.endless || handlers.pickEndless)?.(Number(btn.dataset.biome));
    });
    return;
  }

  const stats = resolveStats(profile);
  const next = biomeFor(profile.unlockedLevel);
  el.innerHTML = `
    <div class="panel-stack camp-stack">
      ${pageHead(profile, '', 'options')}
      <header class="camp-brand">
        <h1>GUNNY</h1>
        <p class="lede">a game with a gun</p>
      </header>
      ${statsGrid([
        ['Kit', equippedLabel(profile)],
        ['DMG', Number.isInteger(Math.round(stats.damage * 10) / 10) ? String(Math.round(stats.damage * 10) / 10) : stats.damage.toFixed(1)],
        ['Mag', stats.magSize],
        ['ROF', String(Math.round(stats.rof * 60))],
        ['Reload', formatReload(stats.reload)],
        ['Road', String(profile.unlockedLevel + 1)],
      ], 'stats-row')}
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
          sub: 'Pick a biome',
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
    </div>
  `;
  bindLedger(el, handlers);
  el.querySelector('[data-act="deploy"]').onclick = () => handlers.deploy(profile.unlockedLevel);
  el.querySelector('[data-act="endless"]').onclick = () => {
    el.dataset.pick = 'endless';
    renderHub(el, profile, handlers);
  };
}

export function renderEnd(el, { title, run, profile, handlers, extract }) {
  const biome = run.biome;
  const clearPay = extract ? run.score.extractCash || extractCash(run.levelIndex) : 0;
  const killCash = extract ? Math.max(0, run.score.cash - clearPay) : run.score.cash;
  const retrySub = run.endless ? 'Endless' : `${biome?.place || 'The road'} · ${TRACK_METERS}m`;
  el.innerHTML = `
    <div class="panel-stack camp-stack">
      ${pageHead(profile, '', 'none')}
      <header class="camp-brand">
        <h1>GUNNY</h1>
        <p class="lede">${title}</p>
      </header>
      ${statsGrid([
        ['Dist', formatMetres(run.score.lastMetersPaid)],
        ['Kills', run.score.kills],
        ['Heads', run.score.headshots],
        extract
          ? ['Clear', `+${fmtMoney(clearPay)}`, 'Payday for walking the whole road. On top of kill cash.']
          : ['Perfects', run.score.perfects],
        ['Cash', `+${fmtMoney(killCash)}`],
        ['XP', `+${Math.floor(run.score.xp)}`],
      ], 'stats-row')}
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
                sub: retrySub,
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
  bindLedger(el, handlers);
}
