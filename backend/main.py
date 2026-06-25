import logging
import os
import sys

# Add backend dir to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models import init_db
from routers import download, records, settings

# Setup logging
os.makedirs("data", exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler("data/yt-dlp-web.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger("yt-dlp-web")

app = FastAPI(
    title="yt-dlp Web UI",
    description="Video download system powered by yt-dlp",
    version="1.0.0",
)

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3200", "http://127.0.0.1:3200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(download.router)
app.include_router(records.router)
app.include_router(settings.router)


@app.on_event("startup")
async def startup():
    init_db()
    logger.info("yt-dlp Web UI started")
    # Ensure download directory exists
    os.makedirs("downloads", exist_ok=True)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8200, reload=True)
