import type { MascotEyes, MascotMouth, MascotOverlay, MascotTray } from '../../assets/generated/mascot';

/** Where the eyes point. Every direction has its own pair of eyes in the sheet. */
export type Gaze =
  | 'center'
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'up-left'
  | 'up-right'
  | 'down-left'
  | 'down-right';

/** The feeling behind what the mascot is saying. */
export type Mood = 'happy' | 'joy' | 'ouch' | 'annoyed' | 'surprised';

export interface Point {
  x: number;
  y: number;
}

/** Sine of 22.5 degrees: splits the plane in eight equal sectors. */
const AXIS_THRESHOLD = 0.3827;

/**
 * Direction from the eyes towards a point, snapped to the eight directions the
 * sprite can draw. Inside `restRadius` the pointer is on the face itself and
 * the mascot looks straight ahead.
 */
export function gazeToward(eyes: Point, target: Point, restRadius: number): Gaze {
  const dx = target.x - eyes.x;
  const dy = target.y - eyes.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= restRadius) return 'center';
  const horizontal = Math.abs(dx) / distance > AXIS_THRESHOLD ? (dx < 0 ? 'left' : 'right') : null;
  const vertical = Math.abs(dy) / distance > AXIS_THRESHOLD ? (dy < 0 ? 'up' : 'down') : null;
  if (vertical && horizontal) return `${vertical}-${horizontal}`;
  return vertical ?? horizontal ?? 'center';
}

export interface FaceInput {
  asleep: boolean;
  /** Alternates while asleep; stays false when motion is reduced. */
  snoreBeat: boolean;
  blinking: boolean;
  gaze: Gaze;
  /** Mood of the bubble on screen, or null when the mascot is quiet. */
  mood: Mood | null;
  /** Characters typed so far while the bubble is still writing, else null. */
  typed: number | null;
}

export interface Face {
  eyes: MascotEyes;
  mouth: MascotMouth;
  overlay: MascotOverlay | null;
}

const MOOD_EYES: Partial<Record<Mood, MascotEyes>> = {
  joy: 'joy',
  ouch: 'wince',
  annoyed: 'angry',
  surprised: 'surprised',
};

const MOOD_MOUTH: Record<Mood, MascotMouth> = {
  happy: 'smile',
  joy: 'laugh',
  ouch: 'wobble',
  annoyed: 'grit',
  surprised: 'round',
};

/** The mouth changes shape every this many typed characters. */
const CHARACTERS_PER_MOUTH_SHAPE = 2;
const SPEECH_MOUTHS: readonly MascotMouth[] = ['open', 'ajar', 'open', 'neutral'];

/**
 * Which sprites make up the face. Sleep wins over everything; a mood sets the
 * eyes and the resting mouth; while the bubble is still writing the mouth
 * moves with the text; otherwise the eyes follow the pointer and blink.
 */
export function resolveFace({ asleep, snoreBeat, blinking, gaze, mood, typed }: FaceInput): Face {
  if (asleep) {
    return snoreBeat
      ? { eyes: 'closed', mouth: 'neutral', overlay: 'sleep2' }
      : { eyes: 'closed', mouth: 'round', overlay: 'sleep1' };
  }
  const eyes = (mood && MOOD_EYES[mood]) ?? (blinking ? 'closed' : gaze);
  const mouth =
    typed !== null
      ? SPEECH_MOUTHS[Math.floor(typed / CHARACTERS_PER_MOUTH_SHAPE) % SPEECH_MOUTHS.length]
      : mood
        ? MOOD_MOUTH[mood]
        : 'smile';
  return { eyes, mouth, overlay: mood === 'annoyed' ? 'anger' : null };
}

/**
 * The same decisions for the 16 pixel head that lives in the taskbar tray,
 * which only has room for four faces and none for a gaze.
 */
export function resolveTrayFace({ asleep, blinking, mood, typed }: FaceInput): MascotTray {
  if (asleep) return 'closed';
  if (mood === 'annoyed') return 'angry';
  if (typed !== null) return Math.floor(typed / CHARACTERS_PER_MOUTH_SHAPE) % 2 === 0 ? 'talk' : 'idle';
  return blinking ? 'closed' : 'idle';
}
