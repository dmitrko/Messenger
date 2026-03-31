# Путеводитель по документации NostaChat

Здесь представлен список всех доступных руководств и архитектурных описаний проекта, организованный по направлениям.

## Общие документы
- **[Project_Overview.md](file:///C:/wamp64/www/Messenger/_Docs/Project_Overview.md)**: Общая концепция проекта, философия «Анонимность + Ностальгия» и технологический стек (React, Node.js, Kyber).
- **[Documentation_Index.md](file:///C:/wamp64/www/Messenger/_Docs/Documentation_Index.md)**: Данный файл-оглавление. Содержит краткие аннотации ко всем документам для быстрой навигации.

## Техническая архитектура
- **[desktop/Desktop_Architecture.md](file:///C:/wamp64/www/Messenger/_Docs/desktop/Desktop_Architecture.md)**: Погружение во фронтенд на React и Vite. Описание WebRTC-логики (SimplePeer), управление состоянием ключей E2EE и интеграция с libsodium.
- **[server/Server_Architecture.md](file:///C:/wamp64/www/Messenger/_Docs/server/Server_Architecture.md)**: Описание серверной части на Node.js. Как работает сигналинг, рассылка зашифрованных ключей комнаты и координация P2P-сессий.
- **[mobile/Mobile_Overview.md](file:///C:/wamp64/www/Messenger/_Docs/mobile/Mobile_Overview.md)**: Описание мобильного клиента на React Native. Текущий статус разработки, общие компоненты и планы по портированию функционала.

## Функционал и интерфейс
- **[function_ui/Features_Guide.md](file:///C:/wamp64/www/Messenger/_Docs/function_ui/Features_Guide.md)**: Детальное описание пользовательских функций: Общий канал, личные чаты, система «Гудков» (Buzz) и индикация защищенного соединения (🔐).

## Будущее развитие
- **[NEW/Future_Development.md](file:///C:/wamp64/www/Messenger/_Docs/NEW/Future_Development.md)**: Дорожная карта проекта. Планы по виртуальным окнам чата, интеграции оригинальных звуков ICQ и миграции на Electron для выпуска .exe файлов.
