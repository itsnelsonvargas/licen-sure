import httpx
import os
import json
import uuid
import asyncio
from typing import List, Dict

# External libraries for text extraction
import pytesseract
from PIL import Image # Pillow for image processing
from pypdf import PdfReader
from docx import Document as DocxDocument # Renamed to avoid conflict
try:
    from pdfminer.high_level import extract_text as pdfminer_extract_text
    PDFMINER_AVAILABLE = True
except Exception:
    PDFMINER_AVAILABLE = False

# Internal models
from .models import QuestionData, ChoiceData, AICallbackPayload
import re
import random

# --- Configuration ---
# These would typically come from environment variables
# For now, placeholders for local development
LARAVEL_CALLBACK_URL = os.environ.get("LARAVEL_CALLBACK_URL", "http://localhost:8000/api/documents/{document_id}/questions")
LARAVEL_PROGRESS_URL = os.environ.get("LARAVEL_PROGRESS_URL", "http://localhost:8000/api/documents/{document_id}/progress")
AI_SERVICE_SECRET = os.environ.get("AI_SERVICE_SECRET", "supersecretkey123")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "http://localhost:54321") # Placeholder
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...") # Placeholder
TESSERACT_PATH = os.environ.get("TESSERACT_PATH")
OCR_PROVIDER = os.environ.get("OCR_PROVIDER")  # e.g., "ocrspace"
OCRSPACE_API_KEY = os.environ.get("OCRSPACE_API_KEY")
OCR_CHAIN = [p.strip() for p in os.environ.get("OCR_CHAIN", "").split(",") if p.strip()]
T3XTR_API_URL = os.environ.get("T3XTR_API_URL")
T3XTR_API_KEY = os.environ.get("T3XTR_API_KEY")
APDF_API_URL = os.environ.get("APDF_API_URL")
APDF_API_KEY = os.environ.get("APDF_API_KEY")
TEXTMILL_API_URL = os.environ.get("TEXTMILL_API_URL")
TEXTMILL_API_KEY = os.environ.get("TEXTMILL_API_KEY")
ZAMZAR_API_URL = os.environ.get("ZAMZAR_API_URL")
ZAMZAR_API_KEY = os.environ.get("ZAMZAR_API_KEY")
def _resolve_tesseract_path(config_path: str):
    try:
        if not config_path:
            return None
        p = config_path
        if os.path.isdir(p):
            exe = os.path.join(p, "tesseract.exe")
            if os.path.exists(exe):
                return exe
        if p.lower().endswith("tesseract.exe") and os.path.exists(p):
            return p
        return p
    except Exception:
        return config_path
if TESSERACT_PATH:
    try:
        _resolved = _resolve_tesseract_path(TESSERACT_PATH)
        if _resolved:
            pytesseract.pytesseract.tesseract_cmd = _resolved
    except Exception as _e:
        pass
def _ensure_tesseract_cmd():
    try:
        # If already configured, skip
        cmd = getattr(pytesseract.pytesseract, "tesseract_cmd", None)
        if cmd and os.path.exists(cmd):
            return
        # Try common Windows install paths
        candidates = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        ]
        for c in candidates:
            if os.path.exists(c):
                pytesseract.pytesseract.tesseract_cmd = c
                return
        # Fallback to PATH lookup
        import shutil as _sh
        found = _sh.which("tesseract")
        if found:
            pytesseract.pytesseract.tesseract_cmd = found
    except Exception:
        pass
_ensure_tesseract_cmd()

# --- Helper Functions for Text Extraction ---

import shutil
def _tesseract_available() -> bool:
    if TESSERACT_PATH:
        rp = _resolve_tesseract_path(TESSERACT_PATH)
        if rp and os.path.exists(rp):
            return True
    cmd = getattr(pytesseract.pytesseract, "tesseract_cmd", None)
    if cmd and os.path.exists(cmd):
        return True
    return shutil.which("tesseract") is not None

def _download_file_from_supabase(file_path: str, local_path: str):
    try:
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
        base_storage_app = os.path.join(repo_root, "backend", "storage", "app")
        candidates = []
        candidates.append(os.path.join(base_storage_app, file_path))
        candidates.append(os.path.join(base_storage_app, "private", file_path))
        if file_path.startswith("public/"):
            rel = file_path.split("public/", 1)[1]
            candidates.append(os.path.join(base_storage_app, "public", rel))
        for sp in candidates:
            if os.path.exists(sp):
                shutil.copy2(sp, local_path)
                print(f"Copied '{sp}' to '{local_path}'")
                return
        raise FileNotFoundError(f"Source file not found for '{file_path}' in storage app/private/public")
    except Exception:
        raise


def _extract_text_from_pdf(file_path: str) -> str:
    try:
        reader = PdfReader(file_path, strict=False)
        text = ""
        for page in reader.pages:
            try:
                page_text = page.extract_text() or ""
            except Exception:
                page_text = ""
            text += page_text + "\n"
        if PDFMINER_AVAILABLE:
            try:
                if not text.strip() or len(text.strip()) < 80:
                    alt = pdfminer_extract_text(file_path) or ""
                    if len(alt.strip()) > len(text.strip()):
                        text = alt
            except Exception:
                pass
        return text
    except Exception as e:
        print(f"PDF text extraction failed: {e}")
        return ""
def _extract_text_from_pdf_metadata(file_path: str) -> str:
    try:
        reader = PdfReader(file_path, strict=False)
        md = getattr(reader, "metadata", None)
        parts: List[str] = []
        if md:
            for attr in ("title", "subject", "keywords", "author"):
                try:
                    val = getattr(md, attr, None)
                    if isinstance(val, str) and val.strip():
                        parts.append(val.strip())
                except Exception:
                    pass
            for key in ("/Title", "/Subject", "/Keywords", "/Author"):
                try:
                    val = md.get(key)
                    if isinstance(val, str) and val.strip():
                        parts.append(val.strip())
                except Exception:
                    pass
        return " ".join(parts).strip()
    except Exception:
        return ""

def _extract_text_from_pdf_images(file_path: str) -> str:
    texts: List[str] = []
    try:
        reader = PdfReader(file_path, strict=False)
        for page in reader.pages:
            try:
                resources = page.get("/Resources")
                if not resources:
                    continue
                xObject = resources.get("/XObject")
                if not xObject:
                    continue
                try:
                    xObject = xObject.get_object()
                except Exception:
                    pass
                for name in xObject:
                    try:
                        img = xObject[name]
                        try:
                            img = img.get_object()
                        except Exception:
                            pass
                        if img.get("/Subtype") != "/Image":
                            continue
                        filt = img.get("/Filter")
                        if isinstance(filt, list) and len(filt) > 0:
                            filt = filt[0]
                        data = None
                        try:
                            data = img.get_data()
                        except Exception:
                            data = getattr(img, "_data", None)
                        if not data:
                            continue
                        ext = None
                        if filt == "/DCTDecode":
                            ext = "jpg"
                        elif filt == "/JPXDecode":
                            ext = "jp2"
                        if not ext:
                            continue
                        tmp_path = os.path.join(tempfile.gettempdir(), f"{uuid.uuid4()}.{ext}")
                        with open(tmp_path, "wb") as f:
                            f.write(data)
                        try:
                            im = Image.open(tmp_path)
                            try:
                                from PIL import ImageOps, ImageFilter
                                im = ImageOps.grayscale(im)
                                im = ImageOps.autocontrast(im)
                                im = im.filter(ImageFilter.SHARPEN)
                            except Exception:
                                pass
                            texts.append(pytesseract.image_to_string(im, config="--psm 6 -l eng"))
                        finally:
                            try:
                                os.remove(tmp_path)
                            except Exception:
                                pass
                    except Exception:
                        continue
            except Exception:
                continue
    except Exception:
        pass
    return "\n".join(texts)

def _ocr_rasterize_pdf_pages(file_path: str) -> str:
    try:
        import fitz  # PyMuPDF
    except Exception as e:
        print(f"PyMuPDF not available for rasterization: {e}")
        return ""
    texts: List[str] = []
    try:
        doc = fitz.open(file_path)
        for i in range(len(doc)):
            try:
                page = doc.load_page(i)
                pix = page.get_pixmap()
                tmp_path = os.path.join(tempfile.gettempdir(), f"{uuid.uuid4()}.png")
                pix.save(tmp_path)
                try:
                    im = Image.open(tmp_path)
                    try:
                        from PIL import ImageOps, ImageFilter
                        im = ImageOps.grayscale(im)
                        im = ImageOps.autocontrast(im)
                        im = im.filter(ImageFilter.SHARPEN)
                    except Exception:
                        pass
                    texts.append(pytesseract.image_to_string(im, config="--psm 6 -l eng"))
                finally:
                    try:
                        os.remove(tmp_path)
                    except Exception:
                        pass
            except Exception as e:
                print(f"Raster OCR page {i} failed: {e}")
                continue
        doc.close()
    except Exception as e:
        print(f"Raster OCR failed: {e}")
        return ""
    return "\n".join(texts)
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
        img = Image.open(file_path)
        try:
            # Simple pre-processing for better OCR
            from PIL import ImageOps, ImageFilter
            img = ImageOps.grayscale(img)
            img = ImageOps.autocontrast(img)
            img = img.filter(ImageFilter.SHARPEN)
        except Exception:
            pass
        text = pytesseract.image_to_string(img, config="--psm 6 -l eng")
        return text
    except Exception as e:
        print(f"OCR failed for {file_path}: {e}")
        return ""

async def _ocr_with_ocrspace(file_path: str) -> str:
    if not OCRSPACE_API_KEY:
        return ""
    try:
        url = "https://api.ocr.space/parse/image"
        data = {
            "language": "eng",
            "isOverlayRequired": False,
            "OCREngine": 2,
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            with open(file_path, "rb") as f:
                files = {"file": (os.path.basename(file_path), f, "application/octet-stream")}
                headers = {"apikey": OCRSPACE_API_KEY}
                resp = await client.post(url, data=data, files=files, headers=headers)
                resp.raise_for_status()
                payload = resp.json()
        if isinstance(payload, dict) and payload.get("ParsedResults"):
            texts: List[str] = []
            for pr in payload["ParsedResults"]:
                t = pr.get("ParsedText") or ""
                if isinstance(t, str) and t.strip():
                    texts.append(t)
            return "\n".join(texts).strip()
        return ""
    except Exception as e:
        print(f"OCR.Space request failed: {e}")
        return ""
async def _ocr_with_t3xtr(file_path: str) -> str:
    if not (T3XTR_API_URL and T3XTR_API_KEY):
        return ""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            with open(file_path, "rb") as f:
                files = {"file": (os.path.basename(file_path), f, "application/pdf")}
                headers = {"Authorization": f"Bearer {T3XTR_API_KEY}"}
                resp = await client.post(T3XTR_API_URL, files=files, headers=headers)
                resp.raise_for_status()
                payload = resp.json()
        for k in ("text", "data", "result"):
            v = payload.get(k)
            if isinstance(v, str) and v.strip():
                return v.strip()
            if isinstance(v, dict):
                for kk in ("text", "content"):
                    vv = v.get(kk)
                    if isinstance(vv, str) and vv.strip():
                        return vv.strip()
        return ""
    except Exception as e:
        print(f"T3XTR request failed: {e}")
        return ""
async def _ocr_with_apdf(file_path: str) -> str:
    if not (APDF_API_URL and APDF_API_KEY):
        return ""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            with open(file_path, "rb") as f:
                files = {"file": (os.path.basename(file_path), f, "application/pdf")}
                headers = {"Authorization": f"Bearer {APDF_API_KEY}"}
                resp = await client.post(APDF_API_URL, files=files, headers=headers)
                resp.raise_for_status()
                payload = resp.json()
        for k in ("text", "content", "result"):
            v = payload.get(k)
            if isinstance(v, str) and v.strip():
                return v.strip()
        return ""
    except Exception as e:
        print(f"aPDF request failed: {e}")
        return ""
async def _ocr_with_textmill(file_path: str) -> str:
    if not (TEXTMILL_API_URL and TEXTMILL_API_KEY):
        return ""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            with open(file_path, "rb") as f:
                files = {"file": (os.path.basename(file_path), f, "application/octet-stream")}
                headers = {"Authorization": f"Bearer {TEXTMILL_API_KEY}"}
                resp = await client.post(TEXTMILL_API_URL, files=files, headers=headers)
                resp.raise_for_status()
                payload = resp.json()
        for k in ("text", "content"):
            v = payload.get(k)
            if isinstance(v, str) and v.strip():
                return v.strip()
        return ""
    except Exception as e:
        print(f"TextMill request failed: {e}")
        return ""
async def _convert_docx_with_zamzar(file_path: str) -> str:
    if not (ZAMZAR_API_URL and ZAMZAR_API_KEY):
        return ""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            with open(file_path, "rb") as f:
                files = {"source_file": (os.path.basename(file_path), f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
                data = {"target_format": "txt"}
                headers = {"Authorization": f"Bearer {ZAMZAR_API_KEY}"}
                resp = await client.post(ZAMZAR_API_URL, data=data, files=files, headers=headers)
                resp.raise_for_status()
                if resp.headers.get("content-type", "").startswith("text/"):
                    return (resp.text or "").strip()
                payload = resp.json()
        for k in ("text", "content"):
            v = payload.get(k)
            if isinstance(v, str) and v.strip():
                return v.strip()
        return ""
    except Exception as e:
        print(f"Zamzar request failed: {e}")
        return ""
async def _try_provider_chain(file_path: str, file_extension: str) -> str:
    providers = OCR_CHAIN[:] if OCR_CHAIN else []
    if not providers:
        base = ["ocrspace", "t3xtr", "apdf", "textmill"]
        if file_extension == "docx":
            base.append("zamzar")
        providers = base
    for p in providers:
        try:
            if p == "ocrspace":
                t = await _ocr_with_ocrspace(file_path)
            elif p == "t3xtr":
                t = await _ocr_with_t3xtr(file_path)
            elif p == "apdf":
                t = await _ocr_with_apdf(file_path)
            elif p == "textmill":
                t = await _ocr_with_textmill(file_path)
            elif p == "zamzar" and file_extension == "docx":
                t = await _convert_docx_with_zamzar(file_path)
            else:
                t = ""
            if isinstance(t, str) and t.strip():
                return t.strip()
        except Exception as e:
            print(f"OCR provider {p} failed: {e}")
            continue
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

def _generate_mcqs(text: str) -> List[QuestionData]:
    cleaned = re.sub(r"\s+", " ", text).strip()
    tokens = re.findall(r"[A-Za-z]+(?:[-’'][A-Za-z]+)*", cleaned.lower())
    stop = {
        "the","and","for","that","with","this","from","into","your","have","will","must","should",
        "are","was","were","is","of","to","in","on","by","it","as","be","or","an","a","at","we",
        "you","they","their","our","not","no","but","if","than","then","there","here","which"
    }
    words = [w for w in tokens if w not in stop and len(w) >= 4]
    if not words:
        words = [w for w in tokens if w not in stop and len(w) >= 3]
    if not words:
        words = [w for w in tokens if len(w) >= 3 and any(c.isalpha() for c in w)]
    freq: Dict[str,int] = {}
    for w in words:
        freq[w] = freq.get(w, 0) + 1
    top_terms = sorted(freq.items(), key=lambda x: (-x[1], x[0]))[:3]
    distractor_pool = [
        "chemistry","economics","philosophy","astronomy","botany","geography","algebra",
        "poetry","architecture","geology","linguistics","meteorology","zoology","calculus",
        "thermodynamics","cryptography","microbiology","astrophysics","neurology","ecology"
    ]
    present = set(words)
    questions: List[QuestionData] = []
    for term, _ in top_terms:
        pool = [d for d in distractor_pool if d not in present and d != term]
        if len(pool) < 3:
            extra = [d for d in distractor_pool if d != term]
            random.shuffle(extra)
            for d in extra:
                if d not in pool:
                    pool.append(d)
                if len(pool) >= 3:
                    break
        random.shuffle(pool)
        choices_texts = [term] + pool[:3]
        random.shuffle(choices_texts)
        choices = [ChoiceData(choice_text=ct, is_correct=(ct == term)) for ct in choices_texts]
        questions.append(QuestionData(question_text="Which term appears in the uploaded document?", choices=choices))
    if not questions:
        raise ValueError("Insufficient text for question generation")
    return questions


import tempfile

async def process_document_logic(document_id: uuid.UUID, file_path: str):
    # Use cross-platform temporary directory
    temp_dir = tempfile.gettempdir()
    local_file_path = os.path.join(temp_dir, f"{document_id}_{os.path.basename(file_path)}")
    extracted_text = ""
    callback_success = False

    async def post_progress(percent: int, message: str, eta_seconds: int, status: str = "processing"):
        tries = 0
        last_err = None
        while tries < 3:
            tries += 1
            try:
                async with httpx.AsyncClient() as client:
                    await client.post(
                        LARAVEL_PROGRESS_URL.format(document_id=document_id),
                        json={
                            "percent": percent,
                            "message": message,
                            "eta_seconds": eta_seconds,
                            "status": status,
                        },
                        headers={"X-Internal-Secret": AI_SERVICE_SECRET},
                        timeout=10.0,
                    )
                return
            except Exception as e:
                last_err = e
                await asyncio.sleep(0.5 * tries)
        if last_err:
            print(f"Failed to post progress after retries: {last_err}")

    try:
        await post_progress(10, "Queued", 40, "processing")
        _download_file_from_supabase(file_path, local_file_path)
        try:
            size = os.path.getsize(local_file_path)
            await post_progress(25, f"Downloading file bytes={size}", 30, "processing")
        except Exception:
            await post_progress(25, "Downloading file", 30, "processing")

        file_extension = file_path.split('.')[-1].lower()
        if file_extension == 'pdf':
            extracted_text = _extract_text_from_pdf(local_file_path)
        elif file_extension in ['png', 'jpg', 'jpeg']:
            extracted_text = _extract_text_from_image(local_file_path)
        elif file_extension == 'docx':
            extracted_text = _extract_text_from_docx(local_file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_extension}")
        await post_progress(55, "Extracting text", 20, "processing")
        try:
            await post_progress(58, f"Extracted text len={len(extracted_text)}", 18, "processing")
        except Exception:
            pass

        if not extracted_text.strip():
            if file_extension == 'pdf':
                await post_progress(60, "No text found, attempting OCR", 20, "processing")
                if not _tesseract_available():
                    try:
                        await post_progress(62, "OCR unavailable: install Tesseract or set TESSERACT_PATH", 20, "processing")
                    except Exception:
                        pass
                    try:
                        await post_progress(66, "Sending to external OCR provider", 18, "processing")
                    except Exception:
                        pass
                    try:
                        extracted_text = await _try_provider_chain(local_file_path, file_extension)
                    except Exception:
                        extracted_text = ""
                    try:
                        await post_progress(70, f"OCR provider text len={len(extracted_text)}", 15, "processing")
                    except Exception:
                        await post_progress(70, "OCR provider processed", 15, "processing")
                else:
                    try:
                        extracted_text = _extract_text_from_pdf_images(local_file_path)
                    except Exception as ocr_e:
                        print(f"OCR fallback failed: {ocr_e}")
                    try:
                        await post_progress(70, f"OCR processed images text len={len(extracted_text)}", 15, "processing")
                    except Exception:
                        await post_progress(70, "OCR processed images", 15, "processing")
                    if not extracted_text.strip():
                        await post_progress(72, "Rasterizing pages for OCR", 15, "processing")
                        extracted_text = _ocr_rasterize_pdf_pages(local_file_path)
                        try:
                            await post_progress(78, f"OCR from rasterized pages text len={len(extracted_text)}", 10, "processing")
                        except Exception:
                            await post_progress(78, "OCR from rasterized pages", 10, "processing")
            if not extracted_text.strip():
                if (file_extension == 'pdf' and not _tesseract_available()) or (file_extension in ['png', 'jpg', 'jpeg'] and not _tesseract_available()):
                    try:
                        await post_progress(82, "Proceeding with limited text extraction due to OCR unavailability", 8, "processing")
                    except Exception:
                        pass
                    try:
                        extracted_text = await _try_provider_chain(local_file_path, file_extension)
                    except Exception:
                        extracted_text = ""
                    if not extracted_text.strip():
                        extracted_text = "Limited extraction available; OCR not installed."
                else:
                    raise ValueError("No text extracted from document.")

        limited_marker = "Limited extraction available; OCR not installed."
        if extracted_text.strip() == limited_marker:
            raise ValueError("No usable text to generate questions")
        questions = _generate_mcqs(extracted_text)
        await post_progress(85, "Generating questions", 10, "processing")

        # Call back to Laravel
        tries = 0
        while tries < 3 and not callback_success:
            tries += 1
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        LARAVEL_CALLBACK_URL.format(document_id=document_id),
                        json=AICallbackPayload(questions=questions).model_dump(),
                        headers={"X-Internal-Secret": AI_SERVICE_SECRET},
                        timeout=30.0
                    )
                    response.raise_for_status()
                    callback_success = True
                    print(f"Successfully sent questions for document {document_id} to Laravel.")
            except Exception as e:
                await asyncio.sleep(0.75 * tries)
        await post_progress(100, "Completed", 0, "completed")

    except Exception as e:
        err_msg = str(e)
        if "Stream has ended unexpectedly" in err_msg:
            err_msg = "PDF appears corrupted or has invalid streams. Try another file or a rescanned PDF."
        try:
            diag = f" stage=final text_len={len(extracted_text)} path={file_path}"
        except Exception:
            diag = ""
        print(f"Error processing document {document_id}: {err_msg}{diag}")
        # In a real app, you'd send a 'failed' status back to Laravel
        # For this MVP, we'll just log and let the Laravel job eventually timeout/fail if callback didn't happen
        if not callback_success:
            # Attempt to send a failure status to Laravel if the initial callback failed
            try:
                async with httpx.AsyncClient() as client:
                    await client.post(
                        LARAVEL_CALLBACK_URL.format(document_id=document_id),
                        json={"status": "failed", "error_message": f"{err_msg}{diag}"},
                        headers={"X-Internal-Secret": AI_SERVICE_SECRET},
                        timeout=10.0
                    )
            except Exception as cb_e:
                print(f"Failed to send failure callback for {document_id}: {cb_e}")
        try:
            await post_progress(100, "Failed", 0, "failed")
        except Exception:
            pass
    finally:
        # Clean up local file after processing
        if os.path.exists(local_file_path):
            os.remove(local_file_path)
            print(f"Cleaned up local file: {local_file_path}")
