const $ = document.querySelector.bind(document)
const $$ = document.querySelectorAll.bind(document)

const setInfo = text => $(`#info`).textContent = text
const setStatus = text => $(`#status`).textContent = text

const socket = io.connect()

const init = () => {
    addSocketListeners(socket)
    setNewGameButtonEventlistener()
}

const addSocketListeners = socket => {
    socket.on('connect', () => {
        console.log(socket.id)
    })

    socket.on('status', setStatus)

    socket.on('info', setInfo)

    socket.on('clear-status', () => setStatus(''))
    
    socket.on('current-state', setCurrentState)

    socket.on('start-game', () => setFieldsEventlistener())

    socket.on('refresh-fields', arr => {
        const sign = arr[0]
        const field = arr[1]
        $(`[data-field='${field}']`).textContent = sign
        console.log(field, sign)
    })

    socket.on('activate-new-game-button', () => activateNewGameButton())

    socket.on('not-your-turn', setStatus)

    socket.on('whoes-turn', setStatus)

    socket.on('field-is-filled', setInfo)

    socket.on('reset-fields', () => resetAllFields())

    socket.on('freeze-board', msg => {
        removeAllEventListeners()
        setStatus(msg[0])
        setEventListenerFinishedGameInfo(msg[1])
    })

    socket.on('drawn-game', msg => {
        removeAllEventListeners()
        setStatus(msg)
    })
}

const setFieldsEventlistener = () => {
    $$('#board td').forEach(td => {
        td.style.cursor = 'pointer'
        td.addEventListener('click', ev => {
            socket.emit('move', ev.target.dataset.field)
            ev.preventDefault()
        })
    })
}

const setNewGameButtonEventlistener = () => {
    $('#newGame').addEventListener('click', () => {
        socket.emit('restart-game')
    })
}

const resetField = field => field.textContent = ''

const resetAllFields = () => $$('#board td').forEach(td => {
    resetField(td)
})

const removeAllEventListeners = () => {
    const board = $('#board')
    const boardClone = board.cloneNode(true)
    board.parentNode.replaceChild(boardClone, board)
    board.querySelectorAll('td')
        .forEach(td => td.style.cursor = 'default')
}

const setEventListenerFinishedGameInfo = text => {
    $('#board').addEventListener('click', () => {
        setInfo(text)
    })
}

const setCurrentState = fields => fields.forEach((f, i) => {
    $(`[data-field='${i}']`).textContent = f
})

const activateNewGameButton = () => {
    const el = $('#newGame')
    el.classList.remove('newGameButtonDisabled')
    el.removeAttribute('disabled')
}

init()






