// lib/features/settings/modules/business_profile/domain/entities/shop_profile_entity.dart

import 'package:equatable/equatable.dart';

class ShopProfileEntity extends Equatable {
  final String? id;
  final OwnerEntity? owner;
  final String? shopName;
  final String? category;
  final String? targetCustomers;
  final PayoutEntity? payout;
  final String? bio;
  final String? address;
  final LocationEntity? location;
  final int? numberOfEmployees;
  final int? yearsOfExperience;
  final List<String>? amenities;
  final List<String>? workingDays;
  final WorkingHoursEntity? workingHours;
  final List<BreakTimeEntity>? breakTimes;
  final String? coverUrl;
  final bool? isOpen;
  final MissedConfirmationsEntity? missedConfirmations;
  final List<PhotoEntity>? photos;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const ShopProfileEntity({
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

  @override
  List<Object?> get props => [
        id,
        owner,
        shopName,
        category,
        targetCustomers,
        payout,
        bio,
        address,
        location,
        numberOfEmployees,
        yearsOfExperience,
        amenities,
        workingDays,
        workingHours,
        breakTimes,
        coverUrl,
        isOpen,
        missedConfirmations,
        photos,
        createdAt,
        updatedAt,
      ];
}

class OwnerEntity extends Equatable {
  final String? id;
  final String? firstName;
  final String? lastName;
  final String? gender;
  final DateTime? dateOfBirth;
  final String? email;
  final String? phoneNumber;
  final String? photoUrl;

  const OwnerEntity({
    this.id,
    this.firstName,
    this.lastName,
    this.gender,
    this.dateOfBirth,
    this.email,
    this.phoneNumber,
    this.photoUrl,
  });

  @override
  List<Object?> get props => [id, firstName, lastName, gender, dateOfBirth, email, phoneNumber, photoUrl];
}

class PayoutEntity extends Equatable {
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

  const PayoutEntity({
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

  @override
  List<Object?> get props => [
        accountHolderName,
        bankName,
        upiId,
        bankAccountLast4,
        ifsc,
        verificationStatus,
        isVerified,
        verifiedAt,
        beneficiaryId,
        beneficiaryCreatedAt,
        canReceivePayouts,
      ];
}

class LocationEntity extends Equatable {
  final String? type;
  final List<double>? coordinates;

  const LocationEntity({
    this.type,
    this.coordinates,
  });

  @override
  List<Object?> get props => [type, coordinates];
}

class WorkingHoursEntity extends Equatable {
  final String? openTime;
  final String? closeTime;

  const WorkingHoursEntity({
    this.openTime,
    this.closeTime,
  });

  @override
  List<Object?> get props => [openTime, closeTime];
}

class BreakTimeEntity extends Equatable {
  final String? start;
  final String? end;

  const BreakTimeEntity({
    this.start,
    this.end,
  });

  @override
  List<Object?> get props => [start, end];
}

class MissedConfirmationsEntity extends Equatable {
  final int? count;
  final DateTime? lastMissedAt;

  const MissedConfirmationsEntity({
    this.count,
    this.lastMissedAt,
  });

  @override
  List<Object?> get props => [count, lastMissedAt];
}

class PhotoEntity extends Equatable {
  final String? id;
  final String? type;
  final String? url;
  final DateTime? createdAt;

  const PhotoEntity({
    this.id,
    this.type,
    this.url,
    this.createdAt,
  });

  @override
  List<Object?> get props => [id, type, url, createdAt];
}
