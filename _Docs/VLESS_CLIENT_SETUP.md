# 🔐 Инструкция по подключению VPN (VLESS + Reality)

## Данные для подключения

| Параметр | Значение |
|---|---|
| **Сервер (IP)** | `82.24.123.48` |
| **Порт** | `443` |
| **Протокол** | VLESS |
| **Безопасность** | Reality |
| **Public Key** | `p4wb-RToVWwHGpyP8OlGeNWNRjQE0d3LXFyLgANIvl4` |
| **Short ID** | `0123456789abcdef` |
| **SNI / Fingerprint** | `www.google.com` / `chrome` |
| **Flow** | `xtls-rprx-vision` |
| **Network** | `tcp` |

### UUID пользователей (выдавать по одному на человека):
1. `1817b67c-8979-44ec-8ebd-522114e1e3a9`
2. `dd56ec7b-9638-4b33-9115-fc9307ba6dd3`
3. `ff7c7121-82af-4fe5-9ba9-ae76ec2aadb2`
4. `f6319861-701f-415a-a079-40eba76e7156`
5. `2a5ee3ca-660d-4de2-86a3-63670809ebc3`
6. `f8ad042f-ba80-480e-b4b4-44643ff92774`
7. `14a3e39f-c26f-4b25-8375-4e5891265793`
8. `142f4783-6e1d-4104-8322-e2dd77fad39c`
9. `fe6e1e08-23b2-4d70-9ffb-4b939cbeb2ef`
10. `dec79cf1-ab8b-42dc-a41b-2f37800bea00`

---

## 💻 Windows 11: Hiddify

**Hiddify** — самый простой и красивый клиент для Windows.

### Установка:
1. Скачайте **Hiddify** с официального сайта: [https://hiddify.com](https://hiddify.com)  
   > Выберите версию **Windows (x64 Setup)**.
2. Установите и запустите программу.

### Настройка вручную:
1. Нажмите кнопку **"+"** (Add Profile / Добавить).
2. Выберите **"Add Manually"** → **"Custom"**.
3. Введите следующую **VLESS ссылку** (замените `UUID` на нужный UUID из списка выше):

```
vless://1817b67c-8979-44ec-8ebd-522114e1e3a9@82.24.123.48:443?encryption=none&flow=xtls-rprx-vision&security=reality&sni=www.google.com&fp=chrome&pbk=p4wb-RToVWwHGpyP8OlGeNWNRjQE0d3LXFyLgANIvl4&sid=0123456789abcdef&type=tcp&headerType=none#NostaChat-VPN
```

4. Сохраните и **нажмите "Connect"**.

### Альтернатива: v2rayN
1. Скачайте [v2rayN](https://github.com/2dust/v2rayN/releases) — файл `v2rayN-with-core.zip`.
2. Распакуйте и запустите `v2rayN.exe`.
3. Нажмите **"Servers"** → **"Add VLESS server"**.
4. Заполните поля:
   - Address: `82.24.123.48`, Port: `443`
   - UUID: (из списка выше)
   - Flow: `xtls-rprx-vision`
   - Transport: `tcp`
   - Security: `reality`
   - SNI: `www.google.com`
   - Fingerprint: `chrome`
   - Public Key: `p4wb-RToVWwHGpyP8OlGeNWNRjQE0d3LXFyLgANIvl4`
   - Short ID: `0123456789abcdef`
5. Нажмите **"OK"**, затем ПКМ на сервере → **"Set as active server"**.
6. В системном трее нажмите v2rayN → **"System proxy"** → **"Set system proxy"**.

---

## 📱 Android: Hiddify (рекомендуется)

1. Установите **Hiddify** из Google Play:  
   [https://play.google.com/store/apps/details?id=app.hiddify.com](https://play.google.com/store/apps/details?id=app.hiddify.com)  
   > Или скачайте `.apk` с [GitHub Hiddify](https://github.com/hiddify/hiddify-next/releases).

2. Нажмите **"+"** → **"Add profile manually"** → вставьте VLESS-ссылку (из раздела Windows выше).

3. Нажмите **"Connect"**. Готово! ✅

### Альтернатива: v2rayNG
1. Установите **v2rayNG** из Google Play.
2. Нажмите **"+"** → **"Input config manually"** → вставьте VLESS-ссылку.
3. Нажмите галочку и **"Connect"**.

---

## 🍎 iOS / iPhone: Streisand (рекомендуется)

1. Установите **Streisand** из App Store:  
   [https://apps.apple.com/app/streisand/id6450534064](https://apps.apple.com/app/streisand/id6450534064)

2. Нажмите **"+"** → **"Import from clipboard"** → вставьте VLESS-ссылку из раздела Windows.

3. Нажмите **"Connect"**. Готово! ✅

### Альтернатива: Shadowrocket
1. Купите **Shadowrocket** в App Store ($2.99).
2. Нажмите **"+"** сверху справа.
3. Тип: **VLESS**, заполните данные вручную (как в разделе v2rayN).
4. Нажмите **"Connect"**.

---

## 📡 Telegram MTProxy
Отдельная ссылка для Telegram (работает без VPN):

```
tg://proxy?server=82.24.123.48&port=2000&secret=dd00112233445566778899aabbccddeeff
```

Просто скопируйте эту ссылку и откройте в Telegram — он сам предложит подключиться.

---

## ❓ Проверка подключения
После включения VPN зайдите на [https://2ip.ru](https://2ip.ru) — там должен отображаться IP **82.24.123.48** (Нидерланды/Германия), а не ваш домашний IP.
