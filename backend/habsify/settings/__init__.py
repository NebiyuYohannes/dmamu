from decouple import config

ENV = config("ENV", default="dev")

if ENV == "prod":
    from .prod import *
else:
    from .dev import *

