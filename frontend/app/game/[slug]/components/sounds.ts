import { loadSettings } from "./MusicControl";

/** Each effect picks one of its variants at random, so repeated moves don't sound mechanical. */
const SOUND_FILES = {
  takeCard: ["/sounds/take-card-1.mp3", "/sounds/take-card-2.mp3", "/sounds/take-card-3.mp3"],
  placeCard: ["/sounds/place-card.mp3"],
  litterbox: ["/sounds/litterbox.mp3"],
  meow: ["/sounds/meow-1.mp3", "/sounds/meow-2.mp3"],
  squeak: ["/sounds/squeak.mp3"],
  ball: ["/sounds/ball.mp3"],
  thud: ["/sounds/thud.mp3"],
};

export type SoundName = keyof typeof SOUND_FILES;

/** Plays a sound effect at the volume and mute setting chosen in the table's sound control. */
export function playSound(name: SoundName) {
  const { volume, isMuted } = loadSettings();
  if (isMuted || volume === 0) {
    return;
  }
  const variants = SOUND_FILES[name];
  const audio = new Audio(variants[Math.floor(Math.random() * variants.length)]);
  audio.volume = volume;
  audio.play().catch((err: unknown) => {
    // Browsers refuse to play before the page's first click or key press; nothing is lost by skipping it.
    if (!(err instanceof DOMException && err.name === "NotAllowedError")) {
      console.error(`Could not play the ${name} sound`, err);
    }
  });
}
