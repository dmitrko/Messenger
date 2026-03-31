import Dexie, { Table } from 'dexie';

export interface ChatMessage {
    id?: number;
    ownerUin: string;
    chatId: string;
    fromUin: string;
    fromUsername: string;
    text: string;
    timestamp: number;
    isSecure: boolean;
    type: 'public' | 'private';
}

export interface Contact {
    ownerUin: string;
    uin: string;
    username: string;
    publicKey?: string;
    kyberPublicKey?: string;
    zone: 'friends' | 'family' | 'work' | 'other';
    isArchived: boolean;
    isBlocked: boolean;
    lastSeen: number;
}

export class NostaDatabase extends Dexie {
    messages!: Table<ChatMessage>;
    contacts!: Table<Contact>;

    constructor() {
        // Changed name to NostaChat_v5 to force a clean DB and avoid UpgradeError
        super('NostaChat_v5');
        this.version(1).stores({
            messages: '++id, ownerUin, chatId, fromUin',
            contacts: '[ownerUin+uin], uin, zone, isArchived, isBlocked'
        });
    }
}

export const db = new NostaDatabase();
