from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

class Map(models.Model):
    name = models.CharField(max_length=100)
    width = models.PositiveIntegerField()
    height = models.PositiveIntegerField()

    def __str__(self):
        return self.name

class Battle(models.Model):
    name = models.CharField(max_length=100)
    is_finished = models.BooleanField(default=False)
    map = models.ForeignKey(Map, on_delete=models.PROTECT, related_name="battles")

    current_turn = models.ForeignKey("Entity", on_delete=models.SET_NULL, null=True, blank=True, related_name="current_turn_in_battles")

    @property
    def alive_entities(self):
        return self.entities.filter(hp__gt=0)

    def __str__(self):
        return self.name

class Weapon (models.Model):
    name = models.CharField(max_length=100)
    damage = models.PositiveIntegerField(default=10)

    burst_size = models.PositiveIntegerField(default=1)
    magazine_size = models.PositiveIntegerField(default=10)

    def __str__(self):
        return self.name
    
class Entity (models.Model):

    ENTITY_TYPES = [
        ("player", "Player"),
        ("enemy", "Enemy"),
        ("npc", "NPC"),
    ]

    name = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=20, choices=ENTITY_TYPES)

    hp = models.IntegerField()
    max_hp = models.IntegerField()

    strength = models.PositiveSmallIntegerField(
        default=10, 
        validators=[
            MinValueValidator(1),
            MaxValueValidator(20),
        ],
    )
    
    dexterity = models.PositiveSmallIntegerField(
            default=10, 
            validators=[
                MinValueValidator(1),
                MaxValueValidator(20),
            ],
        )
    
    initiative = models.IntegerField(default=0)
    
    x = models.PositiveIntegerField(default=0)
    y = models.PositiveIntegerField(default=0)

    start_x = models.PositiveIntegerField(default=0)
    start_y = models.PositiveIntegerField(default=0)

    main_actions = models.PositiveSmallIntegerField(default=1)
    bonus_actions = models.PositiveSmallIntegerField(default=1)

    weapon = models.ForeignKey(Weapon, on_delete=models.SET_NULL, null=True, blank=True, related_name="owners")
    ammo = models.PositiveIntegerField(default=0)
    weapon_jammed = models.BooleanField(default=False)

    battle = models.ForeignKey(Battle, on_delete=models.CASCADE, related_name="entities")

    def __str__(self):
        return self.name
    
class Obstacle (models.Model):
    battle = models.ForeignKey(Battle, on_delete=models.CASCADE, related_name="obstacles")

    name = models.CharField(max_length=100)
    x = models.PositiveIntegerField(default=0)
    y = models.PositiveIntegerField(default=0)
    width =models.PositiveIntegerField(default=1)
    height =models.PositiveIntegerField(default=1)

    blocks_movement = models.BooleanField(default=True)
    blocks_shooting = models.BooleanField(default=True)

    def occupies_cell(self, x, y):
        return (
            self.x <= x < self.x + self.width
            and
            self.y <= y < self.y + self.height
        )
    
    def __str__(self):
        return self.name
    

class BattleLog(models.Model):
    battle = models.ForeignKey(Battle, on_delete=models.CASCADE, related_name="logs")

    actor = models.ForeignKey(Entity, on_delete=models.SET_NULL, null=True, blank=True, related_name="performed_logs")
    target = models.ForeignKey(Entity, on_delete=models.SET_NULL, null=True, blank=True, related_name="received_logs")

    action_type = models.CharField(max_length=50)
    message = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    details = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return self.message