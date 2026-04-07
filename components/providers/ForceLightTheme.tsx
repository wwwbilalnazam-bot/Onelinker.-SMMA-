"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

/**
 * Forces light theme while mounted, restores previous theme on unmount.
 * Drop this into any layout that should never be dark.
 */
export function ForceLightTheme() {
  const { theme, setTheme } = useTheme();
  const previousTheme = useRef<string | undefined>();

  useEffect(() => {
    if (theme !== "light") {
      previousTheme.current = theme;
      setTheme("light");
    }
    return () => {
      if (previousTheme.current) {
        setTheme(previousTheme.current);
      }
    };
    // Only run on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
