/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { subscriptionService } from "@/features/billing";

// Mock stripe instance for architectural purposes
const stripeMock = {
  webhooks: {
    constructEvent: (body: string, sig: string | null, secret: string | undefined) => {
      if (!sig || !secret) throw new Error("Missing stripe signature or secret");
      return JSON.parse(body);
    }
  }
};

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("Stripe-Signature");

  let event;
  try {
    event = stripeMock.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error(`[Webhook] Signature verification failed:`, err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        
        const stripeCustomerId = subscription.customer as string;
        const stripeSubId = subscription.id as string;
        // Map stripe price ID to internal plan ID
        const planId = mapStripePriceToPlanId(subscription.items.data[0].price.id);
        const status = subscription.status;
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

        await subscriptionService.handleSubscriptionUpsert(
          stripeCustomerId,
          stripeSubId,
          planId,
          status,
          currentPeriodEnd
        );
        break;
      }
      default:
        console.log(`[Webhook] Unhandled event type ${event.type}`);
    }

    return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
  } catch (error: any) {
    console.error(`[Webhook] Handler failed:`, error.message);
    return new NextResponse(`Webhook Handler Error: ${error.message}`, { status: 500 });
  }
}

// Mock mapping
function mapStripePriceToPlanId(priceId: string): string {
  const map: Record<string, string> = {
    "price_free": "plan_free",
    "price_growth": "plan_growth",
    "price_scale": "plan_scale",
    "price_enterprise": "plan_enterprise"
  };
  return map[priceId] || "plan_free";
}
