from fastapi import APIRouter
from app.routers.auth.router import router as auth_router
from app.routers.customer.router import router as customer_router
from app.routers.provider.router import router as provider_router
from app.routers.admin.router import router as admin_router
from app.routers.verinova.router import router as verinova_router
from app.routers.upload.router import router as upload_router
from app.routers.support.router import router as support_router
from app.routers.notifications.router import router as notifications_router
from app.routers.ai.router import router as ai_router
from app.routers.bookings.messaging_router import router as messaging_router
from app.routers.legal_documents import router as legal_documents_router

api_router = APIRouter(prefix="/api")

api_router.include_router(auth_router)
api_router.include_router(customer_router)
api_router.include_router(provider_router)
api_router.include_router(admin_router)
api_router.include_router(verinova_router)
api_router.include_router(upload_router)
api_router.include_router(support_router)
api_router.include_router(notifications_router)
api_router.include_router(ai_router)
api_router.include_router(messaging_router)
api_router.include_router(legal_documents_router)

__all__ = ["api_router"]
