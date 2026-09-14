from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from routers.auth import get_current_user
from routers import listings, threads, messages, matches, reviews, reports, profiles, verification
from routers.auth import router as auth_router
from routers.files import router as files_router, files_app

load_dotenv()

app = FastAPI(title="Travel-Couriers")

# Same-origin needs no CORS (dev proxy + prod one-host routing). Only list
# extra origins here when the frontend is hosted on its own domain.
CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(files_router, prefix="/api/files", tags=["files"])
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(listings.router, prefix="/api/listings", tags=["listings"])
app.include_router(threads.router, prefix="/api/threads", tags=["threads"])
app.include_router(messages.router, prefix="/api/messages", tags=["messages"])
app.include_router(matches.router, prefix="/api/matches", tags=["matches"])
app.include_router(reviews.router, prefix="/api/reviews", tags=["reviews"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(profiles.router, prefix="/api/profiles", tags=["profiles"])
app.include_router(verification.router, prefix="/api/verification", tags=["verification"])

@app.get("/health")
async def health():
    return {"status": "ok"}

app.mount("/files", files_app(), name="files")

@app.get("/api/me")
async def me(user=Depends(get_current_user)):
    return {"id": user.id, "email": user.email}
