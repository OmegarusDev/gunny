const svg = (body) =>
  `<svg class="facility-svg" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  gunsmith: svg(
    '<path fill="currentColor" d="M7.5 3.2 9 4.7 5.8 8 4.3 6.5 3 7.8l1.6 1.6L3 11l1.4 1.4 5.2-5.2L14 11.6V13h1.4l5.3-5.3-1.4-1.4-4.6 4.6-.8-.8 4.2-4.2-1.4-1.4-4.2 4.2-.9-.9 3.3-3.3L13.5 3 11 5.5 9.4 3.9 7.5 3.2zm1.7 8.3L3.8 16.9 7 20.1l5.4-5.4-2-2.1zM16.2 14l-2.1 2.1 5 5 2.1-2.1-5-5z"/>',
  ),
  training: svg(
    '<path fill="currentColor" d="M12 3.5A8.5 8.5 0 1 0 20.5 12 8.5 8.5 0 0 0 12 3.5zm0 2A6.5 6.5 0 1 1 5.5 12 6.5 6.5 0 0 1 12 5.5zm0 2.2A4.3 4.3 0 1 0 16.3 12 4.3 4.3 0 0 0 12 7.7zm0 2.3A2 2 0 1 1 10 12a2 2 0 0 1 2-2z"/>',
  ),
  deploy: svg(
    '<path fill="currentColor" d="M8 4.8v14.4l12-7.2z"/>',
  ),
  endless: svg(
    '<path fill="currentColor" d="M8.2 8.2a4.3 4.3 0 0 0 0 7.6l.9-.9a3.1 3.1 0 1 1 0-5.8l2.4 2.4H8.8v1.2h5.2L17.2 9l-1-.9-1.8 1.8A4.3 4.3 0 0 0 8.2 8.2zm7.6 0 .9.9a3.1 3.1 0 1 1 0 5.8l-2.4-2.4h2.7V11h-5.2L6.8 15l1 .9 1.8-1.8a4.3 4.3 0 0 0 6.2-5.9z"/>',
  ),
  retry: svg(
    '<path fill="currentColor" d="M12 5a7 7 0 1 0 6.7 9h-1.8a5.2 5.2 0 1 1-1.4-5.6L13 11h6V5l-2.2 2.2A7 7 0 0 0 12 5z"/>',
  ),
  camp: svg(
    '<path fill="currentColor" d="M12 3.2 3 20h18L12 3.2zm0 4.4L17.4 18h-3.1l-2.3-4.4-2.3 4.4H6.6L12 7.6z"/>',
  ),
};

export function facilityButton({ act, icon, title, sub, variant = '' }) {
  const cls = ['facility', variant].filter(Boolean).join(' ');
  return `<button class="${cls}" type="button" data-act="${act}">
    <span class="facility-icon">${ICONS[icon] || ''}</span>
    <span class="facility-copy">
      <span class="facility-title">${title}</span>
      <span class="facility-sub">${sub}</span>
    </span>
  </button>`;
}
