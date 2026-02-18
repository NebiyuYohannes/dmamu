from rest_framework import serializers
from .models import Account, Transaction

class AccountSerializer(serializers.ModelSerializer):
    balance = serializers.DecimalField(read_only=True,max_digits=15, decimal_places=2, default=0.00) 

    class Meta:
        model = Account
        fields = ['id', 'name', 'full_name','account_type', 'account_number', 'balance']

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ['id', 'account', 'type', 'amount', 'description', 'date', 'notes']

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