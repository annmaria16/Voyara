import { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: any, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: any, type: ToastType = "info") => {
    let msgStr = "";
    if (message === null || message === undefined) {
      msgStr = "";
    } else if (typeof message === "string") {
      msgStr = message;
    } else if (Array.isArray(message)) {
      msgStr = message
        .map((err: any) => {
          if (err && typeof err === "object" && err.msg) {
            return err.msg;
          }
          return typeof err === "object" ? JSON.stringify(err) : String(err);
        })
        .join(", ");
    } else if (typeof message === "object") {
      msgStr = message.msg || message.detail || message.message || JSON.stringify(message);
    } else {
      msgStr = String(message);
    }

    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message: msgStr, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const contextValue = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Toast Portal Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => {
            let icon = <Info size={18} className="text-blue-400" />;
            let borderColor = "border-blue-500/30";
            let bgColor = "bg-blue-500/10";
            if (t.type === "success") {
              icon = <CheckCircle2 size={18} className="text-[#22C55E]" />;
              borderColor = "border-[#22C55E]/40";
              bgColor = "bg-[#22C55E]/10";
            } else if (t.type === "error") {
              icon = <AlertTriangle size={18} className="text-red-400" />;
              borderColor = "border-red-500/40";
              bgColor = "bg-red-500/10";
            } else if (t.type === "warning") {
              icon = <AlertTriangle size={18} className="text-amber-400" />;
              borderColor = "border-amber-500/40";
              bgColor = "bg-amber-500/10";
            }

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border ${borderColor} ${bgColor} glass-panel shadow-2xl overflow-hidden relative`}
              >
                {/* Visual Accent bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${t.type === 'success' ? 'bg-[#22C55E]' : t.type === 'error' ? 'bg-red-500' : t.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                
                <div className="shrink-0 mt-0.5">{icon}</div>
                <div className="flex-grow text-sm text-dash-text font-medium pr-4">
                  {t.message}
                </div>
                <button
                  onClick={() => removeToast(t.id)}
                  className="shrink-0 text-dash-muted hover:text-dash-text transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
