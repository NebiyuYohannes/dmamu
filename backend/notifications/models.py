from django.db import models
from core.models import Company
from accounts.models import User

class Notification(models.Model):
    TYPE_CHOICES = [
        ('low_stock', 'Low Stock'),
        ('sub_expiry', 'Subscription Expiry'),
        ('payment_due', 'Payment Due'),
        ('task_due', 'Task Due'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='notifications')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='notifications')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    message = models.TextField()  
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_type_display()} for {self.user or self.company} - {self.created_at}"