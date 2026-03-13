import html
import os
import random

from dotenv import load_dotenv
from telegram import Update
from telegram.constants import ParseMode
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
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
    "Если снова пойдёшь олл-ин на второй паре — кошелёк заплачет матом.",
    "Ты не лаковый, ты просто забыл, что фолд — тоже кнопка, блядь.",
    "Жизнь как покер: сначала раздаёт херню, потом проверяет характер.",
    "Не блефуй в троих — это не геройство, это дорогой цирк, нахуй.",
    "Вроде карта говно, а сыграл умно — вот это уже взрослый покер.",
    "Сегодня твой главный скилл — не тильтовать как проклятый.",
    "Сначала кофе, потом сессия — иначе на ривере будешь творить дичь.",
    "Если чувствуешь, что несёт в тильт — встань, умойся, выдохни и не ебашь на злости.",
    "Банкролл любит дисциплину, а понты — только красивые скрины с минусом.",
    "Не гонись за каждым банком: иногда лучший мув — послать раздачу нахер.",
    "Сегодня удача на твоей стороне, но жадность рядом — держи её на поводке.",
    "Ты как TikTok-тренд: залетел резко, а через час сам не понял, что натворил.",
    "Сейчас твоя стратегия как Reels — ярко, быстро и местами вообще без смысла.",
    "Хочешь хайпа как у мем-коина? Тогда готовься и к просадке, епт.",
    "Не делай решений на вайбе, это не стрим с донатами, это твои деньги.",
    "С таким темпом ты скоро откроешь стартап: \"Как проебать стек за 3 минуты\".",
    "Сегодня ты в режиме нейросети: уверен на 100%, а потом внезапно несёшь хуйню.",
    "Действуй проще: меньше драмы, меньше FOMO, больше головы.",
    "Если план звучит как кликбейт-заголовок — скорее всего, это херня.",
    "Энергия у тебя как у вирусного трека, но контроль как у пьяного самоката.",
    "Не пытайся быть одновременно крипто-гуру, покер-про и сигма-коучем — выбери одно, блядь.",
    "Сегодня тренд такой: кто не суетится, тот забирает плюс.",
    "Если день идёт по пизде — не удваивай ставки, удваивай осторожность.",
    "Ты сейчас как чат в Telegram ночью: шума дохуя, пользы мало.",
    "План на день: меньше понтов, меньше риска, больше бабок к вечеру.",
    "Не будь героем every hand — геройство оплачивается из твоего кармана.",
    "Твоё терпение сегодня дороже любого туза, не просри его.",
    "Включи голову, а не эго — эго уже достаточно накосячило.",
    "Если хочется нажать колл просто из злости — отойди на минуту, брат.",
    "Сегодня даже Вселенная шепчет: \"не ебашь без плана\".",
    "Ты не обязан тащить каждую раздачу, но обязан не творить хуйню.",
    "Фарт любит подготовленных, а не тех, кто верит в магию после трёх кулеров.",
    "Тильт — это налог на тупость. Не плати его сегодня.",
    "Если чувствуешь себя гением, проверь график — он часто матерится в ответ.",
    "Меньше импровизации, больше структуры — и будет не стыдно смотреть отчёт.",
    "Сегодняшний лайфхак: фолд вовремя спасает нервы, деньги и самооценку.",
    "Ты как мем недели: сначала смешно, потом всем дорого обходится.",
    "Не гонись за хайпом, гонись за плюс-ЕV, остальное нахер.",
]

ROAST_PREFIXES = [
    "Слушай сюда",
    "Братан",
    "Ну чё",
    "Запоминай",
    "Без обид, но",
    "Лови расклад",
    "Ща по фактам",
    "Суровая правда",
    "По-братски скажу",
]


def _chat_allowlist(context: ContextTypes.DEFAULT_TYPE, chat_id: int) -> set[str]:
    key = f"allowlist:{chat_id}"
    data = context.application.bot_data.setdefault(key, set())
    return data


def _chat_prediction_pool(context: ContextTypes.DEFAULT_TYPE, chat_id: int) -> list[str]:
    key = f"prediction_pool:{chat_id}"
    pool = context.application.bot_data.get(key)
    if not pool:
        pool = PREDICTIONS.copy()
        random.shuffle(pool)
        context.application.bot_data[key] = pool
    return pool


def _next_prediction(context: ContextTypes.DEFAULT_TYPE, chat_id: int) -> str:
    pool = _chat_prediction_pool(context, chat_id)
    return pool.pop()


def _display_name(user) -> str:
    if user.username:
        return f"@{user.username}"
    return user.first_name or "игрок"


def make_prediction(answer: str, author_name: str, target_name: str | None = None) -> str:
    opener = random.choice(ROAST_PREFIXES)
    who = target_name if target_name else author_name
    roast_line = f"{opener}, {who}: {answer}"
    return f"<b>Предсказание:</b> {html.escape(roast_line)}"


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
        "/disa_predskazaniy38 [вопрос] — персональное предсказание\n"
        "/disa [вопрос] — короткая команда\n\n"
        "Отвечаю только по командам /disa_predskazaniy38 или /disa."
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


async def _send_prediction(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message or not update.effective_user or not update.effective_chat:
        return

    author = _display_name(update.effective_user)
    allowlist = sorted(_chat_allowlist(context, update.effective_chat.id))

    target = None
    if allowlist and random.random() < 0.5:
        target = f"@{random.choice(allowlist)}"

    answer = _next_prediction(context, update.effective_chat.id)
    prediction = make_prediction(answer, author_name=author, target_name=target)
    await update.message.reply_text(prediction, parse_mode=ParseMode.HTML)


async def disa_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message:
        return
    await _send_prediction(update, context)


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
    app.add_handler(CommandHandler("disa", disa_cmd))

    print("Bot is running...")
    app.run_polling()


if __name__ == "__main__":
    main()
