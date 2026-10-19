const mapEditorButton = document.getElementById("map-editor-button");
const addObstacleButton = document.getElementById("add-obstacle-button");
const deleteObstacleButton = document.getElementById("delete-obstacle-button");
const mapEditorPanel = document.querySelector(".map-editor-panel");
const exitMapEditorButton =document.getElementById("exit-map-editor-button");
const objectLayer = document.querySelector(".object-layer");
createObstacleUrl = objectLayer.dataset.createObstacleUrl;

let mapEditorActive = false;
let obstaclePlacementActive = false;
let obstacleDeletionActive = false;

let selectStart=null;
let selectEnd = null;

mapEditorButton.addEventListener('click', function(){
    mapEditorActive =true;

    objectLayer.classList.add('map-editor-active');

    mapEditorPanel.classList.remove("hidden");
    mapEditorButton.classList.add("hidden");
});

exitMapEditorButton.addEventListener('click', function(){
    mapEditorActive =false;
    obstaclePlacementActive = false;
    obstacleDeletionActive = false;

    objectLayer.classList.remove('map-editor-active');
    objectLayer.classList.remove('map-editor-delete-active');

    selectStart=null;
    selectEnd=null;

    mapEditorPanel.classList.add("hidden");
    mapEditorButton.classList.remove("hidden");

    clearObstaclePreview();
});


addObstacleButton.addEventListener('click', function(){
    obstaclePlacementActive = true;
    obstacleDeletionActive = false;
    objectLayer.classList.remove('map-editor-delete-active');

});

deleteObstacleButton.addEventListener('click', function(){
    obstacleDeletionActive = true;
    obstaclePlacementActive = false;

    objectLayer.classList.add('map-editor-delete-active');

    clearObstaclePreview();
    selectStart = null;
    selectEnd = null;
});


const mapCells = document.querySelectorAll(".cell");

mapCells.forEach(function(cell){
    cell.addEventListener('mousedown', function(){

        if(!mapEditorActive || !obstaclePlacementActive){
            return;
        }

        const x = Number(cell.dataset.x);
        const y = Number(cell.dataset.y);

        selectStart ={ x:x, y:y};
        selectEnd ={ x:x, y:y};

        updateObstaclePreview();

    });

    cell.addEventListener('mouseenter', function(){

        if(!mapEditorActive || !obstaclePlacementActive || selectStart === null){
            return;
        }

        const x =Number(cell.dataset.x);
        const y =Number(cell.dataset.y);

        selectEnd = {x:x, y:y};

        updateObstaclePreview();

    });


});

document.addEventListener('mouseup', async function(){
        if(!mapEditorActive || !obstaclePlacementActive || selectEnd === null || selectStart === null){
            return;
        }

        const x = Math.min(selectStart.x, selectEnd.x);
        const y = Math.min(selectStart.y, selectEnd.y);
        
        const width = Math.abs(selectEnd.x - selectStart.x)+1;
        const height = Math.abs(selectEnd.y - selectStart.y)+1;

        
        const data = await sendCreateObstacleRequest(createObstacleUrl, x ,y, width, height);

        clearObstaclePreview();

        selectStart =null;
        selectEnd = null;

        if (data === null){
            return;
        }
        addObstacleToMap(data.obstacle);

    });


objectLayer.addEventListener('click', async function(){
    
        if (!obstacleDeletionActive || !mapEditorActive){
            return;
        }

        const obstacleElement = event.target.closest('.obstacle')

        if(!obstacleElement){
            return;
        }
        if(obstacleElement.dataset.deleting === "true"){
            return;
        }

        const deleteObstacleUrl = objectLayer.dataset.deleteObstacleUrl
        const obstacleId = obstacleElement.dataset.obstacleId;

        obstacleElement.dataset.deleting = "true";
        
        if(!obstacleId){
            return;
        }

        const url = deleteObstacleUrl + obstacleId + "/delete/"
        
        const data = await sendDeleteObstacleRequest(url);
        if(data===null){
            delete obstacleElement.dataset.deleting;
            return;
        }
        removeObstacleFromMap(obstacleId);


        
    
});

function updateObstaclePreview(){
    clearObstaclePreview();

    if (selectStart === null || selectEnd === null){
        return;
    }

    const minX = Math.min(selectEnd.x, selectStart.x);
    const maxX = Math.max(selectEnd.x, selectStart.x);
    const minY = Math.min(selectEnd.y, selectStart.y);
    const maxY = Math.max(selectEnd.y, selectStart.y);


    mapCells.forEach(function(cell){
        const x =cell.dataset.x;
        const y =cell.dataset.y;

        if( x >= minX &&
            x <= maxX &&
            y >= minY &&
            y <= maxY 
        ){
            cell.classList.add("obstacle-preview");
        }
    });
   

}

function clearObstaclePreview(){
    document.querySelectorAll(".obstacle-preview").forEach(function(cell){
        cell.classList.remove("obstacle-preview");
    });
}
