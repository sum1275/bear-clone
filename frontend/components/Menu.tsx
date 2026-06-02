"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Icon, type IconName } from "@/components/icons";

// Closes the whole dropdown — provided by <Menu>, consumed by <MenuItem> so a
// selection dismisses the menu (and any open submenu unmounts with it).
const CloseCtx = createContext<() => void>(() => {});

interface MenuProps {
  trigger: ReactNode;
  label?: string; // aria-label for the trigger button
  triggerClass?: string; // extra class on the trigger (e.g. "libpick")
  align?: "left" | "right"; // which edge the panel hangs from
  width?: number; // panel min-width
  children: ReactNode;
}

/** A click-to-open dropdown that closes on outside-click, Escape, or selection. */
export function Menu({ trigger, label, triggerClass, align = "right", width, children }: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="menuwrap" ref={ref}>
      <button
        type="button"
        className={`menutrigger${triggerClass ? ` ${triggerClass}` : ""}`}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {trigger}
      </button>
      {open && (
        <CloseCtx.Provider value={() => setOpen(false)}>
          <div
            className={`menu${align === "left" ? " menu-l" : ""}`}
            role="menu"
            style={width ? { minWidth: width } : undefined}
          >
            {children}
          </div>
        </CloseCtx.Provider>
      )}
    </div>
  );
}

export function MenuHeader({ children }: { children: ReactNode }) {
  return <div className="mhead">{children}</div>;
}

export function MenuSep() {
  return <div className="sep" />;
}

interface MenuItemProps {
  icon?: IconName;
  children: ReactNode;
  shortcut?: string; // e.g. "⌥⌘1"
  onSelect?: () => void;
  danger?: boolean;
  disabled?: boolean;
  current?: boolean; // bold "you are here" (library rows)
  checked?: boolean; // trailing check (option pickers)
}

export function MenuItem({
  icon,
  children,
  shortcut,
  onSelect,
  danger,
  disabled,
  current,
  checked,
}: MenuItemProps) {
  const close = useContext(CloseCtx);
  return (
    <button
      type="button"
      role="menuitem"
      className={`mitem${danger ? " danger" : ""}${current ? " cur" : ""}`}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onSelect?.();
        close();
      }}
    >
      {icon ? <Icon name={icon} /> : <span className="mi-gap" />}
      <span className="mlabel">{children}</span>
      {checked && <Icon name="todo" className="mcheck" />}
      {shortcut && <span className="mkbd">{shortcut}</span>}
    </button>
  );
}

/** An item that expands an inline, indented group of items below it. */
export function SubMenu({
  icon,
  label,
  children,
}: {
  icon?: IconName;
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`msub${open ? " open" : ""}`}>
      <button type="button" className="mitem" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {icon ? <Icon name={icon} /> : <span className="mi-gap" />}
        <span className="mlabel">{label}</span>
        <Icon name="chevR" className="mchev" />
      </button>
      {open && <div className="msubpanel">{children}</div>}
    </div>
  );
}
