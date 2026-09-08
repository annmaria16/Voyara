from fastapi import APIRouter
from app.routers.customer.search import router as search_router
from app.routers.customer.bookings import router as bookings_router
from app.routers.customer.payments import router as payments_router
from app.routers.customer.reviews import router as reviews_router

router = APIRouter(prefix="/customer", tags=["Customer"])
router.include_router(search_router)
router.include_router(bookings_router)
router.include_router(payments_router)
router.include_router(reviews_router)
