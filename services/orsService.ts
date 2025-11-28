import { Address } from '../types';

const ORS_API_BASE = 'https://api.openrouteservice.org';

interface GeocodeResult {
    geocodedAddresses: Address[];
    failedAddresses: Address[];
}

interface FocusPoint {
    lat: number;
    lng: number;
}

/**
 * Geocodifica uma lista de endereços, garantindo que a ordem original seja preservada.
 */
export async function geocodeAddresses(
    addresses: Address[], 
    apiKey: string,
    focusPoint?: FocusPoint
): Promise<GeocodeResult> {
    // Usamos Promise.all para esperar todos, mas mapemos o resultado para manter a ordem dos índices
    const results = await Promise.all(addresses.map(async (address) => {
        let url = `${ORS_API_BASE}/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(address.value)}`;
        if (focusPoint) {
            url += `&focus.point.lon=${focusPoint.lng}&focus.point.lat=${focusPoint.lat}`;
        }
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                return null;
            }
            const data = await response.json();
            if (data.features && data.features.length > 0) {
                const [lng, lat] = data.features[0].geometry.coordinates;
                return { ...address, lat, lng };
            } else {
                return null;
            }
        } catch (error) {
            return null;
        }
    }));

    // Filtra os sucessos mantendo a ordem relativa original
    const geocodedAddresses = results.filter((addr) => addr !== null) as Address[];
    
    // Identifica quais falharam
    const failedAddresses = addresses.filter((_, index) => results[index] === null);

    return { geocodedAddresses, failedAddresses };
}

/**
 * Obtém matriz de tempos.
 */
export async function getTravelTimeMatrix(addresses: Address[], apiKey: string): Promise<(number | null)[][]> {
    const locations = addresses.map(addr => [addr.lng, addr.lat]);
    const url = `${ORS_API_BASE}/v2/matrix/driving-car`;

    const body = {
        locations: locations,
        metrics: ['duration'], 
        units: 'm'
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
                'Content-Type': 'application/json',
                'Authorization': apiKey
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Falha na API de Matriz: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.durations) {
            throw new Error('Sem dados de duração.');
        }

        return data.durations;

    } catch (error) {
        throw error;
    }
}