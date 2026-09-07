import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { 
  ShieldCheck, 
  FolderGit2, 
  BookOpen, 
  Smartphone, 
  LogOut, 
  Home, 
  UserCheck,
  Search,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon
} from 'lucide-react';

export default function Navbar({ 
  activePortal, 
  onSelectPortal, 
  onSelectStudent,
  sidebarCollapsed,
  onToggleSidebar 
}) {
  const { user, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  
  // Global search state
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchContainerRef = useRef(null);
  const debounceRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on portal change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activePortal]);

  const handleSearchInput = (e) => {
    const val = e.target.value;
    setGlobalSearch(val);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!val.trim()) {
      setSearchResults(null);
      setShowDropdown(false);
      return;
    }

    setShowDropdown(true);
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

  const handleSelectResultStudent = (studentId) => {
    setShowDropdown(false);
    setGlobalSearch('');
    if (onSelectStudent) {
      onSelectStudent(studentId);
    } else {
      onSelectPortal('directory');
    }
  };

  const handleSelectResultParent = () => {
    setShowDropdown(false);
    setGlobalSearch('');
    onSelectPortal('directory');
  };

  const handleSelectResultTeacher = () => {
    setShowDropdown(false);
    setGlobalSearch('');
    onSelectPortal('admin');
  };

  const portalItems = [
    { id: 'landing', label: 'Home', icon: Home },
    ...(user?.role === 'admin' ? [{ id: 'admin', label: 'Admin', icon: ShieldCheck }] : []),
    ...(user?.role === 'admin' || user?.role === 'directory' ? [{ id: 'directory', label: 'Records Office', icon: FolderGit2 }] : []),
    ...(user?.role === 'admin' || user?.role === 'teacher' ? [{ id: 'teacher', label: 'Faculty', icon: BookOpen }] : [])
  ];

  return (
    <>
      <header className="navbar">
        {/* Left: Sidebar Toggle + Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {activePortal !== 'landing' && activePortal !== 'login' && activePortal !== 'sms-sim' && (
            <button
              onClick={onToggleSidebar}
              className="navbar-icon-btn"
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
            </button>
          )}

          <div 
            className="navbar-brand" 
            onClick={() => onSelectPortal('landing')}
            title="Lake Side Academy | ሌክ ሳይድ አካዳሚ"
          >
            <img src="/logo.png" alt="Lake Side Academy Crest" />
            <div>
              <div className="navbar-brand-title">
                <span>Lake Side Academy</span>
                <span style={{ 
                  fontSize: '0.62rem', 
                  background: 'rgba(245, 158, 11, 0.18)',
                  color: '#FCD34D',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  fontWeight: 700,
                  fontFamily: "'Noto Sans Ethiopic', sans-serif",
                  border: '1px solid rgba(245, 158, 11, 0.3)'
                }}>
                  ሌክ ሳይድ አካዳሚ
                </span>
              </div>
              <div className="navbar-brand-subtitle">School Administration Platform</div>
            </div>
          </div>
        </div>

        {/* Center: Global Search */}
        <div className="nav-search-container" ref={searchContainerRef}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search 
              size={14} 
              color="#64748B" 
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} 
            />
            <input
              type="text"
              className="nav-search-input"
              value={globalSearch}
              onChange={handleSearchInput}
              onFocus={() => { if (globalSearch.trim()) setShowDropdown(true); }}
              placeholder="Search students, teachers, or ID..."
            />
            {globalSearch && (
              <button
                onClick={() => { setGlobalSearch(''); setSearchResults(null); setShowDropdown(false); }}
                style={{
                  position: 'absolute',
                  right: '0.6rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '2px'
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showDropdown && (
            <div className="nav-search-dropdown">
              {isSearching ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#64748B', fontSize: '0.82rem' }}>
                  Searching...
                </div>
              ) : searchResults && searchResults.total > 0 ? (
                <div>
                  {searchResults.students.length > 0 && (
                    <div>
                      <div className="nav-search-section-title">
                        <span>Students ({searchResults.students.length})</span>
                        <span style={{ fontSize: '0.62rem', color: '#0F766E' }}>Dossier</span>
                      </div>
                      {searchResults.students.map(s => (
                        <div 
                          key={s.id} 
                          className="nav-search-item"
                          onClick={() => handleSelectResultStudent(s.id)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              fontFamily: "'SF Mono', monospace",
                              fontWeight: 800,
                              fontSize: '0.78rem',
                              color: '#0F766E',
                              background: '#F0FDFA',
                              padding: '0.1rem 0.35rem',
                              borderRadius: '4px',
                              border: '1px solid #CCFBF1'
                            }}>
                              {s.student_id}
                            </span>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{s.full_name}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                {s.section_full_name} • {s.parent_name || '—'}
                              </div>
                            </div>
                          </div>
                          <span className="badge badge-primary" style={{ fontSize: '0.62rem' }}>View</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.teachers.length > 0 && (
                    <div>
                      <div className="nav-search-section-title">
                        <span>Teachers ({searchResults.teachers.length})</span>
                      </div>
                      {searchResults.teachers.map(t => (
                        <div 
                          key={t.id} 
                          className="nav-search-item"
                          onClick={handleSelectResultTeacher}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <BookOpen size={14} color="#7C3AED" />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{t.full_name}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                {t.subject_specialty || 'Faculty'} • {t.phone || '—'}
                              </div>
                            </div>
                          </div>
                          <span className="badge badge-neutral" style={{ fontSize: '0.62rem' }}>Faculty</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.parents && searchResults.parents.length > 0 && (
                    <div>
                      <div className="nav-search-section-title">
                        <span>Parents ({searchResults.parents.length})</span>
                      </div>
                      {searchResults.parents.map(p => (
                        <div 
                          key={p.id} 
                          className="nav-search-item"
                          onClick={handleSelectResultParent}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <UserCheck size={14} color="#059669" />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{p.full_name}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{p.phone || '—'}</div>
                            </div>
                          </div>
                          <span className="badge badge-success" style={{ fontSize: '0.62rem' }}>Guardian</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.82rem' }}>
                  No results for "{globalSearch}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Portal Tabs + Controls */}
        <div className="navbar-nav">
          {/* Portal Segmented Tabs */}
          <div className="portal-tabs">
            {portalItems.map(item => {
              const Icon = item.icon;
              const isActive = activePortal === item.id;
              return (
                <button
                  key={item.id}
                  className={`portal-tab ${isActive ? 'active' : ''}`}
                  data-portal={item.id}
                  onClick={() => onSelectPortal(item.id)}
                >
                  <Icon size={13} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Logged in User Identity Badge */}
          {user && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.2rem 0.65rem',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)'
            }}>
              <UserCheck size={13} color="#FBBF24" />
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#F1F5F9' }}>
                {user.full_name}
              </span>
              <span style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '1px 6px',
                borderRadius: '4px',
                background: user.role === 'admin' ? 'rgba(37, 99, 235, 0.3)' : user.role === 'directory' ? 'rgba(13, 148, 136, 0.3)' : 'rgba(124, 58, 237, 0.3)',
                color: user.role === 'admin' ? '#93C5FD' : user.role === 'directory' ? '#5EEAD4' : '#C4B5FD'
              }}>
                {user.role === 'directory' ? 'Director/Registrar' : user.role}
              </span>
            </div>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="navbar-icon-btn"
            title={isDark ? 'Light Mode' : 'Dark Mode'}
          >
            {isDark ? <Sun size={14} color="#FBBF24" /> : <Moon size={14} />}
          </button>

          {/* Sign Out / Sign In */}
          {user ? (
            <button
              className="navbar-icon-btn danger"
              onClick={logout}
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          ) : (
            <button
              className="btn btn-gold btn-sm"
              onClick={() => onSelectPortal('login')}
              style={{ fontSize: '0.76rem' }}
            >
              Sign In
            </button>
          )}

          {/* Mobile Hamburger */}
          <button
            className="navbar-icon-btn navbar-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </header>

      {/* Mobile Slide-in Menu */}
      {mobileMenuOpen && (
        <>
          <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)} />
          <div className="mobile-menu-panel">
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 0.5rem' }}>
              Navigation
            </div>
            {portalItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`mobile-menu-link ${activePortal === item.id ? 'active' : ''}`}
                  onClick={() => { onSelectPortal(item.id); setMobileMenuOpen(false); }}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}



            <div className="mobile-menu-divider" />

            {/* Mobile Search */}
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#64748B" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="nav-search-input"
                placeholder="Search..."
                style={{ width: '100%' }}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  // Simplified mobile search - redirect to full search
                }}
              />
            </div>

            <div className="mobile-menu-divider" />

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="mobile-menu-link" onClick={toggleTheme} style={{ flex: 1, justifyContent: 'center' }}>
                {isDark ? <Sun size={14} color="#FBBF24" /> : <Moon size={14} />}
                <span>{isDark ? 'Light' : 'Dark'}</span>
              </button>
              {user && (
                <button className="mobile-menu-link" onClick={() => { logout(); setMobileMenuOpen(false); }} style={{ flex: 1, justifyContent: 'center', color: '#FCA5A5' }}>
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
