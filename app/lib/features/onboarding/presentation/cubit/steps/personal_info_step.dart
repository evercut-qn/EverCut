// lib/features/onboarding/presentation/cubit/steps/personal_info_step.dart

class PersonalInfoStep {
  final String firstName;
  final String lastName;
  final String? email;
  final DateTime? dateOfBirth;
  final int? gender;

  const PersonalInfoStep({
    this.firstName = '',
    this.lastName = '',
    this.email,
    this.dateOfBirth,
    this.gender,
  });

  PersonalInfoStep copyWith({
    String? firstName,
    String? lastName,
    String? email,
    DateTime? dateOfBirth,
    int? gender,
  }) {
    return PersonalInfoStep(
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      email: email ?? this.email,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      gender: gender ?? this.gender,
    );
  }
}
