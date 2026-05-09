// lib/core/constants/navigation/route_paths.dart

import 'route_segments.dart';

class RoutePaths {
  const RoutePaths._();

  // root
  static const extras = '/${RouteSegments.extras}';
  static const onboarding = '/${RouteSegments.onboarding}';
  static const connectivity = '/${RouteSegments.connectivity}';
  static const authentication = '/${RouteSegments.authentication}';

  // extras
  static const appLock = '/$extras/${RouteSegments.appLock}';
  static const test = '/$extras/${RouteSegments.test}';

  // authentication
  static const phoneEntry = '$authentication/${RouteSegments.phoneEntry}';
  static const otpVerification = '$phoneEntry/${RouteSegments.otpVerification}';

  // tabs
  static const dashboard = '/${RouteSegments.dashboard}';
  static const appointments = '/${RouteSegments.appointments}';
  static const subscription = '/${RouteSegments.subscription}';
  static const transactions = '/${RouteSegments.transactions}';
  static const settings = '/${RouteSegments.settings}';

  // dashboard
  static const dashboardNotifications = '/$dashboard/${RouteSegments.notifications}';
  static const manageServices = '$dashboard/${RouteSegments.manageServices}';
  static const rewards = '/$dashboard/${RouteSegments.rewards}';
  static const team = '/$dashboard/${RouteSegments.team}';
  static const gallery = '/$dashboard/${RouteSegments.gallery}';
  static const analytics = '/$dashboard/${RouteSegments.analytics}';
  static const ratingsAndReviews = '/$dashboard/${RouteSegments.ratingsAndReviews}';

  // appointments
  static const appointmentsList = '/$appointments/${RouteSegments.appointmentsList}';
  static const teamActivity = '/$appointments/${RouteSegments.teamActivity}';
  static const employeeAppointments = '/$appointments/${RouteSegments.employeeAppointments}';
  static const appointmentDetails = '/$appointments/${RouteSegments.appointmentDetails}';

  // transactions
  static const transactionDetails = '/$transactions/${RouteSegments.transactionDetails}';

  // settings
  static const manageAccount = '$settings/${RouteSegments.manageAccount}';
  static const businessProfile = '$settings/${RouteSegments.businessProfile}';
  static const appearance = '$settings/${RouteSegments.appearance}';
  static const notifications = '$settings/${RouteSegments.notifications}';
  static const contactUs = '$settings/${RouteSegments.contactUs}';
  static const termsOfService = '$settings/${RouteSegments.termsOfService}';
  static const privacyPolicy = '$settings/${RouteSegments.privacyPolicy}';

  // settings/manage_account
  static const editProfile = '$manageAccount/${RouteSegments.editProfile}';
  static const updatePhoneNumber = '$manageAccount/${RouteSegments.updatePhoneNumber}';
  static const deleteAccount = '$manageAccount/${RouteSegments.deleteAccount}';

  // settings/business_profile
  static const editBusinessProfile = '$businessProfile/${RouteSegments.editBusinessProfile}';
  static const updateBankDetails = '$businessProfile/${RouteSegments.updateBankDetails}';
  static const editAmenities = '$businessProfile/${RouteSegments.editAmenities}';
  static const manageAvailability = '$businessProfile/${RouteSegments.manageAvailability}';
}
