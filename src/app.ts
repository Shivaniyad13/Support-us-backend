import cors from "cors";
import { randomUUID, timingSafeEqual } from "node:crypto";
import express, { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { config } from "./config";
import { CashfreeError, createCashfreeOrder, getCashfreeOrder } from "./cashfree";
import { prisma } from "./database";

export const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: config.FRONTEND_ORIGIN }));
app.use(express.json({ limit: "16kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ success: true });
});

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const configuredKey = config.ADMIN_API_KEY;
  if (!configuredKey) {
    res.status(503).json({ success: false, error: "Admin access is not configured on the server." });
    return;
  }

  const providedKey = req.get("x-admin-key");
  if (
    !providedKey ||
    Buffer.byteLength(providedKey) !== Buffer.byteLength(configuredKey) ||
    !timingSafeEqual(Buffer.from(providedKey), Buffer.from(configuredKey))
  ) {
    res.status(401).json({ success: false, error: "Admin authentication failed." });
    return;
  }
  next();
}

app.use("/api/admin", requireAdmin);

app.get("/api/admin/beneficiaries", async (_req, res, next) => {
  try {
    const beneficiaries = await prisma.beneficiary.findMany({
      select: { id: true, name: true, slug: true, type: true, description: true, isActive: true, sortOrder: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    res.json({ success: true, data: beneficiaries });
  } catch (error) {
    next(error);
  }
});

const beneficiaryInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(["PERSON", "ORGANIZATION", "PROGRAM"]),
  description: z.string().trim().min(1).max(1000),
  sortOrder: z.number().int().min(0).max(10000),
});

function createSlug(name: string) {
  const base = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "recipient";
  return `${base}-${randomUUID().slice(0, 8)}`;
}

app.post("/api/admin/beneficiaries", async (req, res, next) => {
  try {
    const input = beneficiaryInputSchema.parse(req.body);
    const beneficiary = await prisma.beneficiary.create({
      data: { ...input, slug: createSlug(input.name) },
    });
    res.status(201).json({ success: true, data: beneficiary });
  } catch (error) {
    next(error);
  }
});

const updateBeneficiarySchema = beneficiaryInputSchema.extend({
  isActive: z.boolean(),
});

app.patch("/api/admin/beneficiaries/:id", async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const input = updateBeneficiarySchema.parse(req.body);
    const beneficiary = await prisma.beneficiary.update({
      where: { id },
      data: input,
    });
    res.json({ success: true, data: beneficiary });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/beneficiaries/:id", async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const beneficiary = await prisma.beneficiary.update({
      where: { id },
      data: { isActive: false },
    });
    res.json({ success: true, data: beneficiary });
  } catch (error) {
    next(error);
  }
});

const donationListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

app.get("/api/admin/donations", async (req, res, next) => {
  try {
    const { page, limit } = donationListQuerySchema.parse(req.query);
    const [donations, total] = await Promise.all([
      prisma.donation.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          orderId: true,
          beneficiaryName: true,
          donorName: true,
          donorEmail: true,
          donorPhone: true,
          amount: true,
          currency: true,
          status: true,
          isAnonymous: true,
          createdAt: true,
        },
      }),
      prisma.donation.count(),
    ]);
    res.json({
      success: true,
      data: {
        donations: donations.map((donation) => ({ ...donation, amount: Number(donation.amount) })),
        page,
        limit,
        total,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/beneficiaries", async (_req, res, next) => {
  try {
    const beneficiaries = await prisma.beneficiary.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, type: true, description: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    res.json({ success: true, data: beneficiaries });
  } catch (error) {
    next(error);
  }
});

const createDonationSchema = z.object({
  beneficiaryId: z.string().uuid(),
  amount: z.number().finite().min(1).max(9999999999.99),
  donorName: z
    .string()
    .trim()
    .max(90)
    .regex(/^[\p{L}\p{M}]+(?:[ .'-][\p{L}\p{M}]+)*$/u, "Enter a valid name using letters only")
    .optional(),
  donorEmail: z.string().trim().email().max(254),
  donorPhone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  isAnonymous: z.boolean().default(false),
});

app.post("/api/donations/orders", async (req, res, next) => {
  try {
    const input = createDonationSchema.parse(req.body);
    if (!input.isAnonymous && !input.donorName) {
      res.status(400).json({ success: false, error: "Please enter your name or choose anonymous giving." });
      return;
    }

    const beneficiary = await prisma.beneficiary.findFirst({
      where: { id: input.beneficiaryId, isActive: true },
      select: { id: true, name: true, type: true },
    });
    if (!beneficiary) {
      res.status(404).json({ success: false, error: "This donation recipient is no longer available." });
      return;
    }

    const donorName = input.isAnonymous ? "Anonymous" : input.donorName!.trim();
    const order = await createCashfreeOrder({
      amount: input.amount,
      donorName,
      donorEmail: input.donorEmail,
      donorPhone: input.donorPhone,
      beneficiaryName: beneficiary.name,
    });

    await prisma.donation.create({
      data: {
        orderId: order.orderId,
        beneficiaryId: beneficiary.id,
        beneficiaryName: beneficiary.name,
        beneficiaryType: beneficiary.type,
        donorName,
        donorEmail: input.donorEmail,
        donorPhone: input.donorPhone,
        amount: order.amount,
        currency: order.currency,
        isAnonymous: input.isAnonymous,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        orderId: order.orderId,
        paymentSessionId: order.paymentSessionId,
        amount: order.amount,
        currency: order.currency,
      },
    });
  } catch (error) {
    next(error);
  }
});

const orderIdSchema = z.string().min(1).max(45).regex(/^[A-Za-z0-9_-]+$/);

app.post("/api/donations/:orderId/verify", async (req, res, next) => {
  try {
    const orderId = orderIdSchema.parse(req.params.orderId);
    const donation = await prisma.donation.findUnique({
      where: { orderId },
      select: { id: true, amount: true, currency: true, beneficiaryName: true, status: true },
    });

    if (!donation) {
      res.status(404).json({ success: false, error: "Donation order not found." });
      return;
    }
    if (donation.status === "SUCCESSFUL") {
      res.json({
        success: true,
        verified: true,
        data: { amount: Number(donation.amount), currency: donation.currency, beneficiaryName: donation.beneficiaryName },
      });
      return;
    }

    const order = await getCashfreeOrder(orderId);
    if (order.order_status === "PAID") {
      const verified = await prisma.donation.update({
        where: { id: donation.id },
        data: { status: "SUCCESSFUL" },
        select: { amount: true, currency: true, beneficiaryName: true },
      });
      res.json({
        success: true,
        verified: true,
        data: { amount: Number(verified.amount), currency: verified.currency, beneficiaryName: verified.beneficiaryName },
      });
      return;
    }

    res.json({ success: true, verified: false, status: order.order_status });
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError) {
    res.status(400).json({ success: false, error: error.issues[0]?.message || "Invalid request." });
    return;
  }

  console.error("[support-us API]", error);
  if (error instanceof CashfreeError) {
    res.status(502).json({ success: false, error: error.message });
    return;
  }
  res.status(500).json({ success: false, error: "Unexpected server error." });
});
