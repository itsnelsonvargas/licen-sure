import httpx
import os
import json
import uuid
from typing import List, Dict

# External libraries for text extraction
import pytesseract
from PIL import Image # Pillow for image processing
from pypdf import PdfReader
from docx import Document as DocxDocument # Renamed to avoid conflict

# Internal models
from .models import QuestionData, ChoiceData, AICallbackPayload

# --- Configuration ---
# These would typically come from environment variables
# For now, placeholders for local development
LARAVEL_CALLBACK_URL = os.environ.get("LARAVEL_CALLBACK_URL", "http://localhost:8000/api/documents/{document_id}/questions")
AI_SERVICE_SECRET = os.environ.get("AI_SERVICE_SECRET", "supersecretkey123")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "http://localhost:54321") # Placeholder
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...") # Placeholder

# --- Helper Functions for Text Extraction ---

import shutil

def _download_file_from_supabase(file_path: str, local_path: str):
    """
    Simulates downloading a file from Supabase Storage.
    In a real scenario, you'd use the Supabase Python SDK.
    For now, assume the file is available at `file_path` on the local filesystem
    (e.g., mounted volume in Docker, or accessible by the AI service).
    Or, more realistically for a microservice, Laravel would pass the file content directly
    or a signed URL for direct download.
    For this MVP, we'll assume a dummy local file for testing purposes.
    """
    # Placeholder: In a real scenario, this would involve Supabase client
    # Example:
    # from supabase import create_client, Client
    # supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    # bucket_name = file_path.split('/')[0] # e.g., 'documents'
    # path_in_bucket = '/'.join(file_path.split('/')[1:])
    # response = supabase.storage.from_(bucket_name).download(path_in_bucket)
    # with open(local_path, 'wb') as f:
    #     f.write(response)
    
    # For local dev, try to find the file in the backend storage
    # We are in ai-service/app/services.py -> ../../backend/storage/app/private
    try:
        base_storage_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend/storage/app/private"))
        source_file_path = os.path.join(base_storage_path, file_path)
        
        if os.path.exists(source_file_path):
             shutil.copy2(source_file_path, local_path)
             print(f"Copied '{source_file_path}' to '{local_path}'")
             return
        else:
             print(f"Source file not found at: {source_file_path}")
    except Exception as e:
        print(f"Error trying to copy file from backend: {e}")

    # Fallback to dummy file if copy fails
    with open(local_path, 'w') as f:
        f.write("This is dummy content for " + file_path + ". Real content would be extracted here.")
    print(f"Simulated download of '{file_path}' to '{local_path}'")


def _extract_text_from_pdf(file_path: str) -> str:
    """Extracts text from a PDF file."""
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text

def _extract_text_from_docx(file_path: str) -> str:
    """Extracts text from a DOCX file."""
    doc = DocxDocument(file_path)
    text = ""
    for para in doc.paragraphs:
        text += para.text + "\n"
    return text

def _extract_text_from_image(file_path: str) -> str:
    """Extracts text from an image file using OCR (Tesseract)."""
    try:
        # Assuming Tesseract is installed and available in PATH,
        # or pytesseract.pytesseract.tesseract_cmd is set.
        text = pytesseract.image_to_string(Image.open(file_path))
        return text
    except Exception as e:
        print(f"OCR failed for {file_path}: {e}")
        return ""

def _generate_mcqs_with_ollama(text: str) -> List[QuestionData]:
    """Generates Multiple Choice Questions using Ollama."""
    # This is a placeholder for the actual Ollama API call
    # You would typically interact with a running Ollama instance
    # For example: ollama.generate(model='llama3', prompt=prompt)
    
    # The prompt should enforce the JSON structure. See section 6 of the plan.
    ollama_prompt = f"""
System: You are an expert quiz-maker assistant. Your task is to create multiple-choice questions based on the provided text. You must respond ONLY with a valid JSON array. Do not provide any explanation or introductory text.

User:
Analyze the following text and generate 3 multiple-choice questions. Each question must have 4 options, and exactly one option must be correct.

The output format MUST be a JSON array of objects, where each object has the following structure:
{{
  "question_text": "The text of the question?",
  "choices": [
    {{"choice_text": "Answer A", "is_correct": false}},
    {{"choice_text": "Answer B", "is_correct": true}},
    {{"choice_text": "Answer C", "is_correct": false}},
    {{"choice_text": "Answer D", "is_correct": false}}
  ]
}}

Here is the text:
---
{text}
---
"""
    
    try:
        # Simulate Ollama response for now
        # In a real scenario, use:
        # response = ollama.chat(model='llama3', messages=[{'role': 'user', 'content': ollama_prompt}])
        # generated_content = response['message']['content']

        # Dummy response for testing without a running Ollama instance
        generated_content = """
[
    {
        "question_text": "What is the primary topic of the dummy content?",
        "choices": [
            {"choice_text": "Database administration", "is_correct": false},
            {"choice_text": "Text extraction techniques", "is_correct": true},
            {"choice_text": "Web development frameworks", "is_correct": false},
            {"choice_text": "Cloud storage solutions", "is_correct": false}
        ]
    },
    {
        "question_text": "Which tool is mentioned for image OCR?",
        "choices": [
            {"choice_text": "PdfReader", "is_correct": false},
            {"choice_text": "DocxDocument", "is_correct": false},
            {"choice_text": "pytesseract", "is_correct": true},
            {"choice_text": "httpx", "is_correct": false}
        ]
    },
    {
        "question_text": "What type of HTTP client is used for the callback?",
        "choices": [
            {"choice_text": "requests", "is_correct": false},
            {"choice_text": "guzzle", "is_correct": false},
            {"choice_text": "httpx", "is_correct": true},
            {"choice_text": "axios", "is_correct": false}
        ]
    }
]
"""
        questions_raw = json.loads(generated_content)
        return [QuestionData(**q) for q in questions_raw]
    except json.JSONDecodeError as e:
        print(f"Failed to decode JSON from Ollama response: {e}")
        print(f"Raw content: {generated_content}")
        raise
    except Exception as e:
        print(f"Error generating MCQs with Ollama: {e}")
        raise


import tempfile

async def process_document_logic(document_id: uuid.UUID, file_path: str):
    """Orchestrates the document processing flow."""
    # Use cross-platform temporary directory
    temp_dir = tempfile.gettempdir()
    local_file_path = os.path.join(temp_dir, f"{document_id}_{os.path.basename(file_path)}")
    extracted_text = ""
    callback_success = False

    try:
        _download_file_from_supabase(file_path, local_file_path)

        file_extension = file_path.split('.')[-1].lower()
        if file_extension == 'pdf':
            extracted_text = _extract_text_from_pdf(local_file_path)
        elif file_extension in ['png', 'jpg', 'jpeg']:
            extracted_text = _extract_text_from_image(local_file_path)
        elif file_extension == 'docx':
            extracted_text = _extract_text_from_docx(local_file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_extension}")

        if not extracted_text.strip():
            raise ValueError("No text extracted from document.")

        questions = _generate_mcqs_with_ollama(extracted_text)

        # Call back to Laravel
        async with httpx.AsyncClient() as client:
            response = await client.post(
                LARAVEL_CALLBACK_URL.format(document_id=document_id),
                json=AICallbackPayload(questions=questions).model_dump(),
                headers={"X-Internal-Secret": AI_SERVICE_SECRET},
                timeout=30.0 # Timeout for the callback
            )
            response.raise_for_status()
            callback_success = True
            print(f"Successfully sent questions for document {document_id} to Laravel.")

    except Exception as e:
        print(f"Error processing document {document_id}: {e}")
        # In a real app, you'd send a 'failed' status back to Laravel
        # For this MVP, we'll just log and let the Laravel job eventually timeout/fail if callback didn't happen
        if not callback_success:
            # Attempt to send a failure status to Laravel if the initial callback failed
            try:
                async with httpx.AsyncClient() as client:
                    await client.post(
                        LARAVEL_CALLBACK_URL.format(document_id=document_id),
                        json={"status": "failed", "error_message": str(e)},
                        headers={"X-Internal-Secret": AI_SERVICE_SECRET},
                        timeout=10.0
                    )
            except Exception as cb_e:
                print(f"Failed to send failure callback for {document_id}: {cb_e}")
    finally:
        # Clean up local file after processing
        if os.path.exists(local_file_path):
            os.remove(local_file_path)
            print(f"Cleaned up local file: {local_file_path}")

