# ECU Binary Compare API

Flask-based REST API for comparing ECU binary files and exporting differences as JSON. Designed to integrate with your existing Flask/Uvicorn/Celery/Redis stack.

## Quick Start

### Option 1: Run with Python (Development)

```bash
cd api
pip install -r requirements.txt
python ecu_compare.py
```

API will be available at `http://localhost:5000`

### Option 2: Run with Docker Compose

```bash
cd api
docker-compose up --build
```

This starts:
- Flask API on port 5000
- Redis on port 6379
- Celery worker (optional)

### Option 3: Run with Uvicorn (Production)

```bash
cd api
pip install -r requirements.txt
uvicorn ecu_compare:app --host 0.0.0.0 --port 5000 --workers 4
```

## API Endpoints

### Health Check
```
GET /api/health
```
Returns API status and version.

### Compare Files
```
POST /api/compare
Content-Type: multipart/form-data

file_a: <binary file>
file_b: <binary file>
```
Returns byte-level comparison results.

### Compare with Maps
```
POST /api/compare-with-maps
Content-Type: multipart/form-data

file_a: <binary file>
file_b: <binary file>
a2l_file: <A2L definition file> (optional)
```
Compares files and maps differences to A2L parameters.

### Demo Comparison
```
GET /api/demo
```
Returns pre-computed demo comparison with sample ECU data.

### Download Demo Files
```
GET /api/demo/files
```
Downloads sample binary files for testing.

### Parse A2L
```
POST /api/parse-a2l
Content-Type: multipart/form-data

file: <A2L file>
```
Parses A2L file and returns map definitions.

### Export JSON
```
POST /api/export/json
Content-Type: application/json

Body: <comparison result>
```
Downloads comparison as JSON file.

### Export CSV
```
POST /api/export/csv
Content-Type: application/json

Body: <comparison result>
```
Downloads comparison as CSV file.

## Example Usage

### Python Client

```python
from client_example import ECUCompareClient

client = ECUCompareClient("http://localhost:5000/api")

# Compare files
result = client.compare_files("original.bin", "modified.bin")

# Compare with A2L maps
result = client.compare_with_maps(
    "original.bin",
    "modified.bin",
    "definitions.a2l"
)

# Save results
client.save_json(result, "comparison.json")
```

### cURL Examples

Compare files:
```bash
curl -X POST http://localhost:5000/api/compare \
  -F "file_a=@original.bin" \
  -F "file_b=@modified.bin" \
  -o result.json
```

Compare with A2L:
```bash
curl -X POST http://localhost:5000/api/compare-with-maps \
  -F "file_a=@original.bin" \
  -F "file_b=@modified.bin" \
  -F "a2l_file=@definitions.a2l" \
  -o result.json
```

## Response Format

```json
{
  "metadata": {
    "tool": "ECU Binary Compare API",
    "version": "1.0.0",
    "timestamp": "2024-01-15T10:30:00Z",
    "file_a": {
      "name": "original.bin",
      "size": 8192,
      "md5": "abc123..."
    },
    "file_b": {
      "name": "modified.bin",
      "size": 8192,
      "md5": "def456..."
    }
  },
  "statistics": {
    "total_bytes": 8192,
    "bytes_changed": 6,
    "parameters_changed": 2,
    "percent_changed": 0.0732
  },
  "maps": [
    {
      "name": "Engine_Speed_Limit",
      "type": "VALUE",
      "address": 4660,
      "size": 2,
      "dimensions": [1]
    }
  ],
  "differences": [
    {
      "offset": "0x1234",
      "offset_decimal": 4660,
      "length": 2,
      "change_type": "MODIFIED",
      "parameter": "Engine_Speed_Limit",
      "parameter_type": "VALUE"
    }
  ]
}
```

## Integration with Existing Project

### Add to your Flask app:

```python
# your_app.py
from flask import Flask
from ecu_compare import app as ecu_app

app = Flask(__name__)

# Include ECU Compare routes
app.register_blueprint(ecu_app)
```

### Celery Integration:

```python
# tasks.py
from ecu_compare import create_celery_app

celery_app = create_celery_app()

@celery_app.task
def compare_ecu_files(file_a_id: str, file_b_id: str):
    # Async comparison logic
    pass
```

### Connect to existing Redis:

```python
celery = Celery(
    'tasks',
    broker='redis://your-redis:6379/0',
    backend='redis://your-redis:6379/0'
)
```

## Configuration

Environment variables:
- `FLASK_ENV`: development/production
- `REDIS_URL`: Redis connection URL
- `API_PORT`: Port to run on (default: 5000)

## License

MIT License
