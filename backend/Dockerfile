FROM python:3.11-slim

# Install system dependencies and DuckDB CLI
RUN apt-get update && apt-get install -y \
    wget \
    unzip \
    git \
    build-essential \
    libssl-dev \
    libc6-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Install DuckDB CLI
RUN wget https://github.com/duckdb/duckdb/releases/download/v1.1.3/duckdb_cli-linux-amd64.zip \
    && unzip duckdb_cli-linux-amd64.zip -d /usr/local/bin \
    && rm duckdb_cli-linux-amd64.zip

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directory for DuckDB data
RUN mkdir -p /data

# Expose port
EXPOSE 8000

# Start the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
