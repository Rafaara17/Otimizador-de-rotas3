import { geocodeAddresses, getTravelTimeMatrix } from '../services/orsService';
import { Address, Route } from '../types';

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

// Calcula o tempo total da rota, retornando Infinity se algum trecho for impossível (null ou inválido)
function calculateTotalTimeFromMatrix(routeIndices: number[], matrix: (number | null)[][]): number {
    let totalTime = 0;
    for (let i = 0; i < routeIndices.length - 1; i++) {
        const fromIndex = routeIndices[i];
        const toIndex = routeIndices[i + 1];
        const legTime = matrix[fromIndex][toIndex];
        // Torna a verificação mais robusta: qualquer valor não numérico invalida a rota.
        if (typeof legTime !== 'number') {
            return Infinity; 
        }
        totalTime += legTime;
    }
    return totalTime;
}

/**
 * Refina uma rota usando o algoritmo 2-opt com a matriz de tempo.
 */
function twoOpt(routeIndices: number[], matrix: (number | null)[][]): number[] {
    let bestRoute = [...routeIndices];
    let improved = true;
    while (improved) {
        improved = false;
        for (let i = 1; i < bestRoute.length - 2; i++) {
            for (let j = i + 1; j < bestRoute.length - 1; j++) {
                const leg1 = matrix[bestRoute[i - 1]][bestRoute[i]];
                const leg2 = matrix[bestRoute[j]][bestRoute[j + 1]];
                const newLeg1 = matrix[bestRoute[i - 1]][bestRoute[j]];
                const newLeg2 = matrix[bestRoute[i]][bestRoute[j + 1]];

                // Se algum dos trechos envolvidos na troca for inválido, pule a troca.
                if (leg1 === null || leg2 === null || newLeg1 === null || newLeg2 === null) {
                    continue;
                }

                if ((newLeg1 + newLeg2) < (leg1 + leg2)) {
                    const newRoute = [
                        ...bestRoute.slice(0, i),
                        ...bestRoute.slice(i, j + 1).reverse(),
                        ...bestRoute.slice(j + 1)
                    ];
                    bestRoute = newRoute;
                    improved = true;
                }
            }
        }
    }
    return bestRoute;
}


/**
 * Heurística avançada usando a matriz de tempo (Nearest Neighbor + 2-Opt).
 */
function optimizeRouteHeuristic(matrix: (number | null)[][]): { routeIndices: number[], totalTime: number } {
    const numStops = matrix.length;
    const startNodeIndex = 0;
    const destinationIndices = Array.from({ length: numStops - 1 }, (_, i) => i + 1);

    let bestRoute: number[] = [];
    let minTime = Infinity;

    // Nearest Neighbor com múltiplos pontos de partida para robustez
    for (const seedIndex of destinationIndices) {
        let unvisited = new Set(destinationIndices.filter(i => i !== seedIndex));
        let currentStopIndex = seedIndex;
        const currentPermutation: number[] = [seedIndex];

        while (unvisited.size > 0) {
            let nearestIndex = -1;
            let shortestTime = Infinity;

            for (const stopIndex of unvisited) {
                const time = matrix[currentStopIndex][stopIndex];
                if (time !== null && time < shortestTime) {
                    shortestTime = time;
                    nearestIndex = stopIndex;
                }
            }
            
            if (nearestIndex !== -1) {
                currentStopIndex = nearestIndex;
                currentPermutation.push(currentStopIndex);
                unvisited.delete(nearestIndex);
            } else {
                // Se não encontrar um vizinho alcançável, esta permutação falhou.
                break;
            }
        }

        // Se a permutação não incluiu todos os destinos, é inválida.
        if (currentPermutation.length !== destinationIndices.length) continue;

        const initialRoute = [startNodeIndex, ...currentPermutation, startNodeIndex];
        const refinedRoute = twoOpt(initialRoute, matrix);
        const totalTime = calculateTotalTimeFromMatrix(refinedRoute, matrix);
        
        if (totalTime < minTime) {
            minTime = totalTime;
            bestRoute = refinedRoute;
        }
    }

    return {
        routeIndices: bestRoute,
        totalTime: minTime,
    };
}


/**
 * Força bruta usando a matriz de tempo. Reformulado para garantir a seleção do menor tempo.
 */
function optimizeRouteBruteForce(matrix: (number | null)[][]): { routeIndices: number[], totalTime: number } {
    const startNodeIndex = 0;
    const destinationIndices = Array.from({ length: matrix.length - 1 }, (_, i) => i + 1);
    
    // Gera todas as possíveis ordenações dos destinos.
    const permutations = getPermutations(destinationIndices);

    // Usa 'reduce' para iterar por todas as permutações e encontrar aquela com o tempo mínimo.
    // Esta é uma abordagem funcional e robusta para encontrar a melhor rota.
    const bestResult = permutations.reduce(
        (bestSoFar, currentPerm) => {
            // Constrói a rota completa: Partida -> Destinos na ordem da permutação -> Retorno à Partida
            const currentRoute = [startNodeIndex, ...currentPerm, startNodeIndex];
            
            let currentTime = 0;
            let isRouteValid = true;

            // Calcula o tempo total para a permutação atual
            for (let i = 0; i < currentRoute.length - 1; i++) {
                const from = currentRoute[i];
                const to = currentRoute[i + 1];
                const legTime = matrix[from][to];

                // Se qualquer trecho da rota for impossível, a rota inteira é inválida.
                if (legTime === null) {
                    isRouteValid = false;
                    break;
                }
                currentTime += legTime;
            }

            // A LÓGICA CENTRAL: Se a rota atual for válida e seu tempo for MENOR que
            // o melhor tempo encontrado até agora, ela se torna a nova "melhor rota".
            if (isRouteValid && currentTime < bestSoFar.totalTime) {
                return { routeIndices: currentRoute, totalTime: currentTime };
            }

            // Caso contrário, mantém a melhor rota que já tínhamos.
            return bestSoFar;
        },
        // O valor inicial: a "melhor rota" começa com um tempo infinito,
        // garantindo que a primeira rota válida encontrada se torne a melhor.
        { routeIndices: [], totalTime: Infinity }
    );

    return bestResult;
}


/**
 * Função principal que orquestra a geocodificação, cálculo da matriz e otimização.
 */
export async function optimizeRoute(
    startAddress: Address,
    destinations: Address[],
    setLoadingMessage: (message: string) => void
): Promise<Route> {
    
    // Etapa 1: Geocodificar o endereço de partida para obter um "ponto de foco"
    setLoadingMessage('Localizando ponto de partida...');
    const { geocodedAddresses: geocodedStartResult, failedAddresses: failedStart } = await geocodeAddresses([startAddress]);
    
    if (failedStart.length > 0 || geocodedStartResult.length === 0) {
        throw new Error(`Não foi possível localizar o endereço de partida: "${startAddress.value}". Verifique o endereço e tente novamente.`);
    }
    const geocodedStart = geocodedStartResult[0];
    const focusPoint = { lat: geocodedStart.lat!, lng: geocodedStart.lng! };

    // Etapa 2: Geocodificar os destinos usando o ponto de partida como foco para aumentar a precisão
    setLoadingMessage(`Geocodificando ${destinations.length} destinos...`);
    const { geocodedAddresses: geocodedDests, failedAddresses: failedDests } = await geocodeAddresses(destinations, focusPoint);

    if (geocodedDests.length === 0) {
        throw new Error('Não foi possível localizar nenhum dos endereços de destino. Verifique os endereços fornecidos.');
    }

    // Monta a lista final de paradas para a matriz
    const finalStops = [geocodedStart, ...geocodedDests];
    
    setLoadingMessage(`Obtendo matriz de tempo para ${finalStops.length} locais...`);
    const travelTimeMatrix = await getTravelTimeMatrix(finalStops);
    
    let result: { routeIndices: number[], totalTime: number };
    let a_warning: string | undefined = undefined;

    const numDestinations = finalStops.length - 1;

    if (numDestinations <= 10) {
        setLoadingMessage(`Calculando rota ótima para ${numDestinations} destinos... (Força Bruta)`);
        result = optimizeRouteBruteForce(travelTimeMatrix);
    } else {
        setLoadingMessage(`Calculando rota ótima para ${numDestinations} destinos... (Heurística)`);
        result = optimizeRouteHeuristic(travelTimeMatrix);
        a_warning = "Com mais de 10 destinos, foi usada uma rota otimizada com heurísticas avançadas para um cálculo rápido e preciso.";
    }

    if (result.totalTime === Infinity || result.routeIndices.length === 0) {
        throw new Error("Não foi possível encontrar uma rota válida que conecte todos os destinos. Verifique se os locais são acessíveis por carro.");
    }

    const orderedAddresses = result.routeIndices.map(index => finalStops[index].value);
    
    const warnings = failedDests.map(addr => `Não foi possível localizar "${addr.value}", removido da rota.`);
    if (a_warning) warnings.unshift(a_warning);

    return {
        orderedAddresses,
        totalTime: Math.round(result.totalTime / 60), // Converte segundos para minutos
        warning: warnings.join(' ').trim() || undefined,
    };
}