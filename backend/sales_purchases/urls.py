from rest_framework.routers import DefaultRouter
from .views import SaleViewSet, PurchaseViewSet

router = DefaultRouter()
router.register('sales', SaleViewSet,basename='sales')
router.register('purchases', PurchaseViewSet, basename='purchase')

urlpatterns = router.urls