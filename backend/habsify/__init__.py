from .celery import app as celery_app
from decouple import config

__all__ = ('celery_app',)
