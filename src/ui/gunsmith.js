import { RECEIVERS, SLOTS, SLOT_MIN_TIER } from '../data/receivers.js';
import { partsForSlot } from '../data/attachments.js';
import { resolveStats, slotUnlockedFor, gunsmithStatRows } from '../entities/loadout.js';
import { buyBlockedReason, buyPart, equipPart, owns } from '../state/profile.js';
import { fmtMoney, statsRail } from './overlays.js';

const SLOT_LABEL = {
  receiver: 'Rec',
  barrel: 'Barrel',
  magazine: 'Mag',
  springs: 'Spring',
  optic: 'Optic',
  stock: 'Stock',
  muzzle: 'Muzzle',
  trigger: 'Trig',
  gasBlock: 'Gas',
};

export function renderGunsmith(el, profile, handlers) {
  const recId = profile.loadout.receiver;
  const savedScroll = [...el.querySelectorAll('.slot-row .chips')].map((n) => n.scrollLeft);
  const prevSlot = el.dataset.prevSlot;
  const prevPart = el.dataset.prevPart;
  const stats = resolveStats(profile);
  handlers.chrome?.(
    statsRail(gunsmithStatRows(stats)),
    { back: true },
  );

  const selected = el.dataset.slot || 'receiver';
  const rows = SLOTS.map((slot) => {
    const locked = slot !== 'receiver' && !slotUnlockedFor(recId, slot);
    const items = locked ? [] : catalog(slot, recId);
    return { slot, locked, items };
  });

  let picked = el.dataset.part;
  const selectedRow = rows.find((r) => r.slot === selected);
  if (!picked || !selectedRow?.items.some((i) => i.id === picked)) {
    picked = selectedRow?.items.find((i) => isEquipped(profile, selected, i.id))?.id || selectedRow?.items[0]?.id;
  }
  const item = selectedRow?.items.find((i) => i.id === picked);
  const selectionChanged = selected !== prevSlot || picked !== prevPart;
  el.dataset.prevSlot = selected;
  el.dataset.prevPart = picked || '';
  const have = item ? owns(profile, item.id) : false;
  const equipped = item ? isEquipped(profile, selected, item.id) : false;
  const gate = item ? buyBlockedReason(profile, item.id) : null;
  const lockedSlot = !!selectedRow?.locked;

  el.innerHTML = `
    <div class="panel-stack gunsmith-stack">
      <header class="camp-brand">
        <p class="kicker">Facility</p>
        <h2>Gunsmith</h2>
      </header>
      <div class="slot-matrix">
        ${rows
          .map(({ slot, locked, items }) => {
            return `<div class="slot-row ${locked ? 'locked' : ''} ${slot === selected ? 'is-active' : ''}">
              <span class="slot-label">${SLOT_LABEL[slot]}</span>
              <div class="chips" role="listbox">
                ${
                  locked
                    ? `<span class="muted slot-lock">T${SLOT_MIN_TIER[slot]}</span>`
                    : items
                        .map((it) => {
                          const on = slot === selected && it.id === picked;
                          const eq = isEquipped(profile, slot, it.id);
                          const own = owns(profile, it.id);
                          return `<button class="chip part-chip ${on ? 'selected' : ''} ${eq ? 'equipped-chip' : ''} ${own ? '' : 'unowned'}" data-slot="${slot}" data-id="${it.id}">${it.short || it.name}</button>`;
                        })
                        .join('')
                }
              </div>
            </div>`;
          })
          .join('')}
      </div>
      <div class="sheet-foot" id="gs-actions"></div>
    </div>
  `;

  el.querySelectorAll('[data-id]').forEach((n) => {
    n.onclick = () => {
      el.dataset.slot = n.dataset.slot;
      el.dataset.part = n.dataset.id;
      renderGunsmith(el, profile, handlers);
    };
  });
  el.querySelectorAll('.slot-row').forEach((row, i) => {
    const slot = SLOTS[i];
    row.querySelector('.slot-label')?.addEventListener('click', () => {
      el.dataset.slot = slot;
      el.dataset.part = '';
      renderGunsmith(el, profile, handlers);
    });
  });

  const actions = el.querySelector('#gs-actions');
  if (lockedSlot) {
    actions.innerHTML = `<p class="muted foot-hint">Needs a T${SLOT_MIN_TIER[selected]} receiver.</p>`;
  } else if (item) {
    const hint = document.createElement('p');
    hint.className = 'muted foot-hint';
    hint.textContent = `${item.name}${item.desc ? ' · ' + item.desc : ''}`;
    actions.appendChild(hint);
    const b = document.createElement('button');
    b.className = 'primary';
    if (!have) {
      if (gate && gate !== 'Owned') {
        b.textContent = gate;
        b.disabled = true;
      } else {
        b.textContent = `Buy ${fmtMoney(item.cost)}`;
        b.disabled = profile.cash < item.cost;
        b.onclick = () => {
          if (buyPart(profile, item.id, item.cost)) renderGunsmith(el, profile, handlers);
        };
      }
    } else {
      b.textContent = equipped ? 'Equipped' : 'Equip';
      b.disabled = equipped;
      b.onclick = () => {
        if (equipPart(profile, selected, item.id)) renderGunsmith(el, profile, handlers);
      };
    }
    actions.appendChild(b);
  }

  requestAnimationFrame(() => {
    el.querySelectorAll('.slot-row .chips').forEach((n, i) => {
      if (savedScroll[i] != null) n.scrollLeft = savedScroll[i];
    });
    const on = el.querySelector('.part-chip.selected');
    if (selectionChanged) on?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  });
}

function catalog(slot, recId) {
  if (slot === 'receiver') {
    return Object.values(RECEIVERS).sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  }
  if (!slotUnlockedFor(recId, slot)) return [];
  return partsForSlot(slot);
}

function isEquipped(profile, slot, id) {
  return profile.loadout[slot] === id;
}
