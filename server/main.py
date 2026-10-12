import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.aircraft_routes import router as aircraft_router
from routes.auth_routes import router as auth_router
from routes.user_routes import router as user_router
from routes.maintenance_routes import router as maintenance_router
from routes.inspection_routes import router as inspection_router
from routes.dashboard_routes import router as dashboard_router
from routes.email_routes import router as email_router

load_dotenv()

app = FastAPI()

origins = [
    origin.strip() 
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/health")
def health():
    return {"message": "Server is running"}


app.include_router(auth_router, prefix="/api/v1")
app.include_router(aircraft_router, prefix="/api/v1")
app.include_router(user_router, prefix="/api/v1")
app.include_router(maintenance_router, prefix="/api/v1")
app.include_router(inspection_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(email_router, prefix="/api/v1")