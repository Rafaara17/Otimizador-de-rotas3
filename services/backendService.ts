
import { Address, Route } from '../types';

/**
 * Sends geocoded addresses to the backend for Christofides optimization.
 */
export async function fetchOptimizedRoute(
    startAddress: Address, 
    destinations: Address[], 
    apiKey: string,
    backendUrl: string
): Promise<Route> {
    
    const API_ENDPOINT = `${backendUrl.replace(/\/$/, '')}/api/optimize-route`;

    const payload = {
        startAddress: startAddress,
        destinations: destinations,
        apiKey: apiKey // Pass the key so backend can query ORS Matrix
    };

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.detail || `Erro do servidor: ${response.status}`);
        }

        const route: Route = await response.json();
        return route;

    } catch (error) {
        throw error;
    }
}

/**
 * Checks backend health.
 */
export async function checkBackendHealth(backendUrl: string): Promise<boolean> {
    if (!backendUrl || !backendUrl.startsWith('http')) {
        return false;
    }
    const HEALTH_ENDPOINT = `${backendUrl.replace(/\/$/, '')}/api/health`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); 

        const response = await fetch(HEALTH_ENDPOINT, {
            method: 'GET',
            signal: controller.signal,
            headers: { 'Accept': 'application/json' },
        });
        
        clearTimeout(timeoutId);
        return response.ok;
    } catch (error) {
        return false;
    }
}
