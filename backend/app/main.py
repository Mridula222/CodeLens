from fastapi import FastAPI
from app.routes.repository import router as repository_router
from app.routes.assistant import router as assistant_router
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI(title="CodeLens API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://codelens-frontend-gj6l.onrender.com",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return{
        "message": "CodeLens API is running"
    }

app.include_router(repository_router)
app.include_router(assistant_router)