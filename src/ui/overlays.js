import { gunnerLevel } from '../data/skills.js';
import { mountOptions } from './options.js';

const PANEL_KEYS = ['hub', 'gunsmith', 'training', 'end'];

export function mountOverlays(root, optionHandlers) {
  root.innerHTML = `
    <div class="stage">
      <div id="panel-hub" class="panel panel-hero hidden"></div>
      <div id="panel-gunsmith" class="panel panel-hero hidden"></div>
      <div id="panel-training" class="panel panel-hero hidden"></div>
      <div id="panel-end" class="panel panel-hero hidden"></div>
    </div>
  `;
  const options = mountOptions(root, optionHandlers);
  const api = {
    hub: root.querySelector('#panel-hub'),
    gunsmith: root.querySelector('#panel-gunsmith'),
    training: root.querySelector('#panel-training'),
    end: root.querySelector('#panel-end'),
    options,
    show(name) {
      for (const key of PANEL_KEYS) {
        api[key].classList.toggle('hidden', key !== name);
      }
      options.setVisible(true);
    },
    hideAll() {
      for (const key of PANEL_KEYS) api[key].classList.add('hidden');
      options.setVisible(false);
    },
  };
  return api;
}

export function fmtMoney(n) {
  return `$${Math.floor(n)}`;
}

export function ledgerBlock(profile) {
  return `<div class="ledger" role="group" aria-label="Ledger">
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
  </div>`;
}

export function statsGrid(rows, extraClass = '') {
  return `<div class="stats ${extraClass}">${rows
    .map(([label, value, hint]) => {
      const tip = hint
        ? ` data-tip="${escapeAttr(hint)}" data-tip-title="${escapeAttr(label)}" tabindex="0" role="button"`
        : '';
      return `<div${tip}><span>${label}</span><b>${value}</b></div>`;
    })
    .join('')}</div>`;
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function backButton(label = 'Back') {
  return `<button class="back" type="button" data-act="hub" aria-label="${label}">
    <svg class="back-arrow" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.5 5 L7 12 l7.5 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>`;
}
