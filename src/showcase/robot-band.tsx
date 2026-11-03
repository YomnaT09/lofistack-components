"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BandEngine, GENRES, STEPS, cleanRecording, demoSounds, detectPitch, makeSong, renderWav,
  type GenreId, type LearnedSound, type RoleId,
} from "./robot-band-audio";

export type { GenreId, LearnedSound, RoleId } from "./robot-band-audio";

export interface RobotBandProps {
  /** Style the band plays in at the start. */
  defaultGenre?: GenreId;
  /** Load five built-in sounds so the band can play before anyone uses the microphone. */
  demo?: boolean;
  /** Start volume, 0 to 1. */
  defaultVolume?: number;
  /** Longest recording in seconds. */
  maxSeconds?: number;
  /** Called after a robot learns a sound. pitch is in Hz, or null for noisy sounds. */
  onTeach?: (robot: RoleId, seconds: number, pitch: number | null) => void;
  /** Called when the band starts or stops. */
  onPlayChange?: (playing: boolean) => void;
  className?: string;
}

const ROBOTS: { id: RoleId; name: string; job: string; icon: string; color: string; hint: string }[] = [
  { id: "boom", name: "Boom", job: "kick drum", icon: "🥁", color: "#ffb86b", hint: "tap the table" },
  { id: "snap", name: "Snap", job: "snare", icon: "👏", color: "#ff6b8a", hint: "clap or snap" },
  { id: "tick", name: "Tick", job: "hi-hat", icon: "✨", color: "#ffe08a", hint: "click a pen" },
  { id: "bass", name: "Bassy", job: "bass", icon: "🎸", color: "#7fd6c2", hint: "hum low" },
  { id: "melo", name: "Melo", job: "melody", icon: "🎹", color: "#b79bff", hint: "sing or ting a glass" },
];

const LINES = ["Got it! That's my sound now.", "Ooh, I can play that!", "Beep boop, learned!", "Copy that. Literally.", "My new favourite noise!"];

/** Few points of the waveform for the robot's chest screen. */
function wavePath(d: Float32Array) {
  const n = 28;
  const step = Math.max(1, Math.floor(d.length / n));
  let p = "M0 10";
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (let j = i * step; j < (i + 1) * step && j < d.length; j += 8) m = Math.max(m, Math.abs(d[j]));
    const h = Math.max(0.6, m * 9);
    p += ` L${i * 2 + 1} ${10 - h} L${i * 2 + 2} ${10 + h}`;
  }
  return p + " L56 10";
}

export default function RobotBand({
  defaultGenre = "lofi",
  demo = false,
  defaultVolume = 0.7,
  maxSeconds = 3,
  onTeach,
  onPlayChange,
  className = "",
}: RobotBandProps) {
  const [sounds, setSounds] = useState<Partial<Record<RoleId, LearnedSound>>>(() => (demo ? demoSounds() : {}));
  const [muted, setMuted] = useState<Partial<Record<RoleId, boolean>>>({});
  const [genre, setGenre] = useState<GenreId>(defaultGenre);
  const [seed, setSeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const [volume, setVolume] = useState(defaultVolume);
  const [recording, setRecording] = useState<RoleId | null>(null);
  const [level, setLevel] = useState(0);
  const [bubble, setBubble] = useState<{ role: RoleId; text: string } | null>(null);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const song = useMemo(() => makeSong(genre, seed), [genre, seed]);
  const ctxRef = useRef<AudioContext | null>(null);
  const engRef = useRef<BandEngine | null>(null);
  const live = useRef({ song, sounds, muted });
  live.current = { song, sounds, muted };
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const uiTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const robotEls = useRef<Partial<Record<RoleId, HTMLDivElement | null>>>({});
  const stopRec = useRef<(() => void) | null>(null);

  const taught = ROBOTS.filter((r) => sounds[r.id]).length;

  const audio = useCallback(() => {
    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctxRef.current = new AC();
      engRef.current = new BandEngine(ctxRef.current, ctxRef.current.destination, volume);
      engRef.current.setGenre(GENRES[genre]);
    }
    void ctxRef.current.resume();
    return { ctx: ctxRef.current, eng: engRef.current! };
  }, [genre, volume]);

  useEffect(() => { engRef.current?.setGenre(GENRES[genre]); }, [genre]);
  useEffect(() => { engRef.current?.setVolume(volume); }, [volume]);

  const bump = (role: RoleId) => {
    const el = robotEls.current[role];
    if (!el) return;
    el.classList.remove("hit");
    void el.offsetWidth;
    el.classList.add("hit");
  };

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    uiTimers.current.forEach(clearTimeout);
    uiTimers.current = [];
    setPlaying(false);
    setStep(-1);
  }, []);

  const start = () => {
    if (!taught) { setStatus("Teach at least one robot a sound first, or load the demo sounds."); return; }
    const { ctx, eng } = audio();
    let s = 0;
    let grid = ctx.currentTime + 0.08;
    const tick = () => {
      while (grid < ctx.currentTime + 0.12) {
        const { song: sg, sounds: sd, muted: mt } = live.current;
        const d = 60 / sg.genre.bpm / 4;
        const t = grid + (s % 2 ? sg.genre.swing * d : 0);
        const hits = eng.playStep(sg, s, t, sd, mt);
        const at = s;
        uiTimers.current.push(setTimeout(() => {
          hits.forEach(bump);
          setStep(at);
          uiTimers.current.shift();
        }, Math.max(0, (t - ctx.currentTime) * 1000)));
        grid += d;
        s = (s + 1) % STEPS;
      }
    };
    tick();
    timer.current = setInterval(tick, 25);
    setPlaying(true);
    setStatus(`The band is playing ${GENRES[genre].name}.`);
  };

  useEffect(() => { onPlayChange?.(playing); }, [playing, onPlayChange]);
  useEffect(() => () => {
    stop();
    stopRec.current?.();
    void ctxRef.current?.close();
  }, [stop]);

  const learn = (role: RoleId, sound: LearnedSound) => {
    setSounds((s) => ({ ...s, [role]: sound }));
    setBubble({ role, text: LINES[Math.floor(Math.random() * LINES.length)] });
    onTeach?.(role, sound.data.length / sound.rate, sound.pitch);
    setTimeout(() => setBubble((b) => (b?.role === role ? null : b)), 2600);
  };

  const teach = async (role: RoleId) => {
    if (recording) { stopRec.current?.(); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setStatus("This browser can't use the microphone here. Try the demo sounds."); return; }
    const { ctx } = audio();
    if (playing) stop();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } });
    } catch {
      setStatus("Microphone blocked. Allow it in the address bar, or try the demo sounds.");
      return;
    }
    const robot = ROBOTS.find((r) => r.id === role)!;
    if (typeof MediaRecorder === "undefined") {
      stream.getTracks().forEach((t) => t.stop());
      setStatus("This browser can't record audio. Try the demo sounds.");
      return;
    }
    setRecording(role);
    setStatus(`${robot.name} is listening… make your sound (${robot.hint}), then wait or press Stop.`);

    // MediaRecorder captures the sound; it works in every modern browser and at any mic sample rate.
    const rec = new MediaRecorder(stream);
    const parts: Blob[] = [];
    rec.ondataavailable = (e) => { if (e.data.size) parts.push(e.data); };

    // A separate analyser only drives the level glow and the auto-stop. If it fails, recording still works.
    let analyser: AnalyserNode | null = null;
    let src: MediaStreamAudioSourceNode | null = null;
    try {
      src = ctx.createMediaStreamSource(stream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      src.connect(analyser);
    } catch { analyser = null; }

    const started = performance.now();
    let heard = false;
    let lastLoud = 0;
    let done = false;
    const buf = new Float32Array(2048);
    const meter = setInterval(() => {
      const elapsed = (performance.now() - started) / 1000;
      if (analyser) {
        analyser.getFloatTimeDomainData(buf);
        let rms = 0;
        for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
        rms = Math.sqrt(rms / buf.length);
        setLevel(Math.min(1, rms * 8));
        if (rms > 0.015) { heard = true; lastLoud = elapsed; }
        if (heard && elapsed > 0.5 && elapsed - lastLoud > 0.6) finish();
      }
      if (elapsed > maxSeconds) finish();
    }, 50);

    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(meter);
      stopRec.current = null;
      if (rec.state !== "inactive") rec.stop();
      else void process();
    };
    const process = async () => {
      src?.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      setRecording(null);
      setLevel(0);
      try {
        const blob = new Blob(parts, { type: rec.mimeType || parts[0]?.type });
        const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
        const raw = new Float32Array(decoded.length);
        for (let c = 0; c < decoded.numberOfChannels; c++) {
          const d = decoded.getChannelData(c);
          for (let i = 0; i < d.length; i++) raw[i] += d[i] / decoded.numberOfChannels;
        }
        const clean = cleanRecording(raw, decoded.sampleRate);
        if (!clean) { setStatus(`${robot.name} didn't hear anything. Check the mic, get closer and try again.`); return; }
        const pitch = detectPitch(clean, decoded.sampleRate);
        learn(role, { data: clean, rate: decoded.sampleRate, pitch, label: "your sound" });
        setStatus(`${robot.name} learned your sound${pitch ? ` (about ${Math.round(pitch)} Hz)` : ""}. Press ▶ to hear it.`);
      } catch {
        setStatus(`Couldn't read that recording. Try again, or try another browser.`);
      }
    };
    rec.onstop = () => { void process(); };
    stopRec.current = finish;
    rec.start(100);
  };

  const hear = (role: RoleId) => {
    const s = sounds[role];
    if (!s) return;
    const { ctx, eng } = audio();
    const { genre: g } = song;
    eng.play(role, s, ctx.currentTime + 0.02, 1, role === "bass" ? g.key + g.chords[0].root : role === "melo" ? g.key + 28 : undefined, 0.3, 2);
    bump(role);
  };

  const loadDemo = () => {
    const d = demoSounds();
    setSounds(d);
    setBubble({ role: "melo", text: "Demo sounds loaded. Press Play!" });
    setStatus("Loaded five demo sounds: table tap, clap, pen click, hum and glass ting.");
  };

  const clearAll = () => {
    stop();
    setSounds({});
    setMuted({});
    setStatus("All robots forgot their sounds and went to sleep.");
  };

  const download = async () => {
    if (!taught) return;
    setSaving(true);
    try {
      const blob = await renderWav(song, sounds, muted);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `robot-band-${genre}.wav`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      setStatus("Saved two loops of your tune as a WAV file.");
    } catch {
      setStatus("Couldn't make the WAV in this browser.");
    }
    setSaving(false);
  };

  const bar = step < 0 ? -1 : Math.floor(step / 16);

  return (
    <div className={`rbb ${className}`}>
      <style>{CSS}</style>
      <div className="rbb-top">
        <div>
          <div className="rbb-title">Copycat Robot Band</div>
          <div className="rbb-sub">Teach each robot any sound. They turn it into a tune.</div>
        </div>
        <div className="rbb-count" aria-label={`${taught} of 5 robots taught`}>{taught}/5 taught</div>
      </div>

      <div className="rbb-stage">
        <div className="rbb-lights" aria-hidden>{Array.from({ length: 9 }, (_, i) => <i key={i} style={{ left: `${6 + i * 11}%` }} />)}</div>
        <div className="rbb-robots">
          {ROBOTS.map((r) => {
            const s = sounds[r.id];
            const rec = recording === r.id;
            return (
              <div key={r.id} className="rbb-slot">
                {bubble?.role === r.id && <div className={`rbb-bubble ${r.id === "melo" ? "end" : r.id === "boom" ? "start" : ""}`}>{bubble.text}</div>}
                <div
                  ref={(el) => { robotEls.current[r.id] = el; }}
                  className={`rbb-bot ${s ? "awake" : "asleep"} ${rec ? "rec" : ""} ${muted[r.id] ? "muted" : ""}`}
                  style={{ ["--c" as string]: r.color, ["--lv" as string]: String(rec ? level : 0) }}
                >
                  <div className="ant"><b /></div>
                  <div className="head">
                    <i className="ear l" /><i className="ear r" />
                    <span className="eye" /><span className="eye" />
                    <span className="mouth" />
                    {!s && !rec && <span className="zz">z z</span>}
                  </div>
                  <div className="body">
                    {s ? (
                      <svg viewBox="0 0 56 20" className="wave" aria-hidden><path d={wavePath(s.data)} /></svg>
                    ) : (
                      <span className="ico">{r.icon}</span>
                    )}
                  </div>
                </div>
                <div className="rbb-name">{r.icon} {r.name}</div>
                <div className="rbb-job">{s ? (s.label === "your sound" ? r.job : `${r.job} · ${s.label}`) : r.hint}</div>
                <div className="rbb-btns">
                  <button
                    type="button"
                    className={`teach ${rec ? "on" : ""}`}
                    disabled={!!recording && !rec}
                    onClick={() => teach(r.id)}
                    aria-label={rec ? `Stop recording for ${r.name}` : `${s ? "Re-teach" : "Teach"} ${r.name} a sound`}
                  >
                    {rec ? "■ Stop" : s ? "↺ Redo" : "● Teach"}
                  </button>
                  <button type="button" disabled={!s} onClick={() => hear(r.id)} aria-label={`Hear ${r.name}`}>▶</button>
                  <button
                    type="button"
                    disabled={!s}
                    aria-pressed={!!muted[r.id]}
                    onClick={() => setMuted((m) => ({ ...m, [r.id]: !m[r.id] }))}
                    aria-label={`${muted[r.id] ? "Unmute" : "Mute"} ${r.name}`}
                  >
                    {muted[r.id] ? "🔇" : "🔊"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="rbb-floor">
          <div className="rbb-steps" aria-hidden>
            {Array.from({ length: 16 }, (_, i) => <i key={i} className={step % 16 === i ? "on" : i % 4 === 0 ? "beat" : ""} />)}
          </div>
          <span className="rbb-bar">{bar < 0 ? "ready" : `bar ${bar + 1}/4`}</span>
        </div>
      </div>

      <div className="rbb-ctrl">
        <button type="button" className={`rbb-play ${playing ? "on" : ""}`} onClick={() => (playing ? stop() : start())}>
          {playing ? "■ Stop" : "▶ Play band"}
        </button>
        <div className="rbb-genres" role="radiogroup" aria-label="Genre">
          {(Object.keys(GENRES) as GenreId[]).map((g) => (
            <button key={g} type="button" role="radio" aria-checked={genre === g} className={genre === g ? "on" : ""} onClick={() => setGenre(g)}>
              {GENRES[g].name}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setSeed((s) => s + 1)} title="Write a new melody">🎲 New tune</button>
        <label className="rbb-vol">
          <span aria-hidden>🔈</span>
          <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label="Volume" />
        </label>
      </div>
      <div className="rbb-ctrl small">
        <button type="button" onClick={download} disabled={!taught || saving}>{saving ? "Saving…" : "⬇ Save WAV"}</button>
        <button type="button" onClick={loadDemo}>Use demo sounds</button>
        <button type="button" onClick={clearAll} disabled={!taught}>Clear all</button>
        <span className="rbb-note">🔒 Sounds stay in your browser. Nothing is uploaded.</span>
      </div>
      <p className="rbb-status" role="status" aria-live="polite">{status || "Press ● Teach under a robot and make any sound: a tap, a clap, your voice."}</p>
    </div>
  );
}

const CSS = `
.rbb{--bg:#1a1226;--panel:#241a34;--ink:#f3ecff;--mute:#a99cc4;width:min(100%,720px);color:var(--ink);font-family:inherit;background:linear-gradient(#21172f,#160f20);border:1px solid #3a2c52;border-radius:24px;padding:16px;box-shadow:0 20px 50px #0007}
.rbb *{box-sizing:border-box}
.rbb button{font:inherit;color:inherit;cursor:pointer;border:1px solid #4a3a66;background:#2d2242;border-radius:10px;padding:6px 10px;font-size:13px;transition:transform .1s,background .15s}
.rbb button:hover:not(:disabled){background:#3a2c55}
.rbb button:active:not(:disabled){transform:scale(.96)}
.rbb button:disabled{opacity:.35;cursor:not-allowed}
.rbb button:focus-visible,.rbb input:focus-visible{outline:2px solid #ffb86b;outline-offset:2px}
.rbb-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px}
.rbb-title{font-weight:700;font-size:18px}
.rbb-sub{font-size:13px;color:var(--mute);margin-top:2px}
.rbb-count{font-size:12px;background:#ffb86b22;color:#ffb86b;border:1px solid #ffb86b55;padding:4px 10px;border-radius:999px;white-space:nowrap}
.rbb-stage{position:relative;border-radius:18px;overflow:hidden;background:radial-gradient(ellipse at 50% -10%,#6a4a8f 0%,#2a1c3d 55%,#1b1328 100%);padding:46px 8px 0}
.rbb-lights i{position:absolute;top:-30px;width:8%;height:120px;background:radial-gradient(ellipse at top,#ffe7b333,transparent 70%);transform:rotate(8deg);pointer-events:none}
.rbb-robots{position:relative;display:grid;grid-template-columns:repeat(5,1fr);gap:6px;z-index:1}
.rbb-slot{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;min-width:0}
.rbb-bubble{position:absolute;top:-40px;left:50%;transform:translateX(-50%);background:#fff;color:#2a1c3d;font-size:11px;font-weight:600;padding:5px 9px;border-radius:12px;white-space:nowrap;z-index:3;animation:rbb-pop .25s ease-out}
.rbb-bubble.end{left:auto;right:-4px;transform:none;animation-name:rbb-pop2}
.rbb-bubble.start{left:-4px;transform:none;animation-name:rbb-pop2}
.rbb-bubble.end:after{left:auto;right:30px}
.rbb-bubble.start:after{left:36px}
.rbb-bubble:after{content:"";position:absolute;bottom:-6px;left:50%;margin-left:-6px;border:6px solid transparent;border-bottom:0;border-top-color:#fff}
.rbb-bot{position:relative;width:74px;display:flex;flex-direction:column;align-items:center;transform-origin:50% 100%}
.rbb-bot .ant{height:16px;width:3px;background:#cfc6dd;position:relative}
.rbb-bot .ant b{position:absolute;top:-7px;left:50%;width:10px;height:10px;margin-left:-5px;border-radius:50%;background:#6b5d80;transition:background .2s,box-shadow .2s}
.rbb-bot .head{position:relative;width:62px;height:46px;border-radius:12px;background:var(--c);display:flex;align-items:center;justify-content:center;gap:12px;box-shadow:inset 0 -5px 0 #0002}
.rbb-bot .ear{position:absolute;top:14px;width:6px;height:16px;border-radius:3px;background:#cfc6dd}
.rbb-bot .ear.l{left:-6px}.rbb-bot .ear.r{right:-6px}
.rbb-bot .eye{width:10px;height:10px;border-radius:50%;background:#1b1328;margin-top:-6px;transition:height .15s}
.rbb-bot .mouth{position:absolute;bottom:8px;left:50%;width:16px;height:4px;margin-left:-8px;border-radius:0 0 6px 6px;background:#1b132899}
.rbb-bot .zz{position:absolute;top:-16px;right:-14px;font-size:11px;color:var(--mute);font-style:italic;animation:rbb-zz 2s ease-in-out infinite}
.rbb-bot .body{margin-top:4px;width:52px;height:44px;border-radius:10px;background:#e8e2f0;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 -5px 0 #0001}
.rbb-bot .ico{font-size:20px}
.rbb-bot .wave{width:44px;height:22px;background:#1b1328;border-radius:5px;padding:2px}
.rbb-bot .wave path{fill:none;stroke:var(--c);stroke-width:1.2}
.rbb-bot.asleep .head{filter:saturate(.25) brightness(.7)}
.rbb-bot.asleep .body{filter:brightness(.7)}
.rbb-bot.asleep .eye{height:2px;border-radius:2px;margin-top:-4px}
.rbb-bot.muted{opacity:.45}
.rbb-bot.rec .eye{width:12px;height:12px;background:#fff;box-shadow:inset 0 0 0 3px #1b1328}
.rbb-bot.rec .ear{background:#ff4d5e;box-shadow:0 0 calc(4px + var(--lv) * 18px) #ff4d5e}
.rbb-bot.rec .ant b{background:#ff4d5e;box-shadow:0 0 calc(4px + var(--lv) * 22px) #ff4d5e}
.rbb-bot.rec .head{transform:scale(calc(1 + var(--lv) * .08))}
.rbb-bot.hit{animation:rbb-bop .22s ease-out}
.rbb-bot.hit .ant b{background:var(--c);box-shadow:0 0 14px var(--c)}
.rbb-bot.hit .mouth{height:8px}
.rbb-name{margin-top:6px;font-size:13px;font-weight:700;white-space:nowrap}
.rbb-job{font-size:11px;color:var(--mute);min-height:15px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rbb-btns{display:flex;gap:3px;margin:6px 0 10px;flex-wrap:wrap;justify-content:center}
.rbb .rbb-btns button{padding:4px 6px;font-size:11px;border-radius:8px}
.rbb .rbb-btns .teach{background:#ff4d5e22;border-color:#ff4d5e77}
.rbb .rbb-btns .teach.on{background:#ff4d5e;border-color:#ff4d5e;color:#fff;animation:rbb-blink 1s infinite}
.rbb-floor{position:relative;display:flex;align-items:center;justify-content:center;gap:10px;background:#160f20cc;border-top:2px solid #3a2c52;margin:0 -8px;padding:9px 12px}
.rbb-steps{display:flex;gap:4px}
.rbb-steps i{width:10px;height:10px;border-radius:3px;background:#3a2c52;transition:background .06s}
.rbb-steps i.beat{background:#55437a}
.rbb-steps i.on{background:#ffb86b;box-shadow:0 0 8px #ffb86b}
.rbb-bar{font-size:11px;color:var(--mute);width:58px}
.rbb-ctrl{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:12px}
.rbb-ctrl.small{margin-top:8px}
.rbb-ctrl.small button{font-size:12px;padding:5px 9px}
.rbb .rbb-play{background:#ffb86b;color:#2a1c3d;border-color:#ffb86b;font-weight:700;padding:8px 16px;font-size:14px}
.rbb .rbb-play:hover:not(:disabled){background:#ffc985}
.rbb .rbb-play.on,.rbb .rbb-play.on:hover:not(:disabled){background:#2d2242;color:#ffb86b}
.rbb-genres{display:flex;background:#2d2242;border:1px solid #4a3a66;border-radius:10px;padding:2px}
.rbb .rbb-genres button{border:0;background:transparent;padding:5px 10px;border-radius:8px}
.rbb .rbb-genres button.on{background:#b79bff;color:#1b1328;font-weight:700}
.rbb-vol{display:flex;align-items:center;gap:4px;font-size:13px}
.rbb-vol input{width:80px;accent-color:#ffb86b}
.rbb-note{font-size:11px;color:var(--mute);margin-left:auto}
.rbb-status{margin:10px 2px 0;font-size:12px;color:var(--mute);min-height:16px}
@keyframes rbb-bop{0%{transform:translateY(0) scale(1,1)}40%{transform:translateY(-7px) scale(1.04,.96)}100%{transform:translateY(0) scale(1,1)}}
@keyframes rbb-pop{from{opacity:0;transform:translate(-50%,6px) scale(.8)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
@keyframes rbb-pop2{from{opacity:0;transform:translateY(6px) scale(.8)}to{opacity:1;transform:none}}
@keyframes rbb-zz{0%,100%{opacity:.3;transform:translateY(0)}50%{opacity:1;transform:translateY(-4px)}}
@keyframes rbb-blink{50%{opacity:.6}}
@media (max-width:560px){
  .rbb{padding:12px;border-radius:18px}
  .rbb-robots{grid-template-columns:repeat(3,1fr);row-gap:30px}
  .rbb-stage{padding-top:44px}
  .rbb-note{margin-left:0;width:100%}
  .rbb-genres{order:3}
  .rbb-btns{flex-wrap:nowrap}
  .rbb .rbb-btns button{padding:4px 5px;font-size:10px}
  .rbb-bubble.end{right:auto;left:-4px}
  .rbb-bubble.end:after{right:auto;left:36px}
}
@media (prefers-reduced-motion:reduce){
  .rbb-bot.hit,.rbb-bot .zz,.rbb-bubble,.rbb .rbb-btns .teach.on{animation:none}
}
`;
