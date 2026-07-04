'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './login.css';

export default function LoginPage() {
  const router = useRouter();
  const [portal, setPortal] = useState<'employee' | 'admin'>('employee');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Validation and UI states
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const validateForm = () => {
    let isValid = true;
    setUsernameError('');
    setPasswordError('');

    if (!username) {
      setUsernameError('Username is required');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 4) {
      setPasswordError('Password must be at least 4 characters');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setFormStatus('loading');
    setStatusMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, portal })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFormStatus('error');
        setStatusMessage(data.error || 'Invalid credentials. Please double check and try again.');
      } else {
        setFormStatus('success');
        setStatusMessage(`Successfully signed in as ${portal === 'admin' ? 'Administrator' : 'Employee'}! Redirecting...`);
        localStorage.setItem('pz_token', data.token);
        
        setTimeout(() => {
          if (data.user?.role?.toUpperCase() === 'ADMIN' || portal === 'admin') {
            router.push('/admin');
          } else {
            router.push('/dashboard');
          }
        }, 1200);
      }
    } catch (err) {
      setFormStatus('error');
      setStatusMessage('An error occurred during sign-in. Please try again.');
    }
  };

  return (
    <div className="login-container">
      {/* Background Ambient Blobs */}
      <div className="ambient-blob blob-1"></div>
      <div className="ambient-blob blob-2"></div>

      {/* Left Panel: Hero Branding & Stats (Hidden on smaller screens via CSS) */}
      <div className="login-hero">
        <div className="hero-header">
          <div className="logo-icon">P</div>
          <span className="logo-text">PZHR</span>
        </div>

        <div className="hero-body">
          <h1 className="hero-title">
            The future of HR <br />& Payroll is here.
          </h1>
          <p className="hero-description">
            Streamline your workforce, automate accurate payroll calculation, and gain powerful employee insights within a single unified workspace.
          </p>

          {/* Glassmorphic Stats Display */}
          <div className="hero-stats-card">
            <div className="stat-item">
              <span className="stat-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Total Managed Workforce
              </span>
              <span className="stat-value">1,482</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <line x1="12" y1="4" x2="12" y2="20" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                </svg>
                Current Pay Cycle
              </span>
              <span className="stat-value">Active</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                System Compliance
              </span>
              <span className="stat-indicator">99.8%</span>
            </div>
          </div>
        </div>

        <div className="hero-footer">
          &copy; {new Date().getFullYear()} PZHR Inc. All rights reserved.
        </div>
      </div>

      {/* Right Panel: Form Card */}
      <div className="login-form-side">
        <div className="form-card">
          <div className="form-header">
            <h2 className="form-title">Welcome back</h2>
            <p className="form-subtitle">Enter your credentials to access your dashboard.</p>
          </div>

          {/* Employee/Admin Segmented Control */}
          <div className="portal-toggle">
            <div className={`toggle-slider ${portal}`} />
            <button
              type="button"
              className={`toggle-button ${portal === 'employee' ? 'active' : ''}`}
              onClick={() => setPortal('employee')}
            >
              Employee Portal
            </button>
            <button
              type="button"
              className={`toggle-button ${portal === 'admin' ? 'active' : ''}`}
              onClick={() => setPortal('admin')}
            >
              Admin Portal
            </button>
          </div>

          {/* Form Banner Alerts */}
          {formStatus === 'success' && (
            <div className="alert-banner alert-success">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>{statusMessage}</span>
            </div>
          )}

          {formStatus === 'error' && (
            <div className="alert-banner alert-error">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} noValidate>
            {/* Username Input */}
            <div className="input-group">
              <input
                id="username"
                type="text"
                className={`input-field ${usernameError ? 'error' : ''}`}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (usernameError) setUsernameError('');
                }}
                placeholder=" "
                disabled={formStatus === 'loading'}
              />
              <label htmlFor="username" className="input-label">Username</label>
              {usernameError && (
                <span className="error-message">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {usernameError}
                </span>
              )}
            </div>

            {/* Password Input */}
            <div className="input-group">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`input-field ${passwordError ? 'error' : ''}`}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder=" "
                disabled={formStatus === 'loading'}
              />
              <label htmlFor="password" className="input-label">Password</label>
              
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>

              {passwordError && (
                <span className="error-message">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {passwordError}
                </span>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="form-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={formStatus === 'loading'}
                />
                <div className="checkbox-custom" />
                <span>Remember me</span>
              </label>
              <a href="#" className="forgot-password" onClick={(e) => e.preventDefault()}>
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="submit-btn"
              disabled={formStatus === 'loading' || formStatus === 'success'}
            >
              {formStatus === 'loading' ? (
                <>
                  <div className="spinner" />
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Form Footer */}
          <div className="form-footer">
            Don&apos;t have an account?{' '}
            <a href="#" className="form-footer-link" onClick={(e) => e.preventDefault()}>
              Contact HR
            </a>
            <br />
            <Link href="/" className="back-to-home">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
