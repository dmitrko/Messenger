# NostaChat: Полный план разработки v2.0

> **СТАТУС ПРОЕКТА (31.03.2026):**
> Реализовано полное сквозное шифрование (Full E2EE) для приватных и публичных чатов (Hybrid Kyber-768 + X25519). 
> Стабилизирована P2P-связь и система уведомлений (Buzz). 
> Создана полная техническая документация в папке `_Docs`.
> Текущий порт сервера: 3002. Порт десктоп-клиента: 5173.


> **Версия 2.0** — обновлённый и расширенный план, включающий:
> социальный поиск, пост-квантовое шифрование (Kyber/ML-KEM),
> обход блокировок ("чёрный ящик"), мимикрия трафика,
> SMS-переброска, кнопка "гудок", меш-сеть Bluetooth/Wi-Fi,
> технологии Briar, элементы FidoNet, модульная тема-система,
> каналы/группы/семейная карта, аудио/видео звонки.

---

## 🧭 Философия продукта

**Три столпа NostaChat:**
1. **Ностальгия** — дух ICQ/FidoNet, UIN + Fido-style адрес, атмосфера «лампового» интернета.
2. **Приватность** — E2E шифрование по умолчанию, пост-квантовый Kyber, "Open Core" архитектура для аудита.
3. **Устойчивость** — WebRTC P2P, работа без сервера (Email/BT/Mesh), обход блокировок через «черный ящик».

**Дополнительная концепция:**
- **Open Core**: Открытая часть для аудита шифрования + закрытая часть для обхода блокировок.
- **Демократическая Иерархия**: Система выборных Сисопов (SysOp) уровней Zone-Net-Node-Point.
- **Двойной адрес**: Случайный UIN (цифровой) + Смысловой адрес FidoNet (после теста интересов).
- **Продвинутое разделение зон**: Семья (с картой), Друзья, Работа, Группы.

---

## 🎯 Общая архитектура

```
┌──────────────────────────────────────────────────────────────┐
│                    КЛИЕНТСКИЙ СТЕК                           │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  UI Layer: Theme Engine (серый каркас + моды)        │    │
│  │  Contacts | Channels/Groups | Mass-media (разделены) │    │
│  └─────────────────────────────────────────────────────┘    │
│                         │                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Feature Layer                                       │    │
│  │  Chat | SMS | Buzz | Discovery | Map | A/V calls     │    │
│  └─────────────────────────────────────────────────────┘    │
│                         │                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Crypto Layer: libsodium + Kyber (ML-KEM-768)        │    │
│  │  Hybrid X25519+Kyber | ML-DSA подписи                │    │
│  └─────────────────────────────────────────────────────┘    │
│                         │                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Transport Manager ("Чёрный ящик")                   │    │
│  │  1. WebRTC P2P (основной)                            │    │
│  │  2. WebSocket Server (сигналинг)                     │    │
│  │  3. Email IMAP/SMTP (fallback сигналинг)             │    │
│  │  4. Bluetooth / Wi-Fi Direct (меш, офлайн)           │    │
│  │  5. Технические аккаунты в других сетях              │    │
│  │  6. FidoNet-style store-and-forward (экстремальный)  │    │
│  └─────────────────────────────────────────────────────┘    │
│                         │                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Obfuscation Layer                                   │    │
│  │  Fake video/audio tracks | Kyber без OID/сигнатур    │    │
│  │  Выглядит как обычный видеозвонок (Zoom/Meet)        │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

---

## 📦 Технологический стек

### Backend (Signaling Server)
```yaml
Runtime:     Node.js 20+
Framework:   Express.js
WebSocket:   ws
Database:    SQLite → PostgreSQL + PostGIS (для геолокации)
Crypto:      libsodium-wrappers + liboqs (Kyber/ML-KEM)
Auth:        JWT tokens
SMS:         Twilio / infobip API
```

### Desktop Client
```yaml
Framework:   Electron 28+
UI:          React 18 + TypeScript
State:       Zustand
Styling:     TailwindCSS (тема-каркас) + Theme Engine
WebRTC:      simple-peer
Crypto:      libsodium.js + crystals-kyber-js
Storage:     IndexedDB (Dexie.js)
Maps:        Leaflet
Mesh:        node-bluetooth + node-wifi
```

### Mobile Client
```yaml
Framework:       React Native + TypeScript
State:           Zustand
Styling:         NativeWind + Theme Engine
WebRTC:          react-native-webrtc
Crypto:          react-native-libsodium + liboqs-react-native
Storage:         AsyncStorage + SQLite
Maps:            react-native-maps
Mesh:            react-native-ble-plx (BT) + react-native-wifi-reborn
Push:            FCM / APNs
```

---

## 🗂️ Структура проекта

```
nostachat/
├── packages/
│   ├── server/
│   │   └── src/
│   │       ├── index.ts
│   │       ├── websocket.ts
│   │       ├── users.ts
│   │       ├── auth.ts
│   │       ├── db.ts
│   │       ├── geo.ts              # геолокация + PostGIS
│   │       ├── discovery.ts        # поиск: профиль/интересы/соцсети
│   │       ├── sms-gateway.ts      # отправка SMS
│   │       └── bridge-accounts.ts  # технические аккаунты в других сетях
│   │
│   ├── shared/
│   │   └── src/
│   │       ├── types.ts
│   │       ├── crypto.ts           # libsodium + Kyber hybrid
│   │       ├── protocol.ts
│   │       ├── discovery-types.ts
│   │       ├── fido-types.ts       # FidoNet-style структуры
│   │       └── constants.ts
│   │
│   ├── desktop/
│   │   └── src/
│   │       ├── components/
│   │       │   ├── ContactListWindow/
│   │       │   │   ├── ContactSection.tsx      # раздел "Контакты"
│   │       │   │   └── MassMediaSection.tsx    # раздел "Каналы/группы"
│   │       │   ├── ChatWindow/
│   │       │   ├── BuzzButton/                 # кнопка гудка
│   │       │   ├── Discovery/
│   │       │   │   ├── ProfileSearch.tsx
│   │       │   │   ├── NearbyMap.tsx
│   │       │   │   └── ActivitySearch.tsx
│   │       │   ├── FamilyMap/                  # семейная карта
│   │       │   ├── Groups/                     # группы и каналы
│   │       │   └── ThemeStore/                 # магазин тем
│   │       ├── services/
│   │       │   ├── webrtc.ts
│   │       │   ├── crypto.ts
│   │       │   ├── transport-manager.ts        # единый транспортный менеджер
│   │       │   ├── email-signaling.ts
│   │       │   ├── mesh-service.ts             # BT + WiFi меш
│   │       │   ├── obfuscation.ts              # мимикрия трафика
│   │       │   ├── bridge-service.ts           # технические аккаунты
│   │       │   └── sms-service.ts
│   │       └── themes/
│   │           ├── default-gray.ts             # базовый серый каркас
│   │           ├── icq99.ts
│   │           └── theme-engine.ts
│   │
│   └── mobile/
│       └── src/
│           ├── screens/
│           │   ├── Discovery/
│           │   ├── FamilyMap/
│           │   └── Groups/
│           └── services/
│
├── pnpm-workspace.yaml
└── README.md
```

---

## 📋 Типы данных (расширенные)

```typescript
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
  bio?:       ProfileField<string>;
  phone?:     ProfileField<string>;      // для SMS-пересылки
  email?:     ProfileField<string>;
  interests?: ProfileField<string[]>;
  activities?: ProfileField<Activity[]>;
  socials?:   ProfileField<SocialLinks>; // ВКонтакте, Telegram и др.
  location?:  ProfileField<GeoPoint>;   // opt-in геолокация
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
```

---

## 🚀 ПЛАН РАЗРАБОТКИ

---

## ✅ ИТЕРАЦИЯ 0: Инфраструктура (2-3 дня)

- [x] pnpm monorepo (используется npm workspaces)
- [x] TypeScript во всех пакетах
- [x] Базовые типы в `@nostachat/shared`
- [x] Git с ветками per-iteration

**Результат**: Пустая структура, готовая к разработке — **ВЫПОЛНЕНО**

---

## ✅ ИТЕРАЦИЯ 1: Hello World (3-5 дней)

- [x] WebSocket сервер, принимает подключения
- [x] Desktop: поле + кнопка + список сообщений
- [x] Mobile: аналогично (подготовлен каркас)
- [x] Broadcast: сообщение от A видно у B

**Результат**: Работающая связь desktop ↔ server ↔ mobile — **ВЫПОЛНЕНО**

---

## ✅ ИТЕРАЦИЯ 2: UIN + Direct Messaging (4-5 дней)

### Ключевая идея: регистрация БЕЗ телефона

```typescript
// Только username — UIN генерируется автоматически
ws.send(JSON.stringify({ type: 'register', username: 'Alice' }));
// Ответ: { type: 'registered', uin: '482736', ... }
```

- [x] Генерация UIN (ICQ-style: 6-9 цифр)
- [x] Contact list: online пользователи
- [x] Direct message: отправка конкретному UIN
- [x] "Твой UIN: 482736 — поделись с другом"

**Результат**: Приватный мессенджер без привязки к телефону — **ВЫПОЛНЕНО**

---

## ✅ ИТЕРАЦИЯ 3: P2P WebRTC + Гибридное шифрование Kyber (5-7 дней)

### 3.1 WebRTC P2P

```typescript
// services/webrtc.ts
export class WebRTCService {
  createConnection(peerId, initiator, onMessage, sendSignal) {
    const peer = new SimplePeer({ initiator, trickle: true });
    peer.on('signal', sendSignal);
    peer.on('data', (data) => onMessage(data.toString()));
    peer.on('connect', () => console.log(`P2P: ${peerId}`));
    this.peers.set(peerId, peer);
    return peer;
  }
}
```

### 3.2 Гибридное шифрование X25519 + Kyber ML-KEM-768

**Почему гибрид**: Kyber защищает от "harvest now, decrypt later", X25519 — надёжная классика.

```typescript
// shared/src/crypto.ts
export class CryptoService {

  static async generateKeyPairs() {
    await sodium.ready;
    const classic = sodium.crypto_box_keypair();   // X25519
    const kyber = new MlKem768();
    const [kyberPK, kyberSK] = await kyber.generateKeyPair();
    return { classic, kyber: { publicKey: kyberPK, secretKey: kyberSK } };
  }

  static async hybridEncrypt(
    message: string,
    recipientClassicPK: Uint8Array,
    recipientKyberPK: Uint8Array,
    senderClassicSK: Uint8Array
  ) {
    // X25519 shared secret
    const classicSS = sodium.crypto_scalarmult(senderClassicSK, recipientClassicPK);

    // Kyber encapsulation
    const kyber = new MlKem768();
    const { sharedSecret: kyberSS, ciphertext: kyberCT } = await kyber.encap(recipientKyberPK);

    // XOR + BLAKE2b → мастер-ключ
    const combined = new Uint8Array([...classicSS, ...kyberSS]);
    const masterKey = sodium.crypto_generichash(32, combined);

    // Финальное шифрование XSalsa20-Poly1305
    const nonce = sodium.randombytes_buf(24);
    const encrypted = sodium.crypto_secretbox_easy(message, nonce, masterKey);

    return {
      ciphertext: sodium.to_base64(new Uint8Array([...nonce, ...encrypted])),
      kyberCT: sodium.to_base64(kyberCT)
    };
  }

  static async hybridDecrypt(ciphertext, kyberCT, senderClassicPK, recipientKyberSK, recipientClassicSK) {
    const classicSS = sodium.crypto_scalarmult(recipientClassicSK, senderClassicPK);
    const kyber = new MlKem768();
    const kyberSS = await kyber.decap(sodium.from_base64(kyberCT), recipientKyberSK);
    const masterKey = sodium.crypto_generichash(32, new Uint8Array([...classicSS, ...kyberSS]));
    const data = sodium.from_base64(ciphertext);
    return sodium.to_string(
      sodium.crypto_secretbox_open_easy(data.slice(24), data.slice(0, 24), masterKey)
    );
  }
}
```

- [x] WebRTC P2P (Simple-peer)
- [x] Гибридное шифрование X25519 + Kyber ML-KEM-768
- [x] Шифрование общего канала (Symmetric + Seal)

**Результат ИТЕРАЦИИ 3**: P2P + E2E с пост-квантовым шифрованием для всех типов чатов — **ВЫПОЛНЕНО**

---

## ✅ ИТЕРАЦИЯ 4: ICQ-подобный GUI + Buzz + Разделённые секции (5-7 дней)

### 4.1 Серый каркас — намеренно безликий

```css
/* themes/default-gray.css — намеренно минимальный */
:root {
  --color-bg: #f0f0f0;
  --color-sidebar: #e8e8e8;
  --color-text: #333;
  --color-accent: #888;
  --color-border: #ccc;
  --font-family: 'Tahoma', sans-serif;
  --font-size: 11px;
}
```

Серость — это фича, а не баг. Создаёт спрос на темы из магазина.

### 4.2 Четыре раздела с разделителем
 - Семья
 - Друзья
 - Работа
 - Каналы и группы
```
┌─────────────────────────────┐
│ [▼] ДРУЗЬЯ  (12 онлайн)     │  ← приватное пространство
│  👤 Alice (482736)          │
│  👤 Bob   (193847)          │
├─────────────────────────────┤  ← физический разделитель
│ [▶] КАНАЛЫ И ГРУППЫ  (5)    │  ← можно схлопнуть целиком
│  📢 Новости техники         │
│  👥 Велосипедисты МСК       │
└─────────────────────────────┘
```

Пользователь схлопывает "КАНАЛЫ И ГРУППЫ" → визуально в приватном пространстве, без шума.
Вдохновение: разделение почты и новостей в старом Outlook.

```typescript
export function ContactListWindow() {
  const [contactsOpen, setContactsOpen] = useState(true);
  const [massMediaOpen, setMassMediaOpen] = useState(true);

  return (
    <div className="contact-window">
      <Header />
      <Section title={`КОНТАКТЫ (${onlineCount})`}
               isOpen={contactsOpen} onToggle={() => setContactsOpen(!contactsOpen)}>
        {contacts.map(c => <ContactItem key={c.id} contact={c} />)}
      </Section>
      <Divider />
      <Section title={`КАНАЛЫ И ГРУППЫ (${groups.length})`}
               isOpen={massMediaOpen} onToggle={() => setMassMediaOpen(!massMediaOpen)}>
        {groups.map(g => <GroupItem key={g.id} group={g} />)}
      </Section>
    </div>
  );
}
```

### 4.3 Buzz — кнопка гудка

```typescript
// Вибрация + звук + анимация встряски на клиенте получателя
export function BuzzButton({ contactId }) {
  const [cooldown, setCooldown] = useState(false);

  const sendBuzz = () => {
    if (cooldown) return;
    webrtc.sendMessage(contactId, JSON.stringify({ type: 'buzz' }));
    setCooldown(true);
    setTimeout(() => setCooldown(false), 10000); // cooldown 10 сек
  };

  return <button onClick={sendBuzz} disabled={cooldown} title="Buzz!">🔔</button>;
}

function handleIncomingBuzz() {
  Vibration.vibrate([200, 100, 200, 100, 200]);   // mobile
  new Audio('/sounds/buzz.mp3').play();             // desktop
  chatWindowRef.current?.classList.add('shake-animation');
}
```

### 4.4 Отдельные окна чата (Electron)

```typescript
// electron/main.ts — каждый чат в своём окне, как в ICQ
export function openChatWindow(contactId: string, contactName: string) {
  if (chatWindows.has(contactId)) {
    chatWindows.get(contactId)?.focus(); return;
  }
  const win = new BrowserWindow({ width: 500, height: 400, title: `Chat: ${contactName}` });
  win.loadURL(`http://localhost:5173/chat/${contactId}`);
  chatWindows.set(contactId, win);
  win.on('closed', () => chatWindows.delete(contactId));
}
```

- [x] 4.1 Серый каркас (Tahoma + Grey)
- [x] 4.2 Секции списка контактов (Семья, Друзья, Работа, Группы)
- [x] 4.3 Buzz! (Кнопка гудка + анимация + уведомления 🔔)
- [x] 4.4 Техническая документация (Desktop, Server, Mobile, NEW)

**Результат ИТЕРАЦИИ 4**: ICQ-интерфейс, buzz, зоны контактов и полная база знаний — **ВЫПОЛНЕНО**

### ✅ Достигнутые результаты:
1. Исправлена инициализация `simple-peer` (решена проблема с `call`).
2. Реализовано полное E2EE шифрование (Kyber + X25519) для всех сообщений.
3. Добавлена логика `Buzz` с сохранением состояния уведомлений в Sidebar.
4. Создана архитектурная документация в папке `_Docs`.

### 📅 План на следующую итерацию (Итерация 5):
1. Локальное хранилище истории (IndexedDB/Dexie).
2. Реализация виртуальных окон для чатов (Window Manager).
3. Интеграция звуков (ICQ "Uh-oh").
4. Миграция на Electron для standalone билдов.

---

## ✅ ИТЕРАЦИЯ 5: История + Гранулярный профиль (3-4 дня)

### 5.1 Локальное хранилище

```typescript
class NostaDB extends Dexie {
  messages!: Table<Message>;
  chats!: Table<Chat>;
  contacts!: Table<Contact>;
  constructor() {
    super('NostaDB');
    this.version(1).stores({
      messages: '++id, chatId, timestamp',
      chats: 'id, lastMessageTime',
      contacts: 'id, username'
    });
  }
}
```

### 5.2 Гранулярный профиль — двойной чекбокс

```
┌────────────────────────────────────────────────────────┐
│  Профиль                                               │
├────────────────────┬─────────────────┬─────────────────┤
│ Поле               │ Видят контакты  │ Видят все       │
├────────────────────┼─────────────────┼─────────────────┤
│ Имя: Alice         │      [✓]        │     [✓]         │
│ Bio: люблю велик   │      [✓]        │     [ ]         │
│ Телефон: +7...     │      [ ]        │     [ ]         │
│ Email: a@b.com     │      [✓]        │     [ ]         │
│ Геолокация         │      [ ]        │     [ ]         │
│ Интересы           │      [✓]        │     [✓]         │
│ ВКонтакте: @alice  │      [✓]        │     [ ]         │
│ Telegram: @alice   │      [✓]        │     [ ]         │
└────────────────────┴─────────────────┴─────────────────┘
```

**Результат ИТЕРАЦИИ 5**: История сообщений + приватный профиль

---

## ✅ ИТЕРАЦИЯ 6: SMS-переброска (3-4 дня)

```typescript
// server/src/sms-gateway.ts
import twilio from 'twilio';

export async function sendSMS(toPhone: string, message: string, senderUsername: string) {
  return twilioClient.messages.create({
    body: `NostaChat от ${senderUsername}: ${message}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: toPhone
  });
}
```

```typescript
// Кнопка SMS видна только если у контакта phone.visibility !== 'none'
{contact.profile?.phone?.visibility !== 'none' && (
  <button onClick={() => sendSMS(contact.id, currentMessage)}>
    📱 Отправить SMS
  </button>
)}
```

**Результат ИТЕРАЦИИ 6**: SMS-переброска на телефон получателя (opt-in)

---

## ✅ ИТЕРАЦИЯ 7: Email Signaling Fallback + Transport Manager (4-5 дней)

### 7.1 Email как запасной канал

```typescript
// shared/src/email-signaling.ts
export class EmailSignaling {
  async sendSignal(recipientEmail: string, signal: any, type: 'offer'|'answer'|'ice') {
    await this.smtp.sendMail({
      from: this.email, to: recipientEmail,
      subject: `NostaChat:${type}:${Date.now()}`,
      text: JSON.stringify(signal)
    });
  }
  async pollSignals(callback) {
    setInterval(() => this.checkInbox(callback), 15000);
  }
}
```

### 7.2 Transport Manager

```typescript
// desktop/src/services/transport-manager.ts
export class TransportManager {
  private transports = [
    new WebSocketTransport(),   // Primary
    new EmailTransport(),        // Fallback 1
    new BridgeTransport(),       // Fallback 2 (технические аккаунты)
    new MeshTransport(),         // Fallback 3 (BT/WiFi)
  ];

  async sendSignal(to: string, signal: any) {
    for (const t of this.transports) {
      if (t.isAvailable()) {
        try { await t.send(to, signal); return; }
        catch (e) { /* попробовать следующий */ }
      }
    }
    throw new Error('All transports unavailable');
  }
}
```

**Результат ИТЕРАЦИИ 7**: Автоматический fallback при недоступности сервера

---

## ✅ ИТЕРАЦИЯ 8: Ручной обмен ключами (Briar-style) (3-4 дня)

```typescript
// QR включает оба ключа: X25519 + Kyber
const keyData = {
  uin: myUIN, username: myUsername,
  publicKey: sodium.to_base64(classicPK),
  kyberPublicKey: sodium.to_base64(kyberPK),
};
<QRCode value={JSON.stringify(keyData)} size={256} />

// Fingerprint для визуальной верификации
function generateFingerprint(classicPK, kyberPK): string {
  const combined = new Uint8Array([...sodium.from_base64(classicPK), ...sodium.from_base64(kyberPK)]);
  const hash = sodium.crypto_generichash(16, combined);
  return sodium.to_base64(hash).toUpperCase().match(/.{1,4}/g)?.join('-') || '';
  // Пример: A3X2-B7KQ-M1NP-J8WE
}
```

**Результат ИТЕРАЦИИ 8**: Верифицированные контакты через QR/fingerprint

---

## ✅ ИТЕРАЦИЯ 9: Социальный поиск (5-7 дней)

### 9.1 Поиск по профилю и интересам

Только среди тех, кто явно разрешил `allowDiscovery: true`.

```
GET /api/discovery/search?interests=cycling&q=велоспорт
```

### 9.2 Поиск поблизости (карта)

```sql
-- PostGIS: найти пользователей в радиусе, разрешивших геошаринг
SELECT id, username, ST_Distance(location, ST_MakePoint($lng,$lat)::geography) as dist
FROM users
WHERE profile_allow_nearby = true
  AND ST_DWithin(location, ST_MakePoint($lng,$lat)::geography, $radius * 1000)
ORDER BY dist;
```

### 9.3 Поиск спутников на активности

```
GET /api/discovery/activities?type=cycling&date=2026-04-05&lat=55.75&lng=37.62&radius=10
-- Найти желающих покататься на велосипеде в субботу в 10 км от меня
```

### 9.4 Поиск по внешним идентификаторам

```
GET /api/discovery/find?email=alice@example.com
GET /api/discovery/find?phone=%2B79001234567   (только если разрешено)
GET /api/discovery/find?vk=alice_vk
GET /api/discovery/find?telegram=@alice_tg
GET /api/discovery/find?uin=482736
```

Поиск через технические аккаунты — в других сетях тоже (только сигналинг, без контента).

**Результат ИТЕРАЦИИ 9**: Полноценная социальная обнаруживаемость

---

## ✅ ИТЕРАЦИЯ 10: Theme Engine + Магазин тем (4-5 дней)

```typescript
export interface Theme {
  id: string; name: string; author: string; version: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  sounds?: ThemeSounds;
  icons?: ThemeIcons;
}

// Встроенные темы:
// - "default-gray"   → серый каркас (базовый)
// - "icq99"          → синяя классика ICQ
// - "qip2005"        → Windows XP стиль
// - "dark-matrix"    → зелёный на чёрном
// - "fido-terminal"  → консольный стиль FidoNet

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([k, v]) => root.style.setProperty(`--color-${k}`, v));
  localStorage.setItem('activeTheme', JSON.stringify(theme));
}
```

**Результат ИТЕРАЦИИ 10**: Серый каркас + система тем + магазин

---

## ✅ ИТЕРАЦИЯ 11: Меш-сеть Bluetooth/Wi-Fi (6-8 дней)

### 11.1 Bluetooth Mesh (Mobile) — вдохновение: Briar

```typescript
// mobile/src/services/mesh-service.ts
export class MeshService {

  async advertise(myUIN: string, publicKey: string) {
    await BleManager.startAdvertising({
      serviceUUID: NOSTACHAT_BLE_UUID,
      localName: `NC:${myUIN}`,
    });
  }

  async scanForPeers(): Promise<MeshPeer[]> {
    const peers: MeshPeer[] = [];
    BleManager.startScan([NOSTACHAT_BLE_UUID], 10, false, (err, device) => {
      if (device.name?.startsWith('NC:'))
        peers.push({ uin: device.name.slice(3), rssi: device.rssi });
    });
    await delay(10000);
    BleManager.stopScan();
    return peers;
  }

  async sendViaBluetooth(peerUIN: string, encryptedMsg: string) {
    // GATT Write на характеристику сообщений
  }
}
```

### 11.2 Wi-Fi Direct / LAN

```typescript
// desktop/src/services/wifi-mesh.ts
export class WiFiMeshService {
  advertise(myUIN: string, port: number) {
    this.mdns.advertise({ name: `nostachat-${myUIN}`, type: '_nostachat._tcp', port });
  }
  discover(): Promise<LanPeer[]> {
    return new Promise(resolve => {
      const peers: LanPeer[] = [];
      this.mdns.find({ type: '_nostachat._tcp' }, p => peers.push(p));
      setTimeout(() => resolve(peers), 5000);
    });
  }
}
```

### 11.3 Store-and-Forward (Briar BSP-inspired)

```typescript
// Сообщение хранится и доставляется при следующем контакте
export class StoreAndForwardService {

  queueMessage(recipientUIN: string, msg: EncryptedMessage) {
    const queue = this.pending.get(recipientUIN) || [];
    queue.push(msg);
    this.pending.set(recipientUIN, queue);
    this.persistQueue();
  }

  async syncWithPeer(peerUIN: string, transport: Transport) {
    const queue = this.pending.get(peerUIN) || [];
    for (const msg of queue) await transport.send(peerUIN, msg);
    this.pending.delete(peerUIN);
  }

  // BSP-style: offer → request → ack
  async bspSync(peer: Peer) {
    const ourIds = await db.messages.select('id');
    peer.send({ type: 'offer', messageIds: ourIds });
    peer.on('request', async ({ messageIds }) => {
      const messages = await db.messages.whereIn('id', messageIds);
      peer.send({ type: 'messages', messages });
    });
    peer.on('messages', async ({ messages }) => {
      await db.messages.bulkAdd(messages);
      peer.send({ type: 'ack', messageIds: messages.map(m => m.id) });
    });
  }
}
```

**Результат ИТЕРАЦИИ 11**: Мессенджер работает без интернета

---

## ✅ ИТЕРАЦИЯ 12: Группы, каналы, семейная карта (5-7 дней)

### 12.1 Семейная карта

```
┌────────────────────────────────────────┐
│  Семья Ивановых        [Остановить]    │
│                                        │
│  🗺️ [Leaflet/Google Maps]              │
│    📍 Мама  — ул. Арбат 15 (2 мин)    │
│    📍 Папа  — Садовое кольцо (5 мин)  │
│    📍 Саша  — Школа №123 (1 мин)      │
└────────────────────────────────────────┘
```

### 12.2 Временный геошаринг для активностей

```typescript
// Поход за грибами: шаринг автоматически отключается через 24 часа
const activityGroup = {
  type: 'activity_group',
  name: 'Грибники 5 октября',
  shareLocation: true,
  locationExpiry: Date.now() + 24 * 60 * 60 * 1000
};
```

### 12.3 Каналы

Только создатель пишет, остальные читают. Опционально: закрытый канал с ключом подписки.

**Результат ИТЕРАЦИИ 12**: Группы + семейная карта + каналы

---

## ✅ ИТЕРАЦИЯ 13: Аудио и видеозвонки (7-10 дней)

```typescript
// services/call-service.ts
export class CallService {
  async startAudioCall(contactId: string) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const peer = new SimplePeer({ initiator: true, stream });
    return peer;
  }

  async startVideoCall(contactId: string) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true, video: { width: 1280, height: 720 }
    });
    return new SimplePeer({ initiator: true, stream });
  }
}
// Групповые звонки до 6 чел: P2P mesh (каждый с каждым)
// Больше 6 чел: SFU через сервер (Mediasoup/Janus — post-MVP)
```

**Результат ИТЕРАЦИИ 13**: P2P аудио/видео + групповые звонки

---

## ✅ ИТЕРАЦИЯ 14: Обход блокировок — "Чёрный ящик" (7-10 дней)

### 14.1 Мимикрия трафика под видеозвонок

```typescript
// services/obfuscation.ts
export class ObfuscationService {
  createObfuscatedPC() {
    const pc = new RTCPeerConnection();

    // Fake video: чёрный холст 1280x720 @ 30fps + микро-шум пикселей
    const canvas = document.createElement('canvas');
    canvas.width = 1280; canvas.height = 720;
    setInterval(() => {
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1280, 720);
      // Несколько случайных пикселей 1-5 яркости → реалистичная энтропия
      for (let i = 0; i < 10; i++) {
        const v = Math.floor(Math.random() * 5);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(Math.random() * 1280, Math.random() * 720, 1, 1);
      }
    }, 33);
    pc.addTrack(canvas.captureStream(30).getVideoTracks()[0]);

    // Fake audio: тишина с редким ~-60dB шумом
    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();
    pc.addTrack(dest.stream.getAudioTracks()[0]);

    // Реальные данные через зашифрованный DataChannel
    const dataChannel = pc.createDataChannel('data', { ordered: true });

    return { pc, dataChannel };
  }
}
```

### 14.2 Kyber без стандартных сигнатур

```typescript
// Кастомный wire-формат: нет OID, рандомный паддинг
function serializeKyberCT(ct: Uint8Array): Uint8Array {
  const padding = crypto.getRandomValues(new Uint8Array(50 + Math.random() * 200));
  const result = new Uint8Array(2 + ct.length + padding.length);
  result[0] = ct.length & 0xff;
  result[1] = (ct.length >> 8) & 0xff;
  result.set(ct, 2);
  result.set(padding, 2 + ct.length);
  return result;
  // DPI видит: высокоэнтропийный бинарный поток → "какой-то зашифрованный протокол"
}
```

### 14.3 Технические аккаунты в других сетях

```typescript
// services/bridge-service.ts
// При создании аккаунта NostaChat → автоматически регистрируется
// технический аккаунт (бот/пользователь) в одной или нескольких сетях.
// Используется ТОЛЬКО для сигналинга, не для хранения сообщений.

export class BridgeService {
  async setupBridgeAccounts(myUIN: string) {
    const bridges = [];

    if (config.telegram?.enabled) {
      // Создаём Telegram-бот через BotFather API (или userbot через MTProto)
      const tg = await TelegramBridge.createAccount(myUIN);
      bridges.push({ type: 'telegram', id: tg.id, token: tg.token });
    }

    if (config.matrix?.enabled) {
      // Регистрируемся на публичном Matrix-сервере
      const mx = await MatrixBridge.register(myUIN);
      bridges.push({ type: 'matrix', id: mx.userId, token: mx.token });
    }

    await db.bridges.bulkAdd(bridges);
    return bridges;
  }

  async sendSignalViaBridge(bridgeType: string, recipientId: string, signal: any) {
    const bridge = bridges.find(b => b.type === bridgeType);
    // Зашифрованный сигнал → выглядит как бинарный blob в чужой сети
    const encrypted = CryptoService.encrypt(JSON.stringify(signal), recipientPublicKey);
    await bridge.send(recipientId, encrypted);
  }
}
```

**Чеклист**:
- [ ] Fake video/audio → трафик неотличим от Zoom/Meet в Wireshark
- [ ] Kyber без OID, с рандомным паддингом
- [ ] Email fallback работает
- [ ] Технические аккаунты создаются при регистрации и используются как fallback

**Результат ИТЕРАЦИИ 14**: Полная устойчивость к блокировкам

---

## ✅ ИТЕРАЦИЯ 15: Briar-технологии (углублённые) (5-7 дней)

```typescript
// Briar BTP-inspired: rotating tags для анонимности потоков
export class BriarChannel {
  private tagCounter = 0;

  generateTag(): Uint8Array {
    const tag = sodium.crypto_generichash(16,
      new Uint8Array([...this.sharedSecret, ...numberToBytes(this.tagCounter++)]));
    return tag;
  }

  isExpectedTag(incoming: Uint8Array): boolean {
    for (let i = this.windowStart; i < this.windowStart + WINDOW_SIZE; i++) {
      if (sodium.memcmp(incoming, this.generateTagAt(i))) {
        this.windowStart = i + 1; return true;
      }
    }
    return false;
  }
  // Для наблюдателя: случайный байтовый поток без распознаваемых паттернов
}

// Briar BSP: immutable message records, синхронизация через offer/request/ack
// (реализация в ит.11, здесь — углубление и hardening)
```

**Результат ИТЕРАЦИИ 15**: Полноценная Briar-inspired меш-архитектура

---

## ✅ ИТЕРАЦИЯ 16: FidoNet-элементы (4-6 дней)

### Ностальгия + технология

**FidoNet** (1984–2000-е) — децентрализованная сеть store-and-forward через телефонные линии.
Принципы прямо применимы к NostaChat: store-and-forward, меш-маршрутизация, offline-first.

**Антураж (маркетинг/UX):**
- Адреса в стиле `2:5020/9999` как псевдонимы UIN
- Понятия "netmail" (приватное сообщение) и "echomail" (публичный канал)
- "Tagline" — случайная цитата в подписи (опционально)
- Тема "FidoNet Terminal" в магазине

**FidoNet-режим интерфейса:**
```
┌──────────────────────────────────────────────────────────────┐
│ NostaChat/2 v2.0  Node: 2:5020/9999  [ONLINE]                │
│──────────────────────────────────────────────────────────────│
│ Netmail | Echomail | Files | Node Status | Setup             │
├──────────────────────────────────────────────────────────────┤
│ NETMAIL TO: Alice @ 2:5020/1234                              │
│ SUBJ: Re: Велопоход в субботу                                │
│                                                              │
│ Alice, буду. Стартуем в 9:00 от метро.                      │
│                                                              │
│ --- NostaChat/2 v2.0                                         │
│ * "The internet never forgets, but FidoNet remembers"        │
└──────────────────────────────────────────────────────────────┘
```

**Технологическое применение:**
```typescript
// FidoNet-inspired store-and-forward маршрутизация
export class FidoRouter {
  async routeMessage(msg: EncryptedMessage, destination: string) {
    const route = await this.findRoute(destination); // цепочка узлов
    for (const hop of route) {
      try { await this.forwardToNode(hop, msg, destination); return; }
      catch (e) { /* следующий hop */ }
    }
    await this.storeInOutbox(msg, destination); // отправить при появлении маршрута
  }
}
```

**Результат ИТЕРАЦИИ 16**: FidoNet как маркетинговая ностальгия + технологический store-and-forward

---

## ✅ ИТЕРАЦИЯ 17: Mobile Polish + Push (5-7 дней)

```kotlin
// Android: Foreground Service для фонового P2P
class WebRTCService : Service() {
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    startForeground(1, createNotification())
    return START_STICKY
  }
}
```

```xml
<!-- iOS: VoIP background mode -->
<key>UIBackgroundModes</key>
<array>
  <string>voip</string>
  <string>audio</string>
</array>
```

**Результат ИТЕРАЦИИ 17**: Production-ready мобильное приложение

---

## ✅ ИТЕРАЦИЯ 18: Security Audit + v1.0 (2-3 недели)

- [ ] Внешний аудит криптографии (Kyber-реализация, libsodium использование)
- [ ] Penetration testing (сервер, WebRTC, BLE)
- [ ] Privacy audit (утечки метаданных)
- [ ] Документация по безопасности для пользователей
- [ ] Bug bounty программа

---

## 📊 Post-MVP Roadmap

```
Итерация 19: Передача файлов (chunked P2P, resumable)
Итерация 20: Голосовые/видео сообщения
Итерация 21: SFU для групповых звонков 6+ чел (Mediasoup)
Итерация 22: Боты и API для разработчиков
Итерация 23: Расширенный магазин тем/модов
Итерация 24: Папки для каналов — дополнительная сортировка масс-медиа
Итерация 25: Платёжная интеграция (опционально)
```

---

## 📊 Временная оценка

```
┌────────────────────────────────────────────────────────────┐
│  №   │ Задача                           │ Дни             │
├────────────────────────────────────────────────────────────┤
│  0   │ Инфраструктура                   │ 2-3             │
│  1   │ Hello World                      │ 3-5             │
│  2   │ UIN + Direct Messaging           │ 4-5             │
│  3   │ P2P + Kyber E2E                  │ 5-7             │
│  4   │ ICQ GUI + Buzz + Секции          │ 5-7             │
│  5   │ История + Профиль (гранулярный)  │ 3-4             │
│  6   │ SMS переброска                   │ 3-4             │
│  7   │ Email Signaling + Transport Mgr  │ 4-5             │
│  8   │ QR обмен ключами (Briar-style)   │ 3-4             │
│  9   │ Социальный поиск                 │ 5-7             │
│  10  │ Theme Engine + Магазин тем       │ 4-5             │
│  11  │ Меш BT/WiFi + Store-and-Forward  │ 6-8             │
│  12  │ Группы + Каналы + Семейная карта │ 5-7             │
│  13  │ Аудио/Видео звонки               │ 7-10            │
│  14  │ Обход блокировок (чёрный ящик)   │ 7-10            │
│  15  │ Briar-технологии (углублённые)   │ 5-7             │
│  16  │ FidoNet-элементы                 │ 4-6             │
│  17  │ Mobile polish + Push             │ 5-7             │
│  18  │ Security Audit + v1.0            │ 14-21           │
├────────────────────────────────────────────────────────────┤
│      │ ИТОГО                            │ 105-147 дней    │
└────────────────────────────────────────────────────────────┘

При 20-30 ч/нед:
  Оптимистично:  4-5 месяцев
  Реалистично:   6-8 месяцев
  С запасом:     9-12 месяцев
```

---

## 🎯 MVP-критерии (после Итерации 8)

```
✅ Desktop + Mobile клиенты
✅ UIN без телефона (ключевое конкурентное преимущество)
✅ P2P WebRTC с гибридным E2E (X25519 + Kyber ML-KEM-768)
✅ ICQ-подобный интерфейс (серый каркас + ICQ 99 тема)
✅ Два раздела: Контакты / Каналы+Группы (с разделителем)
✅ Buzz-кнопка
✅ SMS переброска (opt-in)
✅ Email fallback сигналинг
✅ QR обмен ключами + fingerprint верификация
✅ История сообщений (локально)
✅ Гранулярная приватность профиля (двойной чекбокс)
```

---

## 🔐 Безопасность: ключевые принципы

1. **Гибрид X25519 + Kyber ML-KEM-768** — классика + пост-квантум
2. **Без телефонного номера** — UIN не привязан к личности
3. **E2E по умолчанию** — сервер не видит контент
4. **Ручная верификация** (Briar-style) — QR + fingerprint
5. **Меш без сервера** — BT/WiFi работают без интернета
6. **Мимикрия трафика** — fake video/audio, Kyber без OID
7. **Гранулярная приватность** — каждое поле: none/contacts/all
8. **Rotating keys** (Briar BTP-inspired) — прямая секретность
9. **Технические аккаунты** — fallback сигналинг без раскрытия контента

---

## 💡 Советы по Claude Code

```bash
# Итерация 3: Kyber + libsodium гибрид
"Implement hybrid encryption: X25519 (libsodium crypto_scalarmult)
combined with ML-KEM-768 (crystals-kyber-js). XOR both shared
secrets, hash with BLAKE2b-256, encrypt with XSalsa20-Poly1305."

# Итерация 9: Геопоиск
"Add PostGIS to Express server. Implement /api/discovery/nearby
returning users within radius who set allowNearby=true.
Use ST_DWithin for efficient geo queries."

# Итерация 11: BLE mesh
"Create Bluetooth mesh service with react-native-ble-plx.
Advertise as 'NC:UIN', scan for other NC: devices, send
encrypted messages via GATT Write characteristic."

# Итерация 14: Traffic obfuscation
"Add fake WebRTC media tracks to disguise data channel as video
call. Black canvas 1280x720 at 30fps, silent AudioContext.
Real messages go through encrypted DataChannel."

# Итерация 16: FidoNet theme
"Create FidoNet terminal theme for NostaChat. CRT-style green
text on black background, DOS-like menu bar, message format with
From/To/Subject headers, tagline at bottom of messages."
```
