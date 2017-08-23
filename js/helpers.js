"use strict";

// This is the image with the sprites for the game
var spriteImgs = document.getElementById("sprites");


function Cannon (x, y, speed, range){
    this.x = x;
    this.speed = speed;
    this.y = y; // Never changes
    this.range = range;
}
Cannon.prototype.width  = 20;
Cannon.prototype.height = 16;
Cannon.prototype.update = function (direction) {
    this.x += this.speed * direction;
    if (!(this.x > 0  &&  (this.x + this.width) < this.range)){
        this.x -= this.speed * direction;
    }
};
Cannon.prototype.draw = function (context) {
    context.drawImage( spriteImgs,
                       0, 48,
                       this.width, this.height,
                       this.x, this.y,
                       this.width, this.height);

};





function Ufo (x, y, speed){
    this.speed = speed;
    this.initialPosX = x;
    this.x = x;
    this.y = y; // Never changes
}
Ufo.prototype.width  = 40;
Ufo.prototype.height = 13;
Ufo.prototype.possibleScores = [50, 100, 150, 300];
Ufo.prototype.getScore = function () {
   var scoreIndex = Math.floor( Math.random() * 4 );
   return Ufo.prototype.possibleScores[ scoreIndex ];
};
Ufo.prototype.update = function () {
    this.x += this.speed;
};
Ufo.prototype.draw = function (context) {
    context.drawImage( spriteImgs,
                       0, 64,
                       this.width, this.height,
                       this.x, this.y,
                       this.width, this.height);
};




function Alien (alienType, x, y){
    this.alienType = alienType;
    this.x = x;
    this.y = y;
    this.sprite = 0; // Indicates what sprite to draw
    this.moveDirection = 1; // Indicates movement to the right or left
    this.width  = this.typeAttributes[alienType][0];
    this.height = this.typeAttributes[alienType][1];
}
Alien.prototype.maxWidth  = 20;
Alien.prototype.maxHeight = 16;
Alien.prototype.type = {
    A : 0,
    B : 1,
    C : 2
};
Alien.prototype.typeAttributes = [
    [20, 16, 20], // Width, height and score of type A
    [20, 16, 30], // Width, height and score of type B
    [20, 16, 10]  // Width, height and score of type C
];
Alien.prototype.getScore = function () {
    return this.typeAttributes[ this.alienType ][ 2 ];
};
Alien.prototype.update = function (toNewRow){
    // Here we use maxWidth and maxHeight so every alien
    // moves the same amount of pixels
    if (toNewRow){
        this.moveDirection *= -1;
        this.y += this.maxHeight;
    }
    else{
        this.x += this.maxWidth/2 * this.moveDirection;
    }
    this.sprite = (this.sprite + 1) % 2;
}
Alien.prototype.draw = function (context) {
    context.drawImage( spriteImgs,
                       this.sprite * this.width, this.alienType * this.height,
                       this.width, this.height,
                       this.x, this.y,
                       this.width, this.height);
};





function Bullet (xStart, yStart, speed){
    this.x = xStart;
    this.y = yStart;
    this.speed = speed;
}
Bullet.prototype.width = 3;
Bullet.prototype.height = 12;
Bullet.prototype.update = function(){
    this.y += this.speed;
};
Bullet.prototype.draw = function(context){
    context.fillRect( this.x, this.y, this.width, this.height );
};


function keyPressedHandler (){

    var xDirection = 0,
        spaceBarPressed = false;

    return ({
        getXDirection : function (){
            return xDirection;
        },

        isSpacePressed : function() {
            return spaceBarPressed;
        },

        handleKeyDownEvent : function (e){
            switch (e.keyCode) {
                case 37: // Left arrow
                    xDirection = -1;
                    break;

                case 39: // Right arrow
                    xDirection = 1;
                    break;

                case 32 :
                    spaceBarPressed = true;
            }
        },

        handleKeyUpEvent : function (e){
            switch (e.keyCode) {
                case 37: // Left arrow
                    xDirection = 0;
                    break;

                case 39: // Right arrow
                    xDirection = 0;
                    break;

                case 32 :
                    spaceBarPressed = false;
            }

        }

    });
};


function collisionDetection (ax, ay, aWidth, aHeight, bx, by, bWidth, bHeight){
    return (ay - aHeight <= by  &&
            ay > by - bHeight  &&
            ax >= bx  &&
            ax + aWidth  <=  bx + bWidth
    );
}
