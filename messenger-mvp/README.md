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

## Дальше можно добавить

- Групповые чаты
- Push-уведомления
- Редактирование/удаление сообщений
- Загрузка файлов/фото
- iOS-клиент (SwiftUI) к этому backend
