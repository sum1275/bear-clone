"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from "@/lib/settings";

// Settings state with localStorage persistence. Starts from defaults (so SSR
// and first paint are stable) and hydrates from storage on mount, mirroring how
// the theme is handled in NotesApp.
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  // Reset just the typography metrics ("Restore Editor Defaults").
  const resetTypography = useCallback(() => {
    setSettings((prev) => {
      const next: Settings = {
        ...prev,
        fontSize: DEFAULT_SETTINGS.fontSize,
        lineHeight: DEFAULT_SETTINGS.lineHeight,
        lineWidth: DEFAULT_SETTINGS.lineWidth,
        paragraphSpacing: DEFAULT_SETTINGS.paragraphSpacing,
        paragraphIndent: DEFAULT_SETTINGS.paragraphIndent,
      };
      saveSettings(next);
      return next;
    });
  }, []);

  return { settings, update, resetTypography };
}
