# Messenger MVP

Стек: **Node.js + Fastify + WebSocket + SQLite + React (Vite)**

## Запуск backend

```bash
cd messenger-mvp/server
npm install
npm run dev
```

Сервер поднимется на `http://localhost:8787`

## Запуск frontend

```bash
cd messenger-mvp/web
npm install
npm run dev
```

Открой URL из Vite (обычно `http://localhost:5173`).

## Что уже есть

- Регистрация / логин
- JWT-авторизация
- Список пользователей
- 1:1 чат
- История сообщений
- Реалтайм доставка сообщений через WebSocket

## iOS-каркас (SwiftUI)

Добавлен шаблон в `ios/MessengerIOS`:

- Auth (login/register)
- Список пользователей
- 1:1 диалог
- WebSocket realtime
- Хранение токена в Keychain

### Как запустить на iPhone

1. Создай новый проект в Xcode (App, SwiftUI, iOS 17+)
2. Скопируй файлы из `ios/MessengerIOS` в проект
3. Убедись, что все файлы включены в target
4. В `APIClient.swift` поставь IP backend-машины в локалке (не `127.0.0.1`)
5. Запусти backend (`server`) и стартуй app на устройстве

## Дальше можно добавить

- Групповые чаты
- Push-уведомления
- Редактирование/удаление сообщений
- Загрузка файлов/фото
- Delivery/read receipts
