import { RECEIVERS, SLOTS, SLOT_MIN_TIER } from '../data/receivers.js';
import { PARTS, partsForSlot } from '../data/attachments.js';
import { resolveStats, slotUnlockedFor } from '../entities/loadout.js';
import { buyBlockedReason, buyPart, equipPart, owns } from '../state/profile.js';
import { fmtMoney } from './overlays.js';

const SLOT_LABEL = {
  receiver: 'Receiver',
  barrel: 'Barrel',
  magazine: 'Mag',
  springs: 'Springs',
  optic: 'Optic',
  stock: 'Stock',
  muzzle: 'Muzzle',
  trigger: 'Trigger',
  gasBlock: 'Gas',
};

export function renderGunsmith(el, profile, handlers) {
  const recId = profile.loadout.receiver;
  const selected = el.dataset.slot || 'receiver';
  const stats = resolveStats(profile);
  const items = catalog(selected, recId);
  const lockedSlot = selected !== 'receiver' && !slotUnlockedFor(recId, selected);

  el.innerHTML = `
    <div class="page-head">
      <div>
        <p class="kicker">Facility</p>
        <h2>Gunsmith</h2>
      </div>
      <div class="page-meta">
        <span>${fmtMoney(profile.cash)}</span>
        <button class="ghost" data-act="hub">Camp</button>
      </div>
    </div>
    <p class="muted train-blurb">Buy the next rung only. Mag = ammo (drums/belts late). Springs = reload speed.</p>
    <div class="chips" role="tablist">
      ${SLOTS.map((slot) => {
        const locked = !slotUnlockedFor(recId, slot) && slot !== 'receiver';
        const eq =
          slot === 'receiver'
            ? RECEIVERS[profile.loadout.receiver]?.name
            : PARTS[profile.loadout[slot]]?.name;
        return `<button class="chip ${selected === slot ? 'selected' : ''} ${locked ? 'locked' : ''}" data-slot="${slot}">
          <span>${SLOT_LABEL[slot]}</span>
          <small>${locked ? 'T' + SLOT_MIN_TIER[slot] : eq ?? '—'}</small>
        </button>`;
      }).join('')}
    </div>
    <div class="sheet-body">
      ${
        lockedSlot
          ? `<p class="empty-note">Needs a T${SLOT_MIN_TIER[selected]} receiver.</p>`
          : `<div class="card-list">
              ${items
                .map((item) => {
                  const equipped = isEquipped(profile, selected, item.id);
                  const have = owns(profile, item.id);
                  const gate = buyBlockedReason(profile, item.id);
                  const gated = !have && gate && gate !== 'Owned';
                  return `<button class="card ${equipped ? 'equipped' : ''} ${have ? '' : 'unowned'} ${gated ? 'locked' : ''}" data-id="${item.id}">
                    <div class="card-top">
                      <strong>${item.name}</strong>
                      <span class="tag ${equipped ? 'hot' : have ? 'own' : gated ? '' : ''}">${
                        equipped ? 'Equipped' : have ? 'Owned' : gated ? gate : fmtMoney(item.cost)
                      }</span>
                    </div>
                    <span class="muted">${item.desc}</span>
                  </button>`;
                })
                .join('')}
            </div>`
      }
      <div class="stats">
        <div><span>DMG</span>${stats.damage.toFixed(1)}</div>
        <div><span>ROF</span>${stats.rof.toFixed(1)}</div>
        <div><span>MAG</span>${stats.magSize}</div>
        <div><span>VEL</span>${stats.bulletSpeed.toFixed(0)}</div>
        <div><span>PEN</span>${stats.pen.toFixed(2)}</div>
        <div><span>RELOAD</span>${stats.reload.toFixed(2)}s</div>
        <div><span>PERF</span>${(stats.perfectWidth * 100).toFixed(0)}%</div>
        <div><span>BLOOM</span>${stats.bloomPerShot.toFixed(2)}°</div>
      </div>
    </div>
    <div class="sheet-foot" id="gs-actions"></div>
  `;

  el.querySelector('[data-act="hub"]').onclick = () => handlers.hub();
  el.querySelectorAll('[data-slot]').forEach((n) => {
    n.onclick = () => {
      el.dataset.slot = n.dataset.slot;
      el.dataset.part = '';
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
  if (item && actions && !lockedSlot) {
    const have = owns(profile, item.id);
    const equipped = isEquipped(profile, selected, item.id);
    const gate = buyBlockedReason(profile, item.id);
    const hint = document.createElement('p');
    hint.className = 'muted foot-hint';
    hint.textContent = item.name;
    actions.appendChild(hint);
    const b = document.createElement('button');
    if (!have) {
      b.className = 'primary';
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
      b.className = 'primary';
      b.textContent = equipped ? 'Equipped' : 'Equip';
      b.disabled = equipped || (selected !== 'receiver' && !slotUnlockedFor(recId, selected));
      b.onclick = () => {
        if (equipPart(profile, selected, item.id)) renderGunsmith(el, profile, handlers);
      };
    }
    actions.appendChild(b);
  }
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
