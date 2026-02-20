from rest_framework import viewsets,mixins
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import OrderingFilter, SearchFilter
from django_filters.rest_framework import DjangoFilterBackend
from crm.permissions import HasActiveSubscription
from .models import Item, Category, StockMovement
from .serializers import ItemListSerializer,ItemDetailSerializer,CategorySerializer,StockMovementSerializer

class CategoryViewSet(mixins.CreateModelMixin,mixins.DestroyModelMixin,mixins.ListModelMixin,viewsets.GenericViewSet):
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated, HasActiveSubscription]

    def get_queryset(self):
        if self.request.user.role == 'super_admin':
            return Category.objects.all()
        return Category.objects.filter(company=self.request.user.company) 

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

class ItemViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasActiveSubscription]
    filter_backends = [OrderingFilter, SearchFilter,DjangoFilterBackend]
    search_fields = ['name', 'code', 'warehouse_address']
    ordering_fields = ['name', 'current_stock', 'unit_price', 'category__name']
    filterset_fields = ['category']

    def get_queryset(self):
        if self.request.user.role == 'super_admin':
            return Item.objects.select_related('category', 'company').all()
        return Item.objects.select_related('category', 'company').filter(company=self.request.user.company)

    def get_serializer_class(self):
        if self.request.method == 'GET' and 'pk' not in self.kwargs:  # List view
            return ItemListSerializer
        return ItemDetailSerializer  # Detail or create/update

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

class StockMovementViewSet(viewsets.ModelViewSet):
    serializer_class = StockMovementSerializer
    permission_classes = [IsAuthenticated, HasActiveSubscription]

    def get_queryset(self):
        if self.request.user.role == 'super_admin':
            return StockMovement.objects.select_related('item__company').all()
        return StockMovement.objects.select_related('item__company').filter(item__company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save()  