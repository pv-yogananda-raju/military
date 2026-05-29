import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose, duration = 4000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-[#0f1b15] border-tactical-green/60 text-tactical-greenLight',
          icon: CheckCircle2,
          shadow: 'shadow-glowGreen',
        };
      case 'warning':
        return {
          bg: 'bg-[#241c0f] border-amber-500/50 text-amber-400',
          icon: AlertTriangle,
          shadow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
        };
      case 'error':
        return {
          bg: 'bg-[#201212] border-tactical-red/60 text-tactical-redLight',
          icon: AlertCircle,
          shadow: 'shadow-glowRed',
        };
      default:
        return {
          bg: 'bg-tactical-panel border-tactical-border text-white',
          icon: CheckCircle2,
          shadow: 'shadow-tactical',
        };
    }
  };

  const styles = getToastStyles();
  const Icon = styles.icon;

  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-mono font-bold tracking-wide transition-all duration-300 transform translate-y-0 ${styles.bg} ${styles.shadow}`}>
      <div className="flex items-center space-x-3 pr-4">
        <Icon className="w-4 h-4 flex-shrink-0 animate-pulse" />
        <span className="leading-tight">{message}</span>
      </div>
      <button 
        onClick={onClose}
        className="text-tactical-gray hover:text-white p-0.5 rounded transition-all"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default Toast;
