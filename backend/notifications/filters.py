import django_filters
from .models import Notification

class NotificationFilter(django_filters.FilterSet):
    source = django_filters.CharFilter(method='filter_source')

    class Meta:
        model = Notification
        fields = ['source']  # can add more fields if needed

    def filter_source(self, queryset, name, value):
        """
        Convert ?source=inventory into type__in=['low_stock'], etc.
        """
        source_type_map = {
            'inventory': ['low_stock'],
            'finance': ['payment_due'],
            'subscriptions': ['sub_expiry'],
            'tasks': ['task_due'],
        }
        types = source_type_map.get(value.lower(), [])
        if types:
            return queryset.filter(type__in=types)
        return queryset