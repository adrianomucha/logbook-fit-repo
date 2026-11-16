import { NextResponse } from "next/server";
import { appleAppSiteAssociation, isAppleTeamId } from "@logbook/shared/app-links";

/**
 * GET /.well-known/apple-app-site-association
 *
 * iOS fetches this when the app is installed, to confirm the website agrees
 * that the app may open its /client links (universal links). It needs the
 * Apple Team ID, which only the owner has: set APPLE_TEAM_ID. Until then
 * this answers 404, and links simply keep opening in the browser.
 *
 * No redirect and plain JSON, as Apple requires. Public by design.
 */
export function GET() {
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  if (!isAppleTeamId(teamId)) {
    return NextResponse.json({ error: "Not configured" }, { status: 404 });
  }
  return NextResponse.json(appleAppSiteAssociation(teamId), {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
