from fastapi import APIRouter
from app.routers.ai.stayguide import router as stayguide_router

router = APIRouter(prefix="/ai", tags=["Voyara AI"])
router.include_router(stayguide_router, prefix="")
router.include_router(stayguide_router, prefix="/voyara")
router.include_router(stayguide_router, prefix="/stayguide")

__all__ = ["router"]

