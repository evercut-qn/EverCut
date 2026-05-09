// lib/core/constants/navigation/route_segments.dart

class RouteSegments {
  const RouteSegments._();

  // root
  static const extras = 'extras';
  static const onboarding = 'onboarding';
  static const connectivity = 'connectivity';
  static const authentication = 'authentication';

  // extras
  static const appLock = 'app_lock';
  static const test = 'test';

  // authentication
  static const phoneEntry = 'phone_entry';
  static const otpVerification = 'otp_verification';

  // tabs
  static const dashboard = 'dashboard';
  static const appointments = 'appointments';
  static const subscription = 'subscription';
  static const transactions = 'transactions';
  static const settings = 'settings';

  // dashboard
  static const manageServices = 'manage_services';
  static const rewards = 'rewards';
  static const team = 'team';
  static const gallery = 'gallery';
  static const analytics = 'analytics';
  static const ratingsAndReviews = 'ratings_and_reviews';

  // appointments
  static const appointmentsList = 'appointments_list';
  static const teamActivity = 'team_activity';
  static const employeeAppointments = 'employee_appointments';
  static const appointmentDetails = 'appointment_details';

  // transactions
  static const transactionDetails = 'transaction_details';

  // settings
  static const manageAccount = 'manage_account';
  static const businessProfile = 'business_profile';
  static const appearance = 'appearance';
  static const contactUs = 'contact_us';
  static const termsOfService = 'terms_of_service';
  static const privacyPolicy = 'privacy_policy';

  // settings/manage_account
  static const editProfile = 'edit_profile';
  static const updatePhoneNumber = 'update_phone_number';
  static const deleteAccount = 'delete_account';

  // settings/business_profile
  static const editBusinessProfile = 'edit_business_profile';
  static const updateBankDetails = 'update_bank_details';
  static const editAmenities = 'edit_amenities';
  static const manageAvailability = 'manage_availability';

  // common
  static const notifications = 'notifications';
}
