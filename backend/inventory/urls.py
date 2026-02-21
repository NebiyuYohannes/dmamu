from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, StockMovementViewSet,WarehouseViewSet,ItemViewSet
from rest_framework.routers import DefaultRouter


router = DefaultRouter()
router.register('categories', CategoryViewSet,basename='category')
router.register('items', ItemViewSet, basename='item')
router.register('warehouses', WarehouseViewSet, basename='warehouse')
router.register('stock-movements', StockMovementViewSet,basename='stock-movement')

urlpatterns = router.urls
