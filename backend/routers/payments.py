from fastapi import APIRouter, Depends, HTTPException
from db import supabase
from routers.auth import get_current_user
import stripe
import os

router = APIRouter()
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

@router.post("/session")
async def create_payment_session(thread_id: str, user=Depends(get_current_user)):
    try:
        # Get pending payment row
        payment = supabase.table("payments").select("*").eq("thread_id", thread_id).eq("status", "pending").single().execute()
        if not payment.data:
            raise HTTPException(404, "No pending payment found for this thread")
        p = payment.data
        if p["payer_id"] != user.id:
            raise HTTPException(403, "Only the payer can initiate payment")
        try:
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[{
                    "price_data": {
                        "currency": p["currency"].lower(),
                        "product_data": {"name": "Travel Couriers — Delivery Fee"},
                        "unit_amount": int(float(p["amount"]) * 100),
                    },
                    "quantity": 1,
                }],
                mode="payment",
                success_url=f"{FRONTEND_URL}/pay/{thread_id}/success",
                cancel_url=f"{FRONTEND_URL}/pay/{thread_id}",
                metadata={"payment_id": p["id"]}
            )
        except stripe.error.StripeError as e:
            raise HTTPException(400, f"Stripe error: {str(e)}")
        supabase.table("payments").update({"stripe_session_id": session.id, "status": "processing"}).eq("id", p["id"]).execute()
        return {"url": session.url}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Failed to create payment session: {str(e)}")