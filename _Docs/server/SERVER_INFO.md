# NostaChat Server: Технический отчет

## 🌐 Общая информация
- **IP сервера:** `82.24.123.48`
- **ОС:** Ubuntu 22.04 LTS
- **Панель управления (Docker):** [Portainer](https://82.24.123.48:9443)
- **Управление сайтами:** Nginx Proxy Manager (в Docker)

---

## 🏗️ Развернутые сервисы

### 1. NostaChat (Messenger Backend)
- **Порт:** `3002`
- **Путь к файлам:** `/app/nostachat`
- **Как обновить:** 
  1. Замените файлы в `/app/nostachat` (через SCP/SFTP).
  2. В терминале: `docker build -t nostachat-server . && docker restart nostachat-v1`

### 2. VLESS + Reality (VPN)
- **Порт:** `443` (маскировка под HTTPS)
- **Протокол:** VLESS + Reality
- **UUID пользователей (всего 10):**
  - `1817b67c-8979-44ec-8ebd-522114e1e3a9` (User 1)
  - `dd56ec7b-9638-4b33-9115-fc9307ba6dd3` (User 2)
  - `ff7c7121-82af-4fe5-9ba9-ae76ec2aadb2` ... и остальные (см. `/app/xray/config.json`)
- **Public Key:** `p4wb-RToVWwHGpyP8OlGeNWNRjQE0d3LXFyLgANIvl4`
- **Short ID:** `0123456789abcdef`
- **SNI (Маскировка):** `www.google.com`

### 3. MTProxy (Telegram)
- **Порт:** `2000`
- **Secret:** `dd00112233445566778899aabbccddeeff`
- **Ссылка для подключения:** `tg://proxy?server=82.24.123.48&port=2000&secret=dd00112233445566778899aabbccddeeff`

### 4. WordPress + Nginx Proxy Manager
- **HTTP:** `8080` (внутренний)
- **HTTPS:** `8443` (внутренний)
- **Админка NPM:** `http://82.24.123.48:81`
- **База данных:** MariaDB (в Docker-сети `nginx-proxy_default`)

---

## 🛠️ Команды администратора
- **Просмотр всех контейнеров:** `docker ps`
- **Логи мессенджера:** `docker logs -f nostachat-v1`
- **Перезагрузить всё:** `docker restart $(docker ps -q)`

**Файлы на сервере:**
- `/app/nostachat` — Код мессенджера.
- `/app/xray` — Конфиг VPN.
- `/data/compose/nginx-proxy` — Весь ваш сайт и прокси-менеджер.
- `/data/wordpress` — Файлы самого сайта WordPress.
