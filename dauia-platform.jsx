import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
// CONSTELLATION BACKGROUND
// ═══════════════════════════════════════════════════════════════
function ConstellationBG({ intensity = 1 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const nodesRef = useRef([]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let cw, ch;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      cw = canvas.offsetWidth; ch = canvas.offsetHeight;
      canvas.width = cw * dpr; canvas.height = ch * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const N = Math.floor(28 * intensity);
    if (nodesRef.current.length === 0) {
      nodesRef.current = Array.from({ length: N }, () => ({
        x: Math.random() * canvas.offsetWidth, y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.5 + 0.5,
      }));
    }
    const nodes = nodesRef.current;
    const draw = () => {
      ctx.clearRect(0, 0, cw, ch);
      nodes.forEach(n => { n.x += n.vx; n.y += n.vy; if (n.x < 0 || n.x > cw) n.vx *= -1; if (n.y < 0 || n.y > ch) n.vy *= -1; });
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
        if (d < 150) { ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.strokeStyle = "rgba(99,130,255," + ((1 - d / 150) * 0.1) + ")"; ctx.lineWidth = 0.5; ctx.stroke(); }
      }
      nodes.forEach(n => { ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fillStyle = "rgba(140,160,255," + (0.3 + n.r * 0.15) + ")"; ctx.fill(); });
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", resize); };
  }, [intensity]);
  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

// ═══════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════
const I = {
  sun: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.2"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M12.95 3.05l-1.41 1.41M4.46 11.54l-1.41 1.41" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  moon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M13.5 8.5a5.5 5.5 0 01-6-6 5.5 5.5 0 106 6z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>,
  play: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M4 2.5V13.5L13 8L4 2.5Z" fill="currentColor"/></svg>,
  plus: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M5 3V2a1 1 0 011-1h4a1 1 0 011 1v1M2 4h12M4 4l.7 9.2a1.5 1.5 0 001.5 1.3h3.6a1.5 1.5 0 001.5-1.3L12 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  edit: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>,
  arrow: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  back: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M13 8H3M3 8L7 4M3 8L7 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  clock: <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/><path d="M8 4.5V8l2.5 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  user: <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.2"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.2"/></svg>,
  lock: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.2"/></svg>,
  eye: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.2"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2"/></svg>,
  eyeOff: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.2"/><path d="M2 14L14 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  grid: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.1"/><rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.1"/><rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.1"/><rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.1"/></svg>,
  home: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 8l6-5.5L14 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.5 9v4.5a1 1 0 001 1h7a1 1 0 001-1V9" stroke="currentColor" strokeWidth="1.3"/></svg>,
  terminal: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 12L6 8L2 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 12H14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  settings: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M13 3l-1.4 1.4M4.4 11.6L3 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  logout: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M6 8h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  save: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M12 14H4a1 1 0 01-1-1V3a1 1 0 011-1h6l3 3v8a1 1 0 01-1 1z" stroke="currentColor" strokeWidth="1.2"/><path d="M5 14v-4h6v4M5 2v3h4" stroke="currentColor" strokeWidth="1.2"/></svg>,
  x: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  image: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="5" cy="6" r="1.5" stroke="currentColor" strokeWidth="1"/><path d="M1.5 11l3.5-3 2.5 2 3-3.5 4 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>,
  book: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2.5A1.5 1.5 0 013.5 1H5c1.1 0 2 .4 3 1 1-.6 1.9-1 3-1h1.5A1.5 1.5 0 0114 2.5v9a1.5 1.5 0 01-1.5 1.5H11c-1 0-1.8.4-3 1.2C6.8 13.4 6 13 5 13H3.5A1.5 1.5 0 012 11.5v-9z" stroke="currentColor" strokeWidth="1.2"/><path d="M8 3v10.2" stroke="currentColor" strokeWidth="1.2"/></svg>,
  python: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 1h4a3 3 0 013 3v2H7a2 2 0 00-2 2v4H3a2 2 0 01-2-2V4a3 3 0 013-3z" stroke="currentColor" strokeWidth="1.1"/><path d="M10 15H6a3 3 0 01-3-3v-2h6a2 2 0 002-2V4h2a2 2 0 012 2v6a3 3 0 01-3 3z" stroke="currentColor" strokeWidth="1.1"/><circle cx="5.5" cy="3.5" r=".8" fill="currentColor"/><circle cx="10.5" cy="12.5" r=".8" fill="currentColor"/></svg>,
  brain: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 14V8M8 8C8 5 6 3 4.5 2.5S1 3 1 5s1.5 3 3 3.5M8 8c0-3 2-5 3.5-5.5S15 3 15 5s-1.5 3-3 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  bolt: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M9 1L3 9h4l-1 6 7-8H9l1-6z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>,
  chat: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 3a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H6l-3 2.5V11H4a2 2 0 01-2-2V3z" stroke="currentColor" strokeWidth="1.2"/></svg>,
  chart: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 14V8M6 14V5M10 14V8M14 14V2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  database: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><ellipse cx="8" cy="4" rx="5.5" ry="2.5" stroke="currentColor" strokeWidth="1.2"/><path d="M2.5 4v8c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V4" stroke="currentColor" strokeWidth="1.2"/><path d="M2.5 8c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5" stroke="currentColor" strokeWidth="1.2"/></svg>,
  flask: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 2v4L2 13a1 1 0 00.8 1.5h10.4a1 1 0 00.8-1.5L10 6V2" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><path d="M5 2h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  target: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="8" cy="8" r="1" fill="currentColor"/></svg>,
  rocket: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1c-2 3-3 6-3 9l3 2 3-2c0-3-1-6-3-9z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><path d="M5 10l-2 1.5L4 14l2.5-1M11 10l2 1.5L12 14l-2.5-1" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/></svg>,
  robot: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="5" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.2"/><circle cx="6" cy="9" r="1.2" stroke="currentColor" strokeWidth="1"/><circle cx="10" cy="9" r="1.2" stroke="currentColor" strokeWidth="1"/><path d="M8 2v3M6 2h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  compass: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/><path d="M10.5 5.5L9 9 5.5 10.5 7 7l3.5-1.5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/></svg>,
  inbox: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 10l2.5-7h7L14 10v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><path d="M2 10h3.5a1 1 0 011 1v.5a1 1 0 001 1h1a1 1 0 001-1V11a1 1 0 011-1H14" stroke="currentColor" strokeWidth="1.2"/></svg>,
  clipboard: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="2" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M6 2V1.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V2" stroke="currentColor" strokeWidth="1.2"/><path d="M6 6h4M6 9h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
  warn: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1L1 14h14L8 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><path d="M8 6v4M8 12v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
};

// ═══════════════════════════════════════════════════════════════
// ANIMATED COUNTER
// ═══════════════════════════════════════════════════════════════
function AnimCounter({ end, suffix = "" }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const t0 = performance.now();
        const tick = (now) => { const p = Math.min((now - t0) / 1400, 1); setVal(Math.floor((1 - Math.pow(1 - p, 3)) * end)); if (p < 1) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end]);
  return <span ref={ref}>{val.toLocaleString("fr-FR")}{suffix}</span>;
}

// ═══════════════════════════════════════════════════════════════
// USER MENU
// ═══════════════════════════════════════════════════════════════
function UserMenu({ user, onLogout, onAdmin }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener("click", fn); return () => document.removeEventListener("click", fn); }, []);
  return (
    <div ref={ref} style={{ position: "relative", marginLeft: 6 }}>
      <div className="user-pill" onClick={() => setOpen(!open)}>
        <div className="user-av">{user.name?.[0]?.toUpperCase() || "U"}</div>
        {user.name?.split(" ")[0] || "Utilisateur"}
      </div>
      {open && (
        <div className="user-menu">
          <div style={{ padding: "8px 12px 10px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{user.name}</div>
            <div style={{ fontSize: 11, color: "var(--text-m)" }}>{user.email}</div>
            {user.role === "moderateur" && <span className="tag" style={{ marginTop: 4, display: "inline-block", borderColor: "rgba(74,124,255,.3)", color: "var(--accent-b)" }}>Admin</span>}
          </div>
          {user.role === "moderateur" && <button onClick={() => { onAdmin(); setOpen(false); }}>{I.settings} Administration</button>}
          <button onClick={() => { onLogout(); setOpen(false); }}>{I.logout} Déconnexion</button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function DauiaApp() {
  const [user, setUser] = useState(null);
  const [authPage, setAuthPage] = useState(null);
  const [authForm, setAuthForm] = useState({ email: "", password: "", name: "", confirmPassword: "" });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetForm, setResetForm] = useState({ password: "", confirmPassword: "" });
  const [resetError, setResetError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [page, setPage] = useState("home");
  const [pageTransition, setPageTransition] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const mainRef = useRef(null);
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [enrollments, setEnrollments] = useState([]);
  const courseIcons = ["book","python","brain","bolt","chat","chart","database","flask","target","rocket","robot","compass"];
  const emptyStep = { type: "lesson", title: "", url: "", content: "", description: "", code: "", solution_code: "", summary: "", transcription: "", resources: "" };
  const emptyCourse = { title: "", subtitle: "", description: "", icon: "book", level: "Débutant", duration: "", tags: "", modules: [{ title: "Module 1", steps: [] }] };
  const flatSteps = (c) => (c?.modules?.length ? c.modules.flatMap(m => m.steps || []) : []);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseForm, setCourseForm] = useState({ ...emptyCourse });
  const [adminNotif, setAdminNotif] = useState("");
  const [sandboxCode, setSandboxCode] = useState("# dauia.com — Python AI Sandbox\n# Bibliothèques : numpy, pandas, matplotlib,\n# scikit-learn, scipy, seaborn, statsmodels\n\nimport numpy as np\nimport pandas as pd\nfrom sklearn.linear_model import LinearRegression\n\nX = np.array([[1],[2],[3],[4],[5]])\ny = np.array([2.1, 4.0, 5.8, 8.1, 9.9])\n\nmodel = LinearRegression()\nmodel.fit(X, y)\n\nprint(f\"Coefficient : {model.coef_[0]:.2f}\")\nprint(f\"Intercept   : {model.intercept_:.2f}\")\nprint(f\"R² score    : {model.score(X, y):.4f}\")\nprint(f\"Prédiction x=10 : {model.predict([[10]])[0]:.2f}\")\n");
  const [consoleOut, setConsoleOut] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const pyodideRef = useRef(null);
  const [activeCourse, setActiveCourse] = useState(null);
  const [activeModuleIdx, setActiveModuleIdx] = useState(0);
  const [activeStepIdx, setActiveStepIdx] = useState(0);

  // ═══ HYPRLAND TILING STATE ═══
  const [sbLayout, setSbLayout] = useState("row"); // 'row' | 'col'
  const [sbPanels, setSbPanels] = useState(["editor", "console", "terminal"]);
  const [sbFocused, setSbFocused] = useState("editor");
  const sbDragRef = useRef({ dragging: null, startX: 0, startY: 0, ghost: null });

  const sbMovePanel = (idx, offset) => {
    const target = idx + offset;
    if (target < 0 || target >= sbPanels.length) return;
    setSbPanels(prev => { const n = [...prev]; [n[idx], n[target]] = [n[target], n[idx]]; return n; });
  };

  const sbDragStart = useCallback((panelId, e) => {
    e.preventDefault();
    const tile = e.target.closest(".hypr-tile");
    if (!tile) return;
    const rect = tile.getBoundingClientRect();
    const ghost = tile.cloneNode(true);
    ghost.className = "hypr-tile hypr-ghost";
    ghost.style.cssText = `position:fixed;width:${rect.width}px;height:${rect.height}px;left:${rect.left}px;top:${rect.top}px;z-index:999;pointer-events:none;opacity:.85;`;
    document.body.appendChild(ghost);
    tile.style.opacity = "0.25";
    sbDragRef.current = { dragging: panelId, startX: e.clientX, startY: e.clientY, ghost, srcTile: tile };
    setSbFocused(panelId);
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      const d = sbDragRef.current;
      if (!d.dragging || !d.ghost) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      d.ghost.style.transform = `translate(${dx}px,${dy}px)`;
      // Detect which panel we're over
      document.querySelectorAll(".hypr-tile:not(.hypr-ghost)").forEach(el => {
        const r = el.getBoundingClientRect();
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        el.classList.toggle("hypr-drop-target", inside && el.dataset.panel !== d.dragging);
      });
    };
    const onUp = (e) => {
      const d = sbDragRef.current;
      if (!d.dragging) return;
      // Find drop target
      let targetPanel = null;
      document.querySelectorAll(".hypr-tile:not(.hypr-ghost)").forEach(el => {
        const r = el.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom && el.dataset.panel !== d.dragging) {
          targetPanel = el.dataset.panel;
        }
        el.classList.remove("hypr-drop-target");
      });
      if (targetPanel) {
        setSbPanels(prev => {
          const n = [...prev];
          const fromIdx = n.indexOf(d.dragging);
          const toIdx = n.indexOf(targetPanel);
          if (fromIdx >= 0 && toIdx >= 0) { [n[fromIdx], n[toIdx]] = [n[toIdx], n[fromIdx]]; }
          return n;
        });
      }
      if (d.ghost) d.ghost.remove();
      if (d.srcTile) d.srcTile.style.opacity = "";
      sbDragRef.current = { dragging: null, startX: 0, startY: 0, ghost: null };
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("dauia-theme") || "dark"; } catch { return "dark"; }
  });

  useEffect(() => {
    try { localStorage.setItem("dauia-theme", theme); } catch {}
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  const navigate = (p) => { setPageTransition(false); setTimeout(() => { setPage(p); setPageTransition(true); if (mainRef.current) mainRef.current.scrollTop = 0; }, 180); };

  useEffect(() => { const el = mainRef.current; if (!el) return; const fn = () => setScrollY(el.scrollTop); el.addEventListener("scroll", fn, { passive: true }); return () => el.removeEventListener("scroll", fn); }, [page]);

  // Restore session from stored token on mount
  useEffect(() => {
    const token = localStorage.getItem("dauia-token");
    if (token) {
      fetch("/api/auth/me", { headers: { "Authorization": "Bearer " + token } })
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(data => { if (data.user) setUser(data.user); else localStorage.removeItem("dauia-token"); })
        .catch(() => { localStorage.removeItem("dauia-token"); });
    }
  }, []);

  // ═══ API HELPERS ═══
  const getAuthHeaders = (json = false) => {
    const h = {};
    const t = localStorage.getItem("dauia-token");
    if (t) h["Authorization"] = "Bearer " + t;
    if (json) h["Content-Type"] = "application/json";
    return h;
  };

  const loadCourses = async () => {
    setCoursesLoading(true);
    try {
      const endpoint = user?.role === "moderateur" ? "/api/admin/courses" : "/api/courses";
      const res = await fetch(endpoint, { headers: getAuthHeaders() });
      if (!res.ok) { setCourses([]); return; }
      const data = await res.json();
      setCourses(data.courses || []);
    } catch {
      setCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  };

  const loadEnrollments = async () => {
    if (!user) { setEnrollments([]); return; }
    try {
      const res = await fetch("/api/enrollments", { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setEnrollments(data.enrollments || []);
    } catch {}
  };

  // Load courses when user changes (including after session restore)
  useEffect(() => { loadCourses(); }, [user]);

  // Load enrollments when user is set
  useEffect(() => { loadEnrollments(); }, [user]);

  // Detect reset-password token in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const path = window.location.pathname;
    if (token && path.endsWith("/reset-password")) {
      setResetToken(token);
      setShowResetModal(true);
    }
    // Also check hash-based routing: #/reset-password?token=...
    const hash = window.location.hash;
    if (hash.includes("reset-password")) {
      const hashParams = new URLSearchParams(hash.split("?")[1] || "");
      const hashToken = hashParams.get("token");
      if (hashToken) {
        setResetToken(hashToken);
        setShowResetModal(true);
      }
    }
  }, []);

  const isDauphineEmail = (email) => /@(dauphine\.psl\.eu|dauphine\.eu|dauphine\.psl\.fr)$/i.test(email);

  const handleAuth = async (e) => {
    e.preventDefault(); setAuthError("");
    if (!isDauphineEmail(authForm.email)) { setAuthError("Seules les adresses @dauphine.psl.eu sont acceptées."); return; }
    if (authPage === "register") {
      if (!authForm.name.trim()) { setAuthError("Le nom est requis."); return; }
      if (authForm.password.length < 8) { setAuthError("Minimum 8 caractères pour le mot de passe."); return; }
      if (authForm.password !== authForm.confirmPassword) { setAuthError("Les mots de passe ne correspondent pas."); return; }
    } else {
      if (!authForm.password) { setAuthError("Mot de passe requis."); return; }
    }
    setAuthLoading(true);
    try {
      const endpoint = authPage === "register" ? "/api/auth/register" : "/api/auth/login";
      const payload = authPage === "register"
        ? { name: authForm.name, email: authForm.email, password: authForm.password }
        : { email: authForm.email, password: authForm.password };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAuthError(data.error || data.message || "Identifiants incorrects.");
        return;
      }
      if (authPage === "register") {
        showToast(data.message || "Inscription réussie ! Vérifiez votre email.");
        setAuthPage("login");
        setAuthForm({ email: authForm.email, password: "", name: "", confirmPassword: "" });
      } else {
        if (!data.token) { setAuthError("Erreur serveur : aucun token reçu."); return; }
        localStorage.setItem("dauia-token", data.token);
        setUser(data.user);
        setAuthPage(null);
        setAuthForm({ email: "", password: "", name: "", confirmPassword: "" });
        showToast("Connecté en tant que " + (data.user?.name || ""));
      }
    } catch {
      setAuthError("Impossible de contacter le serveur.");
    } finally {
      setAuthLoading(false);
    }
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 4000); };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setAuthError("");
    if (!forgotEmail.trim()) { setAuthError("Veuillez saisir votre email."); return; }
    if (!isDauphineEmail(forgotEmail)) { setAuthError("Seules les adresses @dauphine.psl.eu sont acceptées."); return; }
    setAuthLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setAuthError(data.message || "Une erreur est survenue."); return; }
      showToast("Si cet email existe, un lien de réinitialisation vous a été envoyé.");
      setAuthPage(null);
      setForgotEmail("");
    } catch {
      setAuthError("Impossible de contacter le serveur.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError("");
    if (resetForm.password.length < 8) { setResetError("Minimum 8 caractères pour le mot de passe."); return; }
    if (resetForm.password !== resetForm.confirmPassword) { setResetError("Les mots de passe ne correspondent pas."); return; }
    setResetLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password: resetForm.password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setResetError(data.message || "Lien invalide ou expiré."); return; }
      showToast("Mot de passe mis à jour avec succès !");
      setShowResetModal(false);
      setResetToken(null);
      setResetForm({ password: "", confirmPassword: "" });
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname.replace(/\/reset-password$/, "/"));
      setAuthPage("login");
    } catch {
      setResetError("Impossible de contacter le serveur.");
    } finally {
      setResetLoading(false);
    }
  };

  const saveCourse = async () => {
    if (!courseForm.title.trim()) { setAdminNotif("Le titre est requis."); setTimeout(() => setAdminNotif(""), 2500); return; }
    const payload = {
      ...courseForm,
      tags: typeof courseForm.tags === "string" ? courseForm.tags.split(",").map(t => t.trim()).filter(Boolean) : courseForm.tags,
      is_published: courseForm.is_published ?? true,
    };
    try {
      const isEdit = editingCourse?.id && typeof editingCourse.id === "number";
      const url = isEdit ? "/api/admin/courses/" + editingCourse.id : "/api/admin/courses";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: getAuthHeaders(true), body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setAdminNotif(data.error || "Erreur lors de l'enregistrement."); setTimeout(() => setAdminNotif(""), 2500); return; }
      setEditingCourse(null); setCourseForm({ ...emptyCourse });
      setAdminNotif("Formation enregistrée."); setTimeout(() => setAdminNotif(""), 2500);
      loadCourses();
    } catch {
      setAdminNotif("Impossible de contacter le serveur."); setTimeout(() => setAdminNotif(""), 2500);
    }
  };

  const deleteCourse = async (id) => {
    try {
      const res = await fetch("/api/admin/courses/" + id, { method: "DELETE", headers: getAuthHeaders() });
      if (!res.ok) { const data = await res.json().catch(() => ({})); showToast(data.error || "Erreur de suppression."); return; }
      setAdminNotif("Formation supprimée."); setTimeout(() => setAdminNotif(""), 2500);
      loadCourses();
    } catch {
      showToast("Impossible de contacter le serveur.");
    }
  };

  const startEdit = async (c) => {
    try {
      const res = await fetch("/api/admin/courses/" + c.id, { headers: getAuthHeaders() });
      if (!res.ok) { showToast("Impossible de charger la formation."); return; }
      const data = await res.json();
      const full = data.course;
      // Normalize step_type → type for the form
      if (full.modules) full.modules.forEach(m => (m.steps || []).forEach(s => { if (s.step_type && !s.type) s.type = s.step_type; }));
      const form = { ...full, tags: Array.isArray(full.tags) ? full.tags.join(", ") : full.tags };
      if (!form.modules?.length) form.modules = [{ title: "Module 1", steps: [] }];
      form.modules = form.modules.map(m => ({ ...m, steps: m.steps || [] }));
      setEditingCourse(full); setCourseForm(form);
    } catch { showToast("Impossible de contacter le serveur."); }
  };

  // ═══ AUTO-CORRECTION HELPERS ═══
  const currentStep = activeCourse?.modules?.[activeModuleIdx]?.steps?.[activeStepIdx] || null;
  const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const stripHtml = (s) => String(s).replace(/<[^>]*>/g, '');

  const goToNextStep = () => {
    if (!activeCourse) return;
    const mods = activeCourse.modules;
    for (let m = activeModuleIdx; m < mods.length; m++) {
      const startS = (m === activeModuleIdx) ? activeStepIdx + 1 : 0;
      const steps = mods[m].steps || [];
      for (let s = startS; s < steps.length; s++) {
        if (steps[s].step_type === "code" || steps[s].type === "code") {
          setActiveModuleIdx(m);
          setActiveStepIdx(s);
          setSandboxCode(steps[s].code || "# Écrivez votre code ici\n");
          setConsoleOut("");
          return;
        }
      }
    }
    showToast("Formation terminée ! Bravo !");
    setActiveCourse(null);
    loadEnrollments();
    navigate("catalog");
  };

  const startCourse = async (course) => {
    if (!user) { setAuthPage("login"); return; }
    // Enroll if not already enrolled
    const alreadyEnrolled = enrollments.some(e => e.course_id === course.id);
    if (!alreadyEnrolled) {
      try {
        const res = await fetch("/api/enrollments", { method: "POST", headers: getAuthHeaders(true), body: JSON.stringify({ course_id: course.id }) });
        if (!res.ok && res.status !== 409) { const d = await res.json().catch(() => ({})); showToast(d.error || "Erreur d'inscription."); return; }
      } catch { showToast("Impossible de contacter le serveur."); return; }
    }
    // Fetch full course structure (with modules & steps)
    try {
      const res = await fetch("/api/courses/" + course.id, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const fullCourse = data.course;
      const mods = fullCourse.modules || [];
      for (let m = 0; m < mods.length; m++) {
        const steps = mods[m].steps || [];
        for (let s = 0; s < steps.length; s++) {
          if (steps[s].step_type === "code" || steps[s].type === "code") {
            setActiveCourse(fullCourse);
            setActiveModuleIdx(m);
            setActiveStepIdx(s);
            setSandboxCode(steps[s].code || "# Écrivez votre code ici\n");
            setConsoleOut("");
            navigate("sandbox");
            loadEnrollments();
            return;
          }
        }
      }
      showToast("Aucune étape de code dans cette formation.");
    } catch { showToast("Impossible de charger la formation."); }
  };

  // ═══ PYODIDE EXECUTION + VALIDATION ═══
  const runSandbox = async () => {
    setIsRunning(true);
    setConsoleOut('<span style="color:#64748b">&gt;&gt;&gt; Initialisation...</span>\n');
    try {
      // Load Pyodide script if not present
      if (!window.loadPyodide) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
          s.onload = resolve;
          s.onerror = () => reject(new Error('Impossible de charger Pyodide'));
          document.head.appendChild(s);
        });
      }
      // Initialize Pyodide instance (cached)
      if (!pyodideRef.current) {
        setConsoleOut('<span style="color:#64748b">⏳ Initialisation de Python (première fois)...</span>\n');
        pyodideRef.current = await window.loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/' });
      }
      const pyodide = pyodideRef.current;

      // Load packages from imports in student code
      setConsoleOut('<span style="color:#64748b">📦 Chargement des bibliothèques...</span>\n');
      await pyodide.loadPackagesFromImports(sandboxCode);

      // Setup stdout capture
      pyodide.runPython(`import sys\nfrom io import StringIO\n__dauia_out = StringIO()\nsys.stdout = __dauia_out`);

      setConsoleOut('<span style="color:#64748b">&gt;&gt;&gt; Exécution en cours...</span>\n');

      // Execute student code
      let stdoutText = '';
      try {
        await pyodide.runPythonAsync(sandboxCode);
        stdoutText = pyodide.runPython('__dauia_out.getvalue()');
      } catch (err) {
        try { stdoutText = pyodide.runPython('__dauia_out.getvalue()'); } catch {}
        const errStr = String(err.message || err);
        setConsoleOut(
          (stdoutText ? escapeHtml(stdoutText) : '') +
          '\n<span style="color:#ef4444">❌ ' + escapeHtml(errStr) + '</span>'
        );
        setIsRunning(false);
        return;
      }

      let output = stdoutText ? escapeHtml(stdoutText) : '<span style="color:#64748b">(aucune sortie — ajoutez des print())</span>';

      // ── Auto-correction: only in course mode with solution_code ──
      if ((currentStep?.type === 'code' || currentStep?.step_type === 'code') && currentStep?.solution_code?.trim()) {
        try {
          // Reset stdout, run solution_code in same context
          pyodide.runPython(`__dauia_out = StringIO()\nsys.stdout = __dauia_out`);
          await pyodide.runPythonAsync(currentStep.solution_code);

          // All asserts passed
          output += '\n<span style="color:#22c55e;font-weight:bold">✅ Code validé avec succès !</span>';
          setConsoleOut(output);
          showToast("Étape validée !");

          // Save progress (API call)
          try {
            if (currentStep?.id) {
              fetch('/api/progress/' + currentStep.id, {
                method: 'POST',
                headers: getAuthHeaders(true),
              }).catch(() => {});
            }
          } catch {}

          // Navigate to next step after 2s
          setTimeout(() => goToNextStep(), 2000);

        } catch (err) {
          const errStr = String(err.message || err);
          if (errStr.includes('AssertionError')) {
            const msg = errStr.split('AssertionError').pop().replace(/^[:\s]+/, '').trim();
            output += '\n<span style="color:#ef4444;font-weight:bold">❌ Échec de la validation : ' + escapeHtml(msg || 'Le code ne produit pas le résultat attendu.') + '</span>';
          } else {
            output += '\n<span style="color:#ef4444">❌ Erreur de validation : ' + escapeHtml(errStr) + '</span>';
          }
          setConsoleOut(output);
        }
      } else {
        setConsoleOut(output);
      }
    } catch (err) {
      setConsoleOut('<span style="color:#ef4444">❌ Erreur Pyodide : ' + escapeHtml(String(err.message || err)) + '</span>');
    }
    setIsRunning(false);
  };

  const handleTab = (e) => { if (e.key === "Tab") { e.preventDefault(); const s = e.target.selectionStart; setSandboxCode(sandboxCode.substring(0, s) + "    " + sandboxCode.substring(e.target.selectionEnd)); setTimeout(() => { e.target.selectionStart = e.target.selectionEnd = s + 4; }, 0); } };


  return (
    <div className={`root ${theme}`} ref={mainRef}>
      <style>{`
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
:root{--bg:#070a14;--bg-card:#0d1120;--bg-surface:#111730;--bg-elevated:#182040;--bg-input:#0a0e1c;--border:#1a2040;--border-l:#252e55;--text:#eef0ff;--text-2:#9aa2c4;--text-m:#5a6290;--accent:#4a7cff;--accent-b:#6b9aff;--accent-g:rgba(74,124,255,.1);--accent-gs:rgba(74,124,255,.22);--success:#34d399;--error:#f87171;--warn:#fbbf24;--font:'Poppins',sans-serif;--mono:'JetBrains Mono',monospace;--code-text:#c4b5fd;--console-text:#a5b4fc;--nav-scrolled-bg:rgba(7,10,20,.88);--modal-overlay:rgba(4,6,12,.8);}
.root.light{--bg:#f5f7fb;--bg-card:#ffffff;--bg-surface:#eef1f8;--bg-elevated:#e4e8f2;--bg-input:#f0f2f8;--border:#d8dce8;--border-l:#c4c9d9;--text:#1a1d2e;--text-2:#4a5068;--text-m:#7a8098;--accent:#3563e9;--accent-b:#2850cc;--accent-g:rgba(53,99,233,.08);--accent-gs:rgba(53,99,233,.15);--success:#16a369;--error:#dc2626;--warn:#d97706;--code-text:#5b21b6;--console-text:#4338ca;--nav-scrolled-bg:rgba(245,247,251,.92);--modal-overlay:rgba(0,0,0,.4);}
*{box-sizing:border-box;margin:0;padding:0;}.root{height:100vh;width:100vw;overflow-x:hidden;overflow-y:auto;background:var(--bg);color:var(--text);font-family:var(--font);font-size:14px;-webkit-font-smoothing:antialiased;}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes scaleIn{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}@keyframes slideR{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)}}@keyframes glow{0%,100%{box-shadow:0 0 20px rgba(74,124,255,.08)}50%{box-shadow:0 0 40px rgba(74,124,255,.18)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.page-in{animation:fadeUp .45s cubic-bezier(.22,1,.36,1) both}.page-out{opacity:0;transform:translateY(-8px);transition:all .18s}
.nav{position:sticky;top:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 36px;height:60px;transition:all .3s}.nav.scrolled{background:var(--nav-scrolled-bg);backdrop-filter:blur(16px) saturate(1.3);border-bottom:1px solid var(--border)}
.nav-logo{display:flex;align-items:center;gap:9px;cursor:pointer}.nav-logo-mark{width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,var(--accent),#7c3aed);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:#fff}.nav-logo-txt{font-weight:700;font-size:17px;letter-spacing:-.3px}
.nav-links{display:flex;gap:4px;align-items:center}.nav-l{padding:7px 13px;border-radius:7px;cursor:pointer;font-size:13px;font-weight:500;color:var(--text-2);transition:all .15s;border:none;background:none;font-family:var(--font);display:flex;align-items:center;gap:5px}.nav-l:hover{color:var(--text);background:var(--accent-g)}.nav-l.act{color:var(--accent-b);background:var(--accent-g)}
.nav-cta{padding:7px 18px;border-radius:7px;border:none;cursor:pointer;background:var(--accent);color:#fff;font-weight:600;font-size:13px;font-family:var(--font);transition:all .2s;margin-left:6px}.nav-cta:hover{background:var(--accent-b);transform:translateY(-1px);box-shadow:0 4px 16px rgba(74,124,255,.25)}
.hero{position:relative;padding:90px 36px 70px;text-align:center;min-height:82vh;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden}
.hero-badge{display:inline-flex;align-items:center;gap:7px;padding:5px 14px 5px 8px;border-radius:24px;background:var(--accent-g);border:1px solid rgba(74,124,255,.15);font-size:11.5px;color:var(--accent-b);font-weight:500;margin-bottom:24px;animation:fadeUp .5s .1s both}
.hero-dot{width:6px;height:6px;border-radius:50%;background:var(--success);animation:pulse 2s infinite}
.hero h1{font-size:clamp(36px,5.5vw,64px);font-weight:800;line-height:1.1;letter-spacing:-1.5px;max-width:780px;margin-bottom:20px;animation:fadeUp .5s .15s both}.hero h1 .acc{color:var(--accent-b)}
.hero-sub{font-size:clamp(14px,1.8vw,17px);color:var(--text-2);max-width:520px;line-height:1.7;margin-bottom:36px;animation:fadeUp .5s .25s both;font-weight:400}
.hero-actions{display:flex;gap:12px;animation:fadeUp .5s .3s both;flex-wrap:wrap;justify-content:center}
.btn-h{padding:12px 28px;border-radius:9px;font-size:14px;font-weight:600;cursor:pointer;font-family:var(--font);transition:all .2s;border:none;display:inline-flex;align-items:center;gap:7px}
.btn-hp{background:var(--accent);color:#fff;box-shadow:0 4px 18px rgba(74,124,255,.2)}.btn-hp:hover{background:var(--accent-b);transform:translateY(-2px);box-shadow:0 6px 24px rgba(74,124,255,.3)}
.btn-hs{background:transparent;color:var(--text);border:1px solid var(--border-l)}.btn-hs:hover{border-color:var(--accent);background:var(--accent-g)}
.cw{background:var(--bg-card);border:1px solid var(--border);border-radius:13px;overflow:hidden;text-align:left;box-shadow:0 16px 50px rgba(0,0,0,.35),0 0 30px rgba(74,124,255,.04);margin-top:50px;max-width:560px;width:100%;animation:fadeUp .6s .4s both}
.cw-bar{display:flex;align-items:center;gap:6px;padding:11px 14px;border-bottom:1px solid var(--border)}.cw-dot{width:9px;height:9px;border-radius:50%}
.cw pre{padding:18px;font-family:var(--mono);font-size:12.5px;line-height:1.8;color:var(--code-text);overflow-x:auto}.kw{color:#c792ea}.fn{color:#82aaff}.st{color:#a5d6a7}.cm{color:#5a6290;font-style:italic}.nb{color:#f78c6c}.op{color:#89ddff}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);border-top:1px solid var(--border);border-bottom:1px solid var(--border)}.stat{background:var(--bg);padding:32px 18px;text-align:center}.stat-n{font-size:32px;font-weight:700;margin-bottom:4px}.stat-l{color:var(--text-m);font-size:12.5px}
.section{padding:72px 36px;max-width:1140px;margin:0 auto}.sec-label{font-size:11px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:var(--accent);margin-bottom:10px}.sec-title{font-size:clamp(26px,3.5vw,38px);font-weight:700;line-height:1.15;letter-spacing:-.4px;margin-bottom:14px}.sec-desc{color:var(--text-2);max-width:500px;line-height:1.7;margin-bottom:40px;font-weight:400}
.feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.feat{padding:28px;border-radius:13px;background:var(--bg-card);border:1px solid var(--border);transition:all .25s}.feat:hover{border-color:var(--border-l);transform:translateY(-2px)}.feat-ic{width:40px;height:40px;border-radius:9px;background:var(--accent-g);border:1px solid rgba(74,124,255,.12);display:flex;align-items:center;justify-content:center;color:var(--accent-b);margin-bottom:15px}.feat h4{font-size:15px;font-weight:600;margin-bottom:6px}.feat p{color:var(--text-2);font-size:12.5px;line-height:1.7;font-weight:400}
.c-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px}
.c-card{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;cursor:pointer;transition:all .25s;position:relative;overflow:hidden}.c-card:hover{border-color:var(--accent);transform:translateY(-3px);box-shadow:0 10px 32px rgba(0,0,0,.25)}
.c-card-bar{display:flex;align-items:center;gap:6px;padding:10px 16px;border-bottom:1px solid var(--border);background:var(--bg-surface);font-size:11px;color:var(--text-m)}.c-card-bar .cw-dot{width:7px;height:7px}
.c-card-body{padding:20px}
.c-card-icon{margin-bottom:14px;width:42px;height:42px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:var(--accent-g);border:1px solid rgba(74,124,255,.12)}.c-card h3{font-size:15px;font-weight:600;margin-bottom:3px;font-family:var(--mono)}.c-card p{color:var(--text-2);font-size:12.5px;line-height:1.6;margin-bottom:14px;font-weight:400}
.c-meta{display:flex;gap:10px;font-size:11px;color:var(--text-m);align-items:center;flex-wrap:wrap}.c-meta span{display:flex;align-items:center;gap:3px}
.c-diff{display:flex;gap:3px;align-items:center}.c-diff-dot{width:6px;height:6px;border-radius:50%;background:var(--border-l)}.c-diff-dot.on{background:var(--accent)}
.c-progress{margin-top:14px;height:3px;border-radius:2px;background:var(--border);overflow:hidden}.c-progress-bar{height:100%;border-radius:2px;background:var(--accent);transition:width .3s}
.c-tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:12px}
.tag{padding:2px 9px;border-radius:4px;font-size:10px;background:var(--bg-surface);color:var(--text-2);border:1px solid var(--border);font-family:var(--mono);letter-spacing:.3px}
.empty{text-align:center;padding:60px 20px;color:var(--text-m)}.empty-icon{margin-bottom:16px;opacity:.35;display:flex;justify-content:center}.empty-icon svg{width:48px;height:48px}.empty p{margin-bottom:20px;font-size:14px}
.modal-overlay{position:fixed;inset:0;z-index:200;background:var(--modal-overlay);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:fadeIn .2s both}
.modal{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:36px;width:420px;max-width:92vw;animation:scaleIn .3s both;position:relative}
.modal h2{font-size:22px;font-weight:700;margin-bottom:6px}.modal .sub{color:var(--text-2);font-size:13px;margin-bottom:24px;font-weight:400}
.field{margin-bottom:16px}.field label{display:block;font-size:12px;font-weight:500;color:var(--text-2);margin-bottom:5px}.field-input{position:relative}
.inp{width:100%;padding:10px 14px;border-radius:8px;border:1px solid var(--border);background:var(--bg-input);color:var(--text);font-family:var(--font);font-size:13px;transition:border-color .2s;outline:none}.inp:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-g)}.inp::placeholder{color:var(--text-m)}
.pw-toggle{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text-m);cursor:pointer;padding:2px}
.auth-err{background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.2);border-radius:8px;padding:10px 13px;font-size:12px;color:var(--error);margin-bottom:14px}
.btn-auth{width:100%;padding:11px;border-radius:8px;border:none;background:var(--accent);color:#fff;font-family:var(--font);font-size:14px;font-weight:600;cursor:pointer;transition:all .2s;margin-top:6px}.btn-auth:hover{background:var(--accent-b)}
.auth-switch{text-align:center;margin-top:18px;font-size:12.5px;color:var(--text-m)}.auth-switch a{color:var(--accent-b);cursor:pointer;font-weight:500}.auth-switch a:hover{text-decoration:underline}
.modal-close{position:absolute;top:14px;right:14px;background:none;border:none;color:var(--text-m);cursor:pointer;padding:4px;border-radius:6px;transition:all .15s}.modal-close:hover{color:var(--text);background:var(--bg-surface)}
.dauphine-badge{display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:8px;background:rgba(74,124,255,.06);border:1px solid rgba(74,124,255,.12);font-size:11px;color:var(--accent-b);margin-bottom:20px;font-weight:500}
.admin-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:12px}
.admin-table{width:100%;border-collapse:separate;border-spacing:0}.admin-table th{text-align:left;padding:10px 14px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--text-m);border-bottom:1px solid var(--border)}.admin-table td{padding:14px;border-bottom:1px solid var(--border);font-size:13px;vertical-align:middle}.admin-table tr:hover td{background:var(--bg-surface)}.admin-actions{display:flex;gap:6px}
.btn-sm{display:inline-flex;align-items:center;gap:4px;padding:5px 11px;border-radius:6px;font-size:11.5px;font-weight:500;cursor:pointer;border:1px solid var(--border);background:var(--bg-surface);color:var(--text);font-family:var(--font);transition:all .15s}.btn-sm:hover{border-color:var(--border-l);background:var(--bg-elevated)}.btn-sm.danger{border-color:rgba(248,113,113,.2);color:var(--error)}.btn-sm.danger:hover{background:rgba(248,113,113,.08)}.btn-sm.primary{background:var(--accent);border-color:var(--accent);color:#fff}.btn-sm.primary:hover{background:var(--accent-b)}
.notif{position:fixed;bottom:24px;right:24px;z-index:300;padding:12px 20px;border-radius:10px;background:var(--bg-elevated);border:1px solid var(--border-l);font-size:13px;font-weight:500;animation:slideR .3s both;box-shadow:0 8px 24px rgba(0,0,0,.3)}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.form-full{grid-column:1/-1}
.form-section{margin-top:24px;padding-top:20px;border-top:1px solid var(--border)}.form-section h4{font-size:14px;font-weight:600;margin-bottom:14px}
.module-row{display:flex;gap:10px;margin-bottom:8px;align-items:center}
.textarea{width:100%;min-height:100px;padding:10px 14px;border-radius:8px;border:1px solid var(--border);background:var(--bg-input);color:var(--text);font-family:var(--font);font-size:13px;resize:vertical;outline:none;transition:border-color .2s}.textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-g)}
.icon-picker{display:flex;gap:6px;flex-wrap:wrap}.icon-opt{width:36px;height:36px;border-radius:8px;border:1px solid var(--border);background:var(--bg-surface);display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer;transition:all .15s}.icon-opt:hover,.icon-opt.sel{border-color:var(--accent);background:var(--accent-g)}
/* ═══ HYPRLAND SANDBOX ═══ */
.hypr-sandbox{display:flex;flex-direction:column;height:calc(100vh - 60px);overflow:hidden;background:#020408;position:relative}
.hypr-sandbox::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at center,rgba(8,145,178,.03) 1px,transparent 1px);background-size:32px 32px;pointer-events:none}

/* Top bar */
.hypr-bar{height:48px;display:flex;align-items:center;padding:0 16px;gap:12px;background:#0b0f19;border-bottom:2px solid rgba(8,145,178,.15);flex-shrink:0;position:relative;z-index:10}
.hypr-bar-left{display:flex;align-items:center;gap:8px}
.hypr-logo{width:28px;height:28px;background:linear-gradient(135deg,#06b6d4,#7c3aed);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;color:#fff;border-radius:0}
.hypr-bar-title{font-family:var(--mono);font-weight:700;font-size:14px;color:#22d3ee;text-transform:uppercase;letter-spacing:1px}
.hypr-bar-right{display:flex;align-items:center;gap:8px;margin-left:auto}
.hypr-btn{border-radius:0!important;border-color:rgba(8,145,178,.2)!important;background:#05080f!important;color:#94a3b8!important;font-family:var(--mono)!important;text-transform:uppercase;letter-spacing:.5px;font-size:10px!important}
.hypr-btn:hover{border-color:#22d3ee!important;color:#22d3ee!important}
.hypr-btn-primary{border-radius:0!important;background:#06b6d4!important;border-color:transparent!important;color:#050914!important;font-family:var(--mono)!important;font-weight:700!important;text-transform:uppercase;letter-spacing:.5px;font-size:11px!important;padding:6px 18px!important}
.hypr-btn-primary:hover{background:#22d3ee!important;box-shadow:4px 4px 0 0 rgba(6,182,212,.3);transform:translate(-2px,-2px)}

/* Layout controls */
.hypr-layout-ctrl{display:flex;align-items:center;gap:4px;background:#05080f;padding:3px 8px;border:1px solid rgba(8,145,178,.15)}
.hypr-layout-label{font-family:var(--mono);font-size:9px;color:#475569;text-transform:uppercase;letter-spacing:1px;margin-right:4px}
.hypr-layout-ctrl button{width:22px;height:22px;border:1px solid rgba(8,145,178,.15);background:transparent;color:#475569;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:12px;padding:0;transition:all .15s;border-radius:0}
.hypr-layout-ctrl button:hover{color:#22d3ee;border-color:rgba(8,145,178,.4)}
.hypr-layout-ctrl button.act{background:rgba(8,145,178,.15);color:#22d3ee;border-color:rgba(34,211,238,.4)}

/* Tiling container */
.hypr-tiles{display:flex;flex:1;gap:8px;padding:8px;overflow:hidden;position:relative;z-index:1}

/* Individual tile (window) */
.hypr-tile{display:flex;flex-direction:column;overflow:hidden;border:2px solid rgba(8,145,178,.12);background:#070b14;transition:all .2s,opacity .15s,border-color .2s}
.hypr-tile:hover{border-color:rgba(8,145,178,.3)}
.hypr-tile.focused{border-color:rgba(34,211,238,.5);box-shadow:0 0 20px rgba(34,211,238,.1);z-index:2}
.hypr-tile.hypr-drop-target{border-color:#22d3ee!important;box-shadow:0 0 30px rgba(34,211,238,.25)!important;background:#0a1020!important}
.hypr-ghost{border-color:#22d3ee!important;box-shadow:0 0 40px rgba(34,211,238,.3)!important;border-radius:0!important}

/* Titlebar */
.hypr-titlebar{height:26px;display:flex;align-items:center;gap:6px;padding:0 8px;background:#05080f;border-bottom:1px solid rgba(8,145,178,.1);flex-shrink:0;user-select:none;transition:background .15s}
.hypr-titlebar.active{background:rgba(8,145,178,.06)}
.hypr-titlebar:active{cursor:grabbing}
.hypr-titlebar-icon{font-family:var(--mono);font-size:10px;color:#22d3ee;font-weight:700}
.hypr-titlebar-name{font-family:var(--mono);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#22d3ee;opacity:.8}
.hypr-titlebar-arrows{display:flex;gap:2px;margin-left:auto}
.hypr-titlebar-arrows button{width:16px;height:16px;border:none;background:transparent;color:#475569;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:10px;padding:0;transition:all .12s;font-family:var(--mono);border-radius:0}
.hypr-titlebar-arrows button:hover:not(:disabled){color:#22d3ee;background:rgba(8,145,178,.15)}
.hypr-titlebar-arrows button:disabled{opacity:.15;cursor:default}

/* Tile body */
.hypr-tile-body{flex:1;display:flex;flex-direction:column;overflow:hidden;background:#090d16}

/* Editor panel */
.hypr-libs{padding:5px 12px;border-bottom:1px solid rgba(8,145,178,.08);background:#05080f;display:flex;gap:4px;flex-wrap:wrap;flex-shrink:0}
.hypr-lib{padding:2px 7px;font-size:9px;background:transparent;color:#475569;border:1px solid rgba(8,145,178,.1);font-family:var(--mono);text-transform:uppercase;letter-spacing:.3px;border-radius:0}
.hypr-editor-area{flex:1;display:flex;overflow:hidden;background:#03060a}
.hypr-ln{padding:14px 0;text-align:right;user-select:none;font-family:var(--mono);font-size:12px;line-height:1.78;color:#1e293b;min-width:36px;padding-right:10px;border-right:1px solid rgba(8,145,178,.06)}
.hypr-ta{width:100%;height:100%;background:transparent;color:#cbd5e1;border:none;outline:none;font-family:var(--mono);font-size:13px;line-height:1.78;resize:none;padding:14px;tab-size:4;white-space:pre;overflow-wrap:normal;overflow-x:auto}
.hypr-ta::selection{background:rgba(34,211,238,.15)}

/* Console & Terminal */
.hypr-console{flex:1;overflow:auto;padding:14px;font-family:var(--mono);font-size:12px;line-height:1.78;white-space:pre-wrap;word-break:break-word;color:#94a3b8;background:#03060a}
.hypr-term{color:#34d399}
.hypr-prompt{color:#475569}
.hypr-blink{animation:pulse 1.5s infinite}
.hypr-status{padding:6px 12px;border-top:1px solid rgba(8,145,178,.08);font-size:9px;color:#334155;display:flex;justify-content:space-between;flex-shrink:0;font-family:var(--mono);text-transform:uppercase;letter-spacing:.5px;background:#05080f}

@media(max-width:768px){.hypr-tiles{flex-direction:column!important}.hypr-tile{flex:1!important}.hypr-bar{flex-wrap:wrap;height:auto;padding:8px 12px;gap:8px}}
.hypr-course-bar{display:flex;align-items:center;gap:12px;padding:6px 16px;background:#05080f;border-bottom:1px solid rgba(8,145,178,.15);font-family:var(--mono);font-size:11px;color:#94a3b8;flex-shrink:0;flex-wrap:wrap}
.hypr-course-info{display:flex;align-items:center;gap:4px;flex-wrap:wrap}.hypr-step-desc{margin-left:auto;color:#64748b;font-size:10px;max-width:40%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.footer{border-top:1px solid var(--border);padding:40px 36px 28px;display:flex;justify-content:space-between;align-items:start;max-width:1140px;margin:60px auto 0;flex-wrap:wrap;gap:28px}
.footer-brand p{color:var(--text-m);font-size:12px;max-width:250px;line-height:1.7;margin-top:8px;font-weight:400}
.footer-links{display:flex;gap:40px;flex-wrap:wrap}.footer-col h5{font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-m);margin-bottom:12px}.footer-col a{display:block;font-size:12.5px;color:var(--text-2);text-decoration:none;padding:3px 0;cursor:pointer;transition:color .15s;font-weight:400}.footer-col a:hover{color:var(--accent-b)}
.user-pill{display:flex;align-items:center;gap:7px;padding:5px 12px 5px 6px;border-radius:20px;background:var(--bg-surface);border:1px solid var(--border);cursor:pointer;font-size:12px;font-weight:500;color:var(--text-2);transition:all .15s}.user-pill:hover{border-color:var(--border-l);color:var(--text)}
.user-av{width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#7c3aed);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff}
.user-menu{position:absolute;top:54px;right:0;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:6px;min-width:180px;box-shadow:0 12px 32px rgba(0,0,0,.3);animation:scaleIn .15s both;z-index:110}.user-menu button{display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;border-radius:7px;border:none;background:none;color:var(--text-2);font-family:var(--font);font-size:12.5px;cursor:pointer;transition:all .12s;text-align:left}.user-menu button:hover{background:var(--bg-surface);color:var(--text)}
.theme-toggle{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:var(--bg-surface);color:var(--text-2);cursor:pointer;transition:all .15s;margin-left:4px;flex-shrink:0}.theme-toggle:hover{border-color:var(--border-l);color:var(--text);background:var(--bg-elevated)}
.root.light .kw{color:#7c3aed}.root.light .fn{color:#2563eb}.root.light .st{color:#16a34a}.root.light .cm{color:#9ca3af;font-style:italic}.root.light .nb{color:#ea580c}.root.light .op{color:#0891b2}
.root.light .nav-logo-mark{background:linear-gradient(135deg,#3563e9,#6d28d9)}
.root.light .user-av{background:linear-gradient(135deg,#3563e9,#6d28d9)}
.root.light .cw{box-shadow:0 16px 50px rgba(0,0,0,.08),0 0 30px rgba(53,99,233,.04)}
.root.light .c-card:hover{box-shadow:0 10px 32px rgba(0,0,0,.08)}.root.light .c-card-bar{background:var(--bg-elevated)}
.root.light .notif{box-shadow:0 8px 24px rgba(0,0,0,.1)}
.root.light .user-menu{box-shadow:0 12px 32px rgba(0,0,0,.1)}
.root.light .btn-hp{box-shadow:0 4px 18px rgba(53,99,233,.15)}
.root.light .btn-hp:hover{box-shadow:0 6px 24px rgba(53,99,233,.2)}
@media(max-width:768px){.hero{padding:50px 18px 40px}.nav{padding:0 14px}.section{padding:44px 18px}.feat-grid,.c-grid{grid-template-columns:1fr}.stats{grid-template-columns:1fr 1fr}.footer{flex-direction:column}.form-grid{grid-template-columns:1fr}.nav-links{gap:2px}}
      `}</style>

      {/* NAV */}
      <nav className={`nav ${scrollY > 16 ? "scrolled" : ""}`}>
        <div className="nav-logo" onClick={() => navigate("home")}><div className="nav-logo-mark">d</div><span className="nav-logo-txt">dauia</span></div>
        <div className="nav-links">
          <button className={`nav-l ${page==="home"?"act":""}`} onClick={() => navigate("home")}>{I.home} Accueil</button>
          <button className={`nav-l ${page==="catalog"?"act":""}`} onClick={() => navigate("catalog")}>{I.grid} Formations</button>
          {user && <button className={`nav-l ${page==="sandbox"?"act":""}`} onClick={() => { setActiveCourse(null); navigate("sandbox"); }}>{I.terminal} Python Lab</button>}
          {user?.role==="moderateur" && <button className={`nav-l ${page==="admin"?"act":""}`} onClick={() => navigate("admin")}>{I.settings} Admin</button>}
          <button className="theme-toggle" onClick={toggleTheme} title={theme === "dark" ? "Mode clair" : "Mode sombre"}>{theme === "dark" ? I.sun : I.moon}</button>
          {user ? <UserMenu user={user} onLogout={() => {const t=localStorage.getItem("dauia-token");if(t)fetch("/api/auth/logout",{method:"POST",headers:{"Authorization":"Bearer "+t}}).catch(()=>{});localStorage.removeItem("dauia-token");setUser(null);navigate("home");}} onAdmin={() => navigate("admin")} />
            : <button className="nav-cta" onClick={() => setAuthPage("login")}>Se connecter</button>}
        </div>
      </nav>

      {/* AUTH MODAL */}
      {authPage && (
        <div className="modal-overlay" onClick={() => { setAuthPage(null); setForgotEmail(""); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setAuthPage(null); setForgotEmail(""); }}>{I.x}</button>

            {/* ── Forgot Password View ── */}
            {authPage === "forgot" ? (<>
              <h2>Mot de passe oublié</h2>
              <p className="sub">Entrez votre email Dauphine pour recevoir un lien de réinitialisation.</p>
              <div className="dauphine-badge">{I.lock} Réservé aux adresses @dauphine.psl.eu</div>
              {authError && <div className="auth-err">{authError}</div>}
              <form onSubmit={handleForgotPassword}>
                <div className="field"><label>Email Dauphine</label><input className="inp" type="email" placeholder="prenom.nom@dauphine.psl.eu" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} autoFocus /></div>
                <button type="submit" className="btn-auth" disabled={authLoading}>{authLoading ? "Envoi en cours..." : "Envoyer le lien de réinitialisation"}</button>
              </form>
              <div className="auth-switch"><a onClick={() => { setAuthPage("login"); setAuthError(""); setForgotEmail(""); }}>← Retour à la connexion</a></div>
            </>) : (<>

            {/* ── Login / Register View ── */}
            <h2>{authPage==="login"?"Connexion":"Créer un compte"}</h2>
            <p className="sub">{authPage==="login"?"Accédez à votre espace dauia.":"Rejoignez la communauté dauia."}</p>
            <div className="dauphine-badge">{I.lock} Réservé aux adresses @dauphine.psl.eu</div>
            {authError && <div className="auth-err">{authError}</div>}
            <form onSubmit={handleAuth}>
              {authPage==="register" && <div className="field"><label>Nom complet</label><input className="inp" placeholder="Prénom Nom" value={authForm.name} onChange={e => setAuthForm({...authForm,name:e.target.value})} /></div>}
              <div className="field"><label>Email Dauphine</label><input className="inp" type="email" placeholder="prenom.nom@dauphine.psl.eu" value={authForm.email} onChange={e => setAuthForm({...authForm,email:e.target.value})} /></div>
              <div className="field"><label>Mot de passe</label><div className="field-input"><input className="inp" type={showPw?"text":"password"} placeholder="••••••••" value={authForm.password} onChange={e => setAuthForm({...authForm,password:e.target.value})} style={{paddingRight:36}} /><button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>{showPw?I.eyeOff:I.eye}</button></div></div>
              {authPage==="login" && <div style={{textAlign:"right",marginTop:-8,marginBottom:12}}><a onClick={() => { setAuthPage("forgot"); setAuthError(""); }} style={{fontSize:12,color:"var(--accent-b)",cursor:"pointer",fontWeight:500}}>Mot de passe oublié ?</a></div>}
              {authPage==="register" && <div className="field"><label>Confirmer le mot de passe</label><input className="inp" type="password" placeholder="••••••••" value={authForm.confirmPassword} onChange={e => setAuthForm({...authForm,confirmPassword:e.target.value})} /></div>}
              <button type="submit" className="btn-auth" disabled={authLoading}>{authLoading?"Connexion en cours...":authPage==="login"?"Se connecter":"Créer mon compte"}</button>
            </form>
            <div className="auth-switch">{authPage==="login"?<>Pas de compte ? <a onClick={() => {setAuthPage("register");setAuthError("");}}>S'inscrire</a></>:<>Déjà un compte ? <a onClick={() => {setAuthPage("login");setAuthError("");}}>Se connecter</a></>}</div>
            </>)}
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showResetModal && (
        <div className="modal-overlay">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Nouveau mot de passe</h2>
            <p className="sub">Choisissez un nouveau mot de passe pour votre compte.</p>
            {resetError && <div className="auth-err">{resetError}</div>}
            <form onSubmit={handleResetPassword}>
              <div className="field"><label>Nouveau mot de passe</label><div className="field-input"><input className="inp" type={showPw?"text":"password"} placeholder="••••••••" value={resetForm.password} onChange={e => setResetForm({...resetForm, password: e.target.value})} style={{paddingRight:36}} autoFocus /><button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>{showPw?I.eyeOff:I.eye}</button></div></div>
              <div className="field"><label>Confirmer le mot de passe</label><input className="inp" type="password" placeholder="••••••••" value={resetForm.confirmPassword} onChange={e => setResetForm({...resetForm, confirmPassword: e.target.value})} /></div>
              <button type="submit" className="btn-auth" disabled={resetLoading}>{resetLoading ? "Mise à jour..." : "Mettre à jour mon mot de passe"}</button>
            </form>
          </div>
        </div>
      )}

      {(adminNotif || toast) && <div className="notif">{adminNotif || toast}</div>}

      <div className={pageTransition?"page-in":"page-out"}>

      {/* HOME */}
      {page==="home" && (<>
        <section className="hero">
          <ConstellationBG intensity={1.1} />
          <div style={{position:"absolute",width:480,height:480,borderRadius:"50%",background:"radial-gradient(circle,rgba(74,124,255,.07) 0%,transparent 70%)",top:-80,right:-80,pointerEvents:"none"}} />
          <div className="hero-badge"><span className="hero-dot" /> Université Paris-Dauphine PSL</div>
          <h1>Maîtrisez l'<span className="acc">Intelligence Artificielle</span> par la pratique</h1>
          <p className="hero-sub">Cours interactifs Python, Data Science & Machine Learning. Codez directement dans votre navigateur.</p>
          <div className="hero-actions">
            <button className="btn-h btn-hp" onClick={() => navigate("catalog")}>Explorer les formations {I.arrow}</button>
            {user && <button className="btn-h btn-hs" onClick={() => navigate("sandbox")}>Ouvrir le Sandbox IA</button>}
          </div>
          <div className="cw">
            <div className="cw-bar"><span className="cw-dot" style={{background:"#ef4444"}} /><span className="cw-dot" style={{background:"#f59e0b"}} /><span className="cw-dot" style={{background:"#22c55e"}} /><span style={{flex:1}} /><span style={{fontSize:10.5,color:"var(--text-m)"}}>sandbox.py</span></div>
            <pre><span className="cm"># dauia.com — Python AI Sandbox</span>{"\n"}<span className="kw">import</span> numpy <span className="kw">as</span> np{"\n"}<span className="kw">from</span> sklearn.ensemble <span className="kw">import</span> RandomForestClassifier{"\n\n"}model <span className="op">=</span> <span className="fn">RandomForestClassifier</span>(n_estimators<span className="op">=</span><span className="nb">100</span>){"\n"}model.<span className="fn">fit</span>(X_train, y_train){"\n\n"}<span className="fn">print</span>(<span className="st">f"Accuracy: </span>{"{model.score(X_test, y_test):.1%}"}<span className="st">"</span>){"\n"}<span className="cm"># → Accuracy: 94.2%</span> <span style={{color:"var(--success)"}}>{I.check}</span></pre>
          </div>
        </section>
        <div className="stats">{[{n:12000,s:"+",l:"Étudiants Dauphine"},{n:6,s:"",l:"Parcours certifiants"},{n:94,s:"%",l:"Taux de complétion"},{n:48,s:"h",l:"Contenu disponible"}].map((s,i)=>(<div key={i} className="stat"><div className="stat-n"><AnimCounter end={s.n} />{s.s}</div><div className="stat-l">{s.l}</div></div>))}</div>
        <section className="section">
          <div className="sec-label">Pourquoi dauia</div><h2 className="sec-title">Conçue pour l'IA</h2><p className="sec-desc">Du code, des retours immédiats, des projets réels. Pas de vidéos passives.</p>
          <div className="feat-grid">
            {[{ic:I.terminal,t:"Sandbox Python IA",d:"NumPy, Pandas, Scikit-learn, Matplotlib. Zéro installation, tout dans le navigateur."},{ic:I.play,t:"Exécution WebAssembly",d:"Pyodide fait tourner Python nativement. Vos données ne quittent jamais votre machine."},{ic:I.settings,t:"Espace admin",d:"Les modérateurs créent et gèrent les formations directement depuis l'interface."},{ic:I.user,t:"Accès Dauphine exclusif",d:"Authentification réservée aux étudiants et staff (@dauphine.psl.eu)."},{ic:I.image,t:"Graphiques en direct",d:"Matplotlib et Seaborn s'affichent à côté de votre code en temps réel."},{ic:I.check,t:"Open source",d:"Architecture modulaire React + PHP. Déployable sur votre propre infrastructure."}].map((f,i)=>(
              <div key={i} className="feat" style={{animation:`fadeUp .4s ${i*.07}s both`}}><div className="feat-ic">{f.ic}</div><h4>{f.t}</h4><p>{f.d}</p></div>
            ))}
          </div>
        </section>
        {coursesLoading ? <section className="section" style={{textAlign:"center",padding:"60px 20px"}}><p style={{color:"var(--text-m)"}}>Chargement des formations...</p></section>
        : courses.length > 0 && <section className="section"><div className="sec-label">Formations</div><h2 className="sec-title">Parcours disponibles</h2><div className="c-grid">{courses.slice(0,3).map((c,i)=>{const diff=c.level==="Débutant"?1:c.level==="Intermédiaire"?2:3;const enr=enrollments.find(e=>e.course_id===c.id);const pct=enr?.progress?.percentage||0;return(<div key={c.id} className="c-card" style={{animation:`fadeUp .4s ${i*.08}s both`}} onClick={() => navigate("catalog")}><div className="c-card-bar"><span className="cw-dot" style={{background:"#ef4444"}} /><span className="cw-dot" style={{background:"#f59e0b"}} /><span className="cw-dot" style={{background:"#22c55e"}} /><span style={{flex:1}}/><span>{c.title?.toLowerCase().replace(/\s+/g,"_")}.py</span></div><div className="c-card-body"><div className="c-card-icon" style={{color:"var(--accent-b)"}}>{I[c.icon]||I.book}</div><h3>{c.title}</h3><p>{c.subtitle||""}</p><div className="c-meta">{c.duration&&<span>{I.clock} {c.duration}</span>}<div className="c-diff">{[1,2,3].map(d=><span key={d} className={`c-diff-dot ${d<=diff?"on":""}`}/>)}</div><span>{c.level}</span></div><div className="c-progress"><div className="c-progress-bar" style={{width:pct+"%"}}/></div>{enr&&<div style={{fontSize:11,color:"var(--text-m)",marginTop:4}}>{pct}% complété</div>}</div></div>)})}</div>{courses.length>3&&<div style={{textAlign:"center",marginTop:28}}><button className="btn-h btn-hs" onClick={() => navigate("catalog")}>Voir tout {I.arrow}</button></div>}</section>}
        <section style={{padding:"72px 36px",textAlign:"center",position:"relative",overflow:"hidden"}}><ConstellationBG intensity={.5} /><div style={{position:"relative",zIndex:1}}><h2 className="sec-title" style={{maxWidth:480,margin:"0 auto 14px"}}>Prêt à commencer ?</h2><p style={{color:"var(--text-2)",marginBottom:28,maxWidth:400,margin:"0 auto 28px",fontWeight:400}}>Connectez-vous avec votre adresse Dauphine. Premier accès gratuit.</p><button className="btn-h btn-hp" onClick={() => setAuthPage("register")} style={{animation:"glow 3s infinite"}}>Créer mon compte {I.arrow}</button></div></section>
        <footer className="footer"><div className="footer-brand"><div style={{display:"flex",alignItems:"center",gap:7}}><div className="nav-logo-mark" style={{width:26,height:26,fontSize:11}}>d</div><span style={{fontWeight:700,fontSize:15}}>dauia.com</span></div><p>Plateforme IA & Data — Paris-Dauphine PSL.</p></div><div className="footer-links"><div className="footer-col"><h5>Plateforme</h5><a onClick={() => navigate("catalog")}>Formations</a>{user && <a onClick={() => navigate("sandbox")}>Python Lab</a>}</div><div className="footer-col"><h5>Université</h5><a>Dauphine PSL</a><a>Contact</a></div></div></footer>
      </>)}

      {/* CATALOG */}
      {page==="catalog" && (<section className="section" style={{paddingTop:32}}>
        <div className="sec-label">Catalogue</div><h2 className="sec-title">Formations disponibles</h2><p className="sec-desc">Parcours créés par l'association DAU'IA.</p>
        {coursesLoading?(<div style={{textAlign:"center",padding:"60px 20px"}}><p style={{color:"var(--text-m)"}}>Chargement des formations...</p></div>)
        :courses.length===0?(<div className="empty"><div className="empty-icon">{I.inbox}</div><p>Aucune formation disponible pour le moment.</p>{user?.role==="moderateur"?<button className="btn-h btn-hp" onClick={() => navigate("admin")}>{I.plus} Créer une formation</button>:<p style={{fontSize:12}}>Les formations seront publiées prochainement.</p>}</div>)
        :(<div className="c-grid">{courses.map((c,i)=>{const diff=c.level==="Débutant"?1:c.level==="Intermédiaire"?2:3;const enr=enrollments.find(e=>e.course_id===c.id);const pct=enr?.progress?.percentage||0;const stepCount=c.step_count||flatSteps(c).length;return(<div key={c.id} className="c-card" style={{animation:`fadeUp .35s ${i*.06}s both`}} onClick={() => { if (user) startCourse(c); else setAuthPage("login"); }}><div className="c-card-bar"><span className="cw-dot" style={{background:"#ef4444"}} /><span className="cw-dot" style={{background:"#f59e0b"}} /><span className="cw-dot" style={{background:"#22c55e"}} /><span style={{flex:1}}/><span>{c.title?.toLowerCase().replace(/\s+/g,"_")}.py</span></div><div className="c-card-body"><div className="c-card-icon" style={{color:"var(--accent-b)"}}>{I[c.icon]||I.book}</div><h3>{c.title}</h3><p>{c.subtitle||c.description?.slice(0,80)||""}</p><div className="c-meta">{c.duration&&<span>{I.clock} {c.duration}</span>}<div className="c-diff">{[1,2,3].map(d=><span key={d} className={`c-diff-dot ${d<=diff?"on":""}`}/>)}</div><span>{c.level}</span>{stepCount>0&&<span>{stepCount} étapes</span>}</div>{c.tags?.length>0&&<div className="c-tags">{c.tags.map(t=><span key={t} className="tag">{t}</span>)}</div>}<div className="c-progress"><div className="c-progress-bar" style={{width:pct+"%"}}/></div>{enr?<div style={{fontSize:11,color:"var(--text-m)",marginTop:4}}>{pct}% complété</div>:<div style={{fontSize:11,color:"var(--accent-b)",marginTop:4}}>Commencer ce parcours</div>}</div></div>)})}</div>)}
      </section>)}

      {/* ADMIN */}
      {page==="admin"&&user?.role==="moderateur"&&(<section className="section" style={{paddingTop:32}}>
        {editingCourse!==null?(<div style={{animation:"fadeUp .35s both"}}>
          <button className="btn-sm" style={{marginBottom:20}} onClick={() => {setEditingCourse(null);setCourseForm({...emptyCourse});}}>{I.back} Retour</button>
          <h2 className="sec-title" style={{fontSize:24}}>{editingCourse?.id?"Modifier la formation":"Nouvelle formation"}</h2>
          <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:14,padding:28,marginTop:20}}>
            <div className="form-grid">
              <div><label style={{display:"block",fontSize:12,fontWeight:500,color:"var(--text-2)",marginBottom:5}}>Icone</label><div className="icon-picker">{courseIcons.map(ic=>(<div key={ic} className={`icon-opt ${courseForm.icon===ic?"sel":""}`} onClick={() => setCourseForm({...courseForm,icon:ic})} style={{color:"var(--accent-b)"}}>{I[ic]}</div>))}</div></div>
              <div><label style={{display:"block",fontSize:12,fontWeight:500,color:"var(--text-2)",marginBottom:5}}>Niveau</label><select className="inp" value={courseForm.level} onChange={e => setCourseForm({...courseForm,level:e.target.value})} style={{cursor:"pointer"}}><option>Débutant</option><option>Intermédiaire</option><option>Avancé</option><option>Débutant → Intermédiaire</option><option>Intermédiaire → Avancé</option></select></div>
              <div className="form-full"><label style={{display:"block",fontSize:12,fontWeight:500,color:"var(--text-2)",marginBottom:5}}>Titre *</label><input className="inp" placeholder="ex: Python pour la Data Science" value={courseForm.title} onChange={e => setCourseForm({...courseForm,title:e.target.value})} /></div>
              <div className="form-full"><label style={{display:"block",fontSize:12,fontWeight:500,color:"var(--text-2)",marginBottom:5}}>Sous-titre</label><input className="inp" placeholder="ex: De zéro à l'analyse de données" value={courseForm.subtitle} onChange={e => setCourseForm({...courseForm,subtitle:e.target.value})} /></div>
              <div className="form-full"><label style={{display:"block",fontSize:12,fontWeight:500,color:"var(--text-2)",marginBottom:5}}>Description</label><textarea className="textarea" placeholder="Objectifs et contenu de la formation..." value={courseForm.description} onChange={e => setCourseForm({...courseForm,description:e.target.value})} /></div>
              <div><label style={{display:"block",fontSize:12,fontWeight:500,color:"var(--text-2)",marginBottom:5}}>Durée</label><input className="inp" placeholder="ex: 32h" value={courseForm.duration} onChange={e => setCourseForm({...courseForm,duration:e.target.value})} /></div>
              <div><label style={{display:"block",fontSize:12,fontWeight:500,color:"var(--text-2)",marginBottom:5}}>Tags (virgules)</label><input className="inp" placeholder="Python, Pandas, NumPy" value={courseForm.tags} onChange={e => setCourseForm({...courseForm,tags:e.target.value})} /></div>
            </div>
            <div className="form-section"><h4>Modules &amp; Étapes</h4><p style={{fontSize:12,color:"var(--text-m)",marginBottom:12}}>Organisez votre cours en modules contenant des étapes (vidéos, leçons, code).</p>
              {courseForm.modules.map((mod,mi)=>{const updateMod=(key,val)=>{const ms=[...courseForm.modules];ms[mi]={...ms[mi],[key]:val};setCourseForm({...courseForm,modules:ms});};const updateStep=(si,key,val)=>{const ms=[...courseForm.modules];const steps=[...(ms[mi].steps||[])];steps[si]={...steps[si],[key]:val};ms[mi]={...ms[mi],steps};setCourseForm({...courseForm,modules:ms});};return(
                <div key={mi} style={{border:"1px solid var(--border)",borderRadius:10,padding:16,marginBottom:16,background:"rgba(255,255,255,.02)",animation:`slideR .3s ${mi*.05}s both`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                    <span style={{fontSize:11,fontWeight:700,color:"var(--accent-b)",letterSpacing:".5px"}}>MODULE {mi+1}</span>
                    <input className="inp" placeholder="Titre du module" value={mod.title} onChange={e=>updateMod("title",e.target.value)} style={{flex:1}} />
                    <div style={{display:"flex",gap:4}}>
                      {mi>0&&<button className="btn-sm" onClick={()=>{const ms=[...courseForm.modules];[ms[mi-1],ms[mi]]=[ms[mi],ms[mi-1]];setCourseForm({...courseForm,modules:ms});}}>↑</button>}
                      {mi<courseForm.modules.length-1&&<button className="btn-sm" onClick={()=>{const ms=[...courseForm.modules];[ms[mi],ms[mi+1]]=[ms[mi+1],ms[mi]];setCourseForm({...courseForm,modules:ms});}}>↓</button>}
                      {courseForm.modules.length>1&&<button className="btn-sm danger" onClick={()=>setCourseForm({...courseForm,modules:courseForm.modules.filter((_,j)=>j!==mi)})}>{I.trash}</button>}
                    </div>
                  </div>
                  {(mod.steps||[]).map((s,si)=>(<div key={si} style={{marginLeft:12,paddingLeft:12,borderLeft:"2px solid var(--border)",marginBottom:10,animation:`slideR .2s ${si*.03}s both`}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                      <span style={{fontSize:11,fontWeight:600,color:s.type==="video"?"#ef4444":s.type==="code"?"#22c55e":"#3b82f6"}}>{s.type==="video"?"Vidéo":s.type==="code"?"Code":"Leçon"} · {si+1}</span>
                      <div style={{flex:1}}/>{si>0&&<button className="btn-sm" style={{padding:"2px 6px"}} onClick={()=>{const ms=[...courseForm.modules];const st=[...(ms[mi].steps||[])];[st[si-1],st[si]]=[st[si],st[si-1]];ms[mi]={...ms[mi],steps:st};setCourseForm({...courseForm,modules:ms});}}>↑</button>}{si<(mod.steps||[]).length-1&&<button className="btn-sm" style={{padding:"2px 6px"}} onClick={()=>{const ms=[...courseForm.modules];const st=[...(ms[mi].steps||[])];[st[si],st[si+1]]=[st[si+1],st[si]];ms[mi]={...ms[mi],steps:st};setCourseForm({...courseForm,modules:ms});}}>↓</button>}<button className="btn-sm danger" style={{padding:"2px 6px"}} onClick={()=>{const ms=[...courseForm.modules];ms[mi]={...ms[mi],steps:(ms[mi].steps||[]).filter((_,j)=>j!==si)};setCourseForm({...courseForm,modules:ms});}}>✕</button>
                    </div>
                    <input className="inp" placeholder="Titre de l'étape" value={s.title} onChange={e=>updateStep(si,"title",e.target.value)} style={{marginBottom:4}} />
                    {s.type==="video"&&<><input className="inp" placeholder="URL YouTube" value={s.url||""} onChange={e=>updateStep(si,"url",e.target.value)} style={{marginBottom:4}} /><textarea className="textarea" placeholder="Transcription" value={s.transcription||""} onChange={e=>updateStep(si,"transcription",e.target.value)} style={{minHeight:60}} /><textarea className="textarea" placeholder="Ressources (un par ligne : nom | taille)" value={s.resources||""} onChange={e=>updateStep(si,"resources",e.target.value)} style={{minHeight:40}} /></>}
                    {s.type==="lesson"&&<textarea className="textarea" placeholder="Contenu de la leçon..." value={s.content||""} onChange={e=>updateStep(si,"content",e.target.value)} style={{minHeight:100}} />}
                    {s.type==="code"&&<><input className="inp" placeholder="Consigne" value={s.description||""} onChange={e=>updateStep(si,"description",e.target.value)} style={{marginBottom:4}} /><textarea className="textarea" placeholder="Code de départ" value={s.code||""} onChange={e=>updateStep(si,"code",e.target.value)} style={{fontFamily:"monospace",fontSize:12,minHeight:80}} /><textarea className="textarea" placeholder="Solution (auto-correction)" value={s.solution_code||""} onChange={e=>updateStep(si,"solution_code",e.target.value)} style={{fontFamily:"monospace",fontSize:12,minHeight:60}} /></>}
                  </div>))}
                  <div style={{display:"flex",gap:6,marginTop:8,marginLeft:12}}><button className="btn-sm" onClick={()=>{const ms=[...courseForm.modules];ms[mi]={...ms[mi],steps:[...(ms[mi].steps||[]),{...emptyStep,type:"video"}]};setCourseForm({...courseForm,modules:ms});}}>{I.play} Vidéo</button><button className="btn-sm" onClick={()=>{const ms=[...courseForm.modules];ms[mi]={...ms[mi],steps:[...(ms[mi].steps||[]),{...emptyStep,type:"lesson"}]};setCourseForm({...courseForm,modules:ms});}}>{I.file} Leçon</button><button className="btn-sm" onClick={()=>{const ms=[...courseForm.modules];ms[mi]={...ms[mi],steps:[...(ms[mi].steps||[]),{...emptyStep,type:"code"}]};setCourseForm({...courseForm,modules:ms});}}>{I.terminal} Code</button></div>
                </div>);})}
              <button className="btn-sm primary" style={{marginTop:8}} onClick={() => setCourseForm({...courseForm,modules:[...courseForm.modules,{title:"Module "+(courseForm.modules.length+1),steps:[]}]})}>{I.plus} Nouveau module</button>
            </div>
            <div style={{display:"flex",gap:10,marginTop:28,justifyContent:"flex-end"}}><button className="btn-sm" onClick={() => {setEditingCourse(null);setCourseForm({...emptyCourse});}}>Annuler</button><button className="btn-sm primary" onClick={saveCourse}>{I.save} Enregistrer</button></div>
          </div>
        </div>):(<>
          <div className="admin-header"><div><div className="sec-label">Administration</div><h2 className="sec-title" style={{fontSize:26,marginBottom:0}}>Gestion des formations</h2></div><button className="btn-sm primary" onClick={() => {setEditingCourse({});setCourseForm({...emptyCourse});}}>{I.plus} Nouvelle formation</button></div>
          {courses.length===0?(<div className="empty"><div className="empty-icon">{I.clipboard}</div><p>Aucune formation. Commencez par en créer une.</p><button className="btn-h btn-hp" style={{fontSize:13,padding:"10px 22px"}} onClick={() => {setEditingCourse({});setCourseForm({...emptyCourse});}}>{I.plus} Créer la première</button></div>)
          :(<div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:13,overflow:"hidden"}}><table className="admin-table"><thead><tr><th></th><th>Formation</th><th>Niveau</th><th>Durée</th><th>Modules / Étapes</th><th>Actions</th></tr></thead><tbody>{courses.map((c,i)=>(<tr key={c.id} style={{animation:`slideR .3s ${i*.05}s both`}}><td style={{width:50,textAlign:"center",color:"var(--accent-b)"}}>{I[c.icon]||I.book}</td><td><div style={{fontWeight:600,fontSize:13.5}}>{c.title}</div><div style={{fontSize:11.5,color:"var(--text-m)"}}>{c.subtitle}</div></td><td><span className="tag">{c.level}</span></td><td style={{color:"var(--text-2)"}}>{c.duration||"—"}</td><td style={{color:"var(--text-2)"}}>{c.step_count ?? flatSteps(c).length} étapes</td><td><div className="admin-actions"><button className="btn-sm" onClick={() => startEdit(c)}>{I.edit} Modifier</button><button className="btn-sm danger" onClick={() => deleteCourse(c.id)}>{I.trash}</button></div></td></tr>))}</tbody></table></div>)}
        </>)}
      </section>)}

      {/* ═══ HYPRLAND SANDBOX ═══ */}
      {page==="sandbox"&&(<div className="hypr-sandbox">
        {/* Hyprland top bar */}
        <div className="hypr-bar">
          <div className="hypr-bar-left"><div className="hypr-logo">d</div><span className="hypr-bar-title">DAU'IA WM</span></div>
          <div className="hypr-layout-ctrl">
            <span className="hypr-layout-label">Layout</span>
            <button className={sbLayout==="row"?"act":""} onClick={()=>setSbLayout("row")} title="Horizontal">⫼</button>
            <button className={sbLayout==="col"?"act":""} onClick={()=>setSbLayout("col")} title="Vertical">⊟</button>
          </div>
          <div className="hypr-bar-right">
            <button className="btn-sm hypr-btn" onClick={() => setSandboxCode("")}>{I.trash} Vider</button>
            <button className="btn-sm hypr-btn-primary" onClick={runSandbox} disabled={isRunning}>{I.play} {isRunning ? "EXÉCUTION..." : (currentStep?.solution_code ? "VALIDER" : "EXÉCUTER")}</button>
          </div>
        </div>

        {/* Course context bar */}
        {activeCourse && currentStep && (
          <div className="hypr-course-bar">
            <button className="btn-sm hypr-btn" onClick={() => { setActiveCourse(null); setConsoleOut(""); }}>{I.back} Quitter</button>
            <span className="hypr-course-info">
              <span style={{color:"#22d3ee",fontWeight:700}}>{activeCourse.title}</span>
              <span style={{color:"#475569"}}> &rsaquo; </span>
              <span>{activeCourse.modules[activeModuleIdx]?.title}</span>
              <span style={{color:"#475569"}}> &rsaquo; </span>
              <span style={{color:"#34d399"}}>Étape {activeStepIdx + 1}</span>
            </span>
            {currentStep.description && <span className="hypr-step-desc">{currentStep.description}</span>}
          </div>
        )}

        {/* Tiling area */}
        <div className="hypr-tiles" style={{flexDirection: sbLayout}}>
          {sbPanels.map((panelId, idx) => {
            const isFocused = sbFocused === panelId;
            const titles = { editor: "ÉDITEUR PYTHON", console: "CONSOLE SORTIE", terminal: "TERMINAL" };
            const icons = { editor: "⟨/⟩", console: "▶", terminal: "$_" };
            return (
              <div
                key={panelId}
                className={`hypr-tile ${isFocused ? "focused" : ""}`}
                data-panel={panelId}
                onClick={() => setSbFocused(panelId)}
                style={{flex: panelId === "editor" ? 1.4 : 1}}
              >
                {/* Hyprland titlebar — draggable */}
                <div
                  className={`hypr-titlebar ${isFocused ? "active" : ""}`}
                  onMouseDown={(e) => sbDragStart(panelId, e)}
                  style={{cursor:"grab"}}
                >
                  <span className="hypr-titlebar-icon">{icons[panelId]}</span>
                  <span className="hypr-titlebar-name">{titles[panelId]}</span>
                  <div className="hypr-titlebar-arrows">
                    <button onClick={(e)=>{e.stopPropagation();sbMovePanel(idx,-1);}} disabled={idx===0}>
                      {sbLayout==="row" ? "←" : "↑"}
                    </button>
                    <button onClick={(e)=>{e.stopPropagation();sbMovePanel(idx,1);}} disabled={idx===sbPanels.length-1}>
                      {sbLayout==="row" ? "→" : "↓"}
                    </button>
                  </div>
                </div>

                {/* Panel content */}
                <div className="hypr-tile-body">
                  {panelId === "editor" && (<>
                    <div className="hypr-libs">{["numpy","pandas","matplotlib","scikit-learn","scipy","seaborn","statsmodels"].map(l=>(<span key={l} className="hypr-lib">{l}</span>))}</div>
                    <div className="hypr-editor-area"><div className="hypr-ln">{sandboxCode.split("\n").map((_,i)=><div key={i}>{i+1}</div>)}</div><textarea className="hypr-ta" value={sandboxCode} onChange={e=>setSandboxCode(e.target.value)} onKeyDown={handleTab} spellCheck={false} /></div>
                  </>)}
                  {panelId === "console" && (
                    <div className="hypr-console">{isRunning?<span dangerouslySetInnerHTML={{__html:consoleOut||'<span class="hypr-blink">&gt;&gt;&gt; Exécution en cours...</span>'}}/>:consoleOut?<span dangerouslySetInnerHTML={{__html:consoleOut}}/>:<span style={{color:"#475569"}}>{">>>"} Cliquez {currentStep?.solution_code?"VALIDER":"EXÉCUTER"} pour lancer votre code.</span>}</div>
                  )}
                  {panelId === "terminal" && (<>
                    <div className="hypr-console hypr-term"><span className="hypr-prompt">dauia@workspace</span>:<span style={{color:"#22d3ee"}}>~</span>$ {isRunning ? <span className="hypr-blink">python main.py</span> : consoleOut ? <>python main.py{"\n"}<span style={{color:"#94a3b8"}}>{stripHtml(consoleOut)}</span></> : ""}</div>
                    <div className="hypr-status"><span>Python 3.11 · Pyodide (WASM)</span><span>numpy · pandas · sklearn · matplotlib</span></div>
                  </>)}
                </div>
              </div>
            );
          })}
        </div>
      </div>)}

      </div>
    </div>
  );
}
