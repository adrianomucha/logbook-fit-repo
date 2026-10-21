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
  title: 'Privacy Policy',
  description:
    'What Logbook.fit collects, why, who can see it, and how to reach us about your data.',
  path: '/privacy',
});

const CONTACT_EMAIL = 'hello@logbook.fit';

/**
 * Plain-English privacy policy for the private beta. Written to satisfy
 * CalOPPA (conspicuous policy, categories collected, Do Not Track disclosure)
 * without GDPR apparatus — the beta is US-only. Keep this page in sync with
 * what the app actually collects; it deliberately names specifics (check-in
 * ratings, waitlist attribution) rather than boilerplate categories.
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      kicker="Legal"
      title="Privacy Policy"
      updated="October 20, 2026"
      toc={[
        'The short version',
        'What we collect',
        'Analytics and cookies',
        'Who can see your data',
        'How long we keep it',
        'Security',
        'Children',
        'California residents',
        'Changes to this policy',
        'Contact',
      ]}
    >
      <LegalSection title="The short version">
        <p>
          Logbook.fit is a workspace shared by a coach and their clients. We
          collect what the product needs to work — your account details, the
          training plans and check-ins you create — and almost nothing else. We{' '}
          <Strong>don&rsquo;t sell your data</Strong>, we don&rsquo;t run ad
          trackers, and the only people who see your training data are you and
          the coach or clients you&rsquo;re connected to. A few service
          providers process it on our behalf to run the product &mdash;
          including Anthropic, when a coach imports a plan spreadsheet
          that isn&rsquo;t in our template layout &mdash; and for nothing
          else.
        </p>
      </LegalSection>

      <LegalSection title="What we collect">
        <p>When you use Logbook.fit, we collect:</p>
        <LegalList
          items={[
            <>
              <Strong>Account information</Strong> — your name, email address,
              password, and time zone. Passwords are stored only as a salted
              hash; we never see or store the password itself.
            </>,
            <>
              <Strong>Profile photo</Strong> (optional). If you add one,
              it&rsquo;s stored as a publicly reachable image so it can load
              anywhere in the app: anyone who has its link can view it, but
              it isn&rsquo;t listed or searchable anywhere.
            </>,
            <>
              <Strong>Coaching and training data</Strong> — workout plans,
              exercises, completed sets (weight, reps, notes), and exercises
              you flag to your coach.
            </>,
            <>
              <Strong>Check-in responses</Strong> — effort ratings, how your
              body feels, and any notes you write. This is wellness
              information, and we treat it as the most sensitive data in the
              product: it is visible only to you and your connected coach.
            </>,
            <>
              <Strong>Messages</Strong> between you and your coach or clients
              inside the app.
            </>,
            <>
              <Strong>Invites</Strong>: when a coach invites a client, we
              store the email address and note the coach enters, so the
              invite can be matched when it&rsquo;s accepted.
            </>,
            <>
              <Strong>Feedback</Strong>: if you send us feedback from the app,
              we store your message and the page you sent it from.
            </>,
            <>
              <Strong>Waitlist details</Strong> — if you join the waitlist, we
              store your email, your answer to the client-count question if
              you give one, and basic &ldquo;how you found us&rdquo; context
              (campaign tags from the link you clicked, or the referring
              site).
            </>,
            <>
              <Strong>Push notification tokens</Strong> — if you turn on
              notifications, your browser or our iOS app gives us a delivery
              address for them, which we store with a label for the device
              (its browser or device name) so you can tell your devices
              apart. Both are deleted when you turn notifications off on that
              device or delete your account.
            </>,
            <>
              <Strong>Technical data</Strong>: like any website, our servers
              see your IP address and browser details when you connect. We use
              them to keep the service running and to rate-limit abuse (the
              rate limiter only stores scrambled, non-reversible versions of
              them), and our hosting provider keeps short-lived request logs.
              If the app crashes, it sends us the error and the page it
              happened on.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="Analytics and cookies">
        <p>
          We use Vercel Web Analytics to count page views and understand
          roughly what devices people use, and Vercel Speed Insights to
          measure how fast pages load. Both are cookieless, don&rsquo;t track
          you across other sites, and report to us only in aggregate.
        </p>
        <p>
          The only cookies we set are the ones that keep you signed in and
          protect the sign-in form. There are no advertising or third-party
          tracking cookies, which is why you don&rsquo;t see a cookie banner.
        </p>
        <p>
          Because we don&rsquo;t track you across sites in the first place,
          our service behaves the same whether or not your browser sends a
          &ldquo;Do Not Track&rdquo; signal.
        </p>
      </LegalSection>

      <LegalSection title="Who can see your data">
        <p>
          The product is built around one relationship, and access follows it:
        </p>
        <LegalList
          items={[
            <>
              <Strong>Your coach</Strong> (if you&rsquo;re a client) can see
              your training data, check-in responses, flags, and messages —
              that&rsquo;s the point of the product.
            </>,
            <>
              <Strong>Your clients</Strong> (if you&rsquo;re a coach) can see
              the plans and messages you share with them, and your name and
              profile details on their invite.
            </>,
            <>
              <Strong>Service providers</Strong> process data on our behalf to
              operate the service, and for no other purpose: Vercel (hosting
              and analytics), Supabase (database and profile photos), Resend
              (account and waitlist emails), and Upstash (rate limiting).
            </>,
            <>
              <Strong>Push notification services</Strong>: notifications are
              delivered through your browser&rsquo;s push service, or through
              Expo and Apple for the iOS app. A new-message notification
              includes the sender&rsquo;s name and a preview of the message;
              check-in notifications never include your answers.
            </>,
            <>
              <Strong>Anthropic</Strong> (if you&rsquo;re a coach importing a
              plan) reads plan spreadsheets that aren&rsquo;t laid out like our
              template. When you upload one, we send its text contents &mdash;
              the words and numbers in its cells &mdash; to Anthropic&rsquo;s AI
              model, which processes them on our behalf only to read the plan
              for you to review. Files laid out like the template are read on
              our own servers and not sent. Before uploading, we suggest
              removing client names and health details from the file.
            </>,
            <>
              <Strong>Legal requirements</Strong> — we&rsquo;ll disclose data
              if a law, court order, or government request genuinely requires
              it.
            </>,
          ]}
        />
        <p>
          We do not sell your personal information, and we do not share it
          with third parties for their own marketing.
        </p>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <p>
          We keep your data while your account is active. You can delete your
          account yourself from the account menu: your name, email, profile
          photo, and coach bio are removed and your notification tokens are
          deleted.
          Workouts, check-ins, and messages you shared with a coach or client
          stay on record under &ldquo;Deleted account&rdquo;, so their history
          doesn&rsquo;t develop holes, and
          feedback you sent us is kept without your name. If you&rsquo;d
          rather we do it,
          or want everything gone, email us at{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-foreground underline underline-offset-4 hover:text-brand"
          >
            {CONTACT_EMAIL}
          </a>{' '}
          and we&rsquo;ll take care of it. Waitlist emails are kept until you
          ask to be removed or we wind down the waitlist.
        </p>
        <p>
          Note for clients: your coach may keep their own records of your
          training outside Logbook.fit. Those are theirs, not ours, and this
          policy doesn&rsquo;t cover them.
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          All traffic is encrypted in transit over HTTPS, passwords are
          hashed, and access to production data is limited to what operating
          the service requires. No system is perfectly secure, and during a
          beta the honest promise is care, not perfection — if we ever learn
          of a breach affecting your data, we&rsquo;ll tell you promptly.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          Logbook.fit is for adults: our{' '}
          <Link
            href="/terms"
            className="font-medium text-foreground underline underline-offset-4 hover:text-brand"
          >
            Terms of Service
          </Link>{' '}
          require you to be at least 18, and we don&rsquo;t knowingly collect
          personal information from children under 13. If you believe
          someone under 18 has an account, contact us and we&rsquo;ll delete
          it.
        </p>
      </LegalSection>

      <LegalSection title="California residents">
        <p>
          You can ask us what personal information we hold about you, ask us
          to delete it, or ask questions about this policy — same email as
          below, and we don&rsquo;t treat you differently for asking. We
          don&rsquo;t sell personal information, so there is nothing to opt
          out of.
        </p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>
          The product is in beta and this policy will evolve with it. When it
          changes, we&rsquo;ll update the date at the top of this page, and
          for meaningful changes we&rsquo;ll tell you in the app or by email.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about this policy or your data:{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-foreground underline underline-offset-4 hover:text-brand"
          >
            {CONTACT_EMAIL}
          </a>
          . See also our{' '}
          <Link
            href="/terms"
            className="font-medium text-foreground underline underline-offset-4 hover:text-brand"
          >
            Terms of Service
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
