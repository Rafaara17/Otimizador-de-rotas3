
import { Address, Route } from '../types';

/**
 * Envia os endereços para o backend para otimização de rota.
 * O backend é responsável pela geocodificação, cálculo da matriz e execução do algoritmo TSP.
 */
export async function fetchOptimizedRoute(startAddress: Address, destinations: Address[], backendUrl: string): Promise<Route> {
    if (!backendUrl || !backendUrl.startsWith('http')) {
        throw new Error('A URL do backend é inválida. Ela deve começar com http:// ou https://');
    }
    
    // Constrói o endpoint completo usando a URL fornecida pelo usuário.
    const API_ENDPOINT = `${backendUrl.replace(/\/$/, '')}/api/optimize-route`;

    const payload = {
        startAddress: startAddress,
        destinations: destinations
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
            // Tenta extrair uma mensagem de erro do backend, se houver
            const errorData = await response.json().catch(() => null);
            const errorMessage = errorData?.error || `O servidor respondeu com o status ${response.status}`;
            throw new Error(errorMessage);
        }

        const route: Route = await response.json();
        return route;

    } catch (error) {
        console.error("Erro ao chamar o backend para otimização de rota:", error);
        
        // Propaga o erro para ser tratado pela UI.
        // O `fetch` falha em erros de rede (ex: servidor offline), então lidamos com isso também.
        if (error instanceof TypeError) { // Erro de rede
             throw new Error('Não foi possível conectar ao servidor de otimização. Verifique a conexão de rede ou se o servidor está online.');
        }
        if (error instanceof Error) {
            throw new Error(`Falha na comunicação com o servidor: ${error.message}`);
        }
        throw new Error("Ocorreu um erro desconhecido ao tentar otimizar a rota no servidor.");
    }
}


/**
 * Verifica a saúde do servidor backend fazendo uma chamada GET a um endpoint de health check.
 */
export async function checkBackendHealth(backendUrl: string): Promise<boolean> {
    if (!backendUrl || !backendUrl.startsWith('http')) {
        return false;
    }
    const HEALTH_ENDPOINT = `${backendUrl.replace(/\/$/, '')}/api/health`;

    try {
        // Usa um AbortController para definir um timeout curto para a verificação.
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 segundos de timeout

        const response = await fetch(HEALTH_ENDPOINT, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
            },
        });
        
        clearTimeout(timeoutId);
        return response.ok;
    } catch (error) {
        // Erros de rede ou timeout são esperados se o servidor estiver offline.
        return false;
    }
}
