"""
FastAPI Backend Application
Quantitative Trading Analytics Platform
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from config import API_TITLE, API_DESCRIPTION, API_VERSION, HOST, PORT
from routes import stream_router, data_router, websocket_router, alerts_router, export_router
from utils.database import init_database
from models.schemas import HealthResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("🚀 Initializing database...")
    init_database()
    print("✅ Database initialized")
    yield
    # Shutdown
    print("🛑 Shutting down...")


# Create FastAPI app
app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(stream_router)
app.include_router(data_router)
app.include_router(websocket_router)
app.include_router(alerts_router)
app.include_router(export_router)


@app.get("/", response_model=HealthResponse)
async def root():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        message="Quantitative Trading Analytics API",
        version=API_VERSION
    )


@app.get("/health", response_model=HealthResponse)
async def health():
    """Detailed health check"""
    return HealthResponse(
        status="healthy",
        message="All systems operational",
        version=API_VERSION
    )


def main():
    """Run the application"""
    print(f"""
    ╔══════════════════════════════════════════════════════════╗
    ║   Quantitative Trading Analytics Platform - Backend     ║
    ║                                                          ║
    ║   API Documentation: http://{HOST}:{PORT}/docs            ║
    ║   Health Check: http://{HOST}:{PORT}/health               ║
    ╚══════════════════════════════════════════════════════════╝
    """)
    
    uvicorn.run(
        "backend.main:app",
        host=HOST,
        port=PORT,
        reload=True,
        log_level="info"
    )


if __name__ == "__main__":
    main()
