from fastapi import APIRouter
from app.routers.customer.search import router as search_router
from app.routers.customer.bookings import router as bookings_router

router = APIRouter(prefix="/customer", tags=["Customer"])
router.include_router(search_router)
router.include_router(bookings_router)
