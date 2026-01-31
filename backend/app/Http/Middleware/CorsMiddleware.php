<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CorsMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethod('OPTIONS')) {
            $response = response('', 204);
            $this->addCorsHeaders($request, $response);
            return $response;
        }

        $response = $next($request);
        $this->addCorsHeaders($request, $response);
        return $response;
    }

    private function addCorsHeaders(Request $request, Response $response): void
    {
        $origin = $request->headers->get('Origin', 'http://localhost:3000');
        $allowedOrigin = $origin === 'http://localhost:3000' ? $origin : 'http://localhost:3000';

        $response->headers->set('Access-Control-Allow-Origin', $allowedOrigin);
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Accept, Origin, Authorization');
        $response->headers->set('Access-Control-Allow-Credentials', 'true');
    }
}
