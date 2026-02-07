from django.contrib import admin
from django.db.models import Count
from django.utils.html import format_html
from django.urls import reverse
from .models import Company

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'owner',
        'subscription_plan',
        'member_count',
        'created_at',
        'is_active',
    )
    list_filter = ('is_active',)
    list_editable = ('is_active',)
    search_fields = ('name',)

    # override queryset to annotate member count
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        qs = qs.select_related('owner', 'subscription', 'subscription__plan')
        qs = qs.annotate(member_total=Count('members'))
        return qs

    # use the annotated field for O(1) access
    def member_count(self, obj):
        count = obj.member_total
        url = (
            reverse('admin:accounts_user_changelist')
            + '?company__id__exact=' + str(obj.id)
        )
        return format_html('<a href="{}">{} Members</a>', url, count)
    member_count.admin_order_field = 'member_total' 

    # subscription plan method
    def subscription_plan(self, obj):
        if hasattr(obj, 'subscription'):
            return obj.subscription.plan.name
        return '—'
    subscription_plan.short_description = 'Plan'
    subscription_plan.admin_order_field = 'subscription__plan__name' 
