// ==================================================
// 1. STATE 
// ==================================================

const battleLayout = document.querySelector(".battle-layout");

let currentTurnId = battleLayout.dataset.currentTurnId
    ? Number(battleLayout.dataset.currentTurnId)
    : null;
let selectedEntityId = null;
let currentAction = null;
let currentFireMode = null;


// ==================================================
// 1.1 DOM
// ==================================================

const shootButtons = document.querySelectorAll(".fire-mode-button");
const reloadButtons = document.querySelectorAll(".reload-button");
const unjamButtons = document.querySelectorAll(".unjam-button");
const damageForms = document.querySelectorAll(".damage-form");
const healForms = document.querySelectorAll(".heal-form");
const moveForms = document.querySelectorAll(".move-form");
const entityElements = document.querySelectorAll(".entity");
const cells = document.querySelectorAll(".cell");
const endTurnButton = document.getElementById("end-turn-button");


// ==================================================
// 2. INITIALIZATION / EVENT LISTENERS
// ==================================================

document.addEventListener("DOMContentLoaded", () =>{
        if(currentTurnId!==null){
            updateCurrentTurnCard(currentTurnId);
            scrollToCurrentTurnCard(currentTurnId, false);
        }
    });

shootButtons.forEach(function(shootButton){ 
        
        shootButton.addEventListener('click', function(){
            if(currentTurnId === null){
                return;
            }
            
            const shooterId = Number(shootButton.dataset.shooterId);
            const fireMode = shootButton.dataset.fireMode;
            if(currentTurnId !== shooterId ){
                return;
            }
            if(currentAction === "shoot" && currentFireMode == fireMode ){
                clearCurrentAction();
                updateFireModeElement(shooterId, currentFireMode);
                clearSelectedEntity();
                return;
            }
            selectedEntityId = shooterId;
            currentAction = "shoot";
            currentFireMode = fireMode;
            clearSelectedEntity();
            clearAvailableCells();
            highlightShootTargets(shooterId);
            updateFireModeElement(shooterId, currentFireMode);
        });
        

    });

reloadButtons.forEach(function (button){
        button.addEventListener('click', async function(){
            if(Number(button.dataset.entityId) !== currentTurnId){
                return;
            }

            const reloadUrl = button.dataset.reloadUrl

            const data = await sendReloadRequest(reloadUrl);

            if (data === null){
                return;
            }
            appendBattleLog(data.log);
            updateEntityAmmo(data.entity_id, data.entity_ammo);
            updateActionPoints(data.entity_id, data.main_actions, undefined);

        });
    })

unjamButtons.forEach(function (unjamButton){
        unjamButton.addEventListener('click', async function(){
            if(Number(unjamButton.dataset.entityId) !== currentTurnId){
                return;
            }
            
            const unjamUrl = unjamButton.dataset.unjamUrl
            
            const data = await sendUnjamRequest(unjamUrl);

            if (data === null){
                return;
            }
            await animateCheck({
                        roll: data.unjamed_roll,
                        label:"Ловкость",
                        target:data.dexterity,
                        success:data.unjamed_success,

                    })
            appendBattleLog(data.log);
            updateWeaponState(data.entity_id, data.weapon_jammed);
            updateActionPoints(data.entity_id, data.main_actions, undefined);

        });
    })

damageForms.forEach(function (form){
        form.addEventListener("submit", async function (event) {
            event.preventDefault();

            const formData = new FormData(form);
            const errorElement = form.parentElement.querySelector(".damage-error");

            errorElement.textContent="";
            
            try{
                const response = await fetch(form.action, {method : "POST", body : formData});
                const data = await response.json()

                if(!response.ok){
                    errorElement.textContent = data.error;
                    return;
                }
                const hpElement = document.getElementById(
                    `entity-hp-${data.entity_id}`
                );
                hpElement.textContent = data.new_hp;
                if(data.is_dead){
                    markEntityAsDead(data.entity_id)
                }
                form.reset();

            }catch (error){
                errorElement.textContent = "Ошибка соединени с сервером";
                console.error(error);
            }
            

        });
    });

healForms.forEach(function (form){
        form.addEventListener("submit", async function(event){
            event.preventDefault();

            const formData = new FormData(form);
            const errorElement = form.parentElement.querySelector(".heal-error");

            errorElement.textContent="";
            
            try{
                const response = await fetch(form.action, {method : "POST", body:formData });
                const data = await response.json();

                if(!response.ok){
                    errorElement.textContent = data.error;
                    return;
                }
                if(data.is_reborn){
                    markEntityAsAlive(data.entity_id);
                }
                const hpElement = document.getElementById(`entity-hp-${data.entity_id}`);
                hpElement.textContent = data.new_hp;
                form.reset();
            }catch(error){
                errorElement.textContent = "Ошибка соединения с сервером";
                console.error(error);
            }
        });
    });

moveForms.forEach(function (form){
        form.addEventListener("submit", async function (event){
            event.preventDefault();

            const formData = new FormData(form);
            const errorElement = form.parentElement.querySelector(".move-error");

            errorElement.textContent = "";

            try{
                const response = await fetch( form.action, {method : "POST", body: formData});
                const data = await response.json();

                if(!response.ok){
                    errorElement.textContent = data.error;
                    return;
                }

                const coordinatesElement = document.getElementById(`entity-coordinates-${data.entity_id}`);
                coordinatesElement.textContent = `${data.new_x} , ${data.new_y}`;

                const selectedElement = document.querySelector(`[data-entity-id="${data.entity_id}"]`)

                await animateEntityMove(selectedElement, data.new_x, data.new_y)

                updateEntityAfterMove(selectedElement, data);

                form.reset();

            }catch(error){
                errorElement.textContent = "Ошибка соединения с сервером";
                console.error(error);
            }
        });
    });

entityElements.forEach(function (entityElement){
        entityElement.addEventListener("click", async function (){
            if(entityElement.dataset.isDead === "true"){
                return;
            }

            if(currentAction === "shoot"){
                if(!entityElement.classList.contains("entity-targetable")){
                    return;
                }

                const shooterElement = document.querySelector(`.entity[data-entity-id="${selectedEntityId}"]`);
                if(!shooterElement){
                    alert("Стрелок не найден на карте");
                    return;
                }
                const targetId = Number(entityElement.dataset.entityId);
                
                
                const shootUrl = shooterElement.dataset.shootUrl;

                const data = await sendShootRequest(shootUrl, targetId, currentFireMode);

                if(data === null){
                    clearCurrentAction();
                    return;
                }

                if(data.overdrive_roll !== null){
                    await animateCheck({
                        roll: data.overdrive_roll,
                        label:"Ловкость",
                        target:data.dexterity,
                        success:data.overdrive_success,

                    })
                }

                await animateCheck({
                        roll: data.hit_roll,
                        label:"Сила",
                        target:data.strength,
                        success:data.hit,

                    })

                await animateBurst(shooterElement, entityElement, data.bullets_per_burst, data.burst_count);
                updateEntityAmmo(data.shooter_id, data.shooter_ammo);
                appendBattleLog(data.log);
                if(data.hit){
                    animateTargetHit(entityElement);
                    updateTargetAfterShot(data);
                    await showCombatText(entityElement, `-${data.damage}`, "damage");
                }else{
                    await showCombatText(entityElement, "Промах", "miss");
                }
                if(data.target_is_dead){
                    markEntityAsDead(targetId);
                }
                
                updateActionPoints(data.shooter_id, data.main_actions, undefined);
                updateWeaponState(data.shooter_id, data.weapon_jammed);

                clearCurrentAction();
                updateFireModeElement(data.shooter_id, currentFireMode);
                clearSelectedEntity();
                clearAvailableCells();
                selectedEntityId=null;
                if(data.battle_finished){
                    showBattleResult(data.winner);
                }
                return;
            }
            
            const entityId = Number(entityElement.dataset.entityId);

            if (entityId !== currentTurnId) {
                alert("Сейчас ход другой сущности");
                return;
            }
            
            clearSelectedEntity();
            
            entityElement.classList.add("entity-selected");
            highlightAvailableCells(entityElement);

            selectedEntityId = Number(entityElement.dataset.entityId);

            
            
        });
    });

cells.forEach(function (cell){
        cell.addEventListener("click", async function () {
            
            if(currentAction == "shoot"){
                return;
            }

            if (selectedEntityId === null) {
                console.log("Перемещение отменено: сущность не выбрана");
                return;
            }

            if(!cell.classList.contains("cell-available")){
                alert("Область вне радиуса движения");
                return;
            }


            const selectedElement = document.querySelector(".entity-selected");

            if (!selectedElement) {
                selectedEntityId = null;
                return;
            }

            const moveUrl= selectedElement.dataset.moveUrl
            const cellX = cell.dataset.x
            const cellY = cell.dataset.y

            const data = await sendMoveRequest(moveUrl, cellX, cellY);
            
            if(data === null){
                clearAvailableCells();
                clearSelectedEntity();
                return;
            }
            appendBattleLog(data.log);
            await animateEntityMove(selectedElement, data.new_x, data.new_y)

            updateEntityAfterMove(selectedElement, data);
            updateActionPoints(data.entity_id, undefined, data.bonus_actions)

            selectedEntityId = null;

        });
    });

if (endTurnButton) {
    endTurnButton.addEventListener('click', async function(){

        const data = await sendEndTurnRequest(endTurnButton.dataset.endTurnUrl)
        
        if (data === null){
            return;
        }
        updateActionPoints(data.current_turn_id, data.main_actions, data.bonus_actions);
        updateCurrentTurn(data);

    });
}




// ==================================================
// 3. ACTION / TARGETING LOGIC
// ==================================================

function highlightShootTargets(shooterId){
        clearShootTargets();
        clearShooter();

        const shooterElement = document.querySelector(`.entity[data-entity-id="${shooterId}"]`);

        if(!shooterElement){
            return;
        }

        shooterElement.classList.add('entity-shooter');

        let targetClass= null;
        
        if(shooterElement.classList.contains('entity-player')){
            targetClass="entity-enemy"
        }else if(shooterElement.classList.contains('entity-enemy')){
            targetClass='entity-player'
        }
        
        if(targetClass === null){
            return;
        }

        const entities = document.querySelectorAll(".entity");

        entities.forEach(function (entityElement){
                if(entityElement.classList.contains(targetClass) && entityElement.dataset.isDead === "false"){
                    entityElement.classList.add("entity-targetable")
                }
        });
    }


function clearShootTargets(){
        const entityTargets = document.querySelectorAll(".entity-targetable");

        entityTargets.forEach(function (targetElement){
            targetElement.classList.remove("entity-targetable")
        })
    }


function clearAvailableCells() {
        const availableCells = document.querySelectorAll(".cell-available");

        availableCells.forEach(function (availableCell){
            availableCell.classList.remove("cell-available")
        });
    }


function highlightAvailableCells(entityElement) {
        clearAvailableCells()

        const entityX = Number(entityElement.dataset.x);
        const entityY = Number(entityElement.dataset.y);

        cells.forEach(function (cell){
            const cellX = Number(cell.dataset.x)
            const cellY = Number(cell.dataset.y)

            const distance = Math.abs(cellX-entityX)+Math.abs(cellY-entityY);

            const isNeighbour = (distance <= 2);
            const blockedByObstacle = isCellBlockedByObstacle(cellX, cellY);
            const occupiedByEntity = isCellOccupiedByEntity(cellX, cellY);

            

            if(isNeighbour && !blockedByObstacle && !occupiedByEntity){
                cell.classList.add("cell-available");
            }
        })
    }


function isCellBlockedByObstacle(cellX, cellY){
        const obstacles = document.querySelectorAll(".obstacle");
        for(const obstacle of obstacles){
            const obstacleX = Number(obstacle.dataset.x);
            const obstacleY = Number(obstacle.dataset.y);
            const blocksMovement = obstacle.dataset.blocksMovement === "True";
            if (obstacleX === cellX && obstacleY === cellY && blocksMovement){
                return true;
            }
        }

        return false;

    };


function isCellOccupiedByEntity  (cellX, cellY){
        const entities = document.querySelectorAll(".entity");
        for(const entity of entities){
            const entityX = Number(entity.dataset.x);
            const entityY = Number(entity.dataset.y);
            const entityId = Number(entity.dataset.entityId);
            if (entityX === cellX && entityY === cellY && entityId !== selectedEntityId){
                return true;
            }
        }

        return false;
    }


function clearCurrentAction() {
        currentAction = null;
        currentFireMode = null;
        clearShootTargets();
        clearShooter();
    }


function clearSelectedEntity(){
        const selectedElement = document.querySelector(".entity-selected");
        
        if(selectedElement){
            selectedElement.classList.remove("entity-selected");
        }
    }


function clearShooter(){
        const shooterElement = document.querySelector(".entity-shooter");
        
        if(shooterElement){
            shooterElement.classList.remove("entity-shooter");
        }
    }


// ==================================================
// 5. UI UPDATE
// ==================================================

function updateCurrentTurn(data){
        currentTurnId = data.current_turn_id

        
        selectedEntityId = null;

        
        clearSelectedEntity();
        clearCurrentAction();
        updateFireModeElement(data.previous_turn_id, currentFireMode);
        clearAvailableCells();
        const newTurnId = data.current_turn_id;

        updateCurrentTurnCard(newTurnId);
        scrollToCurrentTurnCard(newTurnId, true);

        const currentTurnName = document.getElementById("current-turn-name");
        if (currentTurnName) {
            currentTurnName.textContent = data.current_turn_name;
        }
    }



// ==================================================
// 6. HELPERS
// ==================================================


