'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import EmployeePortal from '../login/EmployeePortal';
import './dashboard.css';

interface UserInfo {
  username: string;
  full_name: string;
  role: string;
}

interface EmployeeInfo {
  empno: string;
  empnm: string | null;
  desigz: string | null;
  basic: number;
  payscl: string | null;
  compjoindt: string | null;
  brthdt: string | null;
  mobileno: string | null;
  email: string | null;
  panno: string | null;
  locnm: string | null;
}

interface LeaveRecord {
  id: number;
  leave_type: string;
  days: number;
}

export default function EmployeeDashboard() {
  const router = useRouter();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'search'>('profile');
  
  const [user, setUser] = useState<UserInfo | null>(null);
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setEmployee(data.employee);
          
          if (data.leaves) {
            // Very simplistic calculation for leaves, just summing them up for display
            // In a real app this would have max accrual and deductions
            const usedLeaves = data.leaves.reduce((acc: number, leave: LeaveRecord) => acc + leave.days, 0);
            const standardLeaveTotal = 30; // Mock total allowance
            setLeaveBalance(Math.max(0, standardLeaveTotal - usedLeaves));
          }
        } else {
          // If not authorized, go to login
          router.push('/login');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchMe();
  }, [router]);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    localStorage.removeItem('pz_token');
    router.push('/login');
  };

  const handleDownload = (id: string) => {
    setDownloading(id);
    setTimeout(() => {
      setDownloading(null);
      alert(`Download complete for Payslip: ${id}`);
    }, 1500);
  };

  if (loading) {
    return (
      <div className="dashboard-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  // Calculate some dummy payslip values based on employee basic pay (or fallback)
  const basicPay = employee?.basic || 3000;
  const mockPayslips = [
    {
      id: 'PS-2026-06',
      date: 'June 30, 2026',
      period: 'June 01 - June 30',
      amount: (basicPay * 1.5).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    },
    {
      id: 'PS-2026-05',
      date: 'May 31, 2026',
      period: 'May 01 - May 31',
      amount: (basicPay * 1.5).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    },
    {
      id: 'PS-2026-04',
      date: 'April 30, 2026',
      period: 'April 01 - April 30',
      amount: (basicPay * 1.48).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    }
  ];

  const initials = user?.full_name ? user.full_name.substring(0, 2).toUpperCase() : user?.username.substring(0, 2).toUpperCase() || 'EMP';
  const displayName = employee?.empnm || user?.full_name || user?.username || 'Employee';
  const designation = employee?.desigz || user?.role || 'Staff';

  const isUnlinkedAdmin = !employee && user?.role === 'ADMIN';

  return (
    <div className="dashboard-container">
      {/* Top Header */}
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="user-info">
          <div className="avatar">{initials}</div>
          <div className="welcome-text">
            <h1>Welcome, {displayName}</h1>
            <p>Employee Portal &bull; {designation}</p>
          </div>
        </div>
        
        <div style={{ flex: 1, maxWidth: '400px', margin: '0 20px' }}>
          <form onSubmit={(e) => { e.preventDefault(); setActiveTab('search'); }} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Search CPF No / Name..."
              style={{ flex: 1, padding: '10px 15px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
              onClick={() => setActiveTab('search')}
            />
            <button type="submit" style={{ padding: '10px 15px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              Search
            </button>
          </form>
        </div>

        <button onClick={handleSignOut} className="signout-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </header>

      <div className="dashboard-tabs" style={{ display: 'flex', gap: '20px', padding: '0 40px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
        <button 
          onClick={() => setActiveTab('profile')}
          style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'profile' ? '3px solid #2563eb' : '3px solid transparent', color: activeTab === 'profile' ? '#1e293b' : '#64748b', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
        >
          My Profile
        </button>
        <button 
          onClick={() => setActiveTab('search')}
          style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'search' ? '3px solid #2563eb' : '3px solid transparent', color: activeTab === 'search' ? '#1e293b' : '#64748b', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
        >
          Organization Search
        </button>
      </div>

      {activeTab === 'profile' ? (
        <>
          {/* Unlinked Profile Warning */}
          {isUnlinkedAdmin && (
            <div style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid #ffeeba', margin: '0 40px' }}>
              <strong>Notice:</strong> You are logged in as an Admin user, but there is no matching Employee record for your username (<strong>{user?.username}</strong>). 
              The dashboard below is showing fallback sample data. To see a real dashboard, please log in with a normal Employee account (e.g., using their Employee Number).
            </div>
          )}

      {/* Stats Grid */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <line x1="12" y1="4" x2="12" y2="20" />
              <line x1="2" y1="12" x2="22" y2="12" />
            </svg>
            Next Pay Date
          </div>
          <div className="stat-value">July 15, 2026</div>
          <div className="stat-sub">Cycle: Monthly (Active)</div>
        </div>

        <div className="stat-card purple">
          <div className="stat-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Leave Balance
          </div>
          <div className="stat-value">{leaveBalance} Days</div>
          <div className="stat-sub positive">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="18 15 12 9 6 15" />
            </svg>
            Available based on records
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Basic Pay
          </div>
          <div className="stat-value">{basicPay}</div>
          <div className="stat-sub">Scale: {employee?.payscl || 'Standard'}</div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="content-grid">
        {/* Left Side: Payslips & History */}
        <main className="main-section">
          <div className="dashboard-card">
            <div className="card-title-bar">
              <h2>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                Recent Payslips
              </h2>
            </div>

            <div className="payslip-list">
              {mockPayslips.map((ps) => (
                <div key={ps.id} className="payslip-item">
                  <div className="payslip-info">
                    <span className="payslip-date">{ps.date}</span>
                    <span className="payslip-period">Period: {ps.period}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <span className="payslip-amount">{ps.amount}</span>
                    <button 
                      onClick={() => handleDownload(ps.id)} 
                      className="download-btn"
                      disabled={downloading !== null}
                    >
                      {downloading === ps.id ? (
                        '...'
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Right Side: Biodata Summary */}
        <aside className="sidebar-section">
          <div className="dashboard-card">
            <div className="card-title-bar">
              <h2>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Biodata Profile
              </h2>
            </div>

            <div className="biodata-list">
              <div className="biodata-item">
                <span className="biodata-label">Employee No</span>
                <span className="biodata-value">{employee?.empno || user?.username || 'N/A'}</span>
              </div>
              <div className="biodata-item">
                <span className="biodata-label">Designation</span>
                <span className="biodata-value">{designation}</span>
              </div>
              <div className="biodata-item">
                <span className="biodata-label">Location</span>
                <span className="biodata-value">{employee?.locnm || 'HQ'}</span>
              </div>
              <div className="biodata-item">
                <span className="biodata-label">Date of Joining</span>
                <span className="biodata-value">{employee?.compjoindt || 'N/A'}</span>
              </div>
              <div className="biodata-item">
                <span className="biodata-label">Date of Birth</span>
                <span className="biodata-value">{employee?.brthdt || 'N/A'}</span>
              </div>
              <div className="biodata-item">
                <span className="biodata-label">Contact</span>
                <span className="biodata-value">
                  {employee?.mobileno || 'N/A'}<br/>
                  <span style={{fontSize: '0.8rem', color: '#94a3b8'}}>{employee?.email || ''}</span>
                </span>
              </div>
              <div className="biodata-item" style={{ borderLeftColor: '#10b981' }}>
                <span className="biodata-label">Status</span>
                <span className="status-badge">Active Employee</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
        </>
      ) : (
        <div style={{ padding: '0 40px', height: 'calc(100vh - 180px)', marginBottom: '40px' }}>
          <div style={{ background: '#0f172a', borderRadius: '16px', height: '100%', overflow: 'hidden', padding: '20px', position: 'relative' }}>
            <EmployeePortal />
          </div>
        </div>
      )}
    </div>
  );
}
