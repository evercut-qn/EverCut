// lib/shared/widgets/other/phone_text_field/presentation/controller/phone_text_field_controller.dart

part of '../../phone_text_field.dart';

class PhoneTextFieldController {
  late final CountryLocalDataSource _countryLocalDataSource;
  late final CountryRepository _countryRepository;
  late final FormatPhoneNumberUseCase _formatPhoneNumber;
  late final GetAllCountriesUseCase _getAllCountries;
  late final GetCountryByDialCodeUseCase _getCountryByDialCode;
  late final GetCountryByIsoCodeUseCase _getCountryByIsoCode;
  late final SearchCountriesUseCase _searchCountries;
  late final TextEditingController _textEditingController;
  late final List<CountryGroup> _countries;

  final ValueNotifier<Country> _countryNotifier = ValueNotifier<Country>(
    Country(
      isoCode: 'IN',
      flag: FlagIcons.india,
      name: 'India',
      dialingInfo: CountryDialingInfo(
        dialCode: '+91',
        formatPattern: 'XXXXX XXXXX',
        validationRegex: r'^[6-9]\d{4} \d{5}$',
        digitGroups: const [5, 5],
      ),
    ),
  );

  PhoneTextFieldController({
    String? isoCode,
    String? dialCode,
    String? initialText,
  }) {
    assert(!(isoCode != null && dialCode != null), 'You must provide exactly one: either isoCode or dialCode, but not both.');

    _countryLocalDataSource = CountryLocalDataSourceImpl();
    _countryRepository = CountryRepositoryImpl(_countryLocalDataSource);
    _formatPhoneNumber = FormatPhoneNumberUseCase();
    _getAllCountries = GetAllCountriesUseCase(_countryRepository);
    _getCountryByDialCode = GetCountryByDialCodeUseCase(_countryRepository);
    _getCountryByIsoCode = GetCountryByIsoCodeUseCase(_countryRepository);
    _searchCountries = SearchCountriesUseCase(_countryRepository);
    _textEditingController = TextEditingController();

    _countries = _getAllCountries();

    if (isoCode != null) {
      _setCountryByIsoCode(isoCode);
    } else if (dialCode != null) {
      _setCountryByDialCode(dialCode);
    }

    _textEditingController.text = initialText ?? '';
  }

  TextEditingController get textEditingController => _textEditingController;
  ValueNotifier<Country> get countryNotifier => _countryNotifier;
  List<CountryGroup> get countries => _countries;

  void setCountry(Country? country) {
    if (country != null) {
      _countryNotifier.value = country;
      _textEditingController.text = '';
    }
  }

  void _setCountryByIsoCode(String isoCode) {
    final country = _getCountryByIsoCode(isoCode);

    if (country != null) {
      _countryNotifier.value = country;
      _textEditingController.text = '';
    }
  }

  void _setCountryByDialCode(String dialCode) {
    final country = _getCountryByDialCode(dialCode);

    if (country != null) {
      _countryNotifier.value = country;
      _textEditingController.text = '';
    }
  }

  String get e164PhoneNumber {
    final rawPhoneNumber = _textEditingController.text.trim();

    if (rawPhoneNumber.isEmpty) {
      return '';
    } else {
      final dialCode = _countryNotifier.value.dialingInfo.dialCode;
      final cleanedNumber = rawPhoneNumber.replaceAll(RegExp(r'[^0-9]'), '');
      return '$dialCode$cleanedNumber';
    }
  }

  String formattedPhoneNumber([String? e164PhoneNumber]) {
    e164PhoneNumber ??= this.e164PhoneNumber;

    final phoneNumber = _formatPhoneNumber.execute(e164PhoneNumber, _countries);
    if (phoneNumber != null) {
      return '${phoneNumber.dialCode} ${phoneNumber.value}';
    } else {
      return e164PhoneNumber;
    }
  }

  List<Country> searchCountries(String query) {
    return _searchCountries(query);
  }

  void dispose() {
    _countryNotifier.dispose();
    _textEditingController.dispose();
  }
}
