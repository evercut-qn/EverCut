// lib/features/settings/modules/business_profile/data/models/request/update_payout_details_request_model.dart

class UpdatePayoutDetailsRequestModel {
  final String accountHolderName;
  final String bankName;
  final String bankAccount;
  final String ifsc;
  final String upiId;

  UpdatePayoutDetailsRequestModel({
    required this.accountHolderName,
    required this.bankName,
    required this.bankAccount,
    required this.ifsc,
    required this.upiId,
  });

  Map<String, dynamic> toJson() {
    return {
      'accountHolderName': accountHolderName,
      'bankName': bankName,
      'bankAccount': bankAccount,
      'ifsc': ifsc,
      'upiId': upiId,
    };
  }
}
