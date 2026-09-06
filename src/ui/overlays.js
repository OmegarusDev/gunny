export function mountOverlays(root, handlers) {
  root.innerHTML = `
    <div id="panel-hub" class="panel hidden"></div>
    <div id="panel-gunsmith" class="panel hidden"></div>
    <div id="panel-skills" class="panel hidden"></div>
    <div id="panel-end" class="panel hidden"></div>
  `;
  return {
    hub: root.querySelector('#panel-hub'),
    gunsmith: root.querySelector('#panel-gunsmith'),
    skills: root.querySelector('#panel-skills'),
    end: root.querySelector('#panel-end'),
    handlers,
    show(name) {
      for (const key of ['hub', 'gunsmith', 'skills', 'end']) {
        this[key].classList.toggle('hidden', key !== name);
      }
    },
    hideAll() {
      for (const key of ['hub', 'gunsmith', 'skills', 'end']) this[key].classList.add('hidden');
    },
  };
}

export function fmtMoney(n) {
  return `$${Math.floor(n)}`;
}
