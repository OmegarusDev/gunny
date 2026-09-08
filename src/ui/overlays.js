const PANEL_KEYS = ['hub', 'gunsmith', 'training', 'end'];

export function mountOverlays(root) {
  root.innerHTML = `
    <div id="panel-hub" class="panel hidden"></div>
    <div id="panel-gunsmith" class="panel hidden"></div>
    <div id="panel-training" class="panel hidden"></div>
    <div id="panel-end" class="panel hidden"></div>
  `;
  return {
    hub: root.querySelector('#panel-hub'),
    gunsmith: root.querySelector('#panel-gunsmith'),
    training: root.querySelector('#panel-training'),
    end: root.querySelector('#panel-end'),
    show(name) {
      for (const key of PANEL_KEYS) {
        this[key].classList.toggle('hidden', key !== name);
      }
    },
    hideAll() {
      for (const key of PANEL_KEYS) this[key].classList.add('hidden');
    },
  };
}

export function fmtMoney(n) {
  return `$${Math.floor(n)}`;
}
