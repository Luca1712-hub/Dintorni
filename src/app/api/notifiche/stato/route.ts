import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Stato invio email lato server (senza segreti). */
export async function GET() {
  return NextResponse.json({
    resendConfigurato: Boolean(process.env.RESEND_API_KEY?.trim()),
  });
}
