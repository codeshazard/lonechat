import { User } from "./user.model";

export interface Room {
    id: string;
    user1: User;
    user2: User;
    createdAt: number;
}
