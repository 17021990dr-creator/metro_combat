
async function sendMoveRequest(moveUrl, cellX, cellY){
        const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]").value;

        const formData = new FormData();
        formData.append("new_x", cellX);
        formData.append("new_y", cellY);
        formData.append("csrfmiddlewaretoken", csrfToken);

        try{
            const response = await fetch(moveUrl, {method:"POST", body: formData})
            const data = await response.json();
            if(!response.ok){
                alert(data.error);
                return null;
            }

            return data;
        }catch(error){
            console.log(error);
            alert("Ошибка соединения с сервером");
            return null;
        }
    }


async function sendShootRequest(shootUrl, targetId, fireMode) {

        const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]").value;

        const formData = new FormData();
        formData.append("target_id", targetId);
        formData.append("fire_mode", fireMode);
        formData.append("csrfmiddlewaretoken", csrfToken);

        try{
            const response = await fetch(shootUrl, {method: "POST", body: formData});
            const data = await response.json();
            if(!response.ok){
                alert(data.error);
                return null;
            }

            return data;
        }catch(error){
            console.log(error);
            alert("Ошибка соединения с сервером");
            return null;
        }

        
    }


async function sendReloadRequest(reloadUrl){
        const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]").value;

        const formData = new FormData();
        formData.append("csrfmiddlewaretoken", csrfToken);

        try{
            const response = await fetch(reloadUrl, {method:"POST", body: formData})
            const data = await response.json();
            if(!response.ok){
                alert(data.error);
                return null;
            }

            return data;
        }catch(error){
            console.log(error);
            alert("Ошибка соединения с сервером")
            return null;
        }
    }


async function sendUnjamRequest(unjamUrl){
        const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]").value;

        const formData = new FormData();
        formData.append("csrfmiddlewaretoken", csrfToken);

        try{
            const response = await fetch(unjamUrl, {method:"POST", body: formData})
            const data = await response.json();
            if(!response.ok){
                alert(data.error);
                return null;
            }

            return data;
        }catch(error){
            console.log(error);
            alert("Ошибка соединения с сервером")
            return null;
        }
    }


async function  sendEndTurnRequest(endTurnUrl){
        const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]").value;

        const formData = new FormData();
        formData.append("csrfmiddlewaretoken", csrfToken);

        try{
            const response = await fetch(endTurnUrl, {method:"POST", body: formData})
            const data = await response.json();
            if(!response.ok){
                alert(data.error);
                return null;
            }

            return data;
        }catch(error){
            console.log(error);
            alert("Ошибка соединения с сервером")
            return null;
        }
    }


async function sendRestartBattleRequest(restartUrl){
        const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]").value;

        const formData = new FormData();
        formData.append("csrfmiddlewaretoken", csrfToken);

        try{
            const response = await fetch(restartUrl, {method:"POST", body: formData})
            const data = await response.json();
            if(!response.ok){
                alert(data.error);
                return null;
            }

            return data;
        }catch(error){
            console.log(error);
            alert("Ошибка соединения с сервером")
            return null;
        }
    }

async function sendCreateObstacleRequest(url, x ,y, width, height){
    const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]").value;

    const formData = new FormData();
    formData.append("csrfmiddlewaretoken", csrfToken);

    formData.append("x", x);
    formData.append("y", y);
    formData.append("width", width);
    formData.append("height", height);

    try{
        const response = await fetch(url, {method: "POST", body: formData});
        const data = await response.json();

        if(!response.ok){
            alert(data.error);
            return null;
        }
        return data;
    }catch(error){
        console.log(error);
        alert("Ошибка соединения с сервером");
        return null;
    }


}

async function sendDeleteObstacleRequest(url){
    const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]").value;
    const formData = new FormData();
    formData.append("csrfmiddlewaretoken", csrfToken);

    try{
        const response = await fetch(url, {method:"POST", body:formData});
        const data = await response.json();

        if (!response.ok){
            console.log(data.error);
            return null;
        }
        return data;
    }catch(error){
        console.log(error);
        alert("Проблемы соединения с сервером");
        return null;
    }

}