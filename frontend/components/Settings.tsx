"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import type { ThemeName } from "@/components/Sidebar";
import type { Settings as SettingsModel } from "@/lib/settings";

interface SettingsProps {
  settings: SettingsModel;
  onChange: (patch: Partial<SettingsModel>) => void;
  onResetTypography: () => void;
  theme: ThemeName;
  onTheme: (t: ThemeName) => void;
  onClose: () => void;
}

type Tab = "general" | "typography" | "themes";

const TABS: { id: Tab; label: string; icon: "sliders" | "type" | "palette" }[] = [
  { id: "general", label: "General", icon: "sliders" },
  { id: "typography", label: "Typography", icon: "type" },
  { id: "themes", label: "Themes", icon: "palette" },
];

const THEMES: { name: ThemeName; label: string }[] = [
  { name: "light", label: "Red Graphite" },
  { name: "dark", label: "Charcoal" },
  { name: "sepia", label: "Solarized" },
  { name: "midnight", label: "Midnight" },
];

export function Settings({
  settings,
  onChange,
  onResetTypography,
  theme,
  onTheme,
  onClose,
}: SettingsProps) {
  const [tab, setTab] = useState<Tab>("general");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="set-overlay" onMouseDown={onClose}>
      <div className="set-window" role="dialog" aria-label="Settings" onMouseDown={(e) => e.stopPropagation()}>
        <div className="set-titlebar">
          <span className="set-title">Settings</span>
          <button className="set-close" onClick={onClose} aria-label="Close settings">
            <Icon name="x" />
          </button>
        </div>

        <div className="set-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`set-tab${tab === t.id ? " on" : ""}`}
              onClick={() => setTab(t.id)}
            >
              <Icon name={t.icon} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="set-body">
          {tab === "general" && <GeneralTab settings={settings} onChange={onChange} />}
          {tab === "typography" && (
            <TypographyTab settings={settings} onChange={onChange} onReset={onResetTypography} />
          )}
          {tab === "themes" && <ThemesTab theme={theme} onTheme={onTheme} />}
        </div>
      </div>
    </div>
  );
}

/* ---------------- General ---------------- */

function GeneralTab({
  settings,
  onChange,
}: {
  settings: SettingsModel;
  onChange: (patch: Partial<SettingsModel>) => void;
}) {
  return (
    <>
      <Field label="Editor:">
        <div className="set-checks">
          <Check
            label="Hide Markdown"
            checked={settings.hideMarkdown}
            onChange={(v) => onChange({ hideMarkdown: v })}
          />
          <Check
            label="Auto-fill titles when pasting web links"
            checked={settings.autofillTitles}
            onChange={(v) => onChange({ autofillTitles: v })}
          />
          <Check
            label="Autocomplete tags, WikiLinks, emoji"
            checked={settings.autocomplete}
            onChange={(v) => onChange({ autocomplete: v })}
          />
          <Check
            label="Automatically sort todos upon completion"
            checked={settings.autosortTodos}
            onChange={(v) => onChange({ autosortTodos: v })}
          />
          <Check
            label="Keep tags during export"
            checked={settings.keepTags}
            onChange={(v) => onChange({ keepTags: v })}
          />
        </div>
      </Field>

      <Field label="Create new notes with:">
        <select
          className="set-select"
          value={settings.newNoteWith}
          onChange={(e) => onChange({ newNoteWith: e.target.value as SettingsModel["newNoteWith"] })}
        >
          <option value="heading">Heading 1</option>
          <option value="text">Text</option>
        </select>
      </Field>

      <Field label="Add tags at:">
        <select
          className="set-select"
          value={settings.addTagsAt}
          onChange={(e) => onChange({ addTagsAt: e.target.value as SettingsModel["addTagsAt"] })}
        >
          <option value="bottom">Bottom of note</option>
          <option value="top">Top of note</option>
        </select>
      </Field>

      <div className="set-sep" />

      <Field label="Lock after idle for:">
        <span className="set-inline">
          <select className="set-select" disabled value="5">
            <option value="5">5 minutes</option>
          </select>
          <span className="set-pro">PRO</span>
        </span>
      </Field>
      <Field label="">
        <Check label="Lock at launch and when inactive" checked={false} disabled onChange={() => {}} />
      </Field>

      <div className="set-sep" />

      <Field label="Open main window:">
        <button className="set-shortcut" disabled>
          Record Shortcut
        </button>
      </Field>
      <Field label="Create a new note:">
        <button className="set-shortcut" disabled>
          Record Shortcut
        </button>
      </Field>
    </>
  );
}

/* ---------------- Typography ---------------- */

function TypographyTab({
  settings,
  onChange,
  onReset,
}: {
  settings: SettingsModel;
  onChange: (patch: Partial<SettingsModel>) => void;
  onReset: () => void;
}) {
  return (
    <>
      <FontRow label="Text Font:" name={settings.textFont} weight={400} />
      <FontRow label="Headings Font:" name={settings.headingsFont} weight={700} />
      <FontRow label="Code Font:" name={settings.codeFont} mono />

      <div className="set-sep" />

      <Slider
        label="Font Size:"
        value={settings.fontSize}
        min={13}
        max={24}
        step={0.5}
        format={(v) => `${v} px`}
        onChange={(v) => onChange({ fontSize: v })}
      />
      <Slider
        label="Line Height:"
        value={settings.lineHeight}
        min={1.2}
        max={2.4}
        step={0.05}
        format={(v) => `${v.toFixed(2)} em`}
        onChange={(v) => onChange({ lineHeight: v })}
      />
      <Slider
        label="Line Width:"
        value={settings.lineWidth}
        min={560}
        max={1000}
        step={10}
        format={(v) => `${v} px`}
        onChange={(v) => onChange({ lineWidth: v })}
      />
      <Slider
        label="Paragraph Spacing:"
        value={settings.paragraphSpacing}
        min={0}
        max={28}
        step={1}
        format={(v) => `${v} px`}
        onChange={(v) => onChange({ paragraphSpacing: v })}
      />
      <Slider
        label="Paragraph Indent:"
        value={settings.paragraphIndent}
        min={0}
        max={3}
        step={0.25}
        format={(v) => `${v.toFixed(2)} em`}
        onChange={(v) => onChange({ paragraphIndent: v })}
      />

      <div className="set-actions">
        <button className="set-btn" onClick={onReset}>
          Restore Editor Defaults
        </button>
      </div>
    </>
  );
}

/* ---------------- Themes ---------------- */

function ThemesTab({ theme, onTheme }: { theme: ThemeName; onTheme: (t: ThemeName) => void }) {
  return (
    <div className="set-themes">
      {THEMES.map((t) => (
        <button
          key={t.name}
          className={`set-theme${theme === t.name ? " on" : ""}`}
          onClick={() => onTheme(t.name)}
        >
          <span className={`set-swatch tdot-${t.name}`} />
          <span>{t.label}</span>
          {theme === t.name && <Icon name="todo" className="set-themecheck" />}
        </button>
      ))}
    </div>
  );
}

/* ---------------- shared bits ---------------- */

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="set-row">
      <div className="set-label">{label}</div>
      <div className="set-control">{children}</div>
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`set-checkrow${disabled ? " dim" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function FontRow({
  label,
  name,
  weight,
  mono,
}: {
  label: string;
  name: string;
  weight?: number;
  mono?: boolean;
}) {
  return (
    <div className="set-row">
      <div className="set-label">{label}</div>
      <div className="set-control set-fontrow">
        <span className="set-aa" style={{ fontWeight: weight, fontFamily: mono ? "ui-monospace, monospace" : undefined }}>
          Aa
        </span>
        <span className="set-fontname" style={{ fontWeight: mono ? 500 : weight }}>
          {name}
        </span>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="set-row">
      <div className="set-label">{label}</div>
      <div className="set-control set-sliderrow">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="set-value">{format(value)}</span>
      </div>
    </div>
  );
}
