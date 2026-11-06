"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BandEngine, GENRES, STEPS, assignRoles, cleanRecording, demoSounds, detectPitch, makeSong, renderWav,
  type GenreId, type LearnedSound, type RoleId,
} from "./robot-band-audio";

export type { GenreId, LearnedSound, RoleId } from "./robot-band-audio";

export interface RobotBandProps {
  /** Style the band plays in at the start. */
  defaultGenre?: GenreId;
  /** Fill the five slots with built-in sounds so the band can play before anyone uses the microphone. */
  demo?: boolean;
  /** Start volume, 0 to 1. */
  defaultVolume?: number;
  /** Longest recording in seconds. */
  maxSeconds?: number;
  /** Called after each recording. slot is 0 to 4; pitch is in Hz, or null for noisy sounds. */
  onRecord?: (slot: number, seconds: number, pitch: number | null) => void;
  /** Called when the tune is generated, with the clip number (1 to 5) each robot plays. */
  onGenerate?: (roles: Record<RoleId, number>) => void;
  /** Called when the band starts or stops. */
  onPlayChange?: (playing: boolean) => void;
  className?: string;
}

const SLOTS = 5;
const COLORS = ["#ffb86b", "#ff6b8a", "#ffe08a", "#7fd6c2", "#b79bff"];
const ROBOTS: { id: RoleId; name: string; job: string; color: string }[] = [
  { id: "boom", name: "Boom", job: "kick", color: "#ffb86b" },
  { id: "snap", name: "Snap", job: "snare", color: "#ff6b8a" },
  { id: "tick", name: "Tick", job: "hi-hat", color: "#ffe08a" },
  { id: "bass", name: "Bassy", job: "bass", color: "#7fd6c2" },
  { id: "melo", name: "Melo", job: "melody", color: "#b79bff" },
];
const DEMO_ORDER: RoleId[] = ["boom", "snap", "tick", "bass", "melo"];

/** Waveform outline for a clip, drawn into a 100 x 24 box. */
function wavePath(d: Float32Array) {
  const n = 50;
  const step = Math.max(1, Math.floor(d.length / n));
  let top = "M0 12";
  let bot = "";
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (let j = i * step; j < (i + 1) * step && j < d.length; j += 8) m = Math.max(m, Math.abs(d[j]));
    const h = Math.max(0.5, m * 11);
    top += ` L${i * 2 + 1} ${12 - h}`;
    bot = ` L${i * 2 + 1} ${12 + h}` + bot;
  }
  return `${top} L100 12${bot} Z`;
}

type Phase = "record" | "ready" | "play";

export default function RobotBand({
  defaultGenre = "lofi",
  demo = false,
  defaultVolume = 0.7,
  maxSeconds = 3,
  onRecord,
  onGenerate,
  onPlayChange,
  className = "",
}: RobotBandProps) {
  const [clips, setClips] = useState<(LearnedSound | null)[]>(() => {
    if (!demo) return Array(SLOTS).fill(null);
    const d = demoSounds();
    return DEMO_ORDER.map((r) => d[r]);
  });
  const [roles, setRoles] = useState<Record<RoleId, number> | null>(null);
  const [genre, setGenre] = useState<GenreId>(defaultGenre);
  const [seed, setSeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const [volume, setVolume] = useState(defaultVolume);
  const [recSlot, setRecSlot] = useState<number | null>(null);
  const [level, setLevel] = useState(0);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const filled = clips.filter(Boolean).length;
  const nextSlot = clips.findIndex((c) => !c);
  const phase: Phase = roles ? "play" : filled === SLOTS ? "ready" : "record";

  const sounds = useMemo(() => {
    const out: Partial<Record<RoleId, LearnedSound>> = {};
    if (roles) for (const r of ROBOTS) { const c = clips[roles[r.id]]; if (c) out[r.id] = c; }
    return out;
  }, [roles, clips]);

  const song = useMemo(() => makeSong(genre, seed), [genre, seed]);
  const ctxRef = useRef<AudioContext | null>(null);
  const engRef = useRef<BandEngine | null>(null);
  const live = useRef({ song, sounds });
  live.current = { song, sounds };
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const uiTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const robotEls = useRef<Partial<Record<RoleId, HTMLDivElement | null>>>({});
  const stopRec = useRef<(() => void) | null>(null);

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
    const { ctx, eng } = audio();
    stop();
    let s = 0;
    let grid = ctx.currentTime + 0.08;
    const tick = () => {
      while (grid < ctx.currentTime + 0.12) {
        const { song: sg, sounds: sd } = live.current;
        const d = 60 / sg.genre.bpm / 4;
        const t = grid + (s % 2 ? sg.genre.swing * d : 0);
        const hits = eng.playStep(sg, s, t, sd, {});
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
  };

  useEffect(() => { onPlayChange?.(playing); }, [playing, onPlayChange]);
  useEffect(() => () => {
    stop();
    stopRec.current?.();
    void ctxRef.current?.close();
  }, [stop]);

  /** Records one clip into a slot. Stops by itself when you go quiet. */
  const record = async (slot: number) => {
    if (recSlot !== null) { stopRec.current?.(); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("This browser can't record here. Try Use demo sounds.");
      return;
    }
    const { ctx } = audio();
    if (playing) stop();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } });
    } catch {
      setStatus("Microphone blocked. Allow it in the address bar, or press Use demo sounds.");
      return;
    }
    setRecSlot(slot);
    setStatus(`Recording sound ${slot + 1}… make any sound, then go quiet (or press Stop).`);

    const rec = new MediaRecorder(stream);
    const parts: Blob[] = [];
    rec.ondataavailable = (e) => { if (e.data.size) parts.push(e.data); };

    // The analyser only drives the level ring and the auto-stop. If it fails, recording still works.
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
    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(meter);
      stopRec.current = null;
      if (rec.state !== "inactive") rec.stop();
      else void process();
    };
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

    const process = async () => {
      src?.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      setRecSlot(null);
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
        if (!clean) { setStatus(`Didn't hear anything for sound ${slot + 1}. Get closer to the mic and try again.`); return; }
        const pitch = detectPitch(clean, decoded.sampleRate);
        const clip: LearnedSound = { data: clean, rate: decoded.sampleRate, pitch, label: `sound ${slot + 1}` };
        setClips((cs) => cs.map((c, i) => (i === slot ? clip : c)));
        setRoles(null); // a new sound means a new tune
        onRecord?.(slot, clean.length / decoded.sampleRate, pitch);
        setStatus(`Got sound ${slot + 1}!`);
      } catch {
        setStatus("Couldn't read that recording. Try again, or try another browser.");
      }
    };
    rec.onstop = () => { void process(); };
    stopRec.current = finish;
    rec.start(100);
  };

  const hear = (slot: number) => {
    const c = clips[slot];
    if (!c) return;
    const { ctx } = audio();
    const s = ctx.createBufferSource();
    const b = ctx.createBuffer(1, c.data.length, c.rate);
    b.copyToChannel(c.data, 0);
    s.buffer = b;
    s.connect(ctx.destination);
    s.start();
  };

  const generate = () => {
    const all = clips.filter((c): c is LearnedSound => !!c);
    if (all.length < SLOTS) return;
    const r = assignRoles(all);
    const nextSeed = seed + 1;
    setRoles(r);
    setSeed(nextSeed);
    const sd: Partial<Record<RoleId, LearnedSound>> = {};
    for (const robot of ROBOTS) sd[robot.id] = all[r[robot.id]];
    live.current = { song: makeSong(genre, nextSeed), sounds: sd };
    onGenerate?.(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v + 1])) as Record<RoleId, number>);
    setStatus("Your tune is playing! Try another style or 🎲 New tune.");
    start();
  };

  const recordAgain = () => {
    stop();
    setRoles(null);
    setClips(Array(SLOTS).fill(null));
    setStatus("");
  };

  const loadDemo = () => {
    stop();
    const d = demoSounds();
    setClips(DEMO_ORDER.map((r) => d[r]));
    setRoles(null);
    setStatus("Loaded 5 demo sounds: table tap, clap, pen click, hum and glass ting. Press ✨ Generate tune.");
  };

  const download = async () => {
    if (!roles) return;
    setSaving(true);
    try {
      const blob = await renderWav(song, sounds, {});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `robot-band-${genre}.wav`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      setStatus("Saved your tune as a WAV file.");
    } catch {
      setStatus("Couldn't make the WAV in this browser.");
    }
    setSaving(false);
  };

  const bar = step < 0 ? -1 : Math.floor(step / 16);
  const bigSlot = recSlot ?? (nextSlot >= 0 ? nextSlot : null);
  const recording = recSlot !== null;

  const genres = (
    <div className="rbb-genres" role="radiogroup" aria-label="Style">
      {(Object.keys(GENRES) as GenreId[]).map((g) => (
        <button key={g} type="button" role="radio" aria-checked={genre === g} className={genre === g ? "on" : ""} onClick={() => setGenre(g)}>
          {GENRES[g].name}
        </button>
      ))}
    </div>
  );

  return (
    <div className={`rbb ${className}`}>
      <style>{CSS}</style>
      <div className="rbb-top">
        <div>
          <div className="rbb-title">Copycat Robot Band</div>
          <div className="rbb-sub">
            {phase === "play" ? `${playing ? "Playing" : "Stopped"} · ${GENRES[genre].name}${bar >= 0 ? ` · bar ${bar + 1}/4` : ""}` : "Record 5 sounds, then generate a tune"}
          </div>
        </div>
        <div className="rbb-count">{filled}/5 recorded</div>
      </div>

      {/* Robots: asleep until their sound exists, they bop while the tune plays */}
      <div className="rbb-stage">
        {ROBOTS.map((r, i) => {
          const slot = roles ? roles[r.id] : i;
          const awake = roles ? true : !!clips[i];
          return (
            <div key={r.id} className="rbb-slot">
              <div
                ref={(el) => { robotEls.current[r.id] = el; }}
                className={`rbb-bot ${awake ? "awake" : "asleep"} ${recSlot === i && !roles ? "rec" : ""}`}
                style={{ ["--c" as string]: r.color, ["--lv" as string]: String(recSlot === i ? level : 0) }}
              >
                <div className="ant"><b /></div>
                <div className="head"><i className="ear l" /><i className="ear r" /><span className="eye" /><span className="eye" /><span className="mouth" />{!awake && <span className="zz">z z</span>}</div>
                <div className="body">{roles ? slot + 1 : ""}</div>
              </div>
              <div className="rbb-job">{roles ? `${r.job} · sound ${slot + 1}` : " "}</div>
            </div>
          );
        })}
      </div>

      {phase !== "play" && (
        <>
          {phase === "record" && bigSlot !== null && (
            <div className="rbb-big">
              <button
                type="button"
                className={`rbb-rec ${recording ? "on" : ""}`}
                style={{ ["--lv" as string]: String(level) }}
                onClick={() => record(bigSlot)}
                aria-label={recording ? "Stop recording" : `Record sound ${bigSlot + 1} of 5`}
              >
                {recording ? "■ STOP" : "● REC"}
              </button>
              <div className="rbb-q">Sound {bigSlot + 1} of 5</div>
              <div className="rbb-hint">{recording ? "listening… go quiet to finish" : "Make any sound: clap, voice, table tap, a cup…"}</div>
              <div className="rbb-dots" aria-hidden>
                {clips.map((c, i) => <i key={i} className={c ? "f" : i === bigSlot ? "n" : ""} style={c ? { background: COLORS[i] } : undefined} />)}
              </div>
            </div>
          )}

          <div className="rbb-clips">
            {clips.map((c, i) => (
              <div key={i} className={`rbb-clip ${c ? "" : "empty"} ${recSlot === i ? "now" : ""}`} style={{ ["--c" as string]: COLORS[i] }}>
                <span className="n">{i + 1}</span>
                {c ? (
                  <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="w" aria-hidden><path d={wavePath(c.data)} /></svg>
                ) : (
                  <span className="w empty-w">{recSlot === i ? "listening…" : "empty"}</span>
                )}
                <button type="button" disabled={!c} onClick={() => hear(i)} aria-label={`Play sound ${i + 1}`}>▶</button>
                <button type="button" disabled={!c || (recording && recSlot !== i)} onClick={() => record(i)} aria-label={`Record sound ${i + 1} again`}>↺</button>
              </div>
            ))}
          </div>

          {phase === "ready" && (
            <div className="rbb-gen-wrap">
              {genres}
              <button type="button" className="rbb-gen" onClick={generate}>✨ Generate tune</button>
              <div className="rbb-hint">Sounds with a voice or a note become the bass and melody; the rest become drums.</div>
            </div>
          )}
        </>
      )}

      {phase === "play" && (
        <div className="rbb-play-wrap">
          <div className="rbb-steps" aria-hidden>
            {Array.from({ length: 16 }, (_, i) => <i key={i} className={step % 16 === i ? "on" : i % 4 === 0 ? "beat" : ""} />)}
          </div>
          <div className="rbb-ctrl">
            <button type="button" className={`rbb-play ${playing ? "on" : ""}`} onClick={() => (playing ? stop() : start())}>
              {playing ? "■ Stop" : "▶ Play"}
            </button>
            <button type="button" onClick={() => setSeed((s) => s + 1)}>🎲 New tune</button>
            <button type="button" onClick={download} disabled={saving}>{saving ? "Saving…" : "⬇ Save WAV"}</button>
          </div>
          <div className="rbb-ctrl">
            {genres}
            <label className="rbb-vol">
              <span aria-hidden>🔈</span>
              <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label="Volume" />
            </label>
          </div>
          <div className="rbb-ctrl">
            <button type="button" onClick={recordAgain}>● Record again</button>
          </div>
        </div>
      )}

      <div className="rbb-foot">
        {phase !== "play" && <button type="button" className="link" onClick={loadDemo} disabled={recording}>Use demo sounds</button>}
        <span>🔒 Sounds stay in your browser. Nothing is uploaded.</span>
      </div>
      <p className="rbb-status" role="status" aria-live="polite">{status}</p>
    </div>
  );
}

const CSS = `
.rbb{--ink:#f3ecff;--mute:#a99cc4;width:min(100%,560px);color:var(--ink);font-family:inherit;background:linear-gradient(#21172f,#160f20);border:1px solid #3a2c52;border-radius:24px;padding:18px;box-shadow:0 20px 50px #0007}
.rbb *{box-sizing:border-box}
.rbb button{font:inherit;color:inherit;cursor:pointer;border:1px solid #4a3a66;background:#2d2242;border-radius:10px;padding:7px 12px;font-size:13px;transition:transform .1s,background .15s}
.rbb button:hover:not(:disabled){background:#3a2c55}
.rbb button:active:not(:disabled){transform:scale(.96)}
.rbb button:disabled{opacity:.35;cursor:not-allowed}
.rbb button:focus-visible,.rbb input:focus-visible{outline:2px solid #ffb86b;outline-offset:2px}
.rbb-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.rbb-title{font-weight:700;font-size:18px}
.rbb-sub{font-size:13px;color:var(--mute);margin-top:2px}
.rbb-count{font-size:12px;background:#ffb86b22;color:#ffb86b;border:1px solid #ffb86b55;padding:4px 10px;border-radius:999px;white-space:nowrap}
.rbb-stage{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin:12px 0;border-radius:16px;background:radial-gradient(ellipse at 50% -10%,#6a4a8f 0%,#2a1c3d 60%,#1b1328 100%);padding:26px 6px 10px}
.rbb-slot{display:flex;flex-direction:column;align-items:center;min-width:0}
.rbb-bot{display:flex;flex-direction:column;align-items:center;transform-origin:50% 100%}
.rbb-bot .ant{height:12px;width:3px;background:#cfc6dd;position:relative}
.rbb-bot .ant b{position:absolute;top:-6px;left:50%;width:9px;height:9px;margin-left:-4.5px;border-radius:50%;background:#6b5d80;transition:background .2s,box-shadow .2s}
.rbb-bot .head{position:relative;width:48px;height:36px;border-radius:10px;background:var(--c);display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:inset 0 -4px 0 #0002}
.rbb-bot .ear{position:absolute;top:11px;width:5px;height:13px;border-radius:3px;background:#cfc6dd}
.rbb-bot .ear.l{left:-5px}.rbb-bot .ear.r{right:-5px}
.rbb-bot .eye{width:8px;height:8px;border-radius:50%;background:#1b1328;margin-top:-5px}
.rbb-bot .mouth{position:absolute;bottom:6px;left:50%;width:12px;height:3px;margin-left:-6px;border-radius:0 0 5px 5px;background:#1b132899}
.rbb-bot .zz{position:absolute;top:-14px;right:-12px;font-size:10px;color:var(--mute);font-style:italic;animation:rbb-zz 2s ease-in-out infinite}
.rbb-bot .body{margin-top:3px;width:40px;height:32px;border-radius:8px;background:#e8e2f0;color:#2a1c3d;font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center}
.rbb-bot.asleep .head{filter:saturate(.25) brightness(.65)}
.rbb-bot.asleep .body{filter:brightness(.65)}
.rbb-bot.asleep .eye{height:2px;margin-top:-3px}
.rbb-bot.rec .ear,.rbb-bot.rec .ant b{background:#ff4d5e;box-shadow:0 0 calc(4px + var(--lv) * 18px) #ff4d5e}
.rbb-bot.rec .head{filter:none}
.rbb-bot.hit{animation:rbb-bop .22s ease-out}
.rbb-bot.hit .ant b{background:var(--c);box-shadow:0 0 12px var(--c)}
.rbb-bot.hit .mouth{height:7px}
.rbb-job{font-size:10px;color:var(--mute);margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.rbb-big{display:flex;flex-direction:column;align-items:center;margin:8px 0 14px}
.rbb .rbb-rec{width:116px;height:116px;border-radius:50%;background:#ff4d5e;border:0;font-weight:800;font-size:18px;color:#fff;box-shadow:0 0 0 10px #ff4d5e33,0 0 34px #ff4d5e99}
.rbb .rbb-rec:hover:not(:disabled){background:#ff6370}
.rbb .rbb-rec.on{background:#c9303f;box-shadow:0 0 0 calc(8px + var(--lv) * 22px) #ff4d5e44,0 0 40px #ff4d5e}
.rbb-q{font-size:20px;font-weight:800;margin-top:16px}
.rbb-hint{font-size:12px;color:var(--mute);margin-top:4px;text-align:center}
.rbb-dots{display:flex;gap:8px;margin-top:10px}
.rbb-dots i{width:13px;height:13px;border-radius:50%;background:#3a2c52}
.rbb-dots i.n{background:transparent;box-shadow:inset 0 0 0 2px #ff4d5e}
.rbb-clips{display:flex;flex-direction:column;gap:6px}
.rbb-clip{display:flex;align-items:center;gap:8px;background:#2d2242;border:1px solid #4a3a66;border-radius:12px;padding:6px 8px}
.rbb-clip.empty{opacity:.5;border-style:dashed}
.rbb-clip.now{opacity:1;border-color:#ff4d5e}
.rbb-clip .n{width:18px;text-align:center;font-weight:700;color:var(--c)}
.rbb-clip .w{flex:1;height:24px;min-width:0}
.rbb-clip svg.w path{fill:var(--c);opacity:.9}
.rbb-clip .empty-w{display:flex;align-items:center;font-size:12px;color:var(--mute)}
.rbb .rbb-clip button{width:30px;height:30px;padding:0;font-size:12px;border-radius:8px}
.rbb-gen-wrap,.rbb-play-wrap{display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:14px}
.rbb .rbb-gen{width:100%;border:0;background:linear-gradient(90deg,#ffb86b,#ff6b8a);color:#2a1c3d;font-weight:800;font-size:19px;padding:15px;border-radius:16px;box-shadow:0 0 28px #ff6b8a55}
.rbb .rbb-gen:hover:not(:disabled){background:linear-gradient(90deg,#ffc584,#ff8199)}
.rbb-genres{display:flex;background:#2d2242;border:1px solid #4a3a66;border-radius:10px;padding:2px}
.rbb .rbb-genres button{border:0;background:transparent;padding:5px 11px;border-radius:8px}
.rbb .rbb-genres button.on{background:#b79bff;color:#1b1328;font-weight:700}
.rbb-steps{display:flex;gap:4px}
.rbb-steps i{width:12px;height:12px;border-radius:3px;background:#3a2c52}
.rbb-steps i.beat{background:#55437a}
.rbb-steps i.on{background:#ffb86b;box-shadow:0 0 8px #ffb86b}
.rbb-ctrl{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:center}
.rbb .rbb-play{background:#ffb86b;color:#2a1c3d;border-color:#ffb86b;font-weight:800;padding:8px 18px}
.rbb .rbb-play:hover:not(:disabled){background:#ffc985}
.rbb .rbb-play.on,.rbb .rbb-play.on:hover:not(:disabled){background:#2d2242;color:#ffb86b}
.rbb-vol{display:flex;align-items:center;gap:4px;font-size:13px}
.rbb-vol input{width:80px;accent-color:#ffb86b}
.rbb-foot{display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;margin-top:14px;font-size:11px;color:var(--mute)}
.rbb .rbb-foot .link{background:none;border:0;padding:0;color:#ffb86b;text-decoration:underline;font-size:12px}
.rbb .rbb-foot .link:hover:not(:disabled){background:none}
.rbb-status{margin:8px 2px 0;font-size:12px;color:var(--mute);min-height:16px;text-align:center}
@keyframes rbb-bop{0%{transform:translateY(0)}40%{transform:translateY(-7px) scale(1.04,.96)}100%{transform:translateY(0)}}
@keyframes rbb-zz{0%,100%{opacity:.3;transform:translateY(0)}50%{opacity:1;transform:translateY(-4px)}}
@media (max-width:480px){.rbb{padding:14px;border-radius:18px}.rbb-bot .head{width:42px}.rbb-bot .body{width:36px}}
@media (prefers-reduced-motion:reduce){.rbb-bot.hit,.rbb-bot .zz{animation:none}}
`;
