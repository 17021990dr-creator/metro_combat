// ==================================================
// 6. ANIMATIONS
// ==================================================

function animateEntityMove(entityElement, newX, newY){
        return new Promise(function(resolve){
            const oldX = Number(entityElement.dataset.x)
            const oldY = Number(entityElement.dataset.y)

            const deltaX = newX - oldX
            const deltaY = newY - oldY

            if(deltaX === 0 && deltaY === 0){
                resolve();
                return;
            }
            entityElement.classList.remove("entity-selected");
            entityElement.classList.add("entity-moving");

            
            
            function handleTransitionEnd(event){
                if(event.propertyName !== "transform"){
                    return;
                }
                entityElement.removeEventListener(
                    "transitionend", handleTransitionEnd
                )
                entityElement.style.transition = "none"
                entityElement.style.transform = "none";

                entityElement.style.gridColumn = newX + 1;
                entityElement.style.gridRow = newY + 1;

                void entityElement.offsetWidth;
                
                
                entityElement.style.transition = "";
                entityElement.style.transform="";
                entityElement.classList.remove("entity-moving");
                    
                resolve();

               


            }
            

            entityElement.addEventListener("transitionend", handleTransitionEnd )

            entityElement.style.transform = `translate(${deltaX * 100}px, ${deltaY * 100}px)`;


        })
        



    }


async function animateShot(shooterElement, targetElement){
        
        const effectLayer = document.querySelector(".effects-layer");
        const battleWrapper = document.querySelector(".battle-wrapper");
         
        if (!effectLayer){
            return;
        }
        const wrapperRect = battleWrapper.getBoundingClientRect();

        const shooterRect = shooterElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();

        const startX = shooterRect.left - wrapperRect.left + shooterRect.width/2;
        const startY = shooterRect.top - wrapperRect.top + shooterRect.height/2;

        const endX = targetRect.left - wrapperRect.left + targetRect.width/2;
        const endY = targetRect.top - wrapperRect.top + targetRect.height/2;

        const projectile = document.createElement("div");
        projectile.classList.add("shot-projectile");

        projectile.style.left=`${startX}px`;
        projectile.style.top=`${startY}px`;

        const deltaX = endX-startX;
        const deltaY = endY - startY;

        effectLayer.append(projectile);

        const animation = projectile.animate(
            [
                {
                    transform: "translate(-50%, -50%)"
                },
                {
                    transform: `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`
                }
            ],
            {
                duration:300,
                easing:"linear",
            }
        );

        await animation.finished;

        projectile.remove();
    }


async function animateBurst(shooterElement, targetElement, bulletsPerBurst, burstCount){
        for(let i =0; i < burstCount; i++){
            for(let j =0; j<bulletsPerBurst[i]; j++){
                animateShot(shooterElement, targetElement)
                await new Promise(resolve => setTimeout(resolve,50));
            }
            await new Promise(resolve => setTimeout(resolve,150));
        }
        
        
    }


function animateTargetHit(targetElement){
        targetElement.classList.remove("entity-hit");

        void targetElement.offsetWidth;

        targetElement.classList.add("entity-hit");

        targetElement.addEventListener("animationend", function(){
            targetElement.classList.remove("entity-hit");
        }, {once: true});


    }


async function showCombatText(targetElement, text, type) {

        const effectLayer = document.querySelector(".effects-layer");
        if(!effectLayer || !targetElement){
            return;
        }
        


        const effectRect = effectLayer.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        
        const x = targetRect.left - effectRect.left + targetRect.width/2;
        const y = targetRect.top - effectRect.top;

        const textElement = document.createElement("div");
        
        textElement.classList.add("combat-text");

        if(type === "damage"){
            textElement.classList.add("combat-text-damage");
        }else if(type === "miss"){
            textElement.classList.add("combat-text-miss");
        }

        textElement.textContent=text;

        textElement.style.left =`${x}px`;
        textElement.style.top =`${y}px`;

        effectLayer.append(textElement);
        

        const animation = textElement.animate(
            [
                {
                    transform: "translate(-50%, 0)",
                    opacity:1,
                },
                {
                    transform:"translate(-50%, -45px)",
                    opacity:0,
                },
            ],
            {
                duration: 700,
                easing: "ease-out"
            }
            
        );

        await animation.finished;

        textElement.remove();
        
    }


async function animateCheck(check){
        const overlay = document.createElement("div");
        overlay.classList.add("check-overlay");

        const windowElement = document.createElement("div");
        windowElement.classList.add("check-window");

        const title = document.createElement("div");
        title.classList.add("check-title");
        title.textContent=`Проверка ${check.label}`;

        const die = document.createElement("div");
        die.classList.add("d20");

        const comparison = document.createElement("div");
        comparison.classList.add("check-comparison");

        windowElement.append(title,die,comparison);
        overlay.append(windowElement);
        document.body.append(overlay);

        for (let i = 0 ; i < 12; i++ ){
            die.textContent=Math.floor((Math.random() * 20)+1);

            await wait(80);
        }

        die.textContent = check.roll;
        
        comparison.textContent=`${check.roll} ≤ ${check.target}`;

        windowElement.classList.add(
            check.success
                ?"check-success"
                :"check-failure"
            )

        const result = document.createElement("strong");
        result.textContent = check.success
                ?"УСПЕХ"
                :"ПРОВАЛ";
        windowElement.append(result);

        await wait(1100);
        overlay.remove();
    }


// ==================================================
// 7. HELPERS
// ==================================================

async function wait(time){
        await new Promise(resolve => setTimeout(resolve,time));
    }