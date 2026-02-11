from django.core.management.base import BaseCommand
from django.utils import timezone
from subscriptions.models import Subscription

class Command(BaseCommand):
    help = 'Deactivate expired paid subscriptions every night'

    def handle(self, *args, **options):
        today = timezone.now().date()
        count = Subscription.objects.filter(
            active=True,
            end_date__lt=today,
            plan__price_monthly__gt=0
        ).update(active=False)

        self.stdout.write(self.style.SUCCESS(f'Deactivated {count} expired subscriptions'))