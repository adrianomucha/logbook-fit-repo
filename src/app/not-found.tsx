import Link from 'next/link';
import { PAGE_NOT_FOUND_COPY } from '@logbook/shared/state-copy';
import { StateView } from '@/components/states/StateView';

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-4">
      <StateView
        as="h1"
        art={PAGE_NOT_FOUND_COPY.art}
        title={PAGE_NOT_FOUND_COPY.title}
        tail={PAGE_NOT_FOUND_COPY.tail}
      >
        <Link
          href="/"
          className="inline-flex items-center h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-medium active:scale-[0.97] transition-transform duration-150"
        >
          {PAGE_NOT_FOUND_COPY.home}
        </Link>
      </StateView>
    </div>
  );
}
