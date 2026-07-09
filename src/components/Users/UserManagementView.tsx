'use client';

import React, { useState, useEffect } from 'react';

interface User {
  username: string;
  full_name: string | null;
  role: string;
  zonenm?: string | null;
  circl?: string | null;
  divnm?: string | null;
  subdnm?: string | null;
}

export default function UserManagementView() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');
  
  // Form fields
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  
  const [zonenm, setZonenm] = useState('');
  const [circl, setCircl] = useState('');
  const [divnm, setDivnm] = useState('');
  const [subdnm, setSubdnm] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);

  const handleFetchEmployee = async () => {
    if (!username) return;
    try {
      const res = await fetch(`/api/employees?empno=${username}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.employee) {
          const emp = data.employee;
          setFullName(emp.empnm || '');
          setZonenm(emp.zonenm || '');
          setCircl(emp.circl || '');
          setDivnm(emp.divnm || '');
          setSubdnm(emp.subdnm || '');
          setIsGlobal(!(emp.zonenm || emp.circl || emp.divnm || emp.subdnm));
        } else {
          alert('Employee not found in Master Employees.');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Error fetching employee');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        setError('Failed to fetch users');
      }
    } catch (err) {
      setError('Error fetching users');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setEditMode(false);
    setUsername('');
    setFullName('');
    setPassword('');
    setRole('EMPLOYEE');
    setZonenm('');
    setCircl('');
    setDivnm('');
    setSubdnm('');
    setIsGlobal(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditMode(true);
    setCurrentUsername(u.username);
    setUsername(u.username);
    setFullName(u.full_name || '');
    setPassword(''); // don't load hash, just leave blank unless they want to reset
    setRole(u.role);
    setZonenm(u.zonenm || '');
    setCircl(u.circl || '');
    setDivnm(u.divnm || '');
    setSubdnm(u.subdnm || '');
    setIsGlobal(!(u.zonenm || u.circl || u.divnm || u.subdnm));
    setIsModalOpen(true);
  };

  const handleDelete = async (username: string) => {
    if (!window.confirm(`Are you sure you want to delete user ${username}?`)) return;
    try {
      const res = await fetch(`/api/users/${username}`, { method: 'DELETE' });
      if (res.ok) {
        fetchUsers();
      } else {
        alert('Failed to delete user');
      }
    } catch (err) {
      alert('Error deleting user');
    }
  };

  const handleSave = async () => {
    try {
      if (editMode) {
        const res = await fetch(`/api/users/${currentUsername}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: fullName,
            role,
            zonenm, circl, divnm, subdnm,
            ...(password ? { password } : {})
          })
        });
        if (res.ok) {
          setIsModalOpen(false);
          fetchUsers();
        } else {
          alert('Failed to update user');
        }
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            full_name: fullName,
            role,
            zonenm, circl, divnm, subdnm,
            password
          })
        });
        if (res.ok) {
          setIsModalOpen(false);
          fetchUsers();
        } else {
          alert('Failed to create user');
        }
      }
    } catch (err) {
      alert('Error saving user');
    }
  };

  return (
    <div className="users-management-container" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffffff' }}>User Management</h2>
        <button 
          onClick={handleOpenNew}
          style={{ padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: '600' }}
        >
          + Add New User
        </button>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

      <div style={{ backgroundColor: 'rgba(30,41,59,0.6)', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', overflow: 'hidden', border: '1px solid rgba(148,163,184,0.15)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: 'rgba(56,189,248,0.15)', borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
            <tr>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '700', color: '#ffffff' }}>Username</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '700', color: '#ffffff' }}>Full Name</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '700', color: '#ffffff' }}>Role</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '700', color: '#ffffff' }}>Scope</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '700', color: '#ffffff' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center' }}>No users found</td></tr>
            ) : (
              users.map(u => (
                <tr key={u.username} style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                  <td style={{ padding: '0.75rem 1rem', color: '#f1f5f9' }}>{u.username}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#f1f5f9' }}>{u.full_name || '-'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '9999px', 
                      fontSize: '0.75rem', 
                      fontWeight: '600',
                      backgroundColor: u.role === 'ADMIN' ? 'rgba(59,130,246,0.2)' : 'rgba(148,163,184,0.2)',
                      color: u.role === 'ADMIN' ? '#60a5fa' : '#cbd5e1'
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1', fontSize: '0.85rem' }}>
                    {[u.zonenm, u.circl, u.divnm, u.subdnm].filter(Boolean).join(' / ') || 'Global'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <button onClick={() => handleOpenEdit(u)} style={{ marginRight: '0.5rem', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>Edit</button>
                    <button onClick={() => handleDelete(u.username)} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'rgba(30,41,59,0.8)', padding: '2rem', borderRadius: '0.5rem', width: '400px', maxWidth: '90%', border: '1px solid rgba(148,163,184,0.15)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#ffffff' }}>
              {editMode ? 'Edit User' : 'Add New User'}
            </h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Username (CPF No)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  disabled={editMode}
                  style={{ flex: 1, padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1', color: editMode ? '#64748b' : '#000000' }}
                />
                {!editMode && (
                  <button type="button" onClick={handleFetchEmployee} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', borderRadius: '0.25rem', border: 'none', cursor: 'pointer' }}>
                    Fetch
                  </button>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Full Name</label>
              <input 
                type="text" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1', color: '#000000' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
                {editMode ? 'New Password (leave blank to keep current)' : 'Password'}
              </label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1', color: '#000000' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(15,23,42,0.4)', borderRadius: '0.375rem', border: '1px solid rgba(148,163,184,0.1)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer', marginBottom: isGlobal ? 0 : '1rem' }}>
                <input 
                  type="checkbox" 
                  checked={isGlobal}
                  onChange={(e) => {
                    setIsGlobal(e.target.checked);
                    if (e.target.checked) {
                      setZonenm(''); setCircl(''); setDivnm(''); setSubdnm('');
                    }
                  }}
                  style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                />
                <span style={{ color: isGlobal ? '#10b981' : '#ffffff' }}>Global Scope (Access to all locations)</span>
              </label>

              {!isGlobal && (
                <>
                  <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 500 }}>Zone</label>
                      <input type="text" value={zonenm} onChange={e => setZonenm(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1', color: '#000000' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 500 }}>Circle</label>
                      <input type="text" value={circl} onChange={e => setCircl(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1', color: '#000000' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 500 }}>Division</label>
                      <input type="text" value={divnm} onChange={e => setDivnm(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1', color: '#000000' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 500 }}>Sub-Division</label>
                      <input type="text" value={subdnm} onChange={e => setSubdnm(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1', color: '#000000' }} />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Role</label>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1', color: '#000000' }}
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ padding: '0.5rem 1rem', backgroundColor: 'rgba(148,163,184,0.2)', color: '#cbd5e1', borderRadius: '0.375rem', border: '1px solid rgba(148,163,184,0.3)', cursor: 'pointer', fontWeight: '600' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                style={{ padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: '600' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
