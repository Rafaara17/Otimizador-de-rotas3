
import React, { useState } from 'react';

interface AddressInputProps {
    onAddAddress: (address: string) => void;
    onStartAddressChange: (address: string) => void;
}

export const AddressInput: React.FC<AddressInputProps> = ({ onAddAddress, onStartAddressChange }) => {
    const [manualAddress, setManualAddress] = useState('');

    const handleAddClick = () => {
        onAddAddress(manualAddress);
        setManualAddress('');
    };
    
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleAddClick();
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <label htmlFor="start-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Endereço de Partida e Chegada (Origem)
                </label>
                <input
                    id="start-address"
                    type="text"
                    onChange={(e) => onStartAddressChange(e.target.value)}
                    placeholder="Ex: Av. Paulista, 1578, Bela Vista, São Paulo - SP"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700"
                />
            </div>
            <div>
                <label htmlFor="manual-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Adicionar Destino Manualmente
                </label>
                <div className="flex space-x-2">
                    <input
                        id="manual-address"
                        type="text"
                        value={manualAddress}
                        onChange={(e) => setManualAddress(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Digite um endereço de destino"
                        className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700"
                    />
                    <button
                        onClick={handleAddClick}
                        className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-md transition-colors"
                    >
                        Adicionar
                    </button>
                </div>
            </div>
        </div>
    );
};
