/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, white: true, bitwise: true */
/*global $, window, document*/

var levelSize =
{
    "beginner" : { linhas: 5, colunas: 7},
    "intermediate" : { linhas: 9, colunas: 11},
    "advanced" : { linhas: 13, colunas: 17},
    "expert" : {linhas: 19, colunas: 23}
};

var data = 
{
    board : {/*level, line, column*/},
    points : {/*user, other*/},
    time : {/*user, other, userNow*/},
    login : {/*logged, username, password*/},
    game : {/*running, canPlay, clock, time, singlePlayer, possibilities*/},
    server : {/*key, gameID, opponent*/ }
};

// MultiArray
var board;  // Table
var scores; // HighScores
var scoresOF; // HighScores OFFLINE

var menuUserHidden = true;
var highScoresHidden = true;

function getCell(l, c, where) // where == board or boardHS
{
    'use strict';
   
    var boardElement = document.getElementById(where);
    return boardElement.rows[l].cells[c];
}

function createBoardHS()
{
    'use strict';
    
    var i, j;
    scores = [];
    scoresOF = [];
    for(i = 0; i < 40; i++)
    {
        scores[i] = new Array(3);
        scoresOF[i] = new Array(3);
    }

    for(i = 0; i < (scores.length / 4); i++)
    {
        var r = document.getElementById('boardHS').insertRow();
  
        for(j = 0; j < scores[i].length; j++)
        {
            var c = r.insertCell();
            
            var cellHS = getCell(i, j, 'boardHS');
            
            if(j===0)
            {
                cellHS.className = 'namesHS';
            }
            else if(j===1)
            {
                cellHS.className = 'boxesHS';
            }
            else if(j===2)
            {
                cellHS.className = 'timeHS';
            }
        }
    }
    
    // all scores start with zero
    for(i = 0; i < scores.length; i++)
    {
        for(j = 0; j < scores[i].length; j++)
        {
            scores[i][j] = -1;
            scoresOF[i][j] = -1;
        }
    }
}

function highScores(winner) // date HighScores 1st step
{
    'use strict';
    
    var i, j, a, b;
    var timeTemp;
    var pointsTemp;
    
    if(winner === "PC")    
    {
        timeTemp = data.time.other;
        pointsTemp = data.points.other;
    }
    else
    {
        timeTemp = data.time.user;
        pointsTemp = data.points.user;
    }
    
    if(data.board.level === "beginner")
    {
        a = 0;
        b = 10;
    }
    else if(data.board.level === "intermediate")
    {
        a = 10;
        b = 20;
    }
    else if(data.board.level === "advanced")
    {
        a = 20;
        b = 30;
    }
    else
    {
        a = 30;
        b = 40;
    }

    for(i = a; i < b; i++)
    {
        if(pointsTemp > scoresOF[i][1]) // score > highScore (squares)
        {
            for(j = b - 1; j > i; j--) // Swap
            {   
                scoresOF[j][0] = scoresOF[j-1][0];
                scoresOF[j][1] = scoresOF[j-1][1];
                scoresOF[j][2] = scoresOF[j-1][2];
            }
            scoresOF[i][0] = winner;
            scoresOF[i][1] = pointsTemp;
            scoresOF[i][2] = timeTemp;

            break;
        }
        else if(pointsTemp === scoresOF[i][1] && timeTemp < scoresOF[i][2]) // score > highScore (time)
        {
            for(j = b - 1; j > i; j--) // Swap
            {   
                scoresOF[j][0] = scoresOF[j-1][0];
                scoresOF[j][1] = scoresOF[j-1][1];
                scoresOF[j][2] = scoresOF[j-1][2];
            }
            scoresOF[i][0] = winner;
            scoresOF[i][1] = pointsTemp;
            scoresOF[i][2] = timeTemp;

            break;
        }
    }
}

/* RESET VARS AND BOARD */
function clearBoard()
{
    'use strict';
    
    var i;
    data.game.running = false;
    
    for(i = 0; i < data.board.line; i++)
    {
        document.getElementById("board").deleteRow(0);
    }   
    clearInterval(data.game.clock);
}

function clearData() // Reset variables (new game)
{
    'use strict';
    
    clearInterval(data.game.clock);
    
    document.getElementById('opponentSeconds').innerHTML = "000";
    document.getElementById('userSeconds').innerHTML = "000";
   
    data.game.time = 0;
    data.time.user = 0;
    data.time.other = 0;
    data.points.user = 0;
    data.points.other = 0;
    data.time.userNow = true;
    
    if(data.game.running)
    {
        clearBoard();
    }
}

function messageBox(color, message) // Final message
{
    'use strict';

    document.getElementById('message').innerHTML = message;   
    document.getElementById('boxMessage').style.backgroundColor = color;
}

/* CHOOSE THE FINAL MESSAGE */
function finalState()
{
    'use strict';
    document.getElementById('loading').style.display = 'none';

    if(data.server.updsrc !== null && data.server.updsrc !== undefined)
    {
        data.server.updsrc.close();
        data.server.updsrc = null;
        leave();
    }
    
    var winner;
    
    if(data.points.user > data.points.other)
    {
        messageBox('lightgreen', "YOU WIN");
        winner = "user_unknown";
    }
    else if(data.points.user < data.points.other)
    {
        messageBox('coral', "YOU LOSE");
        winner = "PC";
    }   
    else
    {        
        if(data.time.other > data.time.user)
        {
            messageBox('lightgreen', "YOU WIN");
            winner = "user_unknown";
        }
        else
        {
            messageBox('coral', "YOU LOSE");
            winner = "PC";
        }
    }
    
    if(winner === "user_unknown" && data.login.logged)
    {
        winner = data.login.username;
    }
    
    document.getElementById('loading').style.display = 'none';
    document.getElementById('boxMessage').style.display = 'table';

    clearInterval(data.game.clock);
    
    if(data.game.singlePlayer)
    {
        highScores(winner);
        var scoresJSON = JSON.stringify(scoresOF);
        localStorage.setItem("rank", scoresJSON);
    }
    
    data.game.singlePlayer = true;
}

/* WHO DO SQUARE */
function square(who,l,c)
{
    'use strict';
    
    var cell = getCell(l, c, 'board');
    
    if(who === -1)    
    {
        cell.className = "square_1";
        data.points.user++;
    }
    else
    {
        cell.className = "square_2";
        data.points.other++;
    }
}

//if(who == 1) client
//if(who == 2) PC/other
//play on board[l][c]
function someonePlay(who,l,c)
{
    'use strict';
    
    var vertical; 
    var change = false;
    
    if(l%2 === 0)
    {
        vertical = true;       
    }
    else
    {
        vertical = false;
    }
    
    if(vertical)
    {
        if(l > 0) // Possivel quadrado de cima
        {
            if(board[l-2][c] !== 0 && board[l-1][c-1] !== 0 && board[l-1][c+1] !== 0)
            {
                change = true;
                square(who,l-1,c);
            }
        }
        if(l < data.board.line-1) // Possivel quadrado de baixo
        {
            if(board[l+2][c] !== 0 && board[l+1][c-1] !== 0 && board[l+1][c+1] !== 0)
            {
                change = true;
                square(who,l+1,c);
            }
        }
    }
    else
    {
        if(c > 0) // Possivel quadrado da esquerda
        {
            if(board[l][c-2] !== 0 && board[l-1][c-1] !== 0 && board[l+1][c-1] !== 0)
            {
                change = true;
                square(who,l,c-1);
            }
        }
        if(c < data.board.column-1) // Possivel quadrado da direita
        {
            if(board[l][c+2] !== 0 && board[l-1][c+1] !== 0 && board[l+1][c+1] !== 0)
            {
                change = true;
                square(who,l,c+1);
            }
        }
    }
  
    if(change)
    {
        /* Update data */
        document.getElementById('userPoints').innerHTML = data.points.user;
        document.getElementById('pcPoints').innerHTML = data.points.other;
        
        /* End game? */
        if(data.points.user + data.points.other === ((data.board.line-1)/2) * ((data.board.column-1)/2))
        {
            finalState();
        }
        
        /* To know if change something */
        return true;
    }
    /* Or not have changes */
    return false;
}

function playPC() // Single Player
{
    'use strict';
    
    var i, j;
    var number_random = Math.random() * (data.game.possibilities - 1) + 1;
    number_random = Math.round(number_random);
    var count = 0;
    for(i = 0; i < data.board.line; i++)
    {   
        for(j = 0; j < data.board.column; j++)
        {        
            if((i%2 !== 0 && j%2 === 0) || (i%2 === 0 && j%2 !== 0))
            {
                if(board[i][j] !== -1 && board[i][j] !== -2)
                {                                   
                    count ++;
                    
                    if(count === number_random)
                    {
                        board[i][j] = -2;
                        var change = someonePlay(-2,i,j);
                        getCell(i, j, 'board').className = "active_2";

                        data.game.possibilities--;
                        
                        if(change)
                        {
                            var temp = Math.random() * (3000 - 1000) + 1000;
                            setTimeout(playPC, temp);
                        }
                        else
                        {
                            document.getElementById('loading').style.display = 'none';
                            data.game.canPlay = true;
                            data.time.userNow = true;
                        }
                        return;
                    }
                }
            }
        }
    }
}

function play(cell, l, c)
{
    'use strict';

    cell.onclick=function()
    {
        if(board[l][c] !== 0 || !data.game.canPlay)
        {
            return;
        }
        
        data.game.possibilities--;
        cell.className = "active_1";
        board[l][c] = -1;
        
        
        if(!data.game.singlePlayer)
        {
            data.game.canPlay = false;
            
            notify(l,c);
            data.time.userNow = false;
        }
        
        var change = someonePlay(-1,l,c);
        
        if(data.game.singlePlayer && !change) // SinglePlayer
        {   
            data.time.userNow = false;
            document.getElementById('loading').style.display = 'block';
            data.game.canPlay = false;
            
            var temp = Math.random() * (3000 - 1000) + 1000;
            setTimeout(playPC, temp);
        }  
    };      
}

function color(l,c,flag)
{
    'use strict';
   
    var cell = getCell(l, c, 'board');
    
    if(flag === 1)
    {
        cell.className = "dots";
    }
    else if(flag === 0)
    {
        cell.className = "squares";
    }
    else
    {
        cell.className = "lines";
        play(cell, l, c); 
        data.game.possibilities++;
    }
}

function timer()
{
    'use strict';
    
    if(data.time.userNow)
    {
        data.time.user++;
    }
    else
    {
        data.time.other++;
    }

    data.game.time++;
    
    if(data.time.user < 10)
    {
        document.getElementById('userSeconds').innerHTML = "00" + data.time.user;
    }
    else if(data.time.user < 100)
    {
        document.getElementById('userSeconds').innerHTML = "0" + data.time.user;
    }
    else
    {
        document.getElementById('userSeconds').innerHTML = data.time.user;
    }
    
    if(data.time.other < 10)
    {
        document.getElementById('opponentSeconds').innerHTML = "00" + data.time.other;
    }
    else if(data.time.other < 100)
    {
        document.getElementById('opponentSeconds').innerHTML = "0" + data.time.other;
    }
    else
    {
        document.getElementById('opponentSeconds').innerHTML = data.time.other;
    }
}

function draw() //make dots, lines and squares
{
    'use strict';
   
    var i, j;
    data.game.possibilities = 0;
    
    for(i = 0; i < data.board.line; i++)
    {   
        for(j = 0; j < data.board.column; j++)
        {        
            if(i%2 === 0 && j%2 === 0)
            {
                color(i,j,1);
            }
            else if(i%2 !== 0 && j%2 !== 0)
            {
                color(i,j,0);
            }
            else
            {
                color(i,j,2);
            }
        }
    }
}

function createBoard() // Game Board
{
    'use strict';
    
    clearData();
    
    document.getElementById('pcPoints').innerHTML = "0";
    document.getElementById('userPoints').innerHTML = "0";
    document.getElementById('message').innerHTML = "";   
    
    document.getElementById('selectArea').style.display = 'none';
    document.getElementById('header').style.display = 'none';
    document.getElementById('topBar').style.display = 'none';
    document.getElementById('divSpace').style.display = 'none';
    document.getElementById('menuUser').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';
    if(!data.game.singlePlayer)
    {
        document.getElementById('opponentID').innerHTML = data.server.opponent;
        document.getElementById('quitButton').style.height= "125px";
        document.getElementById('reStartButton').style.display = 'none';
    }    
    else
    {
        document.getElementById('opponentID').innerHTML = "Computer";
        document.getElementById('quitButton').style.height= "75px";
        document.getElementById('reStartButton').style.display = 'block';
    }

    var i;
    data.game.canPlay = true;
    data.game.running = true;
   
    data.board.line = levelSize[data.board.level].linhas;
    data.board.column = levelSize[data.board.level].colunas;   
    
    board = [];
    board.length = data.board.line;
		
    for(i = 0; i < data.board.line; i++)
    {
        var r = document.getElementById('board').insertRow();
        var j;
        
        board[i] = [];
        board[i].length = data.board.column;
        
        for(j = 0; j < data.board.column; j++)
        {
            var c = r.insertCell();
            board[i][j] = 0;
        }
    }
    draw();
    var divWidth = document.getElementById('board').offsetWidth;
    document.getElementById('gameInfo').style.width= divWidth + "px";
    document.getElementById('message').style.width= divWidth + "px";

    
    data.game.clock = setInterval(timer, 1000);
}

function checkLogin()
{
    'use strict';
   
    var nameRegex = /^[a-zA-Z0-9\_]+$/;
    data.login.username = document.getElementById('username').value;
    data.login.password = document.getElementById('password').value;
    var match = document.getElementById('username').value.match(nameRegex);
    
    if(data.login.username.length === 0)
    {
        alert("Your username is empty!");
        return false;      
    }
    
    if(match === null)
    {
        alert("Your username is not valid. Only characters A-Z, a-z and '_' are  acceptable.");
        return false;
    }
    
    if(data.login.username.length > 15)
    {
        alert("You have more than 15 characters on username!");
        return false;
    }
    
    if(data.login.password.length === 0)
    {
        alert("Your password is empty!");
        return false;
    }
    
    if(data.login.password.length < 5)
    {
        alert("Your password is too small!");
        return false;
    }
    
    document.getElementById('userName').innerHTML = data.login.username;
    return true;
}

function chooseButtons() // Myaccount bar (back || logOut)
{
    'use strict';

    if(data.login.logged)
    {
        document.getElementById('myAccountButton').style.display = "table";
        document.getElementById('goBackButton').style.display = "none";
    }
    else
    {
        document.getElementById('goBackButton').style.display = "table";
        document.getElementById('myAccountButton').style.display = "none";
    }
}

function selectMode(button) // Levels
{
    'use strict';
    
    button.onclick = function()
    {
        data.board.level = button.id;
        if(data.login.logged)
        {
            document.getElementById('selectLevel').style.display = 'none';
            document.getElementById('selectMode').style.display = 'block';

            document.getElementById('singleplayer').onclick = function()
            {
                data.game.singlePlayer = true;
                createBoard(data.board.level);   
            };
            
            document.getElementById('multiplayer').onclick = function()
            {
                data.game.singlePlayer = false;
                join();
                //update();
            };
        }
        else
        {
             createBoard(data.board.level);
        }
    };
}

Number.prototype.round = function(places) // Arredonda direito as casas decimais 
{
    'use strict';
    
    return +(Math.round(this + "e+" + places)  + "e-" + places);
};

function writeBoardHS(a, b) // highscores
{
    'use strict';
    
    var i, j;
    
    for(i = a; i < b; i++)
    {
        var rank;
        rank = new Array(3);
        if(data.login.logged)
        {
            rank = scores[i];   
        }
        else
        {
            var rankJSON = localStorage.getItem("rank");
            if(rankJSON !== undefined && rankJSON !== null)
            {
                rank = JSON.parse(rankJSON)[i];
            }
            rank = scoresOF[i];
        }
        
        for(j= 0; j < rank.length; j++)
        {       
           
            if(rank[j] === -1)
            {
                if(j === 1)
                {
                    document.getElementById('boardHS').rows[i-a].cells[j].innerHTML = '--';

                }
                else
                {
                    document.getElementById('boardHS').rows[i-a].cells[j].innerHTML = '---';
                }
            }
            else
            {
                if(j === 0)
                {
                    document.getElementById('boardHS').rows[i-a].cells[j].innerHTML = (i-a+1) + '. ' + rank[j];
                }
                else if(j === 1)
                {
                    if(rank[j] < 10)
                    {
                        document.getElementById('boardHS').rows[i-a].cells[j].innerHTML = "0" + rank[j];
                    }
                    else
                    {
                        document.getElementById('boardHS').rows[i-a].cells[j].innerHTML = rank[j];
                    }
                }
                else
                {
                    if(rank[j] < 10)
                    {
                        document.getElementById('boardHS').rows[i-a].cells[j].innerHTML = "00" + rank[j];
                    }
                    else if(rank[j] < 100)

                    {
                        document.getElementById('boardHS').rows[i-a].cells[j].innerHTML = "0" + rank[j];//.round(2);
                    }
                    else
                    {
                        document.getElementById('boardHS').rows[i-a].cells[j].innerHTML = rank[j];
                    }
                }
            }   
        }
    }
}

function calculateRankingStorage(level)
{
    'use strict';
    
    var Json = sessionStorage.getItem(level);
    var responseObject = JSON.parse(Json); 
    var a, b;

    if(responseObject === null || responseObject === undefined)
    {
        return;
    }
    
    if(level === "beginner")
    {
        a = 0;
        b = 10;
    }
    else if(level === "intermediate")
    {
        a = 10;
        b = 20;
    }
    else if(level === "advanced")
    {
        a = 20;
        b = 30;
    }
    else
    {
        a = 30;
        b = 40;
    }
    
    var i;
    for(i = a; i < b; i++)
    {
        if(responseObject.ranking[i-a] !== undefined && responseObject.ranking[i-a] !== null)
        {
            scores[i][0] = responseObject.ranking[i-a].name;
            scores[i][1] = responseObject.ranking[i-a].boxes;
            scores[i][2] = responseObject.ranking[i-a].time;
        }
    }
}

function boardHighScores(button)
{
    'use strict';
    calculateRankingStorage(button);
    
    if(button === "beginner")
    {
        writeBoardHS(0, 10);
    }
    else if(button === "intermediate")
    {
        writeBoardHS(10, 20);
    }
    else if(button === "advanced")
    {
        writeBoardHS(20, 30);
    }
    else if(button === "expert")
    {
        writeBoardHS(30, 40);
    }
}

function showHighScores(button) // HighScore window
{
    'use strict';
      
     button.onclick = function()
     {
         if(!data.login.logged)
         {
            var obj = sessionStorage.getItem(button.value);
             
            document.getElementById('titleHS').innerHTML = '&xlArr;' + " " + button.value; 
            document.getElementById('buttonsHS').style.display = 'none';
            document.getElementById('infoHS').style.display = 'table';
            boardHighScores(button.value);
         }
         else
         {
            document.getElementById('titleHS').innerHTML = '&xlArr;' + " " + button.value; 
            document.getElementById('buttonsHS').style.display = 'none';
            document.getElementById('infoHS').style.display = 'table';
            boardHighScores(button.value);
         }
     };
}

function createSelectArea() // Levels page 
{
    'use strict';
    
    chooseButtons();    
    document.getElementById('header').style.display = 'block';
    document.getElementById('selectArea').style.display = 'block';
    document.getElementById('topBar').style.display = 'block';
    document.getElementById('selectLevel').style.display='block';    

    document.getElementById('waitingForOpponent').style.display='none';
    document.getElementById('highScores').style.display='none';
    document.getElementById('selectMode').style.display='none';    
    document.getElementById('loginArea').style.display = 'none';
    document.getElementById('gameArea').style.display = 'none';
    document.getElementById('boxMessage').style.display = 'none';
    
    if(menuUserHidden)
    { 
        menuUserHidden = true;
        document.getElementById('divSpace').style.display = 'none';
        document.getElementById('menuUser').style.display = 'none';
        document.getElementById('myAccountText').innerHTML = "MyAccount " + '&dtrif;';   
    }
    
    highScoresHidden = true;
}

function createLoginArea() // Initial page
{
    'use strict';
    
    menuUserHidden = true;
    document.getElementById('loginArea').style.display = 'block';
    document.getElementById('header').style.display = 'block';

    document.getElementById('selectArea').style.display = 'none';    
    document.getElementById('gameArea').style.display = 'none';
    document.getElementById('topBar').style.display = 'none';  
    document.getElementById('divSpace').style.display = 'none';
    document.getElementById('menuUser').style.display = 'none';
    document.getElementById('waitingForOpponent').style.display = 'none';
}

// ========================================================================
//                          Server connection
// ========================================================================
/*
function serverConnection(post, requestJSON)
{
    'use strict';

    var responseObject;
    var responseJSON;
    
    //var requestJSON = JSON.stringify(requestObject);
    var request = new XMLHttpRequest();
    request.open("POST", "http://twserver.alunos.dcc.fc.up.pt:8000/register", true);
    request.setRequestHeader("Content-type", "application/json");

    request.onload = function()
    {
        responseJSON = request.responseText;
        responseObject = JSON.parse(responseJSON);
        
        
        alert(responseJSON);
        //alert("2" + responseObject);

        if(request.readyState !== 4)
        {
            alert("ERROR");
            return {};

        }
        else if(request.status !== 200)
        {
            alert("ERROR"); 
            return {};
        }
        else
        {
            return responseObject;
        }
 
    };
    request.send(requestJSON);   
}
*/

function register()
{
    'use strict';
    
    var requestObject;
    var requestJSON;
    var responseJSON;
    var responseObject;
    var request;
    
    requestObject = {};
    
    requestObject.name = document.getElementById('username').value;
    requestObject.pass = document.getElementById('password').value;
     
    requestJSON = JSON.stringify(requestObject);
    
    request = new XMLHttpRequest();
    
    request.open("POST", "http://twserver.alunos.dcc.fc.up.pt:8000/register", true);
    request.setRequestHeader("Content-type", "application/json");
    
    request.onload = function()
    {
        responseJSON = request.responseText;
        responseObject = JSON.parse(responseJSON);
        
        if(request.readyState !== 4)
        {
            return;
        }
        if(request.status !== 200)
        {
            return;
        }

        if(responseObject.error === undefined)
        {
            data.login.logged = true;
            data.game.singlePlayer=false;
            createSelectArea();
        }
        else
        {
             alert(responseObject.error);
        }    
    };
    request.send(requestJSON);
}

function calculatePositionForServer(l, c)
{
    'use strict';

    var struct = {};
    if(l%2 === 0 && c%2 !== 0)
    {
        struct.o = "h";
        struct.l = 1 + (l / 2);
        struct.c = (c + 1) / 2;
    }
    else if(l%2 !== 0 && c%2 === 0)
    {
        struct.o = "v";
        struct.l = (l + 1) / 2;
        struct.c = 1 + (c / 2);
    }
    
    return struct;    
}

function calculatePositionForHere(o, l, c)
{
    'use strict';

    var struct = {};
    if(o === "h")
    {
        struct.l = 2 * (l - 1);
        struct.c = (2 * c) - 1;
    }
    else
    {
        struct.l = (2 * l) - 1;
        struct.c = 2 * (c - 1);
    }
    return struct;    
}


function leave()
{
    'use strict';
    
    var requestObject;
    var responseObject;
    var requestJSON;
    var responseJSON;
    var request;
    
    requestObject = {};
    
    requestObject.name = data.login.username;
    requestObject.key = data.server.key;
    requestObject.game = data.server.gameID;
    requestJSON = JSON.stringify(requestObject);
    
    request = new XMLHttpRequest();
    
    request.open("POST", "http://twserver.alunos.dcc.fc.up.pt:8000/leave", true);
    request.setRequestHeader("Content-type", "application/json");
    
    request.onload = function()
    {
        responseJSON = request.responseText;
    
        responseObject = JSON.parse(responseJSON);
        
        if(request.readyState !== 4)
        {
            return;
        }
        if(request.status !== 200)
        {
            return;
        }
    };
    request.send(requestJSON);
}

function notify(l, c)
{
    'use strict';
    
    var requestObject;
    var responseObject;
    var requestJSON;
    var responseJSON;
    var request;
    
    requestObject = {};

    var struct = calculatePositionForServer(l, c);

    requestObject.name = data.login.username;
    requestObject.key = data.server.key;
    requestObject.game = data.server.gameID;   
    requestObject.orient = struct.o;
    requestObject.row = struct.l;
    requestObject.col = struct.c;
    
    requestJSON = JSON.stringify(requestObject);
    
    request = new XMLHttpRequest();
    
    request.open("POST", "http://twserver.alunos.dcc.fc.up.pt:8000/notify", true);
    request.setRequestHeader("Content-type", "application/json");
    
    request.onload = function()
    {
        responseJSON = request.responseText;
    
        responseObject = JSON.parse(responseJSON);
		
		if(request.readyState !== 4)
        {
            return;
        }
		
        if(request.status !== 200)
        {
            return;
        }
        
        if(responseObject.error !== undefined)
        {
            alert(responseObject.error);
        }
    };
    request.send(requestJSON);
}

function update(gameid, keyy)
{
    'use strict';

    data.server.updsrc = new EventSource('http://twserver.alunos.dcc.fc.up.pt:8000/update?name=' + data.login.username + '&game=' + gameid + '&key=' + keyy);
    
    data.server.updsrc.onmessage = function (ev) 
    {
        console.log(ev.data);
        var evjava = JSON.parse(ev.data);
            
        if(evjava.opponent !== undefined)
        {
            data.server.opponent = evjava.opponent;
            data.login.logged = true;
            data.game.singlePlayer = false;
            createBoard();
            document.getElementById('waitingForOpponent').style.display = 'none';

            if(evjava.turn === data.login.username)
            {
                data.game.canPlay = true;
                data.time.userNow = true;
                document.getElementById('loading').style.display = 'none';
            }
            else
            {
                data.time.userNow = false;
                document.getElementById('loading').style.display = 'block';
            }
        }
        else if(evjava.move !== undefined)
        {
            
            if(evjava.move.name === data.server.opponent)
            {
                var struct = calculatePositionForHere(evjava.move.orient, evjava.move.row, evjava.move.col);
                
                someonePlay(2, struct.l, struct.c);
                board[struct.l][struct.c] = -2;
                data.time.other = Math.round(evjava.move.time);
                getCell(struct.l, struct.c, 'board').className = "active_2";
            }
            else
            {
                data.time.user = Math.round(evjava.move.time);
            }
            
            if(evjava.turn === data.login.username)
            {
                data.game.canPlay = true;
                data.time.userNow = true;
                document.getElementById('loading').style.display = 'none';
            }
            else if(evjava.winner !== undefined)
            {
                if(evjava.move.name === data.login.username)
                {
                    data.time.user = Math.round(evjava.move.time);
                }
                else
                {
                    data.time.other = Math.round(evjava.move.time);
                }
                
                document.getElementById('loading').style.display = 'none';
            }
            else
            {
                document.getElementById('loading').style.display = 'block';
            }
        }
        else
        {
            alert(evjava.error);
        }
    };
}

function join()
{
    'use strict';
    
    var requestObject;
    var responseObject;
    var requestJSON;
    var responseJSON;
    var request;
    
    requestObject = {};
    
    requestObject.name = document.getElementById('username').value;
    requestObject.pass = document.getElementById('password').value;
    requestObject.level = data.board.level;
    requestObject.group = 36;
    requestJSON = JSON.stringify(requestObject);
    
    request = new XMLHttpRequest();
    
    request.open("POST", "http://twserver.alunos.dcc.fc.up.pt:8000/join", true);
    request.setRequestHeader("Content-type", "application/json");
      
    request.onload = function()
    {
        responseJSON = request.responseText;
    
        responseObject = JSON.parse(responseJSON);
        
        /*if(request.readyState !== 4)
        {
            return;
        }
        if(request.status !== 200)
        {
            return;
        }*/
        
        data.server.gameID = responseObject.game;
        data.server.key = responseObject.key;
        document.getElementById('selectArea').style.display = 'none';
        document.getElementById('waitingForOpponent').style.display = 'block';

        update(responseObject.game, responseObject.key);
    };
    request.send(requestJSON);
}

function ranking(level)
{
    'use strict';
    
    var requestObject;
    var responseObject;
    var requestJSON;
    var responseJSON;
    var request;
    
    requestObject = {};
    requestObject.level = level;
    requestJSON = JSON.stringify(requestObject);
    
    request = new XMLHttpRequest();
    
    request.open("POST", "http://twserver.alunos.dcc.fc.up.pt:8000/ranking", true);
    request.setRequestHeader("Content-type", "application/json");
      
    request.onload = function()
    {
        responseJSON = request.responseText;
        responseObject = JSON.parse(responseJSON);
        sessionStorage.setItem(level, responseJSON);
    };
    request.send(requestJSON);
}

// ========================================================================
//                        Final server connection
// ========================================================================

window.onload = function () 
{
    'use strict';

    createBoardHS();
    
    var rankJSON = localStorage.getItem("rank");
    if(rankJSON !== undefined && rankJSON !== null)
    {
        scoresOF = JSON.parse(rankJSON);
    }

    document.getElementById("password").addEventListener("keyup", function(event) 
    {   
        event.preventDefault();    
        if (event.keyCode === 13) 
        {
            document.getElementById("loginButton").click();
        }
    });
    
    document.getElementById("username").addEventListener("keyup", function(event) 
    {
        event.preventDefault();
        if (event.keyCode === 13) 
        {
            document.getElementById("loginButton").click();
        }
    }); 
    
    var buttons = document.getElementsByClassName('levelButton');
    var i;
    for(i=0; i<buttons.length; i++)
    {
       selectMode(buttons[i]);
    }
    
    var buttonsHS = document.getElementsByClassName('HSButton');
    var j;
    for(j=0; j<buttonsHS.length; j++)
    {
        showHighScores(buttonsHS[j]);
    }
  
    document.getElementById('reStartButton').onclick = function()
	{
        document.getElementById('boxMessage').style.display = 'none';
		createBoard(data.board.level);
	};
    
    document.getElementById('howToPlay').onmouseover = function()
	{
		document.getElementById('rules').style.display = 'table';
	};
    
    document.getElementById('quitButton').onmouseover = function()
	{
        if(data.game.singlePlayer)
        { 
            document.getElementById('quitButton').style.backgroundColor = 'gray';
        }
	};
    
    document.getElementById('quitButton').onmouseout = function()
	{   
        document.getElementById('quitButton').style.backgroundColor = 'white';
	};
    
    document.getElementById('quitButton').onclick = function()
    {
        if(data.game.singlePlayer)
        {
            clearData();
            if(data.server.updsrc !== null && data.server.updsrc !== undefined)
            {
                data.server.updsrc.close();
                data.server.updsrc = null;
                leave();
            }
            data.game.running = false;
            createSelectArea();
        }
    };
    
    document.getElementById('howToPlay').onmouseout = function()
	{   
		document.getElementById('rules').style.display = 'none';
	};
    
    document.getElementById('rules').onmouseover = function()
	{
		document.getElementById('rules').style.display = 'table';
	};
    
    document.getElementById('rules').onmouseout = function()
	{   
		document.getElementById('rules').style.display = 'none';
	};
    
	document.getElementById('loginButton').onclick = function()
	{
        if(checkLogin())
        {
            register();
        }
	};
    
    document.getElementById('offlineButton').onclick = function()
	{
        data.login.logged = false;
        data.game.singlePlayer = true;
	    createSelectArea();
    };
    
    document.getElementById('goBackButton').onclick = function()
    {
        createLoginArea(); 
    };
    
    document.getElementById('myAccountButton').onclick = function()
	{    
        if(menuUserHidden)
        {
            document.getElementById('myAccountText').innerHTML = "MyAccount " + '&utrif;'; 
            document.getElementById('divSpace').style.display = 'block';
            document.getElementById('menuUser').style.display = 'block';
            menuUserHidden = false;    
        }
	    else
        {
            document.getElementById('myAccountText').innerHTML = "MyAccount " + '&dtrif;';   
            document.getElementById('divSpace').style.display = 'none';
            document.getElementById('menuUser').style.display = 'none';
            menuUserHidden = true;
        }
	};
    
    document.getElementById('highScoresButton').onclick = function()
	{    
        if(data.login.logged)
        {
            var buttonsHS = document.getElementsByClassName('HSButton');
            var j;
            for(j=0; j<buttonsHS.length; j++)
            {
                ranking(buttonsHS[j].value);
            }
        }
        
        if(highScoresHidden)
        {
            document.getElementById('highScores').style.display = 'block';
            document.getElementById('buttonsHS').style.display = 'block';
            
            document.getElementById('infoHS').style.display = 'none';
            highScoresHidden = false;
        }
	    else
        {
            document.getElementById('highScores').style.display = 'none';
            highScoresHidden = true;
        }
	};
    
    document.getElementById('titleHSDiv').onclick = function()
	{
         document.getElementById('buttonsHS').style.display = 'block';
         document.getElementById('infoHS').style.display = 'none';
    };
    
    document.getElementById('logoutButton').onclick = function()
    {
        if(!data.game.singlePlayer)
        {
            leave();
            data.game.singlePlayer = false;
        }
        createLoginArea();
    };
    
    document.getElementById('settingsButton').onclick = function()
    {
          document.getElementById('total').style.display = 'block';
          document.getElementById('window').style.display = 'block';
    };
    
    document.getElementById('closeWindow').onclick = function()
    {
          document.getElementById('total').style.display = 'none';
          document.getElementById('window').style.display = 'none';
    };
    
    document.getElementById('total').onclick = function()
    {
          document.getElementById('total').style.display = 'none';
          document.getElementById('window').style.display = 'none';
    };
    
    document.getElementById('selectAgain').onclick = function()
    {
          createSelectArea();
    };
    
    document.getElementById('leave').onclick = function()
    {
        createSelectArea();
        leave();  
    };
    
// ========================================================================
//                                  CANVAS
// ========================================================================

    var img = new Image();
    img.src = 'img/footer.png';
           
    var CanvasXSize = 0;
    var CanvasYSize = 0;
    var speed = 60;
    var scale = 0.5;

    var imgW;
    var imgH;
    var x = 0;
    var clearX;
    var clearY;
    var ctx;
   
    function drawC() 
    {
        ctx.clearRect(0,0,clearX,clearY);

        if(x > CanvasXSize) 
        { 
            x = 0; 
        }
        if(x > CanvasXSize-imgW) 
        { 
            ctx.drawImage(img,x-CanvasXSize+1,0,imgW,imgH); 
        }
    
        ctx.drawImage(img,x,0,imgW,imgH);
        x++;
    }

    img.onload = function() 
    {        
        imgW = img.width*scale;
        imgH = img.height*scale;
        
        var canvas = document.getElementById("canvas");
        canvas.width = imgW;
        canvas.height = imgH;
        
        CanvasXSize = imgW;
        CanvasYSize = imgH;

        clearX = imgW; 
        clearY = imgH;

        ctx = document.getElementById('canvas').getContext('2d');
        return setInterval(drawC, speed);
    };    
};