from django.contrib import admin
from django.urls import path
from .views import battle_view, damage_entity, heal_entity, move_entity, end_turn, shoot_entity, restart_battle, reload_ammo, unjam_weapon, create_obstacle, delete_obstacle

urlpatterns = [
    path('battle/<int:battle_id>/', battle_view, name="battle"),
    path('entities/<int:entity_id>/damage/', damage_entity, name="damage_entity"),
    path('entities/<int:entity_id>/heal/', heal_entity, name="heal_entity"),
    path('entities/<int:entity_id>/move/', move_entity, name = "move_entity"),
    path('battle/<int:battle_id>/end_turn/', end_turn, name ="end_turn"),
    path('entities/<int:shooter_id>/shoot/', shoot_entity, name ="shoot_entity"),
    path('battle/<int:battle_id>/restart/', restart_battle, name = "restart_battle"),
    path('entities/<int:entity_id>/reload/', reload_ammo, name = "reload_ammo"),
    path('entities/<int:entity_id>/unjam/', unjam_weapon, name = "unjam_weapon"),
    path('battle/<int:battle_id>/obstacles/create/', create_obstacle, name = "create_obstacle"),
    path('obstacles/<int:obstacle_id>/delete/', delete_obstacle, name = "delete_obstacle")
]