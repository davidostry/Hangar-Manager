from fastapi import FastAPI

from routes.aircraft_routes import router as aircraft_router
from routes.auth_routes import router as auth_router
from routes.user_routes import router as user_router
from routes.maintenance_routes import router as maintenance_router

app = FastAPI()


@app.get("/health")
def health():
    return {"message": "Server is running"}


app.include_router(auth_router, prefix="/api/v1")
app.include_router(aircraft_router, prefix="/api/v1")
app.include_router(user_router, prefix="/api/v1")
app.include_router(maintenance_router, prefix="/api/v1")