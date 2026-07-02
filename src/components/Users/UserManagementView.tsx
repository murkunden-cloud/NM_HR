'use client';

import React, { useState, useEffect } from 'react';

interface User {
  username: string;
  full_name: string | null;
  role: string;
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
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditMode(true);
    setCurrentUsername(u.username);
    setUsername(u.username);
    setFullName(u.full_name || '');
    setPassword(''); // don't load hash, just leave blank unless they want to reset
    setRole(u.role);
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
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>User Management</h2>
        <button 
          onClick={handleOpenNew}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}
        >
          + Add New User
        </button>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

      <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Username</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Full Name</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Role</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '600', color: '#475569' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center' }}>No users found</td></tr>
            ) : (
              users.map(u => (
                <tr key={u.username} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>{u.username}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{u.full_name || '-'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '9999px', 
                      fontSize: '0.75rem', 
                      fontWeight: '600',
                      backgroundColor: u.role === 'ADMIN' ? '#dbeafe' : '#f1f5f9',
                      color: u.role === 'ADMIN' ? '#1e40af' : '#475569'
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <button onClick={() => handleOpenEdit(u)} style={{ marginRight: '0.5rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => handleDelete(u.username)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '0.5rem', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              {editMode ? 'Edit User' : 'Add New User'}
            </h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                disabled={editMode}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Full Name</label>
              <input 
                type="text" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1' }}
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
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Role</label>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1' }}
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ padding: '0.5rem 1rem', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}
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
