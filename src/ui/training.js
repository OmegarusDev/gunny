import { SKILLS, gunnerLevel, skillCost } from '../data/skills.js';
import { resolveStats } from '../entities/loadout.js';
import { saveProfile } from '../state/profile.js';

export function renderTraining(el, profile, handlers) {
  const stats = resolveStats(profile);
  el.innerHTML = `
    <div class="page-head">
      <div>
        <p class="kicker">Facility</p>
        <h2>Training</h2>
      </div>
      <div class="page-meta">
        <span>${Math.floor(profile.xp)} XP · Lv ${gunnerLevel(profile)}</span>
        <button class="ghost" data-act="hub">Camp</button>
      </div>
    </div>
    <p class="muted train-blurb">Precision Reloading speeds the bar and widens the perfect zone. Headshots are not crits.</p>
    <div class="card-list train-grid">
      ${Object.values(SKILLS)
        .map((def) => {
          const rank = profile.skillRanks[def.id] || 0;
          const maxed = rank >= def.maxRank;
          const cost = skillCost(def, rank);
          const can = !maxed && profile.xp >= cost;
          const pips = Array.from({ length: def.maxRank }, (_, i) => `<i class="${i < rank ? 'on' : ''}"></i>`).join('');
          return `<div class="card skill-card">
            <div class="card-top">
              <strong>${def.name}</strong>
              <span class="tag">${rank}/${def.maxRank}</span>
            </div>
            <div class="pips">${pips}</div>
            <span class="muted">${def.desc}</span>
            <button class="${can ? 'primary' : ''}" data-skill="${def.id}" ${can ? '' : 'disabled'}>
              ${maxed ? 'Maxed' : 'Upgrade · ' + cost + ' XP'}
            </button>
          </div>`;
        })
        .join('')}
    </div>
    <div class="stats">
      <div><span>Crit</span>${(stats.critChance * 100).toFixed(0)}%</div>
      <div><span>Crit ×</span>${stats.critMult.toFixed(2)}</div>
      <div><span>Cash from kills</span>×${stats.cashMul.toFixed(2)}</div>
      <div><span>Aim rate</span>${stats.aimRate.toFixed(1)}</div>
      <div><span>Aim reach</span>${Math.round(stats.aimReach)}px</div>
      <div><span>Spread</span>${stats.baseSpread.toFixed(2)}°</div>
    </div>
  `;
  el.querySelectorAll('[data-skill]').forEach((btn) => {
    btn.onclick = () => {
      const def = SKILLS[btn.dataset.skill];
      const rank = profile.skillRanks[def.id] || 0;
      if (rank >= def.maxRank) return;
      const cost = skillCost(def, rank);
      if (profile.xp < cost) return;
      profile.xp -= cost;
      profile.skillRanks[def.id] = rank + 1;
      saveProfile(profile);
      renderTraining(el, profile, handlers);
    };
  });
  el.querySelector('[data-act="hub"]').onclick = () => handlers.hub();
}
