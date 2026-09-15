import { SKILLS, skillCost } from '../data/skills.js';
import { resolveStats } from '../entities/loadout.js';
import { saveProfile } from '../state/profile.js';
import { statsGrid } from './overlays.js';

export function renderTraining(el, profile, handlers) {
  const stats = resolveStats(profile);
  handlers.chrome?.(null, { back: true });

  const skills = Object.values(SKILLS);
  let picked = el.dataset.skill || skills[0]?.id;
  if (!skills.some((s) => s.id === picked)) picked = skills[0]?.id;
  const focus = SKILLS[picked];

  el.innerHTML = `
    <div class="panel-stack training-stack">
      <header class="camp-brand">
        <p class="kicker">Facility</p>
        <h2>Training</h2>
      </header>
      ${statsGrid([
        ['Crit', `${(stats.critChance * 100).toFixed(0)}%`],
        ['Crit ×', stats.critMult.toFixed(2)],
        ['Cash', `×${stats.cashMul.toFixed(2)}`],
        ['Aim', stats.aimRate.toFixed(1)],
        ['Reach', Math.round(stats.aimReach)],
        ['Spread', `${stats.baseSpread.toFixed(2)}°`],
      ])}
      <div class="train-grid">
        ${skills
          .map((def) => {
            const rank = profile.skillRanks[def.id] || 0;
            const maxed = rank >= def.maxRank;
            const cost = skillCost(def, rank);
            const can = !maxed && profile.xp >= cost;
            const pips = Array.from(
              { length: def.maxRank },
              (_, i) => `<i class="${i < rank ? 'on' : ''}"></i>`,
            ).join('');
            return `<div class="skill-row ${def.id === picked ? 'selected' : ''}" data-pick="${def.id}">
              <div class="skill-main">
                <div class="card-top">
                  <strong>${def.short || def.name}</strong>
                  <span class="tag">${rank}/${def.maxRank}</span>
                </div>
                <div class="pips">${pips}</div>
              </div>
              <button class="${can ? 'primary' : ''}" data-skill="${def.id}" ${can ? '' : 'disabled'}>
                ${maxed ? 'Max' : cost + ' XP'}
              </button>
            </div>`;
          })
          .join('')}
      </div>
      <div class="sheet-foot">
        <p class="muted foot-hint">${focus?.name ?? ''} · ${focus?.desc ?? ''}</p>
      </div>
    </div>
  `;
  el.querySelectorAll('[data-pick]').forEach((row) => {
    row.onclick = (e) => {
      if (e.target.closest('[data-skill]')) return;
      el.dataset.skill = row.dataset.pick;
      renderTraining(el, profile, handlers);
    };
  });
  el.querySelectorAll('[data-skill]').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const def = SKILLS[btn.dataset.skill];
      const rank = profile.skillRanks[def.id] || 0;
      if (rank >= def.maxRank) return;
      const cost = skillCost(def, rank);
      if (profile.xp < cost) return;
      profile.xp -= cost;
      profile.skillRanks[def.id] = rank + 1;
      saveProfile(profile);
      el.dataset.skill = def.id;
      renderTraining(el, profile, handlers);
    };
  });
}
