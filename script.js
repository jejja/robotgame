// TODO-list
// [x] Document has<Color>Key() methods
// [x] Document "if"-support
// [x] Don't walk through walls
// [x] Add openDoor() method
// [x] Don't walk through closed doors
// [x] Show "open door" graphic when door is open
// [x] Add status area
//       [x] Wall (move<Direction>)
//       [x] Closed door (move<Direction>)
//       [x] Missing key (openDoor)
//       [x] No button to push (pushButton)
//       [x] No chest to open (openChest)
//       [x] Found <Key color> key (openChest)
// [x] Change robot graphics when picking up key
// [ ] Splash message when completing level
// [ ] Disable code textarea when pressing "Run" button
// [ ] Add "Retry" button
// [ ] Handle finishing last level
// [ ] Syntax check robot script input
//       [ ] Error message when parsing
//       [ ] Show error in status area
// [ ] `loop` support
//       [ ] Level that is just `loop { <everything }`
//       [ ] Level that is `<instr one>, <instr two>, <...>, loop { <rest> }`
// [ ] Document `loop`
// [ ] Documentation depends on level (implement using css classes and js)
// [ ] `count`/`getCount` support
// [ ] 'loop (cond)' support
//       [ ] Level that requires use of `loop (cond)`
// [ ] Document `count` and `loop (cond)`
// [ ] Connect with hardware (RasPi)
// [ ] Split source into several files
// [ ] Support for functions
// [ ] When press restart, restart the current level
// [ ] Message queue for status msgs so that they are always shown 3 secs
// [ ] Freeplay mode where you can enter commands one at a time and the
//     robot follows them.  Used to interactivly controll the LEDs
var robot;
var now;
var deltaTime;
var last = timestamp();
var ast;
var tokenizer;

/**
 * First position
 * 1 = Open top
 * 2 = Open right
 * 4 = Open down
 * 8 = Open left
 *
 * Second position
 * A = Start position
 * B = Button
 * C = Chest
 * D = Red Door
 * E = Green Door
 * F = Blue Door
 */
var levels = [{}, {}, {}];
levels[0].field = [
    ['6-', 'E-', 'E-', 'E-', 'E-', 'C-'],
    ['7-', 'F-', 'F-', 'F-', 'F-', 'D-'],
    ['7-', 'F-', 'FA', 'FB', 'F-', 'D-'],
    ['7-', 'F-', 'F-', 'F-', 'F-', 'D-'],
    ['7-', 'F-', 'F-', 'F-', 'F-', 'D-'],
    ['3-', 'B-', 'B-', 'B-', 'B-', '9-']];
levels[0].items = [[], [], [], [], [], []];
levels[0].items[2][3] = {
        key: 'buttons',
        index: '0'
    };
levels[0].leds = [{on: false}];
levels[0].buttons = [{
        controlls: {
            key: 'leds',
            index: 0
        }
    }];

levels[1].field = [
    ['4A', '0-', '0-', '0-', '0-', '0-'],
    ['5-', '0-', '0-', '6-', 'C-', '0-'],
    ['3-', 'A-', 'A-', '9-', '1B', '0-'],
    ['0-', '0-', '0-', '0-', '0-', '0-'],
    ['0-', '0-', '0-', '0-', '0-', '0-'],
    ['0-', '0-', '0-', '0-', '0-', '0-']];
levels[1].items = [[], [], [], [], [], []];
levels[1].items[2][4] = {
        key: 'buttons',
        index: '0'
    };
levels[1].leds = [{on: false}];
levels[1].buttons = [{
        controlls: {
            key: 'leds',
            index: 0
        }
    }];

levels[2].field = [
    ['4-', '0-', '6-', 'AD', 'C-', '0-'],
    ['3B', 'AC', 'F-', 'AE', 'F-', 'C-'],
    ['0-', '0-', '3-', 'AF', '9-', '5-'],
    ['0-', '0-', '0-', '0-', '0-', '5-'],
    ['0-', '0-', '0-', '0-', '0-', '5-'],
    ['0-', '0-', '0-', '0-', '0-', '1B']];
levels[2].items = [[], [], [], [], [], []];
levels[2].items[1][0] = {
        key: 'buttons',
        index: '0'
    };
levels[2].items[5][5] = {
        key: 'buttons',
        index: '1'
    };
levels[2].items[0][3] = {
        key: 'doors',
        index: 0
    };
levels[2].items[1][3] = {
        key: 'doors',
        index: 1
    };
levels[2].items[2][3] = {
        key: 'doors',
        index: 2
    };
levels[2].items[1][1] = {
        key: 'chests',
        index: 0
    };
levels[2].leds = [{on: false}, {on: false}];
levels[2].buttons = [{
        controlls: {
            key: 'leds',
            index: 0
        }
    }, {
        controlls: {
            key: 'leds',
            index: 1
        }
    }];
levels[2].doors = [{open: false}, {open: false}, {open: false}];
levels[2].chests = [{open: false}];
var currentLevel = -1;

var gameState = 'MENU';

var memory = {};
var statusMessage = '';
function setStatusMessage(msg) {
    statusMessage = msg;
    drawPlayingField();
    clearTimeout(setStatusMessage.timoutId);
    setStatusMessage.timeoutId = setTimeout(function () {
        statusMessage = "";
        drawPlayingField();
    }, 3000);
}

function getStatusMessage() {
    return statusMessage;
}

$(function () {
    attachClickHandlers();
    drawGameMenu();
    createPlayer();
    requestAnimationFrame(frame);
});

function getStartPosition() {
    for (var y = 0; y < levels[currentLevel].field.length; y++) {
        for (var x = 0; x < levels[currentLevel].field[y].length; x++) {
            if (levels[currentLevel].field[y][x][1] === 'A') {
                return {x: x, y: y};
            }
        }
    }

    return {x: 0, y: 0};
}

function drawGameMenu() {
    var context = $('.game_menu')[0].getContext('2d', {alpha: false});
    var img = new Image();
    var text = "Click to start level " + (currentLevel + 2);

    img.onload = function () {
        context.drawImage(img, 0, 0);
        context.font = "36px Calibri";
        context.fillStyle = '#ff00dc';
        var textX = (img.width - context.measureText(text).width) / 2 | 0;
        context.fillText(text, textX, img.height - 180);
    };

    img.src = "game_menu.png";
}

function drawPlayingField() {
    function drawLEDs(ledCount, context, x, y) {
        for (var i = 0; i < ledCount; i++) {
            context.beginPath();
            context.arc(x - i * 24, y, 10, 2 * Math.PI, false);
            if (levels[currentLevel].leds[ledCount - 1 - i].on) {
                context.fillStyle = 'yellow';
            } else {
                context.fillStyle = 'white';
            }
            context.fill();
            context.strokeStyle = '#cfcf32';
            context.stroke();
        }
    }

    function roundedRect(context, x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        context.beginPath();
        context.moveTo(x+r - 1, y);
        context.arcTo(x+w, y,   x+w, y+h, r);
        context.arcTo(x+w, y+h, x,   y+h, r);
        context.arcTo(x,   y+h, x,   y,   r);
        context.arcTo(x,   y,   x+w, y,   r);
        context.fill();
        context.stroke();
        context.closePath();
    }

    function drawStatusAreaBorder(context, x, y) {
        context.strokeStyle = '#777';
        context.fillStyle = 'white';
        roundedRect(context, x, y, 300, 28, 4);

        context.fillStyle = '#000';
        context.font = "16px Calibri";
        context.fillText(statusMessage, x + 6, y + 18);
    }

    function drawTile(context, tile, fieldItem, x, y) {
        function drawItem(item, x, y) {
            var imgStr = '<img src="' + item + '.png" class="field_item" id="' + fieldItem.index + '"></img>';
            var itemElement = $(imgStr);
            itemElement.css('top', y + 10);
            itemElement.css('left', x + 10);
            $('.game_area').append(itemElement);
        }

        var door;
        var tileOpenings = parseInt(tile[0], 16);

        if (tileOpenings === 0) {
            context.fillStyle = '#ccc';
        } else {
            context.fillStyle = 'white';
        }

        context.strokeStyle = 'black';

        context.beginPath();
        context.rect(x, y, 68, 68);
        context.fill();
        context.stroke();

        context.beginPath();
        context.strokeStyle = 'white';

        if (tileOpenings & 1) {
            context.moveTo(x + 4, y);
            context.lineTo(x + 64, y);
        }

        if (tileOpenings & 2) {
            context.moveTo(x + 68, y + 4);
            context.lineTo(x + 68, y + 64);
        }

        if (tileOpenings & 4) {
            context.moveTo(x + 4, y + 68);
            context.lineTo(x + 64, y + 68);
        }

        if (tileOpenings & 8) {
            context.moveTo(x, y + 4);
            context.lineTo(x, y + 64);
        }

        if (tile[1] === 'B') {
            drawItem('button', x, y);
        }

        if (tile[1] === 'C') {
            drawItem('chest', x, y);
        }

        if (tile[1] === 'D') {
            door = levels[currentLevel].doors[fieldItem.index];
            if (!door.open) {
                drawItem('door_red', x, y);
            } else {
                drawItem('door_red_open', x, y);
            }
        }

        if (tile[1] === 'E') {
            door = levels[currentLevel].doors[fieldItem.index];
            if (!door.open) {
                drawItem('door_green', x, y);
            } else {
                drawItem('door_green_open', x, y);
            }
        }

        if (tile[1] === 'F') {
            door = levels[currentLevel].doors[fieldItem.index];
            if (!door.open) {
                drawItem('door_blue', x, y);
            } else {
                drawItem('door_blue_open', x, y);
            }
        }

        context.stroke();
    }

    var canvas = $('.field')[0];
    var context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineWidth = 2;

    levels[currentLevel].field.forEach(function (line, lineIndex) {
        line.forEach(function (tile, tileIndex) {
            var item = levels[currentLevel].items[lineIndex][tileIndex];
            drawTile(context, tile, item, tileIndex * 68 + 1, lineIndex * 68 + 1);
        });
    });

    var statusAreaY = levels[currentLevel].field.length * 68 + 10;
    var statusAreaX = levels[currentLevel].field[0].length * 68;
    drawLEDs(levels[currentLevel].leds.length, context, statusAreaX - 12, statusAreaY + 16);
    drawStatusAreaBorder(context, 4, statusAreaY + 2);
}

function createPlayer(startCoordinates) {
    robot = $('<img src="robot.png" class="player">');
    robot.css('top', 6);
    robot.css('left', 6);
    robot.dx = 0;
    robot.dy = 0;
    robot.x = 0;
    robot.y = 0;
    robot.speed = 2;
    robot.currentTileCoords = function () {
        return {
            x: robot.x / 100 | 0,
            y: robot.y / 100 | 0
        };
    };
    $('.game_area').append(robot);
}

function setPlayerPosition(coords) {
    robot.css('top', 6 + coords.y * 68);
    robot.css('left', 6 + coords.x * 68);
    robot.x = coords.x * 100;
    robot.y = coords.y * 100;
}

function attachClickHandlers() {
    $('input.run').on('click', function() {
        ast = buildAst();
        robot.currentInstruction = nextInstruction();
        robot.instructionCompleted = false;
    });

    $('input.restart').on('click', function() {
        location.reload(false);
    });

    $('.game_menu').on('click', function() {
        changeGameState();
    });

    $('body').on('keypress', function (event) {
        if (gameState === 'MENU') {
            var num = -48 + event.which;
            currentLevel = num - 2;
            changeGameState();
        }
    });
}

function changeGameState() {
    if (gameState === 'MENU') {
        delete nextInstruction.instructionArray;
        currentLevel++;
        $('.game_area textarea').val('');
        $('.field_item').remove();
        drawPlayingField();
        setPlayerPosition(getStartPosition());
        $('.game_menu').hide();
        $('input.restart').show();
        gameState = 'GAME';
    } else {
        $('.game_menu').show();
        drawGameMenu();
        robot.currentInstruction = 'wait';
        robot.instructionCompleted = false;
        gameState = 'MENU';
    }
}

function timestamp() {
    return window.performance && window.performance.now ?
        window.performance.now() :
        new Date().getTime();
}

function buildAst() {
    var ast = new TreeNode('', true);
    var script = $('textarea').val();
    var tokenizer = new Tokenizer(script);
    var parser = new Parser(tokenizer, ast);

    var currentToken;

    while (!!(currentToken = tokenizer.getNextToken())) {
        var instruction = parser.parseMethodInvocation();

        if (!instruction) {
            instruction = parser.parseConditionalStatement();
        }

        ast.newLevelChild(instruction);
    }

    return ast;
}

function nextInstruction() {
    if (!nextInstruction.instructionArray) {
        nextInstruction.instructionArray = ast.toArray();
    }

    return nextInstruction.instructionArray.shift();
}

function update(deltaTime) {
    function levelCompleted() {
        for (var i = 0; i < levels[currentLevel].leds.length; i++) {
            if (!levels[currentLevel].leds[i].on) {
                return false;
            }
        }

        return true;
    }

    function standingOnClosedDoor() {
        var tileCoords = robot.currentTileCoords();
        var item = levels[currentLevel].items[tileCoords.y][tileCoords.x];
        var closedDoor = false;

        if (item && item.key === 'doors') {
            closedDoor = !levels[currentLevel].doors[item.index].open;
        }

        return closedDoor;
    }

    function movingThroughWall(direction) {
        var tileCoords = robot.currentTileCoords();
        var tile = levels[currentLevel].field[tileCoords.y][tileCoords.x];
        var tileOpenings = parseInt(tile[0], 16);

        switch (direction) {
            case 'up':    return !(tileOpenings & 1);
            case 'right': return !(tileOpenings & 2);
            case 'down':  return !(tileOpenings & 4);
            case 'left':  return !(tileOpenings & 8);
        }
    }

    function robotIsMoving() {
        return robot.dx !== 0 || robot.dy !== 0;
    }

    function move() {
        robot.x += robot.dx * robot.speed;
        robot.y += robot.dy * robot.speed;

        if (robot.x % 100 === 0 && robot.y % 100 === 0) {
            robot.dx = 0;
            robot.dy = 0;
            robot.instructionCompleted = true;
        }
    }

    function robotPushAnimation(){
        // Quick fix to make it work OK TODO: make it better
        robot.animate({ opacity: 1 }, 50, function () { robot[0].src = "img_push/robot_push_1.png"; });
        robot.animate({ opacity: 1 }, 50, function () { robot[0].src = "img_push/robot_push_2.png"; });
        robot.animate({ opacity: 1 }, 50, function () { robot[0].src = "img_push/robot_push_3.png"; });
        robot.animate({ opacity: 1 }, 50, function () { robot[0].src = "img_push/robot_push_4.png"; });
        robot.animate({ opacity: 1 }, 50, function () { robot[0].src = "img_push/robot_push_5.png"; });
        robot.animate({ opacity: 1 }, 50, function () { robot[0].src = "img_push/robot_push_4.png"; });
        robot.animate({ opacity: 1 }, 50, function () { robot[0].src = "img_push/robot_push_3.png"; });
        robot.animate({ opacity: 1 }, 50, function () { robot[0].src = "img_push/robot_push_2.png"; });
        robot.animate({ opacity: 1 }, 50, function () { robot[0].src = "img_push/robot_push_1.png"; });
        robot.animate({ opacity: 1 }, 50, function () { robot[0].src = "robot.png"; });
    }

    function buttonPushAnimation(button){
        // Quick fix to make it work OK TODO: make it better
        button.animate({ opacity: 1 }, 50, function () { button[0].src = "img_push/button_push_1.png"; });
        button.animate({ opacity: 1 }, 50, function () { button[0].src = "img_push/button_push_2.png"; });
        button.animate({ opacity: 1 }, 50, function () { button[0].src = "img_push/button_push_3.png"; });
        button.animate({ opacity: 1 }, 50, function () { button[0].src = "img_push/button_push_2.png"; });
        button.animate({ opacity: 1 }, 50, function () { button[0].src = "img_push/button_push_1.png"; });
        button.animate({ opacity: 1 }, 50, function () { button[0].src = "button.png"; });
    }


    var tileCoords = robot.currentTileCoords();
    var currentInstruction = (robot.currentInstruction || '').split(' ');
    var item;

    switch (currentInstruction[0]) {
        case 'right':
        case 'left':
        case 'down':
        case 'up':
            if (!robotIsMoving()) {
                if (movingThroughWall(currentInstruction[0])) {
                    setStatusMessage("You can't walk through walls");
                    robot.currentInstruction = nextInstruction();
                    return;
                } else if (standingOnClosedDoor()) {
                    setStatusMessage("You banged straight in to a closed door");
                    robot.currentInstruction = nextInstruction();
                    return;
                }

                switch (currentInstruction[0]) {
                    case 'right': robot.dx = 1;  break;
                    case 'left':  robot.dx = -1; break;
                    case 'down':  robot.dy = 1;  break;
                    case 'up':    robot.dy = -1; break;
                }
            }
            move();
            break;
        case 'pushButton':
            robotPushAnimation();
            item = levels[currentLevel].items[tileCoords.y][tileCoords.x];
            if (item && item.key === 'buttons') {
                var imgButton = $('#'+item.index);
                // Why is buttonPushAnimation not working?
                buttonPushAnimation(imgButton);
                var button = levels[currentLevel].buttons[item.index];
                var controlledItem = levels[currentLevel][button.controlls.key][button.controlls.index];
                controlledItem.on = !controlledItem.on;
                drawPlayingField();
            } else {
                setStatusMessage("No button found here");
            }
            robot.instructionCompleted = true;
            break;
        case 'openChest':
            var keys = ['red', 'green', 'blue'];
            var foundKey = keys[Math.floor(Math.random() * keys.length)];
            item = levels[currentLevel].items[tileCoords.y][tileCoords.x];
            if (item && item.key === 'chests') {
                var chest = levels[currentLevel].chests[item.index];
                if (!chest.open) {
                    chest.open = true;
                    robot.key = foundKey;
                    robot[0].src = 'robot_key_' + foundKey + '.png';
                    setStatusMessage("You collected a " + foundKey + " key!");
                } else {
                    setStatusMessage("You can't open an already open chest");
                }
            } else {
                setStatusMessage("Nice try, but there is no chest here");
            }
            robot.instructionCompleted = true;
            break;
        case 'openDoor':
            var tile = levels[currentLevel].field[tileCoords.y][tileCoords.x];
            item = levels[currentLevel].items[tileCoords.y][tileCoords.x];
            if (item && item.key === 'doors') {
                var door = levels[currentLevel].doors[item.index];
                if (tile[1] === 'D' && robot.key === 'red' ||
                        tile[1] === 'E' && robot.key === 'green' ||
                        tile[1] === 'F' && robot.key === 'blue') {
                    door.open = true;
                    robot[0].src = 'robot.png';
                } else {
                    setStatusMessage("You need the correct key to open this door");
                }

                $('.field_item').remove();
                drawPlayingField();
            } else {
                setStatusMessage("There is no door");
            }

            robot.instructionCompleted = true;
            break;
        case 'hasRedKey':
            memory.retVal = robot.key === 'red';
            robot.currentInstruction = nextInstruction();
            return;
        case 'hasGreenKey':
            memory.retVal = robot.key === 'green';
            robot.currentInstruction = nextInstruction();
            return;
        case 'hasBlueKey':
            memory.retVal = robot.key === 'blue';
            robot.currentInstruction = nextInstruction();
            return;
        case 'cond':
            if (memory.retVal) {
                nextInstruction.instructionArray.unshift(currentInstruction[1]);
            }

            robot.currentInstruction = nextInstruction();

            return;
    }

    if (robot.instructionCompleted) {
        robot.currentInstruction = undefined;

        if (!robot.pause) {
            robot.pause = 500;
        }

        robot.pause -= deltaTime;

        if (robot.pause <= 0) {
            delete robot.pause;

            if (levelCompleted()) {
                changeGameState();
            } else {
                robot.currentInstruction = nextInstruction();
                robot.instructionCompleted = false;
            }
        }
    }
}

function render() {
    // The robot takes 100 steps when moving from one map tile to the next
    // Each map tile is 68 x 68 pixels
    // So each robot step is 68/100 pixels
    robot.css('left', 6 + Math.round(robot.x * 68 / 100));
    robot.css('top', 6 + Math.round(robot.y * 68 / 100));
}

function frame() {
    now = timestamp();
    deltaTime = now - last;

    if (gameState === 'GAME') {
        update(deltaTime);
        render(deltaTime);
    }

    last = now;

    requestAnimationFrame(frame);
}

function TreeNode(data, isRoot) {
    this.data = data;
    this.isRoot = isRoot;
    this.children = [];
}

TreeNode.prototype.newLevelChild = function(data) {
    if (this.children.length === 0) {
        this.children.push(new TreeNode(data));
    } else {
        this.children[0].newLevelChild(data);
    }
};

TreeNode.prototype.toArray = function() {
    var array = this.data ? this.data.toArray() : [];

    if (this.children.length) {
        var childArray = this.children[0].toArray();
        array = this.isRoot ? childArray : array.concat(childArray);
    }

    return array;
};

function MethodInvocation(method, invocations) {
    this.method = method;
    this.invocations = invocations || 1;
}

MethodInvocation.prototype.toArray = function () {
    var array = [];

    for (var i = 0; i < this.invocations; i++) {
        array.push(this.method);
    }

    return array;
};

MethodInvocation.create = function (name, args) {
    if (name.indexOf('move') === 0) {
        var direction = name.substring(4, name.length).toLowerCase();
        var repetitions = args[0];
        methodInvocation = new MethodInvocation(direction, repetitions);
    } else {
        methodInvocation = new MethodInvocation(name);
    }

    return methodInvocation;
};

function ConditionalStatement(methodInvocation, ifPart) {
    this.methodInvocation = methodInvocation;
    this.ifPart = ifPart;
}

ConditionalStatement.prototype.toArray = function () {
    var array = this.methodInvocation.toArray();
    array.push('cond ' + this.ifPart.toArray()[0]);

    return array;
};


function Tokenizer(code) {
    this.tokens = code
        .split(/([().])|[; \n]/)
        .filter(function (item) { return item; });
    this.currentToken = this.tokens[0];
}

Tokenizer.prototype.getNextToken = function () {
    return (this.currentToken = this.tokens.shift());
};

Tokenizer.prototype.getCurrentToken = function () {
    return this.currentToken;
};

function Parser(tokenizer, ast) {
    this.tokenizer = tokenizer;
    this.ast = ast;
}

Parser.prototype.parseMethodInvocation = function () {
    var token = this.tokenizer.getCurrentToken();

    if (token === 'robot' && this.tokenizer.getNextToken() === '.') {
        var methodName = this.tokenizer.getNextToken();
        this.tokenizer.getNextToken(); // Eat '('

        var args = [];
        while (this.tokenizer.getNextToken() != ')') {
            args.push(this.tokenizer.getCurrentToken());
        }

        return MethodInvocation.create(methodName, args);
    }
};

Parser.prototype.parseConditionalStatement = function () {
    var token = this.tokenizer.getCurrentToken();

    if (token === 'if' && this.tokenizer.getNextToken() === '(') {
        this.tokenizer.getNextToken(); // Prep tokenizer for parsing method invocation
        var methodInvocation = this.parseMethodInvocation();
        this.tokenizer.getNextToken(); // Eat ')'
        this.tokenizer.getNextToken(); // Eat '{'
        this.tokenizer.getNextToken(); // Prep tokenizer for parsing method invocation
        var ifPart = this.parseMethodInvocation();
        this.tokenizer.getNextToken(); // Eat '}'

        return new ConditionalStatement(methodInvocation, ifPart);
    }
};
