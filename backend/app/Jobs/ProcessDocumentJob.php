<?php

namespace App\Jobs;

use App\Models\Document;
use App\Enums\DocumentStatus;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ProcessDocumentJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The document instance.
     *
     * @var \App\Models\Document
     */
    public Document $document;

    /**
     * Create a new job instance.
     */
    public function __construct(Document $document)
    {
        $this->document = $document;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        // Update document status to processing
        $this->document->status = DocumentStatus::PROCESSING;
        $this->document->save();

        // Make an HTTP request to the Python AI Service
        try {
            $response = Http::post(env('AI_SERVICE_URL') . '/process-document', [
                'secret' => env('AI_SERVICE_SECRET'), // Shared secret for internal communication
                'document_id' => $this->document->id,
                'file_path' => $this->document->storage_path, // Path in Supabase Storage
            ]);

            $response->throw(); // Throws an exception if a client or server error occurred

            Log::info('Successfully dispatched document to AI service.', [
                'document_id' => $this->document->id,
                'response' => $response->json(),
            ]);

        } catch (\Exception $e) {
            // Handle error: update document status to failed
            $this->document->status = DocumentStatus::FAILED;
            $this->document->error_message = 'Failed to dispatch to AI service: ' . $e->getMessage();
            $this->document->save();

            Log::error('Failed to dispatch document to AI service.', [
                'document_id' => $this->document->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
