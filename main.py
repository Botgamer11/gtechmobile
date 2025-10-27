from vkbottle.bot import Bot, Message
from vkbottle import GroupEventType
from typing import Optional
from vkbottle import BaseMiddleware, CtxStorage
from vkbottle.tools.dev.mini_types.bot.message import MessageMin
from vkbottle import Keyboard, KeyboardButtonColor, Text, Callback, OpenLink, GroupEventType, GroupTypes, BaseStateGroup, CtxStorage, ShowSnackbarEvent, EMPTY_KEYBOARD
from vkbottle import LoopWrapper
from rules import IsCommand

import asyncio
import json
import os
import re
import threading
import time
import random
from datetime import datetime, timedelta

# Токен вашего сообщества
TOKEN = "vk1.a.DgKbSMV77HKPUHKXQJkF3oSz17uLjz9hu07_C6_FksfOaFvuU6wYCb4bc_mG_zv7_ElsrCJzsYSSdHT-f7lpVINOuilCsk-MdfcoMtYxfpE6bGAsqSIIeXOp0E2X7U7_mkjJO9I7Zi74CscoBr3PxxlHDIECFUJd1sKCnBMxuyp3Y7j1-va3b-TJLWd4Q_4pWjnGcq3z0BDRCu0pWOhMOQ"

bot = Bot(token=TOKEN)
bot.labeler.custom_rules["IsCommand"] = IsCommand
ctx = CtxStorage()


class CJSON: # Класс для работы с JSON
    def write(data, filename):
        tab = json.dumps(data)
        tab = json.loads(str(tab))
        with open(filename, 'w', encoding='utf-8') as file:
            json.dump(tab, file, indent=4, ensure_ascii=False)

    def read(filename):
        with open(filename, 'r', encoding='utf-8') as file:
            return json.load(file)

class TechReport(BaseStateGroup):
    DIALOG = 0

FILES = [
    'database.json',
    'unity.json',
    'tech.json',
    'profiles.json'
]


# Функция для загрузки базы данных
def load_files():
    for filename in FILES:
        if not os.path.exists(filename):
            CJSON.write({}, filename)

load_files()

class DB:
    def load():
        data = CJSON.read(FILES[0])
        if len(data) <= 0:
            data["chats"] = {}
        return data
    
    def save(database):
        CJSON.write(database, FILES[0])

class tech:
    def __init__(self):
        self.data = CJSON.read(FILES[2])
        self.save = (lambda: CJSON.write(self.data, FILES[2]))
        

        if len(self.data) <= 0:
            self.data["admins"] = {
                "883292950": {
                    "id": "883292950",
                    "role": "owner",
                    "dostup": {
                        "sysban": 1,
                        "sysrole": 1,
                        "agent": 1,
                        "sysunban": 1,
                        "banreport": 1,
                        "reports": 1,
                        "givemoney": 1,
                        "givevip": 1
                    }
                }
            }
            self.data["sysbans"] = {}
            self.data["reports"] = {}
            self.data["banreport"] = {}
            self.save()

    def get_admin_info(self, user_id: str):
        if user_id in self.data["admins"]:
            return self.data["admins"][user_id]
        return None

    def add_admin(self, user):
        self.data["admins"][str(user.id)] = {
            "id": str(user.id),
            "role": "agent",
            "dostup": {
                "sysban": 0,
                "sysrole": 0,
                "agent": 0,
                "sysunban": 0,
                "banreport": 0,
                "reports": 0,
                "givemoney": 0,
                "givevip": 0
            },
            "m-c-id": -1
        }
        self.save()

    def set_message_id_in_edit(self, user_id, message_id):
        self.data["admins"][str(user_id)]["m-c-id"] = message_id
        self.save()

    def set_dostup(self, user_id, dostup, is_dostup):
        self.data["admins"][str(user_id)]["dostup"][dostup] = is_dostup
        self.save()

    def clear_mcid(self):
        for admin in self.data["admins"]:
            self.data["admins"][admin]["m-c-id"] = -1
        self.save()

    def sysban(self, method, user_id, reason = "Не указана"):
        if method == "add":
            self.data["sysbans"][str(user_id)] = {
                "reason": reason
            }
        elif method == "delete":
            count = 0
            for ban_user_id in self.data["sysbans"]:
                if ban_user_id == str(user_id):
                    del self.data["sysbans"][ban_user_id]
                    break
                count += 1
        self.save()

    def is_sysban(self, user_id):
        if str(user_id) in self.data["sysbans"]:
            return True
        return False

    def del_admin(self, user_id):
        del self.data["admins"][user_id]
        self.save()

    def new_report(self, user_id: int | str, report: list[dict], datatime: str):
        reportId = str(len(self.data["reports"]) + 1)
        if len(self.data["reports"]) > 0:
            for i in range(max(list(map(int, self.data["reports"]))) + 1):
                if self.data["reports"].get(str(i), -1) == -1:
                    reportId = str(i)
                    break

        self.data["reports"][reportId] = {
            "id": reportId,
            "from_id": str(user_id),
            "admin_id": -1,
            "datetime": datatime,
            "dialog": report
        }
        self.save()
        return reportId

    def is_kd_report(self, user_id: int | str):
        count = 0
        for report in self.data["reports"]:
            if self.data["reports"][report]["from_id"] == str(user_id):
                count += 1

        if count >= 2:
            return True
        return False

    def is_banreport(self, user_id: int | str):
        return str(user_id) in self.data["banreport"]
        
    def banreport(self, state: int, user_id: int | str):
        if state == 1:
            self.data["banreport"][str(user_id)] = 1
            self.save()
        elif state == 0:
            if str(user_id) in self.data["banreport"]:
                del self.data["banreport"][str(user_id)]
                self.save()

    def get_all_reports(self):
        return self.data["reports"]

    def get_report(self, report_id: int | str):
        if str(report_id) in self.data["reports"]:
            return self.data["reports"][str(report_id)]
        return None

    def is_valid_report(self, report_id: int | str):
        return str(report_id) in self.data["reports"]
    
    def set_report_param(self, report_id: int | str, key: str, value: int | str):
        self.data["reports"][str(report_id)][key] = value
        self.save()

    def is_admin(self, user_id: int | str):
        return str(user_id) in self.data["admins"]

    def get_all_admins(self):
        admins_list = []
        for admin in self.data["admins"]:
            if self.data["admins"][admin]["dostup"]["reports"]:
                admins_list.append(self.data["admins"][admin])
        return admins_list

    def get_agents(self):
        agents_list = []
        for admin in self.data["admins"]:
            agents_list.append(self.data["admins"][admin])
        return agents_list

    def get_user_reports(self, user_id: int | str):
        reports = []
        for report in self.data["reports"]:
            if self.data["reports"][report]["from_id"] == str(user_id):
                reports.append(self.data["reports"][report])
        return reports

    def delete_report(self, report_id: int | str):
        if str(report_id) in self.data["reports"]:
            del self.data["reports"][str(report_id)]

    def owner(self, user_id, state):
        self.data["admins"][str(user_id)]["role"] = "owner" if state == 1 else "agent"
        self.save()


class builder:
    def reply(buttons: list | dict, adjust: int = 2):
        keyboard = Keyboard(inline=False, one_time=False)
        
        buttonInt = 0
        buttonColors = {
            "secondary": KeyboardButtonColor.SECONDARY,
            "negative": KeyboardButtonColor.NEGATIVE,
            "positive": KeyboardButtonColor.POSITIVE,
            "primary": KeyboardButtonColor.PRIMARY
        }
        if type(buttons) == list:
            for button in buttons:
                buttonInt += 1
                if button["type"] == "text":
                    keyboard.add(Text(button["name"], button["callback"]), color = buttonColors[button["color"]])
                elif button["type"] == "callback":
                    keyboard.add(Callback(button["name"], button["callback"]), color = buttonColors[button["color"]])

                if buttonInt % adjust == 0 and len(buttons) > buttonInt:
                    keyboard.row()
        elif type(buttons) == dict:
            keyboard.add(Text(buttons["name"], buttons["callback"]), color = buttonColors[buttons["color"]])

        return keyboard.get_json()

    def inline(buttons: list | dict, adjust: int = 2):
        keyboard = Keyboard(inline=True)
        
        buttonInt = 0
        buttonColors = {
            "secondary": KeyboardButtonColor.SECONDARY,
            "negative": KeyboardButtonColor.NEGATIVE,
            "positive": KeyboardButtonColor.POSITIVE
        }
        if type(buttons) == list:
            for button in buttons:
                buttonInt += 1
                if button["type"] == "text":
                    keyboard.add(Text(button["name"], button["callback"]), color = buttonColors[button["color"]])
                elif button["type"] == "callback":
                    keyboard.add(Callback(button["name"], button["callback"]), color = buttonColors[button["color"]])

                if buttonInt % adjust == 0 and len(buttons) > buttonInt:
                    keyboard.row()
        elif type(buttons) == dict:
            keyboard.add(Text(buttons["name"], payload=buttons["callback"]), color = buttonColors[buttons["color"]])

        return keyboard.get_json()

tech_db = tech()

database = DB.load()
DB.save(database)


def parse_args(*args):
    args_list = ()
    for arg in args:
        args_list.append(arg)
    return 

unity = CJSON.read(FILES[1])
unity_save = (lambda: CJSON.write(unity, FILES[1]))

profiles = CJSON.read(FILES[3])
profiles_save = (lambda: CJSON.write(profiles, FILES[3]))

async def send_message(peer_id = None, text = None, keyboard = None, attachment = None):
    try:
        await bot.api.messages.send(
            peer_id=peer_id,
            message=text,
            random_id=random.randint(-1000000, 1000000),
            keyboard = keyboard,
            attachment = attachment
        )
    except Exception as e:
        print(e)

async def edit_message(peer_id, message_id, newtext = None, keyboard = None, attachment = None):
    await bot.api.messages.edit(
        peer_id = peer_id,
        conversation_message_id = message_id,
        message = newtext,
        keyboard = keyboard,
        attachment = attachment
    )

def get_full_name(user):
    return f"@id{user.id} ({user.first_name + ' ' + user.last_name})"

def get_nickname_id(user_id, nickname):
    return f"@id{user_id} ({nickname})"

def is_user_need_priority(chat_id, user_id, priority):
    return False if int(database[str(chat_id)]["roles"].get(str(user_id), 0)) < int(database[str(chat_id)]["command_priority"][priority]) else True

def get_user_role(chat_id, user_id):
    role = database[str(chat_id)]["standart_roles"][str(database[str(chat_id)]["roles"][str(user_id)])] if database[str(chat_id)]["roles"].get(str(user_id), 0) != 0 else "Пользователь"
    return role

def get_role_name(chat_id, role_priority):
    return database[str(chat_id)]["standart_roles"][str(role_priority)]

async def resolveResources(pattern: str) -> int:
    if "[id" in pattern:
        domen = int(pattern.split("|")[0].replace("[id", ""))
        user = await bot.api.users.get(user_ids=domen)
    elif "vk.com/" in pattern:
        domen = pattern.split("/")[-1]
        user = await bot.api.users.get(user_ids=domen)
    elif "https://" in pattern:
        domen = pattern.split("/")[3]
        user = await bot.api.users.get(user_ids=domen)
    else:
        user = await bot.api.users.get(user_ids=pattern)


    return (user[0] if len(user) > 0 else None) if user != None else None

def is_mention(string):
    for arg in ["https:", "vk.com/", "[id"]:
        if string.startswith(arg):
            return True
    return False


def resolveArguments(message, args_count):
    args = message.text.split(" ")
    
    select_index = 0
    del args[0]

    args_list = []
    select_index = 0
    select_other = 0

    if len(args) == 0:
        if message.reply_message:
            args_list.append(str(message.reply_message.from_id))

    for i in range(len(args)):
        if (select_other+1) != args_count or args_count == 1:
            if is_mention(args[select_index]):
                if not ic(0, args_list):
                    args_list.append(args[select_index])
                    select_index += 1
                    continue;
            
            if message.reply_message:
                if not ic(0, args_list):
                    args_list.append(str(message.reply_message.from_id))
            
            args_list.append(args[select_index])
            select_index += 1

            select_other = len(args_list) - 1
        else:
            if ic(select_other, args_list):
                args_list[select_other] += f" {args[i]}" 
            else:
                args_list.append(f"{args[i]}")
                select_other = len(args_list) - 1
    
    while len(args_list) < args_count:
        args_list.append(None)

    if type(args_list[0]) != str:
        return False

    if not message.reply_message:
        if not is_mention(args_list[0]):
            return False


    return tuple(args_list)

async def get_user_info(user_id = None):
    if user_id == None:
        return None
    
    user = await bot.api.users.get(
        user_ids=int(user_id)
    )
    
    return user[0]

@bot.loop_wrapper.interval(seconds=1)
async def ExpiredPunishmentTask():
    for chat_id in database:
        if chat_id == "chats":
            continue
        
        for ban_user_id in list(database[chat_id]["bans"]):
            ban_user_info = database[chat_id]["bans"][ban_user_id]
            now = datetime.now()
            user = get_nickname_id(ban_user_id, "у пользователя")
            if datetime.fromisoformat(ban_user_info['end_time']) < now:
                
                await send_message(
                    peer_id = chat_id,
                    text = f"⏳ Бан {user} закончился.\n\nПользователь автоматически разбанен в этой беседе."
                )
                
                del database[chat_id]["bans"][ban_user_id]
                DB.save(database)

        for mute_user_id in list(database[chat_id]["mutes"]):
            mute_user_info = database[chat_id]["mutes"][mute_user_id]
            now = datetime.now()
            user = get_nickname_id(mute_user_id, "у пользователя")
            if datetime.fromisoformat(mute_user_info['end_time']) < now:
                
                await send_message(
                    peer_id = chat_id,
                    text = f"⏳ Мут {user} закончился.\n\nПользователь автоматически размучен в этой беседе."
                )
                
                del database[chat_id]["mutes"][mute_user_id]
                DB.save(database)
        time.sleep(1)

async def is_bot_admin(peer_id: int): 
    try:
        await bot.api.messages.get_conversation_members(peer_id=int(peer_id), fields="is_admin, admin_level")
        return True
    except Exception as e:
        if re.findall("You don't have access to this chat", str(e)):
            return False

ic = (lambda x, massive: x <= (len(massive)-1))


@bot.on.raw_event(GroupEventType.MESSAGE_EVENT, dataclass=GroupTypes.MessageEvent)
async def callback_event(event: GroupTypes.MessageEvent):
    if "agent_edit" in event.object.payload:
        if event.object.payload["agent_edit"].startswith("setdostup_"):
            event_info = event.object.payload["agent_edit"].split("_")
            del event_info[0]

            admin = tech_db.get_admin_info(str(event.object.user_id))
            user = await get_user_info(event.object.user_id)
            if admin == None:
                return await event.ctx_api.messages.send_message_event_answer(
                    event_id=event.object.event_id,
                    user_id=event.object.user_id,
                    peer_id=event.object.peer_id,
                    event_data=ShowSnackbarEvent(text=f"Вы не можете изменять доступ!").json(),
                )
            else:
                if not admin["dostup"]["agent"]:
                    return await event.ctx_api.messages.send_message_event_answer(
                        event_id=event.object.event_id,
                        user_id=event.object.user_id,
                        peer_id=event.object.peer_id,
                        event_data=ShowSnackbarEvent(text=f"Вы не можете изменять доступ!").json(),
                    )

                if admin["m-c-id"] == -1:
                    return await event.ctx_api.messages.send_message_event_answer(
                        event_id=event.object.event_id,
                        user_id=event.object.user_id,
                        peer_id=event.object.peer_id,
                        event_data=ShowSnackbarEvent(text=f"Вы не можете сейчас изменить доступ.").json(),
                    )

                if event_info[1] == "agent":
                    if admin["role"] != "owner":
                        return

            
            tech_db.set_dostup(
                event_info[0],
                event_info[1],
                int(event_info[2])
            )
            user_to_dostup = tech_db.get_admin_info(event_info[0])
            if user_to_dostup != None:
                keyboard_list = []
                user_info = await get_user_info(event_info[0])
                
                for util in user_to_dostup["dostup"]:
                    is_dostup = user_to_dostup["dostup"][util]
                    new_dostup = 0 if user_to_dostup["dostup"][util] == 1 else 1
                    keyboard_list.append(
                        {
                            "name": f"/{util}",
                            "callback": {"agent_edit": f"setdostup_{str(user_info.id)}_{util}_{new_dostup}"},
                            "color": f"{'negative' if is_dostup == 0 else 'positive'}",
                            "type": "callback"
                        }
                    )
                keyboard_list.append(
                    {
                        "name": f"Закрыть редактирование",
                        "callback": {"agent_edit": f"closekeyboard"},
                        "color": f"secondary",
                        "type": "callback"
                    }
                )
                dostup_list = [f"/{cmd} - {'❌' if is_dostup == 0 else '✅'}\n" for cmd, is_dostup in user_to_dostup["dostup"].items()]
                await edit_message(
                    event.object.peer_id,
                    admin["m-c-id"],
                    newtext = ("").join([f">> {get_full_name(user_info)}\n\n",
                    f"🔰 Роль: {user_to_dostup['role']}\n",
                    f"☑️ Доступ:\n\n" + ('').join(dostup_list)]),
                    keyboard = builder.reply(
                        keyboard_list,
                        adjust = 1
                    )
                )
                return await event.ctx_api.messages.send_message_event_answer(
                    event_id=event.object.event_id,
                    user_id=event.object.user_id,
                    peer_id=event.object.peer_id,
                    event_data=ShowSnackbarEvent(text=f"Вы {'забрали' if int(event_info[2]) == 0 else 'выдали'} команду: /{event_info[1]}").json(),
                )
            else:
                return await send_message(
                    peer_id = event.object.peer_id,
                    text = f"ОШИБКА!",
                    keyboard= EMPTY_KEYBOARD
                )
        elif event.object.payload["agent_edit"] == "closekeyboard":
            admin = tech_db.get_admin_info(str(event.object.user_id))
            if admin == None:
                return
            else:
                if not admin["dostup"]["agent"]:
                    return
            tech_db.clear_mcid()
            await send_message(
                peer_id = event.object.peer_id,
                text = f"✅ Редактирование агента закончено!",
                keyboard= EMPTY_KEYBOARD
            )

            return await event.ctx_api.messages.send_message_event_answer(
                event_id=event.object.event_id,
                user_id=event.object.user_id,
                peer_id=event.object.peer_id,
                event_data=ShowSnackbarEvent(text=f"Редактирование завершено").json(),
            )

    if "tech" in event.object.payload:
        if event.object.payload["tech"].startswith("user_"):
            event_call = event.object.payload["tech"].split("_")
            event_type = event_call[1]
            if event_type == "allreports":
                user_reports = tech_db.get_user_reports(event.object.user_id)

                reportStr = ""
                for r in user_reports:
                    reportStr += f"{r['id']}) Рассматривают? - {'Да' if r['admin_id'] != -1 else 'Нет'}\nДата: {r['datetime']}"

                buttonsList = []
                for r in user_reports:
                    buttonsList.append({
                        "type": "callback",
                        "name": f"ID - {r['id']}",
                        "callback": {"tech": f"user_info_{r['id']}"},
                        "color": "secondary"
                    })
                return await edit_message(
                    event.object.user_id,
                    event.object.conversation_message_id,
                    f"🔰 Список ваших обращений:\n\n{reportStr}\n\nЧтобы узнать информацию о репорте, выберите его ниже.",
                    keyboard=builder.inline(buttonsList, adjust=1)
                )
            elif event_type == "info":
                report_id = event_call[2]
                if tech_db.is_valid_report(report_id):
                    reportList = tech_db.get_report(report_id)
                    dialog = reportList["dialog"]
                    reportStr = f"🔰 Информация о репорте №{report_id}\n\n"
                    reportStr += f"Рассматривают?: {f'Да' if reportList['admin_id'] != -1 else 'Нет'}\n"
                    reportStr += f"Дата создания: {reportList['datetime'][:19]}\n"
                    reportStr += f"Изначальный текст: {dialog[0]['content']}"
                    return await edit_message(
                        peer_id = event.object.user_id,
                        message_id = event.object.conversation_message_id,
                        newtext = reportStr,
                        keyboard=builder.inline([
                            {
                                "name": "Информация",
                                "callback": {"tech": f"user_info_{report_id}"},
                                "color": "secondary",
                                "type": "callback"
                            },
                            {
                                "name": "Диалог",
                                "callback": {"tech": f"user_dialog_{report_id}"},
                                "color": "positive",
                                "type": "callback"
                            }
                        ], adjust=1)
                    )
                else:
                    return await event.ctx_api.messages.send_message_event_answer(
                        event_id=event.object.event_id,
                        user_id=event.object.user_id,
                        peer_id=event.object.peer_id,
                        event_data=ShowSnackbarEvent(text="Данного обращения уже не существует!").json(),
                    )
            elif event_type == "dialog":
                report_id = event_call[2]
                if tech_db.is_valid_report(report_id):
                    reportList = tech_db.get_report(report_id)
                    dialogStr = ""
                    dialog = reportList["dialog"]
                    roles = {
                        "User": "Пользователь",
                        "Agent": "Агент"
                    }
                    for d in dialog:
                        dialogStr += f"{d['datetime']} {roles[d['role']]}: {d['content']}\n"
                    
                    return await edit_message(
                        peer_id = event.object.user_id,
                        message_id = event.object.conversation_message_id,
                        newtext = dialogStr,
                        keyboard=builder.inline([
                            {
                                "type": "callback",
                                "name": "Ответить",
                                "callback": {"tech": f"user_indialog_{report_id}"},
                                "color": "positive"
                            },
                            {
                                "type": "callback",
                                "name": "Информация",
                                "callback": {"tech": f"user_info_{report_id}"},
                                "color": "positive"
                            }
                        ])
                    )
                else:
                    return await event.ctx_api.messages.send_message_event_answer(
                        event_id=event.object.event_id,
                        user_id=event.object.user_id,
                        peer_id=event.object.peer_id,
                        event_data=ShowSnackbarEvent(text="Данного обращения уже не существует!").json(),
                    )
            elif event_type == "indialog":
                report_id = event_call[2]
                if tech_db.is_valid_report(report_id):
                    statePeer = await bot.state_dispenser.get(event.object.user_id)
                    if statePeer != None:
                        if statePeer.state != TechReport.DIALOG:
                            return
                    ctx.set(f"{event.object.user_id}_reportid", report_id)
                    ctx.set(f"{event.object.user_id}_reportrole", "User")
                    await bot.state_dispenser.set(event.object.user_id, state=TechReport.DIALOG)
                    return await send_message(event.object.user_id, "Напишите новый ответ\n\nВсё, что вы отправите - будет отправлено технической поддержке.",
                        keyboard=builder.inline({
                            "type": "callback",
                            "name": "Отмена",
                            "callback": {"tech": f"user_exitdialog_999"},
                            "color": "positive"
                        })
                    )
                else:
                    return await event.ctx_api.messages.send_message_event_answer(
                        event_id=event.object.event_id,
                        user_id=event.object.user_id,
                        peer_id=event.object.peer_id,
                        event_data=ShowSnackbarEvent(text="Данного обращения уже не существует!").json(),
                    )
        if event.object.payload["tech"].startswith("report_"):
            event_call = event.object.payload["tech"].split("_")

            event_type = event_call[1]
            report_id = event_call[2]

            if not tech_db.is_admin(event.object.user_id):
                return
            if event_type == "getallreports":
                reports = tech_db.get_all_reports()

                reportStr = ""
                buttonsList = []
                for report_id in reports:
                    report = reports[report_id]
                    if report["admin_id"] != -1:
                        viewAdmin = await get_user_info(report["admin_id"])
                        reportStr = f"{reportStr}ID - {report['id']} | Рассматривает: {get_full_name(viewAdmin)}\n"
                    else:
                        reportStr = f"{reportStr}ID - {report['id']} | Рассматривает: Никто\n"
                    buttonsList.append({
                        "type": "callback",
                        "name": f"ID - {report['id']}",
                        "callback": {"tech": f"report_info_{report['id']}"},
                        "color": "secondary"
                    })


                return await edit_message(
                    event.object.user_id,
                    event.object.conversation_message_id,
                    f"🔰 Доступные репорты:\n\n{reportStr}\n\nЧтобы узнать информацию о репорте, нажмите на кнопку ниже.",
                    keyboard=builder.inline(buttonsList, adjust=1)
                )
            if tech_db.is_valid_report(report_id):
                report = tech_db.get_report(report_id)
                if event_type == "review":
                    if report["admin_id"] == -1:
                        tech_db.set_report_param(report_id, "admin_id", str(event.object.user_id))
                        await send_message(report['from_id'], f"✅ Обращение №{report_id} взяли на рассмотрение!")
                        return await event.ctx_api.messages.send_message_event_answer(
                            event_id=event.object.event_id,
                            user_id=event.object.user_id,
                            peer_id=event.object.peer_id,
                            event_data=ShowSnackbarEvent(text=f"Вы взяли на рассмотрение репорт №{report_id}").json(),
                        )
                    else:
                        return await event.ctx_api.messages.send_message_event_answer(
                            event_id=event.object.event_id,
                            user_id=event.object.user_id,
                            peer_id=event.object.peer_id,
                            event_data=ShowSnackbarEvent(text="Данное обращение уже на рассмотрении!").json(),
                        )
                elif event_type == "info":
                    dialog = report['dialog']
                    userData = await get_user_info(report["from_id"])
                    reportStr = f"🔰 Информация о репорте №{report_id}\n\n"
                    reportStr += f"Пользователь: {get_full_name(userData)}\n"
                    if report["admin_id"] != -1:
                        viewAdmin = await get_user_info(report["admin_id"])
                        reportStr += f"Рассматривает: {get_full_name(viewAdmin)}\n"
                    else:
                        reportStr += f"Рассматривает: Никто\n"
                    reportStr += f"Дата создания: {report['datetime'][:19]}\n"
                    reportStr += f"Изначальный текст: {dialog[0]['content']}"
                    return await edit_message(
                        peer_id = event.object.user_id,
                        message_id = event.object.conversation_message_id,
                        newtext = reportStr,
                        keyboard=builder.inline([
                            {
                                "name": "Информация",
                                "callback": {"tech": f"report_info_{report_id}"},
                                "color": "secondary",
                                "type": "callback"
                            },
                            {
                                "name": "Взять на рассмотрение",
                                "callback": {"tech": f"report_review_{report_id}"},
                                "color": "secondary",
                                "type": "callback"
                            },
                            {
                                "name": "Диалог",
                                "callback": {"tech": f"report_dialog_{report_id}"},
                                "color": "positive",
                                "type": "callback"
                            },
                            {
                                "name": "Закрыть",
                                "callback": {"tech": f"report_close_{report_id}"},
                                "color": "negative",
                                "type": "callback"
                            },
                            {
                                "name": "Ban/unban tickets",
                                "callback": {"tech": f"report_banunban_{report_id}"},
                                "color": "negative",
                                "type": "callback"
                            }
                        ], adjust=1)
                    )
                elif event_type == "dialog":
                    admin = tech_db.get_admin_info(str(event.object.user_id))
                    if not admin["dostup"]["reports"]:
                        return await event.ctx_api.messages.send_message_event_answer(
                            event_id=event.object.event_id,
                            user_id=event.object.user_id,
                            peer_id=event.object.peer_id,
                            event_data=ShowSnackbarEvent(text="Вам недоступна данная команда.").json(),
                        )
                    dialogStr = ""
                    dialog = report['dialog']
                    roles = {
                        "Agent": "Агент",
                        "User": "Пользователь"
                    }
                    for d in dialog:
                        dialogStr += f"{d['datetime']} {roles[d['role']]}: {d['content']}\n"
                    
                    return await edit_message(
                        peer_id = event.object.user_id,
                        message_id = event.object.conversation_message_id,
                        newtext = dialogStr,
                        keyboard=builder.inline([
                            {
                                "type": "callback",
                                "name": "Ответить",
                                "callback": {"tech": f"report_indialog_{report_id}"},
                                "color": "positive"
                            },
                            {
                                "type": "callback",
                                "name": "Информация",
                                "callback": {"tech": f"report_info_{report_id}"},
                                "color": "positive"
                            },
                            {
                                "type": "callback",
                                "name": "Взять на рассмотрение",
                                "callback": {"tech": f"report_review_{report_id}"},
                                "color": "secondary"
                            }
                        ])
                    )
                elif event_type == "indialog":
                    if await bot.state_dispenser.get(event.object.user_id) != TechReport.DIALOG:

                        if report['admin_id'] != -1:
                            if int(report['admin_id']) != int(event.object.user_id):
                                adminData = await get_user_info(report['admin_id'])
                                return await send_message(event.object.user_id, f"Данный репорт уже рассматривает администратор: {get_full_name(adminData)}")

                        ctx.set(f"{event.object.user_id}_reportid", report_id)
                        ctx.set(f"{event.object.user_id}_reportrole", "Agent")
                        await bot.state_dispenser.set(event.object.user_id, state=TechReport.DIALOG)
                        return await send_message(event.object.user_id, "Напишите новый ответ.\n\nВсё, что вы отправите - будет отправлено пользователю.",
                            keyboard=builder.inline({
                                "type": "callback",
                                "name": "Отмена",
                                "callback": {"tech": f"report_exitdialog_{report_id}"},
                                "color": "negative"
                            })
                        )
                elif event_type == "close":
                    if report['admin_id'] != -1:
                        if int(report['admin_id']) != int(event.object.user_id):
                            adminData = await get_user_info(report['admin_id'])
                            return await send_message(event.object.user_id, f"Данный репорт уже рассматривает администратор: {get_full_name(adminData)}")
                    await send_message(report["from_id"], f"Обращение №{report_id} было закрыто администратором.")
                    tech_db.delete_report(report_id)
                    return await edit_message(
                        event.object.user_id,
                        event.object.conversation_message_id,
                        "Обращение закрыто."
                    )
                elif event_type == "banunban":
                    adminData = tech_db.get_admin_info(str(event.object.user_id))
                    if not adminData["dostup"]["banreport"]:
                        return await event.ctx_api.messages.send_message_event_answer(
                            event_id=event.object.event_id,
                            user_id=event.object.user_id,
                            peer_id=event.object.peer_id,
                            event_data=ShowSnackbarEvent(text="У вас нет доступа к этой команде.").json(),
                        )
                    
                    if not tech_db.is_banreport(report["from_id"]):
                        reportUserVK = await get_user_info(report["from_id"])
                        tech_db.banreport(1, report["from_id"])
                        await send_message(report["from_id"], "⚠️ Вам заблокировали доступ к обращениям в техническую поддержку.")
                        return await send_message(event.object.user_id, f"⚠️ Вы заблокировали доступ к тикетам {get_full_name(reportUserVK)}")
                    else:
                        reportUserVK = await get_user_info(report["from_id"])
                        tech_db.banreport(0, report["from_id"])
                        await send_message(report["from_id"], "⚠️ Вам разблокировали доступ к обращениям в техническую поддержку.")
                        return await send_message(event.object.user_id, f"⚠️ Вы разблокировали доступ к тикетам {get_full_name(reportUserVK)}")
            else:
                if event_type == "exitdialog":
                    await bot.state_dispenser.delete(event.object.user_id)
                    return await send_message(event.object.user_id, "Вы вышли из диалога с пользователем.")

                return await edit_message(
                    peer_id = event.object.user_id,
                    message_id = event.object.conversation_message_id,
                    newtext = "Данного обращения уже не существует!"
                )


# Обработчик для добавления бота в чат и проверки бана при добавлении пользователя
@bot.on.raw_event(GroupEventType.MESSAGE_NEW)
async def handle_new_message(event: dict):
    message = event.get("object", {}).get("message", {})
    action = message.get("action", {})
    if action:
        if action.get("type") in ['chat_invite_user', 'chat_invite_user_by_link']:
            user_id = action.get("member_id")
            chat_id = message["peer_id"]
            
            if user_id == -event["group_id"]:
                database['chats'][str(chat_id)] = {'is_active': False}
                DB.save(database)
                await bot.api.messages.send(peer_id=chat_id, message="Для начала работы выдай мне права администратора и пропиши /start.", random_id=0)
            else:
                if str(user_id) in database[str(chat_id)]['bans']:
                    end_time = datetime.fromisoformat(database[str(chat_id)]['bans'][str(user_id)]['end_time'])
                    if end_time > datetime.now():
                        reason = database[str(chat_id)]['bans'][str(user_id)].get('reason', 'не указана')
                        user = await get_user_info(user_id)
                        await bot.api.messages.remove_chat_user(chat_id=chat_id-2000000000, user_id=user_id)
                        await bot.api.messages.send(
                            peer_id=chat_id, 
                            message=f"❗️ {get_full_name(user)} забанен до {end_time.strftime('%Y-%m-%d %H:%M:%S')} по причине: {reason}.", 
                            random_id=0
                        )
                else:
                    if len(database[str(chat_id)]["welcome_text"]) > 0:
                        welcome = database[str(chat_id)]["welcome_text"]
                        user = await get_user_info(user_id)
                        if re.findall("[name]", welcome):
                            welcome = welcome.replace("[name]", get_full_name(user))
                        
                        if re.findall("[id]", welcome):
                            welcome = welcome.replace("[id]", str(user.id))

                        await bot.api.messages.send(peer_id=chat_id, message=welcome, random_id=0)
        elif action.get("type") in ['chat_pin_message', 'chat_unpin_message']:
            user_id = action.get("member_id")
            chat_id = message["peer_id"]

            executor = {
                "role": int(database[str(chat_id)]['roles'].get(str(user_id), 0)),
                "name": database[str(chat_id)]['nicknames'].get(str(user_id), 0)
            }

            if not is_user_need_priority(chat_id, user_id, "pin" if action.get("type") == "chat_pin_message" else "unpin"):
                if database[str(chat_id)]["pinned_message"] != -1:
                    try:
                        await bot.api.messages.pin(peer_id=chat_id, conversation_message_id=database[str(chat_id)]["pinned_message"])
                    except Exception:
                        database[str(chat_id)]["pinned_message"] = -1
                        DB.save(database)

async def send_ticket_admins(report, reportId):
    await send_message(2000000004, report)
    
    adminsList = tech_db.get_all_admins()
    for admin in adminsList:
        try:
            await send_message(admin["id"], report, keyboard=builder.inline([
                {
                    "name": "Информация",
                    "callback": {"tech": f"report_info_{reportId}"},
                    "color": "secondary",
                    "type": "callback"
                },
                {
                    "name": "Взять на рассмотрение",
                    "callback": {"tech": f"report_review_{reportId}"},
                    "color": "secondary",
                    "type": "callback"
                },
                {
                    "name": "Диалог",
                    "callback": {"tech": f"report_dialog_{reportId}"},
                    "color": "positive",
                    "type": "callback"
                },
                {
                    "name": "Закрыть",
                    "callback": {"tech": f"report_close_{reportId}"},
                    "color": "negative",
                    "type": "callback"
                },
                {
                    "name": "Ban/unban tickets",
                    "callback": {"tech": f"report_banunban_{reportId}"},
                    "color": "negative",
                    "type": "callback"
                }
            ], adjust=1))
        except Exception as e:
            await send_message(321947050, f"Не получилось отправить обращение пользователю: @id{admin['id']}\n\nОшибка: {e}")

@bot.on.private_message(text="/close <report_id>")
async def close_report(message: Message, report_id = None):
    if tech_db.is_admin(message.from_id):
        if tech_db.is_valid_report(report_id):
            report = tech_db.get_report(report_id)

            await send_message(report["from_id"], f"Обращение №{report_id} было закрыто администратором.")
            tech_db.delete_report(report_id)
            return await message.answer(f"Вы закрыли обращение №{report_id}")

@bot.on.private_message(text=["/getreport <report_id>", "/getreport"])
async def get_report(message: Message, report_id = None):
    if tech_db.is_admin(message.from_id):
        if report_id != None:
            if tech_db.is_valid_report(report_id):
                report = tech_db.get_report(report_id)
                dialog = report['dialog']
                userData = await get_user_info(report["from_id"])
                reportStr = f"🔰 Информация о репорте №{report_id}\n\n"
                reportStr += f"Пользователь: @id{userData.id} ({userData.first_name + ' ' + userData.last_name})\n"
                
                if report["admin_id"] != -1:
                    viewAdmin = await get_user_info(report["admin_id"])
                    reportStr += f"Рассматривает: {get_full_name(viewAdmin)}\n"
                else:
                    reportStr += f"Рассматривает: Никто\n"
                reportStr += f"Дата создания: {report['datetime'][:19]}\n"
                reportStr += f"Изначальный текст: {dialog[0]['content']}"
                return await message.answer(
                    reportStr,
                    keyboard=builder.inline([
                        {
                            "name": "Информация",
                            "callback": {"tech": f"report_info_{report_id}"},
                            "color": "secondary",
                            "type": "callback"
                        },
                        {
                            "name": "Взять на рассмотрение",
                            "callback": {"tech": f"report_review_{report_id}"},
                            "color": "secondary",
                            "type": "callback"
                        },
                        {
                            "name": "Диалог",
                            "callback": {"tech": f"report_dialog_{report_id}"},
                            "color": "positive",
                            "type": "callback"
                        },
                        {
                            "name": "Закрыть",
                            "callback": {"tech": f"report_close_{report_id}"},
                            "color": "negative",
                            "type": "callback"
                        },
                        {
                            "name": "Ban/unban tickets",
                            "callback": {"tech": f"report_banunban_{report_id}"},
                            "color": "negative",
                            "type": "callback"
                        }
                    ], adjust=1)
                )
            else:
                return await message.answer("Такого репорта не существует!")
        else:
            return await message.answer("/getreport [№ репорта]")

@bot.on.chat_message(text="/report")
async def reports_handler_chat(message: Message):
    return await message.answer("Создать обращение можно в ЛС бота. Введите: /start, либо Начать", reply_to=message.id)
@bot.on.private_message(text="/reports")
async def reports_handler(message: Message):
    if tech_db.is_admin(message.from_id):
        reports = tech_db.get_all_reports()

        reportStr = ""
        for report_id in reports:
            report = reports[report_id]
            if report["admin_id"] != -1:
                viewAdmin = await get_user_info(report["admin_id"])
                reportStr = f"{reportStr}ID - {report['id']} | Рассматривает: {get_full_name(viewAdmin)}\n"
            else:
                reportStr = f"{reportStr}ID - {report['id']} | Рассматривает: Никто\n"
        
        await message.answer(f"🔰 Доступные репорты:\n\n{reportStr}\n\nЧтобы узнать информацию о репорте: /getreport ID")

@bot.on.private_message(text=["Тех.Поддержка"])
async def tech_handler(message: Message):
    user_reports = tech_db.get_user_reports(message.from_id)
    buttonsList = [
        {
            "name": "Посмотреть список обращений",
            "callback": {"tech": "user_allreports"},
            "color": "positive",
            "type": "callback"
        }
    ]

    if tech_db.is_admin(message.from_id):
        buttonsList.append({
            "type": "callback",
            "name": "Список репортов",
            "callback": {"tech": "report_getallreports_9998"},
            "color": "secondary"
        })

    await message.answer(
        "🚨 Техническая поддержка Gtech Manager 🚨"
        f"\nУ вас {len(user_reports)} обращений.\nЧтобы создать обращение, введите: /report [Вопрос]"
        f"\n\nВыберите действие ниже:",
        keyboard=builder.inline(buttonsList, adjust=1)
    )

@bot.on.private_message(text=["/report <question>", "/report"])
async def report_handler(message: Message, question: str = None):
    chat_id = str(message.peer_id)

    if tech_db.is_sysban(message.from_id):
        return

    if tech_db.is_banreport(message.from_id):
        return await message.answer("⚠️ У вас бан репорта. Обратитесь к агентам поддержки напрямую!")

    if tech_db.is_kd_report(message.from_id):
        return await message.answer("⚠️ Можно создать только 2 репорта. Ожидайте, пока служба поддержки ответит на предыдущие!")
    
    if question == None:
        return await message.answer("⚠️ Используй: /report [Вопрос]", reply_to=message.id)

    now_date = str(datetime.now())[:19]
    dialog = [
        {
            "role": "User",
            "content": question,
            "datetime": now_date
        }
    ]

    reportId = tech_db.new_report(message.from_id, dialog, now_date)

    user = await get_user_info(message.from_id)
    string = f"🚨 Новое обращение (ID: {reportId})🚨\n\n"
    string += f"👤 Пользователь: {get_full_name(user)}\n"
    string += f"🔰 Текст обращения: {dialog[0]['content']}\n"
    string += f"🕰 Время: {str(datetime.strptime(now_date, '%Y-%m-%d %H:%M:%S').time())}\n"
    string += f"⬇️ Чтобы начать работу над обращением, выбери действие ниже."

    
    await send_ticket_admins(string, reportId)
    return await message.answer("✅ Обращение успешно создано. Ожидайте ответа.")
  

@bot.on.private_message(state=TechReport.DIALOG)
async def techdialog(message: Message):
    if message.payload and message.text == "Отмена":
        await bot.state_dispenser.delete(message.from_id)
        return await message.answer("Вы отменили отправку сообщения.")
    
    report_id = ctx.get(f"{message.from_id}_reportid")
    report_role = ctx.get(f"{message.from_id}_reportrole")

    if tech_db.is_valid_report(report_id):
        report = tech_db.get_report(report_id)
        dialog = report["dialog"]

        now_date = str(datetime.now())[:19]
        dialog.append({
            "role": report_role,
            "content": message.text,
            "datetime": now_date
        })

        tech_db.set_report_param(report_id, "dialog", dialog)

        if report_role == "Agent":
            answerStr = f"💭 Новый ответ в обращении №{report['id']}\n"
            answerStr += f"\n\n{message.text}\n"
            answerStr += f"\n\nЧтобы ответить, перейдите в список обращений и выберите нужное."
            await send_message(report["from_id"], answerStr)
        
        if report_role == "User":
            if report["admin_id"] != -1:
                userReport = await get_user_info(report["from_id"])
                answerStr = f"💭 Новый ответ от пользователя в обращении №{report['id']}\n"
                answerStr += f"Пользователь: {get_full_name(userReport)}"
                answerStr += f"\n\n{message.text}\n"
                answerStr += f"\n\nЧтобы ответить, перейдите в список обращений и выберите нужное."
                await send_message(report["admin_id"], answerStr)
            
        await bot.state_dispenser.delete(message.from_id)
        return await message.answer("Ваш ответ отправлен!")

@bot.on.private_message(text=["/start", "Начать"])
async def start_message(message: Message):
    return await message.answer("Приветствуем вас в боте Gtech Manager!", keyboard=builder.reply([
        {
            "name": "Тех.Поддержка",
            "callback": {"user": "start_message"},
            "color": "primary",
            "type": "text"
        }
    ], adjust = 1))

# кмд /start - для активации чата, и выдачи роли создателя
@bot.on.message(IsCommand="start")
async def start_handler(message: Message):
    chat_id = message.peer_id
    print("CHAT_ID = ", chat_id)
    if tech_db.is_sysban(message.from_id):
        return

    if str(chat_id) in database["chats"]:
        if database["chats"][str(chat_id)]["is_active"]:
            return await message.answer("Данная беседа уже активирована!")

    try:
        admins = await bot.api.messages.get_conversation_members(peer_id=message.peer_id, fields="is_admin, admin_level")
    except Exception as e:
        if re.findall("You don't have access to this chat", str(e)):
            return await message.answer("Для начала работы выдайте мне права администратора!")

    # Проверяем, является ли пользователь администратором бота
    if not tech_db.is_admin(message.from_id):
        return await message.answer("Только администраторы бота могут активировать беседу!")

    # Если пользователь администратор бота, активируем беседу
    if str(chat_id) not in database:
        database[str(chat_id)] = {}
        database[str(chat_id)]['roles'] = {}
        database[str(chat_id)]['nicknames'] = {}
        database[str(chat_id)]['bans'] = {}
        database[str(chat_id)]['mutes'] = {}
        database[str(chat_id)]['warns'] = {}
        database[str(chat_id)]['standart_roles'] = {
            "100": "Основатель",
            "90": "Разработчики",
            "80": "Руководитель",
            "70": "Спец.Администратор",
            "60": "Главный Администратор",
            "50": "Заместитель Главного Администратора",
            "20": "Администратор",
            "0": "Пользователь"
        }
        database[str(chat_id)]['command_priority'] = {
            "ban": 40,
            "mute": 40,
            "snick": 20,
            "pin": 70,
            "kick": 30,
            "gnick": 20,
            "rnick": 20,
            "unpin": 70,
            "nlist": 20,
            "roles": 20,
            "role": 40,
            "rr": 40,
            "admins": 20,
            "unban": 40,
            "addrole": 80,
            "del": 80,
            "unmute": 40,
            "welcome": 80,
            "mutelist": 20,
            "gmute": 20,
            "gban": 20,
            "editcmd": 100,
            "unity": 100,
            "profile": 20,
            "vig": 50,
            "unvig": 50,
            "invite": 50
        }
        database[str(chat_id)]["welcome_text"] = ""
        database[str(chat_id)]["pinned_message"] = -1
        database[str(chat_id)]["unity-id"] = -1
        DB.save(database)

    if str(chat_id) not in database["chats"]:
        database["chats"][str(chat_id)] = {}
        database["chats"][str(chat_id)]["is_active"] = True
        database["chats"][str(chat_id)]["owner"] = str(message.from_id)

    # Выдаем пользователю роль "Основатель" (100)
    database[str(chat_id)]['roles'][str(message.from_id)] = 100
    DB.save(database)
    
    database['chats'][str(chat_id)]['is_active'] = True  # Активация чата
    DB.save(database)
    
    await message.answer("✅ Бот готов к работе! Вам автоматически выдана роль \"Владелец\"")



# Команда /kick для исключения пользователя из чата и удаления его ника
@bot.on.message(IsCommand="kick")
async def kick_handler(message: Message, mention: str = None):
    if tech_db.is_sysban(message.from_id):
        return
    chat_id = message.peer_id
    if not database['chats'].get(str(chat_id), {}).get('is_active', False):
        return await message.answer("❌ Беседа не активирована. Введите команду /start для активации.")
    
    if not is_user_need_priority(chat_id, message.from_id, "kick"):
        return

    if not await is_bot_admin(chat_id):
        database["chats"][str(chat_id)]["is_active"] = False
        DB.save(database)
        return await message.answer("❌ Я не являюсь администратором в данной беседе.\n\nБеседа деактивирована. Для активации беседы используйте: /start")
    

    args = resolveArguments(message, 1)
    if args == False:
        return await message.answer("Используйте: /kick @username")
    
    mention = args[0]
    
    user = await resolveResources(mention)
    if user != None:
        user_id = user.id
        # Проверка роли пользователя, который выполняет команду
        executor_role = int(database[str(chat_id)]['roles'].get(str(message.from_id), 0))
        target_role = int(database[str(chat_id)]['roles'].get(str(user_id), 0))

        if executor_role < target_role:
            return await message.answer(f"⚠️ Вы не можете применить данную команду к пользователю, чья роль выше вашей.")

        try:
            await bot.api.messages.remove_chat_user(chat_id=chat_id-2000000000, user_id=user_id)
            # Удаление ника пользователя
            if str(user_id) in database[str(chat_id)]['nicknames']:
                del database[str(chat_id)]['nicknames'][str(user_id)]
                DB.save(database)

            if str(user_id) in database[str(chat_id)]['roles']:
                del database[str(chat_id)]['roles'][str(user_id)]
                DB.save(database)
            
            await message.answer(f"❌ Пользователь {get_full_name(user)} был исключен из чата.\n\nНик и роль пользователя удалены.")
        except Exception as e:
            await message.answer(f"⚠️ Ошибка при исключении пользователя: {e}\n\nСообщите о ней владельцу бота.")
    else:
        await message.answer("❌ Данного пользователя не существует!")

# Команда /pin для закрепления сообщения
@bot.on.message(text=["/pin <pin_text>", "/pin"])
@bot.on.message(text=["!pin <pin_text>", "!pin"])
async def pin_handler(message: Message, pin_text: str = None):
    if tech_db.is_sysban(message.from_id):
        return
    chat_id = message.peer_id
    if not database['chats'].get(str(chat_id), {}).get('is_active', False):
        return await message.answer("❌ Беседа не активирована. Введите команду /start для активации.")

    if not is_user_need_priority(chat_id, message.from_id, "pin"):
        return

    if not await is_bot_admin(chat_id):
        database["chats"][str(chat_id)]["is_active"] = False
        DB.save(database)
        return await message.answer("❌ Я не являюсь администратором в данной беседе.\n\nБеседа деактивирована. Для активации беседы используйте: /start")



    if pin_text == None:
        if not message.reply_message:
            return await message.answer(
                "⚠️ Чтобы закрепить сообщение, ответьте на него.\n"
                "Либо: /pin [Текст]"
            )

    if message.reply_message:
        message_to_pin = message.reply_message.conversation_message_id
    else:
        msg = await bot.api.messages.send(
            peer_ids = chat_id,
            message = pin_text,
            random_id=random.randint(-100000, 100000)
        )
        message_to_pin = msg[0].conversation_message_id

    # Запрос на закрепление сообщения
    try:
        await bot.api.messages.pin(peer_id=chat_id, conversation_message_id=message_to_pin)
        await message.answer("✅ Сообщение успешно закреплено.")

        database[str(chat_id)]["pinned_message"] = message_to_pin
        DB.save(database)
    except Exception as e:
        await message.answer(f"⚠️ Ошибка при закреплении сообщения: {e}\n\nСообщите о ней владельцу бота.")

# Команда /unpin для открепления последнего закрепленного сообщения или по ответу на сообщение
@bot.on.message(IsCommand="unpin")
async def unpin_handler(message: Message):
    if tech_db.is_sysban(message.from_id):
        return
    chat_id = message.peer_id
    if not database['chats'].get(str(chat_id), {}).get('is_active', False):
        return await message.answer("❌ Беседа не активирована. Введите команду /start для активации.")

    if not is_user_need_priority(chat_id, message.from_id, "unpin"):
        return

    if not await is_bot_admin(chat_id):
        database["chats"][str(chat_id)]["is_active"] = False
        DB.save(database)
        return await message.answer("❌ Я не являюсь администратором в данной беседе.\n\nБеседа деактивирована. Для активации беседы используйте: /start")
    


    # Проверяем, было ли ответное сообщение на команду /unpin
    if message.reply_message:
        message_to_unpin = message.reply_message.conversation_message_id
    else:
        if database[str(chat_id)]["pinned_message"] != -1:
            message_to_unpin = database[str(chat_id)]["pinned_message"]
        else:
            try:
                conversation = await bot.api.messages.get_conversations_by_id(peer_ids=chat_id)
                if conversation and 'items' in conversation and len(conversation['items']) > 0:
                    pinned_message = conversation['items'][0].get('chat_settings', {}).get('pinned_message')
                    if pinned_message:
                        message_to_unpin = pinned_message.get('conversation_message_id')
                    else:
                        await message.answer("❌ В этом чате нет закрепленных сообщений.")
                        return
                else:
                    await message.answer("⚠️ Не удалось получить информацию о беседе.")
                    return
            except Exception as e:
                return await message.answer(f"⚠️ Ошибка при получении закрепленного сообщения: {e}\n\nСообщите о ней владельцу бота.")

    # Запрос на открепление сообщения
    try:
        await bot.api.messages.unpin(peer_id=chat_id, conversation_message_id=message_to_unpin)
        await message.answer("✅ Сообщение успешно откреплено.")
        database[str(chat_id)]["pinned_message"] = -1
        DB.save(database)
    except Exception as e:
        return await message.answer(f"⚠️ Ошибка при откреплении сообщения: {e}\n\nСообщите о ней владельцу бота.")

# Команда /snick для установки ника
@bot.on.message(IsCommand="snick")
async def set_nick_handler(message: Message, mention: str = None,  nickname: str = None):
    if tech_db.is_sysban(message.from_id):
        return
    chat_id = message.peer_id
    if not database['chats'].get(str(chat_id), {}).get('is_active', False):
        return await message.answer("❌ Беседа не активирована. Введите команду /start для активации.")

    if not is_user_need_priority(chat_id, message.from_id, "snick"):
        return

    if not await is_bot_admin(chat_id):
        database["chats"][str(chat_id)]["is_active"] = False
        DB.save(database)
        return await message.answer("❌ Я не являюсь администратором в данной беседе.\n\nБеседа деактивирована. Для активации беседы используйте: /start")

    args = resolveArguments(message, 2)
    if args == False or (None in args):
        return await message.answer("Используйте: /snick @username [Никнейм]")
    
    mention, nickname = args



    user = await resolveResources(mention)
    if user != None:
        user_id = user.id

        executor = {
            "role": int(database[str(chat_id)]['roles'].get(str(message.from_id), 0)),
            "name": database[str(chat_id)]['nicknames'].get(str(message.from_id), 0)
        }
        target = {
            "role": int(database[str(chat_id)]['roles'].get(str(user_id), 0)),
            "name": database[str(chat_id)]['nicknames'].get(str(user_id), 0)
        }

        if executor["role"] < target["role"]:
            return await message.answer(f"⚠️ Вы не можете применить данную команду к пользователю, чья роль выше вашей.")

        executor["user"] = await get_user_info(message.from_id)
        target["user"] = await get_user_info(user_id)

        await message.answer(
            "✅ "
            f"{get_full_name(executor['user']) if executor['name'] == 0 else get_nickname_id(message.from_id,executor['name'])}"
            f" изменил ник "
            f"{get_full_name(target['user'])}\n\n"
            f"{target['name'] if target['name'] != 0 else 'Без ника'} >> {nickname}"
        )
        database[str(chat_id)]['nicknames'][str(user_id)] = nickname
        DB.save(database)
    else:
        await message.answer("❌ Данного пользователя не существует!")

# Команда /nlist для просмотра всех установленных ников
@bot.on.message(IsCommand="nlist")
async def list_nicks_handler(message: Message):
    if tech_db.is_sysban(message.from_id):
        return
    chat_id = message.peer_id
    if not database['chats'].get(str(chat_id), {}).get('is_active', False):
        return await message.answer("❌ Беседа не активирована. Введите команду /start для активации.")

    if not is_user_need_priority(chat_id, message.from_id, "nlist"):
        return

    # if not await is_bot_admin(chat_id):
    #     database["chats"][str(chat_id)]["is_active"] = False
    #     DB.save(database)
    #     return await message.answer("❌ Я не являюсь администратором в данной беседе.\n\nБеседа деактивирована. Для активации беседы используйте: /start")
    
    executor_role = int(database[str(chat_id)]['roles'].get(str(message.from_id), 0))

    if len(database[str(chat_id)]['nicknames']) > 0:
        nicks_list = []
        for user_id, nick in database[str(chat_id)]['nicknames'].items():
            user = await resolveResources(str(user_id))
            if user:
                nicks_list.append(f"-- {get_full_name(user)}: {nick}")
        await message.answer("🔰 Установленные ники в данной беседе:\n\n" + ('\n').join(nicks_list))
    else:
        await message.answer("❌ В данной беседе нет установленных никнеймов!")

# Команда /rnick для удаления ника у пользователя
@bot.on.message(IsCommand="rnick")
async def remove_nick_handler(message: Message, mention: str = None):
    if tech_db.is_sysban(message.from_id):
        return
    chat_id = message.peer_id
    if not database['chats'].get(str(chat_id), {}).get('is_active', False):
        return await message.answer("❌ Беседа не активирована. Введите команду /start для активации.")

    # if not await is_bot_admin(chat_id):
    #     database["chats"][str(chat_id)]["is_active"] = False
    #     DB.save(database)
    #     return await message.answer("❌ Я не являюсь администратором в данной беседе.\n\nБеседа деактивирована. Для активации беседы используйте: /start")
    
    if not is_user_need_priority(chat_id, message.from_id, "rnick"):
        return

    args = resolveArguments(message, 1)
    if args == False:
        return await message.answer("⚠️ Используйте: /rnick @username")

    mention = args[0]
    
    user = await resolveResources(mention)
    if user:
        user_id = user.id
        if str(user_id) in database[str(chat_id)]['nicknames']:
            executor = {
                "role": int(database[str(chat_id)]['roles'].get(str(message.from_id), 0)),
                "name": database[str(chat_id)]['nicknames'].get(str(message.from_id), 0)
            }
            target = {
                "role": int(database[str(chat_id)]['roles'].get(str(user_id), 0)),
                "name": database[str(chat_id)]['nicknames'].get(str(user_id), 0)
            }

            if executor["role"] < target["role"]:
                return await message.answer(f"⚠️ Вы не можете применить данную команду к пользователю, чья роль выше вашей.")

            executor["user"] = await get_user_info(message.from_id)
            target["user"] = await get_user_info(user_id)


            del database[str(chat_id)]['nicknames'][str(user_id)]
            DB.save(database)
            await message.answer(
                "❌ "
                f"{get_full_name(executor['user']) if executor['name'] == 0 else get_nickname_id(message.from_id, executor['name'])}"
                f" удалил ник "
                f"{get_full_name(target['user'])}"
            )
        else:
            await message.answer(f"⚠️ У пользователя {get_full_name(user)} не установлен ник!")
    else:
        await message.answer("⚠️ Некорректное упоминание!")



# Команда /gnick для просмотра ника определённого пользователя
@bot.on.message(IsCommand="gnick")
async def get_nick_handler(message: Message, mention: str = None):
    if tech_db.is_sysban(message.from_id):
        return
    chat_id = message.peer_id
    if not database['chats'].get(str(chat_id), {}).get('is_active', False):
        return await message.answer("❌ Беседа не активирована. Введите команду /start для активации.")

    # if not await is_bot_admin(chat_id):
    #     database["chats"][str(chat_id)]["is_active"] = False
    #     DB.save(database)
    #     return await message.answer("❌ Я не являюсь администратором в данной беседе.\n\nБеседа деактивирована. Для активации беседы используйте: /start")

    if not is_user_need_priority(chat_id, message.from_id, "gnick"):
        return

    args = resolveArguments(message, 1)
    if args == False:
        return await message.answer("⚠️ Используйте: /gnick @username")

    mention = args[0]
    
    user = await resolveResources(mention)
    if user:
        user_id = user.id
        if str(user_id) in database[str(chat_id)]['nicknames']:
            await message.answer(f"🔰 Ник пользователя {get_full_name(user)}: {database[str(chat_id)]['nicknames'][str(user_id)]}")
        else:
            await message.answer(f"⚠️ У пользователя {get_full_name(user)} не установлен ник!")
    else:
        await message.answer("⚠️ Некорректное упоминание!")



# Команда /role для выдачи роли пользователю
@bot.on.message(IsCommand="role")
@bot.on.message(IsCommand="setrole")
async def role_command(message: Message, mention: str = None, role_priority: int = None):
    if tech_db.is_sysban(message.from_id):
        return
    chat_id = message.peer_id
    if not database['chats'].get(str(chat_id), {}).get('is_active', False):
        return await message.answer("❌ Беседа не активирована. Введите команду /start для активации.")

    # if not await is_bot_admin(chat_id):
    #     database["chats"][str(chat_id)]["is_active"] = False
    #     DB.save(database)
    #     return await message.answer("❌ Я не являюсь администратором в данной беседе.\n\nБеседа деактивирована. Для активации беседы используйте: /start")

    if not is_user_need_priority(chat_id, message.from_id, "role"):
        return

    args = resolveArguments(message, 2)
    if args == False or (None in args):
        return await message.answer("⚠️ Используйте: /role @username [Приоритет роли]")

    mention, role_priority = args
    

    user = await resolveResources(mention)
    if user == None:
        return await message.answer("⚠️ Некорректное упоминание!")

    user_id = user.id

    if database[str(chat_id)]["standart_roles"].get(str(role_priority), None) == None:
        return await message.answer(
            "❌ Данной роли не существует!\n"
            "Для создания новой роли, используйте: /addrole"
        )

    executor = {
        "role": int(database[str(chat_id)]['roles'].get(str(message.from_id), 0)),
        "name": database[str(chat_id)]['nicknames'].get(str(message.from_id), 0)
    }

    if executor['role'] < int(role_priority):
        return await message.answer("⚠️ Вы не можете выдать роль с приоритетом, выше вашего.")

    target = {
        "role": int(database[str(chat_id)]['roles'].get(str(user_id), 0)),
        "name": database[str(chat_id)]['nicknames'].get(str(user_id), 0)
    }

    if executor["role"] < target["role"]:
        return await message.answer(f"⚠️ Вы не можете применить данную команду к пользователю, чья роль выше вашей.")

    executor["user"] = await get_user_info(message.from_id)
    target["user"] = await get_user_info(user_id)

    await message.answer(
        "✅ "
        f"{get_full_name(executor['user']) if executor['name'] == 0 else get_nickname_id(message.from_id, executor['name'])}"
        f" изменил роль "
        f"{get_nickname_id(user_id, target['name']) if target['name'] != 0 else get_full_name(target['user'])}\n\n"
        f"{get_user_role(chat_id, user_id)} >> {get_role_name(chat_id, role_priority)}"
    )
    if int(role_priority) != 0:
        database[str(chat_id)]["roles"][str(user_id)] = int(role_priority)
    else:
        del database[str(chat_id)]["roles"][str(user_id)]    
    DB.save(database)

# Команда /rr для снятия роли у пользователя
@bot.on.message(IsCommand="rr")
@bot.on.message(IsCommand="removerole")
async def remove_role_command(message: Message, mention: str = None):
    if tech_db.is_sysban(message.from_id):
        return
    chat_id = message.peer_id
    if not database['chats'].get(str(chat_id), {}).get('is_active', False):
        return await message.answer("❌ Беседа не активирована. Введите команду /start для активации.")

    # if not await is_bot_admin(chat_id):
    #     database["chats"][str(chat_id)]["is_active"] = False
    #     DB.save(database)
    #     return await message.answer("❌ Я не являюсь администратором в данной беседе.\n\nБеседа деактивирована. Для активации беседы используйте: /start")

    if not is_user_need_priority(chat_id, message.from_id, "rr"):
        return

    args = resolveArguments(message, 1)
    if args == False:
        return await message.answer("⚠️ Используйте: /rr @username")

    mention = args[0]
    
    user = await resolveResources(mention)
    if user == None:
        return await message.answer("⚠️ Некорректное упоминание!")

    executor = {
        "role": int(database[str(chat_id)]['roles'].get(str(message.from_id), 0)),
        "name": database[str(chat_id)]['nicknames'].get(str(message.from_id), 0)
    }

    if str(user.id) not in database[str(chat_id)]["roles"]:
        return await message.answer("⚠️ У данного пользователя нет ролей.")

    target = {
        "role": int(database[str(chat_id)]['roles'].get(str(user.id), 0)),
        "name": database[str(chat_id)]['nicknames'].get(str(user.id), 0)
    }

    if executor["role"] < target["role"]:
        return await message.answer(f"⚠️ Вы не можете применить данную команду к пользователю, чья роль выше вашей.")

    executor["user"] = await get_user_info(message.from_id)
    target["user"] = await get_user_info(user.id)

    await message.answer(
        "✅ "
        f"{get_full_name(executor['user']) if executor['name'] == 0 else get_nickname_id(message.from_id, executor['name'])}"
        f" удалил роль "
        f"{get_nickname_id(user_id, target['name']) if target['name'] != 0 else get_full_name(target['user'])}\n\n"
    )
    del database[str(chat_id)]['roles'][str(user.id)]
    DB.save(database)

@bot.on.message(IsCommand="роли")
async def roles_handler(message: Message):
    if tech_db.is_sysban(message.from_id):
        return
    chat_id = str(message.peer_id)
    if not database['chats'].get(chat_id, {}).get('is_active', False):
        return await message.answer("❌ Беседа не активирована. Введите команду /start для активации.")
    # Проверка приоритета (если нужно ограничить доступ)
    if not is_user_need_priority(chat_id, message.from_id, "roles"):
        return await message.answer("⚠️ У вас недостаточно прав для просмотра ролей.")
    if not database.get(chat_id, {}).get("standart_roles"):
        return await message.answer("❌ Роли не настроены. Используйте /addrole.")

    # Сортируем роли по приоритету (от высокого к низкому)
    roles = sorted(
        database[chat_id]["standart_roles"].items(),
        key=lambda x: int(x[0]),
        reverse=True
    )
    # Форматируем выво
    response = "👑 Доступные роли в беседе:\n\n" + "\n".join(
        f"{priority}: {name}" for priority, name in roles
    )
    await message.answer(response)

# Команда /admins для вывода списка администраторов и их ролей
@bot.on.message(IsCommand="admins")
@bot.on.message(IsCommand="staff")
async def admins_list_handler(message: Message):
    if tech_db.is_sysban(message.from_id):
        return
    chat_id = message.peer_id
    if not database['chats'].get(str(chat_id), {}).get('is_active', False):
        return await message.answer("❌ Беседа не активирована. Введите команду /start для активации.")

    # if not await is_bot_admin(chat_id):
    #     database["chats"][str(chat_id)]["is_active"] = False
    #     DB.save(database)
    #     return await message.answer("❌ Я не являюсь администратором в данной беседе.\n\nБеседа деактивирована. Для активации беседы используйте: /start")

    if not is_user_need_priority(chat_id, message.from_id, "admins"):
        return

    admins_list = []
    for user_id, role_priority in sorted(database[str(chat_id)]['roles'].items(), key=lambda item: item[1], reverse=True):
        user = await resolveResources(str(user_id))
        if user:
            admins_list.append(f"-- {get_full_name(user)}: {database[str(chat_id)]['standart_roles'][str(role_priority)]}")


    if admins_list:
        await message.answer("👨‍✈️ Список администраторов в чате:\n\n" + "\n".join(admins_list))
    else:
        await message.answer("В чате нет администраторов.")


    



# Команда /ban для бана пользователя на указанный период
@bot.on.message(IsCommand="ban")
async def ban_handler(message: Message):
    if tech_db.is_sysban(message.from_id):
        return
    chat_id = message.peer_id
    if not database['chats'].get(str(chat_id), {}).get('is_active', False):
        return await message.answer("❌ Беседа не активирована. Введите команду /start для активации.")

    if not await is_bot_admin(chat_id):
        database["chats"][str(chat_id)]["is_active"] = False
        DB.save(database)
        return await message.answer("❌ Я не являюсь администратором в данной беседе.\n\nБеседа деактивирована. Для активации беседы используйте: /start")

    if not is_user_need_priority(chat_id, message.from_id, "ban"):
        return

    args = resolveArguments(message, 3)
    if args == False:
        return await message.answer("⚠️ Используйте: /ban @username [Время. Пример: 10h, 10m, 10s,10d] [Причина]")

    mention, duration, reason = args

    if duration == None:
        return await message.answer("⚠️ Используйте: /ban @username [Время. Пример: 10h, 10m, 10s,10d] [Причина]")
    
    if reason == None:
        reason = "Не указана"
    
    user = await resolveResources(mention)
    if user != None:
        user_id = user.id
        executor = {
            "role": int(database[str(chat_id)]['roles'].get(str(message.from_id), 0)),
            "name": database[str(chat_id)]['nicknames'].get(str(message.from_id), 0)
        }

        target = {
            "role": int(database[str(chat_id)]['roles'].get(str(user.id), 0)),
            "name": database[str(chat_id)]['nicknames'].get(str(user.id), 0)
        }
        if executor['role'] < target['role']:
            return await message.answer("⚠️ Вы не можете применить данную команду к пользователю, чья роль выше вашей!")


        duration_seconds = parse_args(duration)
        if duration_seconds == None:
            return await message.answer("⚠️ Неправильный формат времени!\nИспользуйте: *Время**Срок*\n\nПример: 10s - 10 секунд, 10m - 10 минут, 10h - 10 часов, 10d - 10 дней!")
        
        end_time = datetime.now() + timedelta(seconds=duration_seconds)
        database[str(chat_id)]['bans'][str(user_id)] = {'end_time': end_time.isoformat(), 'reason': reason}
        DB.save(database)
        
        try:
            await bot.api.messages.remove_chat_user(chat_id=chat_id-2000000000, user_id=user_id)
        except:
            return await message.answer(f"❌ Ошибка при бане[0] пользователя: {e}")

        executor["user"] = await get_user_info(message.from_id)
        target["user"] = await get_user_info(user.id)

        await message.answer(
            f"👤 Пользователь "
            f"{get_nickname_id(user_id, target['name']) if target['name'] != 0 else get_full_name(target['user'])} "
            f"забанен до {end_time.strftime('%Y-%m-%d %H:%M:%S')}\n\n"
            f"\n👨‍✈️ Администратор: {get_full_name(executor['user']) if executor['name'] == 0 else get_nickname_id(message.from_id, executor['name'])}"
            f"\n🔰 Причина: {reason}"
        )

        # except Exception as e:
        #     await message.answer(f"❌ Ошибка при бане[1] пользователя: {e}")
    else:
        await message.answer("❌ Данного пользователя не существует.")

# Команда /unban для разбана пользователя
@bot.on.message(IsCommand="unban")
async def unban_handler(message: Message, mention: str = None):
    if tech_db.is_sysban(message.from_id):
        return
    chat_id = message.peer_id
    if not database['chats'].get(str(chat_id), {}).get('is_active', False):
        return await message.answer("❌ Беседа не активирована. Введите команду /start для активации.")

    # if not await is_bot_admin(chat_id):
    #     database["chats"][str(chat_id)]["is_active"] = False
    #     DB.save(database)
    #     return await message.answer("❌ Я не являюсь администратором в данной беседе.\n\nБеседа деактивирована. Для активации беседы используйте: /start")

    if not is_user_need_priority(chat_id, message.from_id, "unban"):
        return

    args = resolveArguments(message, 1)
    if args == False:
        return await message.answer("⚠️ Используйте: /unban @username")

    mention = args[0]
    
    user = await resolveResources(mention)
    if user:
        user_id = user.id
        if str(user_id) in database[str(chat_id)]['bans']:
            del database[str(chat_id)]['bans'][str(user_id)]
            DB.save(database)
            await message.answer(f"✅ Пользователь {get_full_name(user)} успешно разбанен.")
        else:
            await message.answer("⚠️ Этот пользователь не забанен.")
    else:
        await message.answer("⚠️ Некорректное упоминание.")

@bot.on.message(text=["/addrole <priority> <role>", "/addrole <priority>", "/addrole"])
@bot.on.message(text=["!addrole <priority> <role>", "!addrole <priority>", "!addrole"])
async def addrole_handler(message: Message, priority: int = None, role: str = None):
    if tech_db.is_sysban(message.from_id):
        return
    chat_id = message.peer_id
    if not database['chats'].get(str(chat_id), {}).get('is_active', False):
        return await message.answer("❌ Беседа не активирована. Введите команду /start для активации.")

    # if not await is_bot_admin(chat_id):
    #     database["chats"][str(chat_id)]["is_active"] = False
    #     DB.save(database)
    #     return await message.answer("❌ Я не являюсь администратором в данной беседе.\n\nБеседа деактивирована. Для активации беседы используйте: /start")

    if not is_user_need_priority(chat_id, message.from_id, "addrole"):
        return

    if priority == None or role == None:
        return await message.answer("⚠️ Используйте: /addrole [Приоритет(0-100)] [Название роли]")

    if int(priority) < 0 or int(priority) > 100:
        return await message.answer("⚠️ Приоритет не может быть меньше 0 или больше 100!")
    
    if str(priority) in database[str(chat_id)]["standart_roles"]:
        return await message.answer("⚠️ Роль с таким приоритетом уже существует!")

    for standart_priority, standart_role in database[str(chat_id)]["standart_roles"].items():
        if standart_role == role:
            return await message.answer("⚠️ Роль с таким названием уже существует!")

    database[str(chat_id)]["standart_roles"][str(priority)] = role
    DB.save(database)

    executor = {
        "role": int(database[str(chat_id)]['roles'].get(str(message.from_id), 0)),
        "name": database[str(chat_id)]['nicknames'].get(str(message.from_id), 0)
    }
    executor["user"] = await get_user_info(message.from_id)

    await message.answer(
        "✅ "
        f"{get_full_name(executor['user']) if executor['name'] == 0 else get_nickname_id(message.from_id, executor['name'])} "
        f" создал новую роль\n\n"
        f"🏷 Название: {role}\n"
        f"🔱 Приоритет: {priority}"
    )

@bot.on.message(text=["/delrole <priority>", "/delrole"])
@bot.on.message(text=["!delrole <priority>", "!delrole"])
async def delrole_handler(message: Message, priority: int | str = None):
    if tech_db.is_sysban(message.from_id):
        return
    chat_id = message.peer_id
    if not database['chats'].get(str(chat_id), {}).get('is_active', False):
        return await message.answer("❌ Беседа не активирована. Введите команду /start для активации.")

    # if not await is_bot_admin(chat_id):
    #     database["chats"][str(chat_id)]["is_active"] = False
    #     DB.save(database)
    #     return await message.answer("❌ Я не являюсь администратором в данной беседе.\n\nБеседа деактивирована. Для активации беседы используйте: /start")

    if not is_user_need_priority(chat_id, message.from_id, "addrole"):
        return

    if priority == None:
        return await message.answer("⚠️ Используйте: /delrole [Приоритет/Название роли]")

    
    role_priority = -1
    if str(priority) in database[str(chat_id)]["standart_roles"]:
        role_priority = str(priority)
    else:
        for standart_priority, standart_role in database[str(chat_id)]["standart_roles"].items():
            if standart_role == priority:
                role_priority = str(standard_priority)

    if role_priority == -1:
        return await message.answer(
            "❌ Такой роли не существует."
        )

    executor = {
        "role": int(database[str(chat_id)]['roles'].get(str(message.from_id), 0)),
        "name": database[str(chat_id)]['nicknames'].get(str(message.from_id), 0)
    }
    
    executor["user"] = await get_user_info(message.from_id)
    
    await message.answer(
        "✅ "
        f"{get_full_name(executor['user']) if executor['name'] == 0 else get_nickname_id(message.from_id, executor['name'])} "
        f" удалил роль "
        f"{database[str(chat_id)]['standart_roles'][role_priority]}[{role_priority}]"
    )

    deleted_users = []
    for user in list(database[str(chat_id)]["roles"]):
        user_role = database[str(chat_id)]["roles"][user]
        if user_role == int(role_priority):
            del database[str(chat_id)]["roles"][user]

    await message.answer(
        "❗️ Всем пользователям, у кого была данная роль - роль снята."
    )

    del database[str(chat_id)]["standart_roles"][role_priority]
    DB.save(database)


async def UserMute(peer_id, user_id, mute_time, state):
    params = {
        "peer_id": peer_id,
        "member_ids": user_id,
        "action": "ro" if state == 1 else "rw"
    }
    if state == 1:  # Только для мута добавляем время
        params["for"] = mute_time
    await bot.api.request("messages.changeConversationMemberRestrictions", params)


# Команда мута
@bot.on.message(IsCommand="mute")
async def mute_handler(message: Message):
    if tech_db.is_sysban(message.from_id):
        return
    chat_id = message.peer_id
    if not database['chats'].get(str(chat_id), {}).get('is_active', False):
        return await message.answer("❌ Беседа не активирована. Введите команду /start для активации.")

    if not await is_bot_admin(chat_id):
        database["chats"][str(chat_id)]["is_active"] = False
        DB.save(database)
        return await message.answer("❌ Я не являюсь администратором в данной беседе.\n\nБеседа деактивирована. Для активации беседы используйте: /start")

    if not is_user_need_priority(chat_id, message.from_id, "mute"):
        return

    args = resolveArguments(message, 3)
    if args == False:
        return await message.answer("⚠️ Используйте: /mute @username [Время. Пример: 10h, 10m, 10s,10d] [Причина]")

    mention, duration, reason = args

    if duration == None:
        return await message.answer("⚠️ Используйте: /mute @username [Время. Пример: 10h, 10m, 10s,10d] [Причина]")
    
    if reason == None:
        reason = "Не указана"
    
    user = await resolveResources(mention)
    if user == None:
        await message.answer("⚠️ Некорректное упоминание!")
        return
    
    executor = {
        "role": int(database[str(chat_id)]['roles'].get(str(message.from_id), 0)),
        "name": database[str(chat_id)]['nicknames'].get(str(message.from_id), 0)
    }

    target = {
        "role": int(database[str(chat_id)]['roles'].get(str(user.id), 0)),
        "name": database[str(chat_id)]['nicknames'].get(str(user.id), 0)
    }
    if executor['role'] < target['role']:
        return await message.answer("⚠️ Вы не можете применить данную команду к пользователю, чья роль выше вашей!")


    duration_seconds = parse_args(duration)
    if duration_seconds == None:
        return await message.answer("⚠️ Неправильный формат времени!\nИспользуйте: *Время**Срок*\n\nПример: 10s - 10 секунд, 10m - 10 минут, 10h - 10 часов, 10d - 10 дней!")
    
    end_time = datetime.now() + timedelta(seconds=duration_seconds)
    database[str(chat_id)]['mutes'][str(user.id)] = {'end_time': end_time.isoformat(), 'reason': reason, 'admin': message.from_id}
    DB.save(database)

    executor["user"] = await get_user_info(message.from_id)
    target["user"] = await get_user_info(user.id)

    await message.answer(
        f"👤 Пользователь "
        f"{get_nickname_id(user.id, target['name']) if target['name'] != 0 else get_full_name(target['user'])} "
        f"замучен до {end_time.strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        f"\n👨‍✈️ Администратор: {get_full_name(executor['user']) if executor['name'] == 0 else get_nickname_id(message.from_id, executor['name'])}"
        f"\n🔰 Причина: {reason}"
    )

    await UserMute(message.peer_id, user.id, duration_seconds, 1)


@bot.on.message(IsCommand="unmute")
async def unmute_handler(message: Message):
    chat_id = str(message.peer_id)
    if not database['chats'].get(chat_id, {}).get('is_active', False):
        return await message.answer("❌ Беседа не активирована.")

    args = resolveArguments(message, 1)
    if not args:
        return await message.answer("⚠️ Используйте: /unmute @username")
    
    mention = args[0]
    user = await resolveResources(mention)
    if not user:
        return await message.answer("⚠️ Пользователь не найден.")

    # Проверяем, есть ли мут

    if str(user.id) not in database[chat_id].get('mutes', {}):
        return await message.answer("⚠️ У пользователя нет мута.")

    # Снимаем мут

    try:
        await UserMute(message.peer_id, user.id, 1, 0)  # state=0 (unmute)
        del database[chat_id]['mutes'][str(user.id)]
        DB.save(database)
        await message.answer(f"✅ Мут снят с {get_full_name(user)}.")
    except Exception as e:
        await message.answer(f"❌ Ошибка: {e}")    
    
    executor = {
        "role": int(database[str(chat_id)]['roles'].get(str(message.from_id), 0)),
        "name": database[str(chat_id)]['nicknames'].get(str(message.from_id), 0)
    }

    target = {
        "role": int(database[str(chat_id)]['roles'].get(str(user.id), 0)),
        "name": database[str(chat_id)]['nicknames'].get(str(user.id), 0)
    }
    
    if executor['role'] < target['role']:
        return await message.answer("⚠️ Вы не можете применить данную команду к пользователю, чья роль выше вашей!")



    del database[str(chat_id)]['mutes'][str(user.id)]
    DB.save(database)

    executor["user"] = await get_user_info(message.from_id)
    target["user"] = await get_user_info(user.id)

    await message.answer(   
        "✅ Администратор "
        f"{get_full_name(executor['user']) if executor['name'] == 0 else get_nickname_id(message.from_id, executor['name'])} "
        " снял мут "
        f"{get_nickname_id(user.id, target['name']) if target['name'] != 0 else get_full_name(target['user'])}!"
    )

    await UserMute(message.peer_id, user.id, 0, 0)
    
@bot.on.message(IsCommand="mutelist")
async def mutelist_handler(message: Message):
    if tech_db.is_sysban(message.from_id):
        return
    chat_id = message.peer_id
    if not database['chats'].get(str(chat_id), {}).get('is_active', False):
        return await message.answer("❌ Беседа не активирована. Введите команду /start для активации.")

    if not await is_bot_admin(chat_id):
        database["chats"][str(chat_id)]["is_active"] = False
        DB.save(database)
        return await message.answer("❌ Я не являюсь администратором в данной беседе.\n\nБеседа деактивирована. Для активации беседы используйте: /start")

    if not is_user_need_priority(chat_id, message.from_id, "mutelist"):
        return

    mutes_list = []

    for mute_user_id in list(database[str(chat_id)]["mutes"]):
        mute_user_info = database[str(chat_id)]["mutes"][mute_user_id]

        user = await get_user_info(mute_user_id)
        admin = await get_user_info(mute_user_info["admin"])
        end_time = datetime.fromisoformat(mute_user_info['end_time'])
        mutes_list.append(
            f"{get_full_name(user)} - {mute_user_info['reason']} (до {end_time.strftime('%Y-%m-%d %H:%M:%S')}, {get_full_name(admin)})\n"
        )
    
    if len(mutes_list) > 0:
        await message.answer("🔰 Пользователи с мутом:\n\n" + ("\n").join(mutes_list))
    else:
        await message.answer("⚠️ Пользователей с мутом нет.")



@bot.on.message(text=["/welcome <welcometext>", "/welcome"])
@bot.on.message(text=["/приветствие <welcometext>", "/приветствие"])
@bot.on.message(text=["!welcome <welcometext>", "!welcome"])
@bot.on.message(text=["!приветствие <welcometext>", "!приветствие"])
async def welcome_handler(message: Message, welcometext: str = None):
    if tech_db.is_sysban(message.from_id):
        return
    chat_id = message.peer_id
    if not database['chats'].get(str(chat_id), {}).get('is_active', False):
        return await message.answer("❌ Беседа не активирована. Введите команду /start для активации.")

    if not await is_bot_admin(chat_id):
        database["chats"][str(chat_id)]["is_active"] = False
        DB.save(database)
        return await message.answer("❌ Я не являюсь администратором в данной беседе.\n\nБеседа деактивирована. Для активации беседы используйте: /start")
    
    if not is_user_need_priority(chat_id, message.from_id, "welcome"):
        return

    if welcometext == None:
        return await message.answer("⚠️ Используйте: /welcome [текст приветствия]\n\nВведите: /welcome del - чтобы удалить приветствие\n/welcome get - посмотреть приветствие\n\nПаттерны:\n-- [name] - Имя Фамилия\n-- [id] - ИД пользователя")

    executor = {
        "role": int(database[str(chat_id)]['roles'].get(str(message.from_id), 0)),
        "name": database[str(chat_id)]['nicknames'].get(str(message.from_id), 0)
    }
    executor["user"] = await get_user_info(message.from_id)

    if welcometext == "del":
        database[str(chat_id)]["welcome_text"] = ""
        DB.save(database)
        return await message.answer(
            f"✅ "
            f"{get_full_name(executor['user']) if executor['name'] == 0 else get_nickname_id(message.from_id, executor['name'])} "
            f" удалил приветствие беседы."
        )
    elif welcometext == "get":
        if len(database[str(chat_id)]["welcome_text"]) > 0:
            return await message.answer(
                f"🔰 Приветствие беседы:\n\n<<{database[str(chat_id)]['welcome_text']}>>"
            )
        else:
            return await message.answer(
                f"❌ У беседы не установлено приветствие!"
            )

    database[str(chat_id)]["welcome_text"] = welcometext
    DB.save(database)

    await message.answer(
        f"✅ "
        f"{get_full_name(executor['user']) if executor['name'] == 0 else get_nickname_id(message.from_id, executor['name'])} "
        f" изменил приветствие на:\n\n"
        f"<<{welcometext}>>"
    )

@bot.on.message(IsCommand="help")
async def help_message(message: Message):
    if tech_db.is_sysban(message.from_id):
        return
    chat_id = message.peer_id
    if not database['chats'].get(str(chat_id), {}).get('is_active', False):
        return await message.answer("❌ Беседа не активирована. Введите команду /start для активации.")

    # Создаем категории команд с описаниями
    command_categories = {
        "👑 Администрирование": {
            "start": "Активация бота в беседе",
            "role": "Выдать роль пользователю",
            "rr": "Снять роль с пользователя",
            "addrole": "Добавить новую роль",
            "delrole": "Удалить роль",
            "roles": "Список всех ролей",
            "admins": "Список администраторов",
            "editcmd": "Изменить приоритет команды",
            "unity": "Управление объединением чатов",
            "agent": "Управление агентами поддержки",
            "sysban": "Системный бан пользователя",
            "sysunban": "Снять системный бан",
            "sysrole": "Выдать системную роль",
            "givemoney": "Выдать деньги",
            "givevip": "Выдать VIP-статус"
        },
        "🔨 Модерация": {
            "ban": "Забанить пользователя",
            "unban": "Разбанить пользователя",
            "mute": "Замутить пользователя",
            "unmute": "Размутить пользователя",
            "mutelist": "Список замученных",
            "kick": "Исключить пользователя",
            "del": "Удалить сообщение",
            "gmute": "Глобальный мут",
            "gban": "Глобальный бан"
        },
        "📌 Управление сообщениями": {
            "pin": "Закрепить сообщение",
            "unpin": "Открепить сообщение"
        },
        "👤 Ники и профили": {
            "snick": "Установить ник",
            "rnick": "Удалить ник",
            "gnick": "Посмотреть ник",
            "nlist": "Список ников",
            "profile": "Профиль пользователя"
        },
        "🎭 Разное": {
            "welcome": "Настроить приветствие",
            "report": "Создать обращение",
            "reports": "Список обращений",
            "help": "Справка по командам",
            "ping": "Проверка работы бота"
        }
    }

    # Формируем красивое сообщение
    help_text = "📚 Доступные команды:\n\n"
    
    for category, commands in command_categories.items():
        help_text += f"▫️ {category}:\n"
        for cmd, desc in commands.items():
            help_text += f"   ├ /{cmd.ljust(12)} - {desc}\n"
        help_text += "\n"

    help_text += "ℹ️ Для получения подробной информации используйте: /help"

    await message.answer(help_text)
    


@bot.on.message(text=["/editcmd <command> <priority>", "/editcmd <command>", "/editcmd"])
@bot.on.message(text=["!editcmd <command> <priority>", "!editcmd <command>", "!editcmd"])
async def edit_role_handler(message: Message, command: str = None, priority: int = None):
    if tech_db.is_sysban(message.from_id):
        return
    chat_id = message.peer_id
    if not database['chats'].get(str(chat_id), {}).get('is_active', False):
        return await message.answer("❌ Беседа не активирована. Введите команду /start для активации.")

    if not is_user_need_priority(chat_id, message.from_id, "editcmd"):
        return

    if not await is_bot_admin(chat_id):
        database["chats"][str(chat_id)]["is_active"] = False
        DB.save(database)
        return await message.answer("❌ Я не являюсь администратором в данной беседе.\n\nБеседа деактивирована. Для активации беседы используйте: /start")
    
    
    if command == None or priority == None:
        return await message.answer(
            f"⚠️ Используйте: /editcmd [Команда без /] [Приоритет]"
        )

    if command.startswith("/"):
        return await message.answer(
            f"⚠️ Введите команду без /"
        )

    if command not in database[str(chat_id)]["command_priority"] or command == "editcmd":
        return await message.answer(
            "❌ Данной команде нельзя изменить приоритет, либо её не существует!"
        )

    executor = {
        "role": int(database[str(chat_id)]['roles'].get(str(message.from_id), 0)),
        "name": database[str(chat_id)]['nicknames'].get(str(message.from_id), 0)
    }
    executor["user"] = await get_user_info(message.from_id)

    await message.answer(
        "🔐 "
        f"{get_full_name(executor['user']) if executor['name'] == 0 else get_nickname_id(message.from_id, executor['name'])} "
        f" изменил приоритет для команды <</{command}>>\n\n"
        f"{database[str(chat_id)]['command_priority'][command]} >> {priority}"
    )

    database[str(chat_id)]["command_priority"][command] = int(priority)
    DB.save(database)

def get_free_unity_id(unities):
    r = random.randint(0, 500)

    while unities.get(r, -1) != -1:
        r = random.randint(0, 500)
    return str(r)

def unity_get_chat(unity_id, chat_id):
    count = 0
    for unities in unity[unity_id]["chats"]:
        if str(unities) == str(chat_id):
            return count
        count += 1
    return count


@bot.on.message(text=["/unity <method> <unity_id:int> <otherparams>", "/unity <method> <unity_id:int>", "/unity <method>", "/unity"])
@bot.on.message(text=["!unity <method> <unity_id:int> <otherparams>", "!unity <method> <unity_id:int>", "!unity <method>", "/unity"])
async def unity_handler(message: Message, method: str = None, unity_id: int = None, otherparams: str = None):
    if tech_db.is_sysban(message.from_id):
        return
    chat_id = str(message.peer_id)
    if not database['chats'].get(str(chat_id), {}).get('is_active', False):
        return await message.answer("❌ Беседа не активирована. Введите команду /start для активации.")

    if not is_user_need_priority(chat_id, message.from_id, "unity"):
        return

    if not await is_bot_admin(chat_id):
        database["chats"][str(chat_id)]["is_active"] = False
        DB.save(database)
        return await message.answer("❌ Я не являюсь администратором в данной беседе.\n\nБеседа деактивирована. Для активации беседы используйте: /start")
    

    if method == None:
        return await message.answer(
            f"⚠️ Используйте: /unity [method] <ID>\n\n-- Методы:\n<> - необязательный аргумент, [] - обязательный\n\n"
            "- create - Создать объединение\n"
            "- delete [ID] - Удалить объединение[Нужно быть владельцем]\n"
            "- join [ID] <password> - Вступить в объединение\n"
            "- leave - Выйти из объединения\n"
            "- edit - Изменить настройки объединения[Нужно быть владельцем]\n"
            "- addadmin [ID] @username - Добавить администратора объединения[Нужно быть владельцем]\n"
            "- deladmin [ID] @username - Удалить администратора объединения[Нужно быть владельцем]"
        )

    if method == "create":
        if database[chat_id]["unity-id"] != -1:
            return await message.answer("⚠️ Для выхода из объединения используйте: /unity leave")
        free_unity_id = get_free_unity_id(unity)
        unity[free_unity_id] = {
            "chats": [chat_id],
            "owner": str(message.from_id),
            "password": -1,
            "block": False,
            "name": f"Объединение №{free_unity_id}",
            "admins": []
        }
        unity_save()

        database[chat_id]["unity-id"] = free_unity_id
        DB.save(database)

        executor = {
            "role": int(database[str(chat_id)]['roles'].get(str(message.from_id), 0)),
            "name": database[str(chat_id)]['nicknames'].get(str(message.from_id), 0)
        }
        executor["user"] = await get_user_info(message.from_id)

        await message.answer(
            "✅ "
            f"{get_full_name(executor['user']) if executor['name'] == 0 else get_nickname_id(message.from_id, executor['name'])}"
            f" создал новое объединение бесед: №{free_unity_id} [ Объединение №{free_unity_id} ]"
            f"\n\nЧтобы добавиться в данное объединение другую беседе, введите в той беседе: /unity join {free_unity_id}"
        )
    elif method == "join":
        if database[chat_id]["unity-id"] != -1:
            return await message.answer("⚠️ Для выхода из объединения используйте: /unity leave")

        if unity_id == None:
            return await message.answer("⚠️ Используйте: /unity join [ID объединения]")

        unity_id = str(unity_id)

        if unity_id not in unity:
            return await message.answer("⚠️ Объединения с таким номером не существует!")

        if not unity[unity_id]["block"]:
            database[chat_id]["unity-id"] = unity_id
            unity[unity_id]["chats"].append(chat_id)
            unity_save()
            DB.save(database)
            admin = await get_user_info(unity[unity_id]["owner"])
            return await message.answer(
                f"✅ Беседа успешно добавлена в объединение №{unity_id}\n\n"
                f"Название объединения: {unity[unity_id]['name']}\n"
                f"Владелец объединения: {get_full_name(admin)}"
            )

        if unity[unity_id]["block"]:
            if otherparams == None:
                return await message.answer(f"⚠️ Для входа в данное объединение нужно ввести пароль.\n\nИспользуй: /unity join {unity_id} <Пароль>")
            
            if str(otherparams) != str(unity[unity_id]["password"]):
                return await message.answer(f"❌ Пароль неверный. Попробуйте ещё раз!")

            if str(otherparams) == str(unity[unity_id]["password"]):
                database[chat_id]["unity-id"] = unity_id
                unity[unity_id]["chats"].append(chat_id)
                unity_save()
                DB.save(database)
                admin = await get_user_info(unity[unity_id]["owner"])
                return await message.answer(
                    f"✅ Беседа успешно добавлена в объединение №{unity_id}\n\n"
                    f"Название объединения: {unity[unity_id]['name']}\n"
                    f"Владелец объединения: {get_full_name(admin)}"
                )
    elif method == "leave":
        if database[chat_id]["unity-id"] == -1:
            return await message.answer("⚠️ Вы не состоите ни в одном из объединений.")

        unity_id = str(database[chat_id]["unity-id"])
        if unity_id not in unity:
            return await message.answer("⚠️ Такого объединения не существует, либо вы им не владеете.")
        
        if unity[unity_id]["owner"] != str(message.from_id):
            return await message.answer("⚠️ Такого объединения не существует, либо вы им не владеете.")

        count = 0
        for el in unity[database[chat_id]["unity-id"]]["chats"]:
            if el == chat_id:
                del unity[database[chat_id]["unity-id"]]["chats"][count]
            count += 1

        database[chat_id]["unity-id"] = -1;
        DB.save(database)
        unity_save()

        return await message.answer(
            f"✅ Беседа успешно удалена из объединения.\n\nВы остались владельцем объединения, чтобы его удалить, используйте: /unity delete {unity_id}"
        )
    elif method == "info":
        if database[chat_id]["unity-id"] == -1:
            return await message.answer("⚠️ Вы не состоите ни в одном из объединений.")


        current_unity = unity[database[chat_id]["unity-id"]]
        
        admin = await get_user_info(current_unity['owner'])
        
        admins_list = []
        for unity_admin in current_unity['admins']:
            user = await get_user_info(unity_admin)
            if user != None:
                admins_list.append(get_full_name(user))

        return await message.answer(
            f"🔰 {current_unity['name']} [ ID: {database[chat_id]['unity-id']} ]\n\n"
            f"Владелец объединения: {get_full_name(admin)}\n"
            f"Всего бесед в объединении: {len(current_unity['chats'])}"
            f"\n{'Администрация: ' + (', ').join(admins_list) if len(admins_list) > 0 else ''}"
        )
    elif method == "edit":
        if unity_id == None:
            return await message.answer("⚠️ Введите ID объединения, настройки которого вы хотите изменить.")
        unity_id = str(unity_id)
        if unity_id not in unity:
            return await message.answer("⚠️ Такого объединения не существует, либо вы им не владеете.")
        
        if unity[unity_id]["owner"] != str(message.from_id):
            return await message.answer("⚠️ Такого объединения не существует, либо вы им не владеете.")

        if otherparams == None:
            return await message.answer("⚠️ Введите параметр и значение, что именно вы хотите изменить.\n\n"
                                        "Доступные параметры:\n-- block(Вход по паролю)[on/off]\n-- password(Пароль для входа)[пароль]\n-- name(Название объединения)[название]")
        
        params = otherparams.split(" ")
        if len(params) <= 1:
            return await message.answer("⚠️ Введите значение!")
        elif len(params) > 2:
            oz = ""
            count = 0
            for el in params:
                if count > 0:
                    oz += f"{el} "
                count += 1
            count = 0
            for el in params:
                if count > 0:
                    del params[count]
                count+=1
            params[1] = oz.strip()
        
        if params[0] in ["block", "name", "password"]:
            if params[0] == "block":
                if params[1] in ["on", "off"]:
                    if params[1] == "on":
                        unity[unity_id]["block"] = True
                        unity_save()
                        return await message.answer("✅ Теперь при входе в объединение потребуется ввести пароль!\n"
                                                    f"Нынешний пароль: {unity[unity_id]['password']}\n\n"
                                                    f"Чтобы изменить пароль, введите: /unity edit {unity_id} password [Ваш пароль]")
                    elif params[1] == "off":
                        unity[unity_id]["block"] = False
                        unity_save()
                        return await message.answer("✅ Теперь при входе в объединение не потребуется ввод пароля!\n")
                else:
                    return await message.answer("⚠️ Используйте только on/off, где [ on - включить | off - выключить ]\n")
            elif params[0] == "name":
                unity[unity_id]["name"] = params[1]
                unity_save()
                return await message.answer(f"✅ Вы изменили название объединения №{unity_id} на {params[1]}")
            elif params[0] == "password":
                unity[unity_id]["password"] = params[1]
                unity_save()
                await bot.api.messages.delete(
                    peer_id = chat_id,
                    cmids = message.conversation_message_id
                )
                return await message.answer(f"✅ Вы успешно изменили пароль для входа в объединение!")
    elif method == "addadmin":
        if unity_id == None:
            return await message.answer("⚠️ Введите ID объединения, права администратора вы хотите выдать.")
        unity_id = str(unity_id)
        if unity_id not in unity:
            return await message.answer("⚠️ Такого объединения не существует, либо вы им не владеете.")
        
        if unity[unity_id]["owner"] != str(message.from_id):
            return await message.answer("⚠️ Такого объединения не существует, либо вы им не владеете.")

        if otherparams == None:
            return await message.answer(f"⚠️ Используйте: /unity addadmin {unity_id} @username")

        user = await resolveResources(otherparams)
        if user == None:
            return await message.answer(f"⚠️ Такого пользователя не существует!")

        unity[unity_id]["admins"].append(str(user.id))
        unity_save()

        return await message.answer(
            f"✅ {get_full_name(user)} новый администратор объединения №{unity_id} [ {unity[unity_id]['name']} ]"
        )
    elif method == "deladmin":
        if unity_id == None:
            return await message.answer("⚠️ Введите ID объединения, права администратора вы хотите выдать.")
        unity_id = str(unity_id)
        if unity_id not in unity:
            return await message.answer("⚠️ Такого объединения не существует, либо вы им не владеете.")
        
        if unity[unity_id]["owner"] != str(message.from_id):
            return await message.answer("⚠️ Такого объединения не существует, либо вы им не владеете.")

        if otherparams == None:
            return await message.answer(f"⚠️ Используйте: /unity deladmin {unity_id} @username")

        user = await resolveResources(otherparams)
        if user == None:
            return await message.answer(f"⚠️ Такого пользователя не существует!")

        count = 0
        for admin in unity[unity_id]["admins"]:
            if admin == str(user.id):
                del unity[unity_id]["admins"][count]
                unity_save()
                return await message.answer(
                    f"✅ {get_full_name(user)} удален из администрации объединения №{unity_id} [ {unity[unity_id]['name']} ]"
                )
            count += 1
        
        return await message.answer(
            f"❌ {get_full_name(user)} не является администратором объединения!"
        )
    elif method == "delete":
        if unity_id == None:
            return await message.answer("⚠️ Введите ID объединения, права администратора вы хотите выдать.")
        
        unity_id = str(unity_id)
        if unity_id not in unity:
            return await message.answer("⚠️ Такого объединения не существует, либо вы им не владеете.")
        
        if unity[unity_id]["owner"] != str(message.from_id):
            return await message.answer("⚠️ Такого объединения не существует, либо вы им не владеете.")

        for unity_chat_id in unity[unity_id]["chats"]:
            database[unity_chat_id]["unity-id"] = -1
            await send_message(
                peer_id = unity_chat_id,
                text = "⚠️ Объединение, в котором находилась ваша беседа - было удалено."
            )
        
        del unity[unity_id]
        unity_save()

        return await message.answer("✅ Объединение было успешно удалено!")
    

                    
@bot.on.message(IsCommand="gmute")
async def gmute_handler(message: Message):
    if tech_db.is_sysban(message.from_id):
        return
    chat_id = message.peer_id
    if not database['chats'].get(str(chat_id), {}).get('is_active', False):
        return await message.answer("❌ Беседа не активирована. Введите команду /start для активации.")


    if not await is_bot_admin(chat_id):
        database["chats"][str(chat_id)]["is_active"] = False
        DB.save(database)
        return await message.answer("❌ Я не являюсь администратором в данной беседе.\n\nБеседа деактивирована. Для активации беседы используйте: /start")


    if database[str(chat_id)]["unity-id"] == -1:
        return await message.answer(f"⚠️ Данную команду можно использовать только находясь в объединении.")

    unity_id = str(database[str(chat_id)]["unity-id"])
    if str(unity_id) not in unity:
        database[str(chat_id)]["unity-id"] = -1
        DB.save(database)
        return await message.answer(f"⚠️ Ваше объединение бесследно исчезло...")

    if str(message.from_id) != str(unity[unity_id]["owner"]): 
        if str(message.from_id) not in unity[unity_id]["admins"]:
            return await message.answer(f"⚠️ Чтобы отправлять глобальные команды, необходимо быть администратором данного объединения.\n\nОбратитесь к владельцу объединения!")

    args = resolveArguments(message, 3)
    if args == False or (None in args):
        return await message.answer("⚠️ Используйте: /gmute @username [Время] [Причина]")

    mention, duration, reason = args
    
    user = await resolveResources(mention)
    if user == None:
        await message.answer("⚠️ Некорректное упоминание!")
        return
    
    executor = {
        "role": int(database[str(chat_id)]['roles'].get(str(message.from_id), 0)),
        "name": database[str(chat_id)]['nicknames'].get(str(message.from_id), 0)
    }

    target = {
        "role": int(database[str(chat_id)]['roles'].get(str(user.id), 0)),
        "name": database[str(chat_id)]['nicknames'].get(str(user.id), 0)
    }
    if executor['role'] < target['role']:
        return await message.answer("⚠️ Вы не можете применить данную команду к пользователю, чья роль выше вашей!")


    duration_seconds = parse_args(duration)
    if duration_seconds == None:
        return await message.answer("⚠️ Неправильный формат времени!\nИспользуйте: *Время**Срок*\n\nПример: 10s - 10 секунд, 10m - 10 минут, 10h - 10 часов, 10d - 10 дней!")
    
    end_time = datetime.now() + timedelta(seconds=duration_seconds)
    
    current_unity = unity[database[str(chat_id)]["unity-id"]]

    executor["user"] = await get_user_info(message.from_id)
    target["user"] = await get_user_info(user.id)

    await bot.api.messages.send(
        peer_id = chat_id,
        message = ('').join([f">> Объединение №{database[str(chat_id)]['unity-id']} [ {current_unity['name']} ]\n\n",
        f"👤 Пользователь ",
        f"{get_full_name(target['user'])} ",
        f"замучен в объединении до {end_time.strftime('%Y-%m-%d %H:%M:%S')}\n\n",
        f"\n👨‍✈️ Администратор: {get_full_name(executor['user'])}",
        f"\n🔰 Причина: {reason}"]),
        random_id = random.randint(-100000, 100000)
    )
    database[str(chat_id)]['mutes'][str(user.id)] = {'end_time': end_time.isoformat(), 'reason': reason, 'admin': message.from_id}

    for unity_chat_id in current_unity['chats']:
        if unity_chat_id != str(chat_id):
            try:
                await bot.api.messages.send(
                    peer_id = unity_chat_id,
                    message = ('').join([f">> Объединение №{database[str(chat_id)]['unity-id']} [ {current_unity['name']} ]\n\n",
                    f"👤 Пользователь ",
                    f"{get_full_name(target['user'])} ",
                    f"замучен в объединении до {end_time.strftime('%Y-%m-%d %H:%M:%S')}\n\n",
                    f"\n👨‍✈️ Администратор: {get_full_name(executor['user'])}",
                    f"\n🔰 Причина: {reason}"]),
                    random_id = random.randint(-100000, 100000)
                ) 
                database[str(unity_chat_id)]['mutes'][str(user.id)] = {'end_time': end_time.isoformat(), 'reason': reason, 'admin': message.from_id}
            except Exception as e:
                if re.findall("Permission to perform this action is denied: the user was kicked out of the conversation", str(e)):
                    del unity[database[str(unity_chat_id)]["unity-id"]]["chats"][unity_get_chat(database[str(unity_chat_id)]["unity-id"], str(unity_chat_id))]
                    unity_save()

                    if str(unity_chat_id) in database:
                        database[str(unity_chat_id)]["unity-id"] = -1
                        DB.save(database)
    DB.save(database)


@bot.on.message(IsCommand="gban")
async def gban_handler(message: Message, mention: str = None, duration: str = None, reason: str = None):
    if tech_db.is_sysban(message.from_id):
        return
    chat_id = message.peer_id
    if not database['chats'].get(str(chat_id), {}).get('is_active', False):
        return await message.answer("❌ Беседа не активирована. Введите команду /start для активации.")

    if not await is_bot_admin(chat_id):
        database["chats"][str(chat_id)]["is_active"] = False
        DB.save(database)
        return await message.answer("❌ Я не являюсь администратором в данной беседе.\n\nБеседа деактивирована. Для активации беседы используйте: /start")
    

    if database[str(chat_id)]["unity-id"] == -1:
        return await message.answer(f"⚠️ Данную команду можно использовать только находясь в объединении.")

    unity_id = str(database[str(chat_id)]["unity-id"])
    if unity_id not in unity:
        database[str(chat_id)]["unity-id"] = -1
        DB.save(database)
        return await message.answer(f"⚠️ Ваше объединение бесследно исчезло...")

    if str(message.from_id) != str(unity[unity_id]["owner"]):
        if str(message.from_id) not in unity[unity_id]["admins"]:
            return await message.answer(f"⚠️ Чтобы отправлять глобальные команды, необходимо быть администратором данного объединения.\n\nОбратитесь к владельцу объединения!")


    args = resolveArguments(message, 3)
    if args == False or (None in args):
        return await message.answer("⚠️ Используйте: /gban @username [Время] [Причина]")

    mention, duration, reason = args
    
    user = await resolveResources(mention)
    if user == None:
        await message.answer("⚠️ Некорректное упоминание!")
        return

    
    
    executor = {
        "role": int(database[str(chat_id)]['roles'].get(str(message.from_id), 0)),
        "name": database[str(chat_id)]['nicknames'].get(str(message.from_id), 0)
    }

    target = {
        "role": int(database[str(chat_id)]['roles'].get(str(user.id), 0)),
        "name": database[str(chat_id)]['nicknames'].get(str(user.id), 0)
    }
    if executor['role'] < target['role']:
        return await message.answer("⚠️ Вы не можете применить данную команду к пользователю, чья роль выше вашей!")


    duration_seconds = parse_args(duration)
    if duration_seconds == None:
        return await message.answer("⚠️ Неправильный формат времени!\nИспользуйте: *Время**Срок*\n\nПример: 10s - 10 секунд, 10m - 10 минут, 10h - 10 часов, 10d - 10 дней!")
    
    end_time = datetime.now() + timedelta(seconds=duration_seconds)
    
    current_unity = unity[database[str(chat_id)]["unity-id"]]

    executor["user"] = await get_user_info(message.from_id)
    target["user"] = await get_user_info(user.id)

    try:
        await bot.api.messages.remove_chat_user(chat_id=int(chat_id)-2000000000, user_id=user.id)
    except Exception as e:
        if re.findall("User not found in chat", str(e)):
            pass
    await message.answer(
        f">> Объединение №{unity_id} [ {current_unity['name']} ]\n\n"
        f"👤 Пользователь "
        f"{get_full_name(target['user'])} "
        f"забанен в объединении до {end_time.strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        f"\n👨‍✈️ Администратор: {get_full_name(executor['user'])}"
        f"\n🔰 Причина: {reason}"
    )
    database[str(chat_id)]['bans'][str(user.id)] = {'end_time': end_time.isoformat(), 'reason': reason}
    
    
    for unity_chat_id in current_unity['chats']:
        if unity_chat_id != str(chat_id):
            try:
                try:
                    await bot.api.messages.remove_chat_user(chat_id=int(unity_chat_id)-2000000000, user_id=user.id)
                except Exception as e:
                    if re.findall("User not found in chat", str(e)):
                        pass
                await bot.api.messages.send(
                    peer_id = unity_chat_id,
                    message = ('').join([f">> Объединение №{unity_id} [ {current_unity['name']} ]\n\n",
                    f"👤 Пользователь ",
                    f"{get_full_name(target['user'])} ",
                    f"забанен в объединении до {end_time.strftime('%Y-%m-%d %H:%M:%S')}\n\n",
                    f"\n👨‍✈️ Администратор: {get_full_name(executor['user'])}",
                    f"\n🔰 Причина: {reason}"]),
                    random_id = random.randint(-100000, 100000)
                ) 
                database[str(unity_chat_id)]['bans'][str(user.id)] = {'end_time': end_time.isoformat(), 'reason': reason}
            except Exception as e:
                if re.findall("Permission to perform this action is denied: the user was kicked out of the conversation", str(e)):
                    del unity[unity_id]["chats"][unity_get_chat(unity_id, str(unity_chat_id))]
                    unity_save()

                    if str(unity_chat_id) in database:
                        unity_id = -1
                elif re.findall("You don't have access to this chat", str(e)):
                        database["chats"][str(unity_chat_id)]["is_active"] = False
                        return await message.answer("❌ Я не являюсь администратором в данной беседе.\n\nБеседа деактивирована. Для активации беседы используйте: /start")
    DB.save(database)

@bot.on.message(text=["/ping"])
async def ping(message: Message):
    if tech_db.is_sysban(message.from_id):
        return
    start = time.time()
    await message.answer("Pong!")
    end = time.time()
    response_time = round((end - start) * 1000)
    await message.answer(f"Response time: {response_time} ms")

@bot.on.message(text=["/agent <method> <mention>", "/agent <method>", "/agent"])
@bot.on.message(text=["!agent <method> <mention>", "!agent <method>", "!agent"])
async def agent_handler(message: Message, method: str = None, mention: str = None):
    if tech_db.is_sysban(message.from_id):
        return
    user_id, chat_id = str(message.from_id), str(message.chat_id)
    
    admin = tech_db.get_admin_info(user_id)
    if admin is None:
        return
    
    if admin["role"] != "owner":
        if admin["dostup"]["agent"] == 0:
            return
    
    if method != None:
        if method in ["add", "del", "edit", "info", "delowner", "addowner"] and mention == None:
            if message.reply_message:
                mention = str(message.reply_message.from_id)
            else:
                return await message.answer("⚠️ Используйте: /agent [add/del/info/edit/list] @username\n\n-- add/del @username - Добавить/Удалить агента поддержки\n-- edit - Изменить доступ\n-- info - Информация")
    else:
        return await message.answer("⚠️ Используйте: /agent [add/del/info/edit/list] @username\n\n-- add/del @username - Добавить/Удалить агента поддержки\n-- edit - Изменить доступ\n-- info - Информация")
    if method in ["add", "del", "edit", "info", "list", "addowner", "delowner"]:
        if method == "list":
            agents_list = tech_db.get_agents()
            agents_str = "🔰 Список агентов поддержки:\n\n"
            agent_id = 1
            for agent in agents_list:
                us = await get_user_info(agent["id"])

                agents_str += f"{agent_id}. {get_full_name(us)}\n"
                agent_id += 1
            
            if len(agents_list) > 0:
                return await message.answer(agents_str)
            else:
                return await message.answer("Агентов нет!")
        if method == "add":
            user = await resolveResources(mention)
            if user == None:
                return await message.answer("⚠️ Данного пользователя не существует. Введите корректное упоминание пользователя.")
            
            user_is_admin = tech_db.get_admin_info(str(user.id))
            if user_is_admin != None:
                return await message.answer("⚠️ Данный пользователь уже является агентом. Используй: /agent info @username")

            tech_db.add_admin(
                user
            )
            return await message.answer(f"👤 {get_full_name(user)} назначен(-a) <<Агентом поддержки>>")
        elif method == "edit":
            user = await resolveResources(mention)
            if user == None:
                return await message.answer("⚠️ Данного пользователя не сущесвует. Введите корректное упоминание пользователя.")

            user_is_admin = tech_db.get_admin_info(str(user.id))
            if user_is_admin == None:
                return await message.answer(f"⚠️ Данный пользователь не является агентом. Введите: /agent add @username")
            
            if user_is_admin["role"] == "owner":
                return await message.answer(f"⚠️ Вы не можете редактировать данного пользователя.")


            keyboard_list = []
            for util in user_is_admin["dostup"]:
                is_dostup = user_is_admin["dostup"][util]
                new_dostup = 0 if user_is_admin["dostup"][util] == 1 else 1
                keyboard_list.append(
                    {
                        "name": f"/{util}",
                        "callback": {"agent_edit": f"setdostup_{str(user.id)}_{util}_{new_dostup}"},
                        "color": f"{'negative' if is_dostup == 0 else 'positive'}",
                        "type": "callback"
                    }
                )
            keyboard_list.append(
                {
                    "name": f"Закончить редактирование",
                    "callback": {"agent_edit": f"closekeyboard"},
                    "color": f"secondary",
                    "type": "callback"
                }
            )
            
            dostup_list = [f"/{cmd} - {'❌' if is_dostup == 0 else '✅'}\n" for cmd, is_dostup in user_is_admin["dostup"].items()]
            
            roles = {
                "agent": "Агент",
                "owner": "Владелец"
            }
            msg = await bot.api.messages.send(
                peer_ids = int(chat_id)+2000000000,
                message = ("").join([f">> {get_full_name(user)}\n\n",
                f"🔰 Роль: {roles[user_is_admin['role']]}\n",
                f"☑️ Доступ:\n\n" + ('').join(dostup_list)]),
                random_id=random.randint(-100000, 100000),
                keyboard = builder.reply(
                    keyboard_list,
                    adjust = 1
                )
            )

            tech_db.set_message_id_in_edit(
                user_id,
                msg[0].conversation_message_id
            )
        elif method == "info":
            user = await resolveResources(mention)
            if user == None:
                return await message.answer("⚠️ Данного пользователя не сущесвует. Введите корректное упоминание пользователя.")

            user_is_admin = tech_db.get_admin_info(str(user.id))
            if user_is_admin == None:
                return await message.answer(f"⚠️ Данный пользователь не является агентом. Введите: /agent add @username")
            
            if user_is_admin["role"] == "owner":
                return await message.answer(f"⚠️ Вы не можете просматривать информацию про этого пользователя.")

            keyboard_list = []
            for util in user_is_admin["dostup"]:
                is_dostup = user_is_admin["dostup"][util]
                new_dostup = 0 if user_is_admin["dostup"][util] == 1 else 1
                keyboard_list.append(
                    {
                        "name": f"/{util}",
                        "callback": {"agent_edit": f"setdostup_{str(user.id)}_{util}_{new_dostup}"},
                        "color": f"{'negative' if is_dostup == 0 else 'positive'}",
                        "type": "callback"
                    }
                )
            keyboard_list.append(
                {
                    "name": f"CLOSE",
                    "callback": {"agent_edit": f"closekeyboard"},
                    "color": f"secondary",
                    "type": "callback"
                }
            )
            
            dostup_list = [f"/{cmd} - {'❌' if is_dostup == 0 else '✅'}\n" for cmd, is_dostup in user_is_admin["dostup"].items()]
            roles = {
                "agent": "Агент",
                "owner": "Владелец"
            }
            return await message.answer(
                ("").join([f">> {get_full_name(user)}\n\n",
                f"🔰 Роль: {roles[user_is_admin['role']]}\n",
                f"☑️ Доступ:\n\n" + ('').join(dostup_list)])
            )
        elif method == "del":
            user = await resolveResources(mention)
            if user == None:
                return await message.answer("⚠️ Данного пользователя не сущесвует. Введите корректное упоминание пользователя.")

            user_is_admin = tech_db.get_admin_info(str(user.id))
            if user_is_admin == None:
                return await message.answer(f"⚠️ Данный пользователь не является агентом. Введите: /agent add @username")

            if user_is_admin["role"] == "owner":
                return await message.answer(f"⚠️ Вы не можете снять данного пользователя.")

            tech_db.del_admin(str(user.id))
            return await message.answer(f"👤 {get_full_name(user)} снят(-а) с должности <<Агента поддержки>>")
        elif method == "addowner":

            if admin["role"] != "owner":
                return

            user = await resolveResources(str(mention))
            if user == None:
                return await message.answer("⚠️ Данного пользователя не сущесвует. Введите корректное упоминание пользователя.")

            user_is_admin = tech_db.get_admin_info(str(user.id))
            if user_is_admin == None:
                return await message.answer(f"⚠️ Данный пользователь не является агентом. Введите: /agent add @username")

            tech_db.owner(str(user.id), 1)
            return await message.answer(f"👤 {get_full_name(user)} назначен(-а) на должность <<Владелец>>")
        elif method == "delowner":
            if admin["role"] != "owner":
                return

            user = await resolveResources(str(mention))
            if user == None:
                return await message.answer("⚠️ Данного пользователя не сущесвует. Введите корректное упоминание пользователя.")

            user_is_admin = tech_db.get_admin_info(str(user.id))
            if user_is_admin == None:
                return await message.answer(f"⚠️ Данный пользователь не является агентом. Введите: /agent add @username")

            tech_db.owner(str(user.id), 0)
            return await message.answer(f"👤 {get_full_name(user)} снят(-а) с должности <<Владелец>>")
    else:
        return await message.answer("⚠️ Вы ввели неизвестный метод. Используйте: add / del / edit / info")

@bot.on.message(IsCommand="sysban")
async def sysban_message(message: Message, mention: str = None, reason: str = None):
    if tech_db.is_sysban(message.from_id):
        return
    user_id, chat_id = str(message.from_id), str(message.chat_id)
    
    admin = tech_db.get_admin_info(user_id)
    if admin is None:
        return

    if not admin["dostup"]["sysban"]:
        return
    
    args = resolveArguments(message, 2)
    if args == False or (None in args):
        return await message.answer("⚠️ Используйте: /sysban @username [Причина]")

    mention, reason = args

    user = await resolveResources(mention)
    if user == None:
        return await message.answer("⚠️ Данного пользователя не существует. Введите корректный юзернейм!")


    is_admin = tech_db.get_admin_info(str(user.id))
    if is_admin != None:
        return await message.answer("⚠️ Вы не можете выдать системный бан агенту поддержки.")

    if tech_db.is_sysban(str(user.id)):
        return await message.answer("❌ У данного пользователя уже есть системный бан!")

    executor = await get_user_info(message.from_id)
    await message.answer(
        "🔱 "
        f"{get_full_name(executor)}"
        f" выдал системный бан "
        f"{get_full_name(user)}\n\n"
        f"Теперь пользователь не сможет пользоваться ботом."
    )

    tech_db.sysban(
        "add",
        str(user.id),
        reason
    )

@bot.on.message(IsCommand="sysunban")
async def sysunban_message(message: Message):
    if tech_db.is_sysban(message.from_id):
        return
    user_id, chat_id = str(message.from_id), str(message.chat_id)
    
    admin = tech_db.get_admin_info(user_id)
    if admin is None:
        return

    if not admin["dostup"]["sysunban"]:
        return

    args = resolveArguments(message, 1)
    if args == False or (None in args):
        return await message.answer("⚠️ Используйте: /sysunban @username")

    mention = args[0]
    user = await resolveResources(mention)
    if user == None:
        return await message.answer("⚠️ Данного пользователя не существует. Введите корректный юзернейм!")


    # is_admin = tech_db.get_admin_info(str(user.id))
    # if is_admin != None:
    #     return await message.answer("⚠️ Вы не можете выдать системный бан агенту поддержки.")

    if not tech_db.is_sysban(str(user.id)):
        return await message.answer("❌ У данного пользователя нет системного бана!")

    executor = await get_user_info(message.from_id)
    await message.answer(
        "🔱 "
        f"{get_full_name(executor)}"
        f" СНЯЛ системный бан "
        f"{get_full_name(user)}\n\n"
        f"Теперь пользователь может пользоваться ботом."
    )

    tech_db.sysban(
        "delete",
        str(user.id)
    )

@bot.on.message(IsCommand="sysrole")
async def sysrole_message(message: Message):
    if tech_db.is_sysban(message.from_id):
        return
    user_id, chat_id = str(message.from_id), str(message.peer_id)
    
    admin = tech_db.get_admin_info(user_id)
    if admin is None:
        return

    if not admin["dostup"]["sysrole"]:
        return

    args = resolveArguments(message, 2)
    if args == False or (None in args):
        return await message.answer("⚠️ Используйте: /sysrole @username [Приоритет роли]")
    
    mention, role_priority = args

    user = await resolveResources(mention)
    if user == None:
        return await message.answer("⚠️ Данного пользователя не существует. Введите корректный юзернейм!")


    if role_priority not in database[chat_id]["standart_roles"]:
        return await message.answer("⚠️ В данном чате нет роли с таким приоритетом!")


    executor = {
        "role": int(database[str(chat_id)]['roles'].get(str(message.from_id), 0)),
        "name": database[str(chat_id)]['nicknames'].get(str(message.from_id), 0)
    }

    if executor['role'] < int(role_priority):
        return await message.answer("⚠️ Вы не можете выдать роль с приоритетом, выше вашего.")

    target = {
        "role": int(database[str(chat_id)]['roles'].get(str(user.id), 0)),
        "name": database[str(chat_id)]['nicknames'].get(str(user.id), 0)
    }

    executor["user"] = await get_user_info(message.from_id)
    target["user"] = await get_user_info(user.id)

    await message.answer(
        "✅ "
        f"{get_full_name(executor['user'])}"
        f" изменил роль "
        f"{get_full_name(target['user'])}\n\n"
        f"{get_user_role(chat_id, user.id)} >> {get_role_name(chat_id, role_priority)}"
    )
    
    database[str(chat_id)]["roles"][str(user.id)] = int(role_priority)
    DB.save(database)


    







def parse_args(args: str):
    match_ = re.match(r"(\d+)(\D)", args.lower().strip())
    seconds = None
    
    if match_:
        value, unit = int(match_.group(1)), match_.group(2)
        match unit:
            case "s": seconds = value
            case "m": seconds = value * 60
            case "h": seconds = value * 3600
            case "d": seconds = value * 86400
            case _:
                seconds = None

    
    return seconds




# Команда для удаления сообщений
@bot.on.message(IsCommand="del")
async def delete_messages_handler(message: Message, count: str = None, mention: str = None):
    if tech_db.is_sysban(message.from_id):
        return
    chat_id = message.peer_id
    if not database['chats'].get(str(chat_id), {}).get('is_active', False):
        return await message.answer("❌ Беседа не активирована. Введите команду /start для активации.")

    if not await is_bot_admin(chat_id):
        database["chats"][str(chat_id)]["is_active"] = False
        DB.save(database)
        return await message.answer("❌ Я не являюсь администратором в данной беседе.\n\nБеседа деактивирована. Для активации беседы используйте: /start")
    
    if not is_user_need_priority(chat_id, message.from_id, "del"):
        return await message.answer(f"⚠️ Ваша роль слишком мала для использования данной команды :(")

    if not message.reply_message:
        return
    
    message_id = message.reply_message.conversation_message_id
    await bot.api.messages.delete(peer_id=chat_id, cmids=message_id, delete_for_all=True)
    await bot.api.messages.delete(peer_id=chat_id, cmids=message.conversation_message_id, delete_for_all=True)

@bot.on.message(IsCommand="profile")
@bot.on.message(IsCommand="профиль")
async def profile_message(message: Message):
    if tech_db.is_sysban(message.from_id):
        return
    
    chat_id = message.peer_id
    if not database['chats'].get(str(chat_id), {}).get('is_active', False):
        return await message.answer("❌ Беседа не активирована. Введите команду /start для активации.")

    args = resolveArguments(message, 1)
    mention = None
    target_user_id = message.from_id
    
    if args != False:
        if not is_user_need_priority(chat_id, message.from_id, "profile"):
            return await message.answer(f"⚠️ Ваша роль слишком мала для использования данной команды :(")
        mention = args[0]
        user = await resolveResources(mention)
        if user:
            target_user_id = user.id

    # Получаем информацию о пользователе
    user = await get_user_info(target_user_id)
    if user is None:
        return await message.answer("❌ Не удалось получить информацию о пользователе")

    # Проверяем профиль
    if str(target_user_id) not in profiles:
        profiles[str(target_user_id)] = {
            "stats": {
                "balance": 0,
                "vip": 0
            }
        }
        profiles_save()

    # Получаем роль
    role = get_user_role(chat_id, target_user_id)
    
    # Проверяем бан
    is_banned = str(target_user_id) in database.get(str(chat_id), {}).get('bans', {})
    ban_info = ""
    if is_banned:
        ban_end = datetime.fromisoformat(database[str(chat_id)]['bans'][str(target_user_id)]['end_time'])
        ban_info = f"🔴 Забанен до {ban_end.strftime('%Y-%m-%d %H:%M')}\n"

    # Проверяем мут
    is_muted = str(target_user_id) in database.get(str(chat_id), {}).get('mutes', {})
    mute_info = ""
    if is_muted:
        mute_end = datetime.fromisoformat(database[str(chat_id)]['mutes'][str(target_user_id)]['end_time'])
        mute_info = f"🔇 Замучен до {mute_end.strftime('%Y-%m-%d %H:%M')}\n"

    # Проверяем репорты
    reports_count = len(tech_db.get_user_reports(target_user_id))
    reports_info = f"📝 Репортов: {reports_count}\n"
    if tech_db.is_banreport(target_user_id):
        reports_info += "🔴 Бан репортов\n"

    # Проверяем системный бан
    sysban_info = ""
    if tech_db.is_sysban(target_user_id):
        sysban_info = "⛔ Системный бан\n"

    # Получаем ник
    nickname = database[str(chat_id)]['nicknames'].get(str(target_user_id), "Не установлен")

    # Формируем сообщение
    profile_text = (
        f"📌 Профиль пользователя {get_full_name(user)}\n\n"
        f"🏷 Ник: {nickname}\n"
        f"👑 Роль: {role}\n"
        f"💰 Баланс: {profiles[str(target_user_id)]['stats']['balance']} руб.\n"
        f"🌟 VIP: {profiles[str(target_user_id)]['stats']['vip']}\n\n"
        f"{ban_info}"
        f"{mute_info}"
        f"{reports_info}"
        f"{sysban_info}"
    )

    await message.answer(profile_text)

@bot.on.message(IsCommand="givemoney")
async def givemoney_message(message: Message, mention: str = None, money: int = None):
    if tech_db.is_sysban(message.from_id):
        return
    user_id, chat_id = str(message.from_id), str(message.peer_id)
    
    admin = tech_db.get_admin_info(user_id)
    if admin is None:
        return

    if not admin["dostup"]["sysrole"]:
        return

    args = resolveArguments(message, 2)
    if args == False or (None in args):
        return await message.answer("⚠️ Используйте: /givemoney @username [Кол-во]")
    
    mention, money = args

    user = await resolveResources(mention)
    if user == None:
        return await message.answer("⚠️ Данного пользователя не существует. Введите корректный юзернейм!")

    if str(user.id) not in profiles:
        profiles[str(user.id)] = {
            "stats": {
                "balance": 0,
                "vip": 0
            }
        }
        profiles_save()

    profiles[str(user.id)]["stats"]["balance"] += int(money)
    profiles_save()

    return await message.answer(f"📈 Баланс {get_full_name(user)} пополнен на {money} рублей.\n\nТекущий баланс: {profiles[str(user.id)]['stats']['balance']}")

@bot.on.message(IsCommand="givevip")
async def givevip_message(message: Message):
    if tech_db.is_sysban(message.from_id):
        return
    user_id, chat_id = str(message.from_id), str(message.peer_id)
    
    admin = tech_db.get_admin_info(user_id)
    if admin is None:
        return

    if not admin["dostup"]["givevip"]:
        return

    args = resolveArguments(message, 2)
    if args == False or (None in args):
        return await message.answer("⚠️ Используйте: /givevip @username [Кол-во]")
    
    mention, vip = args

    user = await resolveResources(mention)
    if user == None:
        return await message.answer("⚠️ Данного пользователя не существует. Введите корректный юзернейм!")

    if str(user.id) not in profiles:
        profiles[str(user.id)] = {
            "stats": {
                "balance": 0,
                "vip": 0
            }
        }
        profiles_save()

    profiles[str(user.id)]["stats"]["vip"] = int(vip)
    profiles_save()

    return await message.answer(f"📈 VIP {get_full_name(user)} изменен на {vip}\n\nТекущий VIP: {profiles[str(user.id)]['stats']['vip']}")

@bot.on.message(IsCommand="minet")
async def minet_message(message: Message):
    if tech_db.is_sysban(message.from_id):
        return

    args = resolveArguments(message, 1)
    if args == False:
        user = await get_user_info(message.from_id)
        return await message.answer(f"🍌 {get_full_name(user)} сделал(-а) себе самоотсос.")

    mention = args[0]

    user_admin = await get_user_info(message.from_id)
    user = await resolveResources(mention)
    return await message.answer(f"🍌 {get_full_name(user_admin)} сделал(-а) {get_full_name(user)} глубокий минет")

@bot.on.message(IsCommand="unman")
async def unman_message(message: Message):
    if tech_db.is_sysban(message.from_id):
        return

    args = resolveArguments(message, 1)
    if args == False:
        user = await get_user_info(message.from_id)
        return await message.answer(f"✂️ {get_full_name(user)} кастрировал себя")

    mention = args[0]
    print(mention)

    user_admin = await get_user_info(message.from_id)
    user = await resolveResources(mention)
    return await message.answer(f"✂️ {get_full_name(user_admin)} кастрировал {get_full_name(user)}")


@bot.on.message()
async def check_mute_status(message: Message):
    if tech_db.is_sysban(message.from_id):
        return
    user_id = message.from_id
    chat_id = message.peer_id

    if str(chat_id) in database["chats"]:
        if str(user_id) in database[str(chat_id)]['mutes']:
            end_time = datetime.fromisoformat(database[str(chat_id)]['mutes'][str(user_id)]['end_time'])
            if end_time > datetime.now():
                await bot.api.messages.delete(peer_id=chat_id, cmids=message.conversation_message_id, delete_for_all=True)


bot.run_forever()