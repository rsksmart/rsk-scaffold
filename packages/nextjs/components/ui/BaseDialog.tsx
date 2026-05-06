import React, { useCallback, useEffect, useRef, useState } from "react";
import CloseIcon from "../assets/CloseIcon";
import { createPortal } from "react-dom";
import { cn } from "~~/utils/classNames";

interface Props {
  children: React.ReactNode;
  closeDialog: () => void;
  className?: string;
  open: boolean;
  disableClose?: boolean;
  /** Optional accessible name for the dialog (read by screen readers). */
  ariaLabel?: string;
  /** Optional id of an element labelling the dialog. Takes precedence over ariaLabel. */
  ariaLabelledBy?: string;
}

// CSS selector matching every focusable element inside the dialog. Used
// by the focus trap to find candidates for Tab cycling.
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const BaseDialog = React.forwardRef<HTMLDivElement, Props>(
  ({ children, closeDialog, className, open, disableClose, ariaLabel, ariaLabelledBy }, ref) => {
    const [mounted, setMounted] = useState(false);
    // Internal ref always available for focus management; we still forward
    // the user-supplied ref (if any) below.
    const panelRef = useRef<HTMLDivElement | null>(null);
    // Element that had focus before the dialog opened. We restore focus to
    // it on close so keyboard users return to where they were.
    const previouslyFocusedRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
      setMounted(true);
    }, []);

    // Compose the forwarded ref with our internal panelRef so callers and
    // the focus trap can both read the panel element.
    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        panelRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      },
      [ref],
    );

    // On open: remember the active element, move focus into the dialog.
    // On close: restore focus.
    useEffect(() => {
      if (!open) return;
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

      // Defer focus to the next frame so the panel is mounted in the DOM.
      const id = window.requestAnimationFrame(() => {
        const panel = panelRef.current;
        if (!panel) return;
        const firstFocusable = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        (firstFocusable ?? panel).focus();
      });

      return () => {
        window.cancelAnimationFrame(id);
        // Restore focus if the previously-focused element is still in the DOM.
        const prev = previouslyFocusedRef.current;
        if (prev && document.contains(prev)) {
          prev.focus();
        }
      };
    }, [open]);

    // Keyboard handler: Escape closes (WCAG 2.1.2), Tab is trapped within
    // the panel by computing the first/last focusable elements and wrapping.
    const onKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Escape") {
          if (!disableClose) {
            e.stopPropagation();
            closeDialog();
          }
          return;
        }
        if (e.key !== "Tab") return;

        const panel = panelRef.current;
        if (!panel) return;
        const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
          el => !el.hasAttribute("disabled") && el.tabIndex !== -1,
        );
        if (focusables.length === 0) {
          // Nothing to focus; keep focus on the panel itself.
          e.preventDefault();
          panel.focus();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (e.shiftKey) {
          if (active === first || !panel.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      },
      [closeDialog, disableClose],
    );

    if (!mounted || !open) return null;

    return createPortal(
      <div
        className="fixed inset-0 w-screen h-screen bg-black/90 z-50 flex justify-center items-center"
        // Click on the backdrop closes the dialog (unless disabled).
        onMouseDown={e => {
          if (e.target === e.currentTarget && !disableClose) closeDialog();
        }}
      >
        <div
          ref={setRefs}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabelledBy ? undefined : ariaLabel}
          aria-labelledby={ariaLabelledBy}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className={cn("bg-secondary p-6 rounded-lg shadow-lg relative outline-none", className)}
        >
          <button
            type="button"
            className={cn(
              "absolute w-[20px] right-2 text-[20px] font-semibold top-4 cursor-pointer",
              disableClose && "opacity-50",
            )}
            onClick={() => closeDialog()}
            disabled={disableClose}
            aria-label="Close dialog"
          >
            <CloseIcon />
          </button>
          <div className="w-full h-full">{children}</div>
        </div>
      </div>,
      document.body,
    ) as React.ReactElement;
  },
);

BaseDialog.displayName = "BaseDialog";

export default BaseDialog;
