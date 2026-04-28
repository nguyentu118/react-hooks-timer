import { useState, useEffect, useRef, useCallback } from "react";

// ─── Audio: beep via Web Audio API ───────────────────────────────────────────
function useBeep() {
  const ctxRef = useRef(null);
  const getCtx = () => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return ctxRef.current;
  };
  const beep = useCallback((freq = 880, duration = 0.12, type = "square") => {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = type; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(); osc.stop(ctx.currentTime + duration);
    } catch (_) {}
  }, []);
  return beep;
}

// ─── TimerDisplay ─────────────────────────────────────────────────────────────
function TimerDisplay({ seconds, phase, isRunning, totalSeconds }) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const pct = totalSeconds > 0 ? ((totalSeconds - seconds) / totalSeconds) * 100 : 0;
  const isWork = phase === "WORK";

  const circumference = 2 * Math.PI * 120;
  const strokeDash = circumference - (pct / 100) * circumference;

  return (
    <div className="timer-display-wrap">
      <svg className="ring" viewBox="0 0 280 280" xmlns="http://www.w3.org/2000/svg">
        <circle cx="140" cy="140" r="120" className="ring-track" />
        <circle
          cx="140" cy="140" r="120"
          className={`ring-progress ${isWork ? "ring-work" : "ring-rest"}`}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDash}
          style={{ transition: "stroke-dashoffset 0.95s linear, stroke 0.4s ease" }}
        />
      </svg>
      <div className="timer-inner">
        <span className={`phase-label ${isWork ? "phase-work" : "phase-rest"}`}>{phase}</span>
        <span className="countdown">{mm}:{ss}</span>
        {isRunning && <span className="pulse-dot" />}
      </div>
    </div>
  );
}

// ─── Controls ─────────────────────────────────────────────────────────────────
function Controls({ isRunning, isPaused, onStart, onPause, onStop, onReset }) {
  return (
    <div className="controls">
      {!isRunning && !isPaused && (
        <button className="btn btn-start" onClick={onStart}>▶ START</button>
      )}
      {isRunning && (
        <button className="btn btn-pause" onClick={onPause}>⏸ PAUSE</button>
      )}
      {isPaused && (
        <button className="btn btn-start" onClick={onPause}>▶ RESUME</button>
      )}
      {(isRunning || isPaused) && (
        <button className="btn btn-stop" onClick={onStop}>■ STOP</button>
      )}
      <button className="btn btn-reset" onClick={onReset}>↺ RESET</button>
    </div>
  );
}

// ─── SettingsPanel ────────────────────────────────────────────────────────────
function SettingsPanel({ workSec, restSec, onWorkChange, onRestChange, disabled }) {
  return (
    <div className="settings">
      <h3 className="settings-title">// SETTINGS</h3>
      <div className="settings-row">
        <label>WORK<span className="unit">sec</span></label>
        <div className="input-wrap">
          <button onClick={() => !disabled && onWorkChange(Math.max(5, workSec - 5))}>−</button>
          <input
            type="number" min="5" max="3600" step="5"
            value={workSec} disabled={disabled}
            onChange={e => onWorkChange(Math.max(5, +e.target.value))}
          />
          <button onClick={() => !disabled && onWorkChange(Math.min(3600, workSec + 5))}>+</button>
        </div>
      </div>
      <div className="settings-row">
        <label>REST<span className="unit">sec</span></label>
        <div className="input-wrap">
          <button onClick={() => !disabled && onRestChange(Math.max(5, restSec - 5))}>−</button>
          <input
            type="number" min="5" max="3600" step="5"
            value={restSec} disabled={disabled}
            onChange={e => onRestChange(Math.max(5, +e.target.value))}
          />
          <button onClick={() => !disabled && onRestChange(Math.min(3600, restSec + 5))}>+</button>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [workSec, setWorkSec] = useState(45);
  const [restSec, setRestSec] = useState(15);
  const [phase, setPhase] = useState("WORK");
  const [timeLeft, setTimeLeft] = useState(45);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rounds, setRounds] = useState(0);

  const intervalRef = useRef(null);
  const phaseRef = useRef("WORK");
  const timeRef = useRef(45);
  const workRef = useRef(workSec);
  const restRef = useRef(restSec);
  const beep = useBeep();

  workRef.current = workSec;
  restRef.current = restSec;

  const tick = useCallback(() => {
    timeRef.current -= 1;
    if (timeRef.current < 0) {
      // Switch phase
      if (phaseRef.current === "WORK") {
        phaseRef.current = "REST";
        timeRef.current = restRef.current - 1;
        beep(440, 0.15, "sine");
        setTimeout(() => beep(440, 0.15, "sine"), 180);
      } else {
        phaseRef.current = "WORK";
        timeRef.current = workRef.current - 1;
        setRounds(r => r + 1);
        beep(880, 0.12, "square");
        setTimeout(() => beep(1100, 0.1, "square"), 140);
        // Vibration
        if ("vibrate" in navigator) navigator.vibrate([100, 50, 100]);
      }
      setPhase(phaseRef.current);
    }
    setTimeLeft(timeRef.current);
  }, [beep]);

  const start = useCallback(() => {
    if (isRunning) return;
    phaseRef.current = "WORK";
    timeRef.current = workRef.current;
    setPhase("WORK");
    setTimeLeft(workRef.current);
    setRounds(0);
    setIsRunning(true);
    setIsPaused(false);
    intervalRef.current = setInterval(tick, 1000);
  }, [isRunning, tick]);

  const togglePause = useCallback(() => {
    if (isRunning) {
      clearInterval(intervalRef.current);
      setIsRunning(false);
      setIsPaused(true);
    } else if (isPaused) {
      setIsRunning(true);
      setIsPaused(false);
      intervalRef.current = setInterval(tick, 1000);
    }
  }, [isRunning, isPaused, tick]);

  const stop = useCallback(() => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setIsPaused(false);
    phaseRef.current = "WORK";
    timeRef.current = workRef.current;
    setPhase("WORK");
    setTimeLeft(workRef.current);
    setRounds(0);
  }, []);

  const reset = useCallback(() => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setIsPaused(false);
    phaseRef.current = "WORK";
    timeRef.current = workRef.current;
    setPhase("WORK");
    setTimeLeft(workRef.current);
    setRounds(0);
  }, []);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const totalSeconds = phase === "WORK" ? workSec : restSec;
  const isWork = phase === "WORK";

  return (
    <div className={`app ${isWork ? "bg-work" : "bg-rest"}`}>
      {/* Scanline overlay */}
      <div className="scanlines" />

      <header className="header">
        <span className="logo">⚡ INTERVAL<span className="logo-accent">FORGE</span></span>
        <span className="round-badge">RND <strong>{String(rounds).padStart(2, "0")}</strong></span>
      </header>

      <main className="main">
        <TimerDisplay
          seconds={timeLeft}
          phase={phase}
          isRunning={isRunning}
          totalSeconds={totalSeconds}
        />

        <Controls
          isRunning={isRunning}
          isPaused={isPaused}
          onStart={start}
          onPause={togglePause}
          onStop={stop}
          onReset={reset}
        />

        <SettingsPanel
          workSec={workSec}
          restSec={restSec}
          onWorkChange={v => { setWorkSec(v); if (!isRunning && !isPaused) setTimeLeft(v); }}
          onRestChange={setRestSec}
          disabled={isRunning || isPaused}
        />
      </main>
    </div>
  );
}
