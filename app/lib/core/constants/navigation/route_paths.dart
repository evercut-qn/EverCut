// lib/core/constants/navigation/route_paths.dart

import 'route_segments.dart';

class RoutePaths {
  const RoutePaths._();

  // root
  static const test = '/${RouteSegments.test}';
  static const onboarding = '/${RouteSegments.onboarding}';
  static const connectionNotFound = '/${RouteSegments.connectionNotFound}';

  static const authentication = '/${RouteSegments.authentication}';

  static const phoneEntry = '$authentication/${RouteSegments.phoneEntry}';
  static const otpVerification = '$phoneEntry/${RouteSegments.otpVerification}';

  static const merchantOnboarding = '/${RouteSegments.merchantOnboarding}';

  static const personalInformation = '$merchantOnboarding/${RouteSegments.personalInformation}';
  static const businessProfile = '$personalInformation/${RouteSegments.businessProfile}';
  static const amenities = '$businessProfile/${RouteSegments.amenities}';
  static const availability = '$amenities/${RouteSegments.availability}';
  static const payoutDetails = '$availability/${RouteSegments.payoutDetails}';

  // main
  static const dashboard = '/${RouteSegments.dashboard}';

  static const rewards = '/$dashboard/${RouteSegments.rewards}';

  static const appointments = '/${RouteSegments.appointments}';

  static const appointmentDetails = '/$appointments/${RouteSegments.appointmentDetails}';

  static const transactions = '/${RouteSegments.transactions}';

  static const transactionDetails = '/$transactions/${RouteSegments.transactionDetails}';

  static const settings = '/${RouteSegments.settings}';

  // settings
  static const manageAccount = '$settings/${RouteSegments.manageAccount}';

  static const editProfile = '$manageAccount/${RouteSegments.editProfile}';
  static const changePin = '$manageAccount/${RouteSegments.changePin}';
  static const deleteAccount = '$manageAccount/${RouteSegments.deleteAccount}';

  static const settingsBusinessProfile = '$settings/${RouteSegments.settingsBusinessProfile}';

  static const editBusinessProfile = '$settingsBusinessProfile/${RouteSegments.editBusinessProfile}';
  static const employeeManagement = '$settingsBusinessProfile/${RouteSegments.employeeManagement}';
  static const manageServices = '$settingsBusinessProfile/${RouteSegments.manageServices}';
  static const upiDetails = '$settingsBusinessProfile/${RouteSegments.upiDetails}';

  static const appearance = '$settings/${RouteSegments.appearance}';
  static const settingsNotifications = '$settings/${RouteSegments.settingsNotifications}';

  static const imageGallery = '/${RouteSegments.imageGallery}';
  static const ratingsAndReviews = '/${RouteSegments.ratingsAndReviews}';
}
