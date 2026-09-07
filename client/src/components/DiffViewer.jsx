import React from 'react';
import { ArrowRight, MinusCircle, PlusCircle } from 'lucide-react';

export default function DiffViewer({ oldValues, newValues, title }) {
  if (!oldValues && !newValues) {
    return <div style={{ color: '#94A3B8', fontStyle: 'italic', fontSize: '0.85rem' }}>No before/after state recorded.</div>;
  }

  // Format object or JSON into clean key-value rows
  const parseData = (val) => {
    if (!val) return null;
    if (typeof val === 'object') return val;
    try {
      return JSON.parse(val);
    } catch {
      return { value: val };
    }
  };

  const oldObj = parseData(oldValues);
  const newObj = parseData(newValues);

  // Collect all unique keys
  const keys = Array.from(new Set([...(oldObj ? Object.keys(oldObj) : []), ...(newObj ? Object.keys(newObj) : [])]));

  return (
    <div style={{ marginTop: '0.5rem' }}>
      {title && <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', color: '#1E293B' }}>{title}</div>}
      
      <div className="diff-container">
        {/* Left Side: Previous Value */}
        <div className="diff-box-old">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, marginBottom: '0.5rem', borderBottom: '1px solid rgba(244, 63, 94, 0.2)', paddingBottom: '0.35rem' }}>
            <MinusCircle size={15} /> Previous State (Before)
          </div>
          {oldObj ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {keys.map(k => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.82rem' }}>
                  <span style={{ fontWeight: 600, opacity: 0.8 }}>{k}:</span>
                  <span style={{ wordBreak: 'break-all', textAlign: 'right' }}>
                    {oldObj[k] !== undefined ? String(oldObj[k]) : '<empty>'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span style={{ fontStyle: 'italic', opacity: 0.7 }}>&lt;Initial Record Creation&gt;</span>
          )}
        </div>

        {/* Right Side: New Value */}
        <div className="diff-box-new">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, marginBottom: '0.5rem', borderBottom: '1px solid rgba(16, 185, 129, 0.2)', paddingBottom: '0.35rem' }}>
            <PlusCircle size={15} /> New State (After)
          </div>
          {newObj ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {keys.map(k => {
                const isChanged = oldObj && oldObj[k] !== newObj[k];
                return (
                  <div
                    key={k}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      fontSize: '0.82rem',
                      background: isChanged ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                      padding: isChanged ? '0.1rem 0.3rem' : 0,
                      borderRadius: '4px'
                    }}
                  >
                    <span style={{ fontWeight: 600, opacity: 0.8 }}>{k}:</span>
                    <span style={{ wordBreak: 'break-all', textAlign: 'right', fontWeight: isChanged ? 700 : 400 }}>
                      {newObj[k] !== undefined ? String(newObj[k]) : '<removed>'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <span style={{ fontStyle: 'italic', opacity: 0.7 }}>&lt;Record Deleted&gt;</span>
          )}
        </div>
      </div>
    </div>
  );
}
