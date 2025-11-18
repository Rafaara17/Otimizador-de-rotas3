import { Address } from '../types';

const ORS_API_BASE = 'https://api.openrouteservice.org';
const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjE2MWY1YTIzYjRhNTQzNDI4MDA4ZWIwMjdiMWQwYzY1IiwiaCI6Im11cm11cjY0In0=';


interface GeocodeResult {
    geocodedAddresses: Address[];
    failedAddresses: Address[];
}

interface FocusPoint {
    lat: number;
    lng: number;
}

/**
 * Geocodifica uma lista de endereços usando a API do OpenRouteService.
 * Pode receber um 'focusPoint' para priorizar resultados próximos a uma localização específica.
 */
export async function geocodeAddresses(addresses: Address[], focusPoint?: FocusPoint): Promise<GeocodeResult> {
    const geocodedAddresses: Address[] = [];
    const failedAddresses: Address[] = [];

    const requests = addresses.map(async (address) => {
        let url = `${ORS_API_BASE}/geocode/search?api_key=${ORS_API_KEY}&text=${encodeURIComponent(address.value)}`;
        if (focusPoint) {
            url += `&focus.point.lon=${focusPoint.lng}&focus.point.lat=${focusPoint.lat}`;
        }
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.error(`Falha na geocodificação para "${address.value}": ${response.statusText}`);
                failedAddresses.push(address);
                return;
            }
            const data = await response.json();
            if (data.features && data.features.length > 0) {
                const [lng, lat] = data.features[0].geometry.coordinates;
                geocodedAddresses.push({ ...address, lat, lng });
            } else {
                failedAddresses.push(address);
            }
        } catch (error) {
            console.error(`Erro de rede na geocodificação para "${address.value}":`, error);
            failedAddresses.push(address);
        }
    });

    await Promise.all(requests);
    return { geocodedAddresses, failedAddresses };
}

/**
 * Obtém uma matriz de tempos de viagem (em segundos) entre todos os pares de endereços fornecidos.
 * Esta é a maneira mais eficiente de obter os dados necessários para o TSP.
 */
export async function getTravelTimeMatrix(addresses: Address[]): Promise<(number | null)[][]> {
    const locations = addresses.map(addr => [addr.lng, addr.lat]);
    const url = `${ORS_API_BASE}/v2/matrix/driving-car`;

    const body = {
        locations: locations,
        metrics: ['duration'], // 'duration' para tempo, 'distance' para distância
        units: 'm'
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
                'Content-Type': 'application/json',
                'Authorization': ORS_API_KEY
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Falha na API de Matriz: ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        if (!data.durations) {
            throw new Error('A resposta da API de Matriz não continha durações.');
        }

        return data.durations;

    } catch (error) {
        console.error("Erro ao obter a matriz de tempo de viagem:", error);
        throw error;
    }
}