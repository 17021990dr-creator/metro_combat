function updateTargetAfterShot(data){
        const hpElement = document.getElementById(`entity-hp-${data.target_id}`);
        if(hpElement){
            hpElement.textContent=data.target_new_hp;
        }
        
    }


function updateWeaponState(entityId, weaponJammed){
        const weaponStateElement = document.getElementById(`state-weapon-${entityId}`);
        if(weaponJammed){
            weaponStateElement.textContent="ЗАКЛИНЕНО";
        }else{
            weaponStateElement.textContent="в норме";
        }
    }


function updateEntityAmmo(entityId, entityAmmo){
        const ammoElement = document.getElementById(`entity-ammo-${entityId}`);
        if(ammoElement){
            ammoElement.textContent = entityAmmo;
        }
    }


function updateFireModeElement(shooterId, fireMode){
        const fireModeElement = document.getElementById(`fire-mode-${shooterId}`);
        if(!fireModeElement){
            return;
        }
        if(fireMode === null){
            fireModeElement.textContent = "не выбран"
        }else if(fireMode === "normal"){
            fireModeElement.textContent = "обычный"
        }else if(fireMode === "overdrive"){
            fireModeElement.textContent = "разгон"
        }
    }


function updateEntityAfterMove(entityElement, data){
        const{
            new_x,
            new_y,
            entity_id,
        } = data;
        

        entityElement.dataset.x = new_x
        entityElement.dataset.y = new_y

        const coordinatesElement = document.getElementById(`entity-coordinates-${entity_id}`);
        if(coordinatesElement){
            coordinatesElement.textContent = `${new_x} , ${new_y}`;
        }

        entityElement.classList.remove("entity-selected");
        clearAvailableCells();
    }


function appendBattleLog(log){
        const logContainer = document.querySelector(".battle-log-list");
        if(!logContainer){
            return;
        }
        const newLog = document.createElement("div");
        newLog.classList.add("battle-log-item", `battle-log-${log.action_type}`);

        newLog.textContent = log.message;

        logContainer.append(newLog);

        logContainer.scrollTop = logContainer.scrollHeight;
    }


function updateActionPoints(entityId, mainActions, bonusActions){
        
        const mainElement = document.getElementById(`main-actions-${entityId}`);
        const bonusElement = document.getElementById(`bonus-actions-${entityId}`);
        
        if(mainElement && mainActions !== undefined){
            mainElement.textContent = mainActions;
            mainElement
            .closest(".action-point")
            ?.classList.toggle("spent", mainActions <= 0);
        }
        if(bonusElement && bonusActions !== undefined){
            bonusElement.textContent = bonusActions;

            bonusElement
            .closest(".action-point")
            ?.classList.toggle("spent", bonusActions <= 0);
        }
    }


function scrollToCurrentTurnCard(entityId, smooth){
        const battleSidebar = document.querySelector(".battle-sidebar");

        const card = document.getElementById(`entity-card-${entityId}`);
        if(!card || !battleSidebar){
            return;
        }

        battleSidebar.scrollTo({
            top: card.offsetTop - 60,
            behavior:smooth? "smooth": "auto",
        });
    }


function updateCurrentTurnCard(newTurnId){
        const previousTurnCard = document.querySelector(".selected-entity-card");
        if(previousTurnCard){
            previousTurnCard.classList.remove("selected-entity-card");
        }
        

        const currentTurnCard = document.getElementById(`entity-card-${newTurnId}`);
        if(!currentTurnCard){
            return;
        }
        
        currentTurnCard.classList.add("selected-entity-card");
    }


function markEntityAsDead(entityId){
        const card = document.getElementById(`entity-card-${entityId}`);
        const entityOnMap = document.querySelector(`.entity[data-entity-id="${entityId}"]`);

        if (card){
            card.classList.add("dead");
            card.dataset.isDead = "true";
        }

        if(entityOnMap){
            entityOnMap.classList.add("dead");
            entityOnMap.dataset.isDead = "true";
        }
    }


function markEntityAsAlive(entityId){
        const card = document.getElementById(`entity-card-${entityId}`);
        const entityOnMap = document.querySelector(`.entity[data-entity-id="${entityId}"]`);

        if (card){
            card.classList.remove("dead");
            card.dataset.isDead = "false";
        }
        
        if(entityOnMap){
            entityOnMap.classList.remove("dead");
            entityOnMap.dataset.isDead = "false";
        }
    }


function showBattleResult(winner){
        const battleState = document.querySelector(".battle-state");
        if(battleState){
            battleState.textContent="Бой завершен❌";
        }
        if(document.querySelector(".battle-result-overlay")){
            return;
        }

        const overlay = document.createElement("div");
        overlay.classList.add("battle-result-overlay");

        const resultWindow = document.createElement("div");
        resultWindow.classList.add("battle-result-window")

        const title = document.createElement("h2");
        title.textContent = "Бой завершен";

        const winnerText = document.createElement("p");
        if(winner === "players"){
            winnerText.textContent="Выйграли игроки"
        }else if(winner === "enemies"){
            winnerText.textContent="Победили враги"
        }else{
            winnerText.textContent="Ничья"
        }   

        const restartButton = document.createElement("button");
        restartButton.type="button";
        restartButton.classList.add("action-button", "restart-battle-button");
        restartButton.textContent="Запустить заново";

        resultWindow.append(title, winnerText, restartButton);
        overlay.append(resultWindow);
        document.body.append(overlay);

        document.body.classList.add("battle-modal-open");

        restartButton.addEventListener("click", async function (){
            const restartUrl = document.querySelector(".battle-layout").dataset.restartUrl;

            const data = await sendRestartBattleRequest(restartUrl);

            if(data === null){
                return;
            }

            window.location.reload();
        });
    }

function addObstacleToMap(obstacle){
    const objectLayer = document.querySelector(".object-layer");
    if(!objectLayer){
        return;
    }
  
    const obstacleElement = document.createElement("div");

    obstacleElement.classList.add("obstacle");
    obstacleElement.dataset.obstacleId = obstacle.id;
    obstacleElement.dataset.x =obstacle.x;
    obstacleElement.dataset.y =obstacle.y;
    obstacleElement.dataset.width=obstacle.width;
    obstacleElement.dataset.height=obstacle.height;
    
    
    if(obstacle.blocks_movement){

        obstacleElement.dataset.blocksMovement = "True";
    }else{
        obstacleElement.dataset.blocksMovement = "False";
    }
    

    obstacleElement.style.gridColumn = `${obstacle.x + 1} /span ${obstacle.width}`
    obstacleElement.style.gridRow = `${obstacle.y + 1} /span ${obstacle.height}`

    obstacleElement.textContent = obstacle.name;
    objectLayer.append(obstacleElement);
}

function removeObstacleFromMap(obstacleId){
    const obstacleElement = document.querySelector(`.obstacle[data-obstacle-id="${obstacleId}"]`);

    if (!obstacleElement){
        return;
    }

    obstacleElement.remove();
}