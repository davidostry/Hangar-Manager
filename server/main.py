from fastapi import FastAPI

from routes.aircraft_routes import router as aircraft_router


app = FastAPI()


@app.get("/health")
def health():
    return {"message": "Server is running"}


app.include_router(aircraft_router, prefix="/api/v1")