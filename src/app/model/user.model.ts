export interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    active: boolean;
    createdAt: string;   // ISO
    updatedAt?: string;  // ISO
}
