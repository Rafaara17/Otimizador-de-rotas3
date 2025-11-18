
export interface Address {
    id: number;
    value: string;
    lat?: number;
    lng?: number;
}

export interface Route {
    orderedAddresses: string[];
    totalTime: number;
    warning?: string;
}
