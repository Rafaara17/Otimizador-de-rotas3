import { geocodeAddresses, getTravelTimeMatrix } from '../services/orsService';
import { Address, Route } from '../types';

/**
 * Calculates the total time for a specific path given the time matrix.
 */
function calculatePathTime(path: number[], matrix: number[][]): number {
    let time = 0;
    for (let i = 0; i < path.length - 1; i++) {
        time += matrix[path[i]][path[i + 1]];
    }
    // Add return to origin
    time += matrix[path[path.length - 1]][path[0]];
    return time;
}

/**
 * Solves TSP using Brute Force.
 * Guaranteed to find the OPTIMAL solution.
 * Computational complexity is O((N-1)!), so it is only feasible for N <= 10.
 */
function solveTspBruteForce(matrix: number[][]): { path: number[], totalTime: number } {
    const numLocations = matrix.length;
    // We assume index 0 is the start/end point.
    // We need to permute indices [1, 2, ..., numLocations - 1]
    const locationsToVisit: number[] = [];
    for (let i = 1; i < numLocations; i++) {
        locationsToVisit.push(i);
    }

    let minTime = Infinity;
    let bestPath: number[] = [];

    // Helper to generate permutations (Heap's Algorithm or simple recursion)
    const permute = (arr: number[], m: number[] = []) => {
        if (arr.length === 0) {
            // Full permutation generated. Reconstruct full path with origin.
            const currentPath = [0, ...m];
            const time = calculatePathTime(currentPath, matrix);
            if (time < minTime) {
                minTime = time;
                bestPath = currentPath; // Store the best path found so far
            }
        } else {
            for (let i = 0; i < arr.length; i++) {
                const curr = arr.slice();
                const next = curr.splice(i, 1);
                permute(curr.slice(), m.concat(next));
            }
        }
    };

    permute(locationsToVisit);

    // Ensure the path is closed correctly for the return structure
    // Our calculatePathTime assumes the return leg, but the output expects just the sequence of stops
    // We add the return to 0 at the end manually for consistency with the other algo
    return { path: [...bestPath, 0], totalTime: minTime };
}

/**
 * Solves TSP using Nearest Neighbor heuristic.
 * Fast O(N^2), but usually suboptimal.
 */
function solveTspNearestNeighbor(matrix: number[][]): { path: number[], totalTime: number } {
    const numLocations = matrix.length;
    const visited = new Array(numLocations).fill(false);
    const path: number[] = [0]; // Start at origin
    visited[0] = true;
    let currentLocation = 0;

    for (let i = 0; i < numLocations - 1; i++) {
        let nearestLocation = -1;
        let minTime = Infinity;

        for (let j = 0; j < numLocations; j++) {
            if (!visited[j] && matrix[currentLocation][j] < minTime) {
                minTime = matrix[currentLocation][j];
                nearestLocation = j;
            }
        }

        if (nearestLocation !== -1) {
            path.push(nearestLocation);
            visited[nearestLocation] = true;
            currentLocation = nearestLocation;
        }
    }

    path.push(0); // Return to origin
    const totalTime = calculatePathTime(path.slice(0, -1), matrix); // calculatePathTime adds the return leg logic

    return { path, totalTime };
}

/**
 * Improves a route using the 2-Opt algorithm.
 * It iteratively attempts to swap two edges to see if the total distance decreases.
 * Used to refine the Nearest Neighbor result.
 */
function optimizeTwoOpt(initialPath: number[], matrix: number[][]): { path: number[], totalTime: number } {
    // Current path includes return to 0 at the end. e.g. [0, 2, 1, 3, 0]
    let path = [...initialPath];
    let improved = true;
    const n = path.length; 

    // Calculate initial time
    let bestTime = calculatePathTime(path.slice(0, -1), matrix);

    while (improved) {
        improved = false;
        // We look for two segments to swap.
        // Path is like: 0 -> A -> B -> ... -> Y -> Z -> 0
        // We skip the start node (index 0) and the duplicate end node (index n-1) for the loop boundaries carefully
        for (let i = 1; i < n - 2; i++) {
            for (let j = i + 1; j < n - 1; j++) {
                // Determine if swap (reversing segment i to j) improves the route
                // Logic: Simulate reversal and check total time. 
                // Since this is JS and N is small (<50), recalculating full path time is safer/easier than delta math for asymmetrical matrices
                
                const newPath = [...path];
                // Reverse the segment from i to j
                const segment = newPath.slice(i, j + 1).reverse();
                newPath.splice(i, segment.length, ...segment);
                
                const newTime = calculatePathTime(newPath.slice(0, -1), matrix);

                if (newTime < bestTime) {
                    path = newPath;
                    bestTime = newTime;
                    improved = true;
                }
            }
        }
    }
    
    return { path, totalTime: bestTime };
}


/**
 * Orquestra a otimização de rota.
 * Estratégia Híbrida:
 * 1. N <= 10: Usa Força Bruta (Resultado Ótimo Garantido).
 * 2. N > 10: Usa Vizinho Mais Próximo + Otimização 2-Opt (Aproximação de Alta Qualidade).
 */
export async function optimizeRoute(
    startAddress: Address,
    destinations: Address[],
    setLoadingMessage: (message: string) => void,
): Promise<Route> {
    const allAddresses = [startAddress, ...destinations];
    
    // Etapa 1: Geocodificação
    setLoadingMessage('Geocodificando endereços...');
    const { geocodedAddresses, failedAddresses } = await geocodeAddresses(allAddresses);

    if (geocodedAddresses.length < 2) {
        throw new Error('Não foi possível geocodificar endereços suficientes para criar uma rota.');
    }

    let warning: string | undefined = undefined;
    if (failedAddresses.length > 0) {
        warning = `Não foi possível localizar ${failedAddresses.length} endereço(s): ${failedAddresses.map(a => a.value).join(', ')}. Eles foram removidos da rota.`;
    }

    // Etapa 2: Matriz de Tempo de Viagem
    setLoadingMessage('Calculando tempos de viagem...');
    const timeMatrixResponse = await getTravelTimeMatrix(geocodedAddresses);

    // Valida e limpa a matriz (substitui null por Infinity para nós inalcançáveis)
    const timeMatrix = timeMatrixResponse.map(row => 
        row.map(time => time === null ? Infinity : time)
    );

    // Etapa 3: Resolver o TSP
    const numLocations = geocodedAddresses.length;
    let result: { path: number[], totalTime: number };

    // Limite de 10 locais (1 origem + 9 destinos) para força bruta (9! = 362,880 permutações, ~100-300ms)
    // Se passar disso, usamos heurística.
    if (numLocations <= 10) {
        setLoadingMessage('Calculando rota exata (Força Bruta)...');
        result = solveTspBruteForce(timeMatrix);
    } else {
        setLoadingMessage('Otimizando rota (Heurística Avançada)...');
        const initial = solveTspNearestNeighbor(timeMatrix);
        result = optimizeTwoOpt(initial.path, timeMatrix);
    }

    // Etapa 4: Formatar o resultado
    const orderedAddresses = result.path.map(index => geocodedAddresses[index].value);
    const totalTimeInMinutes = Math.round(result.totalTime / 60);

    return {
        orderedAddresses: orderedAddresses,
        totalTime: totalTimeInMinutes,
        warning: warning,
    };
}