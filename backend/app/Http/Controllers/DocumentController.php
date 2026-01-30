<?php

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

        $document = Auth::user()->documents()->create([
            'title' => $originalFileName,
            'storage_path' => $storagePath,
            'status' => DocumentStatus::UPLOADING, // Initial status
        ]);

        ProcessDocumentJob::dispatch($document);

        return response()->json([
            'message' => 'Document uploaded and processing initiated.',
            'document' => $document,
        ], 202);
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

            return response()->json(['message' => 'Questions processed successfully.']);

        } catch (ValidationException $e) {
            $document->status = DocumentStatus::FAILED;
            $document->error_message = 'AI callback validation failed: ' . json_encode($e->errors());
            $document->save();
            Log::error('AI callback validation error.', [
                'document_id' => $document->id,
                'errors' => $e->errors(),
            ]);
            return response()->json(['message' => 'Validation error', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            $document->status = DocumentStatus::FAILED;
            $document->error_message = 'AI callback processing failed: ' . $e->getMessage();
            $document->save();
            Log::error('AI callback unexpected error.', [
                'document_id' => $document->id,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['message' => 'An unexpected error occurred.'], 500);
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

        return response()->json($questions);
    }
}
