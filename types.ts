
export interface Address {
    id: number;
    value: string;
}

export interface Route {
    orderedAddresses: string[];
    totalTime: number;
    warning?: string;
}
