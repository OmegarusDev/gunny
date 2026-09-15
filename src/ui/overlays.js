import { gunnerLevel } from '../data/skills.js';

const PANEL_KEYS = ['hub', 'gunsmith', 'training', 'end'];

export function mountOverlays(root) {
  root.innerHTML = `
    <header class="chrome-ledger hidden" id="chrome-ledger"></header>
    <aside class="sat-panel hidden" id="sat-stats"></aside>
    <div class="stage">
      <div id="panel-hub" class="panel hidden"></div>
      <div id="panel-gunsmith" class="panel hidden"></div>
      <div id="panel-training" class="panel hidden"></div>
      <div id="panel-end" class="panel hidden"></div>
    </div>
  `;
  const ledger = root.querySelector('#chrome-ledger');
  const sat = root.querySelector('#sat-stats');
  const api = {
    hub: root.querySelector('#panel-hub'),
    gunsmith: root.querySelector('#panel-gunsmith'),
    training: root.querySelector('#panel-training'),
    end: root.querySelector('#panel-end'),
    show(name) {
      for (const key of PANEL_KEYS) {
        api[key].classList.toggle('hidden', key !== name);
      }
      ledger.classList.remove('hidden');
      sat.classList.remove('hidden');
    },
    hideAll() {
      for (const key of PANEL_KEYS) api[key].classList.add('hidden');
      ledger.classList.add('hidden');
      sat.classList.add('hidden');
    },
    setChrome(profile, { back = false, onBack, stats = '' } = {}) {
      ledger.innerHTML = `
        <div class="ledger">
          <div>
            <span class="ledger-label">Cash</span>
            <span class="ledger-value">${fmtMoney(profile.cash)}</span>
          </div>
          <div>
            <span class="ledger-label">XP</span>
            <span class="ledger-value">${Math.floor(profile.xp)}</span>
          </div>
          <div>
            <span class="ledger-label">Gunner</span>
            <span class="ledger-value">Lv ${gunnerLevel(profile)}</span>
          </div>
        </div>
        ${back ? `<button class="ghost" type="button" data-act="hub">Camp</button>` : ''}
      `;
      sat.innerHTML = stats;
      const btn = ledger.querySelector('[data-act="hub"]');
      if (btn && onBack) btn.onclick = onBack;
    },
  };
  return api;
}

export function fmtMoney(n) {
  return `$${Math.floor(n)}`;
}

export function statsRail(rows) {
  return `<div class="stats stats-rail">${rows
    .map(([label, value]) => `<div><span>${label}</span>${value}</div>`)
    .join('')}</div>`;
}
