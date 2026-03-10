from django.urls import path
from .views import (
    financial_overview_view, business_kpis_view, top_products_view, top_customers_view, 
    top_suppliers_view, top_products_chart_view, customer_growth_view, recent_activity_view
)

urlpatterns = [
    path('financial-overview/', financial_overview_view, name='financial-overview'),
    path('business-kpis/', business_kpis_view, name='business-kpis'),
    path('top-products/', top_products_view, name='top-products'),
    path('top-customers/', top_customers_view, name='top-customers'),
    path('top-suppliers/', top_suppliers_view, name='top-suppliers'),
    path('top-products-chart/', top_products_chart_view, name='top-products-chart'),
    path('customer-growth/', customer_growth_view, name='customer-growth'),
    path('recent-activity/', recent_activity_view, name='recent-activity'),
]