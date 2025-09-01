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

export type StudioRole = 'OWNER' | 'DOCTOR' | 'BACKOFFICE' | 'NURSE' | 'STAFF';

export interface StudioMemberInputDto {
    user: UserInputDto;
    role: StudioRole;
}

export interface StudioMemberDto {
    id: string; // UUID
    role: StudioRole;
    user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        createdAt?: string;
        updatedAt?: string;
    };
    active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class StudioMembersService {
    private readonly baseUrl = `${API_BASE_URL}/members`;

    constructor(private http: HttpClient) { }

    createMember(input: StudioMemberInputDto): Observable<StudioMemberDto> {
        return this.http.post<StudioMemberDto>(this.baseUrl, input);
    }

    listMembers(): Observable<StudioMemberDto[]> {
        return this.http.get<StudioMemberDto[]>(this.baseUrl);
    }

    getMember(studioMemberId: string): Observable<StudioMemberDto> {
        return this.http.get<StudioMemberDto>(`${this.baseUrl}/${studioMemberId}`);
    }

    // ✅ Query param “status=true|false”
    changeStatus(studioMemberId: string, status: boolean): Observable<void> {
        return this.http.put<void>(
            `${this.baseUrl}/status/${studioMemberId}`,
            {},
            { params: { status: String(status) } } // <-- stringa, nelle HttpOptions
        );
    }

    // ✅ NUOVO: aggiorna SOLO il ruolo (lo studio non cambia)
    updateRole(studioMemberId: string, role: StudioRole): Observable<StudioMemberDto> {
        return this.http.put<StudioMemberDto>(
            `${this.baseUrl}/role/${studioMemberId}`,
            {},
            { params: { role: role } } // se backend si aspetta DTO in body, cambia a { role } nel body
        );
    }

    // ✅ NUOVO: aggiorna SOLO i dati personali/account
    updatePersonalInformation(studioMemberId: string, user: UserInputDto): Observable<StudioMemberDto> {
        return this.http.put<StudioMemberDto>(
            `${this.baseUrl}/account/${studioMemberId}`,
            user
        );
    }

    deleteMember(studioMemberId: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${studioMemberId}`);
    }
}
