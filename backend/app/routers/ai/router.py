from fastapi import APIRouter
from app.routers.ai.stayguide import router as stayguide_router
from app.routers.ai.trip_planner_router import router as trip_planner_router

router = APIRouter(prefix="/ai", tags=["Voyara AI"])
router.include_router(stayguide_router, prefix="")
router.include_router(stayguide_router, prefix="/voyara")
router.include_router(stayguide_router, prefix="/stayguide")
router.include_router(trip_planner_router, prefix="")

__all__ = ["router"]


