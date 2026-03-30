FROM python:3.12-slim-trixie
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files first (caching)
COPY pyproject.toml uv.lock ./

# Create venv and install
RUN uv venv --python /usr/local/bin/python3.12 .venv \
    && . .venv/bin/activate \
    && uv sync --frozen

COPY . .

RUN chmod +x entrypoint.sh

EXPOSE 8000

CMD ["uv", "run", "python", "manage.py", "runserver", "0.0.0.0:8000"]