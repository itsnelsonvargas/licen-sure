'''<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Question; // Will create this
use App\Models\Choice;   // Will create this
use App\Enums\DocumentStatus;
use App\Jobs\ProcessDocumentJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Log;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

class DocumentController extends Controller
{
    /**
     * Store a newly created document in storage.
     */
    public function store(Request $request)
    {
        Log::info('Document upload request', [
            'mime' => $request->file('document')->getMimeType(),
            'extension' => $request->file('document')->getClientOriginalExtension(),
            'clientMime' => $request->file('document')->getClientMimeType(),
        ]);

        $request->validate([
            // 'document' => 'required|file|mimes:pdf,docx,png,jpg,jpeg|max:20480', // 20MB Max
            'document' => 'required|file|max:20480', // Relaxed validation for Windows dev environment
        ]);

        $file = $request->file('document');
        $originalFileName = $file->getClientOriginalName();
        $fileExtension = $file->getClientOriginalExtension();

        // Simulate Supabase Storage path
        $storagePath = 'documents/' . Auth::id() . '/' . Str::uuid() . '.' . $fileExtension;
        Storage::put($storagePath, file_get_contents($file));

        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        $document = Document::create([
            'user_id' => $user->id,
            'title' => $originalFileName,
            'storage_path' => $storagePath,
            'status' => DocumentStatus::UPLOADING,
        ]);

        ProcessDocumentJob::dispatch($document);

        return response()->json([
            'message' => 'Document uploaded and processing initiated.',
            'document' => $document,
        ], 202);
    }

    /**
     * Public: List available sample PDFs from storage/app/public.
     */
    public function listSamplePdfs()
    {
        $files = collect(Storage::files('public'))
            ->filter(fn ($path) => str_ends_with(strtolower($path), '.pdf'))
            ->map(fn ($path) => [
                'name' => basename($path),
                'path' => $path,
            ])
            ->values();

        return response()->json(['samples' => $files])->withHeaders($this->corsHeaders());
    }

    /**
     * Public: Create a Document from a selected sample file and dispatch processing.
     * Expects: { path: "public/<file>.pdf" }
     */
    public function storeFromSample(Request $request)
    {
        $request->validate([
            'path' => 'required|string',
        ]);

        $samplePath = $request->input('path');
        if (!Storage::exists($samplePath)) {
            return response()->json(['message' => 'Sample file not found'], 404);
        }

        $user = Auth::user() ?? $this->ensureGuestUser();
        $extension = pathinfo($samplePath, PATHINFO_EXTENSION);
        $targetName = Str::uuid() . '.' . $extension;
        $targetPath = 'documents/' . $user->id . '/' . $targetName;

        $content = Storage::get($samplePath);
        Storage::put($targetPath, $content);

        $document = Document::create([
            'id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'title' => basename($samplePath),
            'storage_path' => $targetPath,
            'status' => DocumentStatus::UPLOADING,
        ]);

        ProcessDocumentJob::dispatch($document);

        return response()->json([
            'message' => 'Sample document selected and processing initiated.',
            'document' => $document,
        ], 202)->withHeaders($this->corsHeaders());
    }

    /**
     * Public: Upload a PDF/DOCX/Image without authentication and dispatch processing.
     */
    public function storeGuestUpload(Request $request)
    {
        $request->validate([
            'document' => 'required|file|max:20480',
        ]);

        $user = Auth::user() ?? $this->ensureGuestUser();
        $file = $request->file('document');
        $extension = $file->getClientOriginalExtension();
        $originalName = $file->getClientOriginalName();
        $targetName = Str::uuid() . '.' . $extension;
        $targetPath = 'documents/' . $user->id . '/' . $targetName;

        Storage::put($targetPath, file_get_contents($file));

        $document = Document::create([
            'id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'title' => $originalName,
            'storage_path' => $targetPath,
            'status' => DocumentStatus::UPLOADING,
        ]);

        ProcessDocumentJob::dispatch($document);

        return response()->json([
            'message' => 'Document uploaded and processing initiated.',
            'document' => $document,
        ], 202)->withHeaders($this->corsHeaders());
    }

    /**
     * Public: Create a Document from a block of text without authentication.
     */
    public function storeFromText(Request $request)
    {
        $request->validate([
            'text' => 'required|string|max:20480', // 20KB Max
        ]);

        $user = Auth::user() ?? $this->ensureGuestUser();
        $text = $request->input('text');
        $title = 'text-upload-' . Str::limit(Str::slug($text), 20) . '.txt';
        $targetName = Str::uuid() . '.txt';
        $targetPath = 'documents/' . $user->id . '/' . $targetName;

        Storage::put($targetPath, $text);

        $document = Document::create([
            'id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'title' => $title,
            'storage_path' => $targetPath,
            'status' => DocumentStatus::UPLOADING,
        ]);

        ProcessDocumentJob::dispatch($document);

        return response()->json([
            'message' => 'Text uploaded and processing initiated.',
            'document' => $document,
        ], 202)->withHeaders($this->corsHeaders());
    }

    /**
     * Public: Get progress info for a document.
     */
    public function showProgress(Document $document)
    {
        $key = 'doc_progress_'.$document->id;
        $progress = Cache::get($key);
        if (!$progress) {
            $status = (string) $document->status->value;
            $progress = [
                'percent' => $status === 'completed' ? 100 : ($status === 'processing' ? 50 : 10),
                'message' => $status,
                'eta_seconds' => $status === 'completed' ? 0 : 30,
                'status' => $status,
            ];
        }
        if ($document->status === DocumentStatus::FAILED) {
            $progress['error'] = $document->error_message;
        }
        return response()->json($progress)->withHeaders($this->corsHeaders());
    }

    /**
     * Internal: Update progress for a document.
     */
    public function updateProgress(Request $request, Document $document)
    {
        if ($request->header('X-Internal-Secret') !== env('AI_SERVICE_SECRET')) {
            abort(403, 'Unauthorized');
        }
        $data = $request->validate([
            'percent' => 'required|integer|min:0|max:100',
            'message' => 'required|string',
            'eta_seconds' => 'nullable|integer|min:0',
            'status' => 'nullable|string',
        ]);
        Cache::put('doc_progress_'.$document->id, $data, now()->addMinutes(5));
        return response()->json(['ok' => true])->withHeaders($this->corsHeaders());
    }

    /**
     * Public: Show quiz questions for a document without auth ownership checks.
     */
    public function showQuizQuestionsPublic(Document $document)
    {
        if ($document->status !== DocumentStatus::COMPLETED) {
            return response()->json(['message' => 'Quiz not ready for this document.'], 404)->withHeaders($this->corsHeaders());
        }

        $questions = $document->questions()->with('choices')->get();
        return response()->json($questions)->withHeaders($this->corsHeaders());
    }

    public function downloadPublicFile(Document $document)
    {
        $path = $document->storage_path;
        $absolute = storage_path('app/' . $path);
        if (!file_exists($absolute)) {
            return response()->json(['message' => 'File not found'], 404)->withHeaders($this->corsHeaders());
        }
        $mime = \Illuminate\Support\Facades\Storage::mimeType($path) ?? 'application/octet-stream';
        $name = $document->title ?: basename($absolute);
        return response()->file($absolute, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline; filename="' . $name . '"',
        ])->withHeaders($this->corsHeaders());
    }

    /**
     * Ensure a guest user exists for unauthenticated flows.
     */
    protected function ensureGuestUser(): User
    {
        return User::firstOrCreate(
            ['email' => 'guest@example.com'],
            [
                'name' => 'Guest User',
                'password' => bcrypt(Str::random(12)),
            ]
        );
    }

    /**
     * Internal callback endpoint for the AI service to post generated questions.
     * This endpoint should be protected with a shared secret or IP whitelist.
     */
    public function processAiCallback(Request $request, Document $document)
    {
        // Validate internal secret for security
        if ($request->header('X-Internal-Secret') !== env('AI_SERVICE_SECRET')) {
            Log::warning('Unauthorized access to AI callback endpoint.', [
                'document_id' => $document->id,
                'ip_address' => $request->ip(),
            ]);
            abort(403, 'Unauthorized');
        }

        try {
            if ($request->input('status') === 'failed') {
                $document->status = DocumentStatus::FAILED;
                $document->error_message = $request->input('error_message') ?: 'Processing failed';
                $document->save();
                return response()->json(['message' => 'Failure recorded.'])->withHeaders($this->corsHeaders());
            }
            $request->validate([
                'questions' => 'required|array',
                'questions.*.question_text' => 'required|string',
                'questions.*.choices' => 'required|array|min:2',
                'questions.*.choices.*.choice_text' => 'required|string',
                'questions.*.choices.*.is_correct' => 'required|boolean',
            ]);

            // Delete any existing questions for this document to prevent duplicates on retries
            $document->questions()->delete();

            foreach ($request->input('questions') as $questionData) {
                $question = $document->questions()->create([
                    'question_text' => $questionData['question_text'],
                ]);

                foreach ($questionData['choices'] as $choiceData) {
                    $question->choices()->create([
                        'choice_text' => $choiceData['choice_text'],
                        'is_correct' => $choiceData['is_correct'],
                    ]);
                }
            }

            $document->status = DocumentStatus::COMPLETED;
            $document->error_message = null; // Clear any previous errors
            $document->save();

            return response()->json(['message' => 'Questions processed successfully.'])->withHeaders($this->corsHeaders());

        } catch (ValidationException $e) {
            $document->status = DocumentStatus::FAILED;
            $document->error_message = 'AI callback validation failed: ' . json_encode($e->errors());
            $document->save();
            Log::error('AI callback validation error.', [
                'document_id' => $document->id,
                'errors' => $e->errors(),
            ]);
            return response()->json(['message' => 'Validation error', 'errors' => $e->errors()], 422)->withHeaders($this->corsHeaders());
        } catch (\Exception $e) {
            $document->status = DocumentStatus::FAILED;
            $document->error_message = 'AI callback processing failed: ' . $e->getMessage();
            $document->save();
            Log::error('AI callback unexpected error.', [
                'document_id' => $document->id,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['message' => 'An unexpected error occurred.'], 500)->withHeaders($this->corsHeaders());
        }
    }

    /**
     * Display all questions and choices for a given document.
     */
    public function showQuizQuestions(Document $document)
    {
        // Ensure the authenticated user owns the document
        if (Auth::id() !== $document->user_id) {
            abort(403, 'Unauthorized');
        }

        // Ensure the document has been processed
        if ($document->status !== DocumentStatus::COMPLETED) {
            abort(404, 'Quiz not ready for this document.');
        }

        // Load questions with their choices
        $questions = $document->questions()->with('choices')->get();

        return response()->json($questions)->withHeaders($this->corsHeaders());
    }

    /**
     * Public: Retry processing for a document.
     */
    public function retry(Document $document)
    {
        Cache::forget('doc_progress_'.$document->id);
        $document->status = DocumentStatus::UPLOADING;
        $document->error_message = null;
        $document->save();
        ProcessDocumentJob::dispatch($document);
        return response()->json(['message' => 'Retry initiated.', 'document' => $document], 202)->withHeaders($this->corsHeaders());
    }

    protected function corsHeaders(): array
    {
        $origin = request()->header('Origin', 'http://localhost:3000');
        return [
            'Access-Control-Allow-Origin' => $origin,
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, X-Requested-With, Accept, Origin, Authorization',
            'Access-Control-Allow-Credentials' => 'true',
        ];
    }
}
''