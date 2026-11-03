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
      options.setVisible(name === 'hub');
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

export function formatReload(sec) {
  const s = Math.round(Number(sec) * 100) / 100;
  return `${s}s`;
}

export function formatMetres(m) {
  const n = Number(m);
  if (!Number.isFinite(n)) return '0 m';
  return `${Math.max(0, Math.floor(n))} m`;
}

export function ledgerBlock(profile) {
  return `<div class="ledger" role="group" aria-label="Ledger">
    <div class="ledger-gunner">
      <span class="ledger-label">Gunner</span>
      <span class="ledger-value">Lv ${gunnerLevel(profile)}</span>
    </div>
    <div class="ledger-funds">
      <div>
        <span class="ledger-label">Cash</span>
        <span class="ledger-value">${fmtMoney(profile.cash)}</span>
      </div>
      <div>
        <span class="ledger-label">XP</span>
        <span class="ledger-value">${Math.floor(profile.xp)}</span>
      </div>
    </div>
  </div>`;
}

const COG_SVG = `<svg class="back-arrow" viewBox="0 0 24 24" aria-hidden="true">
  <path fill="currentColor" d="M19.1 12.9a7.4 7.4 0 0 0 .1-.9 7.4 7.4 0 0 0-.1-.9l2-1.5a.5.5 0 0 0 .1-.6l-1.9-3.3a.5.5 0 0 0-.6-.2l-2.4 1a7 7 0 0 0-1.6-.9l-.4-2.5a.5.5 0 0 0-.5-.4h-3.8a.5.5 0 0 0-.5.4l-.4 2.5a7 7 0 0 0-1.6.9l-2.4-1a.5.5 0 0 0-.6.2L2.7 9a.5.5 0 0 0 .1.6l2 1.5a7.4 7.4 0 0 0-.1.9 7.4 7.4 0 0 0 .1.9l-2 1.5a.5.5 0 0 0-.1.6l1.9 3.3a.5.5 0 0 0 .6.2l2.4-1a7 7 0 0 0 1.6.9l.4 2.5a.5.5 0 0 0 .5.4h3.8a.5.5 0 0 0 .5-.4l.4-2.5a7 7 0 0 0 1.6-.9l2.4 1a.5.5 0 0 0 .6-.2l1.9-3.3a.5.5 0 0 0-.1-.6zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"/>
</svg>`;

export function pageHead(profile, title, left = 'back') {
  const control =
    left === 'options'
      ? `<button class="back" type="button" data-act="options" aria-label="Options">${COG_SVG}</button>`
      : left === 'none'
        ? `<span class="back back-spacer" aria-hidden="true"></span>`
        : backButton();
  return `<div class="page-head">
    ${control}
    ${ledgerBlock(profile)}
    ${title ? `<h2 class="page-title">${title}</h2>` : ''}
  </div>`;
}

export function statsGrid(rows, extraClass = '') {
  return `<div class="stats ${extraClass}">${rows
    .map(([label, value, hint]) => {
      const payout = label === 'Clear' ? ' class="is-payout"' : '';
      const tip = hint
        ? ` data-tip="${escapeAttr(hint)}" data-tip-title="${escapeAttr(label)}" tabindex="0" role="button"`
        : '';
      return `<div${payout}${tip}><span>${label}</span><b>${value}</b></div>`;
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
