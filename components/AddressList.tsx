
import React from 'react';
import { Address } from '../types';
import { MapPinIcon } from './icons/MapPinIcon';
import { TrashIcon } from './icons/TrashIcon';

interface AddressListProps {
    startAddress: Address | null;
    destinations: Address[];
    onRemoveAddress: (id: number) => void;
}

export const AddressList: React.FC<AddressListProps> = ({ startAddress, destinations, onRemoveAddress }) => {
    return (
        <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">
                Paradas da Viagem
            </h3>
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {startAddress && (
                    <li className="flex items-center p-2 bg-blue-50 dark:bg-blue-900/50 rounded-md">
                        <MapPinIcon className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-300 flex-grow">
                            <strong className="block">Origem:</strong>
                            {startAddress.value}
                        </span>
                    </li>
                )}
                {destinations.map((addr, index) => (
                    <li key={addr.id} className="flex items-center p-2 bg-gray-100 dark:bg-gray-700/50 rounded-md group">
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400 mr-3">{index + 1}.</span>
                        <span className="text-sm text-gray-700 dark:text-gray-300 flex-grow">{addr.value}</span>
                        <button
                            onClick={() => onRemoveAddress(addr.id)}
                            className="ml-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Remover endereço"
                        >
                            <TrashIcon className="h-5 w-5" />
                        </button>
                    </li>
                ))}
            </ul>
             {destinations.length === 0 && !startAddress && (
                <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">Nenhum endereço adicionado ainda.</p>
            )}
        </div>
    );
};
