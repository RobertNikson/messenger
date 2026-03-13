import os
import random
from datetime import datetime, timezone

from dotenv import load_dotenv
from telegram import Update
from telegram.constants import ParseMode
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

load_dotenv()

PREDICTIONS = [
    "Пихай смелее — сегодня карта прёт, чёрт побери.",
    "Фолдни эту хрень, там натс у оппа в девяти случаях из десяти.",
    "3-беть и не ссы: ты в позиции, это твой стол.",
    "Не выёбывайся с блефом на этом борде — тебя вскроют в ноль.",
    "Играй по тайту, а не как ебанутый маньяк — и будешь в плюсе.",
    "Руку переоценил, дружище. Притормози, пока не проебал стек.",
    "На ривере добирай тонко, но без цирка и лишней хуйни.",
    "Сегодня дисциплина ебёт агрессию всухую.",
    "Турнирный спот норм, но не твори хуйню со средним стеком.",
    "Сделай паузу, пересчитай ауты и не сливай банкролл по тупости.",
    "Чек-бэк флопа, потом дави тёрн — рабочая тема, бля буду.",
    "Ридсы ридсами, но математику диапазонов, сука, никто не отменял.",
]


def make_prediction(question: str) -> str:
    answer = random.choice(PREDICTIONS)
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    return (
        "🔮 <b>Предсказание</b>\n\n"
        f"<b>Вопрос:</b> {question}\n"
        f"<b>Ответ:</b> {answer}\n\n"
        f"<i>{ts}</i>"
    )


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    text = (
        "Привет! Я бот предсказаний 🔮\n\n"
        "Отправь вопрос, на который можно ответить как минимум вариантом «да/нет».\n"
        "Пример: <i>Стоит ли мне запускать проект в этом месяце?</i>"
    )
    await update.message.reply_text(text, parse_mode=ParseMode.HTML)


async def help_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    text = (
        "Команды:\n"
        "/start — приветствие\n"
        "/help — помощь\n\n"
        "Просто отправь вопрос — я дам предсказание."
    )
    await update.message.reply_text(text)


async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    question = (update.message.text or "").strip()
    if len(question) < 3:
        await update.message.reply_text("Сформулируй вопрос чуть подробнее 🙂")
        return

    prediction = make_prediction(question)
    await update.message.reply_text(prediction, parse_mode=ParseMode.HTML)


def main() -> None:
    token = os.getenv("BOT_TOKEN")
    if not token:
        raise RuntimeError("Не найден BOT_TOKEN. Добавь его в .env")

    app = Application.builder().token(token).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_cmd))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

    print("Bot is running...")
    app.run_polling()


if __name__ == "__main__":
    main()
