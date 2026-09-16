export type MessageAuthor = "you" | "stranger" | "system";

export interface ChatMessage {
    id: string;
    from: MessageAuthor;
    text: string;
    time: string;
    isIcebreaker?: boolean;
}

export type Gender = "Male" | "Female";
export type PreferredGender = "Male" | "Female" | "Any";

export interface UserPreferences {
    gender: Gender;
    preferredGender: PreferredGender;
    interests: string[];
}

export interface RoomProps {
    name: string;
    localAudioTrack: MediaStreamTrack | null;
    localVideoTrack: MediaStreamTrack | null;
    preferences: UserPreferences;
    textOnly: boolean;
    onLeave?: () => void;
}
