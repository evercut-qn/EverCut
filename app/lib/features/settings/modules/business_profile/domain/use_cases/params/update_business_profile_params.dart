// lib/features/settings/modules/business_profile/domain/use_cases/params/update_business_profile_params.dart

class UpdateBusinessProfileParams {
  final String? shopName;
  final String? firstName;
  final String? lastName;
  final String? gender;
  final String? dateOfBirth;
  final int? numberOfEmployees;
  final int? yearsOfExperience;
  final String? bio;
  final String? address;
  final String? category;
  final String? targetCustomers;
  final List<String>? amenities;
  final List<String>? workingDays;
  final String? openTime;
  final String? closeTime;
  final List<BreakTimeParams>? breakTimes;
  final bool? isOpen;
  final LocationParams? location;

  UpdateBusinessProfileParams({
    this.shopName,
    this.firstName,
    this.lastName,
    this.gender,
    this.dateOfBirth,
    this.numberOfEmployees,
    this.yearsOfExperience,
    this.bio,
    this.address,
    this.category,
    this.targetCustomers,
    this.amenities,
    this.workingDays,
    this.openTime,
    this.closeTime,
    this.breakTimes,
    this.isOpen,
    this.location,
  });
}

class BreakTimeParams {
  final String start;
  final String end;

  BreakTimeParams({
    required this.start,
    required this.end,
  });
}

class LocationParams {
  final String? type;
  final List<double>? coordinates;

  LocationParams({
    this.type,
    this.coordinates,
  });
}
