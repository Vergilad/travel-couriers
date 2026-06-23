from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers.auth import get_current_user
from routers import listings, threads, messages, matches, payments, webhooks, reviews, reports

load_dotenv()

app = FastAPI(title="Travel-Couriers")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(listings.router, prefix="/api/listings", tags=["listings"])
app.include_router(threads.router, prefix="/api/threads", tags=["threads"])
app.include_router(messages.router, prefix="/api/messages", tags=["messages"])
app.include_router(matches.router, prefix="/api/matches", tags=["matches"])
app.include_router(payments.router, prefix="/api/payments", tags=["payments"])
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["webhooks"])
app.include_router(reviews.router, prefix="/api/reviews", tags=["reviews"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/api/me")
async def me(user=Depends(get_current_user)):
    return {"id": user.id, "email": user.email}