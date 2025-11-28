
import React, { useState, useCallback, useEffect } from 'react';
import { AddressInput } from './components/AddressInput';
import { ImageUploader } from './components/ImageUploader';
import { AddressList } from './components/AddressList';
import { OptimizedRoute } from './components/OptimizedRoute';
import { Spinner } from './components/Spinner';
import { extractAddressFromImage } from './services/geminiService';
import { optimizeRoute } from './utils/routeOptimizer';
import { initPyodide } from './services/pythonService';
import { fileToBase64 } from './utils/imageUtils';
import { Address, Route } from './types';

// Default OpenRouteService Key
const DEFAULT_ORS_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjE2MWY1YTIzYjRhNTQzNDI4MDA4ZWIwMjdiMWQwYzY1IiwiaCI6Im11cm11cjY0In0=';

const App: React.FC = () => {
    const [startAddress, setStartAddress] = useState<Address | null>(null);
    const [destinations, setDestinations] = useState<Address[]>([]);
    const [optimizedRoute, setOptimizedRoute] = useState<Route | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    
    // Initializes Python environment in background
    useEffect(() => {
        initPyodide().catch(e => console.error("Background Python load failed", e));
    }, []);

    const handleImageUpload = async (files: FileList) => {
        if (!files.length) return;
        setIsLoading(true);
        setLoadingMessage('Lendo endereço da imagem...');
        setError(null);
        setOptimizedRoute(null);

        try {
            for (const file of Array.from(files)) {
                const { base64, mimeType } = await fileToBase64(file);
                const addressText = await extractAddressFromImage(base64, mimeType);
                if (addressText) {
                    setDestinations(prev => [...prev, { id: Date.now() + Math.random(), value: addressText }]);
                } else {
                    throw new Error('Não foi possível detectar um endereço na imagem enviada.');
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido durante o processamento da imagem.');
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const addManualAddress = (address: string) => {
        if (address.trim()) {
            setOptimizedRoute(null);
            setDestinations(prev => [...prev, { id: Date.now(), value: address.trim() }]);
        }
    };
    
    const updateStartAddress = (address: string) => {
        setOptimizedRoute(null);
        if(address.trim()) {
            setStartAddress({ id: 0, value: address.trim() });
        } else {
            setStartAddress(null);
        }
    }

    const removeAddress = (idToRemove: number) => {
        setOptimizedRoute(null);
        setDestinations(prev => prev.filter(addr => addr.id !== idToRemove));
    };

    const handleOptimizeRoute = useCallback(async () => {
        if (!startAddress || destinations.length === 0) {
            setError('Por favor, forneça um endereço de partida e pelo menos um destino.');
            return;
        }

        setIsLoading(true);
        setLoadingMessage('Iniciando otimização...');
        setError(null);
        setOptimizedRoute(null);

        try {
            const route = await optimizeRoute(
                startAddress, 
                destinations, 
                setLoadingMessage,
                DEFAULT_ORS_KEY
            );
            setOptimizedRoute(route);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao calcular a rota.');
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    }, [startAddress, destinations]);


    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
            <header className="bg-white dark:bg-gray-800 shadow-md">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <h1 className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 tracking-tight">
                        Otimizador de Rotas SaaS
                    </h1>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Powered by Gemini AI & Python (WebAssembly)
                    </p>
                </div>
            </header>
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                         <AddressInput onAddAddress={addManualAddress} onStartAddressChange={updateStartAddress}/>
                         <ImageUploader onImageUpload={handleImageUpload} />
                         <AddressList startAddress={startAddress} destinations={destinations} onRemoveAddress={removeAddress} />
                         
                         <div className="pt-4">
                             <button
                                 onClick={handleOptimizeRoute}
                                 disabled={!startAddress || destinations.length === 0 || isLoading}
                                 className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-300 flex items-center justify-center"
                                 aria-label="Otimizar Rota"
                             >
                                 Otimizar Rota
                             </button>
                             <p className="text-xs text-center text-gray-400 mt-2">
                                 --------------
                             </p>
                         </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col items-center justify-center min-h-[300px]">
                        {isLoading ? (
                            <Spinner message={loadingMessage} />
                        ) : error ? (
                             <div className="text-center text-red-500">
                                <p className="font-semibold">Erro</p>
                                <p>{error}</p>
                            </div>
                        ) : optimizedRoute ? (
                            <OptimizedRoute route={optimizedRoute} />
                        ) : (
                            <div className="text-center text-gray-500 dark:text-gray-400">
                                <p className="font-semibold text-lg">Sua rota otimizada aparecerá aqui.</p>
                                <p>Adicione endereços e clique em "Otimizar Rota".</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;
