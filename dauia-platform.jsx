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
            {user.role === "admin" && <span className="tag" style={{ marginTop: 4, display: "inline-block", borderColor: "rgba(74,124,255,.3)", color: "var(--accent-b)" }}>Admin</span>}
          </div>
          {user.role === "admin" && <button onClick={() => { onAdmin(); setOpen(false); }}>{I.settings} Administration</button>}
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
  const [showPw, setShowPw] = useState(false);
  const [page, setPage] = useState("home");
  const [pageTransition, setPageTransition] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const mainRef = useRef(null);
  const [courses, setCourses] = useState([]);
  const emptyCourse = { title: "", subtitle: "", description: "", icon: "📘", level: "Débutant", duration: "", tags: "", modules: [{ title: "", lessons: "" }] };
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseForm, setCourseForm] = useState({ ...emptyCourse });
  const [adminNotif, setAdminNotif] = useState("");
  const [sandboxCode, setSandboxCode] = useState("# dauia.com — Python AI Sandbox\n# Bibliothèques : numpy, pandas, matplotlib,\n# scikit-learn, scipy, seaborn, statsmodels\n\nimport numpy as np\nimport pandas as pd\nfrom sklearn.linear_model import LinearRegression\n\nX = np.array([[1],[2],[3],[4],[5]])\ny = np.array([2.1, 4.0, 5.8, 8.1, 9.9])\n\nmodel = LinearRegression()\nmodel.fit(X, y)\n\nprint(f\"Coefficient : {model.coef_[0]:.2f}\")\nprint(f\"Intercept   : {model.intercept_:.2f}\")\nprint(f\"R² score    : {model.score(X, y):.4f}\")\nprint(f\"Prédiction x=10 : {model.predict([[10]])[0]:.2f}\")\n");
  const [consoleOut, setConsoleOut] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const navigate = (p) => { setPageTransition(false); setTimeout(() => { setPage(p); setPageTransition(true); if (mainRef.current) mainRef.current.scrollTop = 0; }, 180); };

  useEffect(() => { const el = mainRef.current; if (!el) return; const fn = () => setScrollY(el.scrollTop); el.addEventListener("scroll", fn, { passive: true }); return () => el.removeEventListener("scroll", fn); }, [page]);

  const isDauphineEmail = (email) => /@(dauphine\.psl\.eu|dauphine\.eu|dauphine\.psl\.fr)$/i.test(email);

  const handleAuth = (e) => {
    e.preventDefault(); setAuthError("");
    if (!isDauphineEmail(authForm.email)) { setAuthError("Seules les adresses @dauphine.psl.eu sont acceptées."); return; }
    if (authPage === "register") {
      if (!authForm.name.trim()) { setAuthError("Le nom est requis."); return; }
      if (authForm.password.length < 8) { setAuthError("Minimum 8 caractères pour le mot de passe."); return; }
      if (authForm.password !== authForm.confirmPassword) { setAuthError("Les mots de passe ne correspondent pas."); return; }
      setUser({ email: authForm.email, name: authForm.name, role: authForm.email.startsWith("admin") ? "admin" : "student" });
    } else {
      if (!authForm.password) { setAuthError("Mot de passe requis."); return; }
      setUser({ email: authForm.email, name: authForm.email.split("@")[0].replace(".", " "), role: authForm.email.startsWith("admin") ? "admin" : "student" });
    }
    setAuthPage(null); setAuthForm({ email: "", password: "", name: "", confirmPassword: "" });
  };

  const saveCourse = () => {
    if (!courseForm.title.trim()) { setAdminNotif("⚠️ Le titre est requis."); setTimeout(() => setAdminNotif(""), 2500); return; }
    const c = { ...courseForm, id: editingCourse?.id || "c-" + Date.now(), tags: typeof courseForm.tags === "string" ? courseForm.tags.split(",").map(t => t.trim()).filter(Boolean) : courseForm.tags, createdAt: editingCourse?.createdAt || new Date().toISOString() };
    setCourses(prev => { const idx = prev.findIndex(x => x.id === c.id); if (idx >= 0) { const n = [...prev]; n[idx] = c; return n; } return [...prev, c]; });
    setEditingCourse(null); setCourseForm({ ...emptyCourse });
    setAdminNotif("✓ Formation enregistrée !"); setTimeout(() => setAdminNotif(""), 2500);
  };

  const deleteCourse = (id) => { setCourses(prev => prev.filter(c => c.id !== id)); setAdminNotif("✓ Formation supprimée."); setTimeout(() => setAdminNotif(""), 2500); };

  const startEdit = (c) => { setEditingCourse(c); setCourseForm({ ...c, tags: Array.isArray(c.tags) ? c.tags.join(", ") : c.tags }); };

  const runSandbox = async () => {
    setIsRunning(true); setConsoleOut(">>> Exécution en cours...\n");
    await new Promise(r => setTimeout(r, 700 + Math.random() * 500));
    let out = "";
    const prints = [...sandboxCode.matchAll(/print\s*\(\s*f?"([^"]*?)"\s*\)/g)];
    if (prints.length > 0) prints.forEach(m => { out += m[1].replace(/\{[^}]+\}/g, () => (Math.random() * 10).toFixed(2)) + "\n"; });
    else out = "(aucune sortie — ajoutez des print())";
    setConsoleOut(out); setIsRunning(false);
  };

  const handleTab = (e) => { if (e.key === "Tab") { e.preventDefault(); const s = e.target.selectionStart; setSandboxCode(sandboxCode.substring(0, s) + "    " + sandboxCode.substring(e.target.selectionEnd)); setTimeout(() => { e.target.selectionStart = e.target.selectionEnd = s + 4; }, 0); } };

  return (
    <div className="root" ref={mainRef}>
      <style>{`
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
:root{--bg:#070a14;--bg-card:#0d1120;--bg-surface:#111730;--bg-elevated:#182040;--bg-input:#0a0e1c;--border:#1a2040;--border-l:#252e55;--text:#eef0ff;--text-2:#9aa2c4;--text-m:#5a6290;--accent:#4a7cff;--accent-b:#6b9aff;--accent-g:rgba(74,124,255,.1);--accent-gs:rgba(74,124,255,.22);--success:#34d399;--error:#f87171;--warn:#fbbf24;--font:'Poppins',sans-serif;--mono:'JetBrains Mono',monospace;}
*{box-sizing:border-box;margin:0;padding:0;}.root{height:100vh;width:100vw;overflow-x:hidden;overflow-y:auto;background:var(--bg);color:var(--text);font-family:var(--font);font-size:14px;-webkit-font-smoothing:antialiased;}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes scaleIn{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}@keyframes slideR{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)}}@keyframes glow{0%,100%{box-shadow:0 0 20px rgba(74,124,255,.08)}50%{box-shadow:0 0 40px rgba(74,124,255,.18)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.page-in{animation:fadeUp .45s cubic-bezier(.22,1,.36,1) both}.page-out{opacity:0;transform:translateY(-8px);transition:all .18s}
.nav{position:sticky;top:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 36px;height:60px;transition:all .3s}.nav.scrolled{background:rgba(7,10,20,.88);backdrop-filter:blur(16px) saturate(1.3);border-bottom:1px solid var(--border)}
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
.cw pre{padding:18px;font-family:var(--mono);font-size:12.5px;line-height:1.8;color:#c4b5fd;overflow-x:auto}.kw{color:#c792ea}.fn{color:#82aaff}.st{color:#a5d6a7}.cm{color:#5a6290;font-style:italic}.nb{color:#f78c6c}.op{color:#89ddff}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);border-top:1px solid var(--border);border-bottom:1px solid var(--border)}.stat{background:var(--bg);padding:32px 18px;text-align:center}.stat-n{font-size:32px;font-weight:700;margin-bottom:4px}.stat-l{color:var(--text-m);font-size:12.5px}
.section{padding:72px 36px;max-width:1140px;margin:0 auto}.sec-label{font-size:11px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:var(--accent);margin-bottom:10px}.sec-title{font-size:clamp(26px,3.5vw,38px);font-weight:700;line-height:1.15;letter-spacing:-.4px;margin-bottom:14px}.sec-desc{color:var(--text-2);max-width:500px;line-height:1.7;margin-bottom:40px;font-weight:400}
.feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.feat{padding:28px;border-radius:13px;background:var(--bg-card);border:1px solid var(--border);transition:all .25s}.feat:hover{border-color:var(--border-l);transform:translateY(-2px)}.feat-ic{width:40px;height:40px;border-radius:9px;background:var(--accent-g);border:1px solid rgba(74,124,255,.12);display:flex;align-items:center;justify-content:center;color:var(--accent-b);margin-bottom:15px}.feat h4{font-size:15px;font-weight:600;margin-bottom:6px}.feat p{color:var(--text-2);font-size:12.5px;line-height:1.7;font-weight:400}
.c-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px}
.c-card{background:var(--bg-card);border:1px solid var(--border);border-radius:13px;padding:24px;cursor:pointer;transition:all .25s;position:relative;overflow:hidden}.c-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--accent);opacity:0;transition:opacity .25s}.c-card:hover{border-color:var(--border-l);transform:translateY(-3px);box-shadow:0 10px 32px rgba(0,0,0,.25)}.c-card:hover::before{opacity:1}
.c-card-icon{font-size:28px;margin-bottom:14px;width:48px;height:48px;display:flex;align-items:center;justify-content:center;border-radius:11px;background:var(--bg-surface)}.c-card h3{font-size:16px;font-weight:600;margin-bottom:4px}.c-card p{color:var(--text-2);font-size:12.5px;line-height:1.6;margin-bottom:14px;font-weight:400}
.c-meta{display:flex;gap:12px;font-size:11.5px;color:var(--text-m);align-items:center;flex-wrap:wrap}.c-meta span{display:flex;align-items:center;gap:3px}
.tag{padding:2px 9px;border-radius:5px;font-size:10.5px;background:var(--bg-surface);color:var(--text-2);border:1px solid var(--border)}
.empty{text-align:center;padding:60px 20px;color:var(--text-m)}.empty-icon{font-size:48px;margin-bottom:16px;opacity:.4}.empty p{margin-bottom:20px;font-size:14px}
.modal-overlay{position:fixed;inset:0;z-index:200;background:rgba(4,6,12,.8);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:fadeIn .2s both}
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
.sandbox{display:flex;height:calc(100vh - 60px);overflow:hidden}
.sb-editor{flex:1;display:flex;flex-direction:column;border-right:1px solid var(--border)}
.sb-header{height:46px;display:flex;align-items:center;padding:0 16px;gap:10px;border-bottom:1px solid var(--border);background:var(--bg-card);flex-shrink:0}
.sb-editor-area{flex:1;display:flex;overflow:hidden;background:var(--bg-input)}
.ln{padding:14px 0;text-align:right;user-select:none;font-family:var(--mono);font-size:12px;line-height:1.75;color:var(--text-m);min-width:36px;padding-right:10px;border-right:1px solid var(--border);opacity:.5}
.code-ta{width:100%;height:100%;background:transparent;color:#c4b5fd;border:none;outline:none;font-family:var(--mono);font-size:13px;line-height:1.75;resize:none;padding:14px;tab-size:4;white-space:pre;overflow-wrap:normal;overflow-x:auto}.code-ta::selection{background:rgba(74,124,255,.22)}
.sb-output{width:42%;min-width:280px;display:flex;flex-direction:column;background:var(--bg-input)}
.sb-out-head{height:46px;display:flex;align-items:center;padding:0 16px;gap:6px;border-bottom:1px solid var(--border);background:var(--bg-card);font-size:12px;font-weight:600;color:var(--text-2);flex-shrink:0}
.sb-console{flex:1;overflow:auto;padding:16px;font-family:var(--mono);font-size:12px;line-height:1.75;white-space:pre-wrap;word-break:break-word;color:#a5b4fc}
.sb-status{padding:8px 14px;border-top:1px solid var(--border);font-size:10px;color:var(--text-m);display:flex;justify-content:space-between;flex-shrink:0}
.sb-libs{padding:12px 16px;border-bottom:1px solid var(--border);background:var(--bg-card);display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0}.sb-lib{padding:3px 9px;border-radius:5px;font-size:10px;background:var(--bg-surface);color:var(--text-2);border:1px solid var(--border);font-family:var(--mono)}
.footer{border-top:1px solid var(--border);padding:40px 36px 28px;display:flex;justify-content:space-between;align-items:start;max-width:1140px;margin:60px auto 0;flex-wrap:wrap;gap:28px}
.footer-brand p{color:var(--text-m);font-size:12px;max-width:250px;line-height:1.7;margin-top:8px;font-weight:400}
.footer-links{display:flex;gap:40px;flex-wrap:wrap}.footer-col h5{font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-m);margin-bottom:12px}.footer-col a{display:block;font-size:12.5px;color:var(--text-2);text-decoration:none;padding:3px 0;cursor:pointer;transition:color .15s;font-weight:400}.footer-col a:hover{color:var(--accent-b)}
.user-pill{display:flex;align-items:center;gap:7px;padding:5px 12px 5px 6px;border-radius:20px;background:var(--bg-surface);border:1px solid var(--border);cursor:pointer;font-size:12px;font-weight:500;color:var(--text-2);transition:all .15s}.user-pill:hover{border-color:var(--border-l);color:var(--text)}
.user-av{width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#7c3aed);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff}
.user-menu{position:absolute;top:54px;right:0;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:6px;min-width:180px;box-shadow:0 12px 32px rgba(0,0,0,.3);animation:scaleIn .15s both;z-index:110}.user-menu button{display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;border-radius:7px;border:none;background:none;color:var(--text-2);font-family:var(--font);font-size:12.5px;cursor:pointer;transition:all .12s;text-align:left}.user-menu button:hover{background:var(--bg-surface);color:var(--text)}
@media(max-width:768px){.hero{padding:50px 18px 40px}.nav{padding:0 14px}.section{padding:44px 18px}.feat-grid,.c-grid{grid-template-columns:1fr}.stats{grid-template-columns:1fr 1fr}.sandbox{flex-direction:column}.sb-output{width:100%}.footer{flex-direction:column}.form-grid{grid-template-columns:1fr}.nav-links{gap:2px}}
      `}</style>

      {/* NAV */}
      <nav className={`nav ${scrollY > 16 ? "scrolled" : ""}`}>
        <div className="nav-logo" onClick={() => navigate("home")}><div className="nav-logo-mark">d</div><span className="nav-logo-txt">dauia</span></div>
        <div className="nav-links">
          <button className={`nav-l ${page==="home"?"act":""}`} onClick={() => navigate("home")}>{I.home} Accueil</button>
          <button className={`nav-l ${page==="catalog"?"act":""}`} onClick={() => navigate("catalog")}>{I.grid} Formations</button>
          <button className={`nav-l ${page==="sandbox"?"act":""}`} onClick={() => {if(!user){setAuthPage("login");return;} navigate("sandbox");}}>{I.terminal} Python Lab</button>
          {user?.role==="admin" && <button className={`nav-l ${page==="admin"?"act":""}`} onClick={() => navigate("admin")}>{I.settings} Admin</button>}
          {user ? <UserMenu user={user} onLogout={() => {setUser(null);navigate("home");}} onAdmin={() => navigate("admin")} />
            : <button className="nav-cta" onClick={() => setAuthPage("login")}>Se connecter</button>}
        </div>
      </nav>

      {/* AUTH MODAL */}
      {authPage && (
        <div className="modal-overlay" onClick={() => setAuthPage(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setAuthPage(null)}>{I.x}</button>
            <h2>{authPage==="login"?"Connexion":"Créer un compte"}</h2>
            <p className="sub">{authPage==="login"?"Accédez à votre espace dauia.":"Rejoignez la communauté dauia."}</p>
            <div className="dauphine-badge">{I.lock} Réservé aux adresses @dauphine.psl.eu</div>
            {authError && <div className="auth-err">{authError}</div>}
            <form onSubmit={handleAuth}>
              {authPage==="register" && <div className="field"><label>Nom complet</label><input className="inp" placeholder="Prénom Nom" value={authForm.name} onChange={e => setAuthForm({...authForm,name:e.target.value})} /></div>}
              <div className="field"><label>Email Dauphine</label><input className="inp" type="email" placeholder="prenom.nom@dauphine.psl.eu" value={authForm.email} onChange={e => setAuthForm({...authForm,email:e.target.value})} /></div>
              <div className="field"><label>Mot de passe</label><div className="field-input"><input className="inp" type={showPw?"text":"password"} placeholder="••••••••" value={authForm.password} onChange={e => setAuthForm({...authForm,password:e.target.value})} style={{paddingRight:36}} /><button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>{showPw?I.eyeOff:I.eye}</button></div></div>
              {authPage==="register" && <div className="field"><label>Confirmer le mot de passe</label><input className="inp" type="password" placeholder="••••••••" value={authForm.confirmPassword} onChange={e => setAuthForm({...authForm,confirmPassword:e.target.value})} /></div>}
              <button type="submit" className="btn-auth">{authPage==="login"?"Se connecter":"Créer mon compte"}</button>
            </form>
            <div className="auth-switch">{authPage==="login"?<>Pas de compte ? <a onClick={() => {setAuthPage("register");setAuthError("");}}>S'inscrire</a></>:<>Déjà un compte ? <a onClick={() => {setAuthPage("login");setAuthError("");}}>Se connecter</a></>}</div>
          </div>
        </div>
      )}

      {adminNotif && <div className="notif">{adminNotif}</div>}

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
            <button className="btn-h btn-hs" onClick={() => {if(!user){setAuthPage("login");return;} navigate("sandbox");}}>Ouvrir le Sandbox IA</button>
          </div>
          <div className="cw">
            <div className="cw-bar"><span className="cw-dot" style={{background:"#ef4444"}} /><span className="cw-dot" style={{background:"#f59e0b"}} /><span className="cw-dot" style={{background:"#22c55e"}} /><span style={{flex:1}} /><span style={{fontSize:10.5,color:"var(--text-m)"}}>sandbox.py</span></div>
            <pre><span className="cm"># dauia.com — Python AI Sandbox</span>{"\n"}<span className="kw">import</span> numpy <span className="kw">as</span> np{"\n"}<span className="kw">from</span> sklearn.ensemble <span className="kw">import</span> RandomForestClassifier{"\n\n"}model <span className="op">=</span> <span className="fn">RandomForestClassifier</span>(n_estimators<span className="op">=</span><span className="nb">100</span>){"\n"}model.<span className="fn">fit</span>(X_train, y_train){"\n\n"}<span className="fn">print</span>(<span className="st">f"Accuracy: </span>{"{model.score(X_test, y_test):.1%}"}<span className="st">"</span>){"\n"}<span className="cm"># → Accuracy: 94.2%</span> <span style={{color:"var(--success)"}}>✓</span></pre>
          </div>
        </section>
        <div className="stats">{[{n:12000,s:"+",l:"Étudiants Dauphine"},{n:6,s:"",l:"Parcours certifiants"},{n:94,s:"%",l:"Taux de complétion"},{n:48,s:"h",l:"Contenu disponible"}].map((s,i)=>(<div key={i} className="stat"><div className="stat-n"><AnimCounter end={s.n} />{s.s}</div><div className="stat-l">{s.l}</div></div>))}</div>
        <section className="section">
          <div className="sec-label">Pourquoi dauia</div><h2 className="sec-title">Conçue pour l'IA</h2><p className="sec-desc">Du code, des retours immédiats, des projets réels. Pas de vidéos passives.</p>
          <div className="feat-grid">
            {[{ic:I.terminal,t:"Sandbox Python IA",d:"NumPy, Pandas, Scikit-learn, Matplotlib. Zéro installation, tout dans le navigateur."},{ic:I.play,t:"Exécution WebAssembly",d:"Pyodide fait tourner Python nativement. Vos données ne quittent jamais votre machine."},{ic:I.settings,t:"Espace admin",d:"Les enseignants créent et gèrent les formations directement depuis l'interface."},{ic:I.user,t:"Accès Dauphine exclusif",d:"Authentification réservée aux étudiants et staff (@dauphine.psl.eu)."},{ic:I.image,t:"Graphiques en direct",d:"Matplotlib et Seaborn s'affichent à côté de votre code en temps réel."},{ic:I.check,t:"Open source",d:"Architecture modulaire React + PHP. Déployable sur votre propre infrastructure."}].map((f,i)=>(
              <div key={i} className="feat" style={{animation:`fadeUp .4s ${i*.07}s both`}}><div className="feat-ic">{f.ic}</div><h4>{f.t}</h4><p>{f.d}</p></div>
            ))}
          </div>
        </section>
        {courses.length > 0 && <section className="section"><div className="sec-label">Formations</div><h2 className="sec-title">Parcours disponibles</h2><div className="c-grid">{courses.slice(0,3).map((c,i)=>(<div key={c.id} className="c-card" style={{animation:`fadeUp .4s ${i*.08}s both`}} onClick={() => navigate("catalog")}><div className="c-card-icon">{c.icon}</div><h3>{c.title}</h3><p>{c.subtitle||""}</p><div className="c-meta">{c.duration&&<span>{I.clock} {c.duration}</span>}<span>{c.level}</span></div></div>))}</div>{courses.length>3&&<div style={{textAlign:"center",marginTop:28}}><button className="btn-h btn-hs" onClick={() => navigate("catalog")}>Voir tout {I.arrow}</button></div>}</section>}
        <section style={{padding:"72px 36px",textAlign:"center",position:"relative",overflow:"hidden"}}><ConstellationBG intensity={.5} /><div style={{position:"relative",zIndex:1}}><h2 className="sec-title" style={{maxWidth:480,margin:"0 auto 14px"}}>Prêt à commencer ?</h2><p style={{color:"var(--text-2)",marginBottom:28,maxWidth:400,margin:"0 auto 28px",fontWeight:400}}>Connectez-vous avec votre adresse Dauphine. Premier accès gratuit.</p><button className="btn-h btn-hp" onClick={() => setAuthPage("register")} style={{animation:"glow 3s infinite"}}>Créer mon compte {I.arrow}</button></div></section>
        <footer className="footer"><div className="footer-brand"><div style={{display:"flex",alignItems:"center",gap:7}}><div className="nav-logo-mark" style={{width:26,height:26,fontSize:11}}>d</div><span style={{fontWeight:700,fontSize:15}}>dauia.com</span></div><p>Plateforme IA & Data — Paris-Dauphine PSL.</p></div><div className="footer-links"><div className="footer-col"><h5>Plateforme</h5><a onClick={() => navigate("catalog")}>Formations</a><a onClick={() => navigate("sandbox")}>Python Lab</a></div><div className="footer-col"><h5>Université</h5><a>Dauphine PSL</a><a>Contact</a></div></div></footer>
      </>)}

      {/* CATALOG */}
      {page==="catalog" && (<section className="section" style={{paddingTop:32}}>
        <div className="sec-label">Catalogue</div><h2 className="sec-title">Formations disponibles</h2><p className="sec-desc">Parcours créés par les enseignants de Dauphine.</p>
        {courses.length===0?(<div className="empty"><div className="empty-icon">📭</div><p>Aucune formation disponible pour le moment.</p>{user?.role==="admin"?<button className="btn-h btn-hp" onClick={() => navigate("admin")}>{I.plus} Créer une formation</button>:<p style={{fontSize:12}}>Les formations seront publiées prochainement.</p>}</div>)
        :(<div className="c-grid">{courses.map((c,i)=>(<div key={c.id} className="c-card" style={{animation:`fadeUp .35s ${i*.06}s both`}}><div className="c-card-icon">{c.icon}</div><h3>{c.title}</h3><p>{c.subtitle||c.description?.slice(0,80)||""}</p><div className="c-meta">{c.duration&&<span>{I.clock} {c.duration}</span>}<span>{c.level}</span>{c.modules?.length>0&&<span>{c.modules.filter(m=>m.title).length} modules</span>}</div>{c.tags?.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:12}}>{c.tags.map(t=><span key={t} className="tag">{t}</span>)}</div>}</div>))}</div>)}
      </section>)}

      {/* ADMIN */}
      {page==="admin"&&user?.role==="admin"&&(<section className="section" style={{paddingTop:32}}>
        {editingCourse!==null?(<div style={{animation:"fadeUp .35s both"}}>
          <button className="btn-sm" style={{marginBottom:20}} onClick={() => {setEditingCourse(null);setCourseForm({...emptyCourse});}}>{I.back} Retour</button>
          <h2 className="sec-title" style={{fontSize:24}}>{editingCourse?.id?"Modifier la formation":"Nouvelle formation"}</h2>
          <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:14,padding:28,marginTop:20}}>
            <div className="form-grid">
              <div><label style={{display:"block",fontSize:12,fontWeight:500,color:"var(--text-2)",marginBottom:5}}>Icône</label><div className="icon-picker">{["📘","🐍","🧠","⚡","💬","📊","🗄️","🔬","🎯","🚀","🤖","📐"].map(ic=>(<div key={ic} className={`icon-opt ${courseForm.icon===ic?"sel":""}`} onClick={() => setCourseForm({...courseForm,icon:ic})}>{ic}</div>))}</div></div>
              <div><label style={{display:"block",fontSize:12,fontWeight:500,color:"var(--text-2)",marginBottom:5}}>Niveau</label><select className="inp" value={courseForm.level} onChange={e => setCourseForm({...courseForm,level:e.target.value})} style={{cursor:"pointer"}}><option>Débutant</option><option>Intermédiaire</option><option>Avancé</option><option>Débutant → Intermédiaire</option><option>Intermédiaire → Avancé</option></select></div>
              <div className="form-full"><label style={{display:"block",fontSize:12,fontWeight:500,color:"var(--text-2)",marginBottom:5}}>Titre *</label><input className="inp" placeholder="ex: Python pour la Data Science" value={courseForm.title} onChange={e => setCourseForm({...courseForm,title:e.target.value})} /></div>
              <div className="form-full"><label style={{display:"block",fontSize:12,fontWeight:500,color:"var(--text-2)",marginBottom:5}}>Sous-titre</label><input className="inp" placeholder="ex: De zéro à l'analyse de données" value={courseForm.subtitle} onChange={e => setCourseForm({...courseForm,subtitle:e.target.value})} /></div>
              <div className="form-full"><label style={{display:"block",fontSize:12,fontWeight:500,color:"var(--text-2)",marginBottom:5}}>Description</label><textarea className="textarea" placeholder="Objectifs et contenu de la formation..." value={courseForm.description} onChange={e => setCourseForm({...courseForm,description:e.target.value})} /></div>
              <div><label style={{display:"block",fontSize:12,fontWeight:500,color:"var(--text-2)",marginBottom:5}}>Durée</label><input className="inp" placeholder="ex: 32h" value={courseForm.duration} onChange={e => setCourseForm({...courseForm,duration:e.target.value})} /></div>
              <div><label style={{display:"block",fontSize:12,fontWeight:500,color:"var(--text-2)",marginBottom:5}}>Tags (virgules)</label><input className="inp" placeholder="Python, Pandas, NumPy" value={courseForm.tags} onChange={e => setCourseForm({...courseForm,tags:e.target.value})} /></div>
            </div>
            <div className="form-section"><h4>Modules</h4>
              {courseForm.modules.map((m,i)=>(<div key={i} className="module-row" style={{animation:`slideR .3s ${i*.05}s both`}}><span style={{fontSize:12,color:"var(--text-m)",width:22,textAlign:"center",flexShrink:0}}>{i+1}</span><input className="inp" placeholder="Nom du module" value={m.title} onChange={e => {const ms=[...courseForm.modules];ms[i]={...ms[i],title:e.target.value};setCourseForm({...courseForm,modules:ms});}} style={{flex:1}} /><input className="inp" placeholder="Leçons" value={m.lessons} onChange={e => {const ms=[...courseForm.modules];ms[i]={...ms[i],lessons:e.target.value};setCourseForm({...courseForm,modules:ms});}} style={{width:80}} />{courseForm.modules.length>1&&<button className="btn-sm danger" onClick={() => setCourseForm({...courseForm,modules:courseForm.modules.filter((_,j)=>j!==i)})}>{I.trash}</button>}</div>))}
              <button className="btn-sm" style={{marginTop:8}} onClick={() => setCourseForm({...courseForm,modules:[...courseForm.modules,{title:"",lessons:""}]})}>{I.plus} Module</button>
            </div>
            <div style={{display:"flex",gap:10,marginTop:28,justifyContent:"flex-end"}}><button className="btn-sm" onClick={() => {setEditingCourse(null);setCourseForm({...emptyCourse});}}>Annuler</button><button className="btn-sm primary" onClick={saveCourse}>{I.save} Enregistrer</button></div>
          </div>
        </div>):(<>
          <div className="admin-header"><div><div className="sec-label">Administration</div><h2 className="sec-title" style={{fontSize:26,marginBottom:0}}>Gestion des formations</h2></div><button className="btn-sm primary" onClick={() => {setEditingCourse({});setCourseForm({...emptyCourse});}}>{I.plus} Nouvelle formation</button></div>
          {courses.length===0?(<div className="empty"><div className="empty-icon">📋</div><p>Aucune formation. Commencez par en créer une.</p><button className="btn-h btn-hp" style={{fontSize:13,padding:"10px 22px"}} onClick={() => {setEditingCourse({});setCourseForm({...emptyCourse});}}>{I.plus} Créer la première</button></div>)
          :(<div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:13,overflow:"hidden"}}><table className="admin-table"><thead><tr><th></th><th>Formation</th><th>Niveau</th><th>Durée</th><th>Modules</th><th>Actions</th></tr></thead><tbody>{courses.map((c,i)=>(<tr key={c.id} style={{animation:`slideR .3s ${i*.05}s both`}}><td style={{fontSize:22,width:50,textAlign:"center"}}>{c.icon}</td><td><div style={{fontWeight:600,fontSize:13.5}}>{c.title}</div><div style={{fontSize:11.5,color:"var(--text-m)"}}>{c.subtitle}</div></td><td><span className="tag">{c.level}</span></td><td style={{color:"var(--text-2)"}}>{c.duration||"—"}</td><td style={{color:"var(--text-2)"}}>{c.modules?.filter(m=>m.title).length||0}</td><td><div className="admin-actions"><button className="btn-sm" onClick={() => startEdit(c)}>{I.edit} Modifier</button><button className="btn-sm danger" onClick={() => deleteCourse(c.id)}>{I.trash}</button></div></td></tr>))}</tbody></table></div>)}
        </>)}
      </section>)}

      {/* SANDBOX */}
      {page==="sandbox"&&(<div className="sandbox">
        <div className="sb-editor">
          <div className="sb-header"><div style={{display:"flex",alignItems:"center",gap:7}}><div className="nav-logo-mark" style={{width:24,height:24,fontSize:10,borderRadius:6}}>d</div><span style={{fontWeight:600,fontSize:13}}>Python AI Sandbox</span></div><span style={{flex:1}} /><button className="btn-sm" onClick={() => setSandboxCode("")}>{I.trash} Vider</button><button className="btn-sm primary" onClick={runSandbox} disabled={isRunning}>{I.play} Exécuter</button></div>
          <div className="sb-libs">{["numpy","pandas","matplotlib","scikit-learn","scipy","seaborn","statsmodels"].map(l=>(<span key={l} className="sb-lib">{l}</span>))}</div>
          <div className="sb-editor-area"><div className="ln">{sandboxCode.split("\n").map((_,i)=><div key={i}>{i+1}</div>)}</div><textarea className="code-ta" value={sandboxCode} onChange={e => setSandboxCode(e.target.value)} onKeyDown={handleTab} spellCheck={false} /></div>
        </div>
        <div className="sb-output">
          <div className="sb-out-head">{I.terminal} Console</div>
          <div className="sb-console">{isRunning?<span style={{color:"var(--text-m)",animation:"pulse 1.5s infinite"}}>⏳ Exécution...</span>:consoleOut||<span style={{color:"var(--text-m)"}}>{">>> "}Cliquez Exécuter pour lancer votre code.</span>}</div>
          <div className="sb-status"><span>Python 3.11 · Pyodide (WASM)</span><span>numpy · pandas · sklearn · matplotlib</span></div>
        </div>
      </div>)}

      </div>
    </div>
  );
}
