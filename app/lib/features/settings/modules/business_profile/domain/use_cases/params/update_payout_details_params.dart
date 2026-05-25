// lib/features/settings/modules/business_profile/domain/use_cases/params/update_payout_details_params.dart

class UpdatePayoutDetailsParams {
  final String accountHolderName;
  final String bankName;
  final String bankAccount;
  final String ifsc;
  final String upiId;

  UpdatePayoutDetailsParams({
    required this.accountHolderName,
    required this.bankName,
    required this.bankAccount,
    required this.ifsc,
    required this.upiId,
  });
}
