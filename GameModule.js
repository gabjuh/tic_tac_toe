'use strict'

// Create an array for die 9 board fields
let fields = Array(9)

// Signs of the game
const signs = ['X', 'O']

// X starts
let whoesTurn = signs[0]

// These combinations of fields must 
// be owned in order to win
const winnerCombos = [
    // horizontal
    '012',
    '345',
    '678',
    // vertical
    '036',
    '147',
    '258',
    // diagonal
    '048',
    '246' 
]

exports.getSigns = () => signs.slice()
exports.getFields = () => fields.slice()
exports.getWhoesTurn = () => whoesTurn

exports.isMyTurn = sign => sign === whoesTurn

exports.move = (sign, fieldNr) => {
    fields[fieldNr] = sign 
    toggleBetweenTwoSigns()
    return fields
}

exports.checkIfFieldNotEmpty = field => fields[field] === undefined

// If there is a winner, it returns his sign
exports.whoWon = () => {
    let winnersSign = ''
    winnerCombos.forEach(c => {
        const sign = fields[c[0]]
        if (sign === undefined) return
        if (sign === fields[c[1]] && sign === fields[c[2]]) {
            winnersSign = sign
        }
    })
    return winnersSign != '' ? winnersSign : null
}

// Reset the fields array and the beginning players sign
exports.resetGame = () => {
    fields = Array(9)
    whoesTurn = signs[0]
}

const toggleBetweenTwoSigns = () => 
    whoesTurn === signs[0] ? 
    whoesTurn = signs[1] : 
    whoesTurn = signs[0]