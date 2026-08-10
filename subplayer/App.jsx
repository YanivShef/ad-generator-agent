import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import odysseySrt from "./odyssey.ru.srt";
import spidermanSrt from "./spiderman.ru.srt";

const MOVIES = [
  { id: "odyssey", icon: "🏛", name: "The Odyssey (2026) · русский", text: odysseySrt },
  { id: "spiderman", icon: "🕷", name: "Spider-Man: Brand New Day (2026) · русский", text: spidermanSrt },
];

// ---------- SRT / VTT parsing ----------

function parseTimestamp(str) {
  let m = str.match(/(\d+):(\d{2}):(\d{2})[.,](\d{1,3})/);
  if (m) {
    return (
      parseInt(m[1], 10) * 3600 +
      parseInt(m[2], 10) * 60 +
      parseInt(m[3], 10) +
      parseInt(m[4].padEnd(3, "0"), 10) / 1000
    );
  }
  m = str.match(/(\d+):(\d{2})[.,](\d{1,3})/);
  if (m) {
    return (
      parseInt(m[1], 10) * 60 +
      parseInt(m[2], 10) +
      parseInt(m[3].padEnd(3, "0"), 10) / 1000
    );
  }
  return null;
}

function cleanText(text) {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/\{\\[^}]+\}/g, "")
    .replace(/^\s+|\s+$/g, "");
}

function parseSubtitles(raw) {
  const text = raw.replace(/\r/g, "").replace(/^﻿/, "");
  const blocks = text.split(/\n{2,}/);
  const cues = [];
  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    if (!lines.length) continue;
    const timeIdx = lines.findIndex((l) => l.includes("-->"));
    if (timeIdx === -1) continue;
    const [startStr, endStr] = lines[timeIdx].split("-->");
    const s = parseTimestamp(startStr);
    const e = parseTimestamp(endStr);
    if (s == null || e == null) continue;
    const t = cleanText(lines.slice(timeIdx + 1).join("\n"));
    if (!t) continue;
    // drop uploader watermark cues like "- Ибрагим Х: @sle1i"
    if (/@\w/.test(t)) continue;
    cues.push({ s, e, t });
  }
  cues.sort((a, b) => a.s - b.s);
  return cues;
}

// Russian subtitle files are often Windows-1251; try strict UTF-8 first.
function decodeBuffer(buf) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch (_) {
    try {
      return new TextDecoder("windows-1251").decode(buf);
    } catch (_) {
      return new TextDecoder("utf-8").decode(buf);
    }
  }
}

// ---------- Persistence ----------

// build-time defines let the same source serve both artifacts
const STORE_KEY =
  typeof __STORE_KEY__ !== "undefined" ? __STORE_KEY__ : "cinema-subs-v1";
const DEFAULT_MOVIE =
  typeof __DEFAULT_MOVIE__ !== "undefined" ? __DEFAULT_MOVIE__ : "odyssey";

function saveState(partial) {
  try {
    const prev = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    localStorage.setItem(STORE_KEY, JSON.stringify({ ...prev, ...partial }));
  } catch (_) {}
}

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  } catch (_) {
    return {};
  }
}

// playback position is stored per movie so switching films doesn't lose your place
function saveTime(movieId, t) {
  const prev = loadState();
  saveState({ times: { ...(prev.times || {}), [movieId]: Math.max(0, t) } });
}

// ---------- Helpers ----------

function fmtClock(t) {
  if (t < 0) t = 0;
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function useWakeLock(active) {
  const lockRef = useRef(null);
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let cancelled = false;
    const acquire = async () => {
      try {
        lockRef.current = await navigator.wakeLock.request("screen");
      } catch (_) {}
    };
    const onVis = () => {
      if (document.visibilityState === "visible" && !cancelled) acquire();
    };
    acquire();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      if (lockRef.current) lockRef.current.release().catch(() => {});
      lockRef.current = null;
    };
  }, [active]);
}

// ---------- App ----------

function App() {
  const saved = useMemo(loadState, []);
  const initialMovie =
    MOVIES.find((m) => m.id === (saved.movieId || DEFAULT_MOVIE)) || MOVIES[0];
  const [movieId, setMovieId] = useState(initialMovie.id);
  const [cues, setCues] = useState(() =>
    parseSubtitles(saved.srtText || initialMovie.text)
  );
  const [fileName, setFileName] = useState(saved.fileName || initialMovie.name);
  const [mode, setMode] = useState("play"); // setup | play
  const [playing, setPlaying] = useState(false);
  const [snapshot, setSnapshot] = useState(
    (saved.times && saved.times[initialMovie.id]) ?? saved.time ?? 0
  ); // movie seconds at anchor
  const [anchor, setAnchor] = useState(() => Date.now());
  const [fontSize, setFontSize] = useState(saved.fontSize || 34);
  const [showControls, setShowControls] = useState(true);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [jumpH, setJumpH] = useState("");
  const [jumpM, setJumpM] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const listRef = useRef(null);
  const [, setTick] = useState(0);

  useWakeLock(mode === "play");

  const now = Date.now();
  const currentTime = playing ? snapshot + (now - anchor) / 1000 : snapshot;

  useEffect(() => {
    if (mode !== "play") return;
    const id = setInterval(() => setTick((n) => n + 1), 100);
    return () => clearInterval(id);
  }, [mode]);

  useEffect(() => {
    if (mode !== "play") return;
    const id = setInterval(() => {
      const t = playing ? snapshot + (Date.now() - anchor) / 1000 : snapshot;
      saveTime(movieId, t);
      saveState({ fontSize });
    }, 5000);
    return () => clearInterval(id);
  }, [mode, playing, snapshot, anchor, fontSize, movieId]);

  function setTime(t) {
    setSnapshot(Math.max(0, t));
    setAnchor(Date.now());
    saveTime(movieId, t);
  }

  function selectMovie(m) {
    const t = (loadState().times || {})[m.id] || 0;
    setMovieId(m.id);
    setCues(parseSubtitles(m.text));
    setFileName(m.name);
    saveState({ movieId: m.id, srtText: "", fileName: m.name });
    setSnapshot(t);
    setAnchor(Date.now());
    setMode("play");
    setPlaying(false);
  }

  function nudge(d) {
    setTime(currentTime + d);
  }

  function togglePlay() {
    if (playing) {
      setSnapshot(currentTime);
      setAnchor(Date.now());
      setPlaying(false);
    } else {
      setAnchor(Date.now());
      setPlaying(true);
    }
  }

  function loadText(text, name) {
    const parsed = parseSubtitles(text);
    if (!parsed.length) {
      alert("לא הצלחתי לקרוא כתוביות מהקובץ הזה. ודא שזה קובץ SRT/VTT.");
      return;
    }
    setCues(parsed);
    setFileName(name);
    saveState({ srtText: text, fileName: name });
    setTime(0);
    setMode("play");
    setPlaying(false);
  }

  function onFile(ev) {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => loadText(decodeBuffer(reader.result), file.name);
    reader.readAsArrayBuffer(file);
  }

  function toggleFullscreen() {
    const d = document;
    const el = d.documentElement;
    const inFs = d.fullscreenElement || d.webkitFullscreenElement;
    try {
      if (inFs) {
        (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      } else {
        const req = el.requestFullscreen || el.webkitRequestFullscreen;
        if (req) {
          const p = req.call(el);
          if (p && p.catch) p.catch(() => {});
          setShowControls(false);
        } else {
          // iPhone Safari has no Fullscreen API — hiding the controls is the closest thing
          setShowControls(false);
        }
      }
    } catch (_) {}
  }

  useEffect(() => {
    const onFs = () =>
      setIsFullscreen(
        !!(document.fullscreenElement || document.webkitFullscreenElement)
      );
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs);
    };
  }, []);

  useEffect(() => {
    if (!listOpen || !listRef.current || !cues) return;
    let idx = cues.findIndex((c) => c.s >= currentTime);
    if (idx === -1) idx = cues.length - 1;
    const el = listRef.current.querySelector(`[data-idx="${idx}"]`);
    if (el) el.scrollIntoView({ block: "center" });
  }, [listOpen]);

  function doJump() {
    const h = parseInt(jumpH || "0", 10) || 0;
    const m = parseInt(jumpM || "0", 10) || 0;
    setTime(h * 3600 + m * 60);
  }

  const activeCue = useMemo(() => {
    if (!cues) return null;
    // linear scan is fine at 100ms cadence for ~2k cues
    for (let i = 0; i < cues.length; i++) {
      if (cues[i].s <= currentTime && currentTime <= cues[i].e) return cues[i];
      if (cues[i].s > currentTime) break;
    }
    return null;
  }, [cues, Math.floor(currentTime * 10)]);

  const nextCue = useMemo(() => {
    if (!cues) return null;
    for (let i = 0; i < cues.length; i++) {
      if (cues[i].s > currentTime) return cues[i];
    }
    return null;
  }, [cues, Math.floor(currentTime)]);

  // ---------- Setup screen ----------

  if (mode === "setup") {
    return (
      <div className="setup" dir="rtl">
        <div className="setup-inner">
          <div className="brand">
            <span className="brand-dot" />
            <h1>כתוביות לייב</h1>
          </div>
          <p className="tagline">
            נגן כתוביות לקולנוע — טוען קובץ SRT ומריץ אותו מסונכרן עם הסרט,
            בלי אינטרנט ובלי מיקרופון.
          </p>

          {cues && (
            <button
              className="btn primary big"
              onClick={() => {
                setMode("play");
                setPlaying(false);
              }}
            >
              ▶ המשך — {fileName || "כתוביות שמורות"} ({fmtClock(snapshot)})
            </button>
          )}

          {MOVIES.map((m) => (
            <button
              key={m.id}
              className="btn primary big"
              onClick={() => selectMovie(m)}
            >
              {m.icon} {m.name}
            </button>
          ))}

          <label className="btn big file-btn">
            📂 טען קובץ כתוביות (.srt / .vtt)
            <input type="file" accept=".srt,.vtt,.txt" onChange={onFile} />
          </label>

          <button className="btn ghost" onClick={() => setPasteOpen(!pasteOpen)}>
            או הדבק טקסט כתוביות
          </button>

          {pasteOpen && (
            <div className="paste-box">
              <textarea
                dir="ltr"
                placeholder={"1\n00:00:05,000 --> 00:00:08,000\nТекст субтитров..."}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
              <button
                className="btn primary"
                onClick={() => loadText(pasteText, "טקסט מודבק")}
              >
                טען
              </button>
            </div>
          )}

          <div className="hint">
            <strong>איך משיגים קובץ?</strong> חפש בגוגל את שם הסרט + "subtitles
            russian srt" (למשל באתרים subdl.com או subsource.net), הורד את
            הקובץ לטלפון וטען אותו כאן.
          </div>
        </div>
      </div>
    );
  }

  // ---------- Player screen ----------

  return (
    <div className="player">
      <div
        className="stage"
        onClick={() => setShowControls((v) => !v)}
        role="button"
        aria-label="הצג או הסתר כפתורים"
      >
        {activeCue ? (
          <div className="cue" dir="auto" style={{ fontSize: fontSize + "px" }}>
            {activeCue.t.split("\n").map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        ) : (
          <div className="cue idle" style={{ fontSize: Math.max(16, fontSize - 12) + "px" }}>
            {playing
              ? nextCue
                ? "…"
                : ""
              : "מושהה — קפוץ לדקה שאתה נמצא בה ולחץ ▶"}
          </div>
        )}
      </div>

      {showControls && (
        <div className="controls" dir="rtl" onClick={(e) => e.stopPropagation()}>
          <div className="row clock-row">
            <button className="btn play" onClick={togglePlay}>
              {playing ? "⏸ השהה" : "▶ הפעל"}
            </button>
            <span className="clock">{fmtClock(currentTime)}</span>
            <button className="btn" onClick={toggleFullscreen} aria-label="מסך מלא">
              {isFullscreen ? "✕ צא ממסך מלא" : "⛶ מסך מלא"}
            </button>
          </div>

          <div className="row">
            <button className="btn wide" onClick={() => setListOpen(true)}>
              📜 סנכרון בגלילה — מצא את המשפט שנאמר עכשיו
            </button>
          </div>

          <div className="row">
            <span className="lbl">סנכרון</span>
            <button className="btn nudge" onClick={() => nudge(-60)}>−1 דק׳</button>
            <button className="btn nudge" onClick={() => nudge(-5)}>−5 שנ׳</button>
            <button className="btn nudge" onClick={() => nudge(-1)}>−1 שנ׳</button>
            <button className="btn nudge" onClick={() => nudge(-0.5)}>−½</button>
            <button className="btn nudge" onClick={() => nudge(-0.25)}>−¼</button>
            <button className="btn nudge" onClick={() => nudge(0.25)}>+¼</button>
            <button className="btn nudge" onClick={() => nudge(0.5)}>+½</button>
            <button className="btn nudge" onClick={() => nudge(1)}>+1 שנ׳</button>
            <button className="btn nudge" onClick={() => nudge(5)}>+5 שנ׳</button>
            <button className="btn nudge" onClick={() => nudge(60)}>+1 דק׳</button>
          </div>
          <div className="sync-hint">
            הכתובית מופיעה מוקדם מדי? לחץ מינוס. מאוחר מדי? לחץ פלוס.
          </div>

          <div className="row">
            <span className="lbl">קפוץ אל</span>
            <input
              className="jump"
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="שעה"
              value={jumpH}
              onChange={(e) => setJumpH(e.target.value)}
            />
            <input
              className="jump"
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="דקה"
              value={jumpM}
              onChange={(e) => setJumpM(e.target.value)}
            />
            <button className="btn" onClick={doJump}>קפוץ</button>
          </div>

          <div className="row">
            <span className="lbl">גודל טקסט</span>
            <button
              className="btn nudge"
              onClick={() => {
                const v = Math.max(18, fontSize - 4);
                setFontSize(v);
                saveState({ fontSize: v });
              }}
            >
              א−
            </button>
            <button
              className="btn nudge"
              onClick={() => {
                const v = Math.min(72, fontSize + 4);
                setFontSize(v);
                saveState({ fontSize: v });
              }}
            >
              א+
            </button>
            <span className="spacer" />
            <button className="btn ghost small" onClick={() => setMode("setup")}>
              החלף קובץ
            </button>
          </div>

          <div className="foot">לחיצה על המסך מסתירה את הכפתורים · המסך יישאר דלוק</div>
        </div>
      )}

      {listOpen && (
        <div className="cuelist" onClick={(e) => e.stopPropagation()}>
          <div className="cuelist-head" dir="rtl">
            <span>גלול, מצא את המשפט שנאמר עכשיו — ולחץ עליו</span>
            <button className="btn small" onClick={() => setListOpen(false)}>
              ✕ סגור
            </button>
          </div>
          <div className="cuelist-scroll" ref={listRef}>
            {cues.map((c, i) => (
              <button
                key={i}
                data-idx={i}
                className={
                  "cuerow" +
                  (c.s <= currentTime && currentTime <= c.e ? " on" : "")
                }
                onClick={() => {
                  setTime(c.s);
                  setPlaying(true);
                  setAnchor(Date.now());
                  setListOpen(false);
                }}
              >
                <span className="cuetime">{fmtClock(c.s)}</span>
                <span className="cuetext" dir="auto">
                  {c.t.replace(/\n/g, " ")}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
