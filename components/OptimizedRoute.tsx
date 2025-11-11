
import React from 'react';
import { Route } from '../types';
import { MapPinIcon } from './icons/MapPinIcon';

interface OptimizedRouteProps {
    route: Route;
}

const generateGoogleMapsUrl = (addresses: string[]): string => {
    const baseUrl = 'https://www.google.com/maps/dir/?api=1';
    const origin = `origin=${encodeURIComponent(addresses[0])}`;
    const destination = `destination=${encodeURIComponent(addresses[addresses.length - 1])}`;
    
    const waypoints = addresses.length > 2 
        ? `waypoints=${addresses.slice(1, -1).map(addr => encodeURIComponent(addr)).join('|')}` 
        : '';

    return [baseUrl, origin, destination, waypoints].filter(Boolean).join('&');
};


export const OptimizedRoute: React.FC<OptimizedRouteProps> = ({ route }) => {
    const googleMapsUrl = generateGoogleMapsUrl(route.orderedAddresses);
    
    return (
        <div className="w-full text-left">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Rota Otimizada</h2>
            {route.warning && (
                <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg text-yellow-800 dark:text-yellow-300 text-sm">
                    <p><strong>Atenção:</strong> {route.warning}</p>
                </div>
            )}
            <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                    Tempo Total Estimado: <span className="text-blue-600 dark:text-blue-400">{route.totalTime} minutos</span>
                </p>
            </div>
            <ol className="relative border-l border-gray-200 dark:border-gray-700 space-y-4 ml-2">
                {route.orderedAddresses.map((address, index) => (
                    <li key={index} className="ml-6">
                        <span className="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -left-3 ring-8 ring-white dark:ring-gray-800 dark:bg-blue-900">
                            {index === 0 ? <MapPinIcon className="w-3.5 h-3.5 text-blue-800 dark:text-blue-300" /> : <span className="text-xs font-bold text-blue-800 dark:text-blue-300">{index}</span>}
                        </span>
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                           <h3 className="flex items-center mb-1 text-md font-semibold text-gray-900 dark:text-white">
                                {index === 0 ? 'Partida' : index === route.orderedAddresses.length - 1 ? 'Retorno' : `Parada ${index}`}
                            </h3>
                            <p className="text-sm font-normal text-gray-600 dark:text-gray-400">{address}</p>
                        </div>
                    </li>
                ))}
            </ol>
            <div className="mt-6">
                 <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full block text-center bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
                >
                    Abrir no Google Maps
                </a>
            </div>
        </div>
    );
};
