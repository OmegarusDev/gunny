import { BIOMES, biomeFor } from '../data/biomes.js';
import { RECEIVERS } from '../data/receivers.js';
import { PARTS } from '../data/attachments.js';
import { equippedLabel, resolveStats } from '../entities/loadout.js';
import { fmtMoney } from './overlays.js';

export function renderHub(el, profile, handlers) {
  const stats = resolveStats(profile);
  const rec = RECEIVERS[profile.loadout.receiver];
  const next = biomeFor(profile.unlockedLevel);
  el.innerHTML = `
    <p class="kicker">Camp</p>
    <h1>GUNNY</h1>
    <p class="muted">You’re on the road. They’re faster than you. Shoot over your shoulder and don’t let them touch you.</p>
    <div class="tracks">
      ${BIOMES.map((b, i) => {
        const unlocked = profile.unlockedLevel >= i;
        const current = profile.unlockedLevel % 3 === i;
        return `<button class="track-card ${b.id} ${unlocked ? '' : 'locked'} ${current ? 'current' : ''}" data-level="${i}" ${unlocked ? '' : 'disabled'}>
          <span class="sky"></span>
          <span class="place">${b.place}</span>
          <span class="foe">${b.foe}</span>
          <span class="muted">${unlocked ? b.blurb : 'Locked — clear the previous road.'}</span>
        </button>`;
      }).join('')}
    </div>
    <div class="stats">
      <div>Cash ${fmtMoney(profile.cash)}</div>
      <div>XP ${Math.floor(profile.xp)}</div>
      <div>Next  L${profile.unlockedLevel + 1}</div>
      <div>${rec?.name ?? ''}</div>
      <div>Dmg ${stats.damage.toFixed(1)}</div>
      <div>Mag ${stats.magSize}</div>
    </div>
    <p class="muted">Kit  ${equippedLabel(profile)} · ${PARTS[profile.loadout.barrel]?.name ?? ''} · ${PARTS[profile.loadout.magazine]?.name ?? ''}</p>
    <p class="muted">Endless hunt picks a theme at random. Same chase, different skin.</p>
    <div class="row">
      <button class="primary" data-act="deploy">Run ${next.place}</button>
      <button class="gold" data-act="endless">Endless hunt</button>
      <button data-act="gunsmith">Gunsmith</button>
      <button data-act="skills">Skills</button>
    </div>
  `;
  el.querySelector('[data-act="deploy"]').onclick = () => handlers.deploy(profile.unlockedLevel);
  el.querySelector('[data-act="endless"]').onclick = () => handlers.endless();
  el.querySelector('[data-act="gunsmith"]').onclick = () => handlers.gunsmith();
  el.querySelector('[data-act="skills"]').onclick = () => handlers.skills();
  el.querySelectorAll('.track-card[data-level]').forEach((n) => {
    n.onclick = () => {
      if (n.disabled) return;
      handlers.deploy(Number(n.dataset.level));
    };
  });
}

export function renderEnd(el, { title, run, profile, handlers, extract }) {
  const biome = run.biome;
  const next = biomeFor(profile.unlockedLevel);
  el.innerHTML = `
    <p class="kicker">${biome ? biome.place : 'The road'}</p>
    <h2>${title}</h2>
    <p class="muted">${biome ? biome.foe : ''}</p>
    <div class="stats">
      <div>Distance ${run.score.lastMetersPaid.toFixed(1)}m</div>
      <div>Kills ${run.score.kills}</div>
      <div>Headshots ${run.score.headshots}</div>
      <div>Perfects ${run.score.perfects}</div>
      <div>Cash +${fmtMoney(run.score.cash)}</div>
      <div>XP +${Math.floor(run.score.xp)}</div>
      <div>Bank ${fmtMoney(profile.cash)}</div>
      <div>XP pool ${Math.floor(profile.xp)}</div>
    </div>
    <p class="muted">${extract ? `Next: ${next.place}. They get worse from here.` : 'Same road. Upgrade. Try again.'}</p>
    <div class="row">
      ${extract ? '' : '<button class="primary" data-act="retry">Retry this road</button>'}
      <button data-act="hub">Camp</button>
      <button data-act="gunsmith">Gunsmith</button>
      <button data-act="skills">Skills</button>
    </div>
  `;
  const retry = el.querySelector('[data-act="retry"]');
  if (retry) retry.onclick = () => handlers.retry();
  el.querySelector('[data-act="hub"]').onclick = () => handlers.hub();
  el.querySelector('[data-act="gunsmith"]').onclick = () => handlers.gunsmith();
  el.querySelector('[data-act="skills"]').onclick = () => handlers.skills();
}
