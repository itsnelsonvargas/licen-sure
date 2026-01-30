<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Http\Controllers\DocumentController;
use Illuminate\Console\Command;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Request as SymfonyRequest; // Alias to avoid conflict with Laravel's Request
use Illuminate\Http\Request;

class SimulateDocumentUpload extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:simulate-document-upload {--file= : Optional path to a specific file to upload (e.g., storage/app/test.pdf)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Simulates a user uploading a document to test the full processing pipeline.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting document upload simulation...');

        // 1. Find or create a user
        $user = User::firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => Hash::make('password'),
            ]
        );
        Auth::login($user); // Authenticate the user for the request

        $this->info("Authenticated as user: {$user->email}");

        // 2. Prepare a dummy file for upload
        $filePath = $this->option('file');
        $dummyFileName = 'dummy_document.pdf';
        $fullPathToDummyFile = storage_path('app/public/' . $dummyFileName);

        if ($filePath) {
            if (!file_exists($filePath)) {
                $this->error("Provided file '{$filePath}' does not exist.");
                return Command::FAILURE;
            }
            $uploadedFile = new UploadedFile(
                $filePath,
                basename($filePath),
                mime_content_type($filePath),
                null,
                true
            );
            $this->info("Using provided file: {$filePath}");
        } else {
            // Create a dummy PDF file content
            $dummyContent = "This is a dummy PDF file for testing purposes. It contains some text that will be extracted. 
            The AI service should be able to read this and generate multiple-choice questions from it.
            Question 1: What is this file for?
            A) Storing images
            B) Testing purposes
            C) Playing music
            D) None of the above
            Answer: B

            Question 2: What should the AI service do?
            A) Delete the file
            B) Generate multiple-choice questions
            C) Rename the file
            D) Upload to another server
            Answer: B
            ";
            file_put_contents($fullPathToDummyFile, $dummyContent);

            $uploadedFile = new UploadedFile(
                $fullPathToDummyFile,
                $dummyFileName,
                'application/pdf',
                null,
                true
            );
            $this->info("Created dummy file: {$fullPathToDummyFile}");
        }

        // 3. Simulate the HTTP request
        $request = Request::create('/api/documents', 'POST', [], [], ['document' => $uploadedFile]);
        
        // Pass the UploadedFile directly to the request
        $request->files->set('document', $uploadedFile);

        $controller = new DocumentController();
        try {
            $response = $controller->store($request);
            $this->info('Document upload simulated successfully. Check the response below:');
            $this->line(json_encode($response->getData(), JSON_PRETTY_PRINT));
            $this->info('Check your queue worker console for job processing.');
            $this->info('After a short delay, check your database for new questions related to this document.');
        } catch (\Exception $e) {
            $this->error('An error occurred during simulation: ' . $e->getMessage());
            if ($e instanceof \Illuminate\Validation\ValidationException) {
                $this->error('Validation errors: ' . json_encode($e->errors(), JSON_PRETTY_PRINT));
            }
            return Command::FAILURE;
        } finally {
            // Clean up the dummy file if it was created by the command
            if (!$filePath && file_exists($fullPathToDummyFile)) {
                unlink($fullPathToDummyFile);
                $this->info("Cleaned up dummy file: {$fullPathToDummyFile}");
            }
        }

        return Command::SUCCESS;
    }
}
