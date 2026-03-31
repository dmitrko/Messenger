import Peer from 'simple-peer/simplepeer.min.js';
import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
    (window as any).Buffer = Buffer;
}

export class WebRTCService {
    private peers = new Map<string, Peer.Instance>();

    constructor(
        private signalCallback: (peerId: string, signal: any) => void,
        private messageCallback: (peerId: string, data: string) => void
    ) { }

    getOrCreatePeer(peerId: string, initiator: boolean): Peer.Instance {
        if (this.peers.has(peerId)) {
            return this.peers.get(peerId)!;
        }

        const peer = new Peer({ initiator, trickle: true });

        peer.on('signal', (data) => {
            this.signalCallback(peerId, data);
        });

        peer.on('data', (data) => {
            this.messageCallback(peerId, data.toString());
        });

        peer.on('connect', () => {
            console.log(`[WebRTC] P2P connected with: ${peerId}`);
        });

        peer.on('error', (err) => {
            console.error(`[WebRTC] Peer error (${peerId}):`, err);
            this.destroyPeer(peerId);
        });

        peer.on('close', () => {
            console.log(`[WebRTC] Peer closed: ${peerId}`);
            this.destroyPeer(peerId);
        });

        this.peers.set(peerId, peer);
        return peer;
    }

    handleSignal(peerId: string, signal: any) {
        const peer = this.getOrCreatePeer(peerId, false);
        peer.signal(signal);
    }

    sendMessage(peerId: string, message: string): boolean {
        const peer = this.peers.get(peerId);
        if (peer && peer.connected) {
            peer.send(message);
            return true;
        }
        return false;
    }

    isConnected(peerId: string): boolean {
        const peer = this.peers.get(peerId);
        return !!(peer && peer.connected);
    }

    destroyPeer(peerId: string) {
        const peer = this.peers.get(peerId);
        if (peer) {
            peer.destroy();
            this.peers.delete(peerId);
        }
    }
}
