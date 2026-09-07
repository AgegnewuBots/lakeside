import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Public & Gateway Pages
import LandingPage from './pages/Landing/LandingPage';
import LoginPage from './pages/Login/LoginPage';
import ParentSMSSimulator from './pages/ParentSMS/ParentSMSSimulator';

// Admin Pages
import AdminDashboard from './pages/Admin/AdminDashboard';
import UserManagement from './pages/Admin/UserManagement';
import AcademicManagement from './pages/Admin/AcademicManagement';
import TeacherAssignments from './pages/Admin/TeacherAssignments';
import AssessmentsMaster from './pages/Admin/AssessmentsMaster';
import RankingsPage from './pages/Admin/RankingsPage';
import SMSBroadcastPage from './pages/Admin/SMSBroadcastPage';
import ResultSMSPage from './pages/Admin/ResultSMSPage';
import AuditLogsPage from './pages/Admin/AuditLogsPage';
import SettingsPage from './pages/Admin/SettingsPage';

// Directory Pages
import DirectoryDashboard from './pages/Directory/DirectoryDashboard';
import StudentListPage from './pages/Directory/StudentListPage';
import StudentSearchPage from './pages/Directory/StudentSearchPage';
import StudentRegistration from './pages/Directory/StudentRegistration';
import StudentPromotionWizard from './pages/Directory/StudentPromotionWizard';
import StudentIDLookupPage from './pages/Directory/StudentIDLookupPage';
import StudentDossier from './pages/Directory/StudentDossier';
import ParentManagement from './pages/Directory/ParentManagement';

// Teacher Pages
import TeacherDashboard from './pages/Teacher/TeacherDashboard';
import MyClassesPage from './pages/Teacher/MyClassesPage';
import MarkEntryPage from './pages/Teacher/MarkEntryPage';
import MarkAdjustmentPage from './pages/Teacher/MarkAdjustmentPage';
import TeacherRankingsPage from './pages/Teacher/TeacherRankingsPage';
import TeacherSMSPage from './pages/Teacher/TeacherSMSPage';
import TeacherSettingsPage from './pages/Teacher/TeacherSettingsPage';

function AppContent() {
  const { user, loading } = useAuth();
  const [activePortal, setActivePortal] = useState('landing');
  const [loginTarget, setLoginTarget] = useState(null);
  
  // Tab states for each portal
  const [adminTab, setAdminTab] = useState('dashboard');
  const [directoryTab, setDirectoryTab] = useState('dashboard');
  const [teacherTab, setTeacherTab] = useState('dashboard');
  const [dossierStudentId, setDossierStudentId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Check for direct entrance via /dir, /tec, /admin, /reg, /id
  useEffect(() => {
    const path = window.location.pathname.toLowerCase();
    
    // /admin or /admin/login
    if (path === '/admin' || path === '/admin/login') {
      if (user && user.role === 'admin') {
        setActivePortal('admin');
      } else {
        setLoginTarget('admin');
        setActivePortal('login');
      }
    } 
    // /dir or /directory or /records
    else if (path === '/dir' || path === '/directory' || path === '/records') {
      if (user) {
        setActivePortal(user.role === 'teacher' ? 'teacher' : 'directory');
        setDirectoryTab('dashboard');
      } else {
        setLoginTarget('directory');
        setActivePortal('login');
      }
    }
    // /tec or /teacher or /teachers
    else if (path === '/tec' || path === '/teacher' || path === '/teachers') {
      if (user) {
        setActivePortal(user.role === 'teacher' ? 'teacher' : user.role === 'directory' ? 'directory' : 'teacher');
        setTeacherTab('dashboard');
      } else {
        setLoginTarget('teacher');
        setActivePortal('login');
      }
    }
    // /reg or /register (Register student in Directory)
    else if (path === '/reg' || path === '/register') {
      if (user) {
        if (user.role === 'teacher') {
          setActivePortal('teacher');
        } else {
          setActivePortal('directory');
          setDirectoryTab('register');
        }
      } else {
        setLoginTarget('directory');
        setActivePortal('login');
      }
    }
    // /id or /id-manager or /id-lookup
    else if (path === '/id' || path === '/id-manager' || path === '/id-lookup') {
      if (user) {
        if (user.role === 'teacher') {
          setActivePortal('teacher');
        } else {
          setActivePortal('directory');
          setDirectoryTab('id-lookup');
        }
      } else {
        setLoginTarget('id-manager');
        setActivePortal('login');
      }
    }
  }, [user]);

  // Synchronize and strictly confine portal access per user role, and ensure clean Sign Out
  useEffect(() => {
    if (user) {
      if (activePortal === 'login') {
        if (user.role === 'admin') setActivePortal('admin');
        else if (user.role === 'directory') setActivePortal('directory');
        else if (user.role === 'teacher') setActivePortal('teacher');
      } else if (user.role === 'teacher' && activePortal !== 'teacher' && activePortal !== 'landing') {
        // Teacher is strictly restricted to Teacher Workspace only
        setActivePortal('teacher');
      } else if (user.role === 'directory' && activePortal !== 'directory' && activePortal !== 'landing') {
        // Directory staff strictly restricted to Records Office only
        setActivePortal('directory');
      }
    } else {
      // User is signed out: immediately redirect to landing page
      if (activePortal !== 'landing' && activePortal !== 'login') {
        setActivePortal('landing');
        setAdminTab('dashboard');
        setDirectoryTab('dashboard');
        setTeacherTab('dashboard');
        setDossierStudentId(null);
      }
    }
  }, [user, activePortal]);

  const handleSelectPortal = (portal) => {
    setDossierStudentId(null);
    if (portal === 'landing') {
      setActivePortal('landing');
      return;
    }

    if (!user) {
      setLoginTarget(portal);
      setActivePortal('login');
      return;
    }

    // Role-based containment barrier: Each user can strictly and only open their own workspace
    if (user.role === 'teacher') {
      setActivePortal('teacher');
      return;
    }

    if (user.role === 'directory') {
      if (portal === 'id-manager' || portal === 'id-lookup') {
        setActivePortal('directory');
        setDirectoryTab('id-lookup');
      } else {
        setActivePortal('directory');
      }
      return;
    }

    if (user.role === 'admin') {
      if (portal === 'id-manager' || portal === 'id-lookup') {
        setActivePortal('directory');
        setDirectoryTab('id-lookup');
      } else if (portal === 'directory' || portal === 'records') {
        setActivePortal('directory');
      } else {
        setActivePortal('admin');
      }
      return;
    }
  };

  const handleLoginSuccess = (role) => {
    const userRole = role || user?.role;
    if (userRole === 'admin') {
      if (loginTarget === 'id-manager' || loginTarget === 'id-lookup') {
        setActivePortal('directory');
        setDirectoryTab('id-lookup');
      } else {
        setActivePortal('admin');
      }
    } else if (userRole === 'directory') {
      setActivePortal('directory');
      if (loginTarget === 'id-manager' || loginTarget === 'id-lookup') {
        setDirectoryTab('id-lookup');
      }
    } else if (userRole === 'teacher') {
      setActivePortal('teacher');
    } else {
      setActivePortal('landing');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B192C', color: '#FFF' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: '#FFFFFF',
            border: '2px solid #F59E0B',
            overflow: 'hidden',
            margin: '0 auto 1rem auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img src="/logo.png" alt="Lake Side Academy Crest" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#F59E0B', marginBottom: '0.5rem' }}>Lake Side Academy</div>
          <div style={{ color: '#94A3B8', fontSize: '0.85rem' }}>Initializing secure institutional core...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {activePortal === 'landing' ? (
        <div className="landing-viewport-full">
          <LandingPage onSelectPortal={handleSelectPortal} />
        </div>
      ) : activePortal === 'login' ? (
        <div className="landing-viewport" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <LoginPage
            targetPortal={loginTarget}
            onLoginSuccess={handleLoginSuccess}
            onCancel={() => {
              if (window.location.pathname === '/admin' || window.location.pathname === '/admin/login') {
                window.history.pushState({}, '', '/');
              }
              setLoginTarget(null);
              setActivePortal('landing');
            }}
          />
        </div>
      ) : (
        <div className="app-layout" style={{ height: '100vh' }}>
          {/* Contextual Sidebar with full integrated controls */}
          <Sidebar
            portalType={activePortal}
            currentTab={activePortal === 'admin' ? adminTab : activePortal === 'directory' ? directoryTab : teacherTab}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
            onSelectPortal={handleSelectPortal}
            onSelectStudent={(studentId) => setDossierStudentId(studentId)}
            onSelectTab={(tab) => {
              setDossierStudentId(null);
              if (activePortal === 'admin') setAdminTab(tab);
              if (activePortal === 'directory') setDirectoryTab(tab);
              if (activePortal === 'teacher') setTeacherTab(tab);
            }}
          />

          {/* Main Work Area */}
          <main className="main-content">
            {/* Admin Views */}
            {activePortal === 'admin' && (
              <>
                {dossierStudentId ? (
                  <StudentDossier
                    studentId={dossierStudentId}
                    onBack={() => setDossierStudentId(null)}
                  />
                ) : (
                  <>
                    {adminTab === 'dashboard' && (
                      <AdminDashboard 
                        onNavigate={(tab) => {
                          setDossierStudentId(null);
                          if (tab === 'students-list' || tab === 'students') setAdminTab('students-list');
                          else if (tab === 'register-student') {
                            setActivePortal('directory');
                            setDirectoryTab('register');
                          } else {
                            setAdminTab(tab);
                          }
                        }}
                        onSelectStudent={(id) => setDossierStudentId(id)}
                      />
                    )}
                    {(adminTab === 'students-list' || adminTab === 'students') && (
                      <StudentListPage 
                        onSelectStudent={(id) => setDossierStudentId(id)}
                        onRegisterStudent={() => {
                          setActivePortal('directory');
                          setDirectoryTab('register');
                        }}
                      />
                    )}
                    {adminTab === 'search' && (
                      <StudentSearchPage
                        onSelectStudent={(id) => setDossierStudentId(id)}
                      />
                    )}
                    {adminTab === 'id-lookup' && <StudentIDLookupPage />}
                    {adminTab === 'promotion-wizard' && <StudentPromotionWizard />}
                    {adminTab === 'users' && <UserManagement />}
                    {adminTab === 'permissions' && <UserManagement defaultSection="permissions" />}
                    {adminTab === 'academics' && <AcademicManagement />}
                    {adminTab === 'assignments' && <TeacherAssignments />}
                    {adminTab === 'assessments' && <AssessmentsMaster />}
                    {adminTab === 'rankings' && <RankingsPage />}
                    {adminTab === 'sms-broadcast' && <SMSBroadcastPage />}
                    {adminTab === 'result-sms' && <ResultSMSPage />}
                    {adminTab === 'audit' && <AuditLogsPage />}
                    {adminTab === 'settings' && <SettingsPage />}
                  </>
                )}
              </>
            )}

            {/* Directory / Registrar Views */}
            {activePortal === 'directory' && (
              <>
                {dossierStudentId ? (
                  <StudentDossier
                    studentId={dossierStudentId}
                    onBack={() => setDossierStudentId(null)}
                  />
                ) : (
                  <>
                    {directoryTab === 'dashboard' && (
                      <DirectoryDashboard
                        onNavigate={(tab) => {
                          setDossierStudentId(null);
                          setDirectoryTab(tab);
                        }}
                        onSelectStudent={(id) => setDossierStudentId(id)}
                      />
                    )}
                    {(directoryTab === 'students-list' || directoryTab === 'students') && (
                      <StudentListPage
                        onSelectStudent={(id) => setDossierStudentId(id)}
                        onRegisterStudent={() => setDirectoryTab('register')}
                      />
                    )}
                    {directoryTab === 'id-lookup' && (
                      <StudentIDLookupPage />
                    )}
                    {directoryTab === 'search' && (
                      <StudentSearchPage
                        onSelectStudent={(id) => setDossierStudentId(id)}
                      />
                    )}
                    {directoryTab === 'register' && (
                      <StudentRegistration
                        onStudentCreated={(id) => setDossierStudentId(id)}
                        onViewStudent={(id) => setDossierStudentId(id)}
                        onCancel={() => setDirectoryTab('students-list')}
                      />
                    )}
                    {(directoryTab === 'promote' || directoryTab === 'promotion-wizard') && (
                      <StudentPromotionWizard />
                    )}
                    {directoryTab === 'academics' && (
                      <AcademicManagement isDirectoryView={true} />
                    )}
                    {directoryTab === 'parents' && (
                      <ParentManagement onSelectStudent={(id) => setDossierStudentId(id)} />
                    )}
                    {directoryTab === 'rankings' && (
                      <RankingsPage isDirectoryView={true} />
                    )}
                    {directoryTab === 'sms' && (
                      <SMSBroadcastPage isDirectoryView={true} />
                    )}
                    {directoryTab === 'result-sms' && (
                      <ResultSMSPage isDirectoryView={true} />
                    )}
                    {directoryTab === 'announcements' && (
                      <SMSBroadcastPage isDirectoryView={true} defaultBroadcastType="ANNOUNCEMENT" />
                    )}
                  </>
                )}
              </>
            )}

            {/* Teacher Views */}
            {activePortal === 'teacher' && (
              <>
                {teacherTab === 'dashboard' && (
                  <TeacherDashboard onNavigate={(tab) => setTeacherTab(tab)} />
                )}
                {teacherTab === 'classes' && (
                  <MyClassesPage />
                )}
                {teacherTab === 'marks' && (
                  <MarkEntryPage />
                )}
                {teacherTab === 'adjust-marks' && (
                  <MarkAdjustmentPage />
                )}
                {teacherTab === 'rankings' && (
                  <TeacherRankingsPage />
                )}
                {teacherTab === 'sms' && (
                  <TeacherSMSPage />
                )}
                {teacherTab === 'settings' && (
                  <TeacherSettingsPage />
                )}
              </>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}
