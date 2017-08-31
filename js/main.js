"use strict";

/*******************************************************************************

    TODO:
        - Cancel requestAnimationFrame when the game ends
        - Let the player pause the game
        - Add the defence elements
        - Improve cannon bullet collision detection
        - Improve the event handler

*******************************************************************************/

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
        aliensMinNumberFramesToMove = 10,   // Need a minimum because "aliensFrameToMove" will decrease over time
        numberAliensMoveToIncreaseSpeed = 15,
        playerLifes,  // DOM element with the number of user lifes
        playerScore,  // DOM element containing the score
        gameEnded,    // Boolean that stops the recursive call of requestAnimationFrame
        gamePaused = false, // Boolean that pauses the game (not really, what it does is
                            // prevent the run loop to update and draw the game)
        alertMessage = alertMessageToDom(), // Function to alert messages to the user using a div
        currentAliensOffsetY;

    // Need this helper function because we need to construct the aliens
    // in the init function as well as in the update function when all die
    // @param yOffset: where to locate the aliens starting from the top of the screen
    var constructAlienMatrix = function (yOffset, dir){
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
                                dir >= 1?      // Initial x position. It depends on the movement of the aliens
                                    (maxAlienWidth  * 1.2 * j) :    // Far left on the screen if they are moving to the right
                                    canvas.width - (maxAlienWidth  * 1.2 * (numAliensPerRow - j)),  // On the left otherwise
                                maxAlienHeight * 1.5 * i + yOffset, // Initial y position
                                dir  )
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
            if ((alienInLastCol.x + alienInLastCol.maxWidth*1.2) >= canvas.width){
                result = true;
            }
        }
        // Aliens are moving to the left, similar to the code above
        else{
            alienInLastCol = aliens[0][0];
            for (var i = 1, len = aliens.length; i < len; ++i){
                var aux = aliens[i][0];
                if( alienInLastCol.x > aux.x ){
                    alienInLastCol = aux;
                }
            }
            if (alienInLastCol.x <= 0){
                result = true;
            }
        }

        return result;

    };

    var aliensInvaded = function(){
        // Check if aliens reached a height near the cannon (They invaded the planet D:)
        // Each alien take a height of maxHeight*1.5, so we can divide the canvas in
        // 'maxHeight*1.5' equal positions. The cannon will be in the last one, so once the aliens reach
        // one after that and try to go down, we consider it game over
        var alienInLastRow = aliens[ aliens.length -1 ][ 0 ];
        var canvasPositions = alienInLastRow.maxHeight * 1.5;

        return ( alienInLastRow.y + alienInLastRow.maxHeight >= ((canvasPositions-1)/canvasPositions)*canvas.height );
    }

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
                // Update current aliens y offset
                currentAliensOffsetY += Alien.prototype.maxHeight;
                if ( aliensInvaded() ){
                    gameEnded = true;
                    alertMessage("GAME OVER: Aliens invaded the planet.");
                }
            }
        }

        // Every "numberAliensMoveToIncreaseSpeed" moves of the aliens we increase
        // the "speed" of them by decreasing their frame to move. Also we need to
        // reset the current frame counter. Otherwise, the update could happend before expected
        if ( (currentFrame % (aliensFrameToMove * numberAliensMoveToIncreaseSpeed))  === 0  &&
             (aliensFrameToMove > aliensMinNumberFramesToMove)
        ){
            aliensFrameToMove -= 1;
            currentFrame = 0;
        }

        // Cannon bullet construction check
        if ( cannonBullet === null && keyEventHandler.isSpacePressed() ){
            cannonBullet = new Bullet (cannon.x + cannon.width/2 - Bullet.prototype.width/2,
                                       cannon.y + cannon.height/2,
                                       -6);
        }
        // Alien bullet construction check
        if ( alienBullet === null ){
            // The alien bullet will be shooted from a random alien
            var i = Math.floor(Math.random() * aliens.length),
                j = Math.floor(Math.random() * aliens[i].length);

            alienBullet = new Bullet (aliens[i][j].x + aliens[i][j].width/2 - Bullet.prototype.width/2,
                                      aliens[i][j].y + aliens[i][j].height/2,
                                      4);
        }

        // cannonBullet update
        if (cannonBullet !== null){
            cannonBullet.update();
            // If it went off the canvas...
            if (cannonBullet.y + cannonBullet.height < 0){
                cannonBullet = null;
            }
        }
        // alienBullet update
        if (alienBullet !== null){
            alienBullet.update();
            // If it went off the canvas...
            if (alienBullet.y >= canvas.height){
                alienBullet = null;
            }
        }

        // Check bullets collision with aliens (brute way)
        for (var i = 0, numRows = aliens.length; cannonBullet !== null &&  i < numRows; ++i){
            for (var j = 0, numCols = aliens[i].length; cannonBullet !== null && j < numCols; ++j){
                var alien = aliens[i][j];
                // We will only enter this if once. This is because once entered we set to null cannonBullet,
                // That is the reason of the checks in the loops
                if ( collisionDetection (cannonBullet.x, cannonBullet.y, cannonBullet.width, cannonBullet.height,
                                        alien.x, alien.y, alien.width, alien.height)
                ){
                    // Update score
                    playerScore.innerHTML = parseInt( playerScore.innerHTML ) + alien.getScore();

                    // Remove that alien and cache the direction for later if needed
                    // to know aliens direction for the new batch of them
                    let aliensDirection = aliens[i].splice(j,1)[0].moveDirection;

                    // If it was the last alien in that row, also remove the row
                    if (aliens[i].length === 0){
                        aliens.splice(i,1);
                    }

                    // Remove the bullet
                    cannonBullet = null;

                    // If every alien is dead, we create a new batch of them
                    if (aliens.length === 0){
                        constructAlienMatrix( currentAliensOffsetY, aliensDirection);

                        // Check if they invaded
                        if ( aliensInvaded() ){
                            gameEnded = true;
                            alertMessage("GAME OVER: Aliens invaded the planet.");
                        }
                        else{
                            playerLifes.innerHTML = parseInt(playerLifes.innerHTML) + 3;
                            alertMessage("You defeated that batch of aliens, here you have 3 extra lifes", 3000);
                        }
                    }
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

            // Construct aliens for the first time
            currentAliensOffsetY = Alien.prototype.maxHeight * 1.5;
            constructAlienMatrix (currentAliensOffsetY, 1);

            // Construct cannon
            cannon = new Cannon (canvasWidth / 2, // x position in canvas
                                 canvasHeight - Cannon.prototype.height,    // y position in canvas
                                 4,   // Number of pixels to move when user press arrow keys
                                 canvasWidth ); // Up to where the cannon can move

            // To listen arrow keys to move the cannon and shoot
            keyEventHandler = keyPressedHandler();
            window.addEventListener("keydown", keyEventHandler.handleKeyDownEvent);
            window.addEventListener("keyup", keyEventHandler.handleKeyUpEvent);

            run();
        }
    });
}();


gameArea.init(500,420);
