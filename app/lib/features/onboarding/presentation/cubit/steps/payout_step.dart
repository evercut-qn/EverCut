// lib/features/onboarding/presentation/cubit/steps/payout_step.dart

class PayoutStep {
  final String accountHolderName;
  final String bankName;
  final String accountNumber;
  final String ifscCode;

  const PayoutStep({
    this.accountHolderName = '',
    this.bankName = '',
    this.accountNumber = '',
    this.ifscCode = '',
  });

  PayoutStep copyWith({
    String? accountHolderName,
    String? bankName,
    String? accountNumber,
    String? ifscCode,
  }) {
    return PayoutStep(
      accountHolderName: accountHolderName ?? this.accountHolderName,
      bankName: bankName ?? this.bankName,
      accountNumber: accountNumber ?? this.accountNumber,
      ifscCode: ifscCode ?? this.ifscCode,
    );
  }
}
