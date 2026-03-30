export interface User {
    id: string;
    username: string;
    publicKey: string;
    kyberPublicKey: string;
    status: 'online' | 'away' | 'dnd' | 'invisible' | 'offline';
    profile?: UserProfile;
}
export interface UserProfile {
    bio?: ProfileField<string>;
    phone?: ProfileField<string>;
    email?: ProfileField<string>;
    interests?: ProfileField<string[]>;
    activities?: ProfileField<Activity[]>;
    socials?: ProfileField<SocialLinks>;
    location?: ProfileField<GeoPoint>;
}
export interface ProfileField<T> {
    value: T;
    visibility: 'contacts' | 'all' | 'none';
}
export interface SocialLinks {
    telegram?: string;
    vk?: string;
    discord?: string;
    twitter?: string;
}
export interface Activity {
    id: string;
    type: ActivityType;
    label: string;
    date?: string;
    location?: GeoPoint;
    radius?: number;
}
export type ActivityType = 'cycling' | 'hiking' | 'mushrooms' | 'fishing' | 'concert' | 'meetup' | 'sport' | string;
export interface GeoPoint {
    lat: number;
    lng: number;
}
export interface Group {
    id: string;
    name: string;
    type: 'private_group' | 'family' | 'activity_group' | 'channel';
    members: string[];
    creatorId: string;
    e2eKey?: string;
    shareLocation?: boolean;
    locationExpiry?: number;
}
