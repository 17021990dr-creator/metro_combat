from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404, redirect
from .models import Battle, Entity, Obstacle, BattleLog
import random 


def battle_view(request, battle_id):

    battle = get_object_or_404(Battle, id = battle_id)

    rows = range(battle.map.height)
    columns = range(battle.map.width)

    entities = battle.entities.all()

    players = entities.filter(entity_type = "player")
    enemies = entities.filter(entity_type = "enemy")
    npcs = entities.filter(entity_type = "npcs")
    
    context = {

        "battle": battle,
        "entities": entities,
        "obstacles": battle.obstacles.all(),
        "rows":rows,
        "columns":columns,
        "players":players,
        "enemies":enemies,
        "npcs":npcs,

    }
    

    return render(request, "combat/battle.html", context)


def damage_entity(request, entity_id):

    entity = get_object_or_404(Entity, id = entity_id)
    
    if request.method != "POST":
        return JsonResponse(
            {"error":"Разрешен только пост запрос"},
            status=405,
        )
    try:
        damage = int(request.POST["damage"])
    except(KeyError, ValueError):
        return JsonResponse(
            {"error":"Урон должен быть целым числом"},
            status=400,
        )
    if damage<=0:
        return JsonResponse(
            {"error": "Урон должен быть больше нуля"},
            status=400,
        )
    
    entity.hp = max(0, entity.hp - damage)
    entity.save(update_fields=["hp"])
    return JsonResponse({
        "success": True,
        "entity_id":entity.id,
        "new_hp": entity.hp,
        "is_dead": entity.hp <=0,
        "max_hp": entity.max_hp,
        
    })
    
    
    


def heal_entity(request, entity_id):
    entity = get_object_or_404(Entity, id = entity_id)
    is_dead = entity.hp <=0

    if request.method != "POST":
        return JsonResponse(
            {"error":"запрос должен быть POST"},
            status=405
            )
    try:
        heal = int(request.POST["heal"])
    except (KeyError, ValueError):
        return JsonResponse(
            {"error":"Введите корректное целое число"},
            status=400
        )

    if heal <=0:
        return JsonResponse(
            {"error":"число должно быть положительным"},
            status=400
        )

        
    entity.hp = min(entity.max_hp, entity.hp + heal)
    entity.save(update_fields=["hp"])

    return JsonResponse({
        "success":True,
        "entity_id": entity.id,
        "new_hp" : entity.hp,
        "max_hp": entity.max_hp,
        "is_reborn":is_dead and entity.hp>0,

    })


def move_entity(request, entity_id):
    entity = get_object_or_404(Entity, id = entity_id)

    if request.method != "POST":
        return JsonResponse(
            {"error":"запрос должен быть POST"},
            status=405
            )
    if entity.hp <= 0:
            return JsonResponse(
                {"error":"Сущнность мертва"},
                status=400,
            )   
    if entity_id != entity.battle.current_turn_id:
        return JsonResponse(
            {"error": "Сейчас ход другой сущности"},
            status=403,
        )
    
    try:
        new_x = int(request.POST["new_x"])
        new_y = int(request.POST["new_y"])
    except(KeyError, ValueError):
        return JsonResponse(
            {"error":"координаты должны быть целыми числами"},
            status=400
            )
    
    if not (0 <= new_x < entity.battle.map.width and 0 <= new_y < entity.battle.map.height):
        return JsonResponse(
            {"error": "координаты не должны выходить за рамки игрового поля"},
            status = 400
        )
    if Entity.objects.filter(battle=entity.battle, x=new_x, y = new_y).exclude(id = entity.id).exists():
        return JsonResponse(
            {"error": "Эта клетка уже занята другой сущностью"},
            status = 400
        )
    movement_obstacles = entity.battle.obstacles.filter(
    blocks_movement=True
)

    for obstacle in movement_obstacles:
        if obstacle.occupies_cell(new_x, new_y):
            return JsonResponse(
                {"error": "На этой клетке стоит непроходимое препятствие"},
                status=400,
            )
        
    if not remove_action_points(entity, "bonus"):
                return JsonResponse(
                    {"error": "Отсутсвует очко дополнительного действия"},
                    status=403,
                )
    
    
    entity.x = new_x
    entity.y = new_y
    entity.save(update_fields=["x", "y"])

    
    message = f"{entity.name} перемещается на клетку [{new_x}, {new_y}].\n"
    
        
    
    log = BattleLog.objects.create(
        battle = entity.battle,
        actor = entity,
        target = None,
        action_type = "move",
        message = message,
        details={
            "new_x":entity.x,
            "new_y":entity.y,
        },
    )

    return JsonResponse({
        "success" : True,
        "entity_id":entity.id,
        "new_x":entity.x,
        "new_y":entity.y,
        "bonus_actions":entity.bonus_actions,
        "log":{
            "id":log.id,
            "action_type": log.action_type,
            "actor_name": entity.name,
            "target_name": None,
            "message":message,
        }
    })


def end_turn(request, battle_id):
    battle = get_object_or_404(Battle, id=battle_id)
    
    previous_turn_id = battle.current_turn_id

    if request.method != "POST":
        return JsonResponse (
            {"error":"запрос должен быть POST"},
            status = 405,
            )

    if not battle.alive_entities.exists():
        return JsonResponse(
            {"error":"Нет живих сущностей в битве"},
            status=400
        )
    
    entities = list(
        battle.entities.order_by("-initiative", "id")
    )
    
    if not entities:
        return JsonResponse(
            {"error":"В этом бою нет сущностей"},
            status=400,
        )

    if battle.current_turn is None:
        battle.current_turn =  entities[0]
        entity = entities[0]

    elif battle.id != battle.current_turn.battle.id:
        battle.current_turn =  entities[0]
        entity = entities[0]

    else:
        i = 0
        while i < len(entities):
            if entities[i] == battle.current_turn:
                battle.current_turn =  entities[(i+1)%len(entities)]
                entity = entities[(i+1)%len(entities)]
                
                if(entity.hp <=0):
                    i=(i+1)%len(entities)
                    continue
                else:
                    break
            i=(i+1)%len(entities)
            
    
    entity.main_actions = 1
    entity.bonus_actions = 1

    entity.save(update_fields=["main_actions", "bonus_actions"])
    
    battle.save(update_fields=["current_turn"]) 

    

    return JsonResponse({
        "success": True,
        "battle_id": battle.id,
        "current_turn_id":battle.current_turn.id,
        "current_turn_name":battle.current_turn.name,
        "main_actions":entity.main_actions,
        "bonus_actions":entity.bonus_actions,
        "previous_turn_id": previous_turn_id,
        
    })


def shoot_entity(request, shooter_id):

    if request.method != "POST":
            return JsonResponse (
                {"error":"запрос должен быть POST"},
                status = 405,
                )

    shooter = get_object_or_404(Entity, id=shooter_id)

    try:
        target_id = int(request.POST["target_id"])
        fire_mode = request.POST["fire_mode"]
    except(KeyError, ValueError):
        return JsonResponse(
            {"error": "Некоректная цель"},
            status=400,
        )

    if fire_mode not in ("normal", "overdrive"):
         return JsonResponse(
            {"error": "Неизвестный режим стрельбы"},
            status=400,
        )
    if fire_mode == "overdrive" and shooter.ammo <= shooter.weapon.burst_size:
        return JsonResponse(
            {"error": "Недостаточно патронов для разгона"},
            status=400,
        )

    if shooter.weapon_jammed:
         return JsonResponse(
                     {"error": "Оружие заклинило"},
                     status=400,
                 )

    target = get_object_or_404(Entity, id=target_id)
    

    if shooter.battle_id != target.battle_id:
        return JsonResponse(
            {"error": "Цель выбрана не коректно"},
            status=400,
        )
    if shooter.battle.current_turn_id != shooter.id:
        return JsonResponse(
            {"error":"Сейчас ход другой сущности"},
            status=400,
        )
    if shooter == target:
        return JsonResponse(
            {"error":"Цель не может поразить себя"},
            status=400,
        )
    if shooter.entity_type == target.entity_type and shooter.entity_type != "npc" and target.entity_type!="npc":
        return JsonResponse(
            {"error":"Нельзя поразить союзников"},
            status=400,
        )
    if shooter.hp <= 0:
            return JsonResponse(
                {"error":"Стрелок мертв"},
                status=400,
            )
    if target.hp <= 0:
        return JsonResponse(
            {"error":"Выбранная цель уже мертва"},
            status=400,
        )
    if shooter.weapon is None:
        return JsonResponse(
            {"error":"У стрелка отсутствует оружие"},
            status=400,
        )
    if shooter.ammo <=0:
            return JsonResponse(
                {"error":"В магазине нет патронов"},
                status=400,
            )
    if not remove_action_points(shooter, "main"):
            return JsonResponse(
                {"error": "Отсутсвует очко основного действия"},
                status=403,
            )

    overdrive_roll = None
    overdrive_success = None
    burst_count = 1

    if fire_mode == "overdrive":
        overdrive_roll, overdrive_success =  make_chek(shooter.dexterity)

        if overdrive_success:
            burst_count = 2
        else:
            burst_count=1
            shooter.weapon_jammed = True

    
    hit_roll, hit = make_chek(shooter.strength)
    count_of_bullets = 0 
    bullets_per_burst = []

    for i in range(burst_count):
        max_bullets = min(shooter.ammo, shooter.weapon.burst_size)
        bullets = random.randint(1,max_bullets)
        shooter.ammo -= bullets
        bullets_per_burst.append(bullets)
        count_of_bullets += bullets

    damage = shooter.weapon.damage * count_of_bullets if hit else 0

    
    shooter.save(update_fields=["ammo", "weapon_jammed"])

    winner = None
    if hit:
        target.hp = max(0,target.hp - damage)
        target.save(update_fields=["hp"])

        winner = get_battle_result(shooter.battle)
        if winner is not None:
            shooter.battle.is_finished = True
            shooter.battle.save(update_fields=["is_finished"])

    message = f"{shooter.name} стреляет в {target.name}.\n"

    if fire_mode == "overdrive":
        message += (
            f"Режим: разгон оружия.\n"
            f"Проверка ловкости: {overdrive_roll}/{shooter.dexterity} — "
            f"{'УСПЕХ' if overdrive_success else 'ПРОВАЛ'}.\n"
        )

        if not overdrive_success:
            message += "Оружие заклинило.\n"

    else:
        message += "Режим: обычная стрельба.\n"

    message += (
        f"Проверка силы: {hit_roll}/{shooter.strength} — "
        f"{'ПОПАДАНИЕ' if hit else 'ПРОМАХ'}.\n"
        f"Выпущено пуль: {count_of_bullets}.\n"
        f"Нанесено урона: {damage}."
    )

    log = BattleLog.objects.create(
            battle = shooter.battle,
            actor = shooter,
            target = target,
            action_type = "shoot",
            message = message,
            details={
                "fire_mode": fire_mode,

                "strength_roll": hit_roll,
                "strength": shooter.strength,
                "hit": hit,

                "overdrive_roll": overdrive_roll,
                "dexterity": shooter.dexterity,
                "overdrive_success": overdrive_success,

                "number_of_bullets": count_of_bullets,
                "damage": damage,

                "weapon_jammed": shooter.weapon_jammed,
            },
        )

    return JsonResponse({
            "success":True,

            "fire_mode":fire_mode,

            "hit_roll":hit_roll,
            "hit":hit,
            "strength":shooter.strength,
            "dexterity":shooter.dexterity,

            "damage":damage,

            "shooter_id": shooter.id,
            "shooter_ammo":shooter.ammo,
            "main_actions": shooter.main_actions,
            "weapon_jammed": shooter.weapon_jammed,

            "target_id":target.id,
            "target_new_hp" : target.hp,
            "target_is_dead": target.hp <= 0,

            
            "battle_finished":winner is not None,
            "winner":winner,

            "count_of_bullets":count_of_bullets,
            "burst_count":burst_count,
            "bullets_per_burst":bullets_per_burst,

            "overdrive_success":overdrive_success,
            "overdrive_roll":overdrive_roll,

            "log":{
                "id":log.id,
                "action_type": log.action_type,
                "actor_name": shooter.name,
                "target_name": target.name,
                "message":message,
            }
            
    
        })


def remove_action_points(entity, action_type):
    if action_type == "bonus":
        if entity.bonus_actions <= 0 :
            return False
        
        entity.bonus_actions = entity.bonus_actions-1
        entity.save(update_fields=["bonus_actions"])

        return True
    
    elif action_type == "main":
        if entity.main_actions <= 0:
            return False
        
        entity.main_actions = entity.main_actions-1
        entity.save(update_fields=["main_actions"])

        return True

def make_chek(stat):
    roll = random.randint(1,20)
    success = roll <= stat
    return roll, success


def get_battle_result(battle):
    players_alive = battle.alive_entities.filter(entity_type = "player").exists()

    enemies_alive = battle.alive_entities.filter(entity_type = "enemy").exists()

    if not players_alive:
        return "enemies"
    if not enemies_alive:
        return "players"
    return None

def restart_battle(request, battle_id):
    battle = get_object_or_404(Battle, id = battle_id)

    if request.method != "POST":
        return JsonResponse (
            {"error":"запрос должен быть POST"},
            status = 405,
        )

    entities = list(battle.entities.order_by("-initiative", "id"))

    if not entities:
        return JsonResponse(
            {"error":"В бою нет существ"},
            status=400,
        )

    for entity in entities:
        if(entity.x is None or entity.y is None):
            return JsonResponse(
                {"error": "Не заданы начальные координаты"},
                status=400
            )
        entity.hp = entity.max_hp
        entity.main_actions = 1
        entity.bonus_actions = 1
        entity.x = entity.start_x
        entity.y = entity.start_y
        if entity.weapon is not None:
             entity.ammo = entity.weapon.magazine_size
             entity.weapon_jammed = False

    Entity.objects.bulk_update(entities, ["hp", "main_actions", "bonus_actions", "x", "y", "ammo", "weapon_jammed"])
    battle.is_finished = False
    battle.current_turn = entities[0]
    battle.save(update_fields=["is_finished", "current_turn"])

    return JsonResponse({
        "success": True,
        "battle_id" : battle.id,
        "current_turn_id" : battle.current_turn_id,
    })

def reload_ammo(request, entity_id):
    entity = get_object_or_404(Entity, id=entity_id)

    if request.method != "POST":
            return JsonResponse (
                {"error":"запрос должен быть POST"},
                status = 405,
            )
    if entity.weapon is None:
            return JsonResponse (
                {"error":"Отсутствует оружие"},
                status = 400,
            )
    if entity.ammo == entity.weapon.magazine_size:
                return JsonResponse (
                    {"error":"Магазин полон"},
                    status = 400,
                )
    if entity.id != entity.battle.current_turn_id:
        return JsonResponse (
            {"error":"Сейчас ход другой сущности"},
            status = 400,
        )
    if entity.hp <= 0:
        return JsonResponse (
            {"error":"Сущность мертва"},
            status = 400,
        )
    if entity.battle.is_finished:
            return JsonResponse (
                {"error":"Бой окончен"},
                status = 400,
            )
    if not remove_action_points(entity, "main"):
                return JsonResponse(
                    {"error": "Отсутсвует очко основного действия"},
                    status=403,
                )

    entity.ammo = entity.weapon.magazine_size
    entity.save(update_fields=["ammo"])

    log = BattleLog.objects.create(
            battle = entity.battle,
            actor = entity,
            target = None,
            action_type = "reload",
            message = F"{entity.name} перезарядил оружие.",
            details={
                "ammo":entity.ammo,
            },
        )

    return JsonResponse({
        "success":True,
        "entity_id":entity.id,
        "entity_ammo":entity.ammo,
        "main_actions": entity.main_actions,
        "log":{
            "log_id":log.id,
            "actor_id":entity.id,
            "action_type":log.action_type,
            "message":log.message,
        }
    })


def unjam_weapon(request, entity_id):
    entity = get_object_or_404(Entity, id=entity_id)

    if request.method != "POST":
            return JsonResponse (
                {"error":"запрос должен быть POST"},
                status = 405,
            )
    if entity.weapon is None:
            return JsonResponse (
                {"error":"Отсутствует оружие"},
                status = 400,
            )
    if entity.id != entity.battle.current_turn_id:
        return JsonResponse (
            {"error":"Сейчас ход другой сущности"},
            status = 400,
        )
    if entity.hp <= 0:
        return JsonResponse (
            {"error":"Сущность мертва"},
            status = 400,
        )
    if entity.battle.is_finished:
            return JsonResponse (
                {"error":"Бой окончен"},
                status = 400,
            )
    if not entity.weapon_jammed:
         return JsonResponse(
                {"error": "Оружие не заклинено"},
                status=403,
                         )
    if not remove_action_points(entity, "main"):
                return JsonResponse(
                    {"error": "Отсутсвует очко основного действия"},
                    status=403,
                )

    unjamed_roll, unjamed_success = make_chek(entity.dexterity)
    if unjamed_success:
        entity.weapon_jammed = False
        entity.save(update_fields=["weapon_jammed"])

    message = (
                F"{entity.name} пытается расклинить оружие.",
                f"Проверка ловкости: {unjamed_roll}/{entity.dexterity}."
                f"{'Успешно расклинил' if unjamed_success else 'Провал'}"
            )
    log = BattleLog.objects.create(
        battle = entity.battle,
        actor = entity,
        target = None,
        action_type = "unjam",
        message = message,
        details={
            "weapon_jammed":entity.weapon_jammed,
        },

    )

    return JsonResponse({
        "success":True,
        "entity_id":entity.id,
        "dexterity":entity.dexterity,
        "unjamed_roll":unjamed_roll,
        "unjamed_success":unjamed_success,
        "weapon_jammed":entity.weapon_jammed,
        "main_actions": entity.main_actions,
        "log":{
                    "log_id":log.id,
                    "actor_id":entity.id,
                    "action_type":log.action_type,
                    "message":log.message,
                }
    })


def create_obstacle(request, battle_id):
     battle = get_object_or_404(Battle, id = battle_id)
     if request.method != "POST":
                 return JsonResponse (
                     {"error":"запрос должен быть POST"},
                     status = 405,
                 )
     try:
          x = int(request.POST['x'])
          y = int(request.POST['y'])
          width = int(request.POST['width'])
          height = int(request.POST['height'])
     except(KeyError, ValueError):
          return JsonResponse(
            {"error": "Некорректные данные препятствия"},
            status=400,
        )
     if width <=0 or height <=0:
          return JsonResponse(
            {"error": "Размер препятствия должен быть больше нуля"},
            status=400,
        )
     if(x <0 or y < 0 or x + width > battle.map.width or y + height > battle.map.height):
          return JsonResponse(
            {"error": "Препятствие выходит за границы карты"},
            status=400,
        )
     obstacle = Obstacle.objects.create(
            battle = battle,
            name = "Стена",
            x = x,
            y = y,
            width =width,
            height = height,
            blocks_movement=True,
            blocks_shooting=True,
     )

     return JsonResponse({
        "success": True,
        "obstacle": {
            "id": obstacle.id,
            "name": obstacle.name,
            "x": obstacle.x,
            "y": obstacle.y,
            "width": obstacle.width,
            "height": obstacle.height,
            "blocks_movement": obstacle.blocks_movement,
            "blocks_shooting": obstacle.blocks_shooting,
        }
    })

def delete_obstacle(request, obstacle_id):
     obstacle = get_object_or_404(Obstacle, id = obstacle_id)
     if request.method != "POST":
                      return JsonResponse (
                          {"error":"запрос должен быть POST"},
                          status = 405,
                      )
     obstacle.delete()
     return JsonResponse({
          "success":True,
          "obstacle_id":obstacle_id,
     })