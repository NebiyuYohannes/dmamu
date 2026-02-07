from django.contrib import admin
from django.utils.html import format_html
from .models import SubscriptionPlan, Subscription, PaymentMethod, Payment, BankAccount, Feature

# Register Feature simply
@admin.register(Feature)
class FeatureAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name',)

# SubscriptionPlanAdmin: Admin can add plans with name, price, user limit, features (checkboxes), trial days
@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'price_monthly', 'user_limit', 'trial_days', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name',)
    list_editable = ('is_active',)
    filter_horizontal = ('features',)
    fieldsets = (
        (None, {'fields': ('name', 'price_monthly', 'user_limit', 'features', 'trial_days')}),
        ('Status', {'fields': ('is_active',)}),
    )
    actions = ['activate', 'deactivate']

    def activate(self, request, queryset):
        queryset.update(is_active=True)
        self.message_user(request, "Selected items activated.")
    activate.short_description = "Activate selected"

    def deactivate(self, request, queryset):
        queryset.update(is_active=False)
        self.message_user(request, "Selected items deactivated.")
    deactivate.short_description = "Deactivate selected"

# Inline for Payments under Subscriptions
class PaymentInline(admin.TabularInline):
    model = Payment
    autocomplete_fields=['payment_method','bank_account']
    extra = 1
    readonly_fields = ('created_at',)
    fields = ('amount', 'payment_method', 'bank_account', 'transaction_id', 'proof', 'approved')

# SubscriptionAdmin: Admin can add new subscriptions with company, plan (incl. price), start/end dates (for duration), etc.
@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('company', 'plan', 'start_date', 'end_date', 'active')
    list_filter = ('active', 'plan')
    autocomplete_fields = ['company','plan']
    search_fields = ('company__name', 'plan__name')
    list_editable = ('active',)
    readonly_fields = ('start_date',)
    fieldsets = (
        (None, {'fields': ('company', 'plan', 'start_date', 'end_date')}),
        ('Status', {'fields': ('active',)}),
    )
    inlines = [PaymentInline]
    actions = ['activate', 'deactivate']  

# PaymentMethodAdmin
@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'code')
    list_editable = ('is_active',)
    readonly_fields = ('created_at',)
    actions = ['activate', 'deactivate']

# PaymentAdmin: For approving payments with transaction ID and proof
@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('subscription', 'amount', 'payment_method', 'transaction_id', 'proof_link', 'approved', 'created_at')
    list_filter = ('approved', 'payment_method')
    search_fields = ('transaction_id', 'subscription__company__name')
    list_editable = ('approved',)
    readonly_fields = ('created_at', 'proof_link')

    def proof_link(self, obj):
        if obj.proof:
            return format_html('<a href="{}" target="_blank">View Proof</a>', obj.proof.url)
        return "No proof"
    proof_link.short_description = 'Proof'

    actions = ['approve', 'reject']

    def approve(self, request, queryset):
        queryset.update(approved=True)
        self.message_user(request, "Payments approved.")
    approve.short_description = "Approve selected"

    def reject(self, request, queryset):
        queryset.update(approved=False)
        self.message_user(request, "Payments rejected.")
    reject.short_description = "Reject selected"

# BankAccountAdmin
@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display = ('bank_name', 'account_number', 'account_holder', 'is_active')
    list_filter = ('is_active', 'bank_name')
    search_fields = ('bank_name', 'account_number')
    list_editable = ('is_active',)
    actions = ['activate', 'deactivate']