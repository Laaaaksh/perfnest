import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { executeRun } from "@/lib/run-service";
import { sendMail } from "@/lib/mailer";
import { safeEqual } from "@/lib/compare";

export const maxDuration = 60;

/**
 * The one endpoint meant to be called from outside the dashboard: a CI
 * pipeline (or any webhook) triggers an on-demand Lighthouse run here after
 * a deploy. Authenticated by the page's project API token, never by the
 * admin session - this is the credential a CI secret holds.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;

  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: { id: true, project: { select: { apiToken: true } } },
  });

  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const presentedToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!presentedToken || !safeEqual(presentedToken, page.project.apiToken)) {
    return NextResponse.json({ error: "Invalid or missing API token" }, { status: 401 });
  }

  let deployId: string | null = null;
  try {
    const body = await request.json();
    if (typeof body?.deployId === "string") deployId = body.deployId.slice(0, 200);
  } catch {
    // No JSON body is fine - deployId is optional.
  }

  const baseUrl = process.env.PUBLIC_BASE_URL ?? request.nextUrl.origin;

  const result = await executeRun(prisma, {
    pageId,
    triggeredBy: "webhook",
    deployId,
    dashboardBaseUrl: baseUrl,
    alertDeps: { fetchImpl: fetch, sendMail },
  });

  return NextResponse.json(result, { status: result.status === "failed" ? 502 : 200 });
}
