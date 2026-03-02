from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, StockMovementViewSet,WarehouseViewSet,ItemViewSet,InventoryDropdownViewSet
from rest_framework.routers import DefaultRouter


router = DefaultRouter()
router.register('categories', CategoryViewSet,basename='category')
router.register('items', ItemViewSet,basename='item')
router.register('warehouses', WarehouseViewSet, basename='warehouse')
router.register('stock-movements', StockMovementViewSet,basename='stock-movement')
router.register("inventory-dropdown",InventoryDropdownViewSet,basename="inventory-dropdown")

urlpatterns = router.urls
