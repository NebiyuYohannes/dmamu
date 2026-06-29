from .celery import app as celery_app
from decouple import config

__all__ = ('celery_app',)


ENV = config("ENV", default="dev")

if ENV == "prod":
    from .prod import *
else:
    from .dev import *
