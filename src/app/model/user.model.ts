export interface User {
    id: number;
    name: string;
    email: string;
    role: 'Admin' | 'Editor' | 'Viewer';
    active: boolean;
    createdAt: string;   // ISO
    updatedAt?: string;  // ISO
}