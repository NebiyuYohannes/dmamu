# Use a lightweight Python base
FROM python:3.12-slim

# Avoid Python writing pyc files and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set working directory in the container
WORKDIR /app

# Install uv package manager
RUN pip install --no-cache-dir uv

# Copy dependency files first (to leverage caching)
COPY pyproject.toml uv.lock ./

# Install all dependencies according to lockfile
RUN uv sync --frozen

# Copy the rest of the project code
COPY . .

# Command to run Django backend with Gunicorn
CMD ["gunicorn", "habsify.wsgi:application", "--bind", "0.0.0.0:8000"]
