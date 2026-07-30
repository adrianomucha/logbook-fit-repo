'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PlusSquare, Share, X } from 'lucide-react';
import { LogoMark } from '@/components/brand/LogoMark';
import { cn } from '@/lib/utils';
import {
  INSTALL_PROMPT_STORAGE_KEY,
  markOffered,
  parseInstallPromptState,
  resolveInstallPrompt,
  type InstallMethod,
  type InstallPromptState,
} from '@/lib/pwa-install';

/** Chromium-only event — not in lib.dom.d.ts. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Hold the banner back until the page has settled. Arriving during first paint
 * makes it read as an ad, and puts it in competition with the content the user
 * actually opened the app for.
 */
const SHOW_DELAY_MS = 2500;

function readState(): InstallPromptState {
  try {
    return parseInstallPromptState(
      window.localStorage.getItem(INSTALL_PROMPT_STORAGE_KEY)
    );
  } catch {
    // Storage throws in private/locked-down modes. Treat as a first visit —
    // the cost is a banner that can't be retired, not a broken page.
    return {};
  }
}

/** Spends this device's single ask. Called the moment the banner goes on
 *  screen, and again on the way out in case that first write was refused. */
function persistOffered(): void {
  try {
    window.localStorage.setItem(
      INSTALL_PROMPT_STORAGE_KEY,
      JSON.stringify(markOffered(Date.now()))
    );
  } catch {
    // Nothing to do. The banner still goes away for this page view.
  }
}

const COPY: Record<Exclude<InstallMethod, 'none'>, { title: string; body: string; cta: string }> = {
  native: {
    title: 'Install Logbook',
    body: 'Keep it on your device — opens straight to your workout.',
    cta: 'Install',
  },
  'ios-safari': {
    title: 'Add Logbook to your Home Screen',
    body: 'Opens straight to your workout — no browser, no searching.',
    cta: 'Show me how',
  },
  'ios-browser': {
    title: 'Add Logbook to your Home Screen',
    body: 'Opens straight to your workout — no browser, no searching.',
    cta: 'Show me how',
  },
};

const STEP_ICON = 'inline-block h-4 w-4 -mt-0.5 align-middle text-foreground';

const STEPS_ID = 'install-prompt-steps';

function Step({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
      <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[10px] font-semibold text-foreground">
        {index}
      </span>
      <span>{children}</span>
    </li>
  );
}

/**
 * Nudges people to install the PWA.
 *
 * Two very different mechanics behind one banner: Chromium hands us a real
 * install dialog via `beforeinstallprompt`, while iOS has no install API at
 * all and can only be walked through the Share sheet by hand. Which one (if
 * either) applies is decided in `@/lib/pwa-install`.
 *
 * Mounted on the coach and client dashboards only — deliberately not on the
 * workout or check-in screens, where a floating card would sit on top of the
 * flow people came to complete.
 *
 * One ask per device, ever. It is spent the moment the banner reaches the
 * screen, so installing, closing, or just reading it and carrying on all end
 * the same way: it never comes back.
 */
export function InstallPrompt() {
  const [method, setMethod] = useState<InstallMethod>('none');
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  // Set once the banner has gone on screen this page view. Without it, a late
  // `beforeinstallprompt` would re-run the check, find the record just written,
  // and yank a visible banner back off the screen.
  const offered = useRef(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      // Chromium shows its own mini-infobar unless the event is cancelled;
      // suppress it so this banner is the only ask.
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setMethod('none');
      // Covers installs done through Chromium's own menu rather than this
      // banner, which would otherwise leave the ask unspent.
      persistOffered();
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    if (offered.current) return;

    const timer = setTimeout(() => {
      const navigatorStandalone =
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

      const resolved = resolveInstallPrompt(
        {
          userAgent: window.navigator.userAgent,
          maxTouchPoints: window.navigator.maxTouchPoints,
          navigatorStandalone,
          displayModeStandalone: window.matchMedia('(display-mode: standalone)').matches,
          hasNativePrompt: deferred !== null,
        },
        readState()
      );
      if (resolved === 'none') return;

      // Spend the ask only once the banner is genuinely on screen. Someone who
      // opens a workout before the delay elapses never saw it, so they keep
      // their turn.
      offered.current = true;
      persistOffered();
      setMethod(resolved);
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
    // Re-runs if Chromium's prompt lands after the first pass.
  }, [deferred]);

  const dismiss = useCallback(() => {
    setMethod('none');
    setShowSteps(false);
    persistOffered();
  }, []);

  const handleCta = useCallback(async () => {
    if (method !== 'native') {
      // Second press ("Got it") closes up rather than collapsing back: they
      // have the instructions, and hovering over the Share sheet they are
      // about to open helps nobody.
      if (showSteps) dismiss();
      else setShowSteps(true);
      return;
    }
    if (!deferred) return;

    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // A captured prompt is single-use, whichever way the user answers.
    setDeferred(null);
    if (outcome === 'accepted') {
      setMethod('none');
    } else {
      dismiss();
    }
  }, [method, showSteps, deferred, dismiss]);

  if (method === 'none') return null;

  const copy = COPY[method];
  const isIOS = method !== 'native';

  return (
    <section
      aria-label="Install Logbook"
      className={cn(
        // z-40 matches the mobile tab bar and stays under sheets/dialogs (z-50).
        'fixed z-40 animate-enter',
        // Clears the 50px mobile tab bar plus the home-indicator inset; on sm+
        // the tab bar is hidden, so the card just sits in the bottom corner.
        'inset-x-3 bottom-[calc(3.75rem+env(safe-area-inset-bottom))]',
        'sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[22rem]'
      )}
    >
      <div className="rounded-lg border border-border bg-background/95 p-3 shadow-lg backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <LogoMark size={36} className="mt-0.5" />

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug text-foreground">
              {copy.title}
            </p>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
              {copy.body}
            </p>
          </div>

          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            // -m-2 p-2 grows the tap target to 36px without adding layout bulk.
            className="-m-2 shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {showSteps && isIOS && (
          <ol id={STEPS_ID} className="mt-3 space-y-2 border-t border-border pt-3">
            <Step index={1}>
              {method === 'ios-safari' ? (
                <>
                  Tap <Share className={STEP_ICON} aria-hidden="true" /> in the
                  Safari toolbar
                </>
              ) : (
                <>
                  Open your browser menu and tap{' '}
                  <Share className={STEP_ICON} aria-hidden="true" /> Share
                </>
              )}
            </Step>
            <Step index={2}>
              Choose <PlusSquare className={STEP_ICON} aria-hidden="true" />{' '}
              <span className="font-medium text-foreground">Add to Home Screen</span>
            </Step>
          </ol>
        )}

        <button
          type="button"
          onClick={handleCta}
          aria-expanded={isIOS ? showSteps : undefined}
          // Only set once the list exists, so the IDREF never dangles.
          aria-controls={isIOS && showSteps ? STEPS_ID : undefined}
          className="mt-3 h-9 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {showSteps && isIOS ? 'Got it' : copy.cta}
        </button>
      </div>
    </section>
  );
}

