import { describe, expect, it } from 'vitest';
import {
  appleAppSiteAssociation,
  appRouteForLink,
  appRouteForWebPath,
  isAppleTeamId,
  UNIVERSAL_LINK_PATHS,
} from '../app-links';

describe('appRouteForWebPath', () => {
  it('opens the client home, and its tabs from the web query', () => {
    expect(appRouteForWebPath('/client')).toBe('/client');
    expect(appRouteForWebPath('/client?tab=chat')).toBe('/client/chat');
    expect(appRouteForWebPath('/client?tab=progress')).toBe('/client/progress');
    expect(appRouteForWebPath('/client?tab=checkin')).toBe('/client');
  });

  it("drops the week from the web's workout path", () => {
    expect(appRouteForWebPath('/client/workout/week-1/day-9')).toBe('/client/workout/day-9');
    expect(appRouteForWebPath('/client/workout/day-9')).toBe('/client/workout/day-9');
  });

  it('passes check-ins and settings through', () => {
    expect(appRouteForWebPath('/client/checkin/abc')).toBe('/client/checkin/abc');
    expect(appRouteForWebPath('/client/settings')).toBe('/client/settings');
  });

  it('sends coach paths to the coach screen and anything unknown home', () => {
    expect(appRouteForWebPath('/coach/clients/1')).toBe('/coach');
    expect(appRouteForWebPath('/client/something-new')).toBe('/client');
  });

  it('is null for anything that is not a path', () => {
    expect(appRouteForWebPath('https://logbook.fit/client')).toBeNull();
    expect(appRouteForWebPath(undefined)).toBeNull();
    expect(appRouteForWebPath(42)).toBeNull();
  });
});

describe('appRouteForLink', () => {
  it('maps a tapped logbook.fit link onto the app', () => {
    expect(appRouteForLink('https://logbook.fit/client/workout/w1/d2')).toBe('/client/workout/d2');
    expect(appRouteForLink('https://logbook.fit/client?tab=chat')).toBe('/client/chat');
    expect(appRouteForLink('https://logbook.fit/client/checkin/c1')).toBe('/client/checkin/c1');
    expect(appRouteForLink('/client/workout/w1/d2')).toBe('/client/workout/d2');
  });

  it('leaves links that are not the client pages alone', () => {
    for (const link of [
      'https://logbook.fit/signup?invite=abc',
      'https://logbook.fit/reset-password?token=abc',
      'https://logbook.fit/coach',
      'https://logbook.fit/',
      '/coach',
      '/clientele',
    ]) {
      expect(appRouteForLink(link)).toBeNull();
    }
  });

  it("leaves other hosts and the app's own scheme alone", () => {
    expect(appRouteForLink('https://evil.example/client')).toBeNull();
    expect(appRouteForLink('https://logbook.fit.evil.example/client')).toBeNull();
    expect(appRouteForLink('logbook://client/chat')).toBeNull();
    expect(appRouteForLink('exp://127.0.0.1:8081/--/client')).toBeNull();
    expect(appRouteForLink('not a url')).toBeNull();
  });
});

describe('appleAppSiteAssociation', () => {
  it('claims only the client pages, for this app', () => {
    const file = appleAppSiteAssociation('ABCDE12345');
    expect(file.applinks.details).toEqual([
      { appIDs: ['ABCDE12345.fit.logbook.app'], components: [{ '/': '/client' }, { '/': '/client/*' }] },
    ]);
    expect(UNIVERSAL_LINK_PATHS.every((p) => p.startsWith('/client'))).toBe(true);
  });

  it('knows what a Team ID looks like', () => {
    expect(isAppleTeamId('ABCDE12345')).toBe(true);
    for (const bad of ['', undefined, null, 'abcde12345', 'ABCDE1234', 'ABCDE12345.fit.logbook.app']) {
      expect(isAppleTeamId(bad)).toBe(false);
    }
  });
});
