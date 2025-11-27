
import React from 'react';

interface BackendUrlInputProps {
    backendUrl: string;
    onBackendUrlChange: (url: string) => void;
    isBackendConnected: boolean | null;
}

export const BackendUrlInput: React.FC<BackendUrlInputProps> = ({ backendUrl, onBackendUrlChange, isBackendConnected }) => {
    
    const getStatusIndicator = () => {
        const baseClasses = "w-3 h-3 rounded-full transition-colors";
        if (isBackendConnected === null) {
            return <div className={`${baseClasses} bg-gray-400 animate-pulse`} title="Verificando conexão..."></div>;
        }
        if (isBackendConnected) {
            return <div className={`${baseClasses} bg-green-500`} title="Conectado ao servidor"></div>;
        }
        return <div className={`${baseClasses} bg-red-500`} title="Não foi possível conectar ao servidor"></div>;
    };

    return (
        <div>
            <label htmlFor="backend-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL do Servidor Backend
            </label>
            <div className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 pr-3">
                 <input
                    id="backend-url"
                    type="text"
                    value={backendUrl}
                    onChange={(e) => onBackendUrlChange(e.target.value)}
                    placeholder="Ex: http://127.0.0.1:8000"
                    className="w-full px-3 py-2 border-0 bg-transparent focus:outline-none focus:ring-0"
                />
                {getStatusIndicator()}
            </div>
             <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Insira o endereço onde seu backend Python (FastAPI/Uvicorn) está rodando. O indicador de status deve ficar verde.
            </p>
        </div>
    );
};
