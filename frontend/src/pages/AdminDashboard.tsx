import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { useToast } from "../hooks/useToast";
import api from "../services/api";
import Logo from "../components/Logo";
import {
  ShieldAlert,
  Users,
  CheckCircle2,
  Settings,
  LogOut,
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  ShieldCheck,
  Clock,
  Check,
  X,
  Layers,
  Mail,
  Trash2,
  Send
} from "lucide-react";

const formatEvidenceData = (ev: any) => {
  if (!ev.evidence_data) return null;
  let evidence = ev.evidence_data;
  if (typeof evidence === "string") {
    try {
      evidence = JSON.parse(evidence);
    } catch {
      return <div style={{ marginTop: "4px", color: "var(--dash-secondary)", fontSize: "9px" }}>{evidence}</div>;
    }
  }
  const data = evidence.data;
  if (!data) return null;
  
  if (ev.source_type === "calculator") {
    return (
      <div style={{ marginTop: "4px", color: "#10b981", fontSize: "9px" }}>
        📊 <strong>Result:</strong> {data.expression} = {data.result}
      </div>
    );
  }
  if (ev.source_type === "web_search") {
    const results = data.results || [];
    return (
      <div style={{ marginTop: "4px", color: "var(--dash-secondary)", fontSize: "9px" }}>
        🌐 <strong>Found {results.length} search matches:</strong>
        <ul style={{ margin: "2px 0 0", paddingLeft: "12px" }}>
          {results.slice(0, 3).map((r: any, idx: number) => (
            <li key={idx}>
              <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--dash-primary)", textDecoration: "underline" }}>
                {r.title || r.source || "Link"}
              </a>: {r.snippet ? r.snippet.substring(0, 80) + "..." : ""}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (ev.source_type === "web_fetch") {
    return (
      <div style={{ marginTop: "4px", color: "var(--dash-secondary)", fontSize: "9px" }}>
        📄 <strong>Fetched URL text:</strong> {data.text ? data.text.substring(0, 100) + "..." : "No text"}
      </div>
    );
  }
  if (ev.source_type === "database_lookup") {
    return (
      <div style={{ marginTop: "4px", color: "var(--dash-secondary)", fontSize: "9px" }}>
        🗄️ <strong>Lookup type:</strong> {data.operation}. Found {Array.isArray(data.data) ? data.data.length : 1} records.
      </div>
    );
  }
  if (ev.source_type === "verification") {
    return (
      <div style={{ marginTop: "4px", color: "#10b981", fontSize: "9px" }}>
        🔍 <strong>Verification result:</strong> {data.verification_status} ({Number(data.confidence_score).toFixed(1)}% confidence)
      </div>
    );
  }
  return null;
};

const STATUS_LABEL: Record<string, string> = {
  created: "Created",
  queued: "Queued",
  planning: "Planning",
  running: "Running",
  verifying: "Verifying",
  completed: "Completed",
  partially_completed: "Partially Completed",
  needs_review: "Needs Review",
  failed: "Failed",
  cancelled: "Cancelled",
  requires_confirmation: "Awaiting Action",
  waiting_for_user: "Awaiting Action",
  collecting_evidence: "Collecting Evidence",
  analyzing: "Analyzing",
  evaluating: "Evaluating",
  verified: "Verified",
  awaiting_admin_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  inconclusive: "Inconclusive",
};

function statusLabel(status: string) {
  if (!status) return "";
  return STATUS_LABEL[status.toLowerCase()] ?? status.replaceAll("_", " ");
}

function statusClass(status: string) {
  if (!status) return "running";
  const s = status.toLowerCase();
  if (["completed", "verified", "approved"].includes(s)) return "verified";
  if (["failed", "rejected", "cancelled"].includes(s)) return "failed";
  if (["pending", "created", "queued", "requires_confirmation", "waiting_for_user"].includes(s)) return "pending";
  if (["needs_review", "awaiting_admin_review", "inconclusive", "partially_completed"].includes(s)) return "warning";
  return "running";
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const [users, setUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [selectedReview, setSelectedReview] = useState<any | null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [overrideConfidence, setOverrideConfidence] = useState("");
  const [overrideResult, setOverrideResult] = useState("");
  const [reviewActionLoading, setReviewActionLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("overview"); // overview or messages
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [messageFilter, setMessageFilter] = useState("all"); // all, unread, archived
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [chartPeriod, setChartPeriod] = useState("This Year");
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const fetchReviews = async () => {
    try {
      const res = await api.get("/admin/reviews");
      setReviews(res.data);
    } catch (err) {
      toast("Failed to load tasks needing review", "error");
    }
  };

  const fetchExecutions = async () => {
    try {
      const res = await api.get("/admin/executions");
      setExecutions(res.data);
    } catch (err) {
      toast("Failed to load execution logs", "error");
    }
  };

  const fetchEvidence = async () => {
    try {
      const res = await api.get("/admin/evidence");
      setEvidenceList(res.data);
    } catch (err) {
      toast("Failed to load evidence records", "error");
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await api.get("/admin/audit-logs");
      setAuditLogs(res.data);
    } catch (err) {
      toast("Failed to load audit logs", "error");
    }
  };

  // Load real-time admin statistics
  const loadData = async () => {
    try {
      const [usersRes, tasksRes, messagesRes, reviewsRes, execRes, evRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/tasks"),
        api.get("/admin/contact-messages"),
        api.get("/admin/reviews"),
        api.get("/admin/executions"),
        api.get("/admin/evidence")
      ]);
      setUsers(usersRes.data);
      setTasks(tasksRes.data);
      setContactMessages(messagesRes.data);
      setReviews(reviewsRes.data);
      setExecutions(execRes.data);
      setEvidenceList(evRes.data);
    } catch (error) {
      console.error("Failed to load admin dashboard statistics", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === "reviews") {
      fetchReviews();
    } else if (activeTab === "executions") {
      fetchExecutions();
    } else if (activeTab === "evidence") {
      fetchEvidence();
    } else if (activeTab === "audit-logs") {
      fetchAuditLogs();
    } else if (activeTab === "tasks") {
      loadData();
    }
  }, [activeTab]);

  const handleReviewAction = async (action: "approve" | "reject" | "override") => {
    if (!selectedReview) return;
    const reason = reviewReason.trim();
    if (!reason) {
      toast("Review action reason is required.", "error");
      return;
    }
    
    const body: any = { reason };
    if (action === "override") {
      if (overrideConfidence.trim()) {
        const conf = parseFloat(overrideConfidence);
        if (isNaN(conf) || conf < 0 || conf > 100) {
          toast("Confidence score must be a number between 0 and 100", "error");
          return;
        }
        body.confidence_score = conf;
      }
      if (overrideResult.trim()) {
        body.final_result = overrideResult.trim();
      }
    }
    
    setReviewActionLoading(true);
    try {
      await api.post(`/admin/reviews/${selectedReview.id}/${action}`, body);
      toast(`Successfully submitted ${action.toUpperCase()} action for Task #${selectedReview.id}`, "success");
      setReviewReason("");
      setOverrideConfidence("");
      setOverrideResult("");
      setSelectedReview(null);
      fetchReviews();
      loadData(); // Reload stats
    } catch (err) {
      toast(`Failed to execute review ${action}`, "error");
    } finally {
      setReviewActionLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
    toast("Logged out successfully", "success");
  };

  const handleAction = (actionName: string) => {
    toast(`Launched Admin Tool: ${actionName}`, "success");
  };

  // Contact Messages Handlers
  const handleMarkAsRead = async (id: number) => {
    try {
      await api.put(`/admin/contact-messages/${id}/status`, { status: "read" });
      toast("Message marked as read", "success");
      loadData();
      if (selectedMessage && selectedMessage.id === id) {
        setSelectedMessage((prev: any) => prev ? { ...prev, status: "read" } : null);
      }
    } catch (err) {
      toast("Failed to update message status", "error");
    }
  };


  const handleCloseMessage = async (id: number) => {
    try {
      await api.put(`/admin/contact-messages/${id}/status`, { status: "closed" });
      toast("Message closed successfully", "success");
      loadData();
      if (selectedMessage && selectedMessage.id === id) {
        setSelectedMessage((prev: any) => prev ? { ...prev, status: "closed" } : null);
      }
    } catch (err) {
      toast("Failed to close message", "error");
    }
  };

  const handleSendReply = async (id: number) => {
    const text = replyText.trim();
    if (!text) {
      toast("Reply message cannot be empty.", "error");
      return;
    }
    setIsReplying(true);
    try {
      const response = await api.post(`/admin/contact-messages/${id}/reply`, { admin_reply: text });
      toast("Reply sent successfully and logged in database.", "success");
      setReplyText("");
      loadData();
      if (selectedMessage && selectedMessage.id === id) {
        setSelectedMessage(response.data);
      }
    } catch (err) {
      toast("Failed to send reply.", "error");
    } finally {
      setIsReplying(false);
    }
  };

  const handleDeleteMessage = async (id: number) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      await api.delete(`/admin/contact-messages/${id}`);
      toast("Message deleted successfully", "success");
      setSelectedMessage(null);
      loadData();
    } catch (err) {
      toast("Failed to delete message", "error");
    }
  };

  const newCount = contactMessages.filter(m => m.status === "new").length;

  // Filter contact messages based on search query and status filter
  const filteredMessages = contactMessages.filter((msg) => {
    if (!msg) return false;
    if (messageFilter === "unread" && msg.status !== "new") return false;
    if (messageFilter === "archived" && msg.status !== "closed") return false;
    if (messageFilter === "all" && msg.status === "closed") return false;

    const search = searchQuery.toLowerCase();
    const senderName = msg.name || msg.fullname || "";
    const email = msg.email || "";
    const subject = msg.subject || "";
    const messageText = msg.message || "";

    return (
      senderName.toLowerCase().includes(search) ||
      email.toLowerCase().includes(search) ||
      subject.toLowerCase().includes(search) ||
      messageText.toLowerCase().includes(search)
    );
  });

  // Notifications generated dynamically from the review queue
  const notifications = tasks
    .filter((t) => ["needs_review", "awaiting_admin_review", "failed"].includes(t.status))
    .map((t) => ({
      id: t.id,
      text: `Verification #${t.id} ("${t.title.slice(0, 30)}...") requires attention.`,
      time: "Requires Review",
      unread: true
    }));

  // User Map to map tasks to actual registered users' names
  const userMap = new Map(users.map((u: any) => [u.id, u.fullname]));

  // Stats computations from database records
  const totalUsers = users.filter((u: any) => u.role === "user").length;
  const totalVerifications = tasks.length;

  // Group task volume by month for SVG Chart
  const monthlyCounts = Array(12).fill(0);
  tasks.forEach((t) => {
    const date = new Date(t.created_at);
    if (!isNaN(date.getTime())) {
      monthlyCounts[date.getMonth()] += 1;
    }
  });

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
  const maxCount = Math.max(...monthlyCounts.slice(0, 8), 1);
  const points = months.map((month, idx) => {
    const count = monthlyCounts[idx];
    const y = 220 - (count / maxCount) * 160;
    const x = 50 + idx * 85;
    return { x, y, label: month, value: count };
  });

  let path = "";
  let fillPath = "";
  if (points.length > 0) {
    path = `M ${points[0].x} ${points[0].y}`;
    points.slice(1).forEach((pt) => {
      path += ` L ${pt.x} ${pt.y}`;
    });
    fillPath = `${path} L ${points[points.length - 1].x} 220 L ${points[0].x} 220 Z`;
  }

  return (
    <div className="admin-dashboard">
      {/* =====================================================
          SIDEBAR
      ===================================================== */}
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <Logo subtitle="Admin Center" size="sm" />
        </div>

        <nav className="admin-nav">
          <button
            className={`admin-nav-item ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <Layers size={18} />
            <span>Overview</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === "reviews" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("reviews");
              setSelectedReview(null);
            }}
          >
            <ShieldAlert size={18} />
            <span>Needs Review</span>
            {reviews.length > 0 && <span className="admin-nav-badge" style={{ background: "#ef4444" }}>{reviews.length}</span>}
          </button>

          <button
            className={`admin-nav-item ${activeTab === "tasks" ? "active" : ""}`}
            onClick={() => setActiveTab("tasks")}
          >
            <CheckCircle2 size={18} />
            <span>Tasks</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === "executions" ? "active" : ""}`}
            onClick={() => setActiveTab("executions")}
          >
            <Layers size={18} />
            <span>Executions</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === "evidence" ? "active" : ""}`}
            onClick={() => setActiveTab("evidence")}
          >
            <ShieldCheck size={18} />
            <span>Evidence</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === "audit-logs" ? "active" : ""}`}
            onClick={() => setActiveTab("audit-logs")}
          >
            <ShieldCheck size={18} />
            <span>Audit Logs</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            <Users size={18} />
            <span>Users</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === "messages" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("messages");
              setSelectedMessage(null);
            }}
          >
            <Mail size={18} />
            <span>Messages</span>
            {newCount > 0 && <span className="admin-nav-badge">{newCount}</span>}
          </button>
        </nav>

        <button className="admin-logout" onClick={handleLogout}>
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </aside>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}
      <main className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <div className="header-welcome">
            <h1>Admin Control Panel 👑</h1>
            <p className="admin-subtitle">
              Monitor and manage the VeriNova platform statistics:
            </p>
          </div>

          <div className="header-actions">
            {/* Search Input */}
            <div className="search-container">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Theme Toggle */}
            <button onClick={toggleTheme} className="theme-toggle-btn" aria-label="Toggle Theme">
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* Notification Bell */}
            <div className="notification-wrapper">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="header-action-btn"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {notifications.length > 0 && <span className="notification-badge"></span>}
              </button>

              {showNotifications && (
                <div className="notifications-dropdown glass-panel">
                  <div className="dropdown-header">
                    <h3>System Alerts</h3>
                    <button onClick={() => setShowNotifications(false)} className="close-btn"><X size={14} /></button>
                  </div>
                  <div className="dropdown-body">
                    {notifications.map((n) => (
                      <div key={n.id} className="notification-item unread">
                        <p>{n.text}</p>
                        <span>{n.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Admin Profile Chip */}
            <div className="profile-chip-wrapper">
              <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="profile-chip">
                <div className="admin-avatar-placeholder">A</div>
                <div className="profile-info">
                  <strong>{user.fullname}</strong>
                  <span className="admin-role-span">Administrator</span>
                </div>
                <ChevronDown size={14} />
              </button>

              {showProfileMenu && (
                <div className="profile-menu glass-panel">
                  <div className="menu-item" onClick={() => handleAction("Admin Profile")}>
                    <ShieldCheck size={14} />
                    <span>My Profile</span>
                  </div>
                  <div className="menu-item" onClick={() => handleAction("System Configuration")}>
                    <Settings size={14} />
                    <span>System Settings</span>
                  </div>
                  <hr className="menu-divider" />
                  <div className="menu-item logout" onClick={handleLogout}>
                    <LogOut size={14} />
                    <span>Logout</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {activeTab === "overview" ? (
          <>
            {/* =====================================================
                STATS ROW
            ===================================================== */}
            <section className="stats-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "15px", marginBottom: "20px", width: "100%" }}>
              <div className="stat-card purple-theme">
                <div className="stat-icon-wrapper"><Users size={20} /></div>
                <div className="stat-details">
                  <span>Total Users</span>
                  <strong>{totalUsers}</strong>
                  <small>Registered accounts</small>
                </div>
              </div>

              <div className="stat-card green-theme">
                <div className="stat-icon-wrapper"><CheckCircle2 size={20} /></div>
                <div className="stat-details">
                  <span>Total Tasks</span>
                  <strong>{totalVerifications}</strong>
                  <small>All operations</small>
                </div>
              </div>

              <div className="stat-card orange-theme">
                <div className="stat-icon-wrapper"><Clock size={20} /></div>
                <div className="stat-details">
                  <span>Running Tasks</span>
                  <strong>{tasks.filter((t: any) => ["planning", "collecting_evidence", "analyzing", "verifying", "evaluating", "executing", "running", "queued"].includes(t.status)).length}</strong>
                  <small>Currently active</small>
                </div>
              </div>

              <div className="stat-card green-theme">
                <div className="stat-icon-wrapper"><CheckCircle2 size={20} /></div>
                <div className="stat-details">
                  <span>Completed Tasks</span>
                  <strong>{tasks.filter((t: any) => ["completed", "verified", "approved"].includes(t.status)).length}</strong>
                  <small>Successful outcomes</small>
                </div>
              </div>

              <div className="stat-card red-theme" style={{ background: "#fff0f0", color: "#d43c3c" }}>
                <div className="stat-icon-wrapper" style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}><X size={20} /></div>
                <div className="stat-details">
                  <span style={{ color: "#7f1d1d" }}>Failed Tasks</span>
                  <strong style={{ color: "#d43c3c" }}>{tasks.filter((t: any) => ["failed", "rejected"].includes(t.status)).length}</strong>
                  <small style={{ color: "#b91c1c" }}>Errors & Rejections</small>
                </div>
              </div>

              <div className="stat-card orange-theme">
                <div className="stat-icon-wrapper"><Clock size={20} /></div>
                <div className="stat-details">
                  <span>Needs Review</span>
                  <strong>{tasks.filter((t: any) => ["needs_review", "awaiting_admin_review"].includes(t.status)).length}</strong>
                  <small>Awaiting attention</small>
                </div>
              </div>

              <div className="stat-card purple-theme">
                <div className="stat-icon-wrapper"><Layers size={20} /></div>
                <div className="stat-details">
                  <span>Success Rate</span>
                  <strong>
                    {Number(
                      (tasks.filter((t: any) => ["completed", "verified", "approved"].includes(t.status)).length /
                        (tasks.filter((t: any) => ["completed", "verified", "approved", "failed", "rejected", "inconclusive"].includes(t.status)).length || 1)) *
                        100
                    ).toFixed(0)}%
                  </strong>
                  <small>Verification quality</small>
                </div>
              </div>

              <div className="stat-card green-theme">
                <div className="stat-icon-wrapper"><ShieldCheck size={20} /></div>
                <div className="stat-details">
                  <span>Agent Activity</span>
                  <strong>{tasks.some((t: any) => ["planning", "collecting_evidence", "analyzing", "verifying", "evaluating", "executing", "running"].includes(t.status)) ? "ACTIVE" : "IDLE"}</strong>
                  <small>AI Agent daemon state</small>
                </div>
              </div>

              <div className="stat-card purple-theme">
                <div className="stat-icon-wrapper"><Clock size={20} /></div>
                <div className="stat-details">
                  <span>Agent Executions</span>
                  <strong>{executions.length}</strong>
                  <small>Total tool actions logged</small>
                </div>
              </div>

              <div className="stat-card green-theme">
                <div className="stat-icon-wrapper"><ShieldCheck size={20} /></div>
                <div className="stat-details">
                  <span>Successful Tools</span>
                  <strong>{evidenceList.length}</strong>
                  <small>Successful tool steps</small>
                </div>
              </div>

              <div className="stat-card red-theme" style={{ background: "#fff0f0", color: "#d43c3c" }}>
                <div className="stat-icon-wrapper" style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}><ShieldAlert size={20} /></div>
                <div className="stat-details">
                  <span style={{ color: "#7f1d1d" }}>Tool Failures</span>
                  <strong style={{ color: "#d43c3c" }}>{executions.filter((e: any) => e.status === "failed" || e.step === "tool_execution_failed").length}</strong>
                  <small style={{ color: "#b91c1c" }}>Errors in execution</small>
                </div>
              </div>

              <div className="stat-card purple-theme">
                <div className="stat-icon-wrapper"><Layers size={20} /></div>
                <div className="stat-details">
                  <span>Average Confidence</span>
                  <strong>
                    {Number(
                      tasks.filter((t: any) => t.confidence_score != null).reduce((sum: number, t: any) => sum + t.confidence_score, 0) /
                        (tasks.filter((t: any) => t.confidence_score != null).length || 1)
                    ).toFixed(1)}%
                  </strong>
                  <small>Average confidence score</small>
                </div>
              </div>
            </section>

            {/* =====================================================
                MIDDLE ROW: CHART & PENDING REQUESTS
            ===================================================== */}
            <div className="dashboard-grid-two-cols">
              {/* Chart Card */}
              <section className="dashboard-panel chart-panel">
                <div className="panel-header">
                  <h2>User Signup & Volume</h2>
                  <div className="select-wrapper">
                    <select value={chartPeriod} onChange={(e) => setChartPeriod(e.target.value)}>
                      <option value="This Year">This Year</option>
                    </select>
                    <ChevronDown size={14} />
                  </div>
                </div>

                <div className="chart-container">
                  <svg viewBox="0 0 700 240" className="verification-svg-chart">
                    <defs>
                      <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(255, 107, 0, 0.24)" />
                        <stop offset="100%" stopColor="rgba(255, 107, 0, 0.0)" />
                      </linearGradient>
                    </defs>

                    {/* Y-axis gridlines */}
                    <line x1="50" y1="40" x2="650" y2="40" stroke="var(--dash-border)" strokeDasharray="4 4" />
                    <line x1="50" y1="85" x2="650" y2="85" stroke="var(--dash-border)" strokeDasharray="4 4" />
                    <line x1="50" y1="130" x2="650" y2="130" stroke="var(--dash-border)" strokeDasharray="4 4" />
                    <line x1="50" y1="175" x2="650" y2="175" stroke="var(--dash-border)" strokeDasharray="4 4" />
                    <line x1="50" y1="220" x2="650" y2="220" stroke="var(--dash-border)" />

                    {/* Y-axis Labels */}
                    <text x="30" y="45" fill="var(--dash-secondary)" fontSize="10">{maxCount}</text>
                    <text x="30" y="90" fill="var(--dash-secondary)" fontSize="10">{Math.round(maxCount * 0.75)}</text>
                    <text x="30" y="135" fill="var(--dash-secondary)" fontSize="10">{Math.round(maxCount * 0.5)}</text>
                    <text x="30" y="180" fill="var(--dash-secondary)" fontSize="10">{Math.round(maxCount * 0.25)}</text>
                    <text x="30" y="224" fill="var(--dash-secondary)" fontSize="10">0</text>

                    {/* Area Gradient Fill */}
                    {fillPath && <path d={fillPath} fill="url(#chartGlow)" />}

                    {/* Line Path */}
                    {path && <path d={path} fill="none" stroke="#ff6b00" strokeWidth="3" strokeLinecap="round" />}

                    {/* Markers */}
                    {points.map((pt, idx) => (
                      <g key={idx} className="chart-marker-group">
                        <circle cx={pt.x} cy={pt.y} r="5" fill="#ffffff" stroke="#ff6b00" strokeWidth="2.5" />
                        <text x={pt.x} y="238" fill="var(--dash-secondary)" fontSize="10" textAnchor="middle">{pt.label}</text>
                      </g>
                    ))}
                  </svg>
                </div>
              </section>

              {/* User Tasks Activity Queue */}
              <section className="dashboard-panel activity-panel">
                <div className="panel-header">
                  <h2>User Tasks Activity</h2>
                </div>

                {loading ? (
                  <div className="loading-state">Loading user tasks...</div>
                ) : tasks.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <h3>No User Tasks Yet</h3>
                    <p>Tasks executed by registered users will appear here.</p>
                  </div>
                ) : (
                  <div className="activity-list">
                    {tasks.slice(0, 5).map((t) => {
                      const applicantName = userMap.get(t.user_id) || `User #${t.user_id}`;
                      return (
                        <div key={t.id} className="activity-item admin-queue-item">
                          <div className="activity-icon orange-bg">
                            <Clock size={16} />
                          </div>
                          <div className="activity-details">
                            <h4>{applicantName}</h4>
                            <span className="req-type-span">{t.title} ({t.task_type.toUpperCase()})</span>
                            <div style={{ marginTop: "3px", display: "flex", gap: "6px", alignItems: "center" }}>
                              <span className={`status-pill ${statusClass(t.status)}`}>
                                {statusLabel(t.status)}
                              </span>
                              <span style={{ fontSize: "10px", color: "var(--dash-secondary)" }}>
                                {new Date(t.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {tasks.length > 5 && (
                  <button onClick={() => setActiveTab("tasks")} className="view-all-link">
                    View All User Tasks
                  </button>
                )}
              </section>
            </div>

            {/* =====================================================
                BOTTOM ROW: SYSTEM CONTROLS & SECURITY NOTICE
            ===================================================== */}
            <div className="dashboard-grid-two-cols bottom-row">
              {/* Quick Management Links */}
              <section className="dashboard-panel quick-actions-panel">
                <div className="panel-header">
                  <h2>Management Modules</h2>
                </div>

                <div className="actions-grid-2x2">
                  <button className="action-button-card" onClick={() => handleAction("User database profiles")}>
                    <div className="action-icon purple-bg">
                      <Users size={18} />
                    </div>
                    <div className="action-text">
                      <h3>User Management</h3>
                      <p>Create, update or block accounts</p>
                    </div>
                  </button>

                  <button className="action-button-card" onClick={() => handleAction("Verification guidelines")}>
                    <div className="action-icon blue-bg">
                      <CheckCircle2 size={18} />
                    </div>
                    <div className="action-text">
                      <h3>Trust System</h3>
                      <p>Configure verifiers and rules</p>
                    </div>
                  </button>


                  <button className="action-button-card" onClick={() => handleAction("System log auditor")}>
                    <div className="action-icon red-bg">
                      <ShieldAlert size={18} />
                    </div>
                    <div className="action-text">
                      <h3>Security Auditor</h3>
                      <p>View administrative actions log</p>
                    </div>
                  </button>
                </div>
              </section>

              {/* Security Banner Card */}
              <section className="dashboard-panel verification-status-card admin-security-banner">
                <div className="status-card-inner">
                  <div className="status-badge-wrapper">
                    <span className="card-label">System Notice</span>
                    <span className="verification-badge-pill green">Active</span>
                  </div>
                  
                  <h2>VeriNova Platform Operational</h2>
                  <p>Platform services are currently online. Database and caching services are working normally.</p>
                  
                  <div className="status-badge-shield">
                    <ShieldAlert size={72} />
                  </div>
                </div>
              </section>
            </div>
          </>
        ) : activeTab === "reviews" ? (
          /* =====================================================
              EXCEPTION REVIEWS VIEW
          ===================================================== */
          <div className="dashboard-grid-two-cols messages-split-layout">
            {/* Left Column: Tasks List */}
            <section className="dashboard-panel messages-list-panel text-left">
              <div className="panel-header-messages">
                <h2>Needs Review ({reviews.length})</h2>
              </div>

              {loading ? (
                <div className="loading-state">Loading reviews queue...</div>
              ) : reviews.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✓</div>
                  <h3>No Reviews Pending</h3>
                  <p>All tasks have resolved automatically with high confidence.</p>
                </div>
              ) : (
                <div className="contact-messages-list">
                  {reviews.map((taskItem) => {
                    const isSelected = selectedReview && selectedReview.id === taskItem.id;
                    const applicantName = users.find(u => u.id === taskItem.user_id)?.fullname || `User #${taskItem.user_id}`;
                    return (
                      <div
                        key={taskItem.id}
                        onClick={async () => {
                          setSelectedReview(taskItem);
                          try {
                            const detailRes = await api.get(`/admin/tasks/${taskItem.id}/conversation`);
                            setSelectedReview(detailRes.data);
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className={`message-list-item ${isSelected ? "selected" : ""}`}
                        style={{ padding: "12px", borderBottom: "1px solid var(--dash-border)", cursor: "pointer" }}
                      >
                        <div className="msg-header" style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <strong className="msg-sender" style={{ fontSize: "13px" }}>{applicantName}</strong>
                          <span className="msg-date" style={{ fontSize: "11px", color: "var(--dash-secondary)" }}>
                            #{taskItem.id}
                          </span>
                        </div>
                        <div className="msg-subject" style={{ fontSize: "12px", fontWeight: 700, margin: "2px 0" }}>{taskItem.title}</div>
                        <div className="msg-body-preview" style={{ fontSize: "11px", color: "var(--dash-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {taskItem.description}
                        </div>
                        <div style={{ display: "flex", gap: "8px", marginTop: "6px", alignItems: "center" }}>
                          <span className="status-pill warning" style={{ fontSize: "9px", padding: "2px 6px" }}>{taskItem.review_status}</span>
                          <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--dash-primary)" }}>
                            {taskItem.confidence_score != null ? `${Number(taskItem.confidence_score).toFixed(0)}% Conf.` : "No Confidence Score"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Right Column: Selected Task Details */}
            <section className="dashboard-panel message-detail-panel text-left">
              {selectedReview ? (
                <div className="message-detail-view" style={{ height: "100%", display: "flex", flexDirection: "column", gap: "15px" }}>
                  <div className="detail-header" style={{ borderBottom: "1px solid var(--dash-border)", paddingBottom: "12px" }}>
                    <div className="detail-meta">
                      <span style={{ fontSize: "10px", color: "var(--dash-primary)", fontWeight: 700, textTransform: "uppercase" }}>TASK REVIEW PANEL</span>
                      <h2 style={{ fontSize: "16px", margin: "4px 0" }}>{selectedReview.title}</h2>
                      <div className="sender-info-line" style={{ fontSize: "11px", color: "var(--dash-secondary)" }}>
                        <strong>User:</strong> {users.find(u => u.id === selectedReview.user_id)?.fullname || `User #${selectedReview.user_id}`}
                      </div>
                    </div>
                  </div>

                  <div className="detail-body-container" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "15px", paddingRight: "5px" }}>
                    <div style={{ background: "var(--dash-bg)", padding: "12px", borderRadius: "10px", border: "1px solid var(--dash-border)" }}>
                      <h4 style={{ fontSize: "12px", margin: "0 0 6px 0", color: "var(--dash-primary)" }}>Request Description</h4>
                      <p style={{ margin: 0, fontSize: "12px", color: "var(--dash-text)", whiteSpace: "pre-wrap" }}>{selectedReview.description || "No description provided."}</p>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div style={{ background: "var(--dash-bg)", padding: "10px", borderRadius: "8px", border: "1px solid var(--dash-border)" }}>
                        <span style={{ fontSize: "9px", color: "var(--dash-secondary)", textTransform: "uppercase" }}>Verification Status</span>
                        <strong style={{ display: "block", fontSize: "13px", color: "#ef4444" }}>{selectedReview.verification_status || "NEEDS_REVIEW"}</strong>
                      </div>
                      <div style={{ background: "var(--dash-bg)", padding: "10px", borderRadius: "8px", border: "1px solid var(--dash-border)" }}>
                        <span style={{ fontSize: "9px", color: "var(--dash-secondary)", textTransform: "uppercase" }}>AI Confidence</span>
                        <strong style={{ display: "block", fontSize: "13px", color: "var(--dash-primary)" }}>{selectedReview.confidence_score != null ? `${Number(selectedReview.confidence_score).toFixed(1)}%` : "N/A"}</strong>
                      </div>
                    </div>

                    {selectedReview.verification_explanation && (
                      <div style={{ background: "rgba(239, 68, 68, 0.05)", borderLeft: "3px solid #ef4444", padding: "10px", borderRadius: "6px" }}>
                        <strong style={{ fontSize: "10px", color: "#ef4444", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Engine Assessment Explanation</strong>
                        <p style={{ margin: 0, fontSize: "11px", color: "var(--dash-text)" }}>{selectedReview.verification_explanation}</p>
                      </div>
                    )}

                    {selectedReview.plan && (
                      <div style={{ background: "var(--dash-bg)", padding: "10px", borderRadius: "8px", border: "1px solid var(--dash-border)" }}>
                        <strong style={{ fontSize: "11px", color: "var(--dash-primary)", display: "block", marginBottom: "6px" }}>📋 AI Agent Plan</strong>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {selectedReview.plan.steps?.map((step: any) => (
                            <div key={step.step_number} style={{ display: "flex", gap: "8px", background: "var(--brand-card)", padding: "5px 8px", borderRadius: "6px", border: "1px solid var(--dash-border)", fontSize: "10px" }}>
                              <span style={{ display: "grid", placeItems: "center", width: "16px", height: "16px", background: "var(--dash-primary)", color: "white", borderRadius: "50%", fontSize: "9px", fontWeight: 800, flexShrink: 0 }}>
                                {step.step_number}
                              </span>
                              <div>
                                <strong>{step.description}</strong>
                                <span style={{ color: "var(--dash-secondary)", fontSize: "9px", display: "block" }}>Tool: {step.tool}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(() => {
                      const selectedExecutions = executions.filter(e => e.task_id === selectedReview.id);
                      const selectedEvidence = evidenceList.filter(ev => ev.task_id === selectedReview.id);
                      return (
                        <>
                          {selectedExecutions.length > 0 && (
                            <div style={{ background: "var(--dash-bg)", padding: "10px", borderRadius: "8px", border: "1px solid var(--dash-border)" }}>
                              <strong style={{ fontSize: "11px", color: "var(--dash-primary)", display: "block", marginBottom: "6px" }}>⚙️ Tool Execution Activity</strong>
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                {selectedExecutions.map((log) => (
                                  <div key={log.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--brand-card)", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--dash-border)", fontSize: "10px" }}>
                                    <div>
                                      <strong style={{ display: "block", textTransform: "capitalize" }}>{log.step.replace(/_/g, " ")} ({log.duration_ms}ms)</strong>
                                      <span style={{ color: "var(--dash-secondary)", fontSize: "9px" }}>{log.message}</span>
                                    </div>
                                    <span className={`status-pill ${log.status === "completed" ? "verified" : log.status === "failed" ? "failed" : "pending"}`} style={{ fontSize: "8px" }}>{log.status}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {selectedEvidence.length > 0 && (
                            <div style={{ background: "var(--dash-bg)", padding: "10px", borderRadius: "8px", border: "1px solid var(--dash-border)" }}>
                              <strong style={{ fontSize: "11px", color: "var(--dash-primary)", display: "block", marginBottom: "6px" }}>🔍 Captured Evidence ({selectedEvidence.length})</strong>
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                {selectedEvidence.map((ev) => (
                                  <div key={ev.id} style={{ background: "var(--brand-card)", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--dash-border)", fontSize: "10px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                      <strong>Source: {ev.source_name}</strong>
                                      <span style={{ color: "var(--dash-secondary)", fontSize: "9px" }}>{new Date(ev.collected_at).toLocaleTimeString()}</span>
                                    </div>
                                    <p style={{ margin: 0, color: "var(--dash-secondary)", fontSize: "9px", marginBottom: "4px" }}>{ev.description}</p>
                                    {formatEvidenceData(ev)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* Evidence Section */}
                    {selectedReview.messages && selectedReview.messages.some((m: any) => m.message_type === "result") && (
                      <div style={{ background: "var(--dash-bg)", padding: "10px", borderRadius: "8px", border: "1px solid var(--dash-border)" }}>
                        <strong style={{ fontSize: "11px", color: "var(--dash-primary)", display: "block", marginBottom: "6px" }}>📝 Verification Messages & Evidence</strong>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {selectedReview.messages.filter((m: any) => m.message_type === "result").map((m: any) => (
                            <div key={m.id} style={{ background: "var(--brand-card)", padding: "8px", borderRadius: "6px", border: "1px solid var(--dash-border)", fontSize: "11px" }}>
                              <div style={{ color: "var(--dash-secondary)", fontSize: "9px", marginBottom: "4px" }}>Assistant Result Payload:</div>
                              <div style={{ whiteSpace: "pre-wrap" }}>{m.message}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Review Decision Form */}
                    <div style={{ borderTop: "1px solid var(--dash-border)", paddingTop: "15px", display: "flex", flexDirection: "column", gap: "10px" }}>
                      <h3 style={{ fontSize: "13px", fontWeight: 800, color: "var(--dash-text)", margin: 0 }}>Administrative Decision Layer</h3>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "10px", color: "var(--dash-secondary)", fontWeight: 700 }}>REASON FOR ACTION (AUDITED)</label>
                        <textarea
                          value={reviewReason}
                          onChange={(e) => setReviewReason(e.target.value)}
                          placeholder="Provide the reason for this administrative review decision. This will be recorded permanently in the audit logs."
                          rows={3}
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--dash-border)", background: "var(--dash-bg)", color: "var(--dash-text)", resize: "none", fontSize: "12px" }}
                        />
                      </div>

                      <div style={{ background: "rgba(255,107,0,0.03)", border: "1px dashed var(--dash-border)", padding: "10px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        <span style={{ fontSize: "10px", color: "var(--dash-primary)", fontWeight: 700 }}>OVERRIDE VALUES (OPTIONAL)</span>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                          <input
                            type="number"
                            placeholder="New Confidence %"
                            value={overrideConfidence}
                            onChange={(e) => setOverrideConfidence(e.target.value)}
                            style={{ padding: "8px", border: "1px solid var(--dash-border)", background: "var(--dash-bg)", color: "var(--dash-text)", borderRadius: "6px", fontSize: "11px" }}
                          />
                          <input
                            type="text"
                            placeholder="New Final Result text"
                            value={overrideResult}
                            onChange={(e) => setOverrideResult(e.target.value)}
                            style={{ padding: "8px", border: "1px solid var(--dash-border)", background: "var(--dash-bg)", color: "var(--dash-text)", borderRadius: "6px", fontSize: "11px" }}
                          />
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>
                        <button
                          onClick={() => handleReviewAction("reject")}
                          disabled={reviewActionLoading || !reviewReason.trim()}
                          className="action-pill-btn delete"
                          style={{ padding: "10px 15px", fontSize: "12px", fontWeight: 700, borderRadius: "8px", display: "flex", alignItems: "center", gap: "5px" }}
                        >
                          Reject Request
                        </button>
                        <button
                          onClick={() => handleReviewAction("approve")}
                          disabled={reviewActionLoading || !reviewReason.trim()}
                          className="action-pill-btn read"
                          style={{ padding: "10px 15px", fontSize: "12px", fontWeight: 700, borderRadius: "8px", display: "flex", alignItems: "center", gap: "5px" }}
                        >
                          Approve Request
                        </button>
                        <button
                          onClick={() => handleReviewAction("override")}
                          disabled={reviewActionLoading || !reviewReason.trim()}
                          className="action-pill-btn archive"
                          style={{ padding: "10px 15px", fontSize: "12px", fontWeight: 700, borderRadius: "8px", background: "var(--dash-primary)", color: "white", display: "flex", alignItems: "center", gap: "5px" }}
                        >
                          Override Result
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-state" style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div className="empty-icon">🛡</div>
                  <h3>Select a Task for Review</h3>
                  <p>Pick a request from the sidebar queue to perform auditing actions.</p>
                </div>
              )}
            </section>
          </div>

        ) : activeTab === "tasks" ? (
          /* =====================================================
              ALL TASKS MONITORING VIEW
          ===================================================== */
          <div className="dashboard-grid-one-col" style={{ width: "100%" }}>
            <section className="dashboard-panel full-width-panel text-left">
              <div className="panel-header" style={{ marginBottom: "15px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: 800 }}>Platform Tasks Monitor</h2>
                <span style={{ fontSize: "12px", color: "var(--dash-secondary)" }}>Audit all user request flows and verification scores</span>
              </div>

              <div className="users-table-container" style={{ width: "100%", overflowX: "auto" }}>
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>User</th>
                      <th>Title</th>
                      <th>Task Type</th>
                      <th>Status</th>
                      <th>Verification</th>
                      <th>Confidence</th>
                      <th>Admin Review</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.filter(t => {
                      if (!searchQuery) return true;
                      return t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             String(t.id).includes(searchQuery);
                    }).map((t) => {
                      const userObj = users.find(u => u.id === t.user_id);
                      return (
                        <tr key={t.id}>
                          <td>#{t.id}</td>
                          <td style={{ fontWeight: 700 }}>{userObj ? userObj.fullname : `User #${t.user_id}`}</td>
                          <td>{t.title}</td>
                          <td><code style={{ fontSize: "10px", background: "var(--dash-bg)", padding: "2px 4px", borderRadius: "4px" }}>{t.task_type.toUpperCase()}</code></td>
                          <td>
                            <span className={`status-pill ${statusClass(t.status)}`}>
                              {statusLabel(t.status)}
                            </span>
                          </td>
                          <td>
                            <strong style={{ color: t.verification_status === "VERIFIED" ? "#10b981" : t.verification_status === "CONFLICTED" ? "#ef4444" : "var(--dash-secondary)", fontSize: "11px" }}>
                              {t.verification_status || "NOT_STARTED"}
                            </strong>
                          </td>
                          <td style={{ fontWeight: 700 }}>{t.confidence_score != null ? `${Number(t.confidence_score).toFixed(1)}%` : "—"}</td>
                          <td>
                            <span className={`status-pill ${t.review_status === "REQUIRED" ? "failed" : t.review_status === "NOT_REQUIRED" ? "verified" : "warning"}`} style={{ fontSize: "10px" }}>
                              {t.review_status === "REQUIRED" ? "REQUIRED" : t.review_status === "NOT_REQUIRED" ? "NOT REQUIRED" : t.review_status}
                            </span>
                          </td>
                          <td style={{ fontSize: "11px" }}>{new Date(t.created_at).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

        ) : activeTab === "executions" ? (
          /* =====================================================
              AGENT EXECUTIONS LOG VIEW
          ===================================================== */
          <div className="dashboard-grid-one-col" style={{ width: "100%" }}>
            <section className="dashboard-panel full-width-panel text-left">
              <div className="panel-header" style={{ marginBottom: "15px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: 800 }}>Agent Execution Trace Log</h2>
                <span style={{ fontSize: "12px", color: "var(--dash-secondary)" }}>View real-time engine processing steps and loop timings</span>
              </div>

              <div className="users-table-container" style={{ width: "100%", overflowX: "auto" }}>
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Log ID</th>
                      <th>Task ID</th>
                      <th>Step</th>
                      <th>Message / Action</th>
                      <th>Status</th>
                      <th>Timing</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executions.map((log) => (
                      <tr key={log.id}>
                        <td>#{log.id}</td>
                        <td><strong style={{ color: "var(--dash-primary)" }}>#{log.task_id}</strong></td>
                        <td><code style={{ fontSize: "10px", background: "var(--dash-bg)", padding: "2px 4px", borderRadius: "4px" }}>{log.step}</code></td>
                        <td style={{ maxWidth: "350px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={log.message}>{log.message}</td>
                        <td>
                          <span className={`status-pill ${log.status === "completed" ? "verified" : "failed"}`}>
                            {log.status.toUpperCase()}
                          </span>
                        </td>
                        <td>{log.duration_ms ? `${log.duration_ms} ms` : "—"}</td>
                        <td style={{ fontSize: "11px" }}>{new Date(log.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

        ) : activeTab === "evidence" ? (
          /* =====================================================
              EVIDENCE GATHERED MONITOR
          ===================================================== */
          <div className="dashboard-grid-one-col" style={{ width: "100%" }}>
            <section className="dashboard-panel full-width-panel text-left">
              <div className="panel-header" style={{ marginBottom: "15px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: 800 }}>Evidence Collector Registry</h2>
                <span style={{ fontSize: "12px", color: "var(--dash-secondary)" }}>Audit all facts and datasets pulled from connected API verifiers</span>
              </div>

              <div className="users-table-container" style={{ width: "100%", overflowX: "auto" }}>
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Ev. ID</th>
                      <th>Task ID</th>
                      <th>Source Type</th>
                      <th>Source Name</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th>Collected Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evidenceList.map((ev) => (
                      <tr key={ev.id}>
                        <td>#{ev.id}</td>
                        <td><strong style={{ color: "var(--dash-primary)" }}>#{ev.task_id}</strong></td>
                        <td><span style={{ textTransform: "capitalize" }}>{ev.source_type}</span></td>
                        <td style={{ fontWeight: 700 }}>{ev.source_name}</td>
                        <td style={{ maxWidth: "400px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={ev.description}>{ev.description}</td>
                        <td>
                          <span className={`status-pill ${ev.status === "passed" ? "verified" : ev.status === "warning" ? "warning" : "failed"}`}>
                            {ev.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ fontSize: "11px" }}>{new Date(ev.collected_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

        ) : activeTab === "audit-logs" ? (
          /* =====================================================
              ADMINISTRATIVE AUDIT LOGS
          ===================================================== */
          <div className="dashboard-grid-one-col" style={{ width: "100%" }}>
            <section className="dashboard-panel full-width-panel text-left">
              <div className="panel-header" style={{ marginBottom: "15px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: 800 }}>Platform Audit Trail</h2>
                <span style={{ fontSize: "12px", color: "var(--dash-secondary)" }}>Permanent tamper-proof log of administrator review decisions</span>
              </div>

              <div className="users-table-container" style={{ width: "100%", overflowX: "auto" }}>
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Audit ID</th>
                      <th>Admin User</th>
                      <th>Task ID</th>
                      <th>Action</th>
                      <th>State Change</th>
                      <th>Justification / Reason</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", color: "var(--dash-secondary)", padding: "20px" }}>
                          No administrative review decisions have been logged yet.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => {
                        const adminName = users.find((u: any) => u.id === log.admin_user_id)?.fullname || `Admin #${log.admin_user_id}`;
                        return (
                          <tr key={log.id}>
                            <td>#{log.id}</td>
                            <td style={{ fontWeight: 700 }}>{adminName}</td>
                            <td><strong style={{ color: "var(--dash-primary)" }}>#{log.task_id}</strong></td>
                            <td>
                              <span className={`status-pill ${log.action === "APPROVE" ? "verified" : log.action === "REJECT" ? "failed" : "warning"}`} style={{ fontWeight: 800 }}>
                                {log.action}
                              </span>
                            </td>
                            <td>
                              <code style={{ fontSize: "11px" }}>
                                {log.previous_status || "—"} → {log.new_status || "—"}
                              </code>
                            </td>
                            <td style={{ maxWidth: "300px", whiteSpace: "normal", fontSize: "11px" }}>{log.reason}</td>
                            <td style={{ fontSize: "11px" }}>{new Date(log.created_at).toLocaleString()}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

        ) : activeTab === "users" ? (
          /* =====================================================
              USERS MANAGEMENT VIEW
          ===================================================== */
          <div className="dashboard-grid-one-col" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "24px" }}>
            <section className="dashboard-panel full-width-panel text-left">
              <div className="panel-header" style={{ marginBottom: "20px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: 800 }}>User Management</h2>
                <span className="panel-subtitle" style={{ fontSize: "13px", color: "var(--dash-secondary)" }}>
                  View and audit user database profiles and legal consent records
                </span>
              </div>

              <div className="users-table-container" style={{ width: "100%", overflowX: "auto" }}>
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Provider</th>
                      <th>Consent Accepted</th>
                      <th>Terms Version</th>
                      <th>Privacy Version</th>
                      <th>Consent Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 700 }}>{u.fullname}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`status-pill ${u.role === "admin" ? "verified" : "pending"}`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="capitalize">{u.provider}</td>
                        <td>
                          <span className={`status-pill ${u.terms_accepted ? "verified" : "failed"}`}>
                            {u.terms_accepted ? "Yes" : "No"}
                          </span>
                        </td>
                        <td>{u.terms_version || "N/A"}</td>
                        <td>{u.privacy_version || "N/A"}</td>
                        <td>
                          {u.legal_accepted_at
                            ? new Date(u.legal_accepted_at).toLocaleString()
                            : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : (
          /* =====================================================
              CONTACT MESSAGES VIEW
          ===================================================== */
          <div className="dashboard-grid-two-cols messages-split-layout">
            {/* Left Column: Messages List */}
            <section className="dashboard-panel messages-list-panel">
              <div className="panel-header-messages">
                <h2>Contact Messages</h2>
                <div className="messages-filters">
                  <button
                    onClick={() => setMessageFilter("all")}
                    className={`filter-btn ${messageFilter === "all" ? "active" : ""}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setMessageFilter("unread")}
                    className={`filter-btn ${messageFilter === "unread" ? "active" : ""}`}
                  >
                    New
                  </button>
                  <button
                    onClick={() => setMessageFilter("archived")}
                    className={`filter-btn ${messageFilter === "archived" ? "active" : ""}`}
                  >
                    Closed
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="loading-state">Loading messages...</div>
              ) : filteredMessages.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✉</div>
                  <h3>No Messages</h3>
                  <p>No contact messages found in this filter.</p>
                </div>
              ) : (
                <div className="contact-messages-list">
                  {filteredMessages.map((msg) => {
                    const isMsgUnread = msg.status === "new";
                    const isSelected = selectedMessage && selectedMessage.id === msg.id;
                    return (
                      <div
                        key={msg.id}
                        onClick={() => {
                          setSelectedMessage(msg);
                          if (isMsgUnread) {
                            handleMarkAsRead(msg.id);
                          }
                        }}
                        className={`message-list-item ${isSelected ? "selected" : ""} ${isMsgUnread ? "unread" : ""}`}
                      >
                        <div className="msg-header">
                          <strong className="msg-sender">{msg.name}</strong>
                          <span className="msg-date">
                            {new Date(msg.created_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric"
                            })}
                          </span>
                        </div>
                        <div className="msg-subject">{msg.subject}</div>
                        <div className="msg-body-preview">{msg.message}</div>
                        <div className="msg-badges">
                          <span className={`status-pill ${msg.status}`}>{msg.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Right Column: Selected Message Details */}
            <section className="dashboard-panel message-detail-panel">
              {selectedMessage ? (
                <div className="message-detail-view">
                  <div className="detail-header">
                    <div className="detail-meta">
                      <h2>{selectedMessage.subject}</h2>
                      <div className="sender-info-line">
                        <strong>From:</strong> {selectedMessage.name} (
                        <a href={`mailto:${selectedMessage.email}`} className="sender-email-link">
                          {selectedMessage.email}
                        </a>
                        )
                      </div>
                      <div className="date-info-line">
                        <strong>User ID:</strong> {selectedMessage.user_id}
                      </div>
                      <div className="date-info-line">
                        <strong>Date:</strong> {new Date(selectedMessage.created_at).toLocaleString()}
                      </div>
                      <div className="status-info-line">
                        <strong>Status:</strong>{" "}
                        <span className={`status-pill ${selectedMessage.status}`}>{selectedMessage.status}</span>
                      </div>
                    </div>
                    
                    {/* Action buttons inside details panel */}
                    <div className="detail-actions">
                      {selectedMessage.status === "new" && (
                        <button
                          onClick={() => handleMarkAsRead(selectedMessage.id)}
                          className="action-pill-btn read"
                        >
                          <Check size={14} />
                          <span>Mark Read</span>
                        </button>
                      )}
                      {selectedMessage.status !== "closed" && (
                        <button
                          onClick={() => handleCloseMessage(selectedMessage.id)}
                          className="action-pill-btn archive"
                        >
                          <X size={14} />
                          <span>Close</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteMessage(selectedMessage.id)}
                        className="action-pill-btn delete"
                      >
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  <div className="detail-body-container" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <p className="detail-message-text">{selectedMessage.message}</p>
                    
                    {selectedMessage.admin_reply && (
                      <div className="reply-history-container" style={{ marginTop: 16, padding: 16, background: "var(--dash-bg)", borderLeft: "3px solid #ff6b00", borderRadius: 8 }}>
                        <strong style={{ fontSize: 11, color: "#ff6b00", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Previous Reply Sent:</strong>
                        <p style={{ margin: 0, fontSize: 13, color: "var(--dash-text)", whiteSpace: "pre-wrap", fontWeight: 500 }}>{selectedMessage.admin_reply}</p>
                      </div>
                    )}

                    {selectedMessage.status !== "closed" && (
                      <div className="reply-form-container" style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid var(--dash-border)", paddingTop: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 800, color: "var(--dash-text)", margin: 0 }}>Send Reply to User</h3>
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type support reply here... The message will be stored and delivered to the user's registered email."
                          rows={4}
                          style={{
                            width: "100%",
                            padding: 12,
                            borderRadius: 12,
                            border: "1px solid var(--dash-border)",
                            background: "var(--dash-bg)",
                            color: "var(--dash-text)",
                            resize: "none",
                            fontSize: 13,
                            fontFamily: "inherit",
                            fontWeight: 500,
                            outline: "none"
                          }}
                        />
                        <button
                          onClick={() => handleSendReply(selectedMessage.id)}
                          disabled={isReplying || !replyText.trim()}
                          style={{
                            alignSelf: "flex-end",
                            background: "var(--dash-primary)",
                            color: "white",
                            border: "none",
                            borderRadius: 10,
                            padding: "10px 20px",
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            transition: "opacity 0.2s ease"
                          }}
                        >
                          {isReplying ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <>
                              <Send size={14} />
                              <span>Send Reply</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="empty-state select-prompt">
                  <div className="empty-icon select-prompt-icon">✉</div>
                  <h3>Select a Message</h3>
                  <p>Choose an incoming contact message from the list to view its full contents and perform actions.</p>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* =====================================================
          STYLES (Match UserDashboard UI precisely)
      ===================================================== */}
      <style>{`
        /* User Database Table */
        .users-table-container {
          margin-top: 16px;
          border: 1px solid var(--dash-border);
          border-radius: 14px;
          background: var(--dash-card);
          overflow: hidden;
        }

        .users-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .users-table th {
          background: var(--dash-sidebar);
          padding: 14px 18px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          color: var(--dash-secondary);
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--dash-border);
        }

        .users-table td {
          padding: 14px 18px;
          font-size: 13px;
          color: var(--dash-text);
          border-bottom: 1px solid var(--dash-border);
        }

        .users-table tr:last-child td {
          border-bottom: none;
        }

        .users-table tr:hover td {
          background: rgba(255, 107, 0, 0.02);
        }

        .admin-dashboard {
          min-height: 100vh;
          display: flex;
          background: var(--dash-bg);
          color: var(--dash-text);
          font-family: 'Inter', system-ui, sans-serif;
          transition: background-color 0.3s ease, color 0.3s ease;
        }

        /* Sidebar Styling */
        .admin-sidebar {
          width: 260px;
          min-height: 100vh;
          background: var(--dash-sidebar);
          color: var(--dash-text);
          display: flex;
          flex-direction: column;
          padding: 30px 20px;
          box-sizing: border-box;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          border-right: 1px solid var(--dash-border);
          transition: background-color 0.3s ease, border-color 0.3s ease;
          z-index: 20;
        }

        .admin-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 10px 35px;
        }

        .admin-logo-mark {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: linear-gradient(135deg, #FF6B00 0%, #FF8A1F 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(255, 107, 0, 0.2);
        }

        .admin-logo-icon {
          color: white;
        }

        .admin-logo h2 {
          margin: 0;
          font-size: 19px;
          font-weight: 800;
          color: var(--dash-text);
          letter-spacing: -0.5px;
        }

        .admin-logo span {
          font-size: 11px;
          color: var(--dash-secondary);
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .admin-nav {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .admin-nav-item {
          border: none;
          background: transparent;
          color: var(--dash-secondary);
          text-align: left;
          padding: 12px 14px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 14px;
          transition: all 0.2s ease;
        }

        .admin-nav-item:hover {
          background: rgba(255, 107, 0, 0.04);
          color: var(--dash-primary);
        }

        .admin-nav-item.active {
          background: rgba(255, 107, 0, 0.08);
          color: var(--dash-primary);
        }

        .admin-logout {
          margin-top: auto;
          border: none;
          background: transparent;
          color: var(--dash-secondary);
          padding: 12px 14px;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          gap: 14px;
          align-items: center;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .admin-logout:hover {
          background: rgba(239, 68, 68, 0.08);
          color: #ef4444;
        }

        /* Main Content Container */
        .admin-main {
          margin-left: 260px;
          width: calc(100% - 260px);
          padding: 35px 40px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        /* Header block */
        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 30px;
        }

        .header-welcome h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 900;
          letter-spacing: -0.5px;
          color: var(--dash-text);
        }

        .admin-subtitle {
          margin: 6px 0 0;
          color: var(--dash-secondary);
          font-size: 14px;
          font-weight: 500;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        /* Search input container */
        .search-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          color: var(--dash-secondary);
          pointer-events: none;
        }

        .search-container input {
          width: 220px;
          background: var(--dash-card);
          border: 1px solid var(--dash-border);
          border-radius: 12px;
          padding: 10px 14px 10px 40px;
          font-size: 13.5px;
          color: var(--dash-text);
          font-weight: 500;
          transition: all 0.2s ease;
          outline: none;
        }

        .search-container input:focus {
          border-color: var(--dash-primary);
          box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.1);
        }

        /* Action Buttons */
        .theme-toggle-btn,
        .header-action-btn {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          border: 1px solid var(--dash-border);
          background: var(--dash-card);
          color: var(--dash-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .theme-toggle-btn:hover,
        .header-action-btn:hover {
          border-color: var(--dash-primary);
          color: var(--dash-primary);
          background: rgba(255, 107, 0, 0.04);
        }

        /* Notifications Panel */
        .notification-wrapper {
          position: relative;
        }

        .notification-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 7px;
          height: 7px;
          background: #ff6b00;
          border-radius: 50%;
        }

        .notifications-dropdown {
          position: absolute;
          top: 50px;
          right: 0;
          width: 280px;
          background: var(--dash-card);
          border: 1px solid var(--dash-border);
          border-radius: 16px;
          box-shadow: var(--shadow-md);
          z-index: 30;
          overflow: hidden;
        }

        .dropdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          border-bottom: 1px solid var(--dash-border);
        }

        .dropdown-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
        }

        .close-btn {
          border: none;
          background: transparent;
          color: var(--dash-secondary);
          cursor: pointer;
        }

        .dropdown-body {
          max-height: 240px;
          overflow-y: auto;
        }

        .notification-item {
          padding: 12px 18px;
          border-bottom: 1px solid var(--dash-border);
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .notification-item:hover {
          background: rgba(255, 107, 0, 0.02);
        }

        .notification-item.unread {
          background: rgba(255, 107, 0, 0.04);
        }

        .notification-item p {
          margin: 0;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.4;
        }

        .notification-item span {
          display: block;
          font-size: 10px;
          color: var(--dash-muted);
          margin-top: 4px;
        }

        /* Profile Menu Chip */
        .profile-chip-wrapper {
          position: relative;
        }

        .profile-chip {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--dash-card);
          border: 1px solid var(--dash-border);
          border-radius: 14px;
          padding: 6px 14px 6px 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          outline: none;
        }

        .profile-chip:hover {
          border-color: var(--dash-primary);
        }

        .admin-avatar-placeholder {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: #ff6b00;
          color: white;
          font-weight: 800;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .profile-info {
          text-align: left;
          display: flex;
          flex-direction: column;
        }

        .profile-info strong {
          font-size: 12.5px;
          color: var(--dash-text);
          font-weight: 700;
          line-height: 1.2;
        }

        .admin-role-span {
          font-size: 10px;
          color: var(--dash-primary);
          font-weight: 700;
          margin-top: 1px;
        }

        .profile-menu {
          position: absolute;
          top: 54px;
          right: 0;
          width: 170px;
          background: var(--dash-card);
          border: 1px solid var(--dash-border);
          border-radius: 14px;
          box-shadow: var(--shadow-md);
          padding: 6px;
          z-index: 30;
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 600;
          color: var(--dash-secondary);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .menu-item:hover {
          background: rgba(255, 107, 0, 0.05);
          color: var(--dash-primary);
        }

        .menu-item.logout:hover {
          background: rgba(239, 68, 68, 0.08);
          color: #ef4444;
        }

        .menu-divider {
          border: 0;
          border-top: 1px solid var(--dash-border);
          margin: 6px 0;
        }

        /* Stats Cards Row */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .stat-card {
          background: var(--dash-card);
          border: 1px solid var(--dash-border);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: background-color 0.3s ease, border-color 0.3s ease;
        }

        .stat-icon-wrapper {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-details {
          display: flex;
          flex-direction: column;
          text-align: left;
        }

        .stat-details span {
          font-size: 12px;
          font-weight: 700;
          color: var(--dash-secondary);
        }

        .stat-details strong {
          font-size: 24px;
          font-weight: 800;
          color: var(--dash-text);
          margin-top: 2px;
          line-height: 1;
        }

        .stat-details small {
          font-size: 11px;
          color: var(--dash-muted);
          font-weight: 600;
          margin-top: 4px;
        }

        /* Distinct Colors for Cards */
        .purple-theme .stat-icon-wrapper {
          background: rgba(139, 92, 246, 0.1);
          color: #8b5cf6;
        }
        .green-theme .stat-icon-wrapper {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        .orange-theme .stat-icon-wrapper {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }
        .red-theme .stat-icon-wrapper {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        /* Responsive Grids */
        .dashboard-grid-two-cols {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
        }

        .dashboard-panel {
          background: var(--dash-card);
          border: 1px solid var(--dash-border);
          border-radius: 18px;
          padding: 24px;
          box-sizing: border-box;
          transition: background-color 0.3s ease, border-color 0.3s ease;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .panel-header h2 {
          margin: 0;
          font-size: 17px;
          font-weight: 800;
          letter-spacing: -0.2px;
          color: var(--dash-text);
        }

        /* Select Wrapper Style */
        .select-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .select-wrapper select {
          border: 1px solid var(--dash-border);
          background: var(--dash-card);
          color: var(--dash-secondary);
          padding: 6px 30px 6px 12px;
          font-size: 12px;
          font-weight: 700;
          border-radius: 8px;
          appearance: none;
          outline: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .select-wrapper select:focus {
          border-color: var(--dash-primary);
        }

        .select-wrapper svg {
          position: absolute;
          right: 10px;
          pointer-events: none;
          color: var(--dash-secondary);
        }

        /* Chart container styling */
        .chart-container {
          margin-top: 10px;
          width: 100%;
        }

        .verification-svg-chart {
          width: 100%;
          height: auto;
          overflow: visible;
        }

        /* Queue / Activity List Panel */
        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .activity-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          border-radius: 12px;
          border: 1px solid var(--dash-border);
          background: var(--dash-card);
          transition: all 0.2s ease;
        }

        .activity-item:hover {
          border-color: var(--dash-primary);
        }

        .activity-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .orange-bg { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .red-bg { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        .purple-bg { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
        .blue-bg { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .green-bg { background: rgba(16, 185, 129, 0.1); color: #10b981; }

        .activity-details {
          flex-grow: 1;
          text-align: left;
          display: flex;
          flex-direction: column;
        }

        .activity-details h4 {
          margin: 0;
          font-size: 13px;
          font-weight: 700;
          color: var(--dash-text);
        }

        .req-type-span {
          font-size: 11px;
          color: var(--dash-secondary);
          font-weight: 600;
          margin-top: 2px;
        }

        .status-pill {
          display: inline-block;
          font-size: 9px;
          font-weight: 700;
          margin-top: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 2px 6px;
          border-radius: 10px;
          width: fit-content;
        }

        .status-pill.pending { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .status-pill.approved { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .status-pill.rejected { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

        /* Approval queue action buttons */
        .action-buttons-cell {
          display: flex;
          gap: 6px;
        }

        .circle-action-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .circle-action-btn.approve {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        .circle-action-btn.approve:hover {
          background: #10b981;
          color: white;
        }

        .circle-action-btn.reject {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
        .circle-action-btn.reject:hover {
          background: #ef4444;
          color: white;
        }

        .action-completed-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--dash-secondary);
        }

        .view-all-link {
          border: none;
          background: transparent;
          color: var(--dash-primary);
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          text-align: left;
          padding: 0;
          margin-top: 18px;
          display: inline-block;
          width: fit-content;
        }

        .view-all-link:hover {
          color: var(--dash-hover);
          text-decoration: underline;
        }

        /* Bottom Row Column Panels */
        .actions-grid-2x2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }

        .action-button-card {
          text-align: left;
          border: 1px solid var(--dash-border);
          background: var(--dash-card);
          color: var(--dash-text);
          border-radius: 14px;
          padding: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 14px;
          transition: all 0.15s ease;
          outline: none;
        }

        .action-button-card:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm);
          border-color: var(--dash-primary);
        }

        .action-text h3 {
          margin: 0;
          font-size: 13.5px;
          font-weight: 700;
          color: var(--dash-text);
        }

        .action-text p {
          margin: 2px 0 0;
          font-size: 11px;
          color: var(--dash-secondary);
          font-weight: 500;
        }

        /* Verification Status Card styling */
        .verification-status-card {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, rgba(255, 107, 0, 0.06) 0%, rgba(255, 138, 31, 0.01) 100%);
          border-color: rgba(255, 107, 0, 0.15);
        }

        html:not(.light) .verification-status-card {
          background: linear-gradient(135deg, rgba(255, 107, 0, 0.12) 0%, rgba(255, 138, 31, 0.02) 100%);
          border-color: rgba(255, 107, 0, 0.25);
        }

        .status-card-inner {
          display: flex;
          flex-direction: column;
          text-align: left;
          position: relative;
          z-index: 2;
          height: 100%;
        }

        .status-badge-wrapper {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .card-label {
          color: var(--dash-primary);
          font-size: 10.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .verification-badge-pill {
          background: #10b981;
          color: white;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .verification-badge-pill.green {
          background: #10b981;
        }

        .status-card-inner h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
          color: var(--dash-text);
        }

        .status-card-inner p {
          margin: 6px 0 0;
          font-size: 12px;
          color: var(--dash-secondary);
          line-height: 1.5;
          font-weight: 500;
          max-width: 80%;
        }

        .status-badge-shield {
          position: absolute;
          bottom: -15px;
          right: -10px;
          color: #ff6b00;
          opacity: 0.2;
          transform: rotate(15deg);
        }

        .loading-state {
          padding: 40px;
          text-align: center;
          color: var(--dash-secondary);
          font-weight: 600;
        }

        .empty-state {
          text-align: center;
          padding: 30px 10px;
          color: var(--dash-secondary);
        }

        .empty-icon {
          width: 44px;
          height: 44px;
          margin: 0 auto 12px;
          border-radius: 50%;
          background: rgba(255, 107, 0, 0.08);
          color: var(--dash-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 800;
        }

        .empty-state h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
        }

        .empty-state p {
          margin: 4px 0 0;
          font-size: 12px;
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .stats-row {
            grid-template-columns: repeat(2, 1fr);
          }

          .dashboard-grid-two-cols {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .admin-sidebar {
            display: none;
          }

          .admin-main {
            margin-left: 0;
            width: 100%;
            padding: 20px;
          }

          .admin-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .header-actions {
            width: 100%;
            justify-content: space-between;
          }

          .search-container {
            flex-grow: 1;
          }

          .search-container input {
            width: 100%;
          }

          .stats-row {
            grid-template-columns: 1fr;
          }

          .actions-grid-2x2 {
            grid-template-columns: 1fr;
          }
        }

        /* Contact Messages Tab Layout */
        .messages-split-layout {
          min-height: calc(100vh - 180px);
          align-items: stretch;
        }

        .panel-header-messages {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
          text-align: left;
        }

        .panel-header-messages h2 {
          margin: 0;
          font-size: 17px;
          font-weight: 800;
          color: var(--dash-text);
        }

        .messages-filters {
          display: flex;
          gap: 6px;
        }

        .filter-btn {
          border: 1px solid var(--dash-border);
          background: transparent;
          color: var(--dash-secondary);
          font-size: 11.5px;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-btn:hover {
          color: var(--dash-primary);
          border-color: var(--dash-primary);
          background: rgba(255, 107, 0, 0.02);
        }

        .filter-btn.active {
          color: white;
          background: #ff6b00;
          border-color: #ff6b00;
        }

        .contact-messages-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 550px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .message-list-item {
          border: 1px solid var(--dash-border);
          border-radius: 12px;
          padding: 14px;
          cursor: pointer;
          text-align: left;
          background: var(--dash-card);
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .message-list-item:hover {
          border-color: var(--dash-primary);
          background: rgba(255, 107, 0, 0.01);
        }

        .message-list-item.selected {
          border-color: var(--dash-primary);
          background: rgba(255, 107, 0, 0.04);
        }

        .message-list-item.unread {
          border-left: 3px solid #ff6b00;
        }

        .msg-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .msg-sender {
          font-size: 13.5px;
          font-weight: 800;
          color: var(--dash-text);
        }

        .msg-date {
          font-size: 11px;
          color: var(--dash-secondary);
          font-weight: 600;
        }

        .msg-subject {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--dash-text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .msg-body-preview {
          font-size: 12px;
          color: var(--dash-secondary);
          font-weight: 500;
          line-height: 1.4;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .msg-badges {
          display: flex;
          gap: 6px;
          margin-top: 2px;
        }

        .status-pill.unread { background: rgba(255, 107, 0, 0.1); color: #ff6b00; }
        .status-pill.read { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .status-pill.replied { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .status-pill.archived { background: rgba(107, 114, 128, 0.1); color: #6b7280; }

        /* Message Details Panel styling */
        .message-detail-view {
          display: flex;
          flex-direction: column;
          gap: 24px;
          text-align: left;
          height: 100%;
        }

        .detail-header {
          display: flex;
          flex-direction: column;
          gap: 16px;
          border-bottom: 1px solid var(--dash-border);
          padding-bottom: 18px;
        }

        .detail-meta {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .detail-meta h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 900;
          color: var(--dash-text);
          line-height: 1.3;
        }

        .sender-info-line,
        .date-info-line,
        .status-info-line {
          font-size: 12.5px;
          color: var(--dash-text);
          font-weight: 500;
        }

        .sender-info-line strong,
        .date-info-line strong,
        .status-info-line strong {
          color: var(--dash-secondary);
          font-weight: 700;
        }

        .sender-email-link {
          color: var(--dash-primary);
          font-weight: 700;
          text-decoration: none;
        }

        .sender-email-link:hover {
          text-decoration: underline;
        }

        .detail-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .action-pill-btn {
          border: 1px solid var(--dash-border);
          background: var(--dash-card);
          color: var(--dash-secondary);
          font-size: 12px;
          font-weight: 700;
          padding: 8px 16px;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .action-pill-btn:hover {
          border-color: var(--dash-primary);
          color: var(--dash-primary);
          background: rgba(255, 107, 0, 0.04);
        }

        .action-pill-btn.read:hover {
          border-color: #10b981;
          color: #10b981;
          background: rgba(16, 185, 129, 0.04);
        }

        .action-pill-btn.reply:hover {
          border-color: #3b82f6;
          color: #3b82f6;
          background: rgba(59, 130, 246, 0.04);
        }

        .action-pill-btn.archive:hover {
          border-color: #6b7280;
          color: #6b7280;
          background: rgba(107, 114, 128, 0.04);
        }

        .action-pill-btn.delete:hover {
          border-color: #ef4444;
          color: #ef4444;
          background: rgba(239, 68, 68, 0.04);
        }

        .detail-body-container {
          flex-grow: 1;
          background: var(--dash-bg);
          border: 1px solid var(--dash-border);
          border-radius: 14px;
          padding: 20px;
          min-height: 200px;
        }

        .detail-message-text {
          margin: 0;
          font-size: 13.5px;
          color: var(--dash-text);
          line-height: 1.6;
          font-weight: 500;
          white-space: pre-wrap;
        }

        .select-prompt {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          min-height: 350px;
        }

        .select-prompt-icon {
          font-size: 32px;
          width: 60px;
          height: 60px;
          background: rgba(255, 107, 0, 0.04);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--dash-secondary);
          margin-bottom: 16px;
        }

        /* Navigation Badge */
        .admin-nav-badge {
          background: #ff6b00;
          color: white;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 20px;
          margin-left: auto;
        }
      `}</style>
    </div>
  );
}