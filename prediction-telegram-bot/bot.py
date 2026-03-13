import html
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

ROAST_PREFIXES = [
    "Слушай сюда",
    "Братан",
    "Ну чё",
    "Запоминай",
    "Без обид, но",
    "Лови расклад",
]


def _chat_allowlist(context: ContextTypes.DEFAULT_TYPE, chat_id: int) -> set[str]:
    key = f"allowlist:{chat_id}"
    data = context.application.bot_data.setdefault(key, set())
    return data


def _display_name(user) -> str:
    if user.username:
        return f"@{user.username}"
    return user.first_name or "игрок"


def make_prediction(question: str, author_name: str, target_name: str | None = None) -> str:
    answer = random.choice(PREDICTIONS)
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    opener = random.choice(ROAST_PREFIXES)
    who = target_name if target_name else author_name
    roast_line = f"{opener}, {who}: {answer}"

    return (
        "🔮 <b>Покер-предсказание</b>\n\n"
        f"<b>Вопрос от:</b> {html.escape(author_name)}\n"
        f"<b>Вопрос:</b> {html.escape(question)}\n\n"
        f"<b>Вердикт:</b> {html.escape(roast_line)}\n\n"
        f"<i>{ts}</i>"
    )


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    text = (
        "Йо, я покер-оракул 🔮\n\n"
        "Кидай вопрос — дам дерзкое предсказание.\n"
        "По умолчанию обращаюсь к автору сообщения.\n"
        "Можно добавить согласованных юзеров в рандом-пул через /allow @username"
    )
    await update.message.reply_text(text)


async def help_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    text = (
        "Команды:\n"
        "/start — старт\n"
        "/help — помощь\n"
        "/allow @username — добавить юзера в рандом-упоминания (с согласия)\n"
        "/unallow @username — убрать из списка\n"
        "/allowlist — показать список\n"
        "/disa_predskazaniy38 [вопрос] — персональное предсказание\n\n"
        "Любой текст = вопрос для предсказания."
    )
    await update.message.reply_text(text)


async def allow_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.effective_chat:
        return
    if not context.args:
        await update.message.reply_text("Используй: /allow @username")
        return

    username = context.args[0].strip().lstrip("@").lower()
    if not username:
        await update.message.reply_text("Нужен валидный username: /allow @username")
        return

    allowlist = _chat_allowlist(context, update.effective_chat.id)
    allowlist.add(username)
    await update.message.reply_text(f"Добавил @{username} в рандом-список ✅")


async def unallow_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.effective_chat:
        return
    if not context.args:
        await update.message.reply_text("Используй: /unallow @username")
        return

    username = context.args[0].strip().lstrip("@").lower()
    allowlist = _chat_allowlist(context, update.effective_chat.id)

    if username in allowlist:
        allowlist.remove(username)
        await update.message.reply_text(f"Убрал @{username} из рандом-списка ✅")
    else:
        await update.message.reply_text(f"@{username} и так не был в списке")


async def allowlist_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.effective_chat:
        return

    allowlist = sorted(_chat_allowlist(context, update.effective_chat.id))
    if not allowlist:
        await update.message.reply_text("Список пуст. Добавь через /allow @username")
        return

    lines = "\n".join(f"- @{u}" for u in allowlist)
    await update.message.reply_text(f"Рандом-список:\n{lines}")


async def _send_prediction(update: Update, context: ContextTypes.DEFAULT_TYPE, question: str) -> None:
    if not update.message or not update.effective_user or not update.effective_chat:
        return

    author = _display_name(update.effective_user)
    allowlist = sorted(_chat_allowlist(context, update.effective_chat.id))

    target = None
    if allowlist and random.random() < 0.5:
        target = f"@{random.choice(allowlist)}"

    prediction = make_prediction(question, author_name=author, target_name=target)
    await update.message.reply_text(prediction, parse_mode=ParseMode.HTML)


async def disa_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message:
        return
    question = " ".join(context.args).strip() if context.args else "Что меня ждёт за покерным столом?"
    await _send_prediction(update, context, question)


async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message or not update.effective_user or not update.effective_chat:
        return

    question = (update.message.text or "").strip()
    if len(question) < 3:
        await update.message.reply_text("Сформулируй вопрос чуть подробнее 🙂")
        return

    trigger = "disa_predskazaniy38"
    normalized = question.lower().strip()
    if normalized == trigger or normalized.startswith(trigger + " "):
        payload = question[len(trigger):].strip() if normalized.startswith(trigger) else ""
        question = payload or "Что меня ждёт за покерным столом?"

    await _send_prediction(update, context, question)


def main() -> None:
    token = os.getenv("BOT_TOKEN")
    if not token:
        raise RuntimeError("Не найден BOT_TOKEN. Добавь его в .env")

    app = Application.builder().token(token).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_cmd))
    app.add_handler(CommandHandler("allow", allow_cmd))
    app.add_handler(CommandHandler("unallow", unallow_cmd))
    app.add_handler(CommandHandler("allowlist", allowlist_cmd))
    app.add_handler(CommandHandler("disa_predskazaniy38", disa_cmd))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

    print("Bot is running...")
    app.run_polling()


if __name__ == "__main__":
    main()
