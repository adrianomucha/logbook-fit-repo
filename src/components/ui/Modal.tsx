import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  /** Optional description for aria-describedby. When provided, wraps body in a described region. */
  description?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'md',
  description,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  // Keep onClose ref current without triggering re-renders
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Scroll lock + keyboard listener (stable — no dependency on onClose)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }

      if (e.key !== 'Tab' || !modalRef.current) return;

      const focusableEls = modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusableEls.length === 0) return;

      const firstEl = focusableEls[0];
      const lastEl = focusableEls[focusableEls.length - 1];
      // -1 when focus sits on the container itself (initial state)
      const activeIndex = Array.prototype.indexOf.call(focusableEls, document.activeElement);

      if (e.shiftKey) {
        if (activeIndex <= 0) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (activeIndex === focusableEls.length - 1) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    document.addEventListener('keydown', handleKeyDown);

    // Focus the dialog container itself so keyboard users start inside the
    // modal without a visible focus ring lighting up the close button
    requestAnimationFrame(() => {
      modalRef.current?.focus();
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center bg-black/50 sm:p-4 animate-in fade-in-0 duration-200"
      onClick={handleBackdropClick}
    >
      {/* Flex-column dialog: header and footer stay put, only the body scrolls.
          More reliable than sticky-inside-scroller (Safari) and keeps the
          scrollbar inside the rounded corners. */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`relative w-full h-full sm:h-auto ${maxWidthClasses[maxWidth]} sm:max-h-[85vh] flex flex-col overflow-hidden bg-background sm:rounded-2xl shadow-xl focus:outline-none animate-in fade-in-0 sm:zoom-in-95 slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-200`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        {/* Header */}
        <div className="shrink-0 bg-background border-b border-border px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between">
          <h2 id={titleId} className="text-lg sm:text-xl font-semibold text-foreground">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body — the only scroll container; overscroll-contain stops the
            page behind from scrolling when the list hits its end */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-8 py-4 sm:py-5">
          {description && (
            <p id={descriptionId} className="sr-only">{description}</p>
          )}
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 bg-background border-t border-border px-4 sm:px-8 py-3 sm:py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
