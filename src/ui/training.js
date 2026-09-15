import { SKILLS, skillCost } from '../data/skills.js';
import { resolveStats } from '../entities/loadout.js';
import { saveProfile } from '../state/profile.js';
import { backButton, ledgerBlock, statsGrid } from './overlays.js';

export function renderTraining(el, profile, handlers) {
  const stats = resolveStats(profile);
  const skills = Object.values(SKILLS);
  const hintId = el.dataset.hint && SKILLS[el.dataset.hint] ? el.dataset.hint : skills[0]?.id;

  el.innerHTML = `
    <div class="panel-stack training-stack">
      <div class="page-head">
        ${backButton()}
        ${ledgerBlock(profile)}
      </div>
      <header class="camp-brand workshop-brand">
        <p class="kicker">Facility</p>
        <h2>Training</h2>
      </header>
      ${statsGrid([
        ['Crit', `${(stats.critChance * 100).toFixed(0)}%`],
        ['Crit ×', stats.critMult.toFixed(2)],
        ['Cash', `×${stats.cashMul.toFixed(2)}`],
        ['Sight', stats.fullScreenAim ? 'Full' : Math.round(stats.aimReach)],
        ['Range', Math.round(stats.shotRange)],
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
            return `<div class="skill-row" data-pick="${def.id}">
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
        <p class="muted foot-hint" data-hint></p>
      </div>
    </div>
  `;

  const hint = el.querySelector('[data-hint]');
  const setHint = (id) => {
    const def = SKILLS[id];
    if (!def) return;
    el.dataset.hint = id;
    hint.textContent = `${def.name} · ${def.desc}`;
  };
  setHint(hintId);

  el.querySelector('[data-act="hub"]').onclick = () => handlers.hub();
  el.querySelectorAll('[data-pick]').forEach((row) => {
    const id = row.dataset.pick;
    row.addEventListener('pointerenter', () => setHint(id));
    row.addEventListener('focusin', () => setHint(id));
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
      el.dataset.hint = def.id;
      renderTraining(el, profile, handlers);
    };
  });
}
