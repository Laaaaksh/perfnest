"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "./db";
import { checkAdminPassword, createSessionToken, SESSION_COOKIE } from "./auth";
import { isAdminSession } from "./session";
import { generateApiToken, generatePublicSlug } from "./tokens";
import { executeRun } from "./run-service";
import { sendMail } from "./mailer";

async function requireAdmin(): Promise<void> {
  if (!(await isAdminSession())) {
    throw new Error("Unauthorized");
  }
}

export async function loginAction(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  if (!checkAdminPassword(password)) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  const token = await createSessionToken();
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export async function createProjectAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const { name } = createProjectSchema.parse({ name: formData.get("name") });

  const project = await prisma.project.create({
    data: { name, apiToken: generateApiToken() },
  });

  revalidatePath("/dashboard");
  redirect(`/dashboard/${project.id}`);
}

export async function deleteProjectAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const projectId = String(formData.get("projectId"));
  await prisma.project.delete({ where: { id: projectId } });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function togglePublicAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const projectId = String(formData.get("projectId"));
  const enabled = formData.get("enabled") === "true";

  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });

  await prisma.project.update({
    where: { id: projectId },
    data: {
      publicEnabled: enabled,
      publicSlug: enabled ? (project.publicSlug ?? generatePublicSlug()) : project.publicSlug,
    },
  });

  revalidatePath(`/dashboard/${projectId}`);
}

export async function rotateApiTokenAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const projectId = String(formData.get("projectId"));
  await prisma.project.update({ where: { id: projectId }, data: { apiToken: generateApiToken() } });
  revalidatePath(`/dashboard/${projectId}`);
}

const pageSchema = z.object({
  label: z.string().trim().min(1).max(120),
  url: z.string().trim().url(),
  device: z.enum(["mobile", "desktop"]),
  intervalMinutes: z.coerce.number().int().min(15).max(60 * 24 * 7),
});

export async function createPageAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const projectId = String(formData.get("projectId"));
  const data = pageSchema.parse({
    label: formData.get("label"),
    url: formData.get("url"),
    device: formData.get("device"),
    intervalMinutes: formData.get("intervalMinutes"),
  });

  await prisma.page.create({ data: { ...data, projectId } });
  revalidatePath(`/dashboard/${projectId}`);
}

export async function updatePageAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const pageId = String(formData.get("pageId"));
  const projectId = String(formData.get("projectId"));
  const data = pageSchema.parse({
    label: formData.get("label"),
    url: formData.get("url"),
    device: formData.get("device"),
    intervalMinutes: formData.get("intervalMinutes"),
  });

  await prisma.page.update({ where: { id: pageId }, data });
  revalidatePath(`/dashboard/${projectId}/pages/${pageId}`);
}

export async function deletePageAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const pageId = String(formData.get("pageId"));
  const projectId = String(formData.get("projectId"));
  await prisma.page.delete({ where: { id: pageId } });
  revalidatePath(`/dashboard/${projectId}`);
  redirect(`/dashboard/${projectId}`);
}

const budgetSchema = z.object({
  metric: z.enum(["performance_score", "lcp", "cls", "tbt", "fcp"]),
  threshold: z.coerce.number(),
  enabled: z.coerce.boolean(),
});

export async function upsertBudgetAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const pageId = String(formData.get("pageId"));
  const projectId = String(formData.get("projectId"));
  const data = budgetSchema.parse({
    metric: formData.get("metric"),
    threshold: formData.get("threshold"),
    enabled: formData.get("enabled") ?? "false",
  });

  await prisma.budget.upsert({
    where: { pageId_metric: { pageId, metric: data.metric } },
    create: { pageId, ...data },
    update: { threshold: data.threshold, enabled: data.enabled },
  });

  revalidatePath(`/dashboard/${projectId}/pages/${pageId}`);
}

export async function deleteBudgetAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const budgetId = String(formData.get("budgetId"));
  const projectId = String(formData.get("projectId"));
  const pageId = String(formData.get("pageId"));
  await prisma.budget.delete({ where: { id: budgetId } });
  revalidatePath(`/dashboard/${projectId}/pages/${pageId}`);
}

const alertChannelSchema = z.object({
  type: z.enum(["slack", "webhook", "email"]),
  target: z.string().trim().min(1).max(300),
});

export async function createAlertChannelAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const projectId = String(formData.get("projectId"));
  const data = alertChannelSchema.parse({
    type: formData.get("type"),
    target: formData.get("target"),
  });

  await prisma.alertChannel.create({ data: { projectId, ...data } });
  revalidatePath(`/dashboard/${projectId}`);
}

export async function deleteAlertChannelAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const channelId = String(formData.get("channelId"));
  const projectId = String(formData.get("projectId"));
  await prisma.alertChannel.delete({ where: { id: channelId } });
  revalidatePath(`/dashboard/${projectId}`);
}

export async function triggerRunAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const pageId = String(formData.get("pageId"));
  const projectId = String(formData.get("projectId"));
  const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";

  await executeRun(prisma, {
    pageId,
    triggeredBy: "manual",
    dashboardBaseUrl: baseUrl,
    alertDeps: { fetchImpl: fetch, sendMail },
  });

  revalidatePath(`/dashboard/${projectId}/pages/${pageId}`);
}
