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

const INACTIVITY_LIMIT_MS = 45000;

/*
  Reusable time wheel picker.
*/
function TimeWheel({ label, max, value, onChange, variant = "focus" }) {
  const wheelRef = useRef(null);
  const values = Array.from({ length: max + 1 }, (_, i) => i);
  const itemHeight = variant === "simple" ? 30 : 40;
  const visibleRows = 3;
  const spacerHeight = ((visibleRows - 1) / 2) * itemHeight;
  const shellHeight = visibleRows * itemHeight;

  useEffect(() => {
    if (!wheelRef.current) return;

    wheelRef.current.scrollTo({
      top: value * itemHeight,
      behavior: "auto",
    });
  }, [value, itemHeight]);

  const handleScroll = () => {
    if (!wheelRef.current) return;

    const scrollTop = wheelRef.current.scrollTop;
    const nextValue = Math.round(scrollTop / itemHeight);
    const clampedValue = Math.max(0, Math.min(max, nextValue));

    if (clampedValue !== value) {
      onChange(clampedValue);
    }
  };

  return (
    <div className={`wheel-group wheel-group-${variant}`}>
      <p className="wheel-heading">{label}</p>

      <div
        className={`wheel-shell wheel-shell-${variant}`}
        style={{
          "--wheel-row-height": `${itemHeight}px`,
          "--wheel-shell-height": `${shellHeight}px`,
        }}
      >
        <div
          ref={wheelRef}
          className={`wheel wheel-${variant}`}
          onScroll={handleScroll}
          aria-label={`${label} picker`}
          tabIndex="0"
        >
          <div style={{ height: spacerHeight }} />

          {values.map((number) => (
            <div
              key={number}
              className={`wheel-item wheel-item-${variant} ${
                number === value ? "selected" : ""
              }`}
            >
              {String(number).padStart(2, "0")}
            </div>
          ))}

          <div style={{ height: spacerHeight }} />
        </div>

        <div className={`wheel-highlight wheel-highlight-${variant}`} aria-hidden="true" />
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

function RoomSetupModal({
  isOpen,
  onClose,
  room,
  setupHours,
  setupMinutes,
  onSetupHours,
  onSetupMinutes,
  sessionMode,
  onSessionMode,
  inviteAccess,
  onInviteAccess,
  onStart,
}) {
  if (!isOpen || !room) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="modal-card room-setup-modal"
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.22 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="room-setup-title"
        >
          <p className="section-kicker">Room setup</p>
          <h2 id="room-setup-title" className="dashboard-title">
            Join {room.name}
          </h2>
          <p className="dashboard-subtext">
            Choose how long you want to be productive before entering the room.
          </p>

          <div className="setup-room-summary">
            <div className="active-room-icon">{room.icon}</div>
            <div>
              <h3 className="active-room-name">{room.name}</h3>
              <p className="active-room-meta">
                {room.genre} • {room.people} studying • {room.energy}
              </p>
            </div>
          </div>

          <div className="time-picker setup-time-picker">
            <TimeWheel
              label="Hours"
              max={12}
              value={setupHours}
              onChange={onSetupHours}
              variant="simple"
            />
            <TimeWheel
              label="Minutes"
              max={59}
              value={setupMinutes}
              onChange={onSetupMinutes}
              variant="simple"
            />
          </div>

          <div className="setup-switch-block">
            <div className="section-head compact">
              <div>
                <p className="section-kicker">Visibility</p>
                <h2 className="dashboard-title">Private or with room</h2>
              </div>
            </div>

            <div className="mode-switch" role="radiogroup" aria-label="Session mode">
              <button
                type="button"
                className={`mode-switch-button ${
                  sessionMode === "private" ? "active" : ""
                }`}
                onClick={() => onSessionMode("private")}
              >
                Private first
              </button>

              <button
                type="button"
                className={`mode-switch-button ${
                  sessionMode === "room" ? "active" : ""
                }`}
                onClick={() => onSessionMode("room")}
              >
                Join room
              </button>
            </div>

            <p className="setup-switch-copy">
              {sessionMode === "private"
                ? "Study solo first, then invite people later."
                : "Enter with the room community right away."}
            </p>
          </div>

          <label className="invite-toggle">
            <input
              type="checkbox"
              checked={inviteAccess}
              onChange={(event) => onInviteAccess(event.target.checked)}
            />
            <span>
              <strong>Allow invite link</strong>
              <small>Let buddies join after you start focusing.</small>
            </span>
          </label>

          <div className="social-actions modal-actions">
            <button type="button" className="primary-button" onClick={onStart}>
              Start in this room
            </button>
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
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
  const [sessionMode, setSessionMode] = useState("room");
  const [inviteAccess, setInviteAccess] = useState(false);
  const [themeMode, setThemeMode] = useState("light");
  const [savedTracks, setSavedTracks] = useState([]);
  const [isRoomSetupOpen, setIsRoomSetupOpen] = useState(false);
  const [roomSetupName, setRoomSetupName] = useState("Lo-fi Lounge");
  const [customRooms, setCustomRooms] = useState([]);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: "",
    genre: "Custom Mix",
  });
  const [queuedSongsByRoom, setQueuedSongsByRoom] = useState({});
  const [queueSong, setQueueSong] = useState({ title: "", artist: "" });
  const [dailyChecklist, setDailyChecklist] = useState([
    { id: 1, text: "Finish biology notes", done: true },
    { id: 2, text: "Review chemistry quizlet", done: false },
  ]);
  const [goalInput, setGoalInput] = useState("");
  const [isStudyViewOpen, setIsStudyViewOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [breakRemindersEnabled, setBreakRemindersEnabled] = useState(true);
  const [focusGoalCompleted, setFocusGoalCompleted] = useState(2);
  const [focusGoalTarget] = useState(3);
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteTarget, setInviteTarget] = useState("Sophia Foltz");

  /*
    ---------------------------------------
    PROFILE STATE
    ---------------------------------------
  */
  const [userProfile, setUserProfile] = useState({
    name: "Name",
    username: "@studyjamuser",
    avatarMode: "emoji",
    avatar: "🎀",
    // For the prototype, uploaded photos are stored as a browser data URL.
    photoUrl: "",
    favoriteGenre: "Lo-fi",
    studyStyle: "Quiet focus sessions",
    streak: 12,
    sessionsCompleted: 48,
    weeklyHours: 9.5,
    favoriteRoom: "Lo-fi Lounge",
    bestFocusWindow: "7 PM - 10 PM",
  });
  const avatarFileInputRef = useRef(null);

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

  const allStudyRooms = [...studyRooms, ...customRooms];

  const roomSongQueues = {
    "Classical Corner": [
      { title: "Moonlit Strings", artist: "Aster Ensemble", addedBy: "Room host" },
      { title: "Library Light", artist: "Camille Rowan", addedBy: "Quiet Iris" },
      { title: "Page Turn", artist: "Viola House", addedBy: "Calm Coder" },
    ],
    "Lo-fi Lounge": [
      { title: "Lavender Notes", artist: "Quiet Canvas", addedBy: "Room host" },
      { title: "Window Seat", artist: "Mellow Desk", addedBy: "Luna Notes" },
      { title: "Study Glow", artist: "Soft Signal", addedBy: "Focus Fox" },
    ],
    "Podcast Pod": [
      { title: "Focus Talks Daily", artist: "StudyCast", addedBy: "Room host" },
      { title: "How Memory Works", artist: "Brain Break", addedBy: "Audio Ace" },
      { title: "The 20 Minute Reset", artist: "Desk Notes", addedBy: "Study Bloom" },
    ],
    "Rock Room": [
      { title: "Momentum Drive", artist: "Static Youth", addedBy: "Room host" },
      { title: "Deadline Sprint", artist: "The Signals", addedBy: "Nova" },
      { title: "Final Draft", artist: "Bright Voltage", addedBy: "Max" },
    ],
    "Ambient Space": [
      { title: "Cloud Drift", artist: "Velvet Sky", addedBy: "Room host" },
      { title: "Low Orbit", artist: "Blue Horizon", addedBy: "Soft Orbit" },
      { title: "Still Weather", artist: "North Window", addedBy: "Moonlight Mind" },
    ],
    "Silent Session": [
      { title: "Silence mode", artist: "No playback", addedBy: "Room host" },
    ],
    "Deep Focus Studio": [
      { title: "Neural Flow", artist: "Logic Bloom", addedBy: "Room host" },
      { title: "Clean Syntax", artist: "Midnight Build", addedBy: "Code Raven" },
      { title: "Single Task", artist: "Focus Method", addedBy: "Zen Logic" },
    ],
  };

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
      name: "Sophia Foltz",
      handle: "@sophialocksin",
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
      setSessionMode(parsed.sessionMode ?? "room");
      setInviteAccess(parsed.inviteAccess ?? false);
      setThemeMode(parsed.themeMode ?? "light");
      setNotificationsEnabled(parsed.notificationsEnabled ?? true);
      setBreakRemindersEnabled(parsed.breakRemindersEnabled ?? true);
      setSavedTracks(parsed.savedTracks ?? []);
      setCustomRooms(parsed.customRooms ?? []);
      setQueuedSongsByRoom(parsed.queuedSongsByRoom ?? {});
      setDailyChecklist(
        parsed.dailyChecklist ?? [
          { id: 1, text: "Finish biology notes", done: true },
          { id: 2, text: "Review chemistry quizlet", done: false },
        ]
      );
      setTimerView(parsed.timerView ?? "minimal");
      setFocusGoalCompleted(parsed.focusGoalCompleted ?? 2);
    }

    if (savedTimer) {
      const parsedTimer = JSON.parse(savedTimer);
      setHours(parsedTimer.hours ?? 0);
      setMinutes(parsedTimer.minutes ?? 25);
      setSeconds(0);
    }
  }, []);

  /*
    ---------------------------------------
    SAVE DATA
    ---------------------------------------
  */
  useEffect(() => {
    // Split storage into profile/settings/timer so each part is easier to reason about.
    localStorage.setItem("studyjam-profile", JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem(
      "studyjam-settings",
      JSON.stringify({
        selectedRoom,
        visibilityMode,
        sessionMode,
        inviteAccess,
        themeMode,
        notificationsEnabled,
        breakRemindersEnabled,
        savedTracks,
        customRooms,
        queuedSongsByRoom,
        dailyChecklist,
        timerView,
        focusGoalCompleted,
      })
    );
  }, [
    selectedRoom,
    visibilityMode,
    sessionMode,
    inviteAccess,
    themeMode,
    notificationsEnabled,
    breakRemindersEnabled,
    savedTracks,
    customRooms,
    queuedSongsByRoom,
    dailyChecklist,
    timerView,
    focusGoalCompleted,
  ]);

  useEffect(() => {
    localStorage.setItem(
      "studyjam-timer",
      JSON.stringify({
        hours,
        minutes,
      })
    );
  }, [hours, minutes]);

  /*
    Convert selected time into total seconds.
  */
  const selectedTotalSeconds = useMemo(() => {
    return hours * 3600 + minutes * 60;
  }, [hours, minutes]);

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

  const focusWedgeDegrees = `${(1 - progress) * 360}deg`;

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
    allStudyRooms.find((room) => room.name === selectedRoom) || allStudyRooms[0];
  const roomSetupRoom =
    allStudyRooms.find((room) => room.name === roomSetupName) || currentRoom;

  const recommendedRoom = allStudyRooms.find((room) => room.name === "Lo-fi Lounge");
  const anonymousIdentity = anonymousNames[2];
  const roomQueue = [
    ...(roomSongQueues[currentRoom.name] || [
      {
        title: currentRoom.track,
        artist: currentRoom.artist,
        addedBy: "Room host",
      },
    ]),
    ...(queuedSongsByRoom[currentRoom.name] || []),
  ];
  const nowPlaying = roomQueue[0];
  const currentTrackKey = `${nowPlaying.title}-${nowPlaying.artist}`;
  const isTrackSaved = savedTracks.includes(currentTrackKey);
  const visibleRoomPeople = sessionMode === "private" ? 1 : currentRoom.people;
  const currentParticipantList =
    roomParticipants[currentRoom.name] || ["Focus Friend", "Quiet Coder"];

  const goalPercent = Math.min(
    100,
    Math.round((focusGoalCompleted / focusGoalTarget) * 100)
  );

  const handleOpenInvite = (name) => {
    setInviteTarget(name);
    setIsInviteModalOpen(true);
  };

  const handleSaveTrack = () => {
    if (selectedRoom === "Silent Session" || isTrackSaved) return;

    setSavedTracks((prev) => [...prev, currentTrackKey]);
  };

  const handleOpenRoomSetup = (roomName) => {
    // This opens the room "join flow" before a session starts.
    setRoomSetupName(roomName);
    setSelectedRoom(roomName);
    setIsRoomSetupOpen(true);
  };

  const handleStartRoomSession = () => {
    const totalSeconds = hours * 3600 + minutes * 60;
    if (totalSeconds <= 0) return;

    // Starting from the room modal should immediately drop the user into the live focus view.
    setSelectedRoom(roomSetupName);
    setSessionDuration(totalSeconds);
    setTimeLeft(totalSeconds);
    setHasStarted(true);
    setIsRunning(true);
    setSessionState("focused");
    setDistractionMessage("");
    setMusicPlaying(roomSetupName !== "Silent Session");
    setLastActiveAt(Date.now());
    setIsRoomSetupOpen(false);
    setActivePage("focus");
  };

  const handleCreateRoom = () => {
    const roomName = newRoom.name.trim();
    if (!roomName) return;

    // Custom rooms are front-end only for now, but shaped like real room data.
    const createdRoom = {
      name: roomName,
      genre: newRoom.genre.trim() || "Custom Mix",
      icon: "🎛️",
      description: "A custom study session built around your preferred focus vibe.",
      people: 1,
      energy: "Custom",
      bestFor: "Personal goals",
      tags: ["Custom", "Invite-ready", "Personal"],
      track: "Open Queue",
      artist: "StudyJam",
    };

    setCustomRooms((prev) => [...prev, createdRoom]);
    setQueuedSongsByRoom((prev) => ({
      ...prev,
      [createdRoom.name]: [
        { title: "Open Queue", artist: "StudyJam", addedBy: "Room host" },
      ],
    }));
    setNewRoom({ name: "", genre: "Custom Mix" });
    setIsCreatingRoom(false);
    handleOpenRoomSetup(createdRoom.name);
  };

  const handleAddQueueSong = () => {
    const title = queueSong.title.trim();
    const artist = queueSong.artist.trim();
    if (!title || !artist) return;

    // Queue songs are stored by room name so each room can feel like it has its own jam.
    setQueuedSongsByRoom((prev) => ({
      ...prev,
      [currentRoom.name]: [
        ...(prev[currentRoom.name] || []),
        { title, artist, addedBy: userProfile.name || "You" },
      ],
    }));
    setQueueSong({ title: "", artist: "" });
  };

  const handleAddGoal = () => {
    const text = goalInput.trim();
    if (!text) return;

    setDailyChecklist((prev) => [
      ...prev,
      { id: Date.now(), text, done: false },
    ]);
    setGoalInput("");
  };

  const handleToggleGoal = (id) => {
    setDailyChecklist((prev) =>
      prev.map((goal) =>
        goal.id === id ? { ...goal, done: !goal.done } : goal
      )
    );
  };

  const renderProfileAvatar = (className) => {
    if (userProfile.avatarMode === "photo" && userProfile.photoUrl) {
      return (
        <img
          className={`${className} avatar-photo`}
          src={userProfile.photoUrl}
          alt={userProfile.name}
        />
      );
    }

    return <div className={className}>{userProfile.avatar}</div>;
  };

  const renderEditableProfileAvatar = () => {
    // The avatar itself is the control, so editing feels more app-like than form-like.
    const avatarContent =
      userProfile.avatarMode === "photo" && userProfile.photoUrl ? (
        <img
          className="profile-avatar avatar-photo"
          src={userProfile.photoUrl}
          alt={userProfile.name}
        />
      ) : (
        <div className="profile-avatar">{userProfile.avatar}</div>
      );

    return (
      <div className="avatar-editor">
        <button
          type="button"
          className="avatar-trigger"
          onClick={() => setIsAvatarPickerOpen((prev) => !prev)}
          aria-expanded={isAvatarPickerOpen}
        >
          {avatarContent}
          <span className="avatar-edit-badge">Edit</span>
        </button>

        {isAvatarPickerOpen && (
          <div className="avatar-popover">
            <p className="mini-stat-label">Profile picture</p>

            <div className="avatar-mode-row">
              {["emoji", "photo"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`visibility-chip ${
                    userProfile.avatarMode === mode ? "active" : ""
                  }`}
                  onClick={() => handleProfileInput("avatarMode", mode)}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>

            {userProfile.avatarMode === "photo" ? (
              <div className="field-group">
                <span className="field-label">Choose photo</span>
                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden-file-input"
                  onChange={handleAvatarFileChange}
                />
                <button
                  type="button"
                  className="secondary-button full-width-button"
                  onClick={() => avatarFileInputRef.current?.click()}
                >
                  Choose from photos
                </button>
              </div>
            ) : (
              <label className="field-group">
                <span className="field-label">Avatar emoji</span>
                <input
                  className="text-input"
                  value={userProfile.avatar}
                  onChange={(e) => handleProfileInput("avatar", e.target.value)}
                />
              </label>
            )}
          </div>
        )}
      </div>
    );
  };

  const handleProfileInput = (field, value) => {
    setUserProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAvatarFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // FileReader lets us preview a chosen image in the browser without a backend upload.
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setUserProfile((prev) => ({
        ...prev,
        avatarMode: "photo",
        photoUrl: result,
      }));
    };
    reader.readAsDataURL(file);
    event.target.value = "";
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

  let primaryAction = {
    label: hasStarted ? "Resume session" : "Start session",
    onClick: handleStart,
    disabled: isRunning && sessionState === "focused" && timeLeft > 0,
  };

  let secondaryAction = null;
  let tertiaryAction = null;

  if (!hasStarted) {
    secondaryAction = null;
    tertiaryAction = null;
  } else if (sessionState === "break" || sessionState === "distracted") {
    primaryAction = {
      label: "Back to focus",
      onClick: handleResumeFocus,
      disabled: timeLeft <= 0,
    };
    secondaryAction = {
      label: "End session",
      onClick: handleReset,
      disabled: false,
    };
  } else if (isRunning) {
    primaryAction = {
      label: "Pause",
      onClick: handlePause,
      disabled: timeLeft <= 0,
    };
    secondaryAction = {
      label: "Take break",
      onClick: handleTakeBreak,
      disabled: timeLeft <= 0,
    };
    tertiaryAction = {
      label: "End session",
      onClick: handleReset,
      disabled: false,
    };
  } else {
    primaryAction = {
      label: "Resume session",
      onClick: handleStart,
      disabled: timeLeft <= 0,
    };
    secondaryAction = {
      label: "End session",
      onClick: handleReset,
      disabled: false,
    };
  }

  return (
    <main className="app" data-theme={themeMode}>
      <section className="app-shell" aria-labelledby="studyjam-title">
        <p className="eyebrow">Collaborative focus app</p>

        <h1 id="studyjam-title" className="title">
          <span className="title-icon">🎧</span>
          <span>StudyJam</span>
        </h1>

        <p className="subtitle">
          Lock in, stay focused, and study together.
        </p>

        <div className="topbar-actions">
          <div className="settings-menu">
            <button
              type="button"
              className="settings-trigger"
              onClick={() => setIsSettingsOpen((prev) => !prev)}
              aria-expanded={isSettingsOpen}
              aria-haspopup="true"
            >
              <span className="settings-icon">⚙</span>
              <span>Settings</span>
            </button>

            {isSettingsOpen && (
              <div className="settings-popover">
                <p className="mini-stat-label">App appearance</p>
                <div className="theme-toggle" role="tablist" aria-label="Theme mode">
                  <button
                    type="button"
                    className={`theme-button ${themeMode === "light" ? "active" : ""}`}
                    onClick={() => setThemeMode("light")}
                  >
                    Light
                  </button>
                  <button
                    type="button"
                    className={`theme-button ${themeMode === "dark" ? "active" : ""}`}
                    onClick={() => setThemeMode("dark")}
                  >
                    Dark
                  </button>
                </div>

                <div className="settings-section">
                  <p className="mini-stat-label">Notifications</p>

                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={notificationsEnabled}
                      onChange={() =>
                        setNotificationsEnabled((prev) => !prev)
                      }
                    />
                    <span>
                      <strong>Notifications</strong>
                      <small>Allow StudyJam reminders and focus nudges.</small>
                    </span>
                  </label>

                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={breakRemindersEnabled}
                      onChange={() =>
                        setBreakRemindersEnabled((prev) => !prev)
                      }
                      disabled={!notificationsEnabled}
                    />
                    <span>
                      <strong>Reminder notifications</strong>
                      <small>Get a gentle reminder when it is time to return to focus.</small>
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

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
                          variant="focus"
                        />

                        <TimeWheel
                          label="Minutes"
                          max={59}
                          value={minutes}
                          onChange={setMinutes}
                          variant="focus"
                        />
                      </div>

                      <div className="session-mode-panel">
                        <div className="section-head compact">
                          <div>
                            <p className="section-kicker">Study mode</p>
                            <h2 className="dashboard-title">Choose how you focus</h2>
                          </div>
                        </div>

                        <div className="mode-card-grid" role="radiogroup" aria-label="Session mode">
                          <button
                            type="button"
                            className={`mode-card ${sessionMode === "private" ? "active" : ""}`}
                            onClick={() => {
                              setSessionMode("private");
                              setVisibilityMode("private");
                            }}
                          >
                            <span className="mode-icon">🔒</span>
                            <span>
                              <strong>Private session</strong>
                              <small>Study alone first, then open an invite if you want company.</small>
                            </span>
                          </button>

                          <button
                            type="button"
                            className={`mode-card ${sessionMode === "room" ? "active" : ""}`}
                            onClick={() => setSessionMode("room")}
                          >
                            <span className="mode-icon">🎧</span>
                            <span>
                              <strong>Room session</strong>
                              <small>Join the selected music room with other focused students.</small>
                            </span>
                          </button>
                        </div>

                        <label className="invite-toggle">
                          <input
                            type="checkbox"
                            checked={inviteAccess}
                            onChange={(event) => setInviteAccess(event.target.checked)}
                          />
                          <span>
                            <strong>Allow invite link after session starts</strong>
                            <small>
                              Keep the session private now, but let study buddies join later.
                            </small>
                          </span>
                        </label>
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
                        <div
                          className="timer-ring-shell"
                          style={{ "--focus-wedge-degrees": focusWedgeDegrees }}
                        >
                          <div className="progress-timer-disc" aria-hidden="true" />

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
                    <p className="focus-lock-note">
                      {/* Browsers cannot truly lock a phone, so this is a product prototype version. */}
                      Focus lock prototype: if you leave the app during a session,
                      StudyJam marks you distracted and pauses the room.
                    </p>

                    <div className="button-row">
                      <button
                        className="primary-button"
                        onClick={primaryAction.onClick}
                        disabled={primaryAction.disabled}
                      >
                        {primaryAction.label}
                      </button>

                      {secondaryAction && (
                        <button
                          className="secondary-button"
                          onClick={secondaryAction.onClick}
                          disabled={secondaryAction.disabled}
                        >
                          {secondaryAction.label}
                        </button>
                      )}

                      {tertiaryAction && (
                        <button
                          className="tertiary-button"
                          onClick={tertiaryAction.onClick}
                          disabled={tertiaryAction.disabled}
                        >
                          {tertiaryAction.label}
                        </button>
                      )}
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
                              {currentRoom.genre} •{" "}
                              {sessionMode === "private"
                                ? "Private study"
                                : `${visibleRoomPeople} studying`}
                            </p>
                          </div>
                        </div>

                        {sessionMode !== "private" && (
                          <button
                            type="button"
                            className="participant-trigger"
                            onClick={() => setIsStudyViewOpen(true)}
                          >
                            {visibleRoomPeople} people are studying right now
                          </button>
                        )}

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
                            <strong>
                              {sessionMode === "private" ? "Private" : roomStatusLabel}
                            </strong>
                          </div>

                          <div className="mini-stat-card">
                            <span className="mini-stat-label">Invites</span>
                            <strong>
                              {inviteAccess ? "Allowed" : "Closed"}
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
                            <h3 className="active-room-name">{nowPlaying.title}</h3>
                            <p className="active-room-meta">
                              {nowPlaying.artist} • added by {nowPlaying.addedBy}
                            </p>
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

                        <div className="music-link-panel">
                          <div>
                            <p className="mini-stat-label">Music connection</p>
                            <p className="music-connection-copy">
                              Your music app is already connected when you join StudyJam.
                            </p>
                          </div>

                          <button
                            type="button"
                            className="secondary-button full-width-button"
                            onClick={handleSaveTrack}
                            disabled={selectedRoom === "Silent Session" || isTrackSaved}
                          >
                            {isTrackSaved
                              ? "Added to your library"
                              : "Add song to my library"}
                          </button>
                        </div>

                        <div className="queue-panel">
                          <div className="section-head compact">
                            <div>
                              <p className="section-kicker">Room jam</p>
                              <h2 className="dashboard-title">Song queue</h2>
                            </div>
                          </div>

                          <div className="queue-list">
                            {roomQueue.slice(0, 4).map((song, index) => (
                              <div
                                key={`${song.title}-${song.artist}-${index}`}
                                className={`queue-row ${index === 0 ? "playing" : ""}`}
                              >
                                <div className="queue-index">
                                  {index === 0 ? "▶" : index + 1}
                                </div>
                                <div>
                                  <p className="queue-title">{song.title}</p>
                                  <p className="queue-meta">
                                    {song.artist} • {song.addedBy}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="queue-form">
                            <input
                              className="text-input"
                              value={queueSong.title}
                              placeholder="Song title"
                              onChange={(event) =>
                                setQueueSong((prev) => ({
                                  ...prev,
                                  title: event.target.value,
                                }))
                              }
                            />
                            <input
                              className="text-input"
                              value={queueSong.artist}
                              placeholder="Artist"
                              onChange={(event) =>
                                setQueueSong((prev) => ({
                                  ...prev,
                                  artist: event.target.value,
                                }))
                              }
                            />
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={handleAddQueueSong}
                            >
                              Add to jam
                            </button>
                          </div>
                        </div>

                        <p className="music-caption">
                          {selectedRoom === "Silent Session"
                            ? "This room uses no music playback."
                            : isTrackSaved
                            ? `${nowPlaying.title} is saved to your connected music library.`
                            : sessionState === "distracted"
                            ? "Music paused because focus was lost."
                            : sessionState === "break"
                            ? "Music paused while you’re on break."
                            : "Mock linked-player flow showing how users could save a room song without leaving StudyJam."}
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

                      {sessionMode === "private" ? (
                        <div className="private-session-card">
                          <div className="private-session-icon">🔒</div>
                          <div>
                            <h3 className="active-room-name">Private study room</h3>
                            <p className="active-room-description">
                              You are studying solo. Turn on invites when you want a
                              buddy to join this session.
                            </p>
                          </div>

                          <button
                            type="button"
                            className="primary-button full-width-button"
                            onClick={() => handleOpenInvite("Study buddy")}
                            disabled={!inviteAccess}
                          >
                            Send invite link
                          </button>
                        </div>
                      ) : (
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
                      )}
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
                      handleOpenRoomSetup(recommendedRoom.name);
                    }}
                  >
                    Set time and join
                  </button>
                </div>
              </article>

              <article className="dashboard-card create-room-card">
                <div className="section-heading-row">
                  <div>
                    <p className="section-kicker">Create your own</p>
                    <h2 className="dashboard-title">Start a custom study session</h2>
                    <p className="dashboard-subtext">
                      Build a private or invite-ready room for your own focus goal.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setIsCreatingRoom((prev) => !prev)}
                  >
                    {isCreatingRoom ? "Close creator" : "Create room"}
                  </button>
                </div>

                {isCreatingRoom && (
                  <div className="create-room-form">
                    <input
                      className="text-input"
                      value={newRoom.name}
                      placeholder="Room name"
                      onChange={(event) =>
                        setNewRoom((prev) => ({ ...prev, name: event.target.value }))
                      }
                    />
                    <input
                      className="text-input"
                      value={newRoom.genre}
                      placeholder="Music vibe"
                      onChange={(event) =>
                        setNewRoom((prev) => ({ ...prev, genre: event.target.value }))
                      }
                    />
                    <button
                      type="button"
                      className="primary-button"
                      onClick={handleCreateRoom}
                    >
                      Create and set time
                    </button>
                  </div>
                )}
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
                  {allStudyRooms.map((room) => (
                    <motion.button
                      key={room.name}
                      type="button"
                      className={`room-card ${
                        selectedRoom === room.name ? "selected" : ""
                      }`}
                      onClick={() => handleOpenRoomSetup(room.name)}
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
                      <p className="room-track">
                        Now playing: {room.track} by {room.artist}
                      </p>

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
                    <p className="section-kicker">Your people</p>
                    <h2 className="dashboard-title">All study buddies</h2>
                    <p className="dashboard-subtext">
                      A quick view of everyone in your focus circle.
                    </p>
                  </div>
                </div>

                <div className="buddy-strip">
                  {studyBuddies.map((buddy) => (
                    <div key={`strip-${buddy.handle}`} className="buddy-strip-card">
                      <div className="buddy-strip-avatar">{buddy.avatar}</div>
                      <div>
                        <p className="buddy-name">{buddy.name}</p>
                        <p className="buddy-status">{buddy.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

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
                    {isProfileEditing
                      ? renderEditableProfileAvatar()
                      : renderProfileAvatar("profile-avatar")}

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
                        {renderProfileAvatar("preview-avatar")}
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
                  <p className="section-kicker">Daily planning</p>
                  <h2 className="dashboard-title">Checklist</h2>
                  <p className="dashboard-subtext">
                    Add goals for the day and check them off while you study.
                  </p>

                  <div className="queue-form checklist-form">
                    <input
                      className="text-input"
                      value={goalInput}
                      placeholder="Add a goal for today"
                      onChange={(event) => setGoalInput(event.target.value)}
                    />
                    <button
                      type="button"
                      className="primary-button"
                      onClick={handleAddGoal}
                    >
                      Add goal
                    </button>
                  </div>

                  <div className="checklist">
                    {dailyChecklist.map((goal) => (
                      <button
                        key={goal.id}
                        type="button"
                        className={`checklist-item ${goal.done ? "done" : ""}`}
                        onClick={() => handleToggleGoal(goal.id)}
                      >
                        <span className="checkmark">{goal.done ? "✓" : ""}</span>
                        <span>{goal.text}</span>
                      </button>
                    ))}
                  </div>
                </article>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isStudyViewOpen && sessionMode !== "private" && (
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="modal-card study-view-modal"
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.22 }}
              >
                <div className="section-head compact">
                  <div>
                    <p className="section-kicker">Live room</p>
                    <h2 className="dashboard-title">{currentRoom.name} study view</h2>
                  </div>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setIsStudyViewOpen(false)}
                  >
                    Back to timer
                  </button>
                </div>

                <div className="study-grid">
                  {currentParticipantList.slice(0, 6).map((person) => (
                    <div key={person} className="study-tile">
                      <div className="study-tile-avatar">{person.charAt(0).toUpperCase()}</div>
                      <p className="study-tile-name">{person}</p>
                      <span className="study-live-pill">Studying</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <RoomSetupModal
          isOpen={isRoomSetupOpen}
          onClose={() => setIsRoomSetupOpen(false)}
          room={roomSetupRoom}
          setupHours={hours}
          setupMinutes={minutes}
          onSetupHours={setHours}
          onSetupMinutes={setMinutes}
          sessionMode={sessionMode}
          onSessionMode={(mode) => {
            setSessionMode(mode);
            if (mode === "private") {
              setVisibilityMode("private");
            }
          }}
          inviteAccess={inviteAccess}
          onInviteAccess={setInviteAccess}
          onStart={handleStartRoomSession}
        />

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
