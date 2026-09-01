"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext({
  socket: null,
  connected: false,
  onlineIds: new Set(),
});

export default function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [onlineIds, setOnlineIds] = useState(new Set());

  useEffect(() => {
    if (!user) {
      setSocket((s) => {
        s?.disconnect();
        return null;
      });
      setConnected(false);
      setOnlineIds(new Set());
      return;
    }

    const token = localStorage.getItem("gapino-token");
    if (!token) return;

    const s = io(process.env.NEXT_PUBLIC_API_URL, {
      auth: { token },
      reconnectionAttempts: 5,
    });
    setSocket(s);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onPresence = ({ userId, online }) => {
      setOnlineIds((prev) => {
        const next = new Set(prev);
        if (online) next.add(userId);
        else next.delete(userId);
        return next;
      });
    };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("presence", onPresence);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("presence", onPresence);
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <SocketContext.Provider value={{ socket, connected, onlineIds }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
