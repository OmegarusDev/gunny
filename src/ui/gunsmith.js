import { RECEIVERS, SLOTS, SLOT_MIN_TIER } from '../data/receivers.js';
import { CATALOG_WINDOW, catalogWindow, partsForSlot } from '../data/attachments.js';
import { resolveStats, slotUnlockedFor, gunsmithStatRows } from '../entities/loadout.js';
import { buyBlockedReason, buyPart, equipPart, owns } from '../state/profile.js';
import { fmtMoney, ledgerBlock, statsGrid } from './overlays.js';

const SLOT_LABEL = {
  receiver: 'Receiver',
  barrel: 'Barrel',
  magazine: 'Mag',
  springs: 'Spring',
  optic: 'Optic',
  stock: 'Stock',
  muzzle: 'Muzzle',
  trigger: 'Trigger',
  gasBlock: 'Gas',
};

export function renderGunsmith(el, profile, handlers) {
  const recId = profile.loadout.receiver;
  const stats = resolveStats(profile);

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
  el.dataset.prevSlot = selected;
  el.dataset.prevPart = picked || '';
  const have = item ? owns(profile, item.id) : false;
  const equipped = item ? isEquipped(profile, selected, item.id) : false;
  const gate = item ? buyBlockedReason(profile, item.id) : null;
  const lockedSlot = !!selectedRow?.locked;

  el.innerHTML = `
    <div class="panel-stack gunsmith-stack">
      <div class="page-head">
        <button class="ghost" type="button" data-act="hub">Camp</button>
        ${ledgerBlock(profile)}
      </div>
      <header class="camp-brand workshop-brand">
        <p class="kicker">Facility</p>
        <h2>Gunsmith</h2>
      </header>
      ${statsGrid(gunsmithStatRows(stats), 'stats-wide')}
      <div class="slot-matrix">
        ${rows.map(({ slot, locked, items }) => slotRow(el, profile, slot, locked, items, selected, picked)).join('')}
      </div>
      <div class="sheet-foot" id="gs-actions"></div>
    </div>
  `;

  el.querySelector('[data-act="hub"]').onclick = () => handlers.hub();
  el.querySelectorAll('[data-id]').forEach((n) => {
    n.onclick = () => {
      el.dataset.slot = n.dataset.slot;
      el.dataset.part = n.dataset.id;
      if (el.dataset.winKeep !== n.dataset.slot) el.dataset.winKeep = '';
      renderGunsmith(el, profile, handlers);
    };
  });
  el.querySelectorAll('.slot-label').forEach((label) => {
    label.addEventListener('click', () => {
      el.dataset.slot = label.dataset.slot;
      el.dataset.part = '';
      el.dataset.winKeep = '';
      renderGunsmith(el, profile, handlers);
    });
  });
  el.querySelectorAll('.pager').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const slot = btn.dataset.slot;
      const dir = Number(btn.dataset.dir);
      const key = winKey(slot);
      const row = rows.find((r) => r.slot === slot);
      const win = catalogWindow(row?.items || [], {
        start: Number(el.dataset[key] || 0) + dir,
        keepStart: true,
      });
      el.dataset[key] = String(win.start);
      el.dataset.slot = slot;
      el.dataset.winKeep = slot;
      el.dataset.part = win.items[0]?.id || '';
      renderGunsmith(el, profile, handlers);
    };
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
}

function winKey(slot) {
  return `win${slot[0].toUpperCase()}${slot.slice(1)}`;
}

function slotRow(el, profile, slot, locked, items, selected, picked) {
  const focusId = slot === selected && picked ? picked : profile.loadout[slot];
  const win = catalogWindow(items, {
    focusId,
    start: Number(el.dataset[winKey(slot)] || 0),
    size: CATALOG_WINDOW,
    keepStart: el.dataset.winKeep === slot,
  });
  el.dataset[winKey(slot)] = String(win.start);
  const paged = win.total > CATALOG_WINDOW;
  return `<div class="slot-row ${locked ? 'locked' : ''} ${slot === selected ? 'is-active' : ''}">
    <div class="slot-meta">
      <span class="slot-label" data-slot="${slot}">${SLOT_LABEL[slot]}</span>
    </div>
    <div class="chips ${paged ? 'chips-window' : ''}" role="listbox" style="--chip-cols: ${Math.max(win.items.length, 1)}">
      ${
        paged
          ? `<button class="pager" type="button" data-slot="${slot}" data-dir="-1" ${win.start <= 0 ? 'disabled' : ''} aria-label="Previous ${SLOT_LABEL[slot]}">‹</button>`
          : ''
      }
      ${
        locked
          ? `<span class="muted slot-lock">T${SLOT_MIN_TIER[slot]} receiver</span>`
          : win.items
              .map((it) => {
                const on = slot === selected && it.id === picked;
                const eq = isEquipped(profile, slot, it.id);
                const own = owns(profile, it.id);
                return `<button class="chip part-chip ${on ? 'selected' : ''} ${eq ? 'equipped-chip' : ''} ${own ? '' : 'unowned'}" data-slot="${slot}" data-id="${it.id}">${it.short || it.name}</button>`;
              })
              .join('')
      }
      ${
        paged
          ? `<button class="pager" type="button" data-slot="${slot}" data-dir="1" ${win.start + CATALOG_WINDOW >= win.total ? 'disabled' : ''} aria-label="Next ${SLOT_LABEL[slot]}">›</button>`
          : ''
      }
    </div>
  </div>`;
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
