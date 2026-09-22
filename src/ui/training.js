import { SKILLS, skillCost } from '../data/skills.js';
import { resolveStats, trainingStatRows } from '../entities/loadout.js';
import { saveProfile } from '../state/profile.js';
import { pageHead, statsGrid } from './overlays.js';

export function renderTraining(el, profile, handlers) {
  const stats = resolveStats(profile);
  const skills = Object.values(SKILLS);
  const hintId = el.dataset.hint && SKILLS[el.dataset.hint] ? el.dataset.hint : skills[0]?.id;

  el.innerHTML = `
    <div class="panel-stack">
      ${pageHead(profile, 'Training')}
      ${statsGrid(trainingStatRows(stats), 'stats-row stats-skills')}
      <div class="train-grid">
        ${skills
          .map((def) => {
            const rank = profile.skillRanks[def.id] || 0;
            const maxed = rank >= def.maxRank;
            const cost = skillCost(def, rank);
            const can = !maxed && profile.xp >= cost;
            const fill = Math.max(0, Math.min(1, rank / def.maxRank));
            return `<div class="skill-row" data-pick="${def.id}">
              <div class="skill-main">
                <div class="card-top">
                  <strong>${def.short || def.name}</strong>
                  <span class="tag">${rank}/${def.maxRank}</span>
                </div>
                <span class="part-bar" aria-hidden="true"><i style="transform: scaleX(${fill})"></i></span>
              </div>
              <button class="${can ? 'primary' : ''}" data-skill="${def.id}" ${can ? '' : 'disabled'}>
                ${maxed ? 'MAX' : cost + ' XP'}
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
  const setSkillHint = (id) => {
    const def = SKILLS[id];
    if (!def) return;
    el.dataset.hint = id;
    hint.textContent = `${def.name} · ${def.desc}`;
  };
  const setStatHint = (node) => {
    if (!node?.dataset?.tip) return;
    hint.textContent = `${node.dataset.tipTitle} · ${node.dataset.tip}`;
  };
  setSkillHint(hintId);

  el.querySelector('[data-act="hub"]').onclick = () => (handlers.back || handlers.hub)();
  el.querySelectorAll('.stats [data-tip]').forEach((n) => {
    n.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      setStatHint(n);
    });
    n.addEventListener('click', () => setStatHint(n));
    n.addEventListener('pointerenter', () => setStatHint(n));
    n.addEventListener('focusin', () => setStatHint(n));
  });
  el.querySelectorAll('[data-pick]').forEach((row) => {
    const id = row.dataset.pick;
    row.addEventListener('pointerenter', () => setSkillHint(id));
    row.addEventListener('focusin', () => setSkillHint(id));
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
      profile.xpSpent = Math.max(0, Math.floor(Number(profile.xpSpent) || 0)) + cost;
      profile.skillRanks[def.id] = rank + 1;
      saveProfile(profile);
      el.dataset.hint = def.id;
      renderTraining(el, profile, handlers);
    };
  });
}
