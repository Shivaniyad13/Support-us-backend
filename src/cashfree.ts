import { randomUUID } from "node:crypto";
import { config } from "./config";

export class CashfreeError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "CashfreeError";
  }
}

const baseUrl =
  config.CASHFREE_ENV === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

async function cashfreeRequest<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "x-client-id": config.CASHFREE_APP_ID,
        "x-client-secret": config.CASHFREE_SECRET_KEY,
        "x-api-version": config.CASHFREE_API_VERSION || "2023-08-01",
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch (error) {
    throw new CashfreeError("Secure payment service could not be reached.", { cause: error });
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    throw new CashfreeError("Secure payment service returned an invalid response.", { cause: error });
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? String(data.message)
        : "Payment provider request failed";
    throw new CashfreeError(message);
  }
  return data as T;
}

export async function createCashfreeOrder(input: {
  amount: number;
  donorName: string;
  donorEmail: string;
  donorPhone: string;
  beneficiaryName: string;
}) {
  const orderId = `SUP_${Date.now()}_${randomUUID().replace(/-/g, "").slice(0, 12)}`;

  // Return URL sirf tab bhejo jab config mein set ho (production ke liye).
  // Local development mein DONATION_RETURN_URL comment/empty rakho, toh
  // order_meta bhejega hi nahi aur Cashfree ka https wala error nahi aayega.
  const orderMeta = config.DONATION_RETURN_URL
    ? { return_url: config.DONATION_RETURN_URL }
    : undefined;

  const result = await cashfreeRequest<{
    order_id: string;
    payment_session_id: string;
    order_amount: number;
    order_currency: string;
  }>("/orders", {
    method: "POST",
    body: JSON.stringify({
      order_id: orderId,
      order_amount: Number(input.amount.toFixed(2)),
      order_currency: "INR",
      customer_details: {
        customer_id: `DONOR_${randomUUID().replace(/-/g, "").slice(0, 24)}`,
        customer_name: input.donorName.slice(0, 90),
        customer_email: input.donorEmail,
        customer_phone: input.donorPhone,
      },
      ...(orderMeta ? { order_meta: orderMeta } : {}),
      order_note: `Donation for ${input.beneficiaryName}`.slice(0, 200),
    }),
  });

  return {
    orderId: result.order_id,
    paymentSessionId: result.payment_session_id,
    amount: result.order_amount,
    currency: result.order_currency,
  };
}

export function getCashfreeOrder(orderId: string) {
  return cashfreeRequest<{ order_status: string; order_amount: number; order_currency: string }>(
    `/orders/${encodeURIComponent(orderId)}`,
    { method: "GET" },
  );
}