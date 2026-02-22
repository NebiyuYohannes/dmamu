from django.db.models import Sum, Value, DecimalField,IntegerField
from django.db.models.functions import Coalesce
from rest_framework import viewsets
from rest_framework.filters import SearchFilter,OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.serializers import ValidationError
from .models import Supplier
from .serializers import SupplierListSerializer, SupplierHistorySerializer
from sales_purchases.models import Purchase
from crm.permissions import IsBusinessAdmin,HasActiveSubscription
from .utils import export_supplier_history

class SupplierViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated,IsBusinessAdmin,HasActiveSubscription]
    filter_backends = [OrderingFilter, SearchFilter, DjangoFilterBackend]
    search_fields = ['name', 'address']
    ordering_fields = ['name', 'created_at','balance']
    filterset_fields = ['name']

    def get_queryset(self):
        return Supplier.objects.annotate(
            products=Coalesce(Sum('purchase__quantity'), Value(0, output_field=IntegerField())),
            balance=Coalesce(Sum('purchase__total'), Value(0, output_field=DecimalField()))
        )

    def get_serializer_class(self):
        return SupplierListSerializer

    def retrieve(self, request, pk=None):
        supplier = self.get_queryset().filter(pk=pk).first()
        if not supplier:
            return Response({"detail": "Not found"}, status=404)

        purchases = Purchase.objects.filter(supplier=supplier).order_by('-date')
        serializer = SupplierHistorySerializer(purchases, many=True)

        export_type = request.query_params.get("export")

        if export_type:
            response = export_supplier_history(export_type, serializer.data, pk)
            if response:
                return response
            return Response({"detail": "Unsupported export type"}, status=400)

        return Response(serializer.data)
    def perform_create(self, serializer):
        if not hasattr(self.request.user, 'company') or not self.request.user.company:
            raise ValidationError("User must have an associated company.")
        serializer.save(company=self.request.user.company)