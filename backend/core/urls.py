from django.urls import path
from .views import CompanyPlanView

urlpatterns = [
    path("plan/", CompanyPlanView.as_view(), name="company-plan"),
]