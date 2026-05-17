from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SubscriptionPlanView, SubscriptionViewSet,
    PaymentMethodViewSet, BankAccountViewSet,AccessStatusView)

router = DefaultRouter()
router.register('plans', SubscriptionPlanView, basename='plan')
router.register('subscriptions', SubscriptionViewSet, basename='subscription')
router.register('paymentmethod-dropdown', PaymentMethodViewSet, basename='paymentmethod')
router.register('bankaccount-dropdown', BankAccountViewSet, basename='bankaccount')


urlpatterns = [
    path('', include(router.urls)),
    path("me/access-status/", AccessStatusView.as_view(), name="access-status"),
]