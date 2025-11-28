
declare global {
    interface Window {
        loadPyodide: any;
    }
}

let pyodide: any = null;
let pyodideReadyPromise: Promise<void> | null = null;

export async function initPyodide() {
    if (pyodideReadyPromise) return pyodideReadyPromise;

    pyodideReadyPromise = (async () => {
        try {
            console.log("Inicializando Python (Pyodide)...");
            pyodide = await window.loadPyodide();
            
            console.log("Carregando gerenciador de pacotes...");
            await pyodide.loadPackage("micropip");
            const micropip = pyodide.pyimport("micropip");
            
            console.log("Instalando NetworkX (para Christofides)...");
            await micropip.install("networkx");
            
            console.log("Ambiente Python pronto para uso.");
        } catch (error) {
            console.error("Falha ao carregar Pyodide:", error);
            pyodideReadyPromise = null; // Reset promise on failure to allow retry
            throw error;
        }
    })();

    return pyodideReadyPromise;
}

export async function runChristofidesInBrowser(matrix: number[][]): Promise<number[]> {
    if (!pyodide) {
        await initPyodide();
    }

    // Passa a matriz do JS para o escopo global do Python
    pyodide.globals.set("dist_matrix", matrix);

    const pythonCode = `
import networkx as nx

# 1. Construir o Grafo completo a partir da matriz de distâncias
n = len(dist_matrix)
G = nx.complete_graph(n)
for i in range(n):
    for j in range(n):
        if i != j:
            # Em Python, acessamos a lista de listas diretamente
            G[i][j]['weight'] = dist_matrix[i][j]

# 2. Executar o Algoritmo de Christofides
# networkx.approximation.traveling_salesman_problem usa Christofides por padrão quando method="christofides"
try:
    tsp_path = nx.approximation.traveling_salesman_problem(G, cycle=True, method="christofides")
    
    # 3. Ajustar o ciclo para começar no índice 0 (origem)
    if 0 in tsp_path:
        idx = tsp_path.index(0)
        tsp_path = tsp_path[idx:] + tsp_path[:idx]

    # 4. Remover o último elemento se for duplicado (ciclo fechado)
    # O frontend espera uma lista de índices únicos, ele mesmo fecha o ciclo visualmente
    if len(tsp_path) > 1 and tsp_path[0] == tsp_path[-1]:
        tsp_path.pop()

    tsp_path
except Exception as e:
    raise e
    `;

    try {
        const resultProxy = await pyodide.runPythonAsync(pythonCode);
        const resultJs = resultProxy.toJs();
        resultProxy.destroy();
        return Array.from(resultJs);
    } catch (error) {
        console.error("Erro ao executar script Python:", error);
        throw new Error("Falha na execução do algoritmo Python.");
    }
}
