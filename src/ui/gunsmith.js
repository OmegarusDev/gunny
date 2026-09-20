import { RECEIVERS, SLOTS } from '../data/receivers.js';
import { SLOT_MAX, SLOT_UPGRADES, upgradeCost } from '../data/upgrades.js';
import { resolveStats, slotUnlockedFor, gunsmithStatRows } from '../entities/loadout.js';
import { buyBlockedReason, buyPart, equipPart, owns, slotRank, upgradeSlot } from '../state/profile.js';
import { fmtMoney, pageHead, statsGrid } from './overlays.js';
import { bindGameScroll } from './scroll.js';

export function renderGunsmith(el, profile, handlers) {
  const recList = Object.values(RECEIVERS).sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  let recId = el.dataset.rec || profile.loadout.receiver;
  if (!RECEIVERS[recId]) recId = profile.loadout.receiver;
  el.dataset.rec = recId;

  const rec = RECEIVERS[recId];
  const owned = owns(profile, recId);
  const equipped = profile.loadout.receiver === recId;
  const loadoutStats = resolveStats(profile);
  const gate = buyBlockedReason(profile, recId);

  const parts = SLOTS.filter((slot) => slot !== 'receiver' && slotUnlockedFor(recId, slot)).map((slot) => {
    const rank = owned ? slotRank(profile, slot, recId) : 0;
    const maxed = rank >= SLOT_MAX;
    const cost = upgradeCost(slot, rank);
    return { slot, def: SLOT_UPGRADES[slot], rank, maxed, cost };
  });

  const buyLabel =
    !owned && gate && gate !== 'Owned' ? gate : !owned ? `Buy ${fmtMoney(rec.cost)}` : '';
  const buyDisabled = !owned && ((gate && gate !== 'Owned') || profile.cash < rec.cost);

  el.innerHTML = `
    <div class="panel-stack gs-stack">
      ${pageHead(profile, 'Gunsmith')}
      ${statsGrid(gunsmithStatRows(loadoutStats), 'stats-wide')}
      <div class="gs-board">
        <div class="rec-tabs" role="tablist" aria-label="Receivers">
          ${recList
            .map((r) => {
              const have = owns(profile, r.id);
              const on = r.id === recId;
              const eq = profile.loadout.receiver === r.id;
              return `<button class="rec-tab ${on ? 'selected' : ''} ${have ? '' : 'unowned'} ${eq ? 'equipped-chip' : ''}" type="button" data-rec="${r.id}" role="tab" aria-selected="${on}">${r.short}</button>`;
            })
            .join('')}
        </div>
        <div class="gs-pane ${owned ? '' : 'is-locked'}">
          <div class="gs-scroll-wrap is-idle">
            <div class="part-grid" style="--part-cols: 3">
              ${parts.map((p) => partCard(p, owned, profile.cash)).join('')}
            </div>
            <div class="gs-scroll" role="scrollbar" aria-label="Gunsmith parts">
              <div class="scroll-thumb"></div>
            </div>
          </div>
          ${
            owned
              ? ''
              : `<div class="gs-buy-layer">
                  <button class="primary" type="button" data-buy ${buyDisabled ? 'disabled' : ''}>${buyLabel}</button>
                </div>`
          }
        </div>
      </div>
      <div class="sheet-foot" id="gs-actions"></div>
    </div>
  `;

  el.querySelector('[data-act="hub"]').onclick = () => (handlers.back || handlers.hub)();
  el.querySelectorAll('[data-rec]').forEach((btn) => {
    btn.onclick = () => {
      el.dataset.rec = btn.dataset.rec;
      el.dataset.gsScroll = '0';
      renderGunsmith(el, profile, handlers);
    };
  });

  const hint = document.createElement('p');
  hint.className = 'muted foot-hint';
  const actions = el.querySelector('#gs-actions');
  const setHint = (text) => {
    hint.textContent = text || '';
  };
  setHint(owned ? rec.desc : `${rec.name} · ${rec.desc}`);
  actions.appendChild(hint);

  const buyBtn = el.querySelector('[data-buy]');
  if (buyBtn && !buyBtn.disabled) {
    buyBtn.onclick = () => {
      if (buyPart(profile, rec.id, rec.cost)) {
        el.dataset.rec = rec.id;
        renderGunsmith(el, profile, handlers);
      }
    };
  }

  if (owned && !equipped) {
    const b = document.createElement('button');
    b.className = 'primary';
    b.textContent = 'Equip';
    b.onclick = () => {
      if (equipPart(profile, 'receiver', rec.id)) renderGunsmith(el, profile, handlers);
    };
    actions.appendChild(b);
  }

  el.querySelectorAll('[data-upgrade]').forEach((btn) => {
    btn.onclick = () => {
      if (upgradeSlot(profile, btn.dataset.upgrade, recId)) renderGunsmith(el, profile, handlers);
    };
  });
  el.querySelectorAll('.part-card').forEach((card) => {
    const def = SLOT_UPGRADES[card.dataset.slot];
    if (!def) return;
    card.addEventListener('pointerenter', () => setHint(`${def.name} · ${def.desc}`));
    card.addEventListener('focusin', () => setHint(`${def.name} · ${def.desc}`));
  });
  el.querySelectorAll('.stats [data-tip]').forEach((n) => {
    const text = `${n.dataset.tipTitle} · ${n.dataset.tip}`;
    n.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      setHint(text);
    });
    n.addEventListener('click', () => setHint(text));
    n.addEventListener('pointerenter', () => setHint(text));
    n.addEventListener('focusin', () => setHint(text));
  });

  const grid = el.querySelector('.part-grid');
  const track = el.querySelector('.gs-scroll');
  if (grid && track) {
    grid.scrollTop = Number(el.dataset.gsScroll || 0);
    bindGameScroll(grid, track, { persist: el.dataset });
    grid.addEventListener(
      'scroll',
      () => {
        el.dataset.gsScroll = String(grid.scrollTop);
      },
      { passive: true },
    );
  }
}

function partCard({ slot, def, rank, maxed, cost }, owned, cash) {
  if (!def) return '';
  const fill = Math.max(0, Math.min(1, rank / SLOT_MAX));
  const can = owned && !maxed && cash >= cost;
  return `<div class="part-card" data-slot="${slot}">
    <strong>${def.short}</strong>
    <span class="part-bar" aria-hidden="true"><i style="transform: scaleX(${fill})"></i></span>
    ${
      maxed
        ? `<button type="button" disabled>MAX</button>`
        : `<button type="button" class="${can ? 'primary' : ''}" data-upgrade="${slot}" ${owned && can ? '' : 'disabled'}>Upgrade ${fmtMoney(cost)}</button>`
    }
  </div>`;
}
