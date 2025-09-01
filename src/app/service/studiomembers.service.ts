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
    id: string; // UUID dello studio member, quindi string
    role: StudioRole;
    user: {
        id: string;   // dipende dal tuo backend: se `users.id` è SERIAL → number, se è UUID → string
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
    };
    active?: boolean;
    // eventuali altri campi
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
    changeStatus(studioMemberId: string, status: boolean): Observable<void> {
        return this.http.put<void>(
            `${this.baseUrl}/status/${studioMemberId}`,
            {},
            { params: { status: status } }
        );
    }

    updateMember(studioMemberId: string, studioMemberInputDto: StudioMemberInputDto): Observable<StudioMemberDto> {
        return this.http.patch<StudioMemberDto>(`${this.baseUrl}/${studioMemberId}`, studioMemberInputDto);
    }

    deleteMember(studioMemberId: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${studioMemberId}`);
    }


}
