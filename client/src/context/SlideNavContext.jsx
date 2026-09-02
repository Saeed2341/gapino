"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";

const SlideNavContext = createContext({ exiting: false, startExit: () => {} });

export function SlideNavProvider({ children }) {
  const [exiting, setExiting] = useState(false);
  const pathname = usePathname();

  // وقتی مسیر عوض شد، وضعیت خروج خودکار ریست شود
  useEffect(() => {
    if (!pathname?.startsWith("/chat/")) setExiting(false);
  }, [pathname]);

  const startExit = useCallback(() => setExiting(true), []);

  return (
    <SlideNavContext.Provider value={{ exiting, startExit }}>
      {children}
    </SlideNavContext.Provider>
  );
}

export const useSlideNav = () => useContext(SlideNavContext);
