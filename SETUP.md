# L88-Full Setup Guide

## 1. Create Virtual Environment

```bash
cd /home/aid-pc/Desktop/Adithya/L88-Full
python -m venv .venv
source .venv/bin/activate
```

## 2. Install Dependencies

```bash
pip install -r requirements.txt
```

## 3. Start Ollama

```bash
ollama serve &
```

## 4. Register Models (if not already done)

Create a file called `Modelfile-gpu`:
```
FROM qwen2.5:7b
PARAMETER num_ctx 16384
```

Create a file called `Modelfile-cpu`:
```
FROM qwen2.5:14b
PARAMETER num_ctx 16384
```

Then register:
```bash
ollama create qwen2.5-7b-awq -f Modelfile-gpu
ollama create qwen2.5:14b -f Modelfile-cpu
```

## 5. Start the Server

```bash
uvicorn l88_backend.main:app --reload
```

Server runs at `http://localhost:8000`. Docs at `http://localhost:8000/docs`.

## 6. Test the API

### Login
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "xxxx"}'
```

Save the `access_token` from the response.

### Create a Session
```bash
curl -X POST http://localhost:8000/sessions \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Session", "web_mode": false}'
```

### Upload a PDF
```bash
curl -X POST http://localhost:8000/sessions/<SESSION_ID>/documents \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@/path/to/your/paper.pdf"
```

### Chat
```bash
curl -X POST http://localhost:8000/sessions/<SESSION_ID>/chat \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the main contribution of this paper?"}'
```

### System Status (Admin)
```bash
curl http://localhost:8000/admin/system/status \
  -H "Authorization: Bearer <TOKEN>"
```
