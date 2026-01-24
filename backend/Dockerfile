# Use fixed Python version
FROM python:3.12.3-slim-bullseye

# Prevent .pyc and buffer stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install uv (fixed version)
RUN pip install --no-cache-dir "uv==0.9.26"

# Copy pyproject + lock first to leverage Docker cache
COPY pyproject.toml uv.lock ./

# Install dependencies exactly as locked
RUN uv sync --frozen

# Copy the app code
COPY . .

# Expose port and run Gunicorn
EXPOSE 8000
CMD ["gunicorn", "habsify.wsgi:application", "--bind", "0.0.0.0:8000"]
