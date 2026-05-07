// lib/shared/enums/transaction_status.dart

enum TransactionStatusEnum {
  pending,
  completed,
  cancelled,
  refunded,
}

extension TransactionStatusEnumExtension on TransactionStatusEnum {
  String get label {
    switch (this) {
      case TransactionStatusEnum.pending:
        return 'Pending';
      case TransactionStatusEnum.completed:
        return 'Completed';
      case TransactionStatusEnum.cancelled:
        return 'Cancelled';
      case TransactionStatusEnum.refunded:
        return 'Refunded';
    }
  }

  int get value {
    switch (this) {
      case TransactionStatusEnum.pending:
        return 0;
      case TransactionStatusEnum.completed:
        return 1;
      case TransactionStatusEnum.cancelled:
        return 2;
      case TransactionStatusEnum.refunded:
        return 3;
    }
  }

  static TransactionStatusEnum fromValue(int value) {
    switch (value) {
      case 0:
        return TransactionStatusEnum.pending;
      case 1:
        return TransactionStatusEnum.completed;
      case 2:
        return TransactionStatusEnum.cancelled;
      case 3:
        return TransactionStatusEnum.refunded;
      default:
        return TransactionStatusEnum.pending;
    }
  }
}
