// packages/shared/src/types.ts

export interface User {
    id: string;                 // UIN (6-9 цифр, без телефона)
    username: string;
    publicKey: string;          // X25519
    kyberPublicKey: string;     // ML-KEM-768
    status: 'online' | 'away' | 'dnd' | 'invisible' | 'offline';
    profile?: UserProfile;
}

export interface UserProfile {
    // Для каждого поля — два чекбокса: "видят контакты" и "видят все"
    bio?: ProfileField<string>;
    phone?: ProfileField<string>;      // для SMS-пересылки
    email?: ProfileField<string>;
    interests?: ProfileField<string[]>;
    activities?: ProfileField<Activity[]>;
    socials?: ProfileField<SocialLinks>; // ВКонтакте, Telegram и др.
    location?: ProfileField<GeoPoint>;   // opt-in геолокация
}

// Гранулярная приватность — для каждой строки профиля отдельно
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
    radius?: number;    // км, для поиска "поблизости от места активности"
}

export type ActivityType =
    | 'cycling' | 'hiking' | 'mushrooms' | 'fishing'
    | 'concert' | 'meetup' | 'sport'
    | string;

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
    e2eKey?: string;           // групповой ключ шифрования
    shareLocation?: boolean;   // семейная карта
    locationExpiry?: number;   // до когда шарить геолокацию (unix ts)
}
