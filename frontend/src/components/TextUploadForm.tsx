'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';

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
            const response = await api.post('/api/documents/from-text', { text });
            const data = response.data;
            router.push(`/quiz/${data.document.id}`);
        } catch (err: unknown) {
            if (err && typeof err === 'object') {
                const axiosError = err as {
                    response?: { data?: { message?: string } };
                    request?: unknown;
                    message?: string;
                };

                // Network or CORS error: no response received from server
                if (!axiosError.response && axiosError.request) {
                    setError(
                        'Cannot reach the quiz service. Please make sure the backend server is running and reachable.'
                    );
                    return;
                }

                const message =
                    axiosError.response?.data?.message ||
                    axiosError.message ||
                    'Failed to upload text.';
                setError(message);
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unknown error occurred.');
            }
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
