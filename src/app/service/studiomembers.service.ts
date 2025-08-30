import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface UserInputDto {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}

export type StudioRole = 'OWNER' | 'DOCTOR' | 'BACKOFFICE' | 'ADMIN';

export interface StudioMemberInputDto {
    user: UserInputDto;
    role: StudioRole;
}

export interface StudioMemberDto {
    id: number;
    user: {
        id: number;
        firstName: string;
        lastName: string;
        email: string;
    };
    role: StudioRole;
}

@Injectable({ providedIn: 'root' })
export class StudioMembersService {
    private readonly baseUrl = `${API_BASE_URL}/members`;

    constructor(private http: HttpClient) { }

    createMember(input: StudioMemberInputDto): Observable<StudioMemberDto> {
        return this.http.post<StudioMemberDto>(this.baseUrl, input);
    }

    /** LISTA tutti i membri */
    listMembers(): Observable<StudioMemberDto[]> {
        return this.http.get<StudioMemberDto[]>(this.baseUrl);
    }
}
