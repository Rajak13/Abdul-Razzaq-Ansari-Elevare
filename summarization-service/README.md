# PEGASUS Summarization Service

A FastAPI-based service that provides AI-powered text summarization using the PEGASUS transformer model for the Elevare note-taking application.

## Setup

### 1. Create Virtual Environment

```bash
cd summarization-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Environment Configuration

Copy the example environment file and configure as needed:

```bash
cp .env.example .env
```

### 4. Run the Service

```bash
# Development mode with auto-reload
python app/main.py

# Or using uvicorn directly
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

## API Endpoints

### Health Check
- **GET** `/health` - Service health status
- **GET** `/` - Service information and available endpoints

### Summarization
- **POST** `/summarize` - Generate text summary (placeholder in task 1, full implementation in task 2)

## Project Structure

```
summarization-service/
├── app/
│   ├── __init__.py
│   └── main.py          # FastAPI application
├── requirements.txt     # Python dependencies
├── .env.example        # Environment configuration template
└── README.md           # This file
```

## Development Notes

- The service runs on port 8001 by default
- CORS is configured to allow requests from localhost:3000 (Next.js)
- The `/summarize` endpoint is currently a placeholder and will be fully implemented in task 2
- Model loading and PEGASUS integration will be added in subsequent tasks