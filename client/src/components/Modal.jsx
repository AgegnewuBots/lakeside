import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, footer, maxWidth = '650px' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A' }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', padding: '0.25rem' }}
          >
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
