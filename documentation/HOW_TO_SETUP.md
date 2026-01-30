# How to Setup and Run LicenSure

This guide provides step-by-step instructions to set up and run the LicenSure project locally. The project consists of three main components:
1. **Backend** (Laravel)
2. **AI Service** (FastAPI)
3. **Frontend** (Next.js)

## Prerequisites

Ensure you have the following installed on your machine:
- **PHP** (v8.2 or higher) & **Composer**
- **Node.js** (v18 or higher) & **npm**
- **Python** (v3.10 or higher)
- **Git**
- **SQLite** (usually included with PHP/Python, or install separately)

---

## 1. Backend Setup (Laravel)

The backend handles the core logic, database, and job queues.

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Install PHP dependencies:**
    ```bash
    composer install
    ```

3.  **Configure Environment Variables:**
    Copy the example environment file:
    ```bash
    cp .env.example .env
    ```
    *Note: On Windows PowerShell, you might need to use `copy .env.example .env`.*

4.  **Create the SQLite Database:**
    **Windows (PowerShell):**
    ```powershell
    New-Item -Path "database/database.sqlite" -ItemType File -Force
    ```
    **Mac/Linux:**
    ```bash
    touch database/database.sqlite
    ```

5.  **Generate Application Key:**
    ```bash
    php artisan key:generate
    ```

6.  **Run Migrations:**
    ```bash
    php artisan migrate
    ```

---

## 2. AI Service Setup (FastAPI)

The AI service handles document processing and question generation.

1.  **Navigate to the AI service directory:**
    ```bash
    cd ../ai-service
    ```

2.  **Create a Virtual Environment:**
    ```bash
    python -m venv venv
    ```

3.  **Activate the Virtual Environment:**
    **Windows:**
    ```powershell
    .\venv\Scripts\activate
    ```
    **Mac/Linux:**
    ```bash
    source venv/bin/activate
    ```

4.  **Install Python Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

---

## 3. Frontend Setup (Next.js)

The frontend provides the user interface.

1.  **Navigate to the frontend directory:**
    ```bash
    cd ../frontend
    ```

2.  **Install Node dependencies:**
    ```bash
    npm install
    ```

---

## 4. Running the Application

You need to run **4 separate terminals** to have the full application running.

### Terminal 1: Backend Server
```bash
cd backend
php artisan serve
```
*Runs at: http://localhost:8000*

### Terminal 2: Queue Worker (Crucial for AI processing)
The queue worker is required to process document uploads and send them to the AI service in the background.
```bash
cd backend
php artisan queue:listen --tries=1 --timeout=0
```

### Terminal 3: AI Service
Make sure your virtual environment is activated first.
```bash
cd ai-service
# Windows: .\venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
uvicorn app.main:app --reload --port 8001
```
*Runs at: http://localhost:8001*

### Terminal 4: Frontend
```bash
cd frontend
npm run dev
```
*Runs at: http://localhost:3000*

---

## 5. Usage

1.  Open your browser and go to **http://localhost:3000**.
2.  Register a new account or log in.
3.  Upload a document (PDF or DOCX).
4.  The system will:
    *   Upload the file to the backend.
    *   Dispatch a job to the queue.
    *   Send the file to the AI service for processing.
    *   Generate questions and save them to the database.
5.  View the generated questions on the dashboard.

## Troubleshooting

*   **Document processing stuck?** Ensure **Terminal 2 (Queue Worker)** is running. Without it, the backend won't send files to the AI service.
*   **AI Service errors?** Ensure the virtual environment is activated and dependencies are installed.
*   **Frontend connection errors?** Check that the Backend (Port 8000) and AI Service (Port 8001) are running.
