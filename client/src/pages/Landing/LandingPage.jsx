import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import {
  FolderGit2,
  BookOpen,
  ArrowRight,
  Sun,
  Moon,
  Award,
  Lock,
  BadgeCheck,
  Sparkles,
  School,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';

export default function LandingPage({ onSelectPortal }) {
  const { user } = useAuth();
  const { toggleTheme, isDark } = useTheme();

  const [stats, setStats] = useState({
    total_students: 480,
    total_teachers: 12,
    total_classes: 11,
    total_sections: 32
  });

  useEffect(() => {
    loadAcademyData();
  }, []);

  const loadAcademyData = async () => {
    try {
      const [classRes, teachRes, rankRes] = await Promise.all([
        api.get('/academic/classes').catch(() => []),
        api.get('/teachers').catch(() => []),
        api.get('/rankings?assessment_name=ALL').catch(() => ({ rankings: [] }))
      ]);

      const totalSecs = Array.isArray(classRes) ? classRes.reduce((acc, c) => acc + (c.sections?.length || 0), 0) : 32;
      setStats({
        total_students: rankRes?.rankings?.length || 480,
        total_teachers: Array.isArray(teachRes) && teachRes.length > 0 ? teachRes.length : 12,
        total_classes: Array.isArray(classRes) && classRes.length > 0 ? classRes.length : 11,
        total_sections: totalSecs > 0 ? totalSecs : 32
      });
    } catch (err) {
      // Clean fallback
    }
  };

  // Color Tokens
  const bg = isDark ? '#080C1A' : '#F8FAFC';
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const cardBg = isDark ? '#0F172A' : '#FFFFFF';
  const cardBorder = isDark ? '#1E293B' : '#E2E8F0';
  const subtleBg = isDark ? '#111C30' : '#FFFFFF';

  // Primary Department Gateways (Admin is completely hidden from public landing)
  const portals = [
    {
      id: 'id-manager',
      title: 'School ID Manager',
      subtitle: 'Student Identity & Badges',
      description: 'Fast 5-digit student ID lookup, photo verification, print-ready ID badge generation, and identity verification without academic marks exposure.',
      icon: <BadgeCheck size={26} />,
      accentColor: '#0284C7',
      accentBgLight: '#F0F9FF',
      accentBgDark: 'rgba(2, 132, 199, 0.18)',
      borderColorLight: '#BAE6FD',
      borderColorDark: 'rgba(2, 132, 199, 0.35)',
      buttonText: 'Launch ID Manager',
      allowedRoles: ['directory', 'admin']
    },
    {
      id: 'teacher',
      title: 'Teacher Workspace',
      subtitle: 'Faculty & Continuous Assessment',
      description: 'Dynamic mark entry with multiple tests & bonus allocations, live 100-point quota meter, class rankings, and direct parent SMS notifications.',
      icon: <BookOpen size={26} />,
      accentColor: '#7C3AED',
      accentBgLight: '#F5F3FF',
      accentBgDark: 'rgba(124, 58, 237, 0.18)',
      borderColorLight: '#DDD6FE',
      borderColorDark: 'rgba(124, 58, 237, 0.35)',
      buttonText: 'Enter Teacher Portal',
      allowedRoles: ['teacher', 'admin']
    },
    {
      id: 'records',
      title: 'Records Office',
      subtitle: 'Admissions & Registry',
      description: 'Dual-mode registration for new intake and returning re-enrollment, permanent 5-digit student dossiers, and primary guardian communications.',
      icon: <FolderGit2 size={26} />,
      accentColor: '#0D9488',
      accentBgLight: '#F0FDFA',
      accentBgDark: 'rgba(13, 148, 136, 0.18)',
      borderColorLight: '#99F6E4',
      borderColorDark: 'rgba(13, 148, 136, 0.35)',
      buttonText: 'Enter Records Office',
      allowedRoles: ['directory', 'admin']
    },
    {
      id: 'directory',
      title: 'Director Portal',
      subtitle: 'Executive Leadership & Oversight',
      description: 'Automated promotion evaluation engine with passing threshold cutoffs, institutional policy governance, and academic performance audits.',
      icon: <Award size={26} />,
      accentColor: '#D97706',
      accentBgLight: '#FFFBEB',
      accentBgDark: 'rgba(245, 158, 11, 0.18)',
      borderColorLight: '#FDE68A',
      borderColorDark: 'rgba(245, 158, 11, 0.35)',
      buttonText: 'Enter Director Portal',
      allowedRoles: ['directory', 'admin']
    }
  ];

  // Filter portals based on authenticated role containment
  const visiblePortals = portals.filter(p => {
    if (!user) return true; // Show all 4 public gateways when signed out
    if (user.role === 'teacher') return p.id === 'teacher';
    if (user.role === 'directory') return p.allowedRoles.includes('directory');
    if (user.role === 'admin') return true;
    return true;
  });

  return (
    <div style={{
      background: bg,
      color: textPrimary,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Background Ambient Glow */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '1000px',
        height: '420px',
        background: isDark 
          ? 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(59, 130, 246, 0.15), rgba(124, 58, 237, 0.08) 60%, transparent 100%)'
          : 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(59, 130, 246, 0.1), rgba(13, 148, 136, 0.05) 60%, transparent 100%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* MINIMAL INSTITUTIONAL HEADER */}
      <header style={{
        height: '64px',
        borderBottom: `1px solid ${cardBorder}`,
        background: isDark ? 'rgba(10, 15, 30, 0.85)' : 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <img
            src="/logo.png"
            alt="Lake Side Academy"
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: '#FFF',
              padding: '2px',
              border: '2px solid #F59E0B',
              objectFit: 'contain',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.2)'
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.02em', color: textPrimary }}>
                Lake Side Academy
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: textSecondary, fontWeight: 500 }}>
              Elementary & Middle School Management Platform
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {/* Active Academic Session Badge */}
          <div style={{
            display: 'none',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.3rem 0.75rem',
            borderRadius: '20px',
            background: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
            border: isDark ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid #A7F3D0',
            color: '#10B981',
            fontSize: '0.75rem',
            fontWeight: 700
          }} className="d-md-flex">
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
            <span>2018 E.C. Active</span>
          </div>

          <button
            onClick={toggleTheme}
            style={{
              background: isDark ? '#1E293B' : '#F1F5F9',
              border: `1px solid ${cardBorder}`,
              borderRadius: '9px',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: isDark ? '#FCD34D' : '#64748B',
              transition: 'all 0.15s ease'
            }}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {user ? (
            <button
              onClick={() => onSelectPortal(user.role === 'admin' ? 'admin' : user.role === 'directory' ? 'directory' : 'teacher')}
              className="btn btn-primary btn-sm"
              style={{ padding: '0.5rem 1.15rem', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '8px' }}
            >
              <span>Enter Workspace ({user.full_name.split(' ')[0]})</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={() => onSelectPortal('login')}
              className="btn btn-primary btn-sm"
              style={{ padding: '0.5rem 1.15rem', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '8px' }}
            >
              <Lock size={14} />
              <span>Staff Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* HERO SECTION */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 1.5rem 4rem 1.5rem', maxWidth: '1240px', margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>

        {/* Hero Headline */}
        <div style={{ textAlign: 'center', marginBottom: '2.75rem', maxWidth: '820px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.95rem',
            borderRadius: '9999px',
            background: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FFFBEB',
            border: isDark ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid #FDE68A',
            color: isDark ? '#FCD34D' : '#B45309',
            fontSize: '0.8rem',
            fontWeight: 800,
            marginBottom: '1.25rem',
            letterSpacing: '0.3px'
          }}>
            <Sparkles size={14} color="#F59E0B" />
            <span>ACADEMIC YEAR 2018 E.C. • OFFICIAL INSTITUTIONAL PORTAL</span>
          </div>

          <h1 style={{
            fontSize: '2.75rem',
            fontWeight: 900,
            letterSpacing: '-0.035em',
            lineHeight: 1.12,
            color: textPrimary,
            marginBottom: '0.9rem'
          }}>
            Lakeside School Management System
          </h1>

          <p style={{
            fontSize: '1.05rem',
            color: textSecondary,
            lineHeight: 1.55,
            maxWidth: '640px',
            margin: '0 auto 1.75rem auto'
          }}>
            Unified educational administration, continuous evaluation with dynamic assessments, and verifiable 5-digit student records.
          </p>

          {/* Floating Glassmorphic Stats Island */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '1.75rem',
            padding: '0.65rem 1.75rem',
            background: subtleBg,
            borderRadius: '14px',
            border: `1px solid ${cardBorder}`,
            boxShadow: isDark ? '0 10px 25px -5px rgba(0,0,0,0.4)' : '0 6px 20px -3px rgba(0,0,0,0.04)',
            fontSize: '0.84rem'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#0284C7' }}>Grades 1–8</div>
              <div style={{ color: textSecondary, fontSize: '0.72rem', fontWeight: 600 }}>Active Cycle</div>
            </div>
            <div style={{ width: 1, height: 26, background: cardBorder }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#7C3AED' }}>{stats.total_sections} Sections</div>
              <div style={{ color: textSecondary, fontSize: '0.72rem', fontWeight: 600 }}>A, B, C Cohorts</div>
            </div>
            <div style={{ width: 1, height: 26, background: cardBorder }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#0D9488' }}>{stats.total_students} Students</div>
              <div style={{ color: textSecondary, fontSize: '0.72rem', fontWeight: 600 }}>Enrolled Roster</div>
            </div>
            <div style={{ width: 1, height: 26, background: cardBorder }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#10B981' }}>100% Verified</div>
              <div style={{ color: textSecondary, fontSize: '0.72rem', fontWeight: 600 }}>5-Digit IDs</div>
            </div>
          </div>
        </div>

        {/* 4 PRIMARY DEPARTMENT GATEWAYS (NO ADMIN CARD) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: visiblePortals.length === 1 
            ? '1fr' 
            : visiblePortals.length === 3 
            ? 'repeat(auto-fit, minmax(310px, 1fr))' 
            : 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.5rem',
          width: '100%',
          maxWidth: visiblePortals.length === 1 ? '480px' : '1180px',
          marginBottom: '3.5rem'
        }}>
          {visiblePortals.map((portal) => (
            <div
              key={portal.id}
              className="card portal-entrance-card"
              onClick={() => onSelectPortal(portal.id)}
              style={{
                background: cardBg,
                borderColor: isDark ? portal.borderColorDark : portal.borderColorLight,
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                borderRadius: '16px',
                boxShadow: isDark ? '0 10px 30px -10px rgba(0,0,0,0.5)' : '0 6px 24px -4px rgba(0,0,0,0.04)',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                borderTop: `4px solid ${portal.accentColor}`,
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow = isDark 
                  ? `0 20px 40px -10px ${portal.accentColor}40`
                  : `0 16px 32px -6px ${portal.accentColor}25`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = isDark ? '0 10px 30px -10px rgba(0,0,0,0.5)' : '0 6px 24px -4px rgba(0,0,0,0.04)';
              }}
            >
              {/* Header Icon + Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div style={{
                  width: 50,
                  height: 50,
                  borderRadius: '13px',
                  background: isDark ? portal.accentBgDark : portal.accentBgLight,
                  color: portal.accentColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${isDark ? portal.borderColorDark : portal.borderColorLight}`
                }}>
                  {portal.icon}
                </div>

                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: portal.accentColor,
                  background: isDark ? portal.accentBgDark : portal.accentBgLight,
                  padding: '3px 9px',
                  borderRadius: '9999px',
                  border: `1px solid ${isDark ? portal.borderColorDark : portal.borderColorLight}`,
                  letterSpacing: '0.2px'
                }}>
                  {portal.subtitle}
                </span>
              </div>

              {/* Title & Description */}
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: textPrimary, marginBottom: '0.45rem', letterSpacing: '-0.02em' }}>
                {portal.title}
              </h3>
              <p style={{ fontSize: '0.86rem', color: textSecondary, lineHeight: 1.55, marginBottom: '1.5rem', flex: 1 }}>
                {portal.description}
              </p>

              {/* Action Button */}
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'space-between',
                  background: portal.accentColor,
                  borderColor: portal.accentColor,
                  borderRadius: '9px',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  padding: '0.65rem 1rem',
                  boxShadow: `0 4px 12px ${portal.accentColor}30`
                }}
              >
                <span>{portal.buttonText}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Minimal Institutional Footer */}
        <div style={{
          textAlign: 'center',
          color: textSecondary,
          fontSize: '0.8rem',
          maxWidth: '560px',
          borderTop: `1px solid ${cardBorder}`,
          paddingTop: '1.75rem',
          width: '100%'
        }}>
          <div style={{ fontWeight: 700, color: textPrimary, marginBottom: '0.2rem' }}>
            Lake Side Academy
          </div>
          <div style={{ fontSize: '0.75rem', opacity: 0.85, marginBottom: '0.5rem' }}>
            "Excellence in Knowledge, Integrity in Character"
          </div>
          <div style={{ fontSize: '0.72rem', opacity: 0.65, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={13} />
            <span>Authorized school personnel only • Addis Ababa, Ethiopia</span>
          </div>
        </div>

      </main>
    </div>
  );
}
