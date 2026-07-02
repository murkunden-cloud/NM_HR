'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
}

interface LeaveRecord {
  id: number;
  leave_type: string;
  days: number;
}

export default function EmployeeDashboard() {
  const router = useRouter();
  const [downloading, setDownloading] = useState<string | null>(null);
  
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
    // In a real app we would call a logout API endpoint to clear the HTTP-only cookie
    // For now we clear localStorage/sessionStorage if any, and rely on route changes
    // It's recommended to create a /api/auth/logout endpoint but for simplicity we redirect to login which may override session on next login
    document.cookie = 'pzhr_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
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

  return (
    <div className="dashboard-container">
      {/* Top Header */}
      <header className="dashboard-header">
        <div className="user-info">
          <div className="avatar">{initials}</div>
          <div className="welcome-text">
            <h1>Welcome, {displayName}</h1>
            <p>Employee Portal &bull; {designation}</p>
          </div>
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

            <div className="roster-schedule" style={{ padding: '1rem' }}>
              <div style={{ marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Employee No</span>
                <div style={{ fontWeight: 500, color: '#0f172a' }}>{employee?.empno || user?.username || 'N/A'}</div>
              </div>
              <div style={{ marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Designation</span>
                <div style={{ fontWeight: 500, color: '#0f172a' }}>{designation}</div>
              </div>
              <div style={{ marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Role</span>
                <div style={{ fontWeight: 500, color: '#0f172a' }}>{user?.role || 'N/A'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Status</span>
                <div style={{ fontWeight: 500, color: '#16a34a' }}>Active Employee</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
