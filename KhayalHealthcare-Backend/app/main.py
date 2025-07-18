from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
import logging
import os
import json
from pathlib import Path
import asyncio
from app.config.database import connect_to_mongo, close_mongo_connection, get_database
from app.routers import (
    auth, user, admin, vitals, meals, orders, appointments, messages, visit_requests, advertisements, coupons, subscription_plans
)
from app.utils.cleanup import cleanup_expired_verifications
from app.utils.initial_setup import create_default_admins  # Add this import

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Khayal API",
    description="API for the Khayal health and wellness application",
    version="1.0.0",
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add startup event to create default admins
async def startup_event():
    """Handle all startup tasks"""
    # Connect to MongoDB
    await connect_to_mongo()
    
    # Create default admin users if needed
    db = await get_database()
    await create_default_admins(db)

# Database connection events
app.add_event_handler("startup", startup_event)
app.add_event_handler("shutdown", close_mongo_connection)

# Include routers (rest of your router includes remain the same)
app.include_router(auth.router, prefix="/api")
app.include_router(user.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(vitals.router, prefix="/api")
app.include_router(meals.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(appointments.router, prefix="/api")
app.include_router(messages.router, prefix="/api")
app.include_router(visit_requests.router, prefix="/api")
app.include_router(advertisements.router, prefix="/api")
app.include_router(coupons.router, prefix="/api")
app.include_router(subscription_plans.router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

# IMPORTANT: Mount uploads directory BEFORE any catch-all routes
uploads_dir = Path("uploads")
if uploads_dir.exists() and uploads_dir.is_dir():
    logger.info(f"Uploads directory found at {uploads_dir.absolute()}")
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
else:
    logger.warning(f"Uploads directory not found at {uploads_dir.absolute()}")
    # Create uploads directory if it doesn't exist
    uploads_dir.mkdir(exist_ok=True)
    (uploads_dir / "advertisements").mkdir(exist_ok=True)
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Serve static files
static_dir = Path("static")
if static_dir.exists() and static_dir.is_dir():
    logger.info(f"Static directory found at {static_dir.absolute()}")
    
    # Mount static assets
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")
    
    # Serve favicon
    @app.get("/favicon.svg")
    async def favicon():
        favicon_path = static_dir / "favicon.svg"
        if favicon_path.exists():
            return FileResponse(favicon_path, media_type="image/svg+xml")
        return JSONResponse({"error": "favicon not found"}, status_code=404)
    
    # Serve manifest.json with proper content type and validation
    @app.get("/manifest.json")
    async def manifest():
        manifest_path = static_dir / "manifest.json"
        if manifest_path.exists():
            try:
                # Validate JSON before serving
                with open(manifest_path, 'r', encoding='utf-8') as f:
                    manifest_data = json.load(f)
                return JSONResponse(
                    content=manifest_data,
                    media_type="application/manifest+json",
                    headers={
                        "Cache-Control": "public, max-age=604800",
                        "Access-Control-Allow-Origin": "*"
                    }
                )
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON in manifest.json: {e}")
                return JSONResponse({"error": "Invalid manifest JSON"}, status_code=500)
        return JSONResponse({"error": "manifest not found"}, status_code=404)
    
    # Serve other static files
    @app.get("/{filename:path}")
    async def serve_static_files(filename: str):
        # Skip API routes
        if filename.startswith("api/"):
            return JSONResponse({"detail": "Not found"}, status_code=404)
        
        # Skip uploads routes - they're handled by the mounted StaticFiles
        if filename.startswith("uploads/"):
            return JSONResponse({"detail": "Not found"}, status_code=404)
        
        # Check for specific static files
        file_path = static_dir / filename
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        
        # For all other routes, serve index.html (SPA routing)
        index_path = static_dir / "index.html"
        if index_path.exists():
            return FileResponse(index_path, media_type="text/html")
        
        return HTMLResponse("<h1>Frontend not found</h1>", status_code=404)

else:
    logger.warning("Static directory not found - running in development mode")
    
    @app.get("/{full_path:path}")
    async def catch_all(full_path: str):
        # Skip API routes
        if full_path.startswith("api/"):
            return JSONResponse({"detail": "Not found"}, status_code=404)
        
        # Skip uploads routes - they're handled by the mounted StaticFiles
        if full_path.startswith("uploads/"):
            return JSONResponse({"detail": "Not found"}, status_code=404)
            
        return {"message": "Frontend not built. Run 'npm run build' in frontend directory."}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
