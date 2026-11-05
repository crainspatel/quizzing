import { DisplayCommand, SyncMessage } from '@/types/quiz';
import { saveLastDisplayCommand, loadLastDisplayCommand } from './storage';

const CHANNEL_NAME = 'kwizz_sync_bus_v2';
const STORAGE_SYNC_KEY = 'kwizz_storage_sync_event';

export class SyncBus {
  private channel: BroadcastChannel | null = null;
  private messageListeners: Set<(msg: SyncMessage) => void> = new Set();
  private storageListener: ((e: StorageEvent) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      if ('BroadcastChannel' in window) {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event: MessageEvent<SyncMessage>) => {
          this.notify(event.data);
        };
      }

      // Storage event fallback for durability across tabs/windows
      this.storageListener = (e: StorageEvent) => {
        if (e.key === STORAGE_SYNC_KEY && e.newValue) {
          try {
            const data = JSON.parse(e.newValue) as { payload: SyncMessage; timestamp: number };
            this.notify(data.payload);
          } catch {
            // Ignore parse errors
          }
        }
      };
      window.addEventListener('storage', this.storageListener);
    }
  }

  private notify(msg: SyncMessage) {
    this.messageListeners.forEach((listener) => {
      try {
        listener(msg);
      } catch (err) {
        console.error('Error in sync listener:', err);
      }
    });
  }

  public send(msg: SyncMessage): void {
    if (msg.kind === 'COMMAND') {
      saveLastDisplayCommand(msg.command);
    }

    if (this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch (err) {
        console.error('Failed to postMessage on BroadcastChannel:', err);
      }
    }

    // Also trigger storage event for cross-window reliability
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          STORAGE_SYNC_KEY,
          JSON.stringify({ payload: msg, timestamp: Date.now() })
        );
      } catch {
        // Ignore quota/access errors
      }
    }
  }

  public sendCommand(command: DisplayCommand): void {
    this.send({ kind: 'COMMAND', command });
  }

  public requestSync(): void {
    this.send({ kind: 'REQUEST_SYNC' });
  }

  public respondSync(currentCommand: DisplayCommand | null): void {
    this.send({ kind: 'SYNC_RESPONSE', currentCommand: currentCommand || loadLastDisplayCommand() });
  }

  public subscribe(listener: (msg: SyncMessage) => void): () => void {
    this.messageListeners.add(listener);
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  public destroy(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    if (typeof window !== 'undefined' && this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = null;
    }
    this.messageListeners.clear();
  }
}

let sharedBus: SyncBus | null = null;

export function getSyncBus(): SyncBus {
  if (!sharedBus) {
    sharedBus = new SyncBus();
  }
  return sharedBus;
}
