from rest_framework.routers import DefaultRouter
from .views import SaleViewSet, PurchaseViewSet,PurchaseDropdownViewSet,SaleDropdownViewSet

router = DefaultRouter()
router.register('sales', SaleViewSet,basename='sales')
router.register('purchases', PurchaseViewSet, basename='purchase')
router.register("purchase-dropdown",PurchaseDropdownViewSet,basename="purchase-dropdown")
router.register("sale-dropdown",SaleDropdownViewSet,basename="sale-dropdown")

urlpatterns = router.urls