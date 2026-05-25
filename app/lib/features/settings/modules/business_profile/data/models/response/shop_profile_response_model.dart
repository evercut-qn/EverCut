// lib/features/settings/modules/business_profile/data/models/response/shop_profile_response_model.dart

class ShopProfileResponseModel {
  final String? id;
  final OwnerModel? owner;
  final String? shopName;
  final String? category;
  final String? targetCustomers;
  final PayoutModel? payout;
  final String? bio;
  final String? address;
  final LocationModel? location;
  final int? numberOfEmployees;
  final int? yearsOfExperience;
  final List<String>? amenities;
  final List<String>? workingDays;
  final WorkingHoursModel? workingHours;
  final List<BreakTimeModel>? breakTimes;
  final String? coverUrl;
  final bool? isOpen;
  final MissedConfirmationsModel? missedConfirmations;
  final List<PhotoModel>? photos;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  ShopProfileResponseModel({
    this.id,
    this.owner,
    this.shopName,
    this.category,
    this.targetCustomers,
    this.payout,
    this.bio,
    this.address,
    this.location,
    this.numberOfEmployees,
    this.yearsOfExperience,
    this.amenities,
    this.workingDays,
    this.workingHours,
    this.breakTimes,
    this.coverUrl,
    this.isOpen,
    this.missedConfirmations,
    this.photos,
    this.createdAt,
    this.updatedAt,
  });

  factory ShopProfileResponseModel.fromJson(Map<String, dynamic> json) {
    return ShopProfileResponseModel(
      id: json['id'] as String?,
      owner: json['owner'] != null ? OwnerModel.fromJson(json['owner'] as Map<String, dynamic>) : null,
      shopName: json['shopName'] as String?,
      category: json['category'] as String?,
      targetCustomers: json['targetCustomers'] as String?,
      payout: json['payout'] != null ? PayoutModel.fromJson(json['payout'] as Map<String, dynamic>) : null,
      bio: json['bio'] as String?,
      address: json['address'] as String?,
      location: json['location'] != null ? LocationModel.fromJson(json['location'] as Map<String, dynamic>) : null,
      numberOfEmployees: json['numberOfEmployees'] as int?,
      yearsOfExperience: json['yearsOfExperience'] as int?,
      amenities: (json['amenities'] as List<dynamic>?)?.map((e) => e as String).toList(),
      workingDays: (json['workingDays'] as List<dynamic>?)?.map((e) => e as String).toList(),
      workingHours: json['workingHours'] != null ? WorkingHoursModel.fromJson(json['workingHours'] as Map<String, dynamic>) : null,
      breakTimes: (json['breakTimes'] as List<dynamic>?)?.map((e) => BreakTimeModel.fromJson(e as Map<String, dynamic>)).toList(),
      coverUrl: json['coverUrl'] as String?,
      isOpen: json['isOpen'] as bool?,
      missedConfirmations: json['missedConfirmations'] != null ? MissedConfirmationsModel.fromJson(json['missedConfirmations'] as Map<String, dynamic>) : null,
      photos: (json['photos'] as List<dynamic>?)?.map((e) => PhotoModel.fromJson(e as Map<String, dynamic>)).toList(),
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt'] as String) : null,
      updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt'] as String) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'owner': owner?.toJson(),
      'shopName': shopName,
      'category': category,
      'targetCustomers': targetCustomers,
      'payout': payout?.toJson(),
      'bio': bio,
      'address': address,
      'location': location?.toJson(),
      'numberOfEmployees': numberOfEmployees,
      'yearsOfExperience': yearsOfExperience,
      'amenities': amenities,
      'workingDays': workingDays,
      'workingHours': workingHours?.toJson(),
      'breakTimes': breakTimes?.map((e) => e.toJson()).toList(),
      'coverUrl': coverUrl,
      'isOpen': isOpen,
      'missedConfirmations': missedConfirmations?.toJson(),
      'photos': photos?.map((e) => e.toJson()).toList(),
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }
}

class OwnerModel {
  final String? id;
  final String? firstName;
  final String? lastName;
  final String? gender;
  final DateTime? dateOfBirth;
  final String? email;
  final String? phoneNumber;
  final String? photoUrl;

  OwnerModel({
    this.id,
    this.firstName,
    this.lastName,
    this.gender,
    this.dateOfBirth,
    this.email,
    this.phoneNumber,
    this.photoUrl,
  });

  factory OwnerModel.fromJson(Map<String, dynamic> json) {
    return OwnerModel(
      id: json['id'] as String?,
      firstName: json['firstName'] as String?,
      lastName: json['lastName'] as String?,
      gender: json['gender'] as String?,
      dateOfBirth: json['dateOfBirth'] != null ? DateTime.parse(json['dateOfBirth'] as String) : null,
      email: json['email'] as String?,
      phoneNumber: json['phoneNumber'] as String?,
      photoUrl: json['photoUrl'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'firstName': firstName,
      'lastName': lastName,
      'gender': gender,
      'dateOfBirth': dateOfBirth?.toIso8601String(),
      'email': email,
      'phoneNumber': phoneNumber,
      'photoUrl': photoUrl,
    };
  }
}

class PayoutModel {
  final String? accountHolderName;
  final String? bankName;
  final String? upiId;
  final String? bankAccountLast4;
  final String? ifsc;
  final String? verificationStatus;
  final bool? isVerified;
  final DateTime? verifiedAt;
  final String? beneficiaryId;
  final DateTime? beneficiaryCreatedAt;
  final bool? canReceivePayouts;

  PayoutModel({
    this.accountHolderName,
    this.bankName,
    this.upiId,
    this.bankAccountLast4,
    this.ifsc,
    this.verificationStatus,
    this.isVerified,
    this.verifiedAt,
    this.beneficiaryId,
    this.beneficiaryCreatedAt,
    this.canReceivePayouts,
  });

  factory PayoutModel.fromJson(Map<String, dynamic> json) {
    return PayoutModel(
      accountHolderName: json['accountHolderName'] as String?,
      bankName: json['bankName'] as String?,
      upiId: json['upiId'] as String?,
      bankAccountLast4: json['bankAccountLast4'] as String?,
      ifsc: json['ifsc'] as String?,
      verificationStatus: json['verificationStatus'] as String?,
      isVerified: json['isVerified'] as bool?,
      verifiedAt: json['verifiedAt'] != null ? DateTime.parse(json['verifiedAt'] as String) : null,
      beneficiaryId: json['beneficiaryId'] as String?,
      beneficiaryCreatedAt: json['beneficiaryCreatedAt'] != null ? DateTime.parse(json['beneficiaryCreatedAt'] as String) : null,
      canReceivePayouts: json['canReceivePayouts'] as bool?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'accountHolderName': accountHolderName,
      'bankName': bankName,
      'upiId': upiId,
      'bankAccountLast4': bankAccountLast4,
      'ifsc': ifsc,
      'verificationStatus': verificationStatus,
      'isVerified': isVerified,
      'verifiedAt': verifiedAt?.toIso8601String(),
      'beneficiaryId': beneficiaryId,
      'beneficiaryCreatedAt': beneficiaryCreatedAt?.toIso8601String(),
      'canReceivePayouts': canReceivePayouts,
    };
  }
}

class LocationModel {
  final String? type;
  final List<double>? coordinates;

  LocationModel({
    this.type,
    this.coordinates,
  });

  factory LocationModel.fromJson(Map<String, dynamic> json) {
    return LocationModel(
      type: json['type'] as String?,
      coordinates: (json['coordinates'] as List<dynamic>?)?.map((e) => (e as num).toDouble()).toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'coordinates': coordinates,
    };
  }
}

class WorkingHoursModel {
  final String? openTime;
  final String? closeTime;

  WorkingHoursModel({
    this.openTime,
    this.closeTime,
  });

  factory WorkingHoursModel.fromJson(Map<String, dynamic> json) {
    return WorkingHoursModel(
      openTime: json['openTime'] as String?,
      closeTime: json['closeTime'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'openTime': openTime,
      'closeTime': closeTime,
    };
  }
}

class BreakTimeModel {
  final String? start;
  final String? end;

  BreakTimeModel({
    this.start,
    this.end,
  });

  factory BreakTimeModel.fromJson(Map<String, dynamic> json) {
    return BreakTimeModel(
      start: json['start'] as String?,
      end: json['end'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'start': start,
      'end': end,
    };
  }
}

class MissedConfirmationsModel {
  final int? count;
  final DateTime? lastMissedAt;

  MissedConfirmationsModel({
    this.count,
    this.lastMissedAt,
  });

  factory MissedConfirmationsModel.fromJson(Map<String, dynamic> json) {
    return MissedConfirmationsModel(
      count: json['count'] as int?,
      lastMissedAt: json['lastMissedAt'] != null ? DateTime.parse(json['lastMissedAt'] as String) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'count': count,
      'lastMissedAt': lastMissedAt?.toIso8601String(),
    };
  }
}

class PhotoModel {
  final String? id;
  final String? type;
  final String? url;
  final DateTime? createdAt;

  PhotoModel({
    this.id,
    this.type,
    this.url,
    this.createdAt,
  });

  factory PhotoModel.fromJson(Map<String, dynamic> json) {
    return PhotoModel(
      id: json['id'] as String?,
      type: json['type'] as String?,
      url: json['url'] as String?,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt'] as String) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'url': url,
      'createdAt': createdAt?.toIso8601String(),
    };
  }
}
