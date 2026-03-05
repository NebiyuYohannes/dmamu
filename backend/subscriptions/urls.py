from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SubscriptionPlanViewSet, SubscriptionViewSet,
    PaymentMethodViewSet, BankAccountViewSet)

router = DefaultRouter()
router.register('plans', SubscriptionPlanViewSet, basename='plan')
router.register('subscriptions', SubscriptionViewSet, basename='subscription')
router.register('paymentmethod-dropdown', PaymentMethodViewSet, basename='paymentmethod')
router.register('bankaccount-dropdown', BankAccountViewSet, basename='bankaccount')


urlpatterns = [
    path('', include(router.urls)),
]