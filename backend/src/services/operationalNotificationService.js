
const { emitToRoles } = require("../sockets/socket");
const EVENTS = require("../sockets/socketEvents");

function safeEmit(roles, event, payload) {
  try { emitToRoles(roles, event, payload); } catch (error) { console.error("Operational notification failed:", error.message); }
}

function notifyPlayerCreated(player) {
  safeEmit(
    ["owner", "general_manager", "floor_manager"],
    EVENTS.PLAYER_CREATED,
    {
      message: "A new player has been registered.",
      playerId: player.playerId,
    }
  );
}

function notifyTableUpdated(tableId) {
  safeEmit(
    ["owner", "general_manager", "floor_manager", "dealer"],
    EVENTS.TABLE_UPDATED,
    {
      message: "Table information has changed.",
      tableId: String(tableId),
    }
  );
}

function notifyWaitingListUpdated() {
  safeEmit(
    ["owner", "general_manager", "floor_manager"],
    EVENTS.WAITLIST_UPDATED,
    {
      message: "Waiting list has been updated.",
    }
  );
}

function notifySessionStarted(sessionId) {
  safeEmit(
    ["owner", "general_manager", "floor_manager", "dealer"],
    EVENTS.SESSION_STARTED,
    {
      message: "A game session has started.",
      sessionId: String(sessionId),
    }
  );
}

function notifySessionEnded(sessionId) {
  safeEmit(
    ["owner", "general_manager", "floor_manager", "dealer"],
    EVENTS.SESSION_ENDED,
    {
      message: "A game session has ended.",
      sessionId: String(sessionId),
    }
  );
}

function notifyTransactionCreated(transaction) {
  safeEmit(
    ["owner", "general_manager", "cashier", "accountant"],
    EVENTS.TRANSACTION_CREATED,
    {
      message: "A cashier transaction has been recorded.",
      transactionRef: transaction.transactionRef,
      type: transaction.type,
      amount: transaction.amount,
    }
  );
}

module.exports = {
  notifyPlayerCreated,
  notifyTableUpdated,
  notifyWaitingListUpdated,
  notifySessionStarted,
  notifySessionEnded,
  notifyTransactionCreated,
};
