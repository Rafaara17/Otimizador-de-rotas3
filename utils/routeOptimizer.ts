import { geocodeAddresses, getTravelTimeMatrix } from '../services/orsService';
import { runChristofidesInBrowser } from '../services/pythonService';
import { Address, Route } from '../types';

/**
 * Calculates the total time for a specific path given the time matrix.
 */
function calculatePathTime(path: number[], matrix: number[][]): number {
    let time = 0;
    for (let i = 0; i < path.length - 1; i++) {
        time += matrix[path[i]][path[i + 1]];
    }
    // Add return to origin if not already there
    // Note: The path logic usually includes return to 0, but just in case
    if (path[path.length - 1] !== path[0]) {
        time += matrix[path[path.length - 1]][path[0]];
    }
    return time;
}

/**
 * Solves TSP using Brute Force.
 * Guaranteed to find the OPTIMAL solution.
 * Computational complexity is O((N-1)!), so it is only feasible for N <= 10.
 */
function solveTspBruteForce(matrix: number[][]): { path: number[], totalTime: number } {
    const numLocations = matrix.length;
    const locationsToVisit: number[] = [];
    // Start from 1 because 0 is the start node (fixed)
    for (let i = 1; i < numLocations; i++) {
        locationsToVisit.push(i);
    }

    let minTime = Infinity;
    let bestPath: number[] = [];

    const permute = (arr: number[], m: number[] = []) => {
        if (arr.length === 0) {
            const currentPath = [0, ...m];
            // We need to calculate the closed loop time
            let time = 0;
            for(let i=0; i<currentPath.length -1; i++){
                time += matrix[currentPath[i]][currentPath[i+1]];
            }
            time += matrix[currentPath[currentPath.length-1]][0]; // Return to start

            if (time < minTime) {
                minTime = time;
                bestPath = currentPath; 
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
    return { path: [...bestPath, 0], totalTime: minTime };
}

/**
 * Main optimization function.
 * Uses pure JS Brute Force for small sets (<= 10).
 * Uses Python (Pyodide) running Christofides for larger sets.
 */
export async function optimizeRoute(
    startAddress: Address,
    destinations: Address[],
    setLoadingMessage: (message: string) => void,
    apiKey: string
): Promise<Route> {
    const allAddresses = [startAddress, ...destinations];
    
    // Etapa 1: Geocodificação
    setLoadingMessage('Geocodificando endereços...');
    const { geocodedAddresses, failedAddresses } = await geocodeAddresses(allAddresses, apiKey);

    // Validação CRÍTICA: O endereço de partida (índice 0 original) precisa existir.
    // Como geocodeAddresses preserva ordem, se o startAddress teve sucesso, ele será o primeiro da lista geocodedAddresses?
    // Não necessariamente, pois o filter remove os nulos e encurta a lista.
    // Precisamos verificar pelo ID.
    const startAddressGeocoded = geocodedAddresses.find(addr => addr.id === startAddress.id);

    if (!startAddressGeocoded) {
        throw new Error(`O endereço de partida "${startAddress.value}" não pôde ser localizado no mapa. Verifique a escrita e tente novamente.`);
    }

    // Se o startAddress existe, precisamos garantir que ele é o PRIMEIRO da lista (índice 0)
    // para que a matriz de distâncias seja construída corretamente (linha 0 = partida).
    // Se a geocodificação preservou a ordem relativa, e o startAddress (que era o primeiro) não falhou,
    // ele deve ser o geocodedAddresses[0].
    if (geocodedAddresses[0].id !== startAddress.id) {
        // Isso não deveria acontecer com a correção no orsService, mas por segurança:
        const startIdx = geocodedAddresses.findIndex(a => a.id === startAddress.id);
        if (startIdx > -1) {
             const temp = geocodedAddresses[0];
             geocodedAddresses[0] = geocodedAddresses[startIdx];
             geocodedAddresses[startIdx] = temp;
        }
    }

    if (geocodedAddresses.length < 2) {
        throw new Error('É necessário pelo menos o endereço de partida e um destino válido para criar uma rota.');
    }

    let warning: string | undefined = undefined;
    if (failedAddresses.length > 0) {
        warning = `Não foi possível localizar ${failedAddresses.length} endereço(s): ${failedAddresses.map(a => a.value).join(', ')}. Eles foram removidos da rota.`;
    }

    // Etapa 2: Matriz de Tempo
    setLoadingMessage('Obtendo dados de tráfego (OpenRouteService)...');
    const timeMatrixResponse = await getTravelTimeMatrix(geocodedAddresses, apiKey);

    const timeMatrix = timeMatrixResponse.map(row => 
        row.map(time => time === null ? Infinity : time)
    );

    // Etapa 3: Resolver TSP
    const numLocations = geocodedAddresses.length;
    let pathIndices: number[] = [];
    let methodUsed = "";

    // Para N pequeno, Brute Force em JS é mais rápido que carregar o Python e é ÓTIMO GLOBAL
    if (numLocations <= 8) {
        setLoadingMessage('Calculando rota exata (Força Bruta)...');
        const result = solveTspBruteForce(timeMatrix);
        pathIndices = result.path; 
        methodUsed = "Otimização Exata (Força Bruta)";
    } else {
        // Para N grande, usamos Python no navegador
        setLoadingMessage('Carregando Python e Otimizando (Christofides)...');
        try {
            // runChristofidesInBrowser deve retornar caminho começando com 0
            const uniquePath = await runChristofidesInBrowser(timeMatrix);
            pathIndices = [...uniquePath, 0]; // Fecha o ciclo
            methodUsed = "Otimização Python (Christofides via WebAssembly)";
        } catch (e) {
            console.error(e);
            throw new Error("Erro ao executar o otimizador Python no navegador.");
        }
    }

    // Calcular tempo total
    let totalTimeSeconds = 0;
    for (let i = 0; i < pathIndices.length - 1; i++) {
        totalTimeSeconds += timeMatrix[pathIndices[i]][pathIndices[i+1]];
    }

    const orderedAddresses = pathIndices.map(index => geocodedAddresses[index].value);
    
    const totalTimeInMinutes = Math.round(totalTimeSeconds / 60);

    return {
        orderedAddresses: orderedAddresses,
        totalTime: totalTimeInMinutes,
        warning: warning ? `${warning} (${methodUsed})` : `Método: ${methodUsed}`,
    };
}