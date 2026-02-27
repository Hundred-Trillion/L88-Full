# Quickstart

## 1. Setup (run once)

```bash
# From: ~/Desktop/Adithya/L88-Full/

# Install Tesseract (needed for OCR on scanned PDFs)
conda install -c conda-forge tesseract -y

python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

## 2. Ollama — pull the model (run once)

```bash
# Pull the primary model (GPU, 4-bit quantized)
ollama pull qwen2.5:7b-instruct-q4_K_M

# If you don't have a GPU, use the CPU fallback instead
ollama pull qwen2.5:14b
```

> After pulling, open `l88_backend/config.py` and make sure `LLM_MODEL` matches the model name you pulled.

---

## 3. Run the app (3 terminals)

**Terminal 1 — Ollama**
```bash
# Any directory
ollama serve
```

**Terminal 2 — Backend**
```bash
# From: ~/Desktop/Adithya/L88-Full/
source .venv/bin/activate
uvicorn l88_backend.main:app --reload --port 8000
```

**Terminal 3 — Frontend**
```bash
# From: ~/Desktop/Adithya/L88-Full/l88_frontend/
npm install   # first time only
npm run dev
```

Open **http://localhost:8888**

---

## Default login

```
Username: adithya   Password: adithya
Username: chetan    Password: chetan
```
