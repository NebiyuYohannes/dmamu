from celery import shared_task
from datetime import date, timedelta
from .models import Task
from notifications.models import Notification

@shared_task
def notify_due_tasks():
    tomorrow = date.today() + timedelta(days=1)
    due_tasks = Task.objects.filter(due_date=tomorrow, completed=False)

    for task in due_tasks:
        Notification.objects.create(
            company=task.company,
            user=task.created_by,
            type='task_due',
            message=f"Task '{task.title}' is due tomorrow ({task.due_date}). Priority: {task.priority}"
        )