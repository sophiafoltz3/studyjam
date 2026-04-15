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
      n