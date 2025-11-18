
import React from 'react';

interface ApiKeyInputProps {
    apiKey: string;
    setApiKey: (key: string) => void;
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ apiKey, setApiKey }) => {
    return (
        <div>
            <label htmlFor="ors-api-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Chave da API do OpenRouteService
            </label>
            <input
                id="ors-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Insira sua chave de API aqui"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                A otimização de rotas agora usa o OpenRouteService para máxima precisão. 
                <a 
                    href="https://openrouteservice.org/dev/#/signup" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline dark:text-blue-400 ml-1"
                >
                    Obtenha sua chave de API gratuita.
                </a>
            </p>
        </div>
    );
};
