export interface User {
    id: number;
    username: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Lead {
    id: number;
    title: string;
    description: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Followup {
    id: number;
    leadId: number;
    followupDate: Date;
    notes: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
}