'use strict'

// Server configuration
const IP = '127.0.0.1'
const PORT = '8082'

const express = require('express')
const app = express()
app.use(express.static('public'))

const http = require('http')
const socketIo = require('socket.io')
const webServer = http.Server(app)
const io = socketIo(webServer)

// Create game object
const game1 = require('./GameModule.js')

const MAX_PLAYER_NR = 2
const MIN_STEPS = 4
const freeSigns = game1.getSigns() // 'X', 'O'
const onlinePlayers = []
const pendingPlayers = []

// Incoming users    
io.on('connection', socket => {

    // First player arriving, waiting on partner
    if (getNrOfOnlinePlayers() < MAX_PLAYER_NR) {
        const playerObj = generatePlayerObject(socket, freeSigns.pop())
        onlinePlayers.push(playerObj)
        setStatusByOneOnlinePlayer()

        // Second player arriving, the game starts
        if (getNrOfOnlinePlayers() === MAX_PLAYER_NR) {
            setStatusByTwoOnlinePlayers()
            setInfoByTwoOnlinePlayers(socket)
            resetClientBoardFields()
            activateNewGameButton(socket)
            startGame()
        }
        logNewPlayer(playerObj)
    
    // If there is no empty spot for clients, they
    // will be stored and get to view-only mode.
    } else if (getNrOfOnlinePlayers() === MAX_PLAYER_NR) {
        const playerObj = generatePlayerObject(socket, '')
        pendingPlayers.push(playerObj)
        setInfoByPendingPlayers(socket)
        setStatusByPendingPlayers(socket)
        showFieldsCurrentState(socket)
        logPendingPlayer(playerObj)
    }

    // Restart the game with clicking on the button
    socket.on('restart-game', () => {
        resetGame()
        startGame()
        logNewGame()
    })

    // Client disconnected
    socket.on('disconnect', () => {
        const i = identifyPlayer(socket.id)
        const playerObj = onlinePlayers[i]
        if (playerObj) {

            // Remove client obj and reset the game
            resetGame()
            const freeSign = playerObj.sign
            removeDisconnectedPlayer(i)
            logPlayerLeft(freeSign)

            // Log if there is no client waiting 
            logIfNoClient()

            // Join pending players
            if (getNrOfPedingPlayers() > 0) {
                const newPlayer = pendingPlayers.shift()
                newPlayer.sign = freeSign
                onlinePlayers.push(newPlayer)
                resetGame()
                setStatusByTwoOnlinePlayers()
                setSignForExPendingPlayer(newPlayer)
                logNewPlayer(newPlayer)
                logNewGame()

            // Player stays alone, waiting for partner
            } else {
                freeSigns.push(freeSign)
                setStatusByOneOnlinePlayer()
                setInfoByOneOnlinePlayer()
            }
        }               
    })

    // Making moves and co.
    socket.on('move', field => {
        const i = identifyPlayer(socket.id)
        const playersSign = onlinePlayers[i].sign
        const steps = getNrOfSteps()
        setInfoByTwoOnlinePlayers(socket)
        
        // Check whos turn, field is empty, etc.
        if (game1.isMyTurn(playersSign)) {
            if (game1.checkIfFieldNotEmpty(field)) {
                game1.move(playersSign, field)
                refreshFields([playersSign, field])
                whoesTurn()
                logMove([playersSign, field], socket.id)
                if (steps >= MIN_STEPS) {
                    const winner = game1.whoWon()
                    endGame(winner)
                    if (steps === 8 && winner === null) {
                        drawnGame()
                        logDrawnGame()
                    }
                } 
            } else {
                fieldIsFilled(socket)
            }
        } else {
            notYourTurn(playersSign, socket)
        }
    })
})

const identifyPlayer = id => 
    onlinePlayers.findIndex(obj => obj.socket.id === id)

const generatePlayerObject = (socket, sign) => ({
    socket, 
    sign, 
})

const setStatusByOneOnlinePlayer = () => 
    io.emit('status', 'Bitte warten Sie auf Ihren Gegner!')

const setInfoByOneOnlinePlayer = () =>
    io.emit('info', '')

const setStatusByTwoOnlinePlayers = () =>
    io.emit('status', `Zwei Spieler verbunden. Das Spiel fängt mit ${game1.getSigns()[0]} an.`)

const setInfoByTwoOnlinePlayers = socket => {
    const infoText = i => `Sie spielen als ${onlinePlayers[i].sign}.`
    io.emit('info', infoText(0))
    socket.emit('info', infoText(1))
}

const setInfoByPendingPlayers = socket =>
    socket.emit('info', 'Sie befinden sich in Zuschauer-Modus')

const setStatusByPendingPlayers = socket =>
    socket.emit('status', 'Es sind bereits genug Spieler online')

const setSignForExPendingPlayer = socketObj => 
    socketObj.socket.emit('info', `Sie spielen als ${socketObj.sign}.`)

const getNrOfOnlinePlayers = () => onlinePlayers.length

const getNrOfPedingPlayers = () => pendingPlayers.length

const getNrOfSteps = () => game1.getFields().join('').length

const getCurrentState = () => game1.getFields()

const startGame = () => 
    onlinePlayers.forEach(player => player.socket.emit('start-game'))

const fieldIsFilled = socket => 
    socket.emit('field-is-filled', 'Das Feld ist nicht mehr frei.')

const notYourTurn = (playersSign, socket) => 
    socket.emit(
        'not-your-turn', 
        `Ungültiger Zug: ${playersSign} ist nicht am Zug!`
    )

const whoesTurn = () => io.emit('whoes-turn', `${game1.getWhoesTurn()} ist dran`)

const refreshFields = ([playersSign, field]) => 
    io.emit('refresh-fields', [playersSign, field])

const activateNewGameButton = socket => 
    io.emit('activate-new-game-button')

const resetClientBoardFields = () => io.emit('reset-fields')

const resetGame = () => {
    game1.resetGame()
    resetClientBoardFields()
    startGame()
}

const removeDisconnectedPlayer = i => onlinePlayers.splice(i, 1)

const freezeBoard = sign => io.emit('freeze-board', 
    [
        `Spiel beendet: ${sign} hat gewonnen!`,
        'Das Spiel ist bereits zu Ende.\nKlicken Sie auf "Spiel neu starten."'
    ])

const drawnGame = () => 
    io.emit('drawn-game', 'Das Spiel endet unentschieden.')

const showFieldsCurrentState = socket => 
    socket.emit('current-state', getCurrentState())

const endGame = winner => {
    if (winner != null) {
        freezeBoard(winner)
        logWinner(winner)
    }
}

// Logs
const logNewPlayer = obj => console.log(
    `New client: Player ${obj.sign} (${obj.socket.id}) connected from ${obj.socket.conn.remoteAddress}`,
)

const logPendingPlayer = obj => console.log(
    `Pending client (${obj.socket.id}) connected in view-only from ${obj.socket.conn.remoteAddress}`,
)

const logPlayerLeft = sign => console.log(`Client left: Player ${sign}`)

const logNewGame = () => console.log('New game started')

const logIfNoClient = () => {
    if (getNrOfOnlinePlayers() === 0) console.log('No client on server. Zzzzzzz...')
}

const logMove = ([playersSign, field], id) => console.log(
    `Player ${playersSign}`, 'move:', field, '-', `(${id})`
)

const logWinner = winner => console.log('Winner is ' + winner)

const logDrawnGame = () => console.log('Game ended draw.')

// Start server
webServer.listen(PORT, IP, () => {
    console.log(`Server running at http://${IP}:${PORT}/`)
})
