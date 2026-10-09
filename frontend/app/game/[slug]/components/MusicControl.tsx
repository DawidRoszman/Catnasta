"use client";
import { useEffect, useRef, useState } from "react";
import { Music, Volume1, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { useIsClient } from "@/app/lib/useIsClient";

const TRACK = "/music/upbeat-catyong.m4a";
const STORAGE_KEY = "catnasta:music";
const DEFAULT_SETTINGS = { volume: 0.4, isMuted: false, isMusicOff: false };

type MusicSettings = typeof DEFAULT_SETTINGS;

export function loadSettings(): MusicSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    return { ...DEFAULT_SETTINGS, ...saved };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: MusicSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage blocked (private mode); the settings just won't survive a reload.
  }
}

/**
 * Background music with a music toggle, plus a mute toggle and volume slider that
 * also govern sound effects; settings persist per browser.
 */
export default function MusicControl() {
  // Settings come from localStorage, so render only after hydration.
  return useIsClient() ? <MusicPlayer /> : null;
}

function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [settings, setSettings] = useState(loadSettings);
  const { volume, isMuted, isMusicOff } = settings;

  useEffect(() => {
    const audio = audioRef.current!;
    audio.volume = settings.volume;
    audio.muted = settings.isMuted || settings.isMusicOff;
    saveSettings(settings);
  }, [settings]);

  // Browsers block autoplay until the page gets a user gesture, so retry on the first one.
  useEffect(() => {
    const audio = audioRef.current!;
    const start = () => {
      audio.play().then(stopListening, () => {});
    };
    const stopListening = () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
    window.addEventListener("pointerdown", start);
    window.addEventListener("keydown", start);
    start();
    return () => {
      stopListening();
      audio.pause();
    };
  }, []);

  const isSilent = isMuted || volume === 0;
  const Icon = isSilent ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="group flex h-10 items-center gap-1 rounded-xl bg-surface/85 pr-2 ring-1 ring-line backdrop-blur-md">
      <audio ref={audioRef} src={TRACK} loop preload="auto" />
      <Button
        variant="ghost"
        size="icon"
        id="mute-button"
        onClick={() =>
          setSettings({ ...settings, volume: volume === 0 ? DEFAULT_SETTINGS.volume : volume, isMuted: !isSilent })
        }
        aria-label={isSilent ? "Unmute sound" : "Mute sound"}
        aria-pressed={isSilent}
      >
        <Icon className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        id="music-button"
        onClick={() => setSettings({ ...settings, isMusicOff: !isMusicOff })}
        aria-label={isMusicOff ? "Turn music on" : "Turn music off"}
        aria-pressed={isMusicOff}
      >
        <Music className={isMusicOff ? "h-5 w-5 opacity-40" : "h-5 w-5"} />
      </Button>
      <input
        type="range"
        id="volume-slider"
        min={0}
        max={1}
        step={0.05}
        value={isMuted ? 0 : volume}
        onChange={(event) => setSettings({ ...settings, volume: Number(event.target.value), isMuted: false })}
        aria-label="Sound volume"
        className="w-20 cursor-pointer accent-brass sm:w-24"
      />
    </div>
  );
}
