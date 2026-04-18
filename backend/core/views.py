from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .models import Company
from .serializers import CompanyPlanSerializer


class CompanyPlanView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = Company.objects.get(owner=request.user)

        data = {
            "plan_name": company.plan.name if company.plan else "No Plan",
            "max_members": company.plan.max_members if company.plan else 0,
            "members_used": company.members_used,
            "remaining_members": company.remaining_members(),
            "trial_days_left": company.trial_days_left(),
        }

        serializer = CompanyPlanSerializer(data)
        return Response(serializer.data)
