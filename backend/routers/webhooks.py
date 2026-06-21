from fastapi import APIRouter, Request, HTTPException
from db import supabase
from datetime import datetime, timezone
import stripe
import os

router = APIRouter()

@router.post("/stripe")
async def stripe_webhook(request: Request):
    stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET")
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(400, "Invalid signature")
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        payment_id = session["metadata"].get("payment_id")
        if payment_id:
            supabase.table("payments").update({
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "stripe_payment_intent_id": session.get("payment_intent")
            }).eq("id", payment_id).execute()
    return {"received": True}