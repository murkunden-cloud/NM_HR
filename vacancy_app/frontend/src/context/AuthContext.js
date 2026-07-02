import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/auth/me");
        setUser(data);
      } catch {
        setUser(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (cpfno, password) => {
    const { data } = await api.post("/auth/login", { cpfno, password });
    if (data.token) localStorage.setItem("pz_token", data.token);
    setUser(data);
    return data;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("pz_token");
    setUser(false);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthCtx.Provider>
  );
}
