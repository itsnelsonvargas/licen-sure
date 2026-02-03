# AI Service Status Report

## Overview
The AI Service is a Python-based backend application built with FastAPI, designed for asynchronous processing of documents to extract text and generate multiple-choice questions (MCQs). It integrates with various text extraction and Optical Character Recognition (OCR) tools, as well as large language models (LLMs) for question generation. The service communicates its progress and final results back to a Laravel application via HTTP callbacks.

## Key Features

### 1. Document Ingestion & Processing
-   **Supported Formats:** PDF, PNG, JPG, JPEG, DOCX.
-   **Text Extraction:**
    -   Direct text extraction from PDFs using `pypdf`.
    -   Direct text extraction from DOCX files using `python-docx`.
    -   OCR for image files (PNG, JPG, JPEG) and images embedded within PDFs using `pytesseract` (Tesseract OCR).
    -   Rasterization of PDF pages for OCR using `PyMuPDF` (`fitz`) when direct text extraction fails.
-   **External OCR Integration:**
    -   Configurable OCR chain that can utilize external providers: OCR.Space, T3XTR, aPDF, TextMill, Zamzar (for DOCX conversion to text). This acts as a fallback or primary OCR method.

### 2. Multiple-Choice Question (MCQ) Generation
-   **Primary LLM Integration:**
    -   **Google Gemini (gemini-1.5-flash):** Utilized for generating comprehensive MCQs from extracted document text.
    -   **Ollama (llama3):** Provides an alternative, locally deployable LLM for MCQ generation.
-   **Fallback Mechanism:** If LLM-based generation fails, a basic `_generate_mcqs` function creates questions based on prominent terms in the document.

### 3. Asynchronous Processing & Callbacks
-   **Background Tasks:** Document processing is initiated via a `/process-document` endpoint and handled in a background task to ensure a responsive API.
-   **Laravel Integration:**
    -   **Progress Updates:** Sends periodic progress updates (percentage, message, ETA) to a configurable Laravel endpoint.
    -   **Result Callback:** Delivers the generated MCQs to a specified Laravel endpoint upon completion.
    -   **Error Reporting:** Attempts to send failure status back to Laravel in case of processing errors.

### 4. Configuration & Security
-   **Environment Variables:** All sensitive information (API keys, URLs, secrets) and configurable parameters are managed via environment variables (`.env`).
-   **Internal Secret:** Employs a shared `AI_SERVICE_SECRET` for authenticating requests from the Laravel application.

## Technologies Used
-   **Web Framework:** FastAPI
-   **ASGI Server:** Uvicorn
-   **HTTP Client:** httpx
-   **LLMs:** Google Generative AI (Gemini), Ollama (Llama3)
-   **PDF Processing:** pypdf, PyMuPDF (fitz), pdfminer.six
-   **OCR:** pytesseract, PIL (Pillow)
-   **Document Conversion:** python-docx
-   **Environment Management:** python-dotenv

## Current Status
The AI Service is fully functional as a prototype for document-based MCQ generation. It successfully handles various document types, performs robust text extraction and OCR, and integrates with leading AI models for question creation. The asynchronous processing and callback mechanisms ensure it can be seamlessly integrated into a larger application ecosystem, such as a Laravel-based platform.

**Areas for potential future enhancement (not yet implemented):**
-   More advanced error handling and retry mechanisms for external API calls.
-   Support for additional document formats.
-   Configurable number of questions generated.
-   User interface for monitoring processing tasks directly.
