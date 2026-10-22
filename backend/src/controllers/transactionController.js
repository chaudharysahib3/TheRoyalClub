const {
  notifyTransactionCreated,
} = require("../services/operationalNotificationService");
const transactionService = require("../services/transactionService");

const createTransaction = async (req, res, next) => {
  try {
    const transaction = await transactionService.createTransaction(
      req.body,
      req.user.id
    );

    notifyTransactionCreated(transaction);

    res.status(201).json({
      success: true,
      message: "Transaction recorded successfully",
      transaction
    });
  } catch (error) {
    next(error);
  }
};

const getTransactions = async (req, res, next) => {
  try {
    const transactions = await transactionService.getTransactions({
      type: req.query.type,
      playerId: req.query.playerId
    });

    res.json({
      success: true,
      count: transactions.length,
      transactions
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createTransaction, getTransactions };
