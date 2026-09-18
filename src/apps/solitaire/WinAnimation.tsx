import { useEffect, useRef } from 'react';
import { CARD_HEIGHT, CARD_WIDTH, CardView } from '../../core/cards/CardView';
import type { Card } from '../../core/cards/deck';

/** How long the cards bounce before fading out. */
const DURATION_MS = 9_000;

/**
 * The classic victory animation: every card of the deck bounces around the
 * board until it fades. The animation writes transforms straight to the DOM
 * instead of re-rendering 52 React trees per frame.
 */
export function WinAnimation({ cards }: { cards: readonly Card[] }) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const width = layer.clientWidth;
    const height = layer.clientHeight;
    if (width <= 0 || height <= 0) return;

    const bodies = cards.map(() => ({
      x: Math.random() * Math.max(1, width - CARD_WIDTH),
      y: Math.random() * Math.max(1, height - CARD_HEIGHT),
      vx: (Math.random() < 0.5 ? -1 : 1) * (70 + Math.random() * 110),
      vy: (Math.random() < 0.5 ? -1 : 1) * (70 + Math.random() * 110),
    }));

    const maxX = Math.max(0, width - CARD_WIDTH);
    const maxY = Math.max(0, height - CARD_HEIGHT);
    let frame = 0;
    let last = performance.now();
    const started = last;

    const step = (now: number) => {
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;

      bodies.forEach((body, index) => {
        body.x += body.vx * delta;
        body.y += body.vy * delta;
        if (body.x <= 0) {
          body.x = 0;
          body.vx = Math.abs(body.vx);
        } else if (body.x >= maxX) {
          body.x = maxX;
          body.vx = -Math.abs(body.vx);
        }
        if (body.y <= 0) {
          body.y = 0;
          body.vy = Math.abs(body.vy);
        } else if (body.y >= maxY) {
          body.y = maxY;
          body.vy = -Math.abs(body.vy);
        }
        const element = cardRefs.current[index];
        if (element) element.style.transform = `translate(${body.x}px, ${body.y}px)`;
      });

      if (now - started < DURATION_MS) {
        frame = requestAnimationFrame(step);
      } else {
        layer.dataset.done = 'true';
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [cards]);

  return (
    <div className="sol-win-layer" ref={layerRef} aria-hidden="true">
      {cards.map((card, index) => (
        <div
          key={card.id}
          className="sol-win-card"
          ref={(element) => {
            cardRefs.current[index] = element;
          }}
        >
          <CardView card={{ ...card, faceUp: true }} />
        </div>
      ))}
    </div>
  );
}
