import { RECEIVERS, SLOTS, SLOT_MIN_TIER } from '../data/receivers.js';
import { catalogProgressWindow, partsForSlot } from '../data/attachments.js';
import { resolveStats, slotUnlockedFor, gunsmithStatRows } from '../entities/loadout.js';
import { buyBlockedReason, buyPart, equipPart, owns } from '../state/profile.js';
import { fmtMoney, backButton, ledgerBlock, statsGrid } from './overlays.js';
import { bindGameScroll } from './scroll.js';

const SLOT_LABEL = {
  receiver: 'Receiver',
  magazine: 'Mag',
  bolt: 'Bolt',
  ammo: 'Ammo',
  barrel: 'Barrel',
  springs: 'Spring',
  grip: 'Grip',
  optic: 'Optic',
  stock: 'Stock',
  trigger: 'Trigger',
  muzzle: 'Muzzle',
  gasBlock: 'Gas',
  laser: 'Laser',
};

export function renderGunsmith(el, profile, handlers) {
  const recId = profile.loadout.receiver;
  const stats = resolveStats(profile);

  const selected = el.dataset.slot || 'receiver';
  const rows = SLOTS.map((slot) => {
    const locked = slot !== 'receiver' && !slotUnlockedFor(recId, slot);
    const items = locked ? [] : catalog(slot, recId);
    return { slot, locked, items, win: visibleWindow(profile, items, slot) };
  });

  let picked = el.dataset.part;
  const selectedRow = rows.find((r) => r.slot === selected);
  const visible = selectedRow?.win.items || [];
  if (!picked || !visible.some((i) => i.id === picked)) {
    picked =
      visible.find((i) => !owns(profile, i.id))?.id ||
      visible.find((i) => isEquipped(profile, selected, i.id))?.id ||
      visible[0]?.id;
  }
  const item = selectedRow?.items.find((i) => i.id === picked);
  el.dataset.prevSlot = selected;
  el.dataset.prevPart = picked || '';
  const have = item ? owns(profile, item.id) : false;
  const equipped = item ? isEquipped(profile, selected, item.id) : false;
  const gate = item ? buyBlockedReason(profile, item.id) : null;
  const lockedSlot = !!selectedRow?.locked;

  el.innerHTML = `
    <div class="panel-stack">
      <div class="page-head">
        ${backButton()}
        ${ledgerBlock(profile)}
      </div>
      <header class="camp-brand workshop-brand">
        <p class="kicker">Facility</p>
        <h2>Gunsmith</h2>
      </header>
      ${statsGrid(gunsmithStatRows(stats), 'stats-wide')}
      <div class="gs-scroll-wrap">
        <div class="slot-matrix">
          ${rows.map(({ slot, locked, win }) => slotRow(profile, slot, locked, win.items, selected, picked)).join('')}
        </div>
        <div class="gs-scroll" role="scrollbar" aria-label="Gunsmith parts">
          <div class="scroll-thumb"></div>
        </div>
      </div>
      <div class="sheet-foot" id="gs-actions"></div>
    </div>
  `;

  el.querySelector('[data-act="hub"]').onclick = () => (handlers.back || handlers.hub)();
  el.querySelectorAll('[data-id]').forEach((n) => {
    n.onclick = () => {
      el.dataset.slot = n.dataset.slot;
      el.dataset.part = n.dataset.id;
      renderGunsmith(el, profile, handlers);
    };
  });
  el.querySelectorAll('.slot-label').forEach((label) => {
    label.addEventListener('click', () => {
      el.dataset.slot = label.dataset.slot;
      el.dataset.part = '';
      renderGunsmith(el, profile, handlers);
    });
  });

  const actions = el.querySelector('#gs-actions');
  const hint = document.createElement('p');
  hint.className = 'muted foot-hint';
  const setHint = (text) => {
    hint.textContent = text || '';
  };
  const partHint = item ? `${item.name}${item.desc ? ' · ' + item.desc : ''}` : '';
  if (lockedSlot) {
    setHint(`Needs ${slotLockName(selected)}.`);
    actions.appendChild(hint);
  } else if (item) {
    setHint(partHint);
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
  } else {
    actions.appendChild(hint);
  }

  el.querySelectorAll('.stats [data-tip]').forEach((n) => {
    const text = `${n.dataset.tipTitle} · ${n.dataset.tip}`;
    n.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      setHint(text);
    });
    n.addEventListener('click', () => setHint(text));
    n.addEventListener('pointerenter', () => setHint(text));
    n.addEventListener('focusin', () => setHint(text));
    n.addEventListener('pointerleave', () => setHint(partHint));
  });
  el.querySelectorAll('[data-id]').forEach((n) => {
    const it = selectedRow?.items.find((i) => i.id === n.dataset.id) || rows.find((r) => r.slot === n.dataset.slot)?.items.find((i) => i.id === n.dataset.id);
    if (!it) return;
    const text = `${it.name}${it.desc ? ' · ' + it.desc : ''}`;
    n.addEventListener('pointerenter', () => setHint(text));
    n.addEventListener('focusin', () => setHint(text));
  });

  const matrix = el.querySelector('.slot-matrix');
  const track = el.querySelector('.gs-scroll');
  if (matrix && track) {
    matrix.scrollTop = Number(el.dataset.gsScroll || 0);
    bindGameScroll(matrix, track, { persist: el.dataset });
    matrix.addEventListener(
      'scroll',
      () => {
        el.dataset.gsScroll = String(matrix.scrollTop);
      },
      { passive: true },
    );
  }
}

function slotLockName(slot) {
  const tier = SLOT_MIN_TIER[slot];
  const rec = Object.values(RECEIVERS).find((r) => r.tier === tier);
  return rec ? rec.short : `T${tier}`;
}

function visibleWindow(profile, items, slot) {
  if (slot === 'receiver') return { items, start: 0, total: items.length };
  const next = items.find((i) => !owns(profile, i.id)) || items[items.length - 1];
  return catalogProgressWindow(items, { nextId: next?.id });
}

function slotRow(profile, slot, locked, items, selected, picked) {
  return `<div class="slot-row ${locked ? 'locked' : ''} ${slot === selected ? 'is-active' : ''}">
    <div class="slot-meta">
      <span class="slot-label" data-slot="${slot}">${SLOT_LABEL[slot]}</span>
    </div>
    <div class="chips" role="listbox" style="--chip-cols: ${Math.max(items.length, 1)}">
      ${
        locked
          ? `<span class="muted slot-lock">Needs ${slotLockName(slot)}</span>`
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
