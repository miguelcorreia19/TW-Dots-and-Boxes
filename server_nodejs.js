                ///////////////////////////////
                //          NODE JS          //
                ///////////////////////////////
 
var debug = true;
 
var stdin = process.openStdin();
 
stdin.addListener("data", function(d)
{
    if(d.toString().trim() == "debug")
    {
        debug = !debug;
        console.log("debug = " + debug);
    }
});
 
var colors = require('colors');
var crypto = require('crypto');
var mysql = require('mysql');
var express = require('express'); // Para HTTP
var cors = require('cors'); // Para HTTP com EXPRESS
var chance = require('chance'); // Gerar salts
 
var event = express();
event.use(cors());
 
var bodyParser = require('body-parser'); // Ler body do post
event.use(bodyParser.json());
event.use(bodyParser.urlencoded({extended: true}));
 
// Mysql info
var connection = mysql.createConnection(
{
    host     : 'localhost', // MySQL Host
    user     : 'user', // MySQL User
    password : 'password', // MySQL Password
    database : 'database' // MySQL Databse
});
 
// Mysql errors
connection.connect(function(err)
{
    if(err)
    {
        console.log(colors.cyan("[DATABASE]") + " Error connecting: " + colors.red(err.stack));
        return;
    }
 
    console.log(colors.cyan("[DATABASE]") + " Connected as id: " + colors.green(connection.threadId));
});
 
var salts = new chance();
var WaitList = []; // splice(index, i) <- i == 1, remove no index
var game = 0; // GameID
var gameList = [];
var connections = [];
 
function opponent(level, group)
{
    if(WaitList.length == 0)
    {
        return null;
    }
 
    for(var i = 0; i < WaitList.length; i++)
    {
        if(WaitList[i].level == level && WaitList[i].group == group)
        {
            var temp = WaitList[i];
            WaitList.splice(i, 1);
            return temp;
        }
    }
   
    return null;
}
 
var levelSize =
{
    beginner     : { linhas: 5, colunas: 7 },
    intermediate : { linhas: 9, colunas: 11 },
    advanced     : { linhas: 13, colunas: 17 },
    expert       : { linhas: 19, colunas: 23 }
};
 
function gameStarted(gameID)
{
    var users = [];
    var count = 0;
   
    if(gameList[gameID] === undefined)
    {
        return false;
    }
   
    else
    {
        for(var i = 0; i < connections.length; i++)
        {
            if(connections[i].gameID == gameID)
            {
                users[count] = connections[i].username;
                count ++;
            }
        }
 
        if(count != 2)
        {
            return false;
        }
 
        if(users[0] == gameList[gameID].user1.username && users[1] == gameList[gameID].user2.username)
        {
            return true;
        }
 
        else if(users[0] == gameList[gameID].user2.username && users[1] == gameList[gameID].user1.username)
        {
            return true;
        }
    }
 
    return false;
}
 
function newGame(user1, user2, gameID, userKey1, userKey2, level)
{
    var data =
    {
        board :
            {
                table   : null,
                level   : level,
                line    : levelSize[level].linhas,
                column  : levelSize[level].colunas
            },
 
        user1 :
            {
                username  : user1,
                key       : userKey1,
                points    : 0,
                time      : 0,
                timeStart : 0
            },
 
        user2 :
            {
                username  : user2,
                key       : userKey2,
                points    : 0,
                time      : 0,
                timeStart : 0
            },
 
        game  :
            {
                turn    : user1,
                gameID  : gameID
            }
    };
   
    data.board.table = [];
    data.board.table.length = data.board.line;
       
    for(var i = 0; i < data.board.line; i++)
    {
        data.board.table[i] = [];
        data.board.table[i].length = data.board.column;
       
        for(var j = 0; j < data.board.column; j++)
        {
            data.board.table[i][j] = 0;
        }
    }
 
    gameList[gameID] = data;
}
 
function checkUserNameKey(func, username, key, gameID)
{
    var nameRegex = /^[a-zA-Z0-9\_]+$/;
   
    if(!nameRegex.test(username))
    {
        if(debug)
        {
            console.log(colors.cyan(func) + " Invalid username: " + colors.red(username));
        }
 
        return  false;
    }
   
    if(key != null)
    {
        for(var i = 0; i < WaitList.length; i++)
        {
            if(WaitList[i].username == username && WaitList[i].key == key)
            {
                return true
            }
        }
 
        // notify && update
        if(gameList[gameID] == undefined)
        {
            if(debug)
            {
                console.log(colors.cyan(func) + " This game isn't exist: " + colors.red(gameID));
            }
 
            return false;
        }  
       
        else if(gameList[gameID].user1.username == username && gameList[gameID].user1.key)
        {
            return true;
        }
       
        else if(gameList[gameID].user2.username == username && gameList[gameID].user2.key)
        {
            return true;
        }
       
        if(debug)
        {
            console.log(colors.cyan(func) + " " + colors.yellow(username) + " can't play on this game " + colors.yellow(gameID));
        }
 
        return false;
    }
 
    return true;
}
 
function addWinnerToDataBase(winner, gameID)
{
    if(gameList[gameID].user1.username == winner)
    {
        connection.query('INSERT INTO `Rankings` (`name`,`level`,`boxes`,`time`) VALUES (\'' + gameList[gameID].user1.username + '\',\'' + gameList[gameID].board.level + '\',\'' + gameList[gameID].user1.points + '\',\'' + Math.round(gameList[gameID].user1.time) + '\');', function(err, row, fields) {});
    }
   
    else
    {
        connection.query('INSERT INTO `Rankings` (`name`,`level`,`boxes`,`time`) VALUES (\'' + gameList[gameID].user2.username + '\',\'' + gameList[gameID].board.level + '\',\'' + gameList[gameID].user2.points + '\',\'' + Math.round(gameList[gameID].user2.time) + '\');', function(err, row, fields) {});
    }
}
 
function closeConnections(gameID)
{
    for(var i = 0; i < connections.length; i++)
    {
        if(connections[i].gameID == gameID)
        {
            connections.splice(i, 1);
 
            if(i > 0)
            {
                i -= 1;
            }
        }
    }
}
 
function ServerSentEvents(gameID, func, change, l, c)
{
    //var date = new Date();
 
    if(func != "start")
    {
        if(gameList[gameID].game.turn == gameList[gameID].user1.username)
        {
            gameList[gameID].user1.time += (Date.now() - gameList[gameID].user1.timeStart) / 1000;
        }
        else
        {
            gameList[gameID].user2.time += (Date.now() - gameList[gameID].user2.timeStart) / 1000;
        }
    }
 
    var lastTurn = gameList[gameID].game.turn;
 
    if(change != null && !change)
    {
        if(lastTurn == gameList[gameID].user1.username)
        {
            gameList[gameID].game.turn = gameList[gameID].user2.username;
            lastTurn = gameList[gameID].user1.username;
        }
 
        else
        {
            gameList[gameID].game.turn = gameList[gameID].user1.username;
            lastTurn = gameList[gameID].user2.username;
        }
    }
 
    for(var i = 0; i < connections.length; i++)
    {
        if(connections[i].gameID == gameID)
        {  
            if(debug)
            {
                console.log("\n" + colors.cyan("[UPDATE]") + " User: " + colors.green(connections[i].username));
            }
           
            var object = {};
 
            if(func == "start")
            {
                if(connections[i].username == gameList[gameID].user1.username)
                {
                    object =
                    {
                        opponent : gameList[gameID].user2.username,
                        turn     : gameList[gameID].game.turn
                    };
                }
               
                else
                {
                    object =
                    {
                        opponent : gameList[gameID].user1.username,
                        turn     : gameList[gameID].game.turn
                    };
                }
 
                connections[i].response.write("data: " + JSON.stringify(object) + "\n\n");
               
                if(debug)
                {
                    console.log("New game started! \n\t Opponent = " + colors.magenta(object.opponent) + " \n\t turn \t  = " + colors.magenta(object.turn) + "\n");
                }
            }
           
            else if(func == "move")
            {
                var struct = calculatePositionForWebsite(l, c);
 
                if(lastTurn == gameList[gameID].user1.username)
                {
                    object =
                    {
                        move :
                            {
                                name    : gameList[gameID].user1.username,
                                orient  : struct.o,
                                row     : struct.l,
                                col     : struct.c,
                                time    : gameList[gameID].user1.time
                            },
 
                        turn : gameList[gameID].game.turn
                    };
                }
 
                else
                {
                    object =
                    {
                        move :
                            {
                                name    : gameList[gameID].user2.username,
                                orient  : struct.o,
                                row     : struct.l,
                                col     : struct.c,
                                time    : gameList[gameID].user2.time
                            },
 
                        turn : gameList[gameID].game.turn
                    };
                }
               
                connections[i].response.write("data: " + JSON.stringify(object) + "\n\n");
               
                if(debug)
                {
                    console.log("Play on " + object.move.row + " " + object.move.col + "\n\t name \t = " + colors.magenta(object.move.name) + " \n\t turn \t  = " + colors.magenta(object.turn) + "\n");
                }      
            }
 
            else if(func == "winner")
            {
                var winner = userWinner(gameID);
 
                var struct = calculatePositionForWebsite(l, c);
 
                if(gameList[gameID].game.turn == gameList[gameID].user1.username)
                {
                    object =
                    {
                        move :
                            {
                                name    : gameList[gameID].user1.username,
                                orient  : struct.o,
                                row     : struct.l,
                                col     : struct.c,
                                time    : gameList[gameID].user1.time
                            },
 
                        winner : winner
                    };
                }
               
                else
                {
                    object =
                    {
                        move :
                            {
                                name    : gameList[gameID].user2.username,
                                orient  : struct.o,
                                row     : struct.l,
                                col     : struct.c,
                                time    : gameList[gameID].user2.time
                            },
 
                        winner : winner
                    };
                }
 
                connections[i].response.write("data: " + JSON.stringify(object) + "\n\n");
                if(debug)
                {
                    console.log("Winner " + colors.red("->") + " " + colors.green(object.winner));
                }
            }
        }
    }
 
    console.log("\tuser1:\n\t\ttempo: " + gameList[gameID].user1.time + "\n\tuser2:\n\t\ttempo: " + gameList[gameID].user2.time + "\n agora: " + Date.now());
 
    gameList[gameID].user1.timeStart = Date.now();
    gameList[gameID].user2.timeStart = Date.now();
 
    if(func == "winner")
    {
        closeConnections(gameID);
 
        addWinnerToDataBase(winner, gameID);
    }
}
 
 
function calculatePositionForWebsite(l, c)
{
    var struct = {};
   
    if(l%2 == 0 && c%2 != 0)
    {
        struct.o = "h";
        struct.l = 1 + (l / 2);
        struct.c = (c + 1) / 2;
    }
 
    else if(l%2 != 0 && c%2 == 0)
    {
        struct.o = "v";
        struct.l = (l + 1) / 2;
        struct.c = 1 + (c / 2);
    }
   
    return struct;    
}
 
function calculatePositionForHere(o, l, c)
{
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
 
function userWinner(gameID)
{
 
    var winner;
   
    if(gameList[gameID].user1.points > gameList[gameID].user2.points)
    {
        winner = gameList[gameID].user1.username;
    }
   
    else if(gameList[gameID].user2.points > gameList[gameID].user1.points)
    {
        winner = gameList[gameID].user2.username;
    }  
   
    else
    {        
        if(gameList[gameID].user2.time > gameList[gameID].user1.time)
        {
            winner = gameList[gameID].user1.username;
        }
       
        else
        {
            winner = winner = gameList[gameID].user2.username;
        }
    }
   
    return winner;
}
 
/* WHO DO SQUARE */
function square(gameID, who)
{
    if(who == gameList[gameID].user1.username)    
    {
        gameList[gameID].user1.points++;
    }
   
    else
    {
        gameList[gameID].user2.points++;
    }
}
 
function someonePlay(gameID, who, l, c)
{
    var vertical;
    var change = false;
 
    gameList[gameID].board.table[l][c] = -2;
 
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
            if(gameList[gameID].board.table[l-2][c] !== 0 && gameList[gameID].board.table[l-1][c-1] !== 0 && gameList[gameID].board.table[l-1][c+1] !== 0)
            {
                change = true;
                square(gameID, who, l-1, c);
            }
        }
 
        if(l < gameList[gameID].board.line-1) // Possivel quadrado de baixo
        {
            if(gameList[gameID].board.table[l+2][c] !== 0 && gameList[gameID].board.table[l+1][c-1] !== 0 && gameList[gameID].board.table[l+1][c+1] !== 0)
            {
                change = true;
                square(gameID, who, l+1, c);
            }
        }
    }
 
    else
    {
        if(c > 0) // Possivel quadrado da esquerda
        {
            if(gameList[gameID].board.table[l][c-2] !== 0 && gameList[gameID].board.table[l-1][c-1] !== 0 && gameList[gameID].board.table[l+1][c-1] !== 0)
            {
                change = true;
                square(gameID, who, l, c-1);
            }
        }
 
        if(c < gameList[gameID].board.column-1) // Possivel quadrado da direita
        {
            if(gameList[gameID].board.table[l][c+2] !== 0 && gameList[gameID].board.table[l-1][c+1] !== 0 && gameList[gameID].board.table[l+1][c+1] !== 0)
            {
                change = true;
                square(gameID, who, l, c+1);
            }
        }
    }
 
    if(change)
    {
        /* End game? */
        if(gameList[gameID].user1.points + gameList[gameID].user2.points == ((gameList[gameID].board.line-1)/2) * ((gameList[gameID].board.column-1)/2))
        {
            ServerSentEvents(gameID, "winner", null, l, c);
            return;
        }
       
        /* To know if change something */
        ServerSentEvents(gameID, "move", true, l, c);
        return;
    }
    /* Or not have changes */
 
    ServerSentEvents(gameID, "move", false, l, c);
    return;
}
 
 
                ///////////////////////////////
                //         EVENTS POST       //
                ///////////////////////////////
 
// Register
event.post('/register', function(request, response)
{
    var username = request.body.name;
    var password = request.body.pass;
   
    console.log(colors.cyan("[REGISTER]") + " User: " + colors.yellow(username));
 
    if(checkUserNameKey("[REGISTER]", username, null, null))
    {
        connection.query('SELECT * FROM `Users` WHERE `name`=\'' + username + '\'', function(err,result)
        {
            if(err)
            {
                if(debug)
                {
                    console.log(colors.cyan("[REGISTER]") + " Error: " + colors.red(err));
                }
 
                response.json(
                {
                    error : "Something wrong with DataBase!"
                });
            }
       
            if(result.length > 0)
            {
                var client = result[0];
               
                var hash = crypto.createHash('md5').update(client.salt + password).digest('hex')
 
                if(hash != client.pass)
                {
                    if(debug)
                    {
                        console.log(colors.cyan("[REGISTER]") + " Incorrect Password! User: " + colors.yellow(username));
                    }
 
                    response.json(
                    {
                        error : "Incorrect password!"
                    });
                }
                else
                {
                    if(debug)
                    {
                        console.log(colors.cyan("[REGISTER]") + " Correct Password! User: " + colors.yellow(username));
                    }
 
                    response.json( {} );
                }
            }
            else
            {
                var salt = salts.string( {length: 4} );
                var pass = crypto.createHash('md5').update(salt + password).digest('hex')
               
                connection.query('INSERT INTO `Users` (`name`, `pass`, `salt`) VALUES (\'' + username + '\', \'' + pass + '\', \'' + salt + '\')', function(err, result)
                {
                    if(err)
                    {
                        if(debug)
                        {
                            console.log(colors.cyan("[REGISTER]") + " Error: " + colors.red(err));
                        }
                    }
                    else
                    {  
                        if(debug)
                        {
                            console.log(colors.cyan("[REGISTER]") + " User created successful! User: " + colors.yellow(username));
                        }
 
                        response.json( {} );
                    }
                });
            }
        });
    }
 
    else
    {
        response.json(
        {
            error : "Your username is wrong! Please logout and login!"
        });
    }
});
 
// Ranking
event.post('/ranking', function(request, response)
{
    var level = request.body.level;
 
    connection.query('SELECT * FROM `Rankings` WHERE `level` = \'' + level + '\' ORDER BY boxes DESC, time ASC LIMIT 10;', function(err, result)
    {
        if(err)
        {
            if(debug)
            {
                console.log(colors.cyan("[RANKING]") + " Error: " + colors.red(err));
            }
           
            response.json(
            {
                error : "Something wrong with DataBase!"
            });
        }
        else
        {
            if(debug)
            {
                console.log(colors.cyan("[RANKING]") + " Rank send successful! Level: " + colors.yellow(level));
            }
 
            response.json(
            {
                ranking : result
            });
        }
    });
});
 
// Join
event.post('/join', function(request, response)
{
    var username = request.body.name;
    request.body.username = username;
    var hash = request.body.pass; // Na bd, está guardada uma hash
 
    var level = request.body.level;
    var group = request.body.group;
 
    if(checkUserNameKey("[JOIN]", username, null, null))
    {
        connection.query('SELECT * FROM `Users` WHERE `name` = \'' + username + '\';', function(err, result)
        {
            if(err)
            {
                if(debug)
                {
                    console.log(colors.cyan("[JOIN]") + " Error: " + colors.red(err));
                }
 
                response.json(
                {
                    error : "Something wrong with DataBase!"
                });
            }
 
            if(result.length > 0)
            {
                var user = result[0];          
                var password = crypto.createHash('md5').update(user.salt + hash).digest('hex');
               
                if(password == user.pass) // Possiveis ataques
                {
                    for(var i = 0; i < WaitList.length; i++) // Se já está na lista de espera
                    {
                        if(WaitList[i].username == username)
                        {
                            if(debug)
                            {
                                console.log(colors.cyan("[JOIN]") + " " + colors.red(username) + " yet are on WaitList!");
                            }  
 
                            response.json({"error" : "You are in another side trying play!"});
 
                            return;
                        }
                    }
 
                    for(var i = 0; i < connections.length; i++) // Se já está a jogar
                    {
                        if(connections[i].username == username)
                        {
                            if(debug)
                            {
                                console.log(colors.cyan("[JOIN]") + " " + colors.red(username) + " yet are playing in gameID " + colors.red(connections[i].gameID));
                            }  
 
                            response.json(
                            {
                                error : "You are in another side playing!"
                            });
 
                            return;
                        }
                    }
 
                    var gameID;
                   
                    var key = crypto.createHash('md5').update(salts.string( {length: 8} )).digest('hex');
                    var op = opponent(level, group);
 
                    if(op === null)
                    {
                        gameID = game++;
                        request.body.game = gameID;
                        request.body.key = key;
                        WaitList.splice(0, 0, request.body);
 
                        if(debug)
                        {
                            console.log(colors.cyan("[JOIN]") + " " + colors.yellow(username) + " added to WaitList! gameID = " + colors.yellow(gameID));
                        }
                    }
                    else
                    {
                        gameID = op.game;
                        request.body.key = key;
                        newGame(username, op.username, gameID, key, op.key, level);
                       
                        if(debug)
                        {
                            console.log(colors.cyan("[JOIN]") + " New game (gameID = " + colors.green(gameID) + "): " + colors.green(username) + " vs " + colors.green(op.username));
                        }
                    }
 
                    response.json(
                    {
                        key  : key,
                        game : gameID
                    });
                }
                else
                {
                    if(debug)
                    {
                        console.log(colors.cyan("[JOIN]") + " " + colors.red(username) + " have a wrong password!");
                    }  
 
                    response.json(
                    {
                        error : "Your password are wrong!"
                    });
                }
            }
 
            else
            {
                if(debug)
                {
                    console.log(colors.cyan("[JOIN]") + " " + colors.red("User name isn't valid!"));
                }  
 
                response.json(
                {
                    error : "User name isn't valid!"
                });
            }
        });
    }
 
    else
    {
        response.json(
        {
            error : "You aren't logged correctly! Please login again!"
        });
    }
});
 
// Leave
event.post('/leave', function(request, response)
{
    var username = request.body.name;
    var key = request.body.key;
    var gameID = request.body.game;
 
    if(checkUserNameKey("[LEAVE]", username, key, gameID))
    {
        if(gameList[gameID] == undefined) // À espera
        {
            for(var i = 0; i < WaitList.length; i++)
            {
                if(WaitList[i].username == username && WaitList[i].key == key)
                {
                    WaitList.splice(i, 1);
                   
                    if(debug)
                    {
                        console.log(colors.cyan("[LEAVE]") + " " + colors.green(username) + " left WaitList! gameID = " + colors.green(gameID));
                    }
 
                    if(i > 0)
                    {
                        i -= 1;
                    }
                }                  
            }
 
            for(var i = 0; i < connections.length; i++)
            {
                if(connections[i].gameID == gameID && connections[i].key == key && connections[i].username == username)
                {
                    connections.splice(i, 1);
 
                    if(i > 0)
                    {
                        i -= 1;
                    }
                }
            }
        }
        response.json( {} );
    }
 
    else
    {
        response.json(
        {
            error : "You aren't logged correctly! Please login again!"
        });
    }
});
 
// Notify
event.post('/notify', function(request, response)
{
    var username = request.body.name;
    var gameID = request.body.game;
    var key = request.body.key;
   
    var orient = request.body.orient;
    var l = request.body.row;
    var c = request.body.col;
 
    var struct = calculatePositionForHere(orient, l ,c);
 
    if(checkUserNameKey("[NOTIFY]", username, key, gameID))
    {
        if(gameList[gameID].game.turn == username)
        {
            if(struct.l >= 0 && struct.l < gameList[gameID].board.line && struct.c >= 0 && struct.c < gameList[gameID].board.column)
            {
                if(gameList[gameID].board.table[struct.l][struct.c] == 0)
                {
                    if(debug)
                    {
                        console.log(colors.cyan("[Notify]") + " Move " + colors.green(struct.l) + " " + colors.green(struct.c) + " accepted!");
                    }
 
                    response.json( {} );
                    someonePlay(gameID, username, struct.l, struct.c);
                }
               
                else
                {
                    if(debug)
                    {
                        console.log(colors.cyan("[Notify]") + " " + colors.red(struct.l) + " " + colors.red(struct.c) + " yet played!");
                    }
 
                    response.json(
                    {
                        error : "Edge already drawn!"
                    });
                }
            }
           
            else
            {
                if(debug)
                {
                    console.log(colors.cyan("[Notify]") + " " + colors.red(struct.l) + " " + colors.red(struct.c) + " isn't exist!");
                }
 
                response.json(
                {
                    error : "Edge isn't exist!"
                });
            }
        }
 
        else
        {
            if(debug)
            {
                console.log(colors.cyan("[Notify]") + " " + colors.red(username) + " isn't him turn!");
            }
 
            response.json(
            {
                error : "Isn't your turn!"
            });
        }
    }
 
    else
    {
        response.json(
        {
            error : "You aren't logged correctly! Please login again!"
        });
    }
});
 
 
                ///////////////////////////////
                //         EVENTS GET        //
                ///////////////////////////////
 
// Update
event.get('/update', function(request, response)
{
    var username = request.query.name;
    var gameID = request.query.game;
    var key = request.query.key;
 
    if(checkUserNameKey("[UPDATE]", username, key, gameID))
    {
        console.log(colors.cyan("[UPDATE]") + " " + colors.green(username) + " updating! gameID = " + colors.green(gameID));
       
        request.socket.setTimeout(6000000);
 
        response.writeHead(200,
        {
            'Content-Type' : 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection'   : 'keep-alive'
        });
 
        response.write('\n');
       
        var connection_temp =
        {
            response: response,
            username: username,
            key     : key,
            gameID  : gameID
        };
       
        connections.push(connection_temp);
 
        if(gameStarted(gameID))
        {
            ServerSentEvents(gameID, "start", null, null, null);
        }
    }
 
    else
    {
        if(debug)
        {
            console.log(colors.cyan("[UPDATE]") + " Game not found!");
        }  
 
        response.write("data: " + JSON.stringify(
                                    {
                                        error : "Game not found!"
                                    }) + "\n\n");
    }
 
    request.on("close", function()
    {
        for(var i = 0; i < connections.length; i++)
        {
            if(connections[i].gameID == gameID && connections[i].key == key && connections[i].username == username)
            {
                connections.splice(i, 1);
 
                if(i > 0)
                {
                    i -= 1;
                }
            }
        }
 
        for(var i = 0; i < WaitList.length; i++)
        {
            if(WaitList[i].username == username && WaitList[i].key == key)
            {
                WaitList.splice(i, 1);
               
                if(i > 0)
                {
                    i -= 1;
                }
            }
        }
 
 
    });
});
 
var server = event.listen(8036);
