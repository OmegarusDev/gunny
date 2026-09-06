import { SKILLS, skillCost } from '../data/skills.js';
import { resolveStats } from '../entities/loadout.js';
import { saveProfile } from '../state/profile.js';

export function renderSkills(el, profile, handlers) {
  const stats = resolveStats(profile);
  el.innerHTML = `
    <p class="kicker">Blood & powder</p>
    <h2>Gunner skills</h2>
    <p class="muted">XP ${Math.floor(profile.xp)} · Crit ${(stats.critChance * 100).toFixed(0)}% × ${stats.critMult.toFixed(2)} · Headshots are not crits</p>
    <div class="skill-list">
      ${Object.values(SKILLS)
        .map((def) => {
          const rank = profile.skillRanks[def.id] || 0;
          const maxed = rank >= def.maxRank;
          const cost = skillCost(def, rank);
          return `<div class="item">
            <strong>${def.name}</strong>  RANK ${rank}/${def.maxRank} ${maxed ? '' : '· ' + cost + ' XP'}<br/>
            <span class="muted">${def.desc}</span>
            <div class="row"><button data-skill="${def.id}" ${maxed || profile.xp < cost ? 'disabled' : ''}>UPGRADE</button></div>
          </div>`;
        })
        .join('')}
    </div>
    <div class="row">
      <button data-act="hub">Back to camp</button>
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
      renderSkills(el, profile, handlers);
    };
  });
  el.querySelector('[data-act="hub"]').onclick = () => handlers.hub();
}
