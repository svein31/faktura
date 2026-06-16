"""Faktury KSeF API - main FastAPI application."""
import config  # loads .env first

import logging

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from db import client
import auth
from routers import tools, companies, clients, settings, invoices, expenses, templates, dashboard, reports

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("faktura")

app = FastAPI(title="Faktura KSeF API")

# Routers
app.include_router(auth.router)
app.include_router(tools.router)
app.include_router(companies.router)
app.include_router(clients.router)
app.include_router(settings.router)
app.include_router(invoices.router)
app.include_router(expenses.router)
app.include_router(templates.router)
app.include_router(dashboard.router)
app.include_router(reports.router)


@app.get("/api/")
async def root():
    return {"message": "Faktura KSeF API", "status": "ok"}


@app.get("/api/health")
async def health():
    return {"status": "healthy"}


app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    try:
        await auth.ensure_indexes()
        await auth.seed_admin()
        logger.info("Startup complete (KSEF_MODE=%s, KSEF_ENV=%s)", config.KSEF_MODE, config.KSEF_ENV)
    except Exception as e:
        logger.error("DATABASE STARTUP ERROR: %s", e)


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# Serve static files from the 'static' directory if it exists (React SPA production build)
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=os.path.join(static_dir, "static")), name="static")

    from fastapi import HTTPException
    @app.get("/{path:path}")
    async def serve_spa(path: str):
        if path.startswith("api"):
            raise HTTPException(status_code=404, detail="Not Found")
        file_path = os.path.join(static_dir, path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(static_dir, "index.html"))

