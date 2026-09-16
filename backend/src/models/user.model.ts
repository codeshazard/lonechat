import { Socket } from "socket.io";

export type Gender = "Male" | "Female";
export type PreferredGender = "Male" | "Female" | "Any";

export interface UserPreferences {
    gender: Gender;
    preferredGender: PreferredGender;
    interests: string[];
}

export interface User {
    socket: Socket;
    name: string;
    preferences: UserPreferences;
    joinedAt: number;
}
