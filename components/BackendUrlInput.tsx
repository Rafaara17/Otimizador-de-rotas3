
import React from 'react';

interface BackendUrlInputProps {
    backendUrl: string;
    onBackendUrlChange: (url: string) => void;
    isBackendConnected: boolean | null;
}

export const BackendUrlInput: React.FC<BackendUrlInputProps> = ({ backendUrl, onBackendUrlChange, isBackendConnected }) => {
    
    const getStatusIndicator = () => {
        const baseClasses = "w-3 h-3 rounded-full transition-colors flex-shrink-0";
        if (isBackendConnected === null) {
            return <div className={`${baseClasses} bg-gray-400 animate-pulse`} title="Verificando..."></div>;
        }
        if (isBackendConnected) {
            return <div className={`${baseClasses} bg-green-500`} title="Conectado ao Python Backend"></div>;
        }
        return <div className={`${baseClasses} bg-red-500`} title="Backend offline"></div>;
    };

    return (
        <div>
            <label htmlFor="backend-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL do Backend (Opcional)
            </label>
            <div className="flex items-center space-x-2">
                <div className="relative flex-grow">
                    <input
                        id="backend-url"
                        type="text"
                        value={backendUrl}
                        onChange={(e) => onBackendUrlChange(e.target.value)}
                        placeholder="http://127.0.0.1:8000"
                        className="w-full pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-sm"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                         {getStatusIndicator()}
                    </div>
                </div>
            </div>
             <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Se conectado (verde), usará o algoritmo de Christofides do Python. Se offline (vermelho), usará o navegador.
            </p>
        </div>
    );
};
