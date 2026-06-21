from fastapi import APIRouter, Depends, HTTPException
from db import supabase
from routers.auth import get_current_user
import stripe
import os

router = APIRouter()

@router.post("/session")
async def create_payment_session(thread_id: str, user=Depends(get_current_user)):
    stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
    # Get pending payment row
    payment = supabase.table("payments").select("*").eq("thread_id", thread_id).eq("status", "pending").single().execute()
    if not payment.data:
        raise HTTPException(404, "No pending payment found for this thread")
    p = payment.data
    if p["payer_id"] != user.id:
        raise HTTPException(403, "Only the payer can initiate payment")
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
        success_url=f"http://localhost:5173/pay/{thread_id}/success",
        cancel_url=f"http://localhost:5173/pay/{thread_id}",
        metadata={"payment_id": p["id"]}
    )
    supabase.table("payments").update({"stripe_session_id": session.id, "status": "processing"}).eq("id", p["id"]).execute()
    return {"url": session.url}