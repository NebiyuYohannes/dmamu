from django.apps import AppConfig


class SalesPurchasesConfig(AppConfig):
    name = 'sales_purchases'
    verbose_name = "Sales & Purchases"

    def ready(self):
        import sales_purchases.signals  
