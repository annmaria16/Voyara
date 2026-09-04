import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { useToast } from "../hooks/useToast";
import api from "../services/api";
import "../styles/UserDashboard.css";
import Logo from "../components/Logo";
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Play,
  Settings,
  ShieldCheck,
  Sun,
  User,
  Send,
  CircleAlert,
  Loader2,
  ExternalLink,
  ShoppingBag,
  Calendar,
  BookOpen,
  ArrowRight,
  ChevronRight
} from "lucide-react";

type TaskStatus = "received" | "parsing" | "executing" | "verifying" | "completed" | "failed" | "pending" | "running" | string;

type Task = {
  id: number;
  user_id: number;
  title: string;
  description?: string | null;
  task_type: string;
  status: TaskStatus;
  confidence_score?: number | null;
  final_result?: string | null;
  reference_count?: number;
  created_at: string;
  updated_at: string;
  plan?: any;
  verification_status?: string | null;
  review_status?: string | null;
};

type VerificationMessage = {
  id: number;
  task_id: number;
  user_id: number;
  sender: "user" | "assistant" | "system" | string;
  message: string;
  message_type: string;
  created_at: string;
};

type TaskDetail = Task & {
  messages: VerificationMessage[];
};

type ContactMessage = {
  id: number;
  subject: string;
  message: string;
  status: string;
  admin_reply?: string | null;
  user_read?: boolean;
  created_at: string;
};

const getProductImage = (title: string, category?: string) => {
  const t = title.toLowerCase();
  const c = category?.toLowerCase() || "";
  if (t.includes("laptop") || t.includes("notebook") || t.includes("macbook") || t.includes("vivobook") || t.includes("ideapad") || c.includes("laptop")) {
    return "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&q=80";
  }
  if (t.includes("phone") || t.includes("iphone") || t.includes("samsung") || t.includes("pixel") || t.includes("oneplus") || c.includes("phone") || c.includes("mobile")) {
    return "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80";
  }
  if (t.includes("hotel") || t.includes("stay") || t.includes("resort") || t.includes("kochi") || c.includes("hotel") || c.includes("stay")) {
    return "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80";
  }
  return "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80";
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
  return STATUS_LABEL[status.toLowerCase()] ?? status.replaceAll("_", " ");
}

function statusClass(status: string) {
  const s = status.toLowerCase();
  if (["completed", "verified", "approved"].includes(s)) return "verified";
  if (["failed", "rejected", "cancelled"].includes(s)) return "failed";
  if (["pending", "created", "queued", "requires_confirmation", "waiting_for_user"].includes(s)) return "pending";
  if (["needs_review", "awaiting_admin_review", "inconclusive", "partially_completed"].includes(s)) return "warning";
  return "running";
}

function initials(name?: string | null) {
  return (name || "User")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBytes(bytes: number, decimals = 2) {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function UserDashboard() {
  const { user, logout, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [supportMessages, setSupportMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("home");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // Active Workspace Task
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [activeTask, setActiveTask] = useState<TaskDetail | null>(null);

  const [messageInput, setMessageInput] = useState("");

  // Form Profile Update
  const [profileName, setProfileName] = useState(user?.fullname ?? "");
  const [profileImage, setProfileImage] = useState(user?.profile_image ?? "");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Support Request
  const [supportSubject, setSupportSubject] = useState("");
  const [supportText, setSupportText] = useState("");
  const [sendingSupport, setSendingSupport] = useState(false);

  // Natural Language inputs
  const [homeQuery, setHomeQuery] = useState("");
  const [agentQuery, setAgentQuery] = useState("");
  const [shoppingQuery, setShoppingQuery] = useState("");
  const [bookingQuery, setBookingQuery] = useState("");
  const [researchQuery, setResearchQuery] = useState("");
  const [comparisonQuery, setComparisonQuery] = useState("");

  // Attachment states
  const [attachment, setAttachment] = useState<{ filename: string; file_url: string; file_type: string; file_size: number } | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const handleAttachmentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingAttachment(true);
    setAttachmentError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.post("/agent/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      setAttachment(response.data);
      toast("File attached successfully.", "success");
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Unsupported file format or file too large.";
      setAttachmentError(msg);
      toast(msg, "error");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    setAttachmentError(null);
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
    }
  };

  const renderConversationalInput = (
    placeholderText: string,
    queryValue: string,
    setQueryValue: (val: string) => void,
    submitFn: () => void
  ) => {
    return (
      <div className="flex flex-col gap-3 w-full">
        {/* Attachment preview / status banner if uploading or attached */}
        {(uploadingAttachment || attachment || attachmentError) && (
          <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-dash-border/60 rounded-xl text-xs text-dash-text animate-pulse">
            {uploadingAttachment && (
              <>
                <Loader2 className="animate-spin text-dash-primary" size={14} />
                <span>Uploading attachment...</span>
              </>
            )}
            {attachment && (
              <div className="flex justify-between items-center w-full">
                <span className="truncate font-semibold max-w-[200px]">
                  📎 {attachment.filename} ({formatBytes(attachment.file_size)})
                </span>
                <button onClick={removeAttachment} className="text-red-500 hover:text-red-700 font-extrabold ml-2 border-0 bg-transparent cursor-pointer">
                  Remove
                </button>
              </div>
            )}
            {attachmentError && (
              <div className="flex justify-between items-center w-full text-red-500">
                <span>⚠️ {attachmentError}</span>
                <button onClick={removeAttachment} className="text-dash-secondary hover:text-dash-text ml-2 border-0 bg-transparent cursor-pointer">
                  Dismiss
                </button>
              </div>
            )}
          </div>
        )}

        {/* Large Rounded Composer Box */}
        <div className="query-box-container bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-dash-border/60 p-4 rounded-3xl shadow-md hover:shadow-lg transition-all duration-300 relative flex flex-col gap-3">
          <textarea
            className="query-box-textarea w-full min-h-[80px] p-2 bg-transparent border-0 outline-0 resize-none text-dash-text text-sm placeholder-dash-muted leading-relaxed"
            placeholder={placeholderText}
            value={queryValue}
            onChange={(e) => setQueryValue(e.target.value)}
            disabled={generatingPlan}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (queryValue.trim() && !generatingPlan) {
                  submitFn();
                }
              }
            }}
          />

          <div className="flex justify-between items-center pt-2 border-t border-dash-border/30">
            {/* Left: Attachment Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="w-8 h-8 rounded-full border border-dash-border hover:bg-dash-border/50 text-dash-secondary hover:text-dash-text grid place-items-center cursor-pointer transition-all duration-200"
                onClick={() => attachmentInputRef.current?.click()}
                disabled={generatingPlan || uploadingAttachment}
                title="Attach file/image"
              >
                <span className="text-lg font-bold leading-none">+</span>
              </button>
              <input
                type="file"
                ref={attachmentInputRef}
                onChange={handleAttachmentUpload}
                style={{ display: "none" }}
                accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
              />
              <span className="text-[10px] text-dash-muted hidden sm:inline">Supports PDF, DOC, TXT, images</span>
            </div>

            {/* Right: Submit Button */}
            <button
              className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold rounded-full w-9 h-9 grid place-items-center cursor-pointer shadow-md shadow-orange-500/10 hover:scale-[1.05] active:scale-[0.95] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={generatingPlan || uploadingAttachment || !queryValue.trim()}
              onClick={submitFn}
            >
              {generatingPlan ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <ArrowRight size={15} />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Shopping Filters
  const [filterBudget, setFilterBudget] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterRAM, setFilterRAM] = useState("");
  const [filterStorage, setFilterStorage] = useState("");
  const [filterProcessor, setFilterProcessor] = useState("");

  // Planning / Executing State
  const [activeAgentTaskId, setActiveAgentTaskId] = useState<number | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [executingPlan, setExecutingPlan] = useState(false);
  const [agentTaskLogs, setAgentTaskLogs] = useState<any[]>([]);
  const [agentTaskResultDetail, setAgentTaskResultDetail] = useState<any>(null);
  const [agentTaskDetail, setAgentTaskDetail] = useState<any>(null);
  const [agentPendingAction, setAgentPendingAction] = useState<any>(null);
  const [confirmingActionId, setConfirmingActionId] = useState<number | null>(null);

  // Analytics Calculations
  const completedCount = useMemo(() => tasks.filter(t => t.status === "completed").length, [tasks]);
  const inProgressCount = useMemo(() => tasks.filter(t => ["parsing", "executing", "verifying", "running", "queued", "received", "pending"].includes(t.status)).length, [tasks]);
  const failedCount = useMemo(() => tasks.filter(t => t.status === "failed").length, [tasks]);
  const successRate = useMemo(() => {
    const totalFinished = completedCount + failedCount;
    return totalFinished > 0 ? Math.round((completedCount / totalFinished) * 100) : 0;
  }, [completedCount, failedCount]);

  const trendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    const counts = last7Days.map(dateStr => {
      return tasks.filter(t => t.created_at && t.created_at.startsWith(dateStr)).length;
    });

    return { labels: last7Days.map(d => d.slice(5)), values: counts };
  }, [tasks]);

  const svgPoints = useMemo(() => {
    const values = trendData.values;
    const maxVal = Math.max(...values, 5); // ensure division by zero or low numbers scales nicely
    const width = 500;
    const height = 150;
    const padding = 25;

    const points = values.map((val, idx) => {
      const x = padding + (idx * (width - 2 * padding)) / (values.length - 1);
      const y = height - padding - (val * (height - 2 * padding)) / maxVal;
      return { x, y, val };
    });

    const pathStr = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaStr = points.length > 0
      ? `${pathStr} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
      : "";

    return { points, pathStr, areaStr };
  }, [trendData]);

  const distributionData = useMemo(() => {
    const total = tasks.length;
    if (total === 0) return { completed: 0, inProgress: 0, failed: 0 };
    return {
      completed: Math.round((completedCount / total) * 100),
      inProgress: Math.round((inProgressCount / total) * 100),
      failed: Math.round((failedCount / total) * 100),
    };
  }, [tasks, completedCount, inProgressCount, failedCount]);

  const fetchTasks = async () => {
    const response = await api.get<Task[]>("/tasks");
    setTasks(response.data);
  };

  const fetchSupport = async () => {
    try {
      const response = await api.get<ContactMessage[]>("/contact/messages");
      setSupportMessages(response.data);
    } catch (error) {
      console.error("Failed to fetch support messages", error);
    }
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchTasks(), fetchSupport()]);
    } catch (error) {
      console.error("Failed to load dashboard", error);
      toast("Unable to load workspace data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    setProfileName(user?.fullname ?? "");
    setProfileImage(user?.profile_image ?? "");
  }, [user?.fullname, user?.profile_image]);

  // Polling for active task executions & logs in workspace
  useEffect(() => {
    const polledId = activeTaskId || activeAgentTaskId;
    if (!polledId) return;

    let isMounted = true;
    let timer: number;

    const pollDetails = async () => {
      try {
        const [taskRes, logsRes] = await Promise.all([
          api.get(`/tasks/${polledId}`),
          api.get(`/tasks/${polledId}/executions`) // logs and executions overlap
        ]);

        if (!isMounted) return;

        const currentTask = taskRes.data;
        setAgentTaskLogs(logsRes.data);
        setAgentTaskDetail(currentTask);

        if (activeTaskId) {
          setActiveTask(currentTask);
        }

        const status = currentTask.status.toLowerCase();

        // Check if pending action confirmation is needed
        if (status === "requires_confirmation") {
          const actionsRes = await api.get("/actions");
          const pendingAction = actionsRes.data.actions?.find(
            (a: any) => a.task_id === polledId && a.status === "PENDING"
          );
          setAgentPendingAction(pendingAction || null);
        } else {
          setAgentPendingAction(null);
        }

        // Final result processing
        if (["completed", "failed", "cancelled", "verified", "approved"].includes(status)) {
          const resultRes = await api.get(`/tasks/${polledId}/result`);
          if (isMounted) {
            setAgentTaskResultDetail(resultRes.data);
          }
          window.clearInterval(timer);
          setExecutingPlan(false);
        } else {
          setExecutingPlan(true);
        }
      } catch (error) {
        console.error("Error polling task details", error);
      }
    };

    pollDetails();
    timer = window.setInterval(pollDetails, 1500);

    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, [activeTaskId, activeAgentTaskId]);

  const running = tasks.filter((task) => ["received", "parsing", "executing", "verifying", "running", "pending"].includes(task.status)).length;

  const openSection = (section: string) => {
    setActiveSection(section);
    setActiveTaskId(null);
    setActiveAgentTaskId(null);
    setMobileNav(false);
    setShowProfileMenu(false);
    setAgentTaskLogs([]);
    setAgentTaskResultDetail(null);
    setAgentTaskDetail(null);

    if (section === "support") {
      void api.post("/contact/messages/read").then(() => {
        setSupportMessages((msgs) => msgs.map((m) => ({ ...m, user_read: true })));
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const isPlanningRef = useRef(false);

  // Unified Query Submission Handler (One-step Plan & Execute)
  const handleQuerySubmit = async (queryText: string) => {
    if (isPlanningRef.current) return;
    let text = queryText.trim();

    // Append attachment context if available
    if (attachment) {
      text = `${text}\n\n[Attached File: ${attachment.filename} (URL: ${attachment.file_url})]`;
    }

    if (text.length < 5) {
      toast("Please enter a longer query to begin research.", "error");
      return;
    }

    try {
      isPlanningRef.current = true;
      setGeneratingPlan(true);
      setAgentTaskLogs([]);
      setAgentTaskResultDetail(null);
      setAgentTaskDetail(null);
      setActiveTask(null);

      // Clear the attachment
      removeAttachment();

      // 1. Generate plan
      const res = await api.post("/agent/plan", { task_text: text });
      const taskId = res.data.task_id;

      setActiveAgentTaskId(taskId);
      setActiveTaskId(taskId);
      setHomeQuery("");
      setAgentQuery("");
      setShoppingQuery("");
      setBookingQuery("");
      setResearchQuery("");
      setComparisonQuery("");
      await fetchTasks();

      // 2. Auto-Execute the plan
      setExecutingPlan(true);
      const executeRes = await api.post("/agent/execute", { task_id: taskId });
      await fetchTasks();

      if (executeRes.data.status === "requires_confirmation") {
        toast("Action requires your confirmation.", "info");
      } else {
        toast("Task research initiated successfully!", "success");
      }
    } catch (error: any) {
      let errorMsg = "AI execution failed.";
      const responseData = error.response?.data;
      if (responseData?.error?.code === "AI_RATE_LIMITED") {
        errorMsg = "AI service is temporarily rate-limited. Please try again shortly.";
      } else {
        errorMsg = responseData?.error?.message || responseData?.detail || error.message || errorMsg;
      }
      toast(errorMsg, "error");
    } finally {
      setGeneratingPlan(false);
      isPlanningRef.current = false;
    }
  };



  const handleConfirmAction = async (actionId: number) => {
    const taskId = activeTaskId || activeAgentTaskId;
    if (!taskId) return;
    try {
      setConfirmingActionId(actionId);
      const res = await api.post("/agent/execute", {
        task_id: taskId,
        confirm_action_id: actionId
      });
      await fetchTasks();
      if (res.data.status === "requires_confirmation") {
        toast("Another action requires your confirmation.", "info");
      } else {
        toast("Action confirmed and executed.", "success");
      }
    } catch (error: any) {
      toast(error.response?.data?.error?.message || error.response?.data?.detail || "Confirmation failed.", "error");
    } finally {
      setConfirmingActionId(null);
    }
  };

  const handleCancelAction = async () => {
    const taskId = activeTaskId || activeAgentTaskId;
    if (!taskId) return;
    try {
      await api.post(`/tasks/${taskId}/cancel`);
      await fetchTasks();
      toast("Action cancelled successfully.", "info");
    } catch (error) {
      toast("Failed to cancel action.", "error");
    }
  };

  const sendVerificationMessage = async () => {
    const taskId = activeTaskId || activeAgentTaskId;
    if (!taskId || !messageInput.trim()) return;

    const text = messageInput.trim();
    setMessageInput("");

    try {
      const response = await api.post<VerificationMessage>(
        `/tasks/${taskId}/messages`,
        { message: text }
      );
      if (activeTask) {
        setActiveTask((current) =>
          current ? { ...current, messages: [...current.messages, response.data] } : current
        );
      }
    } catch (error: any) {
      setMessageInput(text);
      toast(error.response?.data?.detail || "Unable to send message.", "error");
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post("/user/profile-image", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      updateUser(response.data);
      setProfileImage(response.data.profile_image || "");
      toast("Profile photo updated.", "success");
    } catch (error: any) {
      toast(error.response?.data?.detail || "Failed to upload image.", "error");
    } finally {
      setUploadingImage(false);
    }
  };

  const saveProfile = async () => {
    const fullname = profileName.trim();
    if (fullname.length < 3) {
      toast("Full name must contain at least 3 characters.", "error");
      return;
    }

    try {
      setSavingProfile(true);
      const response = await api.put("/user/profile", {
        fullname,
        profile_image: profileImage ? profileImage.trim() : null,
      });
      updateUser(response.data);
      toast("Profile updated successfully.", "success");
    } catch (error: any) {
      toast(error.response?.data?.detail || "Unable to update profile.", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || newPassword.length < 8) {
      toast("Enter your current password and a new password (min 8 characters).", "error");
      return;
    }

    try {
      setSavingPassword(true);
      await api.put("/user/password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      toast("Password changed successfully.", "success");
    } catch (error: any) {
      toast(error.response?.data?.detail || "Unable to change password.", "error");
    } finally {
      setSavingPassword(false);
    }
  };

  const sendSupportMessage = async () => {
    if (supportSubject.trim().length < 2 || supportText.trim().length < 10) {
      toast("Add a subject and a detailed support message.", "error");
      return;
    }

    try {
      setSendingSupport(true);
      await api.post("/contact", {
        subject: supportSubject.trim(),
        message: supportText.trim(),
      });
      setSupportSubject("");
      setSupportText("");
      await fetchSupport();
      toast("Your message was sent to the Verinova team.", "success");
    } catch (error: any) {
      toast(error.response?.data?.detail || "Unable to send message.", "error");
    } finally {
      setSendingSupport(false);
    }
  };

  // Helper parser for visual outcomes
  const parsedData = useMemo(() => {
    const rawAnswer = agentTaskResultDetail?.answer || activeTask?.final_result || agentTaskDetail?.final_result || "";
    if (!rawAnswer) return { cleanText: "", offersList: [], comparisonData: null };

    let offersList: any[] = [];
    let comparisonData: any = null;
    let cleanText = rawAnswer;

    if (rawAnswer.includes("[PRODUCT_OFFERS:")) {
      const startIdx = rawAnswer.indexOf("[PRODUCT_OFFERS:");
      const endIdx = rawAnswer.lastIndexOf("]");
      if (startIdx !== -1 && endIdx > startIdx) {
        const jsonStr = rawAnswer.substring(startIdx + 16, endIdx);
        try {
          offersList = JSON.parse(jsonStr);
          cleanText = rawAnswer.substring(0, startIdx) + rawAnswer.substring(endIdx + 1);
        } catch (e) {
          console.error("Failed to parse offers JSON", e);
        }
      }
    }

    if (rawAnswer.includes("[PRODUCT_COMPARISON:")) {
      const startIdx = rawAnswer.indexOf("[PRODUCT_COMPARISON:");
      const endIdx = rawAnswer.lastIndexOf("]");
      if (startIdx !== -1 && endIdx > startIdx) {
        const jsonStr = rawAnswer.substring(startIdx + 20, endIdx);
        try {
          comparisonData = JSON.parse(jsonStr);
          cleanText = rawAnswer.substring(0, startIdx) + rawAnswer.substring(endIdx + 1);
        } catch (e) {
          console.error("Failed to parse comparison JSON", e);
        }
      }
    }

    // Clean up technical mock lines from the displayed text
    const technicalMockPatterns = [
      /### Active AI Provider:[\s\S]*?(?=\*\*Facts\*\*|$)/i,
      /This is a local development mock response\.[\s\S]*?(?=\*\*Facts\*\*|$)/i,
      /\*\*Facts\*\*:\s*- System is offline\/local mode\..*$/im,
      /- Task description:.*$/im,
      /- Task was processed locally.*$/im,
      /\*\*Inferences & Recommendations\*\*:.*$/im,
      /- Development mode works.*$/im,
      /- You can switch back.*$/im,
      /\*\*Limitations & Unknowns\*\*:.*$/im,
      /- The response is programmatically.*$/im,
      /- Actual external service execution.*$/im,
      /Response generated by Local Development AI Provider\./i
    ];
    technicalMockPatterns.forEach(pattern => {
      cleanText = cleanText.replace(pattern, "").trim();
    });

    return { cleanText, offersList, comparisonData };
  }, [agentTaskResultDetail?.answer, activeTask?.final_result, agentTaskDetail?.final_result]);

  if (!user) return null;

  return (
    <div className="user-dashboard">

      {/* Left Sidebar Menu */}
      <aside className={`dashboard-sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <div className="dashboard-logo">
          <Logo subtitle="Outcome Verification" size="sm" />
        </div>

        <nav className="dashboard-nav">
          <div className="dashboard-nav-section">
            <div className="dashboard-nav-title">MAIN</div>
            <button className={`nav-item ${activeSection === "home" ? "active" : ""}`} onClick={() => openSection("home")}>
              <LayoutDashboard size={17} />
              <span>Home</span>
            </button>
            <button className={`nav-item ${activeSection === "history" ? "active" : ""}`} onClick={() => openSection("history")}>
              <Layers size={17} />
              <span>My Verifications</span>
            </button>
            <button className={`nav-item ${activeSection === "agent" ? "active" : ""}`} onClick={() => openSection("agent")}>
              <CheckCircle2 size={17} className="text-dash-primary" />
              <span>AI Agent</span>
            </button>
          </div>

          <div className="dashboard-nav-section">
            <div className="dashboard-nav-title">TOOLS</div>
            <button className={`nav-item ${activeSection === "shopping" ? "active" : ""}`} onClick={() => openSection("shopping")}>
              <ShoppingBag size={17} />
              <span>Shopping</span>
            </button>
            <button className={`nav-item ${activeSection === "comparison" ? "active" : ""}`} onClick={() => openSection("comparison")}>
              <Layers size={17} />
              <span>Comparison</span>
            </button>
            <button className={`nav-item ${activeSection === "booking" ? "active" : ""}`} onClick={() => openSection("booking")}>
              <Calendar size={17} />
              <span>Booking</span>
            </button>
            <button className={`nav-item ${activeSection === "research" ? "active" : ""}`} onClick={() => openSection("research")}>
              <BookOpen size={17} />
              <span>Research</span>
            </button>
          </div>

          <div className="dashboard-nav-section">
            <div className="dashboard-nav-title">ACCOUNT</div>
            <button className={`nav-item ${activeSection === "profile" ? "active" : ""}`} onClick={() => openSection("profile")}>
              <User size={17} />
              <span>Profile</span>
            </button>
            <button className={`nav-item ${activeSection === "settings" ? "active" : ""}`} onClick={() => openSection("settings")}>
              <Settings size={17} />
              <span>Settings</span>
            </button>
            <button className={`nav-item ${activeSection === "support" ? "active" : ""}`} onClick={() => openSection("support")}>
              <HelpCircle size={17} />
              <span>Support</span>
              {supportMessages.filter((m) => m.status === "replied" && m.user_read === false).length > 0 && (
                <span className="nav-badge">
                  {supportMessages.filter((m) => m.status === "replied" && m.user_read === false).length}
                </span>
              )}
            </button>
          </div>
        </nav>

        <div className="dashboard-sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar">
              {user.profile_image ? <img src={user.profile_image} alt="" /> : initials(user.fullname)}
            </div>
            <div className="sidebar-user-info">
              <strong>{user.fullname}</strong>
              <span>{user.email}</span>
            </div>
            <button className="sidebar-logout" onClick={handleLogout} aria-label="Log out">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="dashboard-main">

        {/* Top Header */}
        <header className="dashboard-topbar">
          <div className="topbar-left">
            <button className="mobile-menu-button" onClick={() => setMobileNav((v) => !v)} aria-label="Menu">
              <Menu size={19} />
            </button>
            <div>
              <h1>{activeSection.toUpperCase()}</h1>
              <p>An Outcome Verification Platform</p>
            </div>
          </div>

          <div className="topbar-actions">
            <button className="topbar-icon-button" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <div className="topbar-dropdown-wrap" ref={notificationsRef}>
              <button className="topbar-icon-button" onClick={() => { setShowNotifications(!showNotifications); setShowProfileMenu(false); }} aria-label="Notifications">
                <Bell size={16} />
                {running > 0 && <span className="notification-dot" />}
              </button>
              {showNotifications && (
                <div className="dashboard-dropdown">
                  <strong>Notifications</strong>
                  <p>{running > 0 ? `${running} task currently executing.` : "No active task updates."}</p>
                </div>
              )}
            </div>

            <div className="topbar-dropdown-wrap" ref={profileMenuRef}>
              <button className="profile-trigger" onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}>
                <span className="profile-trigger-avatar">
                  {user.profile_image ? <img src={user.profile_image} alt="" /> : initials(user.fullname)}
                </span>
                <span className="profile-trigger-name">{user.fullname}</span>
                <ChevronDown size={14} />
              </button>
              {showProfileMenu && (
                <div className="dashboard-dropdown text-left">
                  <button onClick={() => { openSection("profile"); setShowProfileMenu(false); }}><User size={14} /> Profile</button>
                  <button onClick={() => { openSection("settings"); setShowProfileMenu(false); }}><Settings size={14} /> Settings</button>
                  <button onClick={() => { handleLogout(); setShowProfileMenu(false); }}><LogOut size={14} /> Log out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Section Contents */}
        <div className="dashboard-content">

          {/* Active Workspace View Override */}
          {((activeTaskId || activeAgentTaskId) && activeSection !== "home") ? (
            <div className="workspace-container">
              <div className="workspace-header">
                <button className="workspace-back-btn" onClick={() => { setActiveTaskId(null); setActiveAgentTaskId(null); }}>
                  <span>← Back to {activeSection}</span>
                </button>
                <div className="workspace-title-section">
                  <h2>{activeTask?.title || agentTaskDetail?.title || "AI Verification Task"}</h2>
                  <div className="workspace-meta">
                    <span>Task #{activeTaskId || activeAgentTaskId}</span>
                    <span>·</span>
                    <span>Created {formatDate(activeTask?.created_at || agentTaskDetail?.created_at)}</span>
                    {activeTask?.status && (
                      <span className={`user-status-badge ${statusClass(activeTask.status)}`}>
                        {statusLabel(activeTask.status)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Side-by-Side Unified Chat & Outcomes Panel Layout */}
              <div className="workspace-content-grid">

                {/* Left Panel: Chatbot Interface */}
                <div className="chat-panel">
                  <div className="chat-panel-header text-left">
                    <h3>VeriNova Assistant</h3>
                    {activeTask?.confidence_score != null && (
                      <p>
                        Confidence Score: <strong>{Number(activeTask.confidence_score).toFixed(1)}%</strong> ({activeTask.review_status || "Standard"})
                      </p>
                    )}
                  </div>

                  <div className="chat-bubble-list">
                    {/* Welcome message if conversation is empty */}
                    {(!activeTask?.messages || activeTask.messages.length === 0) && (
                      <div className="text-xs text-dash-muted italic p-4 text-center">
                        Ask follow-up questions to refine the results or request specific details.
                      </div>
                    )}

                    {activeTask?.messages?.map((msg) => {
                      // Hide JSON tags from the chat bubbles themselves
                      const text = msg.message
                        .replace(/\[PRODUCT_OFFERS:[\s\S]*?\]/, "")
                        .replace(/\[PRODUCT_COMPARISON:[\s\S]*?\]/, "")
                        .replace(/\[REQUIRES_CONFIRMATION:[\s\S]*?\]/, "")
                        .trim();

                      if (!text) return null;

                      return (
                        <div key={msg.id} className={`chat-bubble-item ${msg.sender === "user" ? "user" : "assistant"}`}>
                          <span className="chat-bubble-label">{msg.sender === "user" ? "You" : "VeriNova"}</span>
                          <div className="chat-bubble-text">{text}</div>
                        </div>
                      );
                    })}
                  </div>

                  <form className="chat-composer" onSubmit={(e) => { e.preventDefault(); void sendVerificationMessage(); }}>
                    <input
                      className="chat-composer-input"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Ask follow-up questions..."
                    />
                    <button type="submit" className="chat-composer-submit" disabled={!messageInput.trim()}>
                      <Send size={14} />
                    </button>
                  </form>
                </div>

                {/* Right Panel: Outcomes Workspace Visualizer */}
                <div className="outcome-panel">

                  {/* Progress screen while executing */}
                  {executingPlan && (
                    <div className="progress-card">
                      <div className="progress-header-status">
                        <Loader2 className="animate-spin text-dash-primary" size={20} />
                        <span>VeriNova is executing your request...</span>
                      </div>

                      <div className="progress-steps-list">
                        <div className={`progress-step-item ${activeTask?.status || agentTaskDetail?.status ? "completed" : "active"}`}>
                          <span className="progress-step-dot" />
                          <span>Analyzing request</span>
                        </div>
                        <div className={`progress-step-item ${["parsing", "planning", "running", "executing", "verifying", "completed", "analyzing", "researching"].includes(activeTask?.status || agentTaskDetail?.status || "") ? "completed" : "pending"}`}>
                          <span className="progress-step-dot" />
                          <span>Creating plan</span>
                        </div>
                        <div className={`progress-step-item ${["running", "executing", "verifying", "completed", "analyzing", "researching"].includes(activeTask?.status || agentTaskDetail?.status || "") ? "completed" : "pending"}`}>
                          <span className="progress-step-dot" />
                          <span>Executing tools</span>
                        </div>
                        <div className={`progress-step-item ${["analyzing", "verifying", "completed"].includes(activeTask?.status || agentTaskDetail?.status || "") ? "completed" : "pending"}`}>
                          <span className="progress-step-dot" />
                          <span>Analyzing results</span>
                        </div>
                        <div className={`progress-step-item ${["verifying", "completed"].includes(activeTask?.status || agentTaskDetail?.status || "") ? "completed" : "pending"}`}>
                          <span className="progress-step-dot" />
                          <span>Verifying results</span>
                        </div>
                        <div className={`progress-step-item ${["completed"].includes(activeTask?.status || agentTaskDetail?.status || "") ? "completed" : "pending"}`}>
                          <span className="progress-step-dot" />
                          <span>Final answer</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pending Action Approval Card */}
                  {agentPendingAction && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col gap-3 text-amber-600 text-left">
                      <div className="flex items-center gap-2">
                        <CircleAlert size={18} />
                        <strong className="text-sm">Action Approval Required</strong>
                      </div>
                      <p className="text-xs text-dash-secondary">
                        VeriNova needs permission to run: <code>{agentPendingAction.tool_name}</code>
                      </p>
                      <div className="flex gap-2.5">
                        <button
                          onClick={() => handleConfirmAction(agentPendingAction.id)}
                          className="bg-amber-500 text-white rounded-lg px-3 py-1.5 text-xs font-bold hover:bg-amber-600 cursor-pointer flex items-center gap-1.5"
                          disabled={confirmingActionId === agentPendingAction.id}
                        >
                          {confirmingActionId === agentPendingAction.id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                          Confirm Action
                        </button>
                        <button
                          onClick={handleCancelAction}
                          className="bg-transparent border border-red-500 text-red-500 hover:bg-red-50 rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer"
                        >
                          Cancel Task
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Redesigned Visual Outcome Results */}
                  {(!executingPlan && parsedData.cleanText) && (
                    <div className="bg-white dark:bg-zinc-900 border border-dash-border rounded-xl p-6 shadow-sm flex flex-col gap-6">

                      <div className="flex flex-col gap-3 text-left">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-dash-primary">VeriNova Result</span>
                        <h3 className="text-xl font-black text-dash-text mt-1">Answer</h3>
                        <div className="text-sm leading-relaxed text-dash-secondary mt-2 whitespace-pre-wrap bg-dash-bg p-4 rounded-xl border border-dash-border">
                          {parsedData.cleanText}
                        </div>
                      </div>

                      {/* Product Comparison View */}
                      {parsedData.comparisonData && (
                        <div className="flex flex-col gap-6 text-left border-t border-dash-border pt-6">
                          <div>
                            <span className="text-xs font-extrabold uppercase tracking-wider text-dash-primary">Outcome Verification Result</span>
                            <h3 className="text-xl font-black text-dash-text mt-1">Comparison Results</h3>
                            <p className="text-xs text-dash-secondary mt-1">Best matches based on your requirements</p>
                          </div>

                          {/* Product Cards Row (Mockup styling) */}
                          <div className="product-card-grid">
                            {parsedData.comparisonData.offers?.slice(0, 3).map((offer: any, idx: number) => {
                              const isBestValue = offer.price === parsedData.comparisonData.best_value?.price;
                              const isBestMatch = idx === 0;

                              return (
                                <div key={idx} className={`product-card ${isBestValue || isBestMatch ? "glow-border" : ""}`}>
                                  {/* Top Left Rank Circle */}
                                  <span className={`product-card-rank-badge ${idx === 0 ? "rank-1" : idx === 1 ? "rank-2" : "rank-3"}`}>
                                    {idx + 1}
                                  </span>

                                  <div className="product-card-image">
                                    <img src={offer.image_url || getProductImage(offer.title, parsedData.comparisonData.product_group)} alt="" />
                                  </div>

                                  <div className="product-card-details">
                                    <strong className="product-card-name" title={offer.title}>{offer.title}</strong>
                                    <span className="product-card-price">₹{Number(offer.price).toLocaleString()}</span>
                                    {isBestValue && <span className="product-card-suitability-label">Best Value</span>}
                                    {isBestMatch && !isBestValue && <span className="product-card-suitability-label">Best Match</span>}
                                    {!isBestMatch && !isBestValue && <span className="product-card-suitability-label secondary">Candidate Match</span>}
                                  </div>

                                  <a href={offer.url} target="_blank" rel="noopener noreferrer" className="product-card-action">
                                    <span>View Product</span>
                                    <ExternalLink size={12} />
                                  </a>
                                </div>
                              );
                            })}
                          </div>

                          {/* Comparison Table */}
                          {parsedData.comparisonData.offers?.length > 0 && (
                            <div className="flex flex-col gap-4">
                              <h4 className="text-sm font-extrabold uppercase text-dash-secondary">Key Comparison</h4>
                              <div className="comparison-table-container">
                                <table className="comparison-table">
                                  <thead>
                                    <tr>
                                      <th>Feature</th>
                                      {parsedData.comparisonData.offers.slice(0, 3).map((off: any, idx: number) => (
                                        <th key={idx}>{off.brand || `Option ${idx + 1}`}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      <td>Processor</td>
                                      {parsedData.comparisonData.offers.slice(0, 3).map((off: any, idx: number) => (
                                        <td key={idx}>{off.processor || "—"}</td>
                                      ))}
                                    </tr>
                                    <tr>
                                      <td>RAM</td>
                                      {parsedData.comparisonData.offers.slice(0, 3).map((off: any, idx: number) => (
                                        <td key={idx}>{off.ram_gb ? `${off.ram_gb} GB` : "—"}</td>
                                      ))}
                                    </tr>
                                    <tr>
                                      <td>Storage</td>
                                      {parsedData.comparisonData.offers.slice(0, 3).map((off: any, idx: number) => (
                                        <td key={idx}>{off.storage_gb ? `${off.storage_gb} GB` : "—"}</td>
                                      ))}
                                    </tr>
                                    <tr>
                                      <td>Display</td>
                                      {parsedData.comparisonData.offers.slice(0, 3).map((off: any, idx: number) => (
                                        <td key={idx}>{off.display || "15.6\" FHD"}</td>
                                      ))}
                                    </tr>
                                    <tr>
                                      <td>Price</td>
                                      {parsedData.comparisonData.offers.slice(0, 3).map((off: any, idx: number) => (
                                        <td key={idx} style={{ color: "#10b981", fontWeight: 700 }}>
                                          ₹{Number(off.price).toLocaleString()}
                                        </td>
                                      ))}
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Best Value explanation */}
                          {parsedData.comparisonData.best_value && (
                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mt-2">
                              <span className="text-xs font-black text-amber-600 uppercase tracking-wider block mb-1">Why this is the best choice</span>
                              <strong className="text-sm block">Best Value — {parsedData.comparisonData.best_value.store}</strong>
                              <p className="text-xs text-dash-secondary mt-1.5 leading-relaxed whitespace-pre-wrap">
                                {parsedData.comparisonData.best_value.reason}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  )}

                  {/* Sources Checked */}
                  <div className="bg-white dark:bg-zinc-900 border border-dash-border rounded-xl p-6 shadow-sm flex flex-col gap-4 text-left">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-dash-primary">Sources</span>
                    <div className="sources-grid">
                      {agentTaskResultDetail?.sources?.map((src: any, idx: number) => (
                        <a key={idx} href={src.url} target="_blank" rel="noopener noreferrer" className="source-card">
                          <div className="source-info">
                            <span className="source-domain">{src.domain}</span>
                            <span className="source-title" title={src.title}>{src.title}</span>
                          </div>
                          <div className="source-badges">
                            <span className="source-verified-badge">
                              <ShieldCheck size={11} />
                              Verified
                            </span>
                            <ExternalLink size={12} className="source-link-icon" />
                          </div>
                        </a>
                      ))}
                      {(!agentTaskResultDetail?.sources || agentTaskResultDetail.sources.length === 0) && (
                        <span className="text-xs text-dash-muted italic">No external sources recorded.</span>
                      )}
                    </div>
                  </div>

                  {/* Collapsible details fold */}
                  <details className="technical-fold">
                    <summary className="technical-fold-summary">
                      <span>View technical details</span>
                      <ChevronDown size={14} />
                    </summary>
                    <div className="technical-fold-content">
                      <strong>Agent Objective:</strong>
                      <p className="text-dash-secondary m-0">{agentTaskDetail?.plan?.objective || "Outcome Research"}</p>

                      <strong className="mt-2">Logs:</strong>
                      {agentTaskLogs.map((log, idx) => (
                        <div key={idx} className="border-b border-dash-border pb-1">
                          <span className="text-dash-muted">{formatTime(log.created_at)}</span>
                          <span className="ml-2 font-semibold capitalize">{log.step}:</span>
                          <p className="m-0 text-dash-secondary">{log.message}</p>
                        </div>
                      ))}
                    </div>
                  </details>

                </div>
              </div>
            </div>
          ) : (

            /* Workspace Page Screens */
            <>
              {/* HOME SCREEN */}
              {activeSection === "home" && (
                <div className="flex flex-col gap-6 text-left">

                  {/* Hello Header */}
                  <div className="hello-card text-left p-6 bg-white dark:bg-zinc-900 border border-dash-border rounded-xl shadow-sm">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-dash-primary">VeriNova Workspace Overview</span>
                    <h2 className="text-2xl font-black text-dash-text mt-1">Welcome back, {user.fullname.split(" ")[0]} 👋</h2>
                    <p className="text-xs text-dash-secondary mt-1">Here is the real-time health and status of your automated verifications and outcome research.</p>
                  </div>

                  {/* Stat Cards Row */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-zinc-900 border border-dash-border p-5 rounded-xl shadow-sm flex flex-col gap-1.5">
                      <span className="text-xs text-dash-secondary font-bold uppercase tracking-wider">Total Requests</span>
                      <strong className="text-2xl font-black text-dash-text">{tasks.length}</strong>
                      <span className="text-[10px] text-dash-muted">All active & finished requests</span>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 border border-dash-border p-5 rounded-xl shadow-sm flex flex-col gap-1.5">
                      <span className="text-xs text-dash-secondary font-bold uppercase tracking-wider">Completed</span>
                      <strong className="text-2xl font-black text-emerald-600">{completedCount}</strong>
                      <span className="text-[10px] text-dash-muted">Successfully verified outcomes</span>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 border border-dash-border p-5 rounded-xl shadow-sm flex flex-col gap-1.5">
                      <span className="text-xs text-dash-secondary font-bold uppercase tracking-wider">In Progress</span>
                      <strong className="text-2xl font-black text-amber-500">{inProgressCount}</strong>
                      <span className="text-[10px] text-dash-muted">Running execution workflows</span>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 border border-dash-border p-5 rounded-xl shadow-sm flex flex-col gap-1.5">
                      <span className="text-xs text-dash-secondary font-bold uppercase tracking-wider">Failed</span>
                      <strong className="text-2xl font-black text-red-500">{failedCount}</strong>
                      <span className="text-[10px] text-dash-muted">Errors or rate limits hit</span>
                    </div>
                  </div>

                  {/* Charts Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Left: Trend line Chart */}
                    <div className="bg-white dark:bg-zinc-900 border border-dash-border p-6 rounded-xl shadow-sm flex flex-col gap-4">
                      <div>
                        <h3 className="text-sm font-black text-dash-text uppercase tracking-wider">Verification Volume Trend</h3>
                        <p className="text-[11px] text-dash-secondary">Workflow activity over the last 7 days</p>
                      </div>

                      {tasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-dash-muted text-xs italic">
                          <span>No verification data yet</span>
                        </div>
                      ) : (
                        <div className="w-full">
                          <svg viewBox="0 0 500 150" className="w-full h-40">
                            <defs>
                              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            <line x1="25" y1="25" x2="475" y2="25" stroke="#e4e4e7" strokeDasharray="3 3" />
                            <line x1="25" y1="75" x2="475" y2="75" stroke="#e4e4e7" strokeDasharray="3 3" />
                            <line x1="25" y1="125" x2="475" y2="125" stroke="#e4e4e7" />

                            {svgPoints.areaStr && <path d={svgPoints.areaStr} fill="url(#chartGrad)" />}
                            {svgPoints.pathStr && <path d={svgPoints.pathStr} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />}

                            {svgPoints.points.map((p, idx) => (
                              <g key={idx}>
                                <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#f97316" strokeWidth="2" />
                                {p.val > 0 && (
                                  <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#71717a">
                                    {p.val}
                                  </text>
                                )}
                                <text x={p.x} y="142" textAnchor="middle" fontSize="9" fill="#a1a1aa">
                                  {trendData.labels[idx]}
                                </text>
                              </g>
                            ))}
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Right: Distribution Indicators & Success Rate */}
                    <div className="bg-white dark:bg-zinc-900 border border-dash-border p-6 rounded-xl shadow-sm flex flex-col gap-4">
                      <div>
                        <h3 className="text-sm font-black text-dash-text uppercase tracking-wider">Workflow Breakdown</h3>
                        <p className="text-[11px] text-dash-secondary">Success rate and status distribution</p>
                      </div>

                      {tasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-dash-muted text-xs italic">
                          <span>No verification data yet</span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-5 justify-center h-full">

                          {/* Radial / Success highlight */}
                          <div className="flex items-center gap-4 bg-dash-bg p-4 rounded-xl border border-dash-border">
                            <div className="relative flex items-center justify-center w-14 h-14 rounded-full border-4 border-dash-primary/20">
                              <span className="text-xs font-black text-dash-primary">{successRate}%</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-dash-text">Verification Success Rate</span>
                              <span className="text-[10px] text-dash-secondary mt-0.5">Ratio of completed tasks against failed ones</span>
                            </div>
                          </div>

                          {/* Stat bars */}
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between text-[11px] font-bold">
                                <span className="text-emerald-600">Completed</span>
                                <span>{distributionData.completed}%</span>
                              </div>
                              <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${distributionData.completed}%` }} />
                              </div>
                            </div>

                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between text-[11px] font-bold">
                                <span className="text-amber-500">In Progress</span>
                                <span>{distributionData.inProgress}%</span>
                              </div>
                              <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${distributionData.inProgress}%` }} />
                              </div>
                            </div>

                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between text-[11px] font-bold">
                                <span className="text-red-500">Failed</span>
                                <span>{distributionData.failed}%</span>
                              </div>
                              <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                                <div className="h-full bg-red-500 rounded-full" style={{ width: `${distributionData.failed}%` }} />
                              </div>
                            </div>
                          </div>

                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Verifications & Insights */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Left: Recent verifications table */}
                    <div className="md:col-span-2 bg-white dark:bg-zinc-900 border border-dash-border p-6 rounded-xl shadow-sm flex flex-col gap-4 text-left">
                      <h3 className="text-sm font-black text-dash-text uppercase tracking-wider">Recent Verifications</h3>

                      {tasks.length === 0 ? (
                        <div className="flex items-center justify-center p-8 text-dash-muted text-xs italic">
                          <span>No verification data yet</span>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-dash-border text-dash-secondary font-bold font-extrabold uppercase tracking-wider">
                                <th className="pb-2">Verification Objective</th>
                                <th className="pb-2">Type</th>
                                <th className="pb-2">Status</th>
                                <th className="pb-2">Date</th>
                                <th className="pb-2 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tasks.slice(0, 5).map((task) => (
                                <tr key={task.id} className="border-b border-dash-border last:border-0 hover:bg-zinc-50/50">
                                  <td className="py-2.5 font-bold text-dash-text max-w-xs truncate" title={task.title}>
                                    {task.title}
                                  </td>
                                  <td className="py-2.5 capitalize text-dash-secondary">
                                    {task.task_type.replace(/_/g, " ")}
                                  </td>
                                  <td className="py-2.5">
                                    <span className={`user-status-badge ${statusClass(task.status)}`}>
                                      {statusLabel(task.status)}
                                    </span>
                                  </td>
                                  <td className="py-2.5 text-dash-secondary font-bold">
                                    {formatDate(task.created_at)}
                                  </td>
                                  <td className="py-2.5 text-right">
                                    <button
                                      className="text-dash-primary font-bold hover:underline cursor-pointer"
                                      onClick={() => {
                                        setActiveSection("history");
                                        setActiveTaskId(task.id);
                                        setActiveAgentTaskId(task.id);
                                      }}
                                    >
                                      View
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Right: Workspace Insights */}
                    <div className="bg-white dark:bg-zinc-900 border border-dash-border p-6 rounded-xl shadow-sm flex flex-col gap-4 text-left">
                      <h3 className="text-sm font-black text-dash-text uppercase tracking-wider">Workspace Insights</h3>

                      {tasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-dash-muted text-xs italic">
                          <span>No insights available</span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3.5">
                          {failedCount === 0 && (
                            <div className="flex items-start gap-2 text-xs">
                              <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                              <p className="text-dash-secondary"><strong className="text-dash-text">All set!</strong> You have no failed verifications in your history.</p>
                            </div>
                          )}
                          {successRate > 75 && (
                            <div className="flex items-start gap-2 text-xs">
                              <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                              <p className="text-dash-secondary"><strong className="text-dash-text">High Efficiency:</strong> Success rate is at {successRate}%. Excellent verification confidence.</p>
                            </div>
                          )}
                          {inProgressCount > 0 ? (
                            <div className="flex items-start gap-2 text-xs">
                              <Loader2 size={16} className="text-amber-500 animate-spin shrink-0 mt-0.5" />
                              <p className="text-dash-secondary"><strong className="text-dash-text">Active Queue:</strong> You currently have {inProgressCount} verification tasks executing in parallel.</p>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2 text-xs">
                              <ShieldCheck size={16} className="text-dash-primary shrink-0 mt-0.5" />
                              <p className="text-dash-secondary"><strong className="text-dash-text">Idle Status:</strong> No tasks running. Ready to analyze your next query.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* MY VERIFICATIONS SCREEN */}
              {activeSection === "history" && (
                <div className="flex flex-col gap-6 text-left">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-dash-primary">My History</span>
                    <h2 className="text-2xl font-black text-dash-text mt-1">My Verifications</h2>
                    <p className="text-xs text-dash-secondary mt-1">View and manage your previous VeriNova requests.</p>
                  </div>

                  <div className="history-list">
                    {loading ? (
                      <div className="flex justify-center p-8"><Loader2 className="animate-spin text-dash-primary" /></div>
                    ) : tasks.length === 0 ? (
                      <div className="user-empty">
                        <ShieldCheck size={28} />
                        <strong>No verifications recorded</strong>
                        <span>Submit a query on the Home page to get started.</span>
                      </div>
                    ) : (
                      tasks.map((task) => (
                        <div key={task.id} className="history-item-card" onClick={() => { setActiveTaskId(task.id); setActiveAgentTaskId(task.id); }}>
                          <div className="history-item-details">
                            <strong className="history-item-title">{task.title}</strong>
                            <div className="history-item-meta">
                              <span>Type: <span className="capitalize">{task.task_type.replace(/_/g, " ")}</span></span>
                              <span>·</span>
                              <span>Date: {formatDate(task.created_at)}</span>
                            </div>
                          </div>
                          <div className="history-item-actions">
                            <span className={`user-status-badge ${statusClass(task.status)}`}>
                              {statusLabel(task.status)}
                            </span>
                            <button className="history-view-btn">View Results</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* AI AGENT SCREEN */}
              {activeSection === "agent" && (
                <div className="relative flex flex-col gap-8 text-left max-w-3xl mx-auto py-12 px-6">
                  {/* Colorful Mesh Gradients Background (blurred layout decoration) */}
                  <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-gradient-to-tr from-orange-500/10 to-purple-500/10 blur-3xl pointer-events-none" />
                  <div className="absolute top-1/3 right-1/4 translate-x-1/2 w-64 h-64 rounded-full bg-gradient-to-br from-pink-500/5 to-amber-500/10 blur-3xl pointer-events-none" />

                  <div className="text-center mb-6 relative">
                    <span className="text-xs font-black uppercase tracking-wider text-dash-primary bg-orange-500/10 px-3 py-1 rounded-full">
                      ⚡ VeriNova Automation Engine
                    </span>
                    <h2 className="text-4xl font-extrabold text-dash-text mt-3 tracking-tight bg-gradient-to-r from-orange-500 via-pink-500 to-indigo-600 bg-clip-text text-transparent">
                      VeriNova
                    </h2>
                    <p className="text-sm text-dash-secondary mt-2">
                      Ask VeriNova to compare, verify, research, shop, or book.
                    </p>
                  </div>

                  {renderConversationalInput(
                    "What would you like to verify today? (e.g. Compare Vivo V40 and OnePlus Nord 4 prices)",
                    agentQuery,
                    setAgentQuery,
                    () => handleQuerySubmit(agentQuery)
                  )}

                  {/* Suggestion capsules */}
                  <div className="flex flex-col gap-4 text-center mt-4">
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-dash-secondary/80">Suggested Actions</span>
                    <div className="flex flex-wrap justify-center gap-3">
                      <button
                        onClick={() => setAgentQuery("Compare Vivo V40 and OnePlus Nord 4 prices")}
                        className="px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-violet-500/5 to-indigo-500/5 hover:from-violet-500/10 hover:to-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-sm cursor-pointer transition-all flex items-center gap-2 hover:scale-[1.02]"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 shrink-0" />
                        <span>Compare Mobiles</span>
                      </button>

                      <button
                        onClick={() => setAgentQuery("Book a flight from Delhi to Kochi under ₹6,000")}
                        className="px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-cyan-500/5 to-teal-500/5 hover:from-cyan-500/10 hover:to-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shadow-sm cursor-pointer transition-all flex items-center gap-2 hover:scale-[1.02]"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 shrink-0" />
                        <span>Book Flights</span>
                      </button>

                      <button
                        onClick={() => setAgentQuery("Research benefits of AI in healthcare")}
                        className="px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-amber-500/5 to-pink-500/5 hover:from-amber-500/10 hover:to-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20 shadow-sm cursor-pointer transition-all flex items-center gap-2 hover:scale-[1.02]"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-amber-500 to-pink-500 shrink-0" />
                        <span>Research Topic</span>
                      </button>

                      <button
                        onClick={() => setAgentQuery("Verify whether the specs for Samsung S24 Ultra are correct")}
                        className="px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-emerald-500/5 to-teal-500/5 hover:from-emerald-500/10 hover:to-teal-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm cursor-pointer transition-all flex items-center gap-2 hover:scale-[1.02]"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shrink-0" />
                        <span>Verify Specs</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SHOPPING SCREEN */}
              {activeSection === "shopping" && (
                <div className="relative flex flex-col gap-8 text-left max-w-4xl mx-auto py-12 px-6">
                  {/* Colorful Mesh Gradients Background (blurred layout decoration) */}
                  <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-gradient-to-tr from-orange-500/10 to-purple-500/10 blur-3xl pointer-events-none" />
                  <div className="absolute top-1/3 right-1/4 translate-x-1/2 w-64 h-64 rounded-full bg-gradient-to-br from-pink-500/5 to-amber-500/10 blur-3xl pointer-events-none" />

                  <div className="text-center mb-6 relative">
                    <span className="text-xs font-black uppercase tracking-wider text-dash-primary bg-orange-500/10 px-3 py-1 rounded-full">
                      🛒 Smart Shopping Companion
                    </span>
                    <h2 className="text-4xl font-extrabold text-dash-text mt-3 tracking-tight bg-gradient-to-r from-orange-500 via-pink-500 to-indigo-600 bg-clip-text text-transparent">
                      Shopping
                    </h2>
                    <p className="text-sm text-dash-secondary mt-2">
                      Find and compare products using your requirements.
                    </p>
                  </div>

                  <div className="shopping-layout">
                    {/* Filters sidebar */}
                    <div className="filters-panel">
                      <span className="filters-title">Filter Search</span>

                      <div className="admin-form-group">
                        <label className="admin-form-label">Budget Limit (₹)</label>
                        <input className="admin-form-input" value={filterBudget} onChange={(e) => setFilterBudget(e.target.value)} placeholder="e.g. 60000" />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-form-label">Brand</label>
                        <input className="admin-form-input" value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} placeholder="ASUS, HP, etc." />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-form-label">RAM (GB)</label>
                        <input className="admin-form-input" value={filterRAM} onChange={(e) => setFilterRAM(e.target.value)} placeholder="16" />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-form-label">Storage (GB)</label>
                        <input className="admin-form-input" value={filterStorage} onChange={(e) => setFilterStorage(e.target.value)} placeholder="512" />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-form-label">Processor</label>
                        <input className="admin-form-input" value={filterProcessor} onChange={(e) => setFilterProcessor(e.target.value)} placeholder="Intel i5" />
                      </div>
                    </div>

                    {/* Search query box and examples */}
                    <div className="flex flex-col gap-4 flex-1">
                      {renderConversationalInput(
                        "Tell VeriNova what you want to buy. (e.g. Find the best laptop under ₹60,000 with 16GB RAM)",
                        shoppingQuery,
                        setShoppingQuery,
                        () => {
                          let finalQuery = shoppingQuery.trim();
                          if (!finalQuery) {
                            finalQuery = `Find ${filterBrand || "laptops"} under ₹${filterBudget || "60000"}`;
                          }
                          const filterParts = [];
                          if (filterRAM) filterParts.push(`${filterRAM}GB RAM`);
                          if (filterStorage) filterParts.push(`${filterStorage}GB Storage`);
                          if (filterProcessor) filterParts.push(`${filterProcessor} Processor`);
                          if (filterParts.length > 0) {
                            finalQuery += ` with ${filterParts.join(", ")}`;
                          }
                          handleQuerySubmit(finalQuery);
                        }
                      )}

                      <div className="examples-section">
                        <span className="examples-title">Try Laptop Examples</span>
                        <div className="examples-grid">
                          <div className="example-card" onClick={() => handleQuerySubmit("Find a 16GB RAM laptop under ₹60,000")}>
                            <div className="example-card-meta">
                              <strong className="example-card-text">Find 16GB RAM laptop under 60k</strong>
                            </div>
                          </div>
                          <div className="example-card" onClick={() => handleQuerySubmit("Find lightweight laptops with 512GB SSD under ₹50,000")}>
                            <div className="example-card-meta">
                              <strong className="example-card-text">Lightweight SSD laptop under 50k</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* COMPARISON SCREEN */}
              {activeSection === "comparison" && (
                <div className="relative flex flex-col gap-8 text-left max-w-3xl mx-auto py-12 px-6">
                  {/* Colorful Mesh Gradients Background (blurred layout decoration) */}
                  <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-gradient-to-tr from-orange-500/10 to-purple-500/10 blur-3xl pointer-events-none" />
                  <div className="absolute top-1/3 right-1/4 translate-x-1/2 w-64 h-64 rounded-full bg-gradient-to-br from-pink-500/5 to-amber-500/10 blur-3xl pointer-events-none" />

                  <div className="text-center mb-6 relative">
                    <span className="text-xs font-black uppercase tracking-wider text-dash-primary bg-orange-500/10 px-3 py-1 rounded-full">
                      ⚖️ Direct Specs Comparison
                    </span>
                    <h2 className="text-4xl font-extrabold text-dash-text mt-3 tracking-tight bg-gradient-to-r from-orange-500 via-pink-500 to-indigo-600 bg-clip-text text-transparent">
                      Comparison
                    </h2>
                    <p className="text-sm text-dash-secondary mt-2">
                      Compare specifications, prices, and matches side-by-side.
                    </p>
                  </div>

                  {renderConversationalInput(
                    "What would you like to compare? (e.g. Compare iPhone 15 and Samsung S24 on price, camera and battery)",
                    comparisonQuery,
                    setComparisonQuery,
                    () => handleQuerySubmit(comparisonQuery)
                  )}

                  <div className="examples-section">
                    <span className="examples-title">Try comparison</span>
                    <div className="examples-grid">
                      <div className="example-card" onClick={() => handleQuerySubmit("Compare iPhone 15 and Samsung S24 on price, camera and battery")}>
                        <div className="example-card-meta">
                          <strong className="example-card-text">Compare iPhone 15 and Samsung S24</strong>
                        </div>
                      </div>
                      <div className="example-card" onClick={() => handleQuerySubmit("Compare Vivo V40 and OnePlus Nord 4 specifications and value")}>
                        <div className="example-card-meta">
                          <strong className="example-card-text">Compare Vivo V40 and OnePlus Nord 4</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="history-list mt-6">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-dash-muted block mb-4">Past Comparisons</span>
                    {loading ? (
                      <div className="flex justify-center p-8"><Loader2 className="animate-spin text-dash-primary" /></div>
                    ) : tasks.filter(t => t.description?.toLowerCase().includes("compare")).length === 0 ? (
                      <div className="user-empty">
                        <ShieldCheck size={28} />
                        <strong>No comparison tasks found</strong>
                        <span>Submit a comparison query above to get started.</span>
                      </div>
                    ) : (
                      tasks.filter(t => t.description?.toLowerCase().includes("compare")).map((task) => (
                        <div key={task.id} className="history-item-card" onClick={() => { setActiveTaskId(task.id); setActiveAgentTaskId(task.id); }}>
                          <div className="history-item-details">
                            <strong className="history-item-title">{task.title}</strong>
                            <div className="history-item-meta">
                              <span>Date: {formatDate(task.created_at)}</span>
                            </div>
                          </div>
                          <div className="history-item-actions">
                            <span className={`user-status-badge ${statusClass(task.status)}`}>
                              {statusLabel(task.status)}
                            </span>
                            <button className="history-view-btn">View comparison</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* BOOKING SCREEN */}
              {activeSection === "booking" && (
                <div className="relative flex flex-col gap-8 text-left max-w-3xl mx-auto py-12 px-6">
                  {/* Colorful Mesh Gradients Background (blurred layout decoration) */}
                  <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-gradient-to-tr from-orange-500/10 to-purple-500/10 blur-3xl pointer-events-none" />
                  <div className="absolute top-1/3 right-1/4 translate-x-1/2 w-64 h-64 rounded-full bg-gradient-to-br from-pink-500/5 to-amber-500/10 blur-3xl pointer-events-none" />

                  <div className="text-center mb-6 relative">
                    <span className="text-xs font-black uppercase tracking-wider text-dash-primary bg-orange-500/10 px-3 py-1 rounded-full">
                      ✈️ Travel & Reservation Planner
                    </span>
                    <h2 className="text-4xl font-extrabold text-dash-text mt-3 tracking-tight bg-gradient-to-r from-orange-500 via-pink-500 to-indigo-600 bg-clip-text text-transparent">
                      Booking
                    </h2>
                    <p className="text-sm text-dash-secondary mt-2">
                      What would you like to book?
                    </p>
                  </div>

                  {/* Booking specific progress visual */}
                  <div className="booking-progress-bar">
                    <div className="booking-progress-step active">
                      <span className="booking-progress-number">1</span>
                      <span>Search</span>
                    </div>
                    <div className="booking-progress-step">
                      <span className="booking-progress-number">2</span>
                      <span>Recommendation</span>
                    </div>
                    <div className="booking-progress-step">
                      <span className="booking-progress-number">3</span>
                      <span>Confirmation</span>
                    </div>
                    <div className="booking-progress-step">
                      <span className="booking-progress-number">4</span>
                      <span>Completed</span>
                    </div>
                  </div>

                  {renderConversationalInput(
                    "What would you like to book? (e.g. Find a hotel in Kochi for 2 people this weekend)",
                    bookingQuery,
                    setBookingQuery,
                    () => handleQuerySubmit(bookingQuery)
                  )}

                  <div className="examples-section">
                    <span className="examples-title">Travel examples</span>
                    <div className="examples-grid">
                      <div className="example-card" onClick={() => handleQuerySubmit("Find a hotel in Kochi under ₹5,000")}>
                        <div className="example-card-meta">
                          <strong className="example-card-text">"Find a hotel in Kochi under ₹5,000"</strong>
                        </div>
                      </div>
                      <div className="example-card" onClick={() => handleQuerySubmit("Find flights from Kochi to Delhi")}>
                        <div className="example-card-meta">
                          <strong className="example-card-text">"Find flights from Kochi to Delhi"</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* RESEARCH SCREEN */}
              {activeSection === "research" && (
                <div className="relative flex flex-col gap-8 text-left max-w-3xl mx-auto py-12 px-6">
                  {/* Colorful Mesh Gradients Background (blurred layout decoration) */}
                  <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-gradient-to-tr from-orange-500/10 to-purple-500/10 blur-3xl pointer-events-none" />
                  <div className="absolute top-1/3 right-1/4 translate-x-1/2 w-64 h-64 rounded-full bg-gradient-to-br from-pink-500/5 to-amber-500/10 blur-3xl pointer-events-none" />

                  <div className="text-center mb-6 relative">
                    <span className="text-xs font-black uppercase tracking-wider text-dash-primary bg-orange-500/10 px-3 py-1 rounded-full">
                      🔬 Synthesized Web Research
                    </span>
                    <h2 className="text-4xl font-extrabold text-dash-text mt-3 tracking-tight bg-gradient-to-r from-orange-500 via-pink-500 to-indigo-600 bg-clip-text text-transparent">
                      Research
                    </h2>
                    <p className="text-sm text-dash-secondary mt-2">
                      Ask VeriNova to research a topic and organize the findings.
                    </p>
                  </div>

                  {renderConversationalInput(
                    "What would you like VeriNova to research? (e.g. Research the benefits and risks of AI in healthcare)",
                    researchQuery,
                    setResearchQuery,
                    () => handleQuerySubmit(researchQuery)
                  )}

                  <div className="examples-section">
                    <span className="examples-title">Research templates</span>
                    <div className="examples-grid">
                      <div className="example-card" onClick={() => handleQuerySubmit("Research the benefits and risks of AI in healthcare")}>
                        <div className="example-card-meta">
                          <strong className="example-card-text">Benefits and risks of AI in healthcare</strong>
                        </div>
                      </div>
                      <div className="example-card" onClick={() => handleQuerySubmit("Research the history of cybersecurity frameworks")}>
                        <div className="example-card-meta">
                          <strong className="example-card-text">History of cybersecurity frameworks</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PROFILE SCREEN */}
              {activeSection === "profile" && (
                <div className="flex flex-col gap-6 text-left">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-dash-primary">Account Details</span>
                    <h2 className="text-2xl font-black text-dash-text mt-1">Your Profile</h2>
                    <p className="text-xs text-dash-secondary mt-1">Manage the identity information associated with your Verinova account.</p>
                  </div>

                  <div style={{ maxWidth: "600px" }}>
                    <div className="admin-card user-panel">
                      <div className="admin-card-header">
                        <div>
                          <h3 className="admin-card-title">Profile Information</h3>
                          <p className="admin-card-subtitle">Changes are saved directly to your account.</p>
                        </div>
                      </div>
                       <div className="admin-card-body flex flex-col md:flex-row gap-8 items-start">
                        {/* Left: Avatar */}
                        <div className="flex flex-col items-center gap-2 shrink-0">
                          <div
                            className="profile-avatar-large cursor-pointer relative"
                            onClick={() => fileInputRef.current?.click()}
                            title="Click to upload a new profile photo"
                          >
                            {user.profile_image ? (
                              <img src={user.profile_image} alt="" />
                            ) : (
                              initials(user.fullname)
                            )}
                            {uploadingImage && (
                              <div className="absolute inset-0 bg-black/50 grid place-items-center rounded-full">
                                <Loader2 className="animate-spin text-white" size={24} />
                              </div>
                            )}
                          </div>
                          <span className="text-[11px] text-dash-secondary font-bold hover:underline cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            Change Photo
                          </span>
                        </div>

                        <input
                          type="file"
                          ref={fileInputRef}
                          style={{ display: "none" }}
                          accept=".jpg,.jpeg,.png,.webp"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                        />

                        {/* Right: Info Fields */}
                        <div className="flex-1 flex flex-col gap-4 w-full">
                          <div className="admin-form-group">
                            <span className="admin-form-label">Full Name</span>
                            <input
                              className="admin-form-input"
                              value={profileName}
                              onChange={(e) => setProfileName(e.target.value)}
                            />
                          </div>
                          <div className="admin-form-group">
                            <span className="admin-form-label">Email</span>
                            <input className="admin-form-input opacity-70 cursor-not-allowed" value={user.email} readOnly />
                          </div>
                          <button className="admin-btn admin-btn-primary w-fit" disabled={savingProfile} onClick={saveProfile}>
                            {savingProfile ? "Saving..." : "Save Profile"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SETTINGS SCREEN */}
              {activeSection === "settings" && (
                <div className="flex flex-col gap-6 text-left">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-dash-primary">Privacy & Settings</span>
                    <h2 className="text-2xl font-black text-dash-text mt-1">Settings</h2>
                    <p className="text-xs text-dash-secondary mt-1">Protect your account and control your workspace preferences.</p>
                  </div>

                  <div className="settings-grid">
                    <div className="admin-card user-panel">
                      <div className="admin-card-header">
                        <div>
                          <h3 className="admin-card-title">Change Password</h3>
                          <p className="admin-card-subtitle">Use a strong password of at least 8 characters.</p>
                        </div>
                      </div>
                      <div className="admin-card-body flex flex-col gap-4">
                        <div className="admin-form-group">
                          <span className="admin-form-label">Current Password</span>
                          <input className="admin-form-input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                        </div>
                        <div className="admin-form-group">
                          <span className="admin-form-label">New Password</span>
                          <input className="admin-form-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                        </div>
                        <button className="admin-btn admin-btn-primary w-fit" disabled={savingPassword} onClick={changePassword}>
                          {savingPassword ? "Updating..." : "Update Password"}
                        </button>
                      </div>
                    </div>

                    <div className="admin-card user-panel">
                      <div className="admin-card-header">
                        <div>
                          <h3 className="admin-card-title">Appearance</h3>
                          <p className="admin-card-subtitle">Use the same VeriNova theme across the application.</p>
                        </div>
                      </div>
                      <div className="admin-card-body appearance-setting">
                        <div className="appearance-icon">{theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}</div>
                        <div className="flex flex-col flex-1">
                          <strong>{theme === "dark" ? "Dark Mode" : "Light Mode"}</strong>
                          <span className="text-xs text-dash-muted mt-1 leading-snug">Toggle the workspace style theme.</span>
                        </div>
                        <button className="admin-btn admin-btn-secondary" onClick={toggleTheme}>
                          {theme === "dark" ? "Use Light" : "Use Dark"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUPPORT SCREEN */}
              {activeSection === "support" && (
                <div className="flex flex-col gap-6 text-left">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-dash-primary">VeriNova Help Center</span>
                    <h2 className="text-2xl font-black text-dash-text mt-1">Contact Support</h2>
                    <p className="text-xs text-dash-secondary mt-1">Send a secure message directly to the Verinova team.</p>
                  </div>

                  <div className="support-layout">
                    <div className="admin-card user-panel">
                      <div className="admin-card-header">
                        <div>
                          <h3 className="admin-card-title">Send a Message</h3>
                          <p className="admin-card-subtitle">We will respond as soon as possible.</p>
                        </div>
                      </div>
                      <div className="admin-card-body flex flex-col gap-4">
                        <div className="admin-form-group">
                          <span className="admin-form-label">Subject</span>
                          <input className="admin-form-input" value={supportSubject} onChange={(e) => setSupportSubject(e.target.value)} placeholder="Topic of your request" />
                        </div>
                        <div className="admin-form-group">
                          <span className="admin-form-label">Message</span>
                          <textarea className="admin-form-textarea" value={supportText} onChange={(e) => setSupportText(e.target.value)} placeholder="Describe your question in detail..." />
                        </div>
                        <button className="admin-btn admin-btn-primary w-fit" disabled={sendingSupport} onClick={sendSupportMessage}>
                          <Send size={13} />
                          <span>{sendingSupport ? "Sending..." : "Send to VeriNova"}</span>
                        </button>
                      </div>
                    </div>

                    <div className="admin-card user-panel">
                      <div className="admin-card-header">
                        <div>
                          <h3 className="admin-card-title">Previous Messages</h3>
                          <p className="admin-card-subtitle">Conversations with support team</p>
                        </div>
                      </div>
                      <div className="admin-card-body support-history">
                        {supportMessages.length === 0 ? (
                          <div className="user-empty">
                            <MessageSquare size={24} />
                            <strong>No support messages</strong>
                            <span>Your support ticket history will show here.</span>
                          </div>
                        ) : (
                          supportMessages.map((msg) => (
                            <div className="support-message pb-4 border-b border-dash-border last:border-b-0 last:pb-0" key={msg.id}>
                              <div className="support-message-head">
                                <strong>{msg.subject}</strong>
                                <span className={`status-pill ${msg.status === "replied" ? "verified" : msg.status === "closed" ? "failed" : "pending"}`}>
                                  {msg.status === "replied" ? "Replied" : msg.status === "closed" ? "Closed" : "Open"}
                                </span>
                              </div>
                              <p className="text-xs text-dash-secondary mt-1">{msg.message}</p>
                              {msg.admin_reply && (
                                <div className="support-reply mt-3 p-3 bg-dash-bg rounded-lg border-l-4 border-dash-primary">
                                  <strong className="text-[10px] text-dash-primary uppercase block mb-1">Verinova Admin</strong>
                                  <p className="text-xs m-0">{msg.admin_reply}</p>
                                </div>
                              )}
                              <small className="text-[9px] text-dash-muted block mt-2">{formatDate(msg.created_at)}</small>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </main>
    </div>
  );
}
