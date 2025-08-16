import { Injectable } from '@angular/core';
import { User } from '../model/user.model';
import { API_BASE_URL } from '../config/api.config';


@Injectable({ providedIn: 'root' })
export class UsersService {
    private baseUrl = `${API_BASE_URL}/user`;

    private KEY = 'app_users';

    private read(): User[] {
        const raw = localStorage.getItem(this.KEY);
        return raw ? (JSON.parse(raw) as User[]) : [];
    }
    private write(users: User[]) {
        localStorage.setItem(this.KEY, JSON.stringify(users));
    }

    list(): User[] {
        return this.read();
    }

    add(u: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User {
        const users = this.read();
        const id = users.length ? Math.max(...users.map(x => x.id)) + 1 : 1;
        const now = new Date().toISOString();
        const nu: User = { id, createdAt: now, updatedAt: now, ...u };
        users.push(nu);
        this.write(users);
        return nu;
    }

    update(u: User): void {
        const now = new Date().toISOString();
        const users = this.read().map(x => (x.id === u.id ? { ...u, updatedAt: now } : x));
        this.write(users);
    }

    remove(id: number): void {
        this.write(this.read().filter(x => x.id !== id));
    }

    get(id: number): User | undefined {
        return this.read().find(x => x.id === id);
    }
}
