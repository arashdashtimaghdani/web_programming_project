import { useState, useEffect, createContext, useContext, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
// ─── FILE DOWNLOAD HELPER ──────────────────────────────────────────────────────
async function downloadProjectFile(fileUrl, filename, accessToken) {
  try {
    const res = await fetch(fileUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      console.error("Download failed:", res.status, await res.text());
      alert(`خطا در دانلود فایل (کد ${res.status})`);
      return;
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Download error:", err);
    alert("خطا در برقراری ارتباط برای دانلود فایل");
  }
}


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
        {page === "dashboard" && <DashboardPage />}
        {page === "project-form" && <ProjectFormPage nav={nav} projectId={projectId} />}
        {page === "project-detail" && <ProjectDetailPage nav={nav} projectId={projectId} />}
        {page === "profile" && <ProfilePage />}
        {page === "comments" && <CommentsPage />}
        {page === "search" && <SearchPage nav={nav} />}
      </main>
    </div>
  );
}

// ─── NOTIFICATION BELL ────────────────────────────────────────────────────────
function NotificationBell() {
  const { tokens } = useAuth();
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const unread = notifs.filter(n => !n.is_read).length;

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get("/notifications/", tokens.access);
      setNotifs(data.results ?? data);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read/`, {}, tokens.access);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch { }
  };

  const markAllRead = async () => {
    try {
      await api.post("/notifications/read-all/", {}, tokens.access);
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch { }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        style={{ ...styles.navBtn, backgroundColor: "transparent", position: "relative", padding: "6px 10px" }}
        onClick={() => setOpen(o => !o)}
      >
        🔔
        {unread > 0 && (
          <span style={styles.badge_notif}>{unread}</span>
        )}
      </button>

      {open && (
        <div style={styles.notifDropdown}>
          <div style={styles.notifHeader}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>نوتیفیکیشن‌ها</span>
            {unread > 0 && (
              <button style={styles.markAllBtn} onClick={markAllRead}>همه خوانده شد</button>
            )}
          </div>

          {loading ? (
            <div style={styles.notifEmpty}>در حال بارگذاری...</div>
          ) : notifs.length === 0 ? (
            <div style={styles.notifEmpty}>نوتیفیکیشنی ندارید</div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {notifs.map(n => (
                <div
                  key={n.id}
                  style={{ ...styles.notifItem, ...(n.is_read ? {} : styles.notifItemUnread) }}
                  onClick={() => !n.is_read && markRead(n.id)}
                >
                  <p style={styles.notifMsg}>{n.message}</p>
                  <span style={styles.notifDate}>{new Date(n.created_at).toLocaleDateString("fa-IR")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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
          style={{ ...styles.navBtn, ...(page === "dashboard" ? styles.navBtnActive : { backgroundColor: "transparent" }) }}
         onClick={() => nav("dashboard")}
         >داشبورد</button>
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
        <button
          style={{ ...styles.navBtn, ...(page === "search" ? styles.navBtnActive : { backgroundColor: "transparent" }) }}
          onClick={() => nav("search")}
        >جستجو</button>
        <NotificationBell />
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!username || !password) return setError("نام کاربری و رمز عبور الزامی است");
    if (mode === "register" && !email) return setError("ایمیل الزامی است");
    setError(""); setLoading(true);
    try {
      if (mode === "register") {
        await api.post("/accounts/register/", { username, email, password });
      }
      const t = await api.post("/api/token/", { username, password });
      login(t);
    } catch (e) {
      setError(e?.detail || e?.username?.[0] || e?.email?.[0] || e?.password?.[0] || "خطا در ورود");
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

        <input style={styles.input} placeholder="نام کاربری" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} dir="ltr" />
        {mode === "register" && (
          <input style={styles.input} type="email" placeholder="ایمیل" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} dir="ltr" />
        )}
        <input style={styles.input} type="password" placeholder="رمز عبور" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} dir="ltr" />

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
    } catch { }
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
            <div key={p.id} style={{ ...styles.card, cursor: "pointer" }} onClick={() => nav("project-detail", p.id)}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>{p.title}</h3>
                <span style={styles.badge}>{p.visibility === "PB" ? "عمومی" : "خصوصی"}</span>
              </div>
              <p style={styles.cardDesc}>{p.description}</p>
              {p.file_url && (
                <button
                   style={styles.downloadLink}
                   onClick={e => {
                   e.stopPropagation();
                   downloadProjectFile(p.file_url, p.title, tokens.access);
                 }}
>
  دانلود
</button>
              )}
              <div style={styles.cardFooter}>
                <span style={styles.cardDate}>{new Date(p.created_at).toLocaleDateString("fa-IR")}</span>
                <button
                  style={styles.btnSecondary}
                  onClick={e => { e.stopPropagation(); nav("project-form", p.id); }}
                >ویرایش</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button style={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>بعدی →</button>
          <span style={{ color: "#666", fontSize: 14 }}>{page} از {totalPages}</span>
          <button style={styles.pageBtn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← قبلی</button>
        </div>
      )}
    </div>
  );
}

// ─── PROJECT DETAIL PAGE ─────────────────────────────────────────────────────
function ProjectDetailPage({ nav, projectId }) {
  const { tokens } = useAuth();
  const [project, setProject] = useState(null);
  const [comments, setComments] = useState([]);
  const [loadingProject, setLoadingProject] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

    useEffect(() => {
    api.get(`/projects/projects/${projectId}/`, tokens.access)
      .then(data => setProject(data))
      .catch(() => setProject(null))
      .finally(() => setLoadingProject(false));

    api.get(`/projects/projects/${projectId}/comments/`, tokens.access)
      .then(data => setComments(data.results ?? data))
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false));
  }, [projectId]);

  const submitComment = async () => {
    if (!body.trim()) return setSubmitError("متن کامنت نمی‌تواند خالی باشد");
    setSubmitError(""); setSubmitting(true);
    try {
      await api.post(`/projects/projects/${projectId}/comments/add/`, { body }, tokens.access);
      setBody("");
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch (e) {
      setSubmitError(e?.body?.[0] || "خطا در ثبت کامنت");
    } finally { setSubmitting(false); }
  };

  if (loadingProject) return <div style={styles.empty}>در حال بارگذاری...</div>;
  if (!project) return <div style={styles.empty}>پروژه پیدا نشد.</div>;

  return (
    <div>
      <button style={styles.backBtn} onClick={() => nav("projects")}>← بازگشت</button>

      <div style={{ ...styles.card, marginTop: 16, marginBottom: 28 }}>
        <div style={styles.cardHeader}>
          <h2 style={{ ...styles.pageTitle, margin: 0 }}>{project.title}</h2>
          <span style={styles.badge}>{project.visibility === "PB" ? "عمومی" : "خصوصی"}</span>
        </div>
        <p style={{ ...styles.cardDesc, marginBottom: 12 }}>{project.description}</p>
        {project.file_url && (
          <a href={project.file_url} target="_blank" style={styles.downloadLink}>
            ⬇ دانلود فایل پروژه
          </a>
        )}
        <div style={styles.cardFooter}>
          <span style={styles.cardDate}>{new Date(project.created_at).toLocaleDateString("fa-IR")}</span>
          <span style={styles.cardDate}>{project.author_username}</span>
        </div>
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 16 }}>
        کامنت‌ها {!loadingComments && `(${comments.length})`}
      </h3>

      {loadingComments ? (
        <div style={styles.empty}>در حال بارگذاری کامنت‌ها...</div>
      ) : comments.length === 0 ? (
        <p style={{ color: "#aaa", fontSize: 14, marginBottom: 24 }}>هنوز کامنتی ثبت نشده.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
          {comments.map(c => (
            <div key={c.id} style={styles.commentCard}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={styles.commentAuthor}>@{c.author_username}</span>
                <span style={styles.cardDate}>{new Date(c.created).toLocaleDateString("fa-IR")}</span>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: "#444", lineHeight: 1.6 }}>{c.body}</p>
            </div>
          ))}
        </div>
      )}

      <div style={styles.formCard}>
        <h4 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 600, color: "#111" }}>ثبت کامنت جدید</h4>
        <textarea
          style={{ ...styles.input, minHeight: 90, resize: "vertical" }}
          placeholder="کامنت خود را بنویسید..."
          value={body}
          onChange={e => setBody(e.target.value)}
        />
        {submitError && <p style={styles.error}>{submitError}</p>}
        {submitSuccess && <p style={styles.success}>کامنت شما ثبت شد و پس از تأیید نمایش داده می‌شود ✓</p>}
        <button style={styles.btnPrimary} onClick={submitComment} disabled={submitting}>
          {submitting ? "در حال ثبت..." : "ثبت کامنت"}
        </button>
      </div>
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
    if (file && file.size > 10 * 1024 * 1024) return setError("حجم فایل نباید بیشتر از ۱۰ مگابایت باشد.");
    setError(""); setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("description", description);
      fd.append("slug", slug);
      fd.append("visibility", visibility);
      if (file) fd.append("file", file);

      if (isEdit) {
        await api.patch(`/projects/my-projects/${projectId}/`, fd, tokens.access, true);
      } else {
        await api.post(`/projects/my-projects/`, fd, tokens.access, true);
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
        <input style={styles.input} value={title} onChange={e => { setTitle(e.target.value); if (!isEdit) setSlug(autoSlug(e.target.value)); }} placeholder="عنوان پروژه" />

        <label style={styles.label}>Slug (آدرس یکتا)</label>
        <input style={{ ...styles.input, direction: "ltr" }} value={slug} onChange={e => setSlug(e.target.value)} placeholder="my-project-slug" />

        <label style={styles.label}>توضیحات</label>
        <textarea style={{ ...styles.input, minHeight: 120, resize: "vertical" }} value={description} onChange={e => setDescription(e.target.value)} placeholder="توضیح کوتاهی درباره پروژه بنویسید..." />

        <label style={styles.label}>دیدپذیری</label>
        <select style={styles.input} value={visibility} onChange={e => setVisibility(e.target.value)}>
          <option value="PR">خصوصی</option>
          <option value="PB">عمومی</option>
        </select>

        <label style={styles.label}>فایل پروژه (اختیاری)</label>
        <input type="file" style={{ ...styles.input, padding: "10px 12px" }} onChange={e => setFile(e.target.files[0])} />

        {error && <p style={styles.error}>{error}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button style={styles.btnPrimary} onClick={save} disabled={saving}>
            {saving ? "در حال ذخیره..." : isEdit ? "ذخیره تغییرات" : "ایجاد پروژه"}
          </button>
          <button style={styles.btnSecondary} onClick={() => nav("projects")}>انصراف</button>
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
      .then(data => { setProfile(data); setBio(data.bio ?? ""); setUniversity(data.university ?? ""); })
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
    } catch { setError("خطا در ذخیره اطلاعات"); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={styles.empty}>در حال بارگذاری...</div>;

  return (
    <div style={styles.formWrap}>
      <h2 style={styles.pageTitle}>پروفایل</h2>
      <div style={styles.formCard}>
        <div style={styles.profileTop}>
          <div style={styles.avatarWrap}>
            {profile?.profile_image_url ? (
              <img src={profile.profile_image_url} alt="profile" style={styles.avatar} onError={e => { e.target.style.display = "none"; }} />
            ) : (
              <div style={styles.avatarPlaceholder}>{profile?.username?.[0]?.toUpperCase() ?? "U"}</div>
            )}
          </div>
          <div>
            <p style={styles.profileName}>{profile?.username}</p>
            <p style={styles.profileEmail}>{profile?.email || "—"}</p>
          </div>
        </div>

        <label style={styles.label}>دانشگاه</label>
        <input style={styles.input} value={university} onChange={e => setUniversity(e.target.value)} placeholder="نام دانشگاه" />

        <label style={styles.label}>بیوگرافی</label>
        <textarea style={{ ...styles.input, minHeight: 100, resize: "vertical" }} value={bio} onChange={e => setBio(e.target.value)} placeholder="چند جمله درباره خودت بنویس..." />

        <label style={styles.label}>تصویر پروفایل</label>
        <input type="file" accept="image/*" style={{ ...styles.input, padding: "10px 12px" }} onChange={e => setImageFile(e.target.files[0])} />

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
        <div style={styles.emptyState}><p style={{ color: "#999" }}>هیچ کامنتی وجود ندارد.</p></div>
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
                <button style={{ ...styles.actionBtn, ...(c.status === "AP" ? styles.actionBtnActive : { backgroundColor: "transparent" }) }} onClick={() => updateStatus(c.id, "AP")} disabled={c.status === "AP"}>✓ تأیید</button>
                <button style={{ ...styles.actionBtn, ...(c.status === "RJ" ? styles.actionBtnDanger : { backgroundColor: "transparent" }) }} onClick={() => updateStatus(c.id, "RJ")} disabled={c.status === "RJ"}>✕ رد</button>
                <button style={{ ...styles.actionBtn, ...(c.status === "PD" ? styles.actionBtnWarning : { backgroundColor: "transparent" }) }} onClick={() => updateStatus(c.id, "PD")} disabled={c.status === "PD"}>⏳ انتظار</button>
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

// ─── SEARCH PAGE ──────────────────────────────────────────────────────────────
function SearchPage({ nav }) {
  const { tokens } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 10;

  const runSearch = async (p = 1) => {
    const q = query.trim();
    if (!q) return;
    setLoading(true); setSearched(true);
    try {
      const data = await api.get(`/projects/search/?q=${encodeURIComponent(q)}&page=${p}`, tokens.access);
      setResults(data.results ?? data);
      setTotal(data.count ?? (data.results ?? data).length);
      setPage(p);
    } catch { setResults([]); setTotal(0); }
    finally { setLoading(false); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div style={styles.pageHeader}>
        <h2 style={styles.pageTitle}>جستجوی پروژه‌ها</h2>
      </div>

      <div style={styles.searchBar}>
        <input
          style={styles.searchInput}
          placeholder="عنوان یا توضیحات پروژه را جستجو کنید..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && runSearch(1)}
        />
        <button style={styles.btnPrimary} onClick={() => runSearch(1)} disabled={loading || !query.trim()}>
          {loading ? "..." : "جستجو"}
        </button>
      </div>

      {!searched ? (
        <div style={styles.empty}>برای شروع، عبارتی را جستجو کنید.</div>
      ) : loading ? (
        <div style={styles.empty}>در حال جستجو...</div>
      ) : results.length === 0 ? (
        <div style={styles.emptyState}><p style={{ color: "#999" }}>نتیجه‌ای برای «{query}» پیدا نشد.</p></div>
      ) : (
        <div style={styles.projectGrid}>
          {results.map(p => (
            <div key={p.id} style={{ ...styles.card, cursor: "pointer" }} onClick={() => nav("project-detail", p.id)}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>{p.title}</h3>
                <span style={styles.badge}>{p.author_username}</span>
              </div>
              <p style={styles.cardDesc}>{p.description}</p>
              {p.file_url && (
                <button
                  style={styles.downloadLink}
                  onClick={e => {
                  e.stopPropagation();
                  downloadProjectFile(p.file_url, p.title, tokens.access);
                      }}
                >
                 دانلود
               </button>
              )}
              <div style={styles.cardFooter}>
                <span style={styles.cardDate}>{new Date(p.created_at).toLocaleDateString("fa-IR")}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {searched && totalPages > 1 && (
        <div style={styles.pagination}>
          <button style={styles.pageBtn} disabled={page >= totalPages} onClick={() => runSearch(page + 1)}>بعدی →</button>
          <span style={{ color: "#666", fontSize: 14 }}>{page} از {totalPages}</span>
          <button style={styles.pageBtn} disabled={page <= 1} onClick={() => runSearch(page - 1)}>← قبلی</button>
        </div>
      )}
    </div>
  );
}
// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────
function StatCard({ label, value }) {
  return (
    <div style={styles.statCard}>
      <p style={styles.statValue}>{value}</p>
      <p style={styles.statLabel}>{label}</p>
    </div>
  );
}

function ActivityChart({ data }) {
  const chartData = data.map(d => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("fa-IR", { month: "short", day: "numeric" }),
  }));
  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" fontSize={11} stroke="#999" />
          <YAxis fontSize={11} stroke="#999" allowDecimals={false} />
          <Tooltip />
          <Line type="monotone" dataKey="count" stroke="#111" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TopProjectsTable({ rows, showAuthor }) {
  if (!rows.length) return <p style={{ color: "#aaa", fontSize: 13 }}>هنوز پروژه‌ای ثبت نشده</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map(r => (
        <div key={r.id} style={styles.topProjectRow}>
          <span style={{ fontSize: 14, color: "#111" }}>
            {r.title}{showAuthor && r.author__username ? ` — ${r.author__username}` : ""}
          </span>
          <span style={styles.badge}>{r.download_count} دانلود</span>
        </div>
      ))}
    </div>
  );
}

function DashboardPage() {
  const { tokens } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/dashboard/", tokens.access)
      .then(setData)
      .catch(() => setError("خطا در بارگذاری داشبورد"));
  }, []);

  if (error) return <p style={styles.error}>{error}</p>;
  if (!data) return <p style={styles.empty}>در حال بارگذاری...</p>;

  return (
    <div>
      <div style={styles.pageHeader}>
        <h2 style={styles.pageTitle}>داشبورد شما</h2>
      </div>

      <div style={styles.statGrid}>
        <StatCard label="پروژه‌ها" value={data.projects_count} />
        <StatCard label="پروژه‌های عمومی" value={data.public_projects_count} />
        <StatCard label="دانلودها" value={data.total_downloads} />
        <StatCard label="کامنت‌های دریافتی" value={data.comments_received} />
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>فعالیت شما (۱۴ روز اخیر)</h3>
        <ActivityChart data={data.activity_over_time} />
      </div>

      <div style={{ ...styles.card, marginTop: 16 }}>
        <h3 style={styles.cardTitle}>پرطرفدارترین پروژه‌های شما</h3>
        <TopProjectsTable rows={data.top_projects} showAuthor={false} />
      </div>

      {data.system && (
        <>
          <div style={styles.pageHeader}>
            <h2 style={styles.pageTitle}>آمار کلی سیستم (ادمین)</h2>
          </div>

          <div style={styles.statGrid}>
            <StatCard label="کل کاربران" value={data.system.users_count} />
            <StatCard label="کل پروژه‌ها" value={data.system.projects_count} />
            <StatCard label="کل دانلودها" value={data.system.total_downloads} />
            <StatCard label="کل کامنت‌ها" value={data.system.comments_count} />
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>فعالیت کل سیستم (۱۴ روز اخیر)</h3>
            <ActivityChart data={data.system.activity_over_time} />
          </div>

          <div style={{ ...styles.card, marginTop: 16 }}>
            <h3 style={styles.cardTitle}>پرطرفدارترین پروژه‌های سیستم</h3>
            <TopProjectsTable rows={data.system.top_projects} showAuthor={true} />
          </div>
        </>
      )}
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = {
  shell: { minHeight: "100vh", backgroundColor: "#fafafa", fontFamily: "system-ui, sans-serif", direction: "rtl" },
  nav: { backgroundColor: "#fff", borderBottom: "1px solid #eee", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 },
  navBrand: { fontWeight: 700, fontSize: 17, letterSpacing: "-0.3px", color: "#111" },
  navLinks: { display: "flex", gap: 4, alignItems: "center" },
  navBtn: { background: "none", border: "none", cursor: "pointer", padding: "6px 12px", borderRadius: 6, fontSize: 14, color: "#555", fontFamily: "inherit" },
  navBtnActive: { color: "#111", fontWeight: 600, backgroundColor: "#f0f0f0" },
  main: { maxWidth: 800, margin: "0 auto", padding: "32px 20px" },

  authWrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#fafafa", direction: "rtl" },
  authCard: { width: "100%", maxWidth: 380, backgroundColor: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: 32 },
  authTitle: { margin: "0 0 4px", fontSize: 24, fontWeight: 700, color: "#111", textAlign: "center" },
  authSub: { textAlign: "center", color: "#888", fontSize: 14, marginBottom: 28, marginTop: 0 },
  tabRow: { display: "flex", gap: 0, marginBottom: 20, backgroundColor: "#f3f3f3", borderRadius: 8, padding: 3 },
  tab: { flex: 1, border: "none", background: "transparent", cursor: "pointer", padding: "8px 0", borderRadius: 6, fontSize: 14, color: "#333", fontFamily: "inherit", transition: "all .15s", fontWeight: 500 },
  tabActive: { backgroundColor: "#fff", color: "#111", fontWeight: 700, boxShadow: "0 1px 4px rgba(0,0,0,.12)" },

  input: { display: "block", width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #e0e0e0", borderRadius: 7, fontSize: 14, fontFamily: "inherit", outline: "none", backgroundColor: "#fff", marginBottom: 12, color: "#111", direction: "rtl" },
  label: { display: "block", fontSize: 13, color: "#555", marginBottom: 5, fontWeight: 500 },
  error: { color: "#c0392b", fontSize: 13, margin: "0 0 12px", padding: "8px 12px", backgroundColor: "#fdf0ee", borderRadius: 6, border: "1px solid #f5c6c0" },
  success: { color: "#27ae60", fontSize: 13, margin: "0 0 12px", padding: "8px 12px", backgroundColor: "#eafaf1", borderRadius: 6, border: "1px solid #a9dfbf" },

  btnPrimary: { padding: "10px 20px", backgroundColor: "#111", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 14, fontFamily: "inherit", fontWeight: 500 },
  btnSecondary: { padding: "8px 16px", backgroundColor: "#fff", color: "#555", border: "1px solid #ddd", borderRadius: 7, cursor: "pointer", fontSize: 14, fontFamily: "inherit" },
  backBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#666", fontFamily: "inherit", padding: 0, marginBottom: 8 },

  pageHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, gap: 12 },
  pageTitle: { fontSize: 20, fontWeight: 700, color: "#111", margin: 0 },
  empty: { textAlign: "center", color: "#aaa", padding: "60px 0", fontSize: 15 },
  emptyState: { textAlign: "center", padding: "60px 0" },

  projectGrid: { display: "flex", flexDirection: "column", gap: 12 },
  card: { backgroundColor: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "18px 20px", transition: "box-shadow .15s" },
  cardHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 },
  cardTitle: { margin: 0, fontSize: 16, fontWeight: 600, color: "#111" },
  cardDesc: { color: "#666", fontSize: 14, margin: "0 0 16px", lineHeight: 1.6 },
  cardFooter: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardDate: { color: "#aaa", fontSize: 12 },
  badge: { fontSize: 12, padding: "2px 9px", borderRadius: 20, backgroundColor: "#f0f0f0", color: "#666" },
  downloadLink: { display: "inline-block", fontSize: 13, color: "#fff", textDecoration: "none", border: "none", borderRadius: 7, padding: "6px 14px", backgroundColor: "#374151", fontFamily: "inherit", fontWeight: 500, marginBottom: 12 },

  pagination: { display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 28 },
  pageBtn: { background: "#fff", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", padding: "6px 14px", fontSize: 13, fontFamily: "inherit", color: "#555" },

  profileTop: { display: "flex", alignItems: "center", gap: 16, marginBottom: 28, paddingBottom: 24, borderBottom: "1px solid #f0f0f0" },
  avatarWrap: { flexShrink: 0 },
  avatar: { width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid #e8e8e8" },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: "50%", backgroundColor: "#111", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700 },
  profileName: { margin: "0 0 2px", fontWeight: 600, fontSize: 16, color: "#111" },
  profileEmail: { margin: 0, color: "#999", fontSize: 13 },

  commentAuthor: { fontWeight: 600, fontSize: 14, color: "#111" },
  commentProject: { fontSize: 12, color: "#aaa", margin: "4px 0 14px" },
  commentActions: { display: "flex", gap: 8 },
  actionBtn: { padding: "6px 14px", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "inherit", color: "#555" },
  actionBtnActive: { backgroundColor: "#eafaf1", color: "#27ae60", borderColor: "#a9dfbf" },
  actionBtnDanger: { backgroundColor: "#fdf0ee", color: "#c0392b", borderColor: "#f5c6c0" },
  actionBtnWarning: { backgroundColor: "#fef9e7", color: "#f39c12", borderColor: "#fdebd0" },
  commentBody: { fontSize: 14, color: "#444", margin: "6px 0 10px", lineHeight: 1.6 },
  commentCard: { backgroundColor: "#fff", border: "1px solid #e8e8e8", borderRadius: 8, padding: "14px 16px" },

  formWrap: { maxWidth: 560 },
  formCard: { backgroundColor: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "24px 28px" },

  searchBar: { display: "flex", gap: 10, marginBottom: 28 },
  searchInput: { flex: 1, padding: "10px 14px", border: "1px solid #d0d7de", borderRadius: 6, fontSize: 14, fontFamily: "inherit", outline: "none", color: "#111", direction: "rtl" },

  // notification
  badge_notif: { position: "absolute", top: 2, right: 2, backgroundColor: "#e53e3e", color: "#fff", borderRadius: "50%", fontSize: 10, fontWeight: 700, width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" },
  notifDropdown: { position: "absolute", top: 44, left: 0, width: 320, backgroundColor: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,.1)", zIndex: 1000 },
  notifHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #f0f0f0" },
  markAllBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#2563eb", fontFamily: "inherit" },
  notifEmpty: { padding: "24px 16px", textAlign: "center", color: "#aaa", fontSize: 13 },
  notifItem: { padding: "12px 16px", borderBottom: "1px solid #f5f5f5", cursor: "pointer" },
  notifItemUnread: { backgroundColor: "#f0f7ff" },
  notifMsg: { margin: "0 0 4px", fontSize: 13, color: "#333", lineHeight: 1.5 },
  notifDate: { fontSize: 11, color: "#aaa" },
};

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}