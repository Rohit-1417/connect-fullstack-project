from fastapi import FastAPI

from app.database.database import engine, Base
from app.database import models
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth_routes,subscription_routes,wallet_routes,connection_routes,document_routes,call_routes,admin_routes

Base.metadata.create_all(bind=engine)

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500",
    "http://localhost:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Backend is working"}


app.include_router(auth_routes.router)

app.include_router(subscription_routes.router)

app.include_router(wallet_routes.router)

app.include_router(connection_routes.router)

app.include_router(document_routes.router)

app.include_router(call_routes.router)

app.include_router(admin_routes.router)