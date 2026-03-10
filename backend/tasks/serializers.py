from rest_framework import serializers
from django.utils import timezone
from .models import Task

class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'priority', 'due_date',
            'completed', 'completed_at', 'created_at', 'created_by'
        ]
        read_only_fields = ['completed_at', 'created_at', 'created_by']

    def validate_due_date(self, value):
        if value < timezone.now().date():
            raise serializers.ValidationError("Due date cannot be in the past.")
        return value

    def create(self, validated_data):
        validated_data.pop("completed", None)
        validated_data['created_by'] = self.context['request'].user
        validated_data['company'] = self.context['request'].user.company
        return super().create(validated_data)