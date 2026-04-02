# ECU Binary Compare API - Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY ecu_compare.py .

# Expose port
EXPOSE 5000

# Run with uvicorn (for production) or flask (for development)
CMD ["python", "ecu_compare.py"]
