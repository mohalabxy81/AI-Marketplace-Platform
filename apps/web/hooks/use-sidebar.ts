"use client";

import { useEffect, useState } from "react";
import { useSidebarStore } from "@/store/sidebar.store";

const MOBILE_BREAKPOINT = 768;

export function useSidebar() {
  const store = useSidebarStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Close mobile drawer on route change (called from layouts)
  function closeMobile() {
    store.setOpen(false);
  }

  return {
    ...store,
    isMobile,
    closeMobile,
  };
}
