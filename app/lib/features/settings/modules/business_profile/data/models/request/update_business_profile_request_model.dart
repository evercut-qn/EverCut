// lib/features/settings/modules/business_profile/data/models/request/update_business_profile_request_model.dart

class UpdateBusinessProfileRequestModel {
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
  final List<BreakTimeRequestModel>? breakTimes;
  final bool? isOpen;
  final LocationRequestModel? location;

  UpdateBusinessProfileRequestModel({
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

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> json = {};
    
    if (shopName != null) json['shopName'] = shopName;
    if (firstName != null) json['firstName'] = firstName;
    if (lastName != null) json['lastName'] = lastName;
    if (gender != null) json['gender'] = gender;
    if (dateOfBirth != null) json['dateOfBirth'] = dateOfBirth;
    if (numberOfEmployees != null) json['numberOfEmployees'] = numberOfEmployees;
    if (yearsOfExperience != null) json['yearsOfExperience'] = yearsOfExperience;
    if (bio != null) json['bio'] = bio;
    if (address != null) json['address'] = address;
    if (category != null) json['category'] = category;
    if (targetCustomers != null) json['targetCustomers'] = targetCustomers;
    if (amenities != null) json['amenities'] = amenities;
    if (workingDays != null) json['workingDays'] = workingDays;
    if (openTime != null || closeTime != null) {
      json['workingHours'] = {
        if (openTime != null) 'openTime': openTime,
        if (closeTime != null) 'closeTime': closeTime,
      };
    }
    if (breakTimes != null) json['breakTimes'] = breakTimes?.map((e) => e.toJson()).toList();
    if (isOpen != null) json['isOpen'] = isOpen;
    if (location != null) json['location'] = location?.toJson();
    
    return json;
  }
}

class BreakTimeRequestModel {
  final String start;
  final String end;

  BreakTimeRequestModel({
    required this.start,
    required this.end,
  });

  Map<String, dynamic> toJson() {
    return {
      'start': start,
      'end': end,
    };
  }
}

class LocationRequestModel {
  final String type;
  final List<double> coordinates;

  LocationRequestModel({
    required this.type,
    required this.coordinates,
  });

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'coordinates': coordinates,
    };
  }
}
