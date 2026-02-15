from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import OrderingFilter, SearchFilter
from crm.permissions import HasActiveSubscription
from .models import Sale, Purchase
from .serializers import SaleSerializer, PurchaseSerializer

class SaleViewSet(viewsets.ModelViewSet):
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated, HasActiveSubscription]
    filter_backends = [OrderingFilter, SearchFilter]
    search_fields = ['customer__name', 'notes']  
    ordering_fields = ['date', 'total', 'customer__name']

    def get_queryset(self):
        if self.request.user.role == 'super_admin':
            return Sale.objects.select_related('customer', 'company').all()
        return Sale.objects.select_related('customer', 'company').filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class PurchaseViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseSerializer
    permission_classes = [IsAuthenticated, HasActiveSubscription]
    filter_backends = [OrderingFilter, SearchFilter] 
    search_fields = ['supplier__name', 'notes'] 
    ordering_fields = ['date', 'total', 'supplier__name']

    def get_queryset(self):
        if self.request.user.role == 'super_admin':
            return Purchase.objects.select_related('supplier', 'company').all()
        return Purchase.objects.select_related('supplier', 'company').filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)