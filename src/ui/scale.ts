/** CSS zoom scales rendering; pointer events and client rectangles remain in screen pixels. */
export function uiScale(): number {
  const zoom = Number.parseFloat(getComputedStyle(document.documentElement).zoom);
  return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
}

export function uiPixels(screenPixels: number): number {
  return screenPixels / uiScale();
}

export function uiRect(element: Element): DOMRect {
  const rect = element.getBoundingClientRect();
  const scale = uiScale();
  return new DOMRect(rect.x / scale, rect.y / scale, rect.width / scale, rect.height / scale);
}

export function uiViewport() {
  const scale = uiScale();
  return { width: window.innerWidth / scale, height: window.innerHeight / scale };
}
