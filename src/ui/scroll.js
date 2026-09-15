/** Game-native vertical scrollbar for a scrollport. Native bar stays hidden. */
export function bindGameScroll(viewport, track, { persist } = {}) {
  const thumb = track.querySelector('.scroll-thumb');
  if (!viewport || !track || !thumb) return () => {};

  const wrap = track.parentElement;
  let dragging = false;
  let grab = 0;

  function metrics() {
    const view = viewport.clientHeight;
    const full = viewport.scrollHeight;
    const overflow = full > view + 1;
    const maxScroll = Math.max(1, full - view);
    const thumbH = overflow ? Math.max(28, (view / full) * view) : view;
    const maxTop = Math.max(0, view - thumbH);
    const top = (viewport.scrollTop / maxScroll) * maxTop;
    return { view, full, overflow, maxScroll, thumbH, maxTop, top };
  }

  function sync() {
    const m = metrics();
    wrap?.classList.toggle('is-idle', !m.overflow);
    track.setAttribute('aria-hidden', m.overflow ? 'false' : 'true');
    thumb.style.height = `${m.thumbH}px`;
    thumb.style.transform = `translateY(${m.top}px)`;
    if (persist) persist.gsScroll = String(viewport.scrollTop);
  }

  function scrollFromY(clientY) {
    const m = metrics();
    if (!m.overflow) return;
    const rect = track.getBoundingClientRect();
    const y = clientY - rect.top - grab;
    const t = m.maxTop > 0 ? Math.max(0, Math.min(1, y / m.maxTop)) : 0;
    viewport.scrollTop = t * m.maxScroll;
  }

  const onScroll = () => sync();
  viewport.addEventListener('scroll', onScroll, { passive: true });

  track.addEventListener('pointerdown', (e) => {
    if (e.button != null && e.button !== 0) return;
    const m = metrics();
    if (!m.overflow) return;
    e.preventDefault();
    const rect = thumb.getBoundingClientRect();
    const onThumb = e.clientY >= rect.top && e.clientY <= rect.bottom;
    grab = onThumb ? e.clientY - rect.top : m.thumbH * 0.5;
    dragging = true;
    track.classList.add('is-drag');
    track.setPointerCapture(e.pointerId);
    scrollFromY(e.clientY);
  });
  track.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    scrollFromY(e.clientY);
  });
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('is-drag');
    if (track.hasPointerCapture?.(e.pointerId)) track.releasePointerCapture(e.pointerId);
  };
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);

  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(sync) : null;
  ro?.observe(viewport);
  ro?.observe(track);

  sync();
  return () => {
    viewport.removeEventListener('scroll', onScroll);
    ro?.disconnect();
  };
}
