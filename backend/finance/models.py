from django.db import models
from core.models import Company
from sales_purchases.models import Sale, Purchase 
from suppliers.models import Supplier 

class Account(models.Model):
    TYPE_CHOICES = [
        ('cash', 'Cash on Hand'),
        ('bank', 'Bank Account'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='accounts')
    name = models.CharField(max_length=100)  
    full_name = models.CharField(max_length=255)  
    account_type = models.CharField(max_length=10, choices=TYPE_CHOICES,default='bank')
    account_number = models.CharField(max_length=50, blank=True) 
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=0.00) 
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.get_account_type_display()}) - Balance: {self.balance}"

class Transaction(models.Model):
    TYPE_CHOICES = [
        ('inflow', 'Inflow (Income)'),
        ('outflow', 'Outflow (Expense)'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='transactions')
    account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, related_name='transactions')
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.CharField(max_length=255)  
    reference = models.CharField(max_length=100, blank=True) 
    linked_sale = models.ForeignKey(Sale, on_delete=models.SET_NULL, null=True, blank=True)
    linked_purchase = models.ForeignKey(Purchase, on_delete=models.SET_NULL, null=True, blank=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True)  
    date = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.get_type_display()} {self.amount} on {self.date} - {self.description}"