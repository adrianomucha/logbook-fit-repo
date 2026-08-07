import Link from 'next/link';
import {
  LegalPage,
  LegalSection,
  LegalList,
  Strong,
} from '@/components/legal/LegalPage';
import { pageMetadata } from '@/lib/seo';

// Bare title: the root layout's template appends "· Logbook.fit".
export const metadata = pageMetadata({
  title: 'Terms of Service',
  description:
    'The terms for using Logbook.fit during the private beta — including what we are (software) and what we are not (medical advice).',
  path: '/terms',
});

const CONTACT_EMAIL = 'hello@logbook.fit';

/**
 * Beta terms of service. The load-bearing sections for a fitness product are
 * "Not medical advice" and "Assumption of risk" — everything else is the
 * standard frame around them. Kept in plain English on purpose: terms nobody
 * can read protect nobody.
 */
export default function TermsPage() {
  return (
    <LegalPage
      kicker="Legal"
      title="Terms of Service"
      updated="August 6, 2026"
      toc={[
        'The short version',
        'Who can use it',
        'Beta status',
        'Not medical advice',
        'Assumption of risk',
        'Coaches and clients',
        'Your content',
        'Acceptable use',
        'Disclaimers and limits on liability',
        'Governing law',
        'Changes to these terms',
        'Contact',
      ]}
    >
      <LegalSection title="The short version">
        <p>
          Logbook.fit is software that helps coaches and their clients plan,
          track, and check in on training. It&rsquo;s in{' '}
          <Strong>private beta</Strong>: it&rsquo;s free for now, things will
          change, and occasionally things will break. It is a tool for coaches
          — <Strong>not medical advice</Strong>, and not a substitute for your
          own judgment about your body. By creating an account or joining the
          waitlist, you agree to these terms.
        </p>
      </LegalSection>

      <LegalSection title="Who can use it">
        <p>
          You must be at least 18 years old and able to enter into a contract
          to create an account. Keep your password to yourself — you&rsquo;re
          responsible for what happens under your account, and you&rsquo;ll
          tell us if you think someone else has gotten into it.
        </p>
      </LegalSection>

      <LegalSection title="Beta status">
        <p>Being in beta means, concretely:</p>
        <LegalList
          items={[
            <>
              The service is provided <Strong>free of charge for now</Strong>.
              If we introduce paid plans later, we&rsquo;ll tell you clearly
              before anything costs money.
            </>,
            <>
              Features may change, break, or be removed without notice, and
              the service may be unavailable at times.
            </>,
            <>
              We work hard not to lose data, but during a beta{' '}
              <Strong>we can&rsquo;t guarantee it</Strong> — keep your own
              copies of anything you can&rsquo;t afford to lose.
            </>,
            <>
              We may suspend or end the beta, or your access to it, at any
              time.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="Not medical advice">
        <p>
          <Strong>
            Logbook.fit does not provide medical advice, diagnosis, or
            treatment.
          </Strong>{' '}
          Nothing in the app — plans, exercises, prescriptions, notes, or
          check-in feedback — is medical guidance from us. Training plans are
          written by your coach, not by Logbook.fit; we provide the software
          they use, and we don&rsquo;t review, endorse, or supervise their
          programming.
        </p>
        <p>
          Consult a physician before starting any exercise program,
          especially if you have a medical condition, an injury, or
          haven&rsquo;t trained in a while. If something hurts — beyond the
          normal way exercise hurts — stop and talk to a professional, not an
          app.
        </p>
      </LegalSection>

      <LegalSection title="Assumption of risk">
        <p>
          Physical training carries inherent risk of injury. By using
          Logbook.fit to plan or perform workouts, you acknowledge that risk
          and agree that you train voluntarily and at your own risk. To the
          fullest extent permitted by law, Logbook.fit is not liable for
          injuries, health outcomes, or other harm arising from training
          activities you or your clients perform.
        </p>
      </LegalSection>

      <LegalSection title="Coaches and clients">
        <p>
          Logbook.fit is a platform. The coaching relationship — its quality,
          its results, its payment, its professional standards — is between
          coach and client, and we are not a party to it. Coaches are
          responsible for being qualified to give the guidance they give and
          for complying with any laws that apply to their practice.
        </p>
      </LegalSection>

      <LegalSection title="Your content">
        <p>
          The plans, notes, check-ins, and messages you create are yours. You
          give us the license we need to store, display, and transmit them to
          the people you&rsquo;ve connected with — that&rsquo;s what makes the
          product work — and nothing more. We don&rsquo;t use your content
          for advertising or sell it. How we handle personal data is covered
          in our{' '}
          <Link
            href="/privacy"
            className="font-medium text-foreground underline underline-offset-4 hover:text-brand"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>Don&rsquo;t use Logbook.fit to:</p>
        <LegalList
          items={[
            'Break the law, or infringe anyone’s rights.',
            'Harass or harm other users.',
            'Probe, scrape, overload, or interfere with the service or other people’s data.',
            'Impersonate someone else or misrepresent a coaching relationship.',
          ]}
        />
        <p>We may suspend accounts that do.</p>
      </LegalSection>

      <LegalSection title="Disclaimers and limits on liability">
        <p>
          The service is provided <Strong>&ldquo;as is&rdquo;</Strong> and{' '}
          <Strong>&ldquo;as available,&rdquo;</Strong> without warranties of
          any kind, express or implied — including fitness for a particular
          purpose, accuracy, and uninterrupted availability.
        </p>
        <p>
          To the fullest extent permitted by law, Logbook.fit and its
          operators will not be liable for indirect, incidental, special,
          consequential, or punitive damages, or for lost profits, data, or
          goodwill. Our total liability for any claim relating to the
          service is limited to the greater of $100 or the amount you paid
          us in the twelve months before the claim — which, during the free
          beta, is $100.
        </p>
        <p>
          Some jurisdictions don&rsquo;t allow certain of these limits, so
          some may not apply to you.
        </p>
      </LegalSection>

      <LegalSection title="Governing law">
        <p>
          These terms are governed by the laws of the State of California and
          the United States, without regard to conflict-of-law rules.
          Disputes will be resolved in the state or federal courts located in
          California.
        </p>
      </LegalSection>

      <LegalSection title="Changes to these terms">
        <p>
          As the beta evolves these terms will too. We&rsquo;ll update the
          date at the top when they change, and flag meaningful changes in
          the app or by email. Continuing to use the service after a change
          means you accept the new terms.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about these terms:{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-foreground underline underline-offset-4 hover:text-brand"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
