"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // تا چک شدن توکن true می‌مونه

  // در لود اول: اگر توکن داریم، اطلاعات کاربر رو بگیر
  useEffect(() => {
    const token = localStorage.getItem("gapino-token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem("gapino-token"))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(({ token, user: newUser }) => {
    localStorage.setItem("gapino-token", token);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("gapino-token");
    setUser(null);
  }, []);

  const updateUser = useCallback((updated) => {
    setUser((prev) => ({ ...prev, ...updated }));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
