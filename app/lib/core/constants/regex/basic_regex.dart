// lib/core/constants/regex/basic_regex.dart

class BasicRegEx {
  static const String emailAddress = r'^[a-zA-Z]([._-]?[a-zA-Z0-9]+)*@[a-zA-Z]+\.[a-zA-Z]+$';
  static const String date = r'^(0[1-9]|[12][0-9]|3[01])\s(January|February|March|April|May|June|July|August|September|October|November|December)\s\d{4}$';
  static const String time = r'^(\d{1,2}):(\d{2})\s?(AM|PM)$';
  static const String upiAddress = r'^[a-zA-Z0-9.-]{2,256}@[a-zA-Z][a-zA-Z]{2,64}$';
}
