import { RECEIVERS, SLOTS, SLOT_MIN_TIER } from '../data/receivers.js';
import { PARTS, partsForSlot } from '../data/attachments.js';
import { resolveStats, slotUnlockedFor } from '../entities/loadout.js';
import { buyPart, equipPart, owns } from '../state/profile.js';
import { fmtMoney } from './overlays.js';

const SLOT_LABEL = {
  receiver: 'Receiver',
  barrel: 'Barrel',
  magazine: 'Magazine',
  optic: 'Optic',
  stock: 'Stock',
  muzzle: 'Muzzle',
  trigger: 'Trigger',
  gasBlock: 'Gas Block',
  springs: 'Springs',
};

export function renderGunsmith(el, profile, handlers) {
  const recId = profile.loadout.receiver;
  const selected = el.dataset.slot || 'receiver';
  const stats = resolveStats(profile);
  const items = catalog(selected, recId);

  el.innerHTML = `
    <p class="kicker">Workbench</p>
    <h2>Gunsmith</h2>
    <p class="muted">T1 barrel + mag · T2 optic / stock / muzzle · T3 internals · Bank ${fmtMoney(profile.cash)}</p>
    <div class="split">
      <div class="slot-list">
        ${SLOTS.map((slot) => {
          const locked = !slotUnlockedFor(recId, slot) && slot !== 'receiver';
          const eq = slot === 'receiver' ? RECEIVERS[profile.loadout.receiver]?.name : PARTS[profile.loadout[slot]]?.name;
          return `<div class="item ${selected === slot ? 'selected' : ''} ${locked ? 'locked' : ''}" data-slot="${slot}">
            ${SLOT_LABEL[slot]}${locked ? '  LOCKED T' + SLOT_MIN_TIER[slot] : ''}<br/><span class="muted">${eq ?? '—'}</span>
          </div>`;
        }).join('')}
      </div>
      <div>
        <div class="part-list">
          ${items
            .map((item) => {
              const equipped = isEquipped(profile, selected, item.id);
              const have = owns(profile, item.id);
              return `<div class="item ${equipped ? 'equipped' : ''} ${have ? '' : 'locked'}" data-id="${item.id}">
                <strong>${item.name}</strong> ${have ? '' : fmtMoney(item.cost)} ${equipped ? '· EQUIPPED' : have ? '· OWNED' : ''}<br/>
                <span class="muted">${item.desc}</span>
              </div>`;
            })
            .join('')}
        </div>
        <div class="stats" style="margin-top:12px">
          <div>DMG ${stats.damage.toFixed(1)}</div>
          <div>ROF ${stats.rof.toFixed(1)}</div>
          <div>MAG ${stats.magSize}</div>
          <div>VEL ${stats.bulletSpeed.toFixed(0)}</div>
          <div>PEN ${stats.pen.toFixed(2)}</div>
          <div>RELOAD ${stats.reload.toFixed(2)}s</div>
          <div>PERF ${(stats.perfectWidth * 100).toFixed(0)}%</div>
          <div>BLOOM ${stats.bloomPerShot.toFixed(2)}°/SH</div>
        </div>
        <div class="row" id="gs-actions"></div>
        <div class="row">
          <button data-act="hub">Back to camp</button>
        </div>
      </div>
    </div>
  `;

  el.querySelectorAll('[data-slot]').forEach((n) => {
    n.onclick = () => {
      el.dataset.slot = n.dataset.slot;
      renderGunsmith(el, profile, handlers);
    };
  });

  let picked = el.dataset.part || items[0]?.id;
  if (!items.some((i) => i.id === picked)) picked = items[0]?.id;
  const actions = el.querySelector('#gs-actions');

  el.querySelectorAll('[data-id]').forEach((n) => {
    if (n.dataset.id === picked) n.classList.add('selected');
    n.onclick = () => {
      el.dataset.part = n.dataset.id;
      renderGunsmith(el, profile, handlers);
    };
  });

  const item = items.find((i) => i.id === picked);
  if (item && actions) {
    const have = owns(profile, item.id);
    if (!have) {
      const b = document.createElement('button');
      b.textContent = `BUY ${fmtMoney(item.cost)}`;
      b.disabled = profile.cash < item.cost;
      b.onclick = () => {
        if (buyPart(profile, item.id, item.cost)) renderGunsmith(el, profile, handlers);
      };
      actions.appendChild(b);
    } else {
      const b = document.createElement('button');
      b.textContent = 'EQUIP';
      b.disabled = isEquipped(profile, selected, item.id) || (selected !== 'receiver' && !slotUnlockedFor(recId, selected));
      b.onclick = () => {
        if (equipPart(profile, selected, item.id)) renderGunsmith(el, profile, handlers);
      };
      actions.appendChild(b);
    }
  }

  el.querySelector('[data-act="hub"]').onclick = () => handlers.hub();
}

function catalog(slot, recId) {
  if (slot === 'receiver') return Object.values(RECEIVERS);
  if (!slotUnlockedFor(recId, slot)) return [];
  return partsForSlot(slot);
}

function isEquipped(profile, slot, id) {
  return profile.loadout[slot] === id;
}
