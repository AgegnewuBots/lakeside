import React, { useState, useRef, useEffect } from 'react';
import {
  ETHIOPIAN_MONTHS_EN,
  ETHIOPIAN_MONTHS_AM,
  isEthiopianLeapYear,
  getCurrentEthiopianDate,
  isValidEthiopianDate,
  parseEthiopianDate
} from '../utils/ethiopianDate';
import { Calendar, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';

export default function EthiopianDatePicker({
  value,
  onChange,
  placeholder = 'DD/MM/YYYY (E.C.)',
  disabled = false,
  required = false,
  label,
  id
}) {
  const [typedText, setTypedText] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');

  // Calendar navigation state
  const todayEth = getCurrentEthiopianDate();
  const [viewYear, setViewYear] = useState(todayEth.year);
  const [viewMonth, setViewMonth] = useState(todayEth.month);

  const containerRef = useRef(null);

  useEffect(() => {
    setTypedText(value || '');
    if (value) {
      const parsed = parseEthiopianDate(value);
      if (parsed.valid) {
        setViewYear(parsed.year);
        setViewMonth(parsed.month);
        setError('');
      }
    }
  }, [value]);

  // Close calendar popover on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle direct text input
  const handleInputChange = (e) => {
    const text = e.target.value;
    setTypedText(text);

    if (!text.trim()) {
      setError('');
      onChange('');
      return;
    }

    const parsed = parseEthiopianDate(text);
    if (parsed.valid) {
      setError('');
      onChange(parsed.formatted);
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    } else {
      // Only set error if complete string typed
      if (text.length >= 8) {
        setError('Invalid date');
      } else {
        setError('');
      }
    }
  };

  const handleInputBlur = () => {
    if (!typedText.trim()) {
      setError('');
      return;
    }
    const parsed = parseEthiopianDate(typedText);
    if (parsed.valid) {
      setError('');
      setTypedText(parsed.formatted);
      onChange(parsed.formatted);
    } else {
      setError('Invalid date');
    }
  };

  // Day selection from popover
  const handleSelectDay = (day) => {
    const dStr = String(day).padStart(2, '0');
    const mStr = String(viewMonth).padStart(2, '0');
    const formatted = `${dStr}/${mStr}/${viewYear}`;
    setTypedText(formatted);
    setError('');
    onChange(formatted);
    setIsOpen(false);
  };

  // Quick Today
  const handleSelectToday = () => {
    setTypedText(todayEth.formatted);
    setError('');
    onChange(todayEth.formatted);
    setViewYear(todayEth.year);
    setViewMonth(todayEth.month);
    setIsOpen(false);
  };

  // Quick Clear
  const handleClear = () => {
    setTypedText('');
    setError('');
    onChange('');
    setIsOpen(false);
  };

  // Month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(13);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 13) {
      setViewMonth(1);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  // Days count in viewed month
  const daysInViewMonth = viewMonth === 13 ? (isEthiopianLeapYear(viewYear) ? 6 : 5) : 30;

  // Selected date parts
  let selectedDay = null;
  let selectedMonth = null;
  let selectedYear = null;
  if (value) {
    const p = parseEthiopianDate(value);
    if (p.valid) {
      selectedDay = p.day;
      selectedMonth = p.month;
      selectedYear = p.year;
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {label && (
        <label htmlFor={id} className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{label}</span>
          <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>Ethiopian (DD/MM/YYYY)</span>
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          id={id}
          type="text"
          className="form-control"
          placeholder={placeholder}
          value={typedText}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          disabled={disabled}
          required={required}
          style={{
            paddingRight: '2.5rem',
            borderColor: error ? '#EF4444' : undefined,
            fontFamily: 'inherit'
          }}
        />
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          tabIndex={-1}
          style={{
            position: 'absolute',
            right: '8px',
            background: 'none',
            border: 'none',
            cursor: disabled ? 'default' : 'pointer',
            color: error ? '#EF4444' : '#64748B',
            display: 'flex',
            alignItems: 'center',
            padding: '4px'
          }}
          title="Open Ethiopian Calendar"
        >
          <Calendar size={16} />
        </button>
      </div>

      {error && (
        <div style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '3px', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* Popover Calendar */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          zIndex: 100,
          background: 'var(--white, #FFFFFF)',
          border: '1px solid var(--slate-200, #E2E8F0)',
          borderRadius: '10px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
          padding: '0.85rem',
          width: '280px'
        }}>
          {/* Calendar Header: Month & Year controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', color: '#475569' }}
            >
              <ChevronLeft size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '2px 4px',
                  background: '#FFFFFF',
                  color: '#0F172A'
                }}
              >
                {ETHIOPIAN_MONTHS_EN.map((name, idx) => (
                  <option key={name} value={idx + 1}>
                    {name} ({ETHIOPIAN_MONTHS_AM[idx]})
                  </option>
                ))}
              </select>

              <input
                type="number"
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10) || viewYear)}
                style={{
                  width: '65px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '2px 4px',
                  textAlign: 'center',
                  background: '#FFFFFF',
                  color: '#0F172A'
                }}
              />
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', color: '#475569' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Days Grid (1 to 30, or 5/6) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '4px',
            marginBottom: '0.75rem'
          }}>
            {Array.from({ length: daysInViewMonth }, (_, i) => i + 1).map(day => {
              const isSelected = selectedYear === viewYear && selectedMonth === viewMonth && selectedDay === day;
              const isToday = todayEth.year === viewYear && todayEth.month === viewMonth && todayEth.day === day;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  style={{
                    height: '32px',
                    borderRadius: '6px',
                    border: isToday ? '1px solid #2563EB' : '1px solid transparent',
                    background: isSelected ? '#2563EB' : 'transparent',
                    color: isSelected ? '#FFFFFF' : '#0F172A',
                    fontWeight: isSelected || isToday ? 700 : 500,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.1s ease'
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer Quick Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '0.5rem' }}>
            <button
              type="button"
              onClick={handleClear}
              className="btn btn-secondary btn-sm"
              style={{ padding: '2px 8px', fontSize: '0.75rem' }}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleSelectToday}
              className="btn btn-primary btn-sm"
              style={{ padding: '2px 8px', fontSize: '0.75rem' }}
            >
              Today ({todayEth.formatted})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
