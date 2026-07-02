import { createContext, useContext } from 'react';

const AuthContext = createContext({
  user: { role: 'admin' },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  return (
    <AuthContext.Provider value={{ user: { role: 'admin' } }}>
      {children}
    </AuthContext.Provider>
  );
}
