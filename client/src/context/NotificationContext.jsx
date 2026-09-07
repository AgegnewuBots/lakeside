import React, { createContext, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const notify = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'danger', 6000),
    warning: (msg) => addToast(msg, 'warning'),
    info: (msg) => addToast(msg, 'info')
  };

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        maxWidth: '420px',
        width: '100%'
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            padding: '1rem 1.25rem',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
            backgroundColor: '#0F172A',
            color: '#F8FAFC',
            borderLeft: `4px solid ${
              t.type === 'success' ? '#10B981' :
              t.type === 'danger' ? '#EF4444' :
              t.type === 'warning' ? '#F59E0B' : '#3B82F6'
            }`,
            animation: 'slideUp 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {t.type === 'success' && <CheckCircle2 size={20} color="#10B981" />}
              {t.type === 'danger' && <AlertCircle size={20} color="#EF4444" />}
              {t.type === 'warning' && <AlertTriangle size={20} color="#F59E0B" />}
              {t.type === 'info' && <Info size={20} color="#3B82F6" />}
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotify() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotify must be used within NotificationProvider');
  return ctx;
}
