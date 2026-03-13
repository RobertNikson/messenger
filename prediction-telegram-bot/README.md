# Telegram бот предсказаний 🔮

Минимальный бот, который принимает вопрос и отправляет случайное предсказание.

## 1) Создай бота в BotFather

1. Открой [@BotFather](https://t.me/BotFather)
2. Команда: `/newbot`
3. Задай имя и username
4. Скопируй токен

## 2) Установка

```bash
cd prediction-telegram-bot
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Открой `.env` и вставь токен:

```env
BOT_TOKEN=123456:ABC...
```

## 3) Запуск

```bash
python bot.py
```

## Поведение

- `/start` — приветствие
- `/help` — помощь
- Любой текст — бот считает это вопросом и дает предсказание

## Идеи для улучшений

- Категории предсказаний (любовь/деньги/работа)
- История предсказаний в SQLite
- Ограничение частоты запросов
- Inline-режим
