
import { getTravelTime } from '../services/geminiService';
import { Address, Route } from '../types';

// Cache simples para evitar buscar os mesmos tempos de viagem repetidamente
const travelTimeCache: { [key: string]: number } = {};

async function getCachedTravelTime(from: string, to: string): Promise<number> {
    const key = `${from}|${to}`;
    if (travelTimeCache[key] !== undefined) {
        return travelTimeCache[key];
    }
    const time = await getTravelTime(from, to);
    travelTimeCache[key] = time;
    return time;
}

// Função auxiliar para gerar todas as permutações de um array
function getPermutations<T>(array: T[]): T[][] {
    if (array.length <= 1) {
        return [array];
    }

    const permutations: T[][] = [];
    const first = array[0];
    const rest = array.slice(1);

    const permsOfRest = getPermutations(rest);

    for (const perm of permsOfRest) {
        for (let i = 0; i <= perm.length; i++) {
            const newPerm = [...perm.slice(0, i), first, ...perm.slice(i)];
            permutations.push(newPerm);
        }
    }

    return permutations;
}

/**
 * Resolve o Problema do Caixeiro Viajante (TSP) usando a heurística do Vizinho Mais Próximo.
 */
async function optimizeRouteNearestNeighbor(startAddress: Address, destinations: Address[]): Promise<Route> {
    const allStops = destinations.map(d => d.value);
    let unvisited = [...allStops];
    let currentStop = startAddress.value;
    const orderedRoute: string[] = [currentStop];
    let totalTime = 0;

    while (unvisited.length > 0) {
        let nearestStop: string | null = null;
        let shortestTime = Infinity;

        const timePromises = unvisited.map(stop => getCachedTravelTime(currentStop, stop));
        const travelTimes = await Promise.all(timePromises);

        for (let i = 0; i < unvisited.length; i++) {
            if (travelTimes[i] < shortestTime) {
                shortestTime = travelTimes[i];
                nearestStop = unvisited[i];
            }
        }
        
        if (nearestStop) {
            totalTime += shortestTime;
            currentStop = nearestStop;
            orderedRoute.push(currentStop);
            unvisited = unvisited.filter(stop => stop !== nearestStop);
        } else {
            break;
        }
    }

    const timeToHome = await getCachedTravelTime(currentStop, startAddress.value);
    totalTime += timeToHome;
    orderedRoute.push(startAddress.value);

    return {
        orderedAddresses: orderedRoute,
        totalTime: Math.round(totalTime),
    };
}

/**
 * Resolve o TSP usando força bruta, testando todas as permutações possíveis.
 * Garante a rota ótima, mas só é viável para um número pequeno de destinos.
 */
async function optimizeRouteBruteForce(startAddress: Address, destinations: Address[]): Promise<Route> {
    const destinationValues = destinations.map(d => d.value);
    const permutations = getPermutations(destinationValues);

    let bestRoute: string[] = [];
    let minTime = Infinity;

    for (const perm of permutations) {
        const currentRoute = [startAddress.value, ...perm, startAddress.value];
        let currentTime = 0;

        const timePromises: Promise<number>[] = [];
        for (let i = 0; i < currentRoute.length - 1; i++) {
            timePromises.push(getCachedTravelTime(currentRoute[i], currentRoute[i + 1]));
        }
        
        const travelTimes = await Promise.all(timePromises);
        currentTime = travelTimes.reduce((sum, time) => sum + time, 0);

        if (currentTime < minTime) {
            minTime = currentTime;
            bestRoute = currentRoute;
        }
    }

    return {
        orderedAddresses: bestRoute,
        totalTime: Math.round(minTime),
    };
}

/**
 * Função principal que decide qual algoritmo de otimização usar.
 */
export async function optimizeRoute(startAddress: Address, destinations: Address[]): Promise<Route> {
    if (destinations.length === 0) {
        return { orderedAddresses: [startAddress.value, startAddress.value], totalTime: 0 };
    }
    
    // Para um número pequeno de destinos, a força bruta é viável e garante o resultado ótimo.
    // 8! = 40.320 permutações. 9! = 362.880. Vamos limitar a 8 por segurança.
    if (destinations.length <= 8) {
        return await optimizeRouteBruteForce(startAddress, destinations);
    } else {
        // Para mais destinos, recorremos a uma heurística mais rápida e adicionamos um aviso.
        const route = await optimizeRouteNearestNeighbor(startAddress, destinations);
        return {
            ...route,
            warning: "Com mais de 8 destinos, foi usada uma rota aproximada para um cálculo mais rápido. A rota pode não ser a ideal."
        };
    }
}
