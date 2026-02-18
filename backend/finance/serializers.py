from rest_framework import serializers
from .models import Account, Transaction

class AccountSerializer(serializers.ModelSerializer):
    balance = serializers.DecimalField(read_only=True,max_digits=15, decimal_places=2, default=0.00) 

    class Meta:
        model = Account
        fields = ['id', 'name', 'full_name','account_type', 'account_number', 'balance']

class TransactionSerializer(serializers.ModelSerializer):
    bank_account = serializers.CharField(source='account.full_name',read_only=True)
    class Meta:
        model = Transaction
        fields = ['id', 'account', 'type', 'amount', 'description', 'date', 'notes','balance_at_time','bank_account']
        read_only_fields = ['date', 'balance_at_time']

    def validate(self, data):
        # Auto-update account balance
        account = data.get('account')
        if account:
            if data['type'] == 'inflow':
                account.balance += data['amount']
            else:
                account.balance -= data['amount']
            account.save()
        return data