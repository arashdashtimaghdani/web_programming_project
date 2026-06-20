import { useState, useEffect, createContext, useContext } from "react";

// ─── API CONFIG ──────────────────────────────────────────────────────────────
const API = "http://localhost:8000";

const api = {
  async request(method, path, body, token, isFormData = false) {
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (!isFormData) headers["Content-Type"] = "application/json";
    const res = await fetch(`${API}${path}`, {
      method,
      headers,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw err;
    }
    if (res.status === 204) return null;
    return res.json();
  },
  get: (path, token) => api.request("GET", path, null, token),
  post: (path, body, token, isForm) => api.request("POST", path, body, token, isForm),
  patch: (path, body, token, isForm) => api.request("PATCH", path, body, token, isForm),
  put: (path, body, token, isForm) => api.request("PUT", path, body, token, isForm),
};

// ─── AUTH CONTEXT ─────────────────────────────────────────────────────────────
const AuthCtx = createContext(null);

function AuthProvider({ children }) {
  const [tokens, setTokens] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ss_tokens")); } catch { return null; }
  });

  const login = (t) => { setTokens(t); localStorage.setItem("ss_tokens", JSON.stringify(t)); };
  const logout = () => { setTokens(null); localStorage.removeItem("ss_tokens"); };

  return (
    <AuthCtx.Provider value={{ tokens, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

const useAuth = () => useContext(AuthCtx);

// ─── ROUTER ───────────────────────────────────────────────────────────────────
function Router() {
  const { tokens } = useAuth();
  const [page, setPage] = useState("auth");
  const [projectId, setProjectId] = useState(null);

  useEffect(() => {
    if (!tokens && page !== "auth") setPage("auth");
    if (tokens && page === "auth") setPage("projects");
  }, [tokens]);

  const nav = (p, id = null) => { setPage(p); setProjectId(id); };

  if (!tokens) return <AuthPage />;

  return (
    <div style={styles.shell}>
      <Nav page={page} nav={nav} />
      <main style={styles.main}>
        {page === "projects" && <ProjectsPage nav={nav} />}
        {page === "project-form" && <ProjectFormPage nav={nav} projectId={projectId} />}
        {page === "profile" && <ProfilePage />}
        {page === "comments" && <CommentsPage />}
      </main>
    </div>
  );
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
function Nav({ page, nav }) {
  const { logout } = useAuth();
  return (
    <nav style={styles.nav}>
      <span style={styles.navBrand}>SkillSphere</span>
      <div style={styles.navLinks}>
        <button
          style={{ ...styles.navBtn, ...(page === "projects" ? styles.navBtnActive : { backgroundColor: "transparent" }) }}
          onClick={() => nav("projects")}
        >پروژه‌ها</button>
        <button
          style={{ ...styles.navBtn, ...(page === "profile" ? styles.navBtnActive : { backgroundColor: "transparent" }) }}
          onClick={() => nav("profile")}
        >پروفایل</button>
        <button
        style={{ ...styles.navBtn, ...(page === "comments" ? styles.navBtnActive : { backgroundColor: "transparent" }) }}
        onClick={() => nav("comments")}
        >کامنت‌ها</button>
        <button style={{ ...styles.navBtn, backgroundColor: "transparent", color: "#999" }} onClick={logout}>خروج</button>
      </div>
    </nav>
  );
}

// ─── AUTH PAGE ────────────────────────────────────────────────────────────────
function AuthPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!username || !password) return setError("نام کاربری و رمز عبور الزامی است");
    setError(""); setLoading(true);
    try {
      if (mode === "register") {
        await api.post("/accounts/register/", { username, password });
      }
      const t = await api.post("/api/token/", { username, password });
      login(t);
    } catch (e) {
      setError(e?.detail || e?.username?.[0] || e?.password?.[0] || "خطا در ورود");
    } finally { setLoading(false); }
  };

  return (
    <div style={styles.authWrap}>
      <div style={styles.authCard}>
        <h1 style={styles.authTitle}>SkillSphere</h1>
        <p style={styles.authSub}>پلتفرم اشتراک‌گذاری پروژه</p>

        <div style={styles.tabRow}>
          <button
  style={{ ...styles.tab, ...(mode === "login" ? styles.tabActive : { backgroundColor: "transparent", color: "#555" }) }}
  onClick={() => setMode("login")}
        >ورود</button>
<button
  style={{ ...styles.tab, ...(mode === "register" ? styles.tabActive : { backgroundColor: "transparent", color: "#555" }) }}
  onClick={() => setMode("register")}
>ثبت‌نام</button>
        </div>

        <input
          style={styles.input}
          placeholder="نام کاربری"
          value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          dir="ltr"
        />
        <input
          style={styles.input}
          type="password"
          placeholder="رمز عبور"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          dir="ltr"
        />

        {error && <p style={styles.error}>{error}</p>}

        <button style={styles.btnPrimary} onClick={submit} disabled={loading}>
          {loading ? "..." : mode === "login" ? "ورود" : "ثبت‌نام"}
        </button>
      </div>
    </div>
  );
}

// ─── PROJECTS PAGE ────────────────────────────────────────────────────────────
function ProjectsPage({ nav }) {
  const { tokens } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 3;

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const data = await api.get(`/projects/my-projects/?page=${p}`, tokens.access);
      setProjects(data.results ?? data);
      setTotal(data.count ?? (data.results ?? data).length);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(page); }, [page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div style={styles.pageHeader}>
        <h2 style={styles.pageTitle}>پروژه‌های من</h2>
        <button style={styles.btnPrimary} onClick={() => nav("project-form", null)}>
          + پروژه جدید
        </button>
      </div>

      {loading ? (
        <div style={styles.empty}>در حال بارگذاری...</div>
      ) : projects.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={{ color: "#999", marginBottom: 16 }}>هنوز پروژه‌ای ندارید.</p>
          <button style={styles.btnPrimary} onClick={() => nav("project-form", null)}>
            اولین پروژه را بسازید
          </button>
        </div>
      ) : (
        <div style={styles.projectGrid}>
          {projects.map(p => (
            <div key={p.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>{p.title}</h3>
                <span style={styles.badge}>{p.visibility === "PB" ? "عمومی" : "خصوصی"}</span>
              </div>
              <p style={styles.cardDesc}>{p.description}</p>
              {p.file_url && (
                    <a href={p.file_url} target="_blank" style={styles.downloadLink}>
                    ⬇ دانلود فایل
                </a>
                )}
              <div style={styles.cardFooter}>
                <span style={styles.cardDate}>{new Date(p.created_at).toLocaleDateString("fa-IR")}</span>
                <button
                  style={styles.btnSecondary}
                  onClick={() => nav("project-form", p.id)}
                >ویرایش</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={styles.pagination}>
            <button
            style={styles.pageBtn}
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >بعدی →</button>
          <span style={{ color: "#666", fontSize: 14 }}>{page} از {totalPages}</span>
          <button
            style={styles.pageBtn}
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >← قبلی</button>

        </div>
      )}
    </div>
  );
}

// ─── PROJECT FORM PAGE ────────────────────────────────────────────────────────
function ProjectFormPage({ nav, projectId }) {
  const { tokens } = useAuth();
  const isEdit = !!projectId;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [visibility, setVisibility] = useState("PR");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/projects/my-projects/`, tokens.access)
      .then(data => {
        const all = data.results ?? data;
        const p = all.find(x => x.id === projectId);
        if (p) {
          setTitle(p.title);
          setDescription(p.description);
          setSlug(p.slug ?? "");
          setVisibility(p.visibility ?? "PR");
        }
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  const autoSlug = (t) => t.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const save = async () => {
    if (!title || !description || !slug) return setError("عنوان، توضیحات و slug الزامی است");
    setError(""); setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("description", description);
      fd.append("slug", slug);
      fd.append("visibility", visibility);
      if (file) fd.append("file", file);
      if (file && file.size > 10 * 1024 * 1024) {
           return setError("حجم فایل نباید بیشتر از ۱۰ مگابایت باشد.");
      }

      if (isEdit) {
        await api.patch(`/projects/my-projects/${projectId}/`, fd, tokens.access, true);
      } else {
        await api.post(`/projects/my-projects/`, fd, tokens.access,true);
      }
      nav("projects");
    } catch (e) {
      const msg = Object.values(e).flat().join(" | ");
      setError(msg || "خطا در ذخیره پروژه");
    } finally { setSaving(false); }
  };

  if (loading) return <div style={styles.empty}>در حال بارگذاری...</div>;

  return (
    <div style={styles.formWrap}>
      <div style={styles.pageHeader}>
        <button style={styles.backBtn} onClick={() => nav("projects")}>← بازگشت</button>
        <h2 style={styles.pageTitle}>{isEdit ? "ویرایش پروژه" : "پروژه جدید"}</h2>
      </div>

      <div style={styles.formCard}>
        <label style={styles.label}>عنوان</label>
        <input
          style={styles.input}
          value={title}
          onChange={e => {
            setTitle(e.target.value);
            if (!isEdit) setSlug(autoSlug(e.target.value));
          }}
          placeholder="عنوان پروژه"
        />

        <label style={styles.label}>Slug (آدرس یکتا)</label>
        <input
          style={{ ...styles.input, direction: "ltr" }}
          value={slug}
          onChange={e => setSlug(e.target.value)}
          placeholder="my-project-slug"
        />

        <label style={styles.label}>توضیحات</label>
        <textarea
          style={{ ...styles.input, minHeight: 120, resize: "vertical" }}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="توضیح کوتاهی درباره پروژه بنویسید..."
        />

        <label style={styles.label}>دیدپذیری</label>
        <select
          style={styles.input}
          value={visibility}
          onChange={e => setVisibility(e.target.value)}
        >
          <option value="PR">خصوصی</option>
          <option value="PB">عمومی</option>
        </select>

        <label style={styles.label}>فایل پروژه (اختیاری)</label>
        <input
          type="file"
          style={{ ...styles.input, padding: "10px 12px" }}
          onChange={e => setFile(e.target.files[0])}
        />

        {error && <p style={styles.error}>{error}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button style={styles.btnPrimary} onClick={save} disabled={saving}>
            {saving ? "در حال ذخیره..." : isEdit ? "ذخیره تغییرات" : "ایجاد پروژه"}
          </button>
          <button style={styles.btnSecondary} onClick={() => nav("projects")}>
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PROFILE PAGE ─────────────────────────────────────────────────────────────
function ProfilePage() {
  const { tokens } = useAuth();
  const [profile, setProfile] = useState(null);
  const [bio, setBio] = useState("");
  const [university, setUniversity] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/accounts/profile/", tokens.access)
      .then(data => {
        setProfile(data);
        setBio(data.bio ?? "");
        setUniversity(data.university ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setSuccess(false); setError("");
    try {
      const fd = new FormData();
      fd.append("bio", bio);
      fd.append("university", university);
      if (imageFile) fd.append("profile_image", imageFile);
      const updated = await api.patch("/accounts/profile/", fd, tokens.access, true);
      setProfile(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError("خطا در ذخیره اطلاعات");
    } finally { setSaving(false); }
  };

  if (loading) return <div style={styles.empty}>در حال بارگذاری...</div>;

  return (
    <div style={styles.formWrap}>
      <h2 style={styles.pageTitle}>پروفایل</h2>

      <div style={styles.formCard}>
        <div style={styles.profileTop}>
          <div style={styles.avatarWrap}>
            {profile?.profile_image_url ? (
              <img
                src={profile.profile_image_url}
                alt="profile"
                style={styles.avatar}
                onError={e => { e.target.style.display = "none"; }}
              />
            ) : (
              <div style={styles.avatarPlaceholder}>
                {profile?.username?.[0]?.toUpperCase() ?? "U"}
              </div>
            )}
          </div>
          <div>
            <p style={styles.profileName}>{profile?.username}</p>
            <p style={styles.profileEmail}>{profile?.email || "—"}</p>
          </div>
        </div>

        <label style={styles.label}>دانشگاه</label>
        <input
          style={styles.input}
          value={university}
          onChange={e => setUniversity(e.target.value)}
          placeholder="نام دانشگاه"
        />

        <label style={styles.label}>بیوگرافی</label>
        <textarea
          style={{ ...styles.input, minHeight: 100, resize: "vertical" }}
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="چند جمله درباره خودت بنویس..."
        />

        <label style={styles.label}>تصویر پروفایل</label>
        <input
          type="file"
          accept="image/*"
          style={{ ...styles.input, padding: "10px 12px" }}
          onChange={e => setImageFile(e.target.files[0])}
        />

        {error && <p style={styles.error}>{error}</p>}
        {success && <p style={styles.success}>اطلاعات با موفقیت ذخیره شد ✓</p>}

        <button style={styles.btnPrimary} onClick={save} disabled={saving}>
          {saving ? "در حال ذخیره..." : "ذخیره اطلاعات"}
        </button>
      </div>
    </div>
  );
}
// ─── COMMENTS PAGE ────────────────────────────────────────────────────────────
function CommentsPage() {
  const { tokens } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 3;

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const data = await api.get(`/projects/projects/comments/?page=${p}`, tokens.access);
      setComments(data.results ?? data);
      setTotal(data.count ?? (data.results ?? data).length);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { load(page); }, [page]);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/projects/comment/${id}/`, { status }, tokens.access);
      setComments(prev => prev.map(c => c.id === id ? { ...c, status, status_display: statusLabel(status) } : c));
    } catch { alert("خطا در بروزرسانی"); }
  };

  const statusLabel = (s) => s === "AP" ? "تأیید شده" : s === "RJ" ? "رد شده" : "در انتظار";
  const statusColor = (s) => s === "AP" ? "#27ae60" : s === "RJ" ? "#c0392b" : "#f39c12";

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div style={styles.pageHeader}>
        <h2 style={styles.pageTitle}>مدیریت کامنت‌ها</h2>
      </div>

      {loading ? (
        <div style={styles.empty}>در حال بارگذاری...</div>
      ) : comments.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={{ color: "#999" }}>هیچ کامنتی وجود ندارد.</p>
        </div>
      ) : (
        <div style={styles.projectGrid}>
          {comments.map(c => (
            <div key={c.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.commentAuthor}>@{c.author_username}</span>
                <span style={{ ...styles.badge, color: statusColor(c.status), borderColor: statusColor(c.status) }}>
                  {c.status_display ?? statusLabel(c.status)}
                </span>
              </div>
              <p style={styles.commentBody}>{c.body}</p>
              <p style={styles.commentProject}>پروژه #{c.project}</p>
              <div style={styles.commentActions}>
                <button
                  style={{ ...styles.actionBtn, ...(c.status === "AP" ? styles.actionBtnActive : { backgroundColor: "transparent" }) }}
                  onClick={() => updateStatus(c.id, "AP")}
                  disabled={c.status === "AP"}
                >✓ تأیید</button>
                <button
                  style={{ ...styles.actionBtn, ...(c.status === "RJ" ? styles.actionBtnDanger : { backgroundColor: "transparent" }) }}
                  onClick={() => updateStatus(c.id, "RJ")}
                  disabled={c.status === "RJ"}
                >✕ رد</button>
                <button
                  style={{ ...styles.actionBtn, ...(c.status === "PD" ? styles.actionBtnWarning : { backgroundColor: "transparent" }) }}
                  onClick={() => updateStatus(c.id, "PD")}
                  disabled={c.status === "PD"}
                >⏳ انتظار</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button style={styles.pageBtn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← قبلی</button>
          <span style={{ color: "#666", fontSize: 14 }}>{page} از {totalPages}</span>
          <button style={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>بعدی →</button>
        </div>
      )}
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = {
  shell: { minHeight: "100vh", backgroundColor: "#fafafa", fontFamily: "system-ui, sans-serif", direction: "rtl" },
  nav: { backgroundColor: "#fff", borderBottom: "1px solid #eee", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 },
  navBrand: { fontWeight: 700, fontSize: 17, letterSpacing: "-0.3px", color: "#111" },
  navLinks: { display: "flex", gap: 4 },
  navBtn: { background: "none", border: "none", cursor: "pointer", padding: "6px 12px", borderRadius: 6, fontSize: 14, color: "#555", fontFamily: "inherit" },
  navBtnActive: { color: "#111", fontWeight: 600, backgroundColor: "#f0f0f0" },
  main: { maxWidth: 800, margin: "0 auto", padding: "32px 20px" },

  // auth
  authWrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#fafafa", direction: "rtl" },
  authCard: { width: "100%", maxWidth: 380, backgroundColor: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: 32 },
  authTitle: { margin: "0 0 4px", fontSize: 24, fontWeight: 700, color: "#111", textAlign: "center" },
  authSub: { textAlign: "center", color: "#888", fontSize: 14, marginBottom: 28, marginTop: 0 },
  tabRow: { display: "flex", gap: 0, marginBottom: 20, backgroundColor: "#f3f3f3", borderRadius: 8, padding: 3 },
  tab: { flex: 1, border: "none", background: "transparent", cursor: "pointer", padding: "8px 0", borderRadius: 6, fontSize: 14, color: "#333", fontFamily: "inherit", transition: "all .15s", fontWeight: 500 },
  tabActive: { backgroundColor: "#fff", color: "#111", fontWeight: 700, boxShadow: "0 1px 4px rgba(0,0,0,.12)" },

  // form elements
  input: { display: "block", width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #e0e0e0", borderRadius: 7, fontSize: 14, fontFamily: "inherit", outline: "none", backgroundColor: "#fff", marginBottom: 12, color: "#111", direction: "rtl" },
  label: { display: "block", fontSize: 13, color: "#555", marginBottom: 5, fontWeight: 500 },
  error: { color: "#c0392b", fontSize: 13, margin: "0 0 12px", padding: "8px 12px", backgroundColor: "#fdf0ee", borderRadius: 6, border: "1px solid #f5c6c0" },
  success: { color: "#27ae60", fontSize: 13, margin: "0 0 12px", padding: "8px 12px", backgroundColor: "#eafaf1", borderRadius: 6, border: "1px solid #a9dfbf" },

  // buttons
  btnPrimary: { padding: "10px 20px", backgroundColor: "#111", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 14, fontFamily: "inherit", fontWeight: 500 },
  btnSecondary: { padding: "8px 16px", backgroundColor: "#fff", color: "#555", border: "1px solid #ddd", borderRadius: 7, cursor: "pointer", fontSize: 14, fontFamily: "inherit" },
  backBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#666", fontFamily: "inherit", padding: 0, marginBottom: 8 },

  // pages
  pageHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, gap: 12 },
  pageTitle: { fontSize: 20, fontWeight: 700, color: "#111", margin: 0 },
  empty: { textAlign: "center", color: "#aaa", padding: "60px 0", fontSize: 15 },
  emptyState: { textAlign: "center", padding: "60px 0" },

  // project grid
  projectGrid: { display: "flex", flexDirection: "column", gap: 12 },
  card: { backgroundColor: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "18px 20px", transition: "box-shadow .15s" },
  cardHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 },
  cardTitle: { margin: 0, fontSize: 16, fontWeight: 600, color: "#111" },
  cardDesc: { color: "#666", fontSize: 14, margin: "0 0 16px", lineHeight: 1.6 },
  cardFooter: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardDate: { color: "#aaa", fontSize: 12 },
  downloadLink: {
  display: "inline-block",
  fontSize: 13,
  color: "#fff",
  textDecoration: "none",
  border: "1px solid #2563eb",
  borderRadius: 7,
  padding: "6px 14px",
  backgroundColor: "#111",
  fontFamily: "inherit",
  fontWeight: 500,
  marginBottom: 12,
},
  badge: { fontSize: 12, padding: "2px 9px", borderRadius: 20, backgroundColor: "#f0f0f0", color: "#666" },

  // pagination
  pagination: { display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 28 },
  pageBtn: { background: "#fff", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", padding: "6px 14px", fontSize: 13, fontFamily: "inherit", color: "#555" },

  // profile
  profileTop: { display: "flex", alignItems: "center", gap: 16, marginBottom: 28, paddingBottom: 24, borderBottom: "1px solid #f0f0f0" },
  avatarWrap: { flexShrink: 0 },
  avatar: { width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid #e8e8e8" },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: "50%", backgroundColor: "#111", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700 },
  profileName: { margin: "0 0 2px", fontWeight: 600, fontSize: 16, color: "#111" },
  profileEmail: { margin: 0, color: "#999", fontSize: 13 },
  // comments
  commentAuthor: { fontWeight: 600, fontSize: 14, color: "#111" },
  commentProject: { fontSize: 12, color: "#aaa", margin: "4px 0 14px" },
  commentActions: { display: "flex", gap: 8 },
  actionBtn: { padding: "6px 14px", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "inherit", color: "#555" },
  actionBtnActive: { backgroundColor: "#eafaf1", color: "#27ae60", borderColor: "#a9dfbf" },
  actionBtnDanger: { backgroundColor: "#fdf0ee", color: "#c0392b", borderColor: "#f5c6c0" },
  actionBtnWarning: { backgroundColor: "#fef9e7", color: "#f39c12", borderColor: "#fdebd0" },
  commentBody: { fontSize: 14, color: "#444", margin: "6px 0 10px", lineHeight: 1.6 },

  // form page
  formWrap: { maxWidth: 560 },
  formCard: { backgroundColor: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "24px 28px" },

};

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
