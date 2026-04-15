import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "./App.css";

/*
  StudyJam
  ---------------------------------------
  Recruiter-friendly version with:
  - Focus / Rooms / Social / Profile tabs
  - Focus mode lock UI
  - Break button
  - Distraction detection
  - Inactivity detection
  - Music pauses when distracted
  - Achievement badges
  - Editable profile
  - localStorage persistence
*/

const ITEM_HEIGHT = 32;
const VISIBLE_ROWS = 5;
const SPACER_HEIGHT = ((VISIBLE_ROWS - 1) / 2) * ITEM_HEIGHT;
const INACTIVITY_LIMIT_MS = 45000;

/*
  Reusable time wheel picker.
*/
function TimeWheel({ label, max, value, onChange }) {
  const wheelRef = useRef(null);
  const values = Array.from({ length: max + 1 }, (_, i) => i);

  useEffect(() => {
    if (!wheelRef.current) return;

    wheelRef.current.scrollTo({
      top: value * ITEM_HEIGHT,
      behavior: "auto",
    });
  }, [value]);

  const handleScroll = () => {
    if (!wheelRef.current) return;

    const scrollTop = wheelRef.current.scrollTop;
    const nextValue = Math.round(scrollTop / ITEM_HEIGHT);
    const clampedValue = Math.max(0, Math.min(max, nextValue));

    if (clampedValue !== value) {
      onChange(clampedValue);
    }
  };

  return (
    <div className="wheel-group">
      <p className="wheel-heading">{label}</p>

      <div className="wheel-shell">
        <div
          ref={wheelRef}
          className="wheel"
          onScroll={handleScroll}
          aria-label={`${label} picker`}
          tabIndex="0"
        >
          <div style={{ height: SPACER_HEIGHT }} />

          {values.map((number) => (
            <div
              key={number}
              className={`wheel-item ${number === value ? "selected" : ""}`}
            >
              {String(number).padStart(2, "0")}
            </div>
          ))}

          <div style={{ height: SPACER_HEIGHT }} />
        </div>

        <div className="wheel-highlight" aria-hidden="true" />
      </div>
    </div>
  );
}

/*
  Small modal for mock session invites.
*/
function SessionInviteModal({
  isOpen,
  onClose,
  buddyName,
  selectedRoom,
  hours,
  minutes,
  seconds,
}) {
  if (!isOpen) return null;

  const prettyTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")}`;

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="modal-card"
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.22 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-modal-title"
        >
          <p className="section-kicker">Session invite</p>
          <h2 id="invite-modal-title" className="dashboard-title">
            Invite sent to {buddyName}
          </h2>

          <p className="dashboard-subtext">
            This is a recruiter-friendly mock flow showing how users could invite
            others into their next room session.
          </p>

          <div className="modal-summary">
            <div className="mini-stat-card">
              <span className="mini-stat-label">Room</span>
              <strong>{selectedRoom}</strong>
            </div>

            <div className="mini-stat-card">
              <span className="mini-stat-label">Timer</span>
              <strong>{prettyTime}</strong>
            </div>
          </div>

          <div className="social-actions modal-actions">
            <button type="button" className="primary-button" onClick={onClose}>
              Nice
            </button>

            <button type="button" className="secondary-button" onClick={onClose}>
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  /*
    ---------------------------------------
    PAGE / TAB STATE
    ---------------------------------------
  */
  const [activePage, setActivePage] = useState("focus");

  /*
    ---------------------------------------
    TIMER STATE
    ---------------------------------------
  */
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);

  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [timerView, setTimerView] = useState("minimal");
  const [sessionDuration, setSessionDuration] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);

  /*
    ---------------------------------------
    SESSION / ACCOUNTABILITY STATE
    ---------------------------------------
  */
  const [sessionState, setSessionState] = useState("focused");
  const [musicPlaying, setMusicPlaying] = useState(true);
  const [musicProgress, setMusicProgress] = useState(38);
  const [distractionMessage, setDistractionMessage] = useState("");
  const [lastActiveAt, setLastActiveAt] = useState(Date.now());

  /*
    Session state values:
    - focused
    - break
    - distracted
  */

  /*
    ---------------------------------------
    APP FEATURE STATE
    ---------------------------------------
  */
  const [visibilityMode, setVisibilityMode] = useState("anonymous");
  const [selectedRoom, setSelectedRoom] = useState("Lo-fi Lounge");
  const [focusGoalCompleted, setFocusGoalCompleted] = useState(2);
  const [focusGoalTarget] = useState(3);
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteTarget, setInviteTarget] = useState("Maya Chen");

  /*
    ---------------------------------------
    PROFILE STATE
    ---------------------------------------
  */
  const [userProfile, setUserProfile] = useState({
    name: "Sophia",
    username: "@studyjamuser",
    avatar: "🎀",
    favoriteGenre: "Lo-fi",
    studyStyle: "Quiet focus sessions",
    streak: 12,
    sessionsCompleted: 48,
    weeklyHours: 9.5,
    favoriteRoom: "Lo-fi Lounge",
    bestFocusWindow: "7 PM - 10 PM",
  });

  /*
    Study rooms.
  */
  const studyRooms = [
    {
      name: "Classical Corner",
      genre: "Classical",
      icon: "🎻",
      description: "For deep focus, calm energy, and zero distractions.",
      people: 18,
      energy: "Calm",
      bestFor: "Reading",
      tags: ["Deep focus", "Reading", "Calm"],
      track: "Moonlit Strings",
      artist: "Aster Ensemble",
    },
    {
      name: "Lo-fi Lounge",
      genre: "Lo-fi",
      icon: "🎧",
      description: "Soft beats and cozy vibes for everyday study sessions.",
      people: 27,
      energy: "Low",
      bestFor: "General studying",
      tags: ["Cozy", "Popular", "Everyday"],
      track: "Lavender Notes",
      artist: "Quiet Canvas",
    },
    {
      name: "Podcast Pod",
      genre: "Podcasts",
      icon: "🎙️",
      description: "For learners who like spoken audio while working.",
      people: 9,
      energy: "Moderate",
      bestFor: "Light study",
      tags: ["Audio learning", "Casual", "Background"],
      track: "Focus Talks Daily",
      artist: "StudyCast",
    },
    {
      name: "Rock Room",
      genre: "Rock",
      icon: "🎸",
      description: "Higher energy sessions for powering through tasks.",
      people: 14,
      energy: "High",
      bestFor: "Power sessions",
      tags: ["Energetic", "Momentum", "Fast-paced"],
      track: "Momentum Drive",
      artist: "Static Youth",
    },
    {
      name: "Ambient Space",
      genre: "Ambient",
      icon: "🌙",
      description: "Low-noise, dreamy background sound for locking in.",
      people: 21,
      energy: "Calm",
      bestFor: "Writing",
      tags: ["Dreamy", "Quiet", "Writing"],
      track: "Cloud Drift",
      artist: "Velvet Sky",
    },
    {
      name: "Silent Session",
      genre: "No Music",
      icon: "🤫",
      description: "No audio, just accountability and focused presence.",
      people: 11,
      energy: "Silent",
      bestFor: "Deep work",
      tags: ["Silent", "Deep work", "Minimal"],
      track: "Silence mode",
      artist: "No playback",
    },
    {
      name: "Deep Focus Studio",
      genre: "Focus Mix",
      icon: "🧠",
      description: "Structured, distraction-free sessions for serious lock-in time.",
      people: 16,
      energy: "Low",
      bestFor: "Coding",
      tags: ["Structured", "Coding", "High concentration"],
      track: "Neural Flow",
      artist: "Logic Bloom",
    },
  ];

  /*
    Social / matching data.
  */
  const suggestedGroups = [
    {
      name: "Night Owl Coders",
      match: "96%",
      reason: "Matches your evening focus habits and longer session style.",
    },
    {
      name: "Lo-fi Lock In",
      match: "92%",
      reason: "Strong overlap in music preference and quiet work sessions.",
    },
    {
      name: "Deep Focus Collective",
      match: "89%",
      reason: "Good fit for structured timers and minimal distractions.",
    },
  ];

  const studyBuddies = [
    {
      name: "Maya Chen",
      handle: "@mayalocksin",
      compatibility: "95%",
      note: "Prefers evening lo-fi sessions and 45-minute timers.",
      status: "Active now",
      avatar: "🌷",
    },
    {
      name: "Jordan Lee",
      handle: "@jordanstudies",
      compatibility: "91%",
      note: "Quiet study style with strong consistency and focus streaks.",
      status: "Next session in 20 min",
      avatar: "📚",
    },
    {
      name: "Anonymous Owl",
      handle: "@privatefocus",
      compatibility: "88%",
      note: "Matches your session habits but prefers semi-private rooms.",
      status: "In Deep Focus Studio",
      avatar: "🦉",
    },
  ];

  const roomParticipants = {
    "Classical Corner": ["Calm Coder", "Focus Finch", "Quiet Iris", "Study Swan"],
    "Lo-fi Lounge": ["Anonymous Owl", "Luna Notes", "Focus Fox", "Milo", "Night Reader"],
    "Podcast Pod": ["Curious Bear", "Audio Ace", "Study Bloom"],
    "Rock Room": ["Nova", "Power Panda", "Edge", "Max"],
    "Ambient Space": ["Moonlight Mind", "Soft Orbit", "Quiet Koala"],
    "Silent Session": ["Focus Fox", "Anonymous Lynx", "Still Owl"],
    "Deep Focus Studio": ["Code Raven", "Pixel Pine", "Deep Owl", "Zen Logic"],
  };

  const sessionHistory = [
    { day: "Today", room: "Lo-fi Lounge", duration: "25 min" },
    { day: "Yesterday", room: "Silent Session", duration: "50 min" },
    { day: "Mon", room: "Deep Focus Studio", duration: "45 min" },
  ];

  const anonymousNames = [
    "Anonymous Owl",
    "Focus Fox",
    "Quiet Koala",
    "Night Finch",
    "Calm Lynx",
    "Study Swan",
  ];

  const achievements = [
    {
      title: "First Lock-In",
      icon: "✨",
      description: "Completed your first focus session.",
      earned: true,
    },
    {
      title: "3 Day Streak",
      icon: "🔥",
      description: "Maintained focus for 3 days in a row.",
      earned: true,
    },
    {
      title: "Night Owl",
      icon: "🌙",
      description: "Most productive during evening sessions.",
      earned: true,
    },
    {
      title: "Lo-fi Loyalist",
      icon: "🎧",
      description: "Spent the most time in Lo-fi Lounge.",
      earned: true,
    },
    {
      title: "No Break Session",
      icon: "💎",
      description: "Finished a full session without interruption.",
      earned: false,
    },
    {
      title: "Consistency Club",
      icon: "📈",
      description: "Complete 10 total sessions.",
      earned: true,
    },
  ];

  /*
    ---------------------------------------
    LOAD SAVED DATA
    ---------------------------------------
  */
  useEffect(() => {
    const savedProfile = localStorage.getItem("studyjam-profile");
    const savedSettings = localStorage.getItem("studyjam-settings");
    const savedTimer = localStorage.getItem("studyjam-timer");

    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
    }

    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSelectedRoom(parsed.selectedRoom ?? "Lo-fi Lounge");
      setVisibilityMode(parsed.visibilityMode ?? "anonymous");
      setTimerView(parsed.timerView ?? "minimal");
      setFocusGoalCompleted(parsed.focusGoalCompleted ?? 2);
    }

    if (savedTimer) {
      const parsedTimer = JSON.parse(savedTimer);
      setHours(parsedTimer.hours ?? 0);
      setMinutes(parsedTimer.minutes ?? 25);
      setSeconds(parsedTimer.seconds ?? 0);
    }
  }, []);

  /*
    ---------------------------------------
    SAVE DATA
    ---------------------------------------
  */
  useEffect(() => {
    localStorage.setItem("studyjam-profile", JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem(
      "studyjam-settings",
      JSON.stringify({
        selectedRoom,
        visibilityMode,
        timerView,
        focusGoalCompleted,
      })
    );
  }, [selectedRoom, visibilityMode, timerView, focusGoalCompleted]);

  useEffect(() => {
    localStorage.setItem(
      "studyjam-timer",
      JSON.stringify({
        hours,
        minutes,
        seconds,
      })
    );
  }, [hours, minutes, seconds]);

  /*
    Convert selected time into total seconds.
  */
  const selectedTotalSeconds = useMemo(() => {
    return hours * 3600 + minutes * 60 + seconds;
  }, [hours, minutes, seconds]);

  /*
    Keep display synced before session starts.
  */
  useEffect(() => {
    if (hasStarted) return;
    setTimeLeft(selectedTotalSeconds);
  }, [selectedTotalSeconds, hasStarted]);

  /*
    Countdown effect.
  */
  useEffect(() => {
    if (!isRunning) return;
    if (sessionState === "break") return;
    if (sessionState === "distracted") return;

    const intervalId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          setIsRunning(false);
          setSessionState("focused");
          setMusicPlaying(false);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isRunning, sessionState]);

  /*
    Fake music progress when audio is playing.
  */
  useEffect(() => {
    if (!musicPlaying) return;
    if (selectedRoom === "Silent Session") return;

    const interval = setInterval(() => {
      setMusicProgress((prev) => {
        if (prev >= 100) return 0;
        return prev + 1;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [musicPlaying, selectedRoom]);

  /*
    Detect tab switching / page hiding.
    This is the realistic browser-based version of "phone distraction".
  */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.hidden &&
        isRunning &&
        sessionState !== "break" &&
        timeLeft > 0
      ) {
        setSessionState("distracted");
        setMusicPlaying(false);
        setDistractionMessage("You left the session, so room music paused.");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isRunning, sessionState, timeLeft]);

  /*
    Track user activity so we can detect inactivity too.
  */
  useEffect(() => {
    const markActive = () => {
      setLastActiveAt(Date.now());
    };

    const events = ["mousemove", "keydown", "mousedown", "touchstart", "scroll"];

    events.forEach((eventName) => {
      window.addEventListener(eventName, markActive);
    });

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, markActive);
      });
    };
  }, []);

  /*
    Inactivity detection.
    If user is inactive too long during a session and not on break,
    we mark them distracted and pause the room music.
  */
  useEffect(() => {
    const interval = setInterval(() => {
      const inactiveTooLong = Date.now() - lastActiveAt > INACTIVITY_LIMIT_MS;

      if (
        isRunning &&
        sessionState === "focused" &&
        inactiveTooLong &&
        timeLeft > 0
      ) {
        setSessionState("distracted");
        setMusicPlaying(false);
        setDistractionMessage(
          "No activity was detected for a while, so room music paused."
        );
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isRunning, sessionState, lastActiveAt, timeLeft]);

  /*
    Start or resume the timer.
  */
  const handleStart = () => {
    if (!hasStarted) {
      if (selectedTotalSeconds <= 0) return;

      setTimeLeft(selectedTotalSeconds);
      setSessionDuration(selectedTotalSeconds);
      setHasStarted(true);
    }

    if (timeLeft > 0 || selectedTotalSeconds > 0) {
      setIsRunning(true);
      setSessionState("focused");
      setDistractionMessage("");
      if (selectedRoom !== "Silent Session") {
        setMusicPlaying(true);
      }
      setLastActiveAt(Date.now());
    }
  };

  /*
    Pause session manually.
  */
  const handlePause = () => {
    setIsRunning(false);
    setMusicPlaying(false);
  };

  /*
    Reset session.
  */
  const handleReset = () => {
    setIsRunning(false);
    setHasStarted(false);
    setSessionState("focused");
    setDistractionMessage("");
    setMusicPlaying(false);
    setTimeLeft(selectedTotalSeconds);
    setSessionDuration(selectedTotalSeconds);
  };

  /*
    User intentionally takes a break.
  */
  const handleTakeBreak = () => {
    if (!hasStarted) return;

    setSessionState("break");
    setMusicPlaying(false);
    setDistractionMessage("You’re on break. Room music is paused.");
  };

  /*
    Resume from break or distraction.
  */
  const handleResumeFocus = () => {
    if (timeLeft <= 0) return;

    setSessionState("focused");
    setDistractionMessage("");
    setLastActiveAt(Date.now());

    if (isRunning && selectedRoom !== "Silent Session") {
      setMusicPlaying(true);
    }
  };

  /*
    Mark one goal as done.
  */
  const handleMarkGoalProgress = () => {
    setFocusGoalCompleted((prev) => Math.min(prev + 1, focusGoalTarget));
  };

  /*
    Format timer.
  */
  const displayHours = String(Math.floor(timeLeft / 3600)).padStart(2, "0");
  const displayMinutes = String(Math.floor((timeLeft % 3600) / 60)).padStart(
    2,
    "0"
  );
  const displaySeconds = String(timeLeft % 60).padStart(2, "0");

  /*
    Ring progress.
  */
  const progress =
    sessionDuration > 0
      ? Math.max(0, Math.min(1, timeLeft / sessionDuration))
      : 1;

  const radius = 132;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  /*
    Status text.
  */
  const statusText = !hasStarted
    ? "Ready to start"
    : sessionState === "break"
    ? "On break"
    : sessionState === "distracted"
    ? "Focus lost"
    : isRunning
    ? "Session in progress"
    : "Paused";

  const currentRoom =
    studyRooms.find((room) => room.name === selectedRoom) || studyRooms[0];

  const recommendedRoom = studyRooms.find((room) => room.name === "Lo-fi Lounge");
  const anonymousIdentity = anonymousNames[2];

  const goalPercent = Math.min(
    100,
    Math.round((focusGoalCompleted / focusGoalTarget) * 100)
  );

  const handleOpenInvite = (name) => {
    setInviteTarget(name);
    setIsInviteModalOpen(true);
  };

  const handleProfileInput = (field, value) => {
    setUserProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const pageMotion = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.24 },
  };

  const roomStatusLabel =
    sessionState === "break"
      ? "On Break"
      : sessionState === "distracted"
      ? "Distracted"
      : "Focused";

  return (
    <main className="app">
      <section className="app-shell" aria-labelledby="studyjam-title">
        <p className="eyebrow">Collaborative focus app</p>

        <h1 id="studyjam-title" className="title">
          <span className="title-icon">🎧</span>
          <span>StudyJam</span>
        </h1>

        <p className="subtitle">
          Lock in, stay focused, and study together.
        </p>

        <div className="page-tabs" role="tablist" aria-label="StudyJam pages">
          <button
            type="button"
            className={`page-tab ${activePage === "focus" ? "active" : ""}`}
            onClick={() => setActivePage("focus")}
          >
            Focus
          </button>

          <button
            type="button"
            className={`page-tab ${activePage === "rooms" ? "active" : ""}`}
            onClick={() => setActivePage("rooms")}
          >
            Rooms
          </button>

          <button
            type="button"
            className={`page-tab ${activePage === "social" ? "active" : ""}`}
            onClick={() => setActivePage("social")}
          >
            Social
          </button>

          <button
            type="button"
            className={`page-tab ${activePage === "profile" ? "active" : ""}`}
            onClick={() => setActivePage("profile")}
          >
            Profile
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activePage === "focus" && (
            <motion.section key="focus" className="page-section" {...pageMotion}>
              <div className={`focus-page-shell ${isRunning ? "focus-mode-on" : ""}`}>
                <div className="focus-grid">
                  <article className="hero-card main-focus-card">
                    <div className="picker-section">
                      <div className="section-head">
                        <div>
                          <p className="section-kicker">Session setup</p>
                          <h2 className="section-title">Set your study session</h2>
                        </div>
                      </div>

                      <div className="time-picker">
                        <TimeWheel
                          label="Hours"
                          max={12}
                          value={hours}
                          onChange={setHours}
                        />

                        <TimeWheel
                          label="Minutes"
                          max={59}
                          value={minutes}
                          onChange={setMinutes}
                        />

                        <TimeWheel
                          label="Seconds"
                          max={59}
                          value={seconds}
                          onChange={setSeconds}
                        />
                      </div>
                    </div>

                    <div
                      className="view-toggle"
                      role="tablist"
                      aria-label="Timer display mode"
                    >
                      <button
                        type="button"
                        className={`view-toggle-button ${
                          timerView === "minimal" ? "active" : ""
                        }`}
                        onClick={() => setTimerView("minimal")}
                      >
                        Minimal
                      </button>

                      <button
                        type="button"
                        className={`view-toggle-button ${
                          timerView === "ring" ? "active" : ""
                        }`}
                        onClick={() => setTimerView("ring")}
                      >
                        Focus Ring
                      </button>
                    </div>

                    <div className="focus-status-banner-wrap">
                      {sessionState === "focused" && isRunning && (
                        <div className="focus-status-banner focused">
                          Locked in. Room music is active.
                        </div>
                      )}

                      {sessionState === "break" && (
                        <div className="focus-status-banner break">
                          Taking a break. Music is paused intentionally.
                        </div>
                      )}

                      {sessionState === "distracted" && (
                        <div className="focus-status-banner distracted">
                          {distractionMessage}
                        </div>
                      )}
                    </div>

                    {timerView === "ring" ? (
                      <div className="timer-mode timer-mode-ring">
                        <div className="timer-ring-shell">
                          <svg
                            className="progress-ring"
                            width="340"
                            height="340"
                            viewBox="0 0 340 340"
                            aria-hidden="true"
                          >
                            <circle
                              className="progress-ring-track"
                              cx="170"
                              cy="170"
                              r={radius}
                            />

                            <circle
                              className="progress-ring-fill"
                              cx="170"
                              cy="170"
                              r={radius}
                              strokeDasharray={circumference}
                              strokeDashoffset={dashOffset}
                            />
                          </svg>

                          <div
                            className="timer-display"
                            aria-live="polite"
                            aria-label={`Time remaining: ${displayHours} hours, ${displayMinutes} minutes, and ${displaySeconds} seconds`}
                          >
                            <span>{displayHours}</span>
                            <span className="colon">:</span>
                            <span>{displayMinutes}</span>
                            <span className="colon">:</span>
                            <span>{displaySeconds}</span>
                          </div>
                        </div>

                        <div className="timer-unit-row" aria-hidden="true">
                          <span>Hours</span>
                          <span>Minutes</span>
                          <span>Seconds</span>
                        </div>
                      </div>
                    ) : (
                      <div className="timer-mode timer-mode-minimal">
                        <div
                          className="timer-display timer-display-minimal"
                          aria-live="polite"
                          aria-label={`Time remaining: ${displayHours} hours, ${displayMinutes} minutes, and ${displaySeconds} seconds`}
                        >
                          <span>{displayHours}</span>
                          <span className="colon">:</span>
                          <span>{displayMinutes}</span>
                          <span className="colon">:</span>
                          <span>{displaySeconds}</span>
                        </div>

                        <div
                          className="timer-unit-row timer-unit-row-minimal"
                          aria-hidden="true"
                        >
                          <span>Hours</span>
                          <span>Minutes</span>
                          <span>Seconds</span>
                        </div>
                      </div>
                    )}

                    <p className="session-label">{statusText}</p>

                    <div className="button-row">
                      <button
                        className="primary-button"
                        onClick={handleStart}
                        disabled={
                          isRunning &&
                          sessionState === "focused" &&
                          timeLeft > 0
                        }
                      >
                        {hasStarted ? "Resume session" : "Start session"}
                      </button>

                      <button
                        className="secondary-button"
                        onClick={handlePause}
                        disabled={!hasStarted || timeLeft <= 0}
                      >
                        Pause
                      </button>

                      <button
                        className="secondary-button"
                        onClick={handleTakeBreak}
                        disabled={!hasStarted || sessionState === "break" || timeLeft <= 0}
                      >
                        Take break
                      </button>

                      <button
                        className="secondary-button"
                        onClick={handleResumeFocus}
                        disabled={sessionState === "focused" || timeLeft <= 0}
                      >
                        Back to focus
                      </button>

                      <button className="secondary-button" onClick={handleReset}>
                        Reset
                      </button>
                    </div>
                  </article>

                  <aside className="focus-side-column">
                    <motion.article
                      className="dashboard-card glass-card"
                      whileHover={{ y: -2 }}
                    >
                      <div className="section-head compact">
                        <div>
                          <p className="section-kicker">Active room</p>
                          <h2 className="dashboard-title">Session preview</h2>
                        </div>
                      </div>

                      <div className="active-room-card">
                        <div className="active-room-top">
                          <div className="active-room-icon">{currentRoom.icon}</div>

                          <div>
                            <h3 className="active-room-name">{currentRoom.name}</h3>
                            <p className="active-room-meta">
                              {currentRoom.genre} • {currentRoom.people} studying
                            </p>
                          </div>
                        </div>

                        <p className="active-room-description">
                          {currentRoom.description}
                        </p>

                        <div className="tag-row">
                          {currentRoom.tags.map((tag) => (
                            <span key={tag} className="soft-tag">
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="mini-stat-grid">
                          <div className="mini-stat-card">
                            <span className="mini-stat-label">Energy</span>
                            <strong>{currentRoom.energy}</strong>
                          </div>

                          <div className="mini-stat-card">
                            <span className="mini-stat-label">Best for</span>
                            <strong>{currentRoom.bestFor}</strong>
                          </div>

                          <div className="mini-stat-card">
                            <span className="mini-stat-label">Status</span>
                            <strong>{roomStatusLabel}</strong>
                          </div>

                          <div className="mini-stat-card">
                            <span className="mini-stat-label">Audio</span>
                            <strong>
                              {selectedRoom === "Silent Session"
                                ? "Silent"
                                : musicPlaying
                                ? "Playing"
                                : "Paused"}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </motion.article>

                    <motion.article
                      className="dashboard-card"
                      whileHover={{ y: -2 }}
                    >
                      <div className="section-head compact">
                        <div>
                          <p className="section-kicker">Audio vibe</p>
                          <h2 className="dashboard-title">Music player</h2>
                        </div>
                      </div>

                      <div className="music-player-card">
                        <div className="music-player-top">
                          <div className="music-art">{currentRoom.icon}</div>

                          <div>
                            <h3 className="active-room-name">{currentRoom.track}</h3>
                            <p className="active-room-meta">{currentRoom.artist}</p>
                          </div>
                        </div>

                        <div className="music-progress-bar">
                          <div
                            className="music-progress-fill"
                            style={{
                              width: `${
                                selectedRoom === "Silent Session" ? 0 : musicProgress
                              }%`,
                            }}
                          />
                        </div>

                        <div className="music-player-controls">
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() =>
                              setMusicProgress((prev) => Math.max(prev - 10, 0))
                            }
                            disabled={selectedRoom === "Silent Session"}
                          >
                            ⏮
                          </button>

                          <button
                            type="button"
                            className="icon-button play-button"
                            onClick={() => setMusicPlaying((prev) => !prev)}
                            disabled={
                              selectedRoom === "Silent Session" ||
                              sessionState === "break" ||
                              sessionState === "distracted"
                            }
                          >
                            {selectedRoom === "Silent Session"
                              ? "—"
                              : musicPlaying
                              ? "⏸"
                              : "▶"}
                          </button>

                          <button
                            type="button"
                            className="icon-button"
                            onClick={() =>
                              setMusicProgress((prev) => Math.min(prev + 10, 100))
                            }
                            disabled={selectedRoom === "Silent Session"}
                          >
                            ⏭
                          </button>
                        </div>

                        <p className="music-caption">
                          {selectedRoom === "Silent Session"
                            ? "This room uses no music playback."
                            : sessionState === "distracted"
                            ? "Music paused because focus was lost."
                            : sessionState === "break"
                            ? "Music paused while you’re on break."
                            : "Mock room audio player for a recruiter-friendly prototype."}
                        </p>
                      </div>
                    </motion.article>

                    <motion.article
                      className="dashboard-card"
                      whileHover={{ y: -2 }}
                    >
                      <div className="section-head compact">
                        <div>
                          <p className="section-kicker">Daily goals</p>
                          <h2 className="dashboard-title">Focus goal</h2>
                        </div>
                      </div>

                      <div className="goal-card">
                        <div className="goal-top">
                          <div>
                            <p className="goal-value">
                              {focusGoalCompleted} of {focusGoalTarget}
                            </p>
                            <p className="goal-label">sessions completed today</p>
                          </div>

                          <span className="history-duration">{goalPercent}%</span>
                        </div>

                        <div className="goal-progress-bar">
                          <div
                            className="goal-progress-fill"
                            style={{ width: `${goalPercent}%` }}
                          />
                        </div>

                        <button
                          type="button"
                          className="secondary-button full-width-button"
                          onClick={handleMarkGoalProgress}
                          disabled={focusGoalCompleted >= focusGoalTarget}
                        >
                          Mark one as done
                        </button>
                      </div>
                    </motion.article>

                    <motion.article
                      className="dashboard-card"
                      whileHover={{ y: -2 }}
                    >
                      <div className="section-head compact">
                        <div>
                          <p className="section-kicker">People in room</p>
                          <h2 className="dashboard-title">Studying now</h2>
                        </div>
                      </div>

                      <div className="people-list">
                        {(roomParticipants[currentRoom.name] || []).map((person) => (
                          <div key={person} className="person-row">
                            <div className="person-avatar">
                              {person.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="person-name">{person}</p>
                              <p className="person-status">Focused in this room</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.article>
                  </aside>
                </div>
              </div>
            </motion.section>
          )}

          {activePage === "rooms" && (
            <motion.section key="rooms" className="page-section" {...pageMotion}>
              <article className="dashboard-card featured-room-card">
                <div className="featured-room-content">
                  <div>
                    <p className="section-kicker">Recommended for you</p>
                    <h2 className="dashboard-title">{recommendedRoom.name}</h2>
                    <p className="dashboard-subtext">
                      Best match based on your quiet study style, love of lo-fi,
                      and consistent evening session habits.
                    </p>

                    <div className="tag-row">
                      {recommendedRoom.tags.map((tag) => (
                        <span key={tag} className="soft-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      setSelectedRoom(recommendedRoom.name);
                      setActivePage("focus");
                    }}
                  >
                    Use this room
                  </button>
                </div>
              </article>

              <article className="dashboard-card rooms-card">
                <div className="section-heading-row">
                  <div>
                    <p className="section-kicker">Music-based rooms</p>
                    <h2 className="dashboard-title">Choose a study room</h2>
                    <p className="dashboard-subtext">
                      Pick the vibe that helps you focus, then start your session
                      inside that room.
                    </p>
                  </div>
                </div>

                <div className="room-grid">
                  {studyRooms.map((room) => (
                    <motion.button
                      key={room.name}
                      type="button"
                      className={`room-card ${
                        selectedRoom === room.name ? "selected" : ""
                      }`}
                      onClick={() => setSelectedRoom(room.name)}
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.995 }}
                    >
                      <div className="room-card-top">
                        <span className="room-icon">{room.icon}</span>
                        <span className="room-people">{room.people} studying</span>
                      </div>

                      <h3 className="room-name">{room.name}</h3>
                      <p className="room-genre">{room.genre}</p>
                      <p className="room-description">{room.description}</p>

                      <div className="room-meta-grid">
                        <div>
                          <span className="room-meta-label">Energy</span>
                          <strong>{room.energy}</strong>
                        </div>
                        <div>
                          <span className="room-meta-label">Best for</span>
                          <strong>{room.bestFor}</strong>
                        </div>
                      </div>

                      <div className="tag-row">
                        {room.tags.map((tag) => (
                          <span key={tag} className="soft-tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </article>
            </motion.section>
          )}

          {activePage === "social" && (
            <motion.section key="social" className="page-section" {...pageMotion}>
              <article className="dashboard-card">
                <div className="section-heading-row">
                  <div>
                    <p className="section-kicker">Smart matching</p>
                    <h2 className="dashboard-title">Compatibility suggestions</h2>
                    <p className="dashboard-subtext">
                      Mock matching based on focus habits, music preference, and
                      study style.
                    </p>
                  </div>
                </div>

                <div className="group-list">
                  {suggestedGroups.map((group) => (
                    <motion.div
                      key={group.name}
                      className="group-card"
                      whileHover={{ y: -2 }}
                    >
                      <div className="group-card-top">
                        <div>
                          <h3 className="group-name">{group.name}</h3>
                          <p className="group-reason">{group.reason}</p>
                        </div>

                        <div className="match-badge">{group.match} match</div>
                      </div>

                      <div className="social-actions">
                        <button type="button" className="join-button">
                          Join group
                        </button>

                        <button
                          type="button"
                          className="tertiary-button"
                          onClick={() => handleOpenInvite(group.name)}
                        >
                          Invite to next session
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </article>

              <article className="dashboard-card">
                <div className="section-heading-row">
                  <div>
                    <p className="section-kicker">Study buddies</p>
                    <h2 className="dashboard-title">People you may work well with</h2>
                    <p className="dashboard-subtext">
                      Productive connections without making the app feel like social
                      media.
                    </p>
                  </div>
                </div>

                <div className="buddy-grid">
                  {studyBuddies.map((buddy) => (
                    <motion.div
                      key={buddy.handle}
                      className="buddy-card"
                      whileHover={{ y: -2 }}
                    >
                      <div className="buddy-top">
                        <div className="buddy-avatar">{buddy.avatar}</div>

                        <div>
                          <h3 className="buddy-name">{buddy.name}</h3>
                          <p className="buddy-handle">{buddy.handle}</p>
                        </div>
                      </div>

                      <div className="buddy-badge">{buddy.compatibility} compatible</div>

                      <p className="buddy-note">{buddy.note}</p>
                      <p className="buddy-status">{buddy.status}</p>

                      <div className="social-actions">
                        <button type="button" className="join-button">
                          Add study buddy
                        </button>
                        <button
                          type="button"
                          className="tertiary-button"
                          onClick={() => handleOpenInvite(buddy.name)}
                        >
                          Send invite
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </article>
            </motion.section>
          )}

          {activePage === "profile" && (
            <motion.section key="profile" className="page-section" {...pageMotion}>
              <div className="dashboard-grid single-column">
                <article className="dashboard-card profile-card">
                  <div className="profile-top">
                    <div className="profile-avatar">{userProfile.avatar}</div>

                    <div>
                      <p className="section-kicker">Personalization</p>
                      <h2 className="dashboard-title">Your profile</h2>
                      <p className="profile-name">{userProfile.name}</p>
                      <p className="profile-username">{userProfile.username}</p>
                    </div>
                  </div>

                  <div className="profile-form-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setIsProfileEditing((prev) => !prev)}
                    >
                      {isProfileEditing ? "Done editing" : "Edit profile"}
                    </button>
                  </div>

                  {isProfileEditing ? (
                    <div className="profile-form-grid">
                      <label className="field-group">
                        <span className="field-label">Display name</span>
                        <input
                          className="text-input"
                          value={userProfile.name}
                          onChange={(e) => handleProfileInput("name", e.target.value)}
                        />
                      </label>

                      <label className="field-group">
                        <span className="field-label">Username</span>
                        <input
                          className="text-input"
                          value={userProfile.username}
                          onChange={(e) =>
                            handleProfileInput("username", e.target.value)
                          }
                        />
                      </label>

                      <label className="field-group">
                        <span className="field-label">Avatar emoji</span>
                        <input
                          className="text-input"
                          value={userProfile.avatar}
                          onChange={(e) => handleProfileInput("avatar", e.target.value)}
                        />
                      </label>

                      <label className="field-group">
                        <span className="field-label">Favorite genre</span>
                        <input
                          className="text-input"
                          value={userProfile.favoriteGenre}
                          onChange={(e) =>
                            handleProfileInput("favoriteGenre", e.target.value)
                          }
                        />
                      </label>

                      <label className="field-group">
                        <span className="field-label">Study style</span>
                        <input
                          className="text-input"
                          value={userProfile.studyStyle}
                          onChange={(e) =>
                            handleProfileInput("studyStyle", e.target.value)
                          }
                        />
                      </label>

                      <label className="field-group">
                        <span className="field-label">Best focus window</span>
                        <input
                          className="text-input"
                          value={userProfile.bestFocusWindow}
                          onChange={(e) =>
                            handleProfileInput("bestFocusWindow", e.target.value)
                          }
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="profile-stats">
                      <div className="stat-pill">
                        <span className="stat-label">Favorite genre</span>
                        <strong>{userProfile.favoriteGenre}</strong>
                      </div>

                      <div className="stat-pill">
                        <span className="stat-label">Study style</span>
                        <strong>{userProfile.studyStyle}</strong>
                      </div>

                      <div className="stat-pill">
                        <span className="stat-label">Focus streak</span>
                        <strong>{userProfile.streak} days</strong>
                      </div>

                      <div className="stat-pill">
                        <span className="stat-label">Sessions</span>
                        <strong>{userProfile.sessionsCompleted}</strong>
                      </div>
                    </div>
                  )}
                </article>

                <article className="dashboard-card">
                  <p className="section-kicker">Privacy controls</p>
                  <h2 className="dashboard-title">Visibility mode</h2>
                  <p className="dashboard-subtext">
                    Choose how you appear when entering study rooms.
                  </p>

                  <div className="visibility-options">
                    {["public", "anonymous", "private"].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        className={`visibility-chip ${
                          visibilityMode === mode ? "active" : ""
                        }`}
                        onClick={() => setVisibilityMode(mode)}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </button>
                    ))}
                  </div>

                  <div className="visibility-preview-card">
                    <p className="visibility-preview-label">How you’ll appear</p>

                    {visibilityMode === "public" && (
                      <div className="visibility-preview-row">
                        <div className="preview-avatar">{userProfile.avatar}</div>
                        <div>
                          <strong>{userProfile.name}</strong>
                          <p className="visibility-description">
                            Your name and profile are visible in the room.
                          </p>
                        </div>
                      </div>
                    )}

                    {visibilityMode === "anonymous" && (
                      <div className="visibility-preview-row">
                        <div className="preview-avatar">🦉</div>
                        <div>
                          <strong>{anonymousIdentity}</strong>
                          <p className="visibility-description">
                            You appear anonymously while still participating in study
                            rooms.
                          </p>
                        </div>
                      </div>
                    )}

                    {visibilityMode === "private" && (
                      <div className="visibility-preview-row">
                        <div className="preview-avatar">🔒</div>
                        <div>
                          <strong>Private mode</strong>
                          <p className="visibility-description">
                            You can use the app quietly without showing up publicly in
                            room browsing.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </article>

                <article className="dashboard-card">
                  <p className="section-kicker">Achievements</p>
                  <h2 className="dashboard-title">Focus badges</h2>
                  <p className="dashboard-subtext">
                    A clean reward system that makes consistency feel meaningful
                    without turning the app into social media.
                  </p>

                  <div className="achievement-grid">
                    {achievements.map((achievement) => (
                      <div
                        key={achievement.title}
                        className={`achievement-card ${
                          achievement.earned ? "earned" : "locked"
                        }`}
                      >
                        <div className="achievement-icon">{achievement.icon}</div>
                        <div>
                          <h3 className="achievement-title">{achievement.title}</h3>
                          <p className="achievement-description">
                            {achievement.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="dashboard-card">
                  <p className="section-kicker">Saved experience</p>
                  <h2 className="dashboard-title">Persistence</h2>
                  <p className="dashboard-subtext">
                    Your selected room, timer, profile info, and view preferences
                    are saved in localStorage so the app feels more realistic.
                  </p>
                </article>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

              <SessionInviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        buddyName={inviteTarget}
        selectedRoom={selectedRoom}
        hours={hours}
        minutes={minutes}
        seconds={seconds}
      />

    </section>
  </main>
);
}

export default App;
