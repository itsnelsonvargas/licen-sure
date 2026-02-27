'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TextUploadForm() {
    const [text, setText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (!text.trim()) {
            setError('Please enter some text.');
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch('/backend-api/documents/from-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ text }),
            });

            if (!res.ok) {
                // Try to read a useful error message from the response
                let message = 'Failed to upload text.';
                try {
                    const data = await res.json();
                    if (data && typeof data === 'object' && 'message' in data) {
                        message = (data as { message?: string }).message || message;
                    }
                } catch {
                    try {
                        const textBody = await res.text();
                        if (textBody) {
                            message = textBody;
                        }
                    } catch {
                        // ignore - keep default message
                    }
                }
                setError(message);
                return;
            }

            // Successful response – assume JSON with document id
            const data = await res.json();
            if (!data || typeof data !== 'object' || !('document' in data) || !(data as any).document?.id) {
                setError('Unexpected response from quiz service.');
                return;
            }

            router.push(`/quiz/${(data as any).document.id}`);
        } catch {
            setError(
                'Cannot reach the quiz service. Please make sure the backend server is running and reachable.'
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Generate Quiz from Text</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit}>
                    <div className="grid w-full items-center gap-4">
                        <Textarea
                            placeholder="Paste your text here..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            rows={10}
                            disabled={isLoading}
                        />
                        <Button type="submit" disabled={isLoading || !text.trim()}>
                            {isLoading ? 'Generating Quiz...' : 'Generate Quiz'}
                        </Button>
                    </div>
                    {error && <p className="text-red-500 mt-4">{error}</p>}
                </form>
            </CardContent>
        </Card>
    );
}
