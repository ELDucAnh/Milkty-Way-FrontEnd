import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export interface ModalProps {
    open?: boolean;
    isOpen?: boolean;
    title: string;
    children: ReactNode;
    onClose: () => void;
    footer?: ReactNode;
    size?: "sm" | "md" | "lg" | "xl" | "2xl";
    closeOnBackdrop?: boolean;
}

const sizeClasses: Record<"sm" | "md" | "lg" | "xl" | "2xl", string> = {
    sm: "modal-sm",
    md: "",
    lg: "modal-lg",
    xl: "modal-xl",
    "2xl": "modal-2xl",
};

const focusableSelector = [
    "button:not([disabled])",
    "a[href]",
    "input:not([disabled]):not([type='hidden'])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
].join(",");

export default function Modal({
                                  open,
                                  isOpen,
                                  title,
                                  children,
                                  onClose,
                                  footer,
                                  size = "md",
                                  closeOnBackdrop = true,
                              }: ModalProps) {
    const modalOpen = open ?? isOpen ?? false;
    const titleId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeRef = useRef(onClose);

    useEffect(() => {
        closeRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!modalOpen) return;

        const previousFocus =
            document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        function getFocusableElements(): HTMLElement[] {
            return Array.from(
                dialogRef.current?.querySelectorAll<HTMLElement>(
                    focusableSelector,
                ) ?? [],
            ).filter((element) => element.getClientRects().length > 0);
        }

        function focusFirst() {
            const first = getFocusableElements()[0];
            (first ?? dialogRef.current)?.focus();
        }

        focusFirst();

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                event.preventDefault();
                closeRef.current();
                return;
            }

            if (event.key !== "Tab") return;

            const elements = getFocusableElements();
            const first = elements[0];
            const last = elements[elements.length - 1];

            if (!first || !last) {
                event.preventDefault();
                dialogRef.current?.focus();
                return;
            }

            const active = document.activeElement;

            if (event.shiftKey && (active === first || active === dialogRef.current)) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus();
            }
        }

        function handleFocusIn(event: FocusEvent) {
            if (
                event.target instanceof Node &&
                !dialogRef.current?.contains(event.target)
            ) {
                focusFirst();
            }
        }

        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("focusin", handleFocusIn);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("focusin", handleFocusIn);
            document.body.style.overflow = previousOverflow;

            if (previousFocus?.isConnected) {
                previousFocus.focus();
            }
        };
    }, [modalOpen]);

    if (!modalOpen) return null;

    return createPortal(
        <div
            className="modal-backdrop"
            onClick={(event) => {
                if (closeOnBackdrop && event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                ref={dialogRef}
                className={`modal-box ${sizeClasses[size]}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
            >
                <div className="modal-header">
                    <h2
                        id={titleId}
                        className="text-[17px] font-bold text-[var(--heading-color)]"
                    >
                        {title}
                    </h2>

                    <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        aria-label="Đóng hộp thoại"
                        onClick={onClose}
                    >
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                        >
                            <path d="m6 6 12 12M18 6 6 18" />
                        </svg>
                    </button>
                </div>

                <div className="modal-body">{children}</div>

                {footer !== undefined && (
                    <div className="modal-footer flex-wrap">{footer}</div>
                )}
            </div>
        </div>,
        document.body,
    );
}
