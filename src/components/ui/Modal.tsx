import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useDialogBehavior } from '@/hooks/useDialogBehavior';
import { Button } from './button';

/** How long the exit animation runs before the panel unmounts. */
const CLOSE_MS = 150;

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
  // Scroll lock, Escape, focus trap and focus restore — see the hook
  const modalRef = useDialogBehavior({ isOpen, onClose });

  // Exit animation: keep rendering briefly after isOpen flips false so the
  // panel can animate out. The dialog behavior hook keys off isOpen, so the
  // scroll lock and focus restore still release immediately on close; the
  // lingering panel is made inert with pointer-events-none.
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (isOpen) {
      clearTimeout(closeTimerRef.current);
      setShouldRender(true);
      setIsClosing(false);
      return;
    }
    if (!shouldRender) return;
    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
    }, CLOSE_MS);
    return () => clearTimeout(closeTimerRef.current);
  }, [isOpen, shouldRender]);

  if (!shouldRender) return null;

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
      className={`fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/55 backdrop-blur-sm sm:p-4 motion-reduce:animate-none ${
        isClosing
          ? 'animate-out fade-out-0 fill-mode-forwards duration-150 ease-out pointer-events-none'
          : 'animate-in fade-in-0 duration-200 ease-out'
      }`}
      onClick={handleBackdropClick}
    >
      {/* Flex-column dialog: header and footer stay put, only the body scrolls.
          More reliable than sticky-inside-scroller (Safari) and keeps the
          scrollbar inside the rounded corners.
          On mobile this is a bottom sheet that hugs its content — never a
          full-height panel, so short dialogs don't strand their footer at the
          bottom of an empty screen. */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`relative w-full ${maxWidthClasses[maxWidth]} max-h-[calc(100dvh-2.5rem)] sm:max-h-[85vh] flex flex-col overflow-hidden bg-background rounded-t-2xl sm:rounded-2xl pb-[env(safe-area-inset-bottom)] sm:pb-0 shadow-xl focus:outline-none motion-reduce:animate-none ${
          isClosing
            // Exit softer than the enter: fade + a small fixed slide down
            ? 'animate-out fade-out-0 slide-out-to-bottom-2 fill-mode-forwards duration-150 ease-out'
            : 'animate-in fade-in-0 sm:zoom-in-95 slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-200 ease-out'
        }`}
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
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground tap-target"
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
