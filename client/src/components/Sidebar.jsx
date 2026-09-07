import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getCurrentEthiopianDate } from '../utils/ethiopianDate';
import api from '../services/api';
import {
  LayoutDashboard,
  Users,
  KeyRound,
  GraduationCap,
  Network,
  ClipboardList,
  Trophy,
  Send,
  FileSpreadsheet,
  ShieldAlert,
  Settings,
  UserPlus,
  Search,
  BookOpen,
  History,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  UserCheck,
  Sun,
  Moon,
  LogOut,
  Home,
  Calendar,
  X,
  Eye,
  ShieldCheck,
  FolderGit2,
  Contact,
  ArrowUpRight
} from 'lucide-react';

export default function Sidebar({
  portalType,
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  onSelectPortal,
  onSelectStudent
}) {
  const { user, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();

  // Live Ethiopian date
  const [ethDate] = useState(() => getCurrentEthiopianDate());

  // Quick search modal state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  const handleSearchInput = (val) => {
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/search/global?q=${encodeURIComponent(val.trim())}`);
        setSearchResults(res);
      } catch (err) {
        setSearchResults(null);
      } finally {
        setIsSearching(false);
      }
    }, 180);
  };

  const handlePickStudent = (studentId) => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults(null);
    if (onSelectStudent) {
      onSelectStudent(studentId);
    }
  };

  // Nav definitions per portal
  const adminSections = [
    {
      title: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
      ]
    },
    {
      title: 'School',
      items: [
        { id: 'students-list', label: 'Students', icon: Users },
        { id: 'id-lookup', label: 'School ID Manager', icon: Contact },
        { id: 'search', label: 'Directory Search', icon: Search },
        { id: 'users', label: 'Teachers & Staff', icon: UserCheck },
        { id: 'academics', label: 'Classes & Sections', icon: GraduationCap },
        { id: 'assignments', label: 'Assignments', icon: Network }
      ]
    },
    {
      title: 'Academics',
      items: [
        { id: 'assessments', label: 'Assessments', icon: ClipboardList },
        { id: 'rankings', label: 'Rankings', icon: Trophy },
        { id: 'promotion-wizard', label: 'Promotion & Evaluation', icon: ArrowUpRight }
      ]
    },
    {
      title: 'Communication',
      items: [
        { id: 'sms-broadcast', label: 'SMS Broadcasts', icon: Send },
        { id: 'result-sms', label: 'Result SMS', icon: FileSpreadsheet }
      ]
    },
    {
      title: 'System',
      items: [
        { id: 'audit', label: 'Audit Logs', icon: ShieldAlert },
        { id: 'permissions', label: 'Permissions', icon: KeyRound },
        { id: 'settings', label: 'Settings', icon: Settings }
      ]
    }
  ];

  const directorySections = [
    {
      title: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
      ]
    },
    {
      title: 'Records',
      items: [
        { id: 'students-list', label: 'Student List', icon: Users },
        { id: 'id-lookup', label: 'School ID Manager', icon: Contact },
        { id: 'search', label: 'Search Records', icon: Search },
        { id: 'register', label: 'Register Student', icon: UserPlus },
        { id: 'parents', label: 'Parents', icon: UserCheck }
      ]
    },
    {
      title: 'Academics',
      items: [
        { id: 'academics', label: 'Classes & Sections', icon: GraduationCap },
        { id: 'rankings', label: 'Rankings', icon: Trophy },
        { id: 'promotion-wizard', label: 'Promotion & Evaluation', icon: ArrowUpRight }
      ]
    },
    {
      title: 'Communication',
      items: [
        { id: 'sms', label: 'SMS Broadcasts', icon: Send },
        { id: 'result-sms', label: 'Result SMS', icon: FileSpreadsheet },
        { id: 'announcements', label: 'Announcements', icon: Megaphone }
      ]
    }
  ];

  const teacherSections = [
    {
      title: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
      ]
    },
    {
      title: 'Teaching',
      items: [
        { id: 'classes', label: 'My Classes', icon: BookOpen },
        { id: 'marks', label: 'Mark Entry', icon: ClipboardList },
        { id: 'adjust-marks', label: 'Adjustments', icon: History },
        { id: 'rankings', label: 'Rankings', icon: Trophy }
      ]
    },
    {
      title: 'Account & Communication',
      items: [
        { id: 'sms', label: 'SMS to Parents', icon: Send },
        { id: 'settings', label: 'Account Settings', icon: KeyRound }
      ]
    }
  ];

  const currentSections =
    portalType === 'admin'
      ? adminSections
      : portalType === 'directory'
      ? directorySections
      : teacherSections;

  return (
    <>
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} data-portal={portalType}>
        {/* Top Header: Brand & Ethiopian Date */}
        <div style={{
          padding: collapsed ? '0.5rem 0' : '0.6rem 0.5rem 0.85rem',
          borderBottom: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0',
          marginBottom: '0.65rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            justifyContent: collapsed ? 'center' : 'flex-start'
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#FFFFFF',
              border: '2px solid #F59E0B',
              overflow: 'hidden',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img src="/logo.png" alt="Lake Side Academy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>

            {!collapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{
                  fontWeight: 800,
                  fontSize: '0.98rem',
                  letterSpacing: '-0.01em',
                  color: isDark ? '#F1F5F9' : '#0B192C',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden'
                }}>
                  Lake Side Academy
                </div>
              </div>
            )}
          </div>

          {/* Automatic Ethiopian Date & Academic Year Badge */}
          {!collapsed && (
            <div style={{
              marginTop: '0.6rem',
              padding: '0.35rem 0.6rem',
              background: isDark ? '#0F172A' : '#F8FAFC',
              border: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.72rem'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: isDark ? '#94A3B8' : '#64748B', fontWeight: 600 }}>
                <Calendar size={13} color="#0D9488" /> {ethDate.year} E.C.
              </span>
              <span style={{
                fontFamily: 'monospace',
                fontWeight: 800,
                color: isDark ? '#38BDF8' : '#0F766E',
                background: isDark ? 'rgba(56,189,248,0.1)' : '#F0FDFA',
                padding: '1px 5px',
                borderRadius: '4px'
              }}>
                {ethDate.formatted}
              </span>
            </div>
          )}
        </div>

        {/* Quick Search (Admin & Directory Only - Hidden for Teachers to prevent unauthorized dossier access) */}
        {!collapsed && portalType !== 'teacher' && (
          <div style={{ marginBottom: '0.65rem' }}>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.45rem 0.65rem',
                fontSize: '0.78rem',
                color: isDark ? '#94A3B8' : '#64748B',
                background: isDark ? '#0F172A' : '#F8FAFC',
                border: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Search size={14} color="#0D9488" /> Search student...
              </span>
              <kbd style={{
                fontSize: '0.65rem',
                fontFamily: 'monospace',
                background: isDark ? '#1E293B' : '#E2E8F0',
                padding: '1px 4px',
                borderRadius: '3px'
              }}>
                5-Digit ID
              </kbd>
            </button>
          </div>
        )}

        {/* Collapsed quick search button (Admin & Directory Only) */}
        {collapsed && portalType !== 'teacher' && (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="nav-link"
            title="Search student records"
            style={{ justifyContent: 'center', marginBottom: '0.5rem' }}
          >
            <Search size={17} />
          </button>
        )}

        {/* Navigation Sections */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: 1, overflowY: 'auto' }}>
          {currentSections.map(sec => (
            <div key={sec.title} style={{ marginBottom: '0.4rem' }}>
              {!collapsed && <div className="sidebar-section-header">{sec.title}</div>}
              {sec.items.map(item => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon size={17} style={{ flexShrink: 0 }} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer: User, Theme, Home, Logout */}
        <div style={{
          paddingTop: '0.65rem',
          borderTop: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0',
          marginTop: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          {!collapsed && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.45rem 0.5rem',
              borderRadius: '6px',
              background: isDark ? '#0F172A' : '#F8FAFC',
              border: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0'
            }}>
              <div style={{ overflow: 'hidden', marginRight: '0.5rem' }}>
                <div style={{
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: isDark ? '#F1F5F9' : '#0F172A',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden'
                }}>
                  {user?.full_name || user?.username || 'Administrator'}
                </div>
                <div style={{ fontSize: '0.68rem', color: isDark ? '#94A3B8' : '#64748B' }}>
                  {user?.role === 'admin'
                    ? 'Lakeside Executive Administrator'
                    : user?.role === 'directory'
                    ? 'Records Office'
                    : 'Faculty Teacher'}
                </div>
              </div>

              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                style={{
                  border: 'none',
                  background: isDark ? '#1E293B' : '#E2E8F0',
                  color: isDark ? '#F59E0B' : '#0B192C',
                  width: 28,
                  height: 28,
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            </div>
          )}

          {/* Action Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            gap: '0.35rem'
          }}>
            {!collapsed && (
              <button
                type="button"
                onClick={() => onSelectPortal && onSelectPortal('landing')}
                className="btn btn-secondary btn-sm"
                style={{
                  flex: 1,
                  fontSize: '0.75rem',
                  padding: '0.35rem 0.5rem',
                  justifyContent: 'center'
                }}
                title="Return to Public Landing Page"
              >
                <Home size={14} /> Home
              </button>
            )}

            <button
              type="button"
              onClick={logout}
              className="btn btn-secondary btn-sm"
              style={{
                fontSize: '0.75rem',
                padding: '0.35rem 0.5rem',
                color: '#EF4444',
                borderColor: isDark ? 'rgba(239,68,68,0.2)' : '#FCA5A5',
                justifyContent: 'center'
              }}
              title="Sign Out"
            >
              <LogOut size={14} />
              {!collapsed && <span>Sign Out</span>}
            </button>

            <button
              type="button"
              className="sidebar-toggle-btn"
              onClick={onToggleCollapse}
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              style={{ margin: 0, padding: '0.35rem', width: collapsed ? '100%' : 'auto' }}
            >
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>
        </div>
      </aside>

      {/* Global Quick Search Modal */}
      {searchOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: '10vh',
          zIndex: 9999
        }}
        onClick={() => setSearchOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '540px',
              background: isDark ? '#0F172A' : '#FFFFFF',
              borderRadius: '12px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.85rem 1rem',
              borderBottom: isDark ? '1px solid #1E293B' : '1px solid #F1F5F9'
            }}>
              <Search size={18} color="#0D9488" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                placeholder="Search students by 5-digit ID, name, or phone..."
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.95rem',
                  background: 'transparent',
                  color: isDark ? '#FFFFFF' : '#0F172A'
                }}
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '2px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '0.5rem' }}>
              {isSearching ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
                  Searching official records...
                </div>
              ) : searchResults && searchResults.students?.length > 0 ? (
                <div>
                  <div style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#64748B',
                    padding: '0.25rem 0.5rem 0.4rem'
                  }}>
                    Students Found ({searchResults.students.length})
                  </div>
                  {searchResults.students.map(s => (
                    <div
                      key={s.id}
                      onClick={() => handlePickStudent(s.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                        borderBottom: isDark ? '1px solid #1E293B' : '1px solid #F8FAFC'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = isDark ? '#1E293B' : '#F1F5F9'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            color: '#0F766E',
                            background: isDark ? 'rgba(15,118,110,0.2)' : '#F0FDFA',
                            padding: '1px 5px',
                            borderRadius: '4px'
                          }}>
                            {s.student_id}
                          </span>
                          <strong style={{ fontSize: '0.9rem', color: isDark ? '#F1F5F9' : '#0F172A' }}>
                            {s.full_name}
                          </strong>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                          {s.section_full_name} • Parent: {s.parent_name || '—'}
                        </div>
                      </div>
                      <span className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}>
                        <Eye size={13} /> View
                      </span>
                    </div>
                  ))}
                </div>
              ) : searchQuery.trim() ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
                  No students found matching "{searchQuery}".
                </div>
              ) : (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.82rem' }}>
                  Type a 5-digit Student ID (e.g. 10001), name, or phone number to quickly open their dossier.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
