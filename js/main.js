"use strict";

/*******************************************************************************

    TODO:
        - Add levels (the game doesn't end until the user loses,
        once all the aliens dies, there have to be a new batch of them)
        - Let the player pause the game
        - Add the defence elements
        - Improve cannon bullet collision detection
        - Improve the event handler

*******************************************************************************/

// This function returns a function to interact with the alert-box DOM element
// to display messages to the user
function alertMessageToDom(){
    // These variables act as private, to cache the DOM element
    var alertBox  = document.getElementById("alert-box");
    var timeoutId = null;

    return (function (messageToDisplay, time){
        // Clear timeout if there is any
        if (timeoutId !== null){
            clearTimeout(timeoutId);
        }

        // Display message
        alertBox.innerHTML = messageToDisplay;
        alertBox.style.display = "block";

        // Set timeout to erase message in case it is temporal
        if (time){
            timeoutId = setTimeout(function () {
                alertBox.style.display = "none";
                timeoutId = null;
            }, time);
        }
    });
}

var gameArea = function (){

    var canvas  = document.createElement("canvas"),
        context = canvas.getContext("2d"),
        ufo,
        aliens  = [],
        alienBullet,
        cannon,
        cannonBullet,
        keyEventHandler,    // Handles user input to move the cannon or shoot
        currentFrame = 0,   // To keep track of the frame for updating aliens
        aliensFrameToMove = 45,
        playerLifes,  // DOM element with the number of user lifes
        playerScore,  // DOM element containing the score
        gameEnded,    // Boolean that stops the recursive call of requestAnimationFrame
        gamePaused = false, // Boolean that pauses the game (not really, what it does is
                            // prevent the run loop to update and draw the game)
        alertMessage = alertMessageToDom();

    // Need this helper function because we need to construct the aliens
    // in the init function as well as in the update function when all die
    // @param yOffset: where to locate the aliens starting from the top of the screen
    var constructAlienMatrix = function (yOffset){
        // Auxiliar variables, we use maxWidth and maxHeight to place
        // every alien in equal distance
        var maxAlienWidth = Alien.prototype.maxWidth,
            maxAlienHeight = Alien.prototype.maxHeight,
            numAliensPerRow = 11,
            // alienRows indicates how many rows there are and what type
            // of aliens are in each one
            alienRows = [ Alien.prototype.type["B"],
                          Alien.prototype.type["A"],
                          Alien.prototype.type["A"],
                          Alien.prototype.type["C"],
                          Alien.prototype.type["C"] ];

        for (var i = 0, numRows = alienRows.length; i < numRows; ++i){
            aliens.push( [] );
            for (var j = 0; j < numAliensPerRow; ++j){
                aliens[i].push(
                    new Alien(  alienRows[i],  // Alien type for this row
                                maxAlienWidth  * 1.2 * j, // Initial x position
                                maxAlienHeight * 1.5 * i + yOffset) // Initial y position
                );
            }
        }
    }

    // Auxiliar function to know when do we have to move down a row the aliens
    var aliensMoveDown = function(){
        var alienInLastCol,
            result = false;

        // If aliens are moving to the right
        if (aliens[0][0].moveDirection > 0){
            // Get the alien in the most right position
            alienInLastCol = aliens[0][ aliens[0].length - 1 ];
            for (var i = 1, len = aliens.length; i < len; ++i){
                var aux = aliens[i][ aliens[i].length - 1 ];
                if( alienInLastCol.x < aux.x ){
                    alienInLastCol = aux;
                }
            }

            // If the most right alien is near the edge we have to go down a row
            if ((alienInLastCol.x + alienInLastCol.maxWidth*1.5) >= canvas.width){
                result = true;
            }
        }
        // Aliens are moving to the left, similar to the above code
        else{
            alienInLastCol = aliens[0][0];
            for (var i = 1, len = aliens.length; i < len; ++i){
                var aux = aliens[i][0];
                if( alienInLastCol.x > aux.x ){
                    alienInLastCol = aux;
                }
            }
            if (alienInLastCol.x < alienInLastCol.maxWidth){
                result = true;
            }
        }

        return result;

    };

    var update = function(){
        // Update and draw cannon given the user input
        cannon.update( keyEventHandler.getXDirection() );

        // Update UFO if it is in canvas
        if (ufo !== null){
            ufo.update();
            // If the UFO is outside the canvas...
            if (ufo.x >= canvas.width){
                ufo = null;
            }
        }
        // Check UFO construction if it is not in the canvas
        else {
            // If UFO === null, we "toss a coin" to see if we should let the UFO go
            if (Math.random() < 0.001){
                ufo = new Ufo(0, 0, 1.5);
            }
        }

        // Update aliens
        // Only update them at certain frames
        if (currentFrame % aliensFrameToMove === 0){
            var moveDownRow = aliensMoveDown();
            for (var i = 0, numRows = aliens.length; i < numRows; ++i){
                for (var j = 0, numCols = aliens[i].length; j < numCols; ++j){
                    aliens[i][j].update( moveDownRow );
                }
            }
            if (moveDownRow){
                // Check if aliens reached a height near the cannon (They invaded the planet D:)
                // Each alien take a height of maxHeight*1.5, so we can divide the canvas in
                // 'maxHeight*1.5' equal positions. The cannon will be in the last one, so once the aliens reach
                // one after that and try to go down, we consider it game over
                var alienInLastRow = aliens[ aliens.length -1 ][ 0 ];
                var canvasPositions = alienInLastRow.maxHeight * 1.5;
                if ( alienInLastRow.y + alienInLastRow.maxHeight >= ((canvasPositions-1)/canvasPositions)*canvas.height ){
                    gameEnded = true;
                    alertMessage("GAME OVER: Aliens invaded the planet.");
                }
            }
        }

        // Every 10 moves of the aliens we increase the "speed" of them by decreasing
        // their frame to move. Also we need to reset the current frame counter.
        // Otherwise, the update could happend after expected
        if (currentFrame % (aliensFrameToMove*10)  === 0  &&  aliensFrameToMove > 10) {
            aliensFrameToMove -= 1;
            currentFrame = 0;
        }

        // Check bullet creation
        // Cannon bullet check
        if ( cannonBullet === null && keyEventHandler.isSpacePressed() ){
            cannonBullet = new Bullet (cannon.x + cannon.width/2 - Bullet.prototype.width/2,
                                       cannon.y + cannon.height/2,
                                       -6);
        }
        // Alien bullet check
        if ( alienBullet === null ){
            // The alien bullet will be shooted from a random alien
            var i = Math.floor(Math.random() * aliens.length),
                j = Math.floor(Math.random() * aliens[i].length);

            alienBullet = new Bullet (aliens[i][j].x + aliens[i][j].width/2 - Bullet.prototype.width/2,
                                      aliens[i][j].y + aliens[i][j].height/2,
                                      4);
        }

        // Update bullets
        // cannonBullet update
        if (cannonBullet !== null){
            cannonBullet.update();
            if (cannonBullet.y + cannonBullet.height < 0){
                cannonBullet = null;
            }
        }
        // alienBullet update
        if (alienBullet !== null){
            alienBullet.update();
            if (alienBullet.y >= canvas.height){
                alienBullet = null;
            }
        }

        // Check bullets collision with aliens (brute way)
        for (var i = 0, numRows = aliens.length; cannonBullet !== null &&  i < numRows; ++i){
            for (var j = 0, numCols = aliens[i].length; j < numCols; ++j){
                var alien = aliens[i][j];
                if ( collisionDetection(cannonBullet.x, cannonBullet.y, cannonBullet.width, cannonBullet.height,
                                        alien.x, alien.y, alien.width, alien.height)
                ){
                    // Update score
                    playerScore.innerHTML = parseInt( playerScore.innerHTML ) + alien.getScore();

                    // Remove that alien
                    aliens[i].splice(j,1);

                    // If it was the last alien in that row, remove the row also
                    if (aliens[i].length === 0){
                        aliens.splice(i,1);
                    }

                    // Remove the bullet
                    cannonBullet = null;

                    // Check win condition
                    // TODO: create new batch of aliens
                    if (aliens.length === 0){
                        alertMessage("You win");
                    }
                    break;
                }
            }
        }

        // Check bullet collision with UFO
        if ( ufo !== null  &&  cannonBullet !== null  &&
             collisionDetection(cannonBullet.x, cannonBullet.y,
                                cannonBullet.width, cannonBullet.height,
                                ufo.x, ufo.y, ufo.width, ufo.height)
        ){
            playerScore.innerHTML = parseInt( playerScore.innerHTML ) + ufo.getScore();
            ufo = null;
        }

        // Check alien bullet collision with cannon
        if ( alienBullet !== null  &&
             collisionDetection(alienBullet.x, alienBullet.y,
                                alienBullet.width, alienBullet.height,
                                cannon.x, cannon.y, cannon.width, cannon.height)
        ){
            // Update life counter
            var currentNumLifes = parseInt(playerLifes.innerHTML) - 1
            playerLifes.innerHTML = currentNumLifes;

            // Alert user of the life down
            alertMessage( "You lost a life", 3000 );

            // "Delete" bullet
            alienBullet = null;

            // Reset cannon position to let the player know that "she/he is in a new life"
            cannon.x = canvas.width / 2;
            cannon.y = canvas.height - Cannon.prototype.height;

            // Pause game when lifes <= 0
            if (currentNumLifes <= 0){
                gameEnded = true;
                alertMessage("GAME OVER: you have no more lifes.");
            }
        }

    };

    var draw = function(){
        // Draw cannon
        cannon.draw(context);

        // Draw ufo
        if (ufo !== null){
            ufo.draw(context);
        }

        // Draw aliens
        for (var i = 0, numRows = aliens.length; i < numRows; ++i){
            for (var j = 0, numCols = aliens[i].length; j < numCols; ++j){
                aliens[i][j].draw(context);
            }
        }

        // Draw bullets
        if (cannonBullet !== null)
            cannonBullet.draw(context);
        if (alienBullet !== null)
            alienBullet.draw(context);
    };

    var run = function(){

        if ( !(gamePaused || gameEnded) ){
            // Update currentFrame counter
            currentFrame += 1;

            // Update all elements
            update();

            // Clear canvas
            context.clearRect(0,0,canvas.width, canvas.height);

            // Draw elements
            draw();
        }
        if ( !gameEnded ){
            requestAnimationFrame(run);
        }
    };

    return ({
        init : function(canvasWidth, canvasHeight){
            // Set canvas properties
            canvas.width  = canvasWidth;
            canvas.height = canvasHeight;
            canvas.style.backgroundColor = "#EEE";

            // Append canvas to document
            document.getElementById("container").appendChild(canvas);

            // UFO and bullets initialization
            // They will be constructed as needed in the update function
            ufo = null;
            cannonBullet = null;
            alienBullet  = null;

            // Set the reference of the DOM elements for the score and lifes
            playerLifes = document.getElementById("number-lifes");
            playerScore = document.getElementById("score");

            // Construct aliens
            constructAlienMatrix (Alien.prototype.maxHeight * 1.5);

            // Construct cannon
            cannon = new Cannon (canvasWidth / 2, // x position in canvas
                                 canvasHeight - Cannon.prototype.height,    // y position in canvas
                                 4,   // Number of pixels to move when user press arrow keys
                                 canvasWidth ); // Up to where the cannon can move

            // To listen arrow keys to move the cannon and shoot
            keyEventHandler = keyPressedHandler();
            window.addEventListener("keydown", keyEventHandler.handleKeyDownEvent);
            window.addEventListener("keyup", keyEventHandler.handleKeyUpEvent);

            requestAnimationFrame( run );
        }
    });
}();


gameArea.init(500,420);
