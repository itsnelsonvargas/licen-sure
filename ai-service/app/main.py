from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
import os
import httpx # For making the callback to Laravel for status updates
from .models import ProcessRequest
from .services import process_document_logic

app = FastAPI()

# --- Configuration ---
AI_SERVICE_SECRET = os.environ.get("AI_SERVICE_SECRET", "supersecretkey123") # Shared secret for internal communication

@app.post("/process-document")
async def process_document_endpoint(request: ProcessRequest, background_tasks: BackgroundTasks):
    """
    Receives a request to process a document, dispatches it to a background task,
    and immediately returns a response.
    """
    # 1. Authenticate the request from Laravel
    if request.secret != AI_SERVICE_SECRET:
        raise HTTPException(status_code=403, detail="Unauthorized: Invalid secret")

    # 2. Run the heavy processing in the background
    background_tasks.add_task(
        process_document_logic,
        document_id=request.document_id,
        file_path=request.file_path
    )
    
    return {"message": "Document processing initiated.", "document_id": request.document_id}

@app.get("/")
async def root():
    return {"message": "Python AI Service is running!"}

