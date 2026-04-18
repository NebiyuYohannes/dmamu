from rest_framework import viewsets,generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework import serializers
from crm.permissions import HasActiveSubscription
from .models import Sale, Purchase
from .models import Sale, Purchase,PaymentStatus,Supplier
from inventory.models import Inventory,Item,Warehouse
from .serializers import (SaleSerializer,
                          PurchaseSerializer,
                          PurchaseDropdownSerializer,
                          SaleDropdownSerializer,
                          SupplierDropdownSerializer,
                          ItemDropdownSerializer,
                          WarehouseDropdownSerializer)

class SaleViewSet(viewsets.ModelViewSet):
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated, HasActiveSubscription]

    def get_queryset(self):
        qs = Sale.objects.select_related('company')
        user_company = getattr(self.request.user, 'company', None)
        if self.request.user.role != 'super_admin' and user_company is not None:
            qs = qs.filter(company=user_company)
        return qs

    def perform_create(self, serializer):
        if not hasattr(self.request.user, 'company') or not self.request.user.company:
            raise serializers.ValidationError({"detail": "User must have an associated company."})
        serializer.save(company=self.request.user.company)


class PurchaseViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseSerializer
    permission_classes = [IsAuthenticated, HasActiveSubscription]

    def get_queryset(self):
        qs = Purchase.objects.select_related('company')
        user_company = getattr(self.request.user, 'company', None)
        if self.request.user.role != 'super_admin' and user_company is not None:
            qs = qs.filter(company=user_company)
        return qs

    def perform_create(self, serializer):
        if not hasattr(self.request.user, 'company') or not self.request.user.company:
            raise serializers.ValidationError({"detail": "User must have an associated company."})
        serializer.save(company=self.request.user.company)


class PurchaseDropdownViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Purchase.objects.all()
    serializer_class = PurchaseDropdownSerializer
    permission_classes = [IsAuthenticated,HasActiveSubscription]

    def get_queryset(self):
        qs = super().get_queryset()
        print("QUERYSET COUNT:", qs.count())

        user = self.request.user
        if user.role != "super_admin":
            qs = qs.filter(company=user.company)

        return qs.order_by("-id")


class SaleDropdownViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Sale.objects.all()
    serializer_class = SaleDropdownSerializer
    permission_classes = [IsAuthenticated,HasActiveSubscription]

    def get_queryset(self):
        qs = super().get_queryset()

        user = self.request.user
        if user.role != "super_admin":
            qs = qs.filter(company=user.company)

        return qs.order_by("-id")


class SupplierListForDropdown(generics.ListAPIView):
    serializer_class = SupplierDropdownSerializer
    pagination_class = None  

    def get_queryset(self):
        qs = Supplier.objects.select_related('company')
        user_company = getattr(self.request.user, 'company', None)
        if self.request.user.role != 'super_admin' and user_company is not None:
            qs = qs.filter(company=user_company)
        return qs

class ItemListForDropdown(generics.ListAPIView):
    serializer_class = ItemDropdownSerializer
    pagination_class = None

    def get_queryset(self):
        qs = Item.objects.select_related('company')
        user_company = getattr(self.request.user, 'company', None)
        if self.request.user.role != 'super_admin' and user_company is not None:
            qs = qs.filter(company=user_company)
        return qs

class WarehouseListForDropdown(generics.ListAPIView):
    serializer_class = WarehouseDropdownSerializer
    pagination_class = None

    def get_queryset(self):
        qs = Warehouse.objects.select_related('company')
        user_company = getattr(self.request.user, 'company', None)
        if self.request.user.role != 'super_admin' and user_company is not None:
            qs = qs.filter(company=user_company)
        return qs
