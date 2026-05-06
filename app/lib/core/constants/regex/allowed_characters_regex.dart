// lib/core/constants/regex/allowed_characters_regex.dart

class AllowedCharactersRegEx {
  static const String emailAddress = r'^[a-zA-Z0-9._\-@]*$';
  static const String upiAddress = r'^[a-zA-Z0-9.\-@]*$';
  static const String alphabets = r'^[a-zA-Z]+$';
  static const String words = r'^[a-zA-Z0-9\s]*$';
}
