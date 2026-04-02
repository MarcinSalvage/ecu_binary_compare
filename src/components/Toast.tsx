// Toast Notification Component

import React from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useStore } from '../stores/useStore';
import type { Toast as ToastType } from '../types';

const toastIcons: Record<ToastType['type'], React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-green-400" />,
  error: <AlertCircle className="w-5 h-5 text-red-400" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />
};

const toastStyles: Record<ToastType['type'], string> = {
  success: 'border-green-500/30 bg-green-500/10',
  error: 'border-red-500/30 bg-red-500/10',
  warning: 'border-yellow-500/30 bg-yellow-500/10',
  info: 'border-blue-500/30 bg-blue-500/10'
};

interface ToastItemProps {
  toast: ToastType;
  onDismiss: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm
        animate-in slide-in-from-right-full fade-in duration-200
        ${toastStyles[toast.type]}
      `}
    >
      <div className="flex-shrink-0">{toastIcons[toast.type]}</div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-200">{toast.message}</p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            {toast.action.label}
          </button>
        )}
        <button
          onClick={onDismiss}
          className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};
