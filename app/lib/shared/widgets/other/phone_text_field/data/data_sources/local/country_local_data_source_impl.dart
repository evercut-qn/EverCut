// lib/shared/widgets/other/phone_text_field/data/data_sources/local/country_local_data_source_impl.dart

import '../../../../../common/icons/flag_icon.dart';
import '../../models/country_dialing_info_model.dart';
import '../../models/country_group_model.dart';
import '../../models/country_model.dart';

import 'country_local_data_source.dart';

class CountryLocalDataSourceImpl implements CountryLocalDataSource {
  static final List<CountryGroupModel> _countries = [
    CountryGroupModel(
      initial: 'A',
      countries: [
        CountryModel(
          isoCode: 'AM',
          flag: FlagIcons.armenia,
          name: 'Armenia',
          dialingInfo: CountryDialingInfoModel(
            dialCode: '+374',
            formatPattern: 'XX XXX XXX',
            validationRegex: r'^(33|43|41|44|49|50|55|66|77|91|93|94|95|96|97|98|99) \d{3} \d{3}$',
            digitGroups: const [2, 3, 3],
          ),
        ),
        CountryModel(
          isoCode: 'AU',
          flag: FlagIcons.australia,
          name: 'Australia',
          dialingInfo: CountryDialingInfoModel(
            dialCode: '+61',
            formatPattern: '04XX XXX XXX',
            validationRegex: r'^04\d{2} \d{3} \d{3}$',
            digitGroups: const [4, 3, 3],
          ),
        ),
        CountryModel(
          isoCode: 'AZ',
          flag: FlagIcons.azerbaijan,
          name: 'Azerbaijan',
          dialingInfo: CountryDialingInfoModel(
            dialCode: '+994',
            formatPattern: 'XX XXX XXXX',
            validationRegex: r'^(50|51|55|70|77|99) \d{3} \d{4}$',
            digitGroups: const [2, 3, 4],
          ),
        ),
      ],
    ),
    CountryGroupModel(
      initial: 'B',
      countries: [
        CountryModel(
          isoCode: 'BT',
          flag: FlagIcons.bhutan,
          name: 'Bhutan',
          dialingInfo: CountryDialingInfoModel(
            dialCode: '+975',
            formatPattern: '',
            validationRegex: '',
            digitGroups: const [],
          ),
        ),
      ],
    ),
    CountryGroupModel(
      initial: 'C',
      countries: [
        CountryModel(
          isoCode: 'CA',
          flag: FlagIcons.canada,
          name: 'Canada',
          dialingInfo: CountryDialingInfoModel(
            dialCode: '+1',
            formatPattern: 'XXX XXX XXXX',
            validationRegex: r'^[2-9]\d{2} [2-9]\d{2} \d{4}$',
            digitGroups: const [3, 3, 4],
          ),
        ),
      ],
    ),
    CountryGroupModel(
      initial: 'F',
      countries: [
        CountryModel(
          isoCode: 'FR',
          flag: FlagIcons.france,
          name: 'France',
          dialingInfo: CountryDialingInfoModel(
            dialCode: '+33',
            formatPattern: '0X XX XX XX XX',
            validationRegex: r'^0[67] \d{2} \d{2} \d{2} \d{2}$',
            digitGroups: const [1, 2, 2, 2, 2],
          ),
        ),
      ],
    ),
    CountryGroupModel(
      initial: 'H',
      countries: [
        CountryModel(
          isoCode: 'HK',
          flag: FlagIcons.hongKong,
          name: 'Hong Kong',
          dialingInfo: CountryDialingInfoModel(
            dialCode: '+852',
            formatPattern: 'XXXX XXXX',
            validationRegex: r'^[569]\d{3} \d{4}$',
            digitGroups: const [4, 4],
          ),
        ),
      ],
    ),
    CountryGroupModel(
      initial: 'I',
      countries: [
        CountryModel(
          isoCode: 'IN',
          flag: FlagIcons.india,
          name: 'India',
          dialingInfo: CountryDialingInfoModel(
            dialCode: '+91',
            formatPattern: 'XXXXX XXXXX',
            validationRegex: r'^[6-9]\d{4} \d{5}$',
            digitGroups: const [5, 5],
          ),
        ),
      ],
    ),
    CountryGroupModel(
      initial: 'O',
      countries: [
        CountryModel(
          isoCode: 'OM',
          flag: FlagIcons.oman,
          name: 'Oman',
          dialingInfo: CountryDialingInfoModel(
            dialCode: '+968',
            formatPattern: '9XXXXXXX',
            validationRegex: r'^9[1-9]\d{6}$',
            digitGroups: const [8],
          ),
        ),
      ],
    ),
    CountryGroupModel(
      initial: 'S',
      countries: [
        CountryModel(
          isoCode: 'SA',
          flag: FlagIcons.saudiArabia,
          name: 'Saudi Arabia',
          dialingInfo: CountryDialingInfoModel(
            dialCode: '+966',
            formatPattern: '5X XXX XXXX',
            validationRegex: r'^5\d{1} \d{3} \d{4}$',
            digitGroups: const [2, 3, 4],
          ),
        ),
        CountryModel(
          isoCode: 'SG',
          flag: FlagIcons.singapore,
          name: 'Singapore',
          dialingInfo: CountryDialingInfoModel(
            dialCode: '+65',
            formatPattern: 'XXXX XXXX',
            validationRegex: r'^[689]\d{3} \d{4}$',
            digitGroups: const [4, 4],
          ),
        ),
      ],
    ),
    CountryGroupModel(
      initial: 'U',
      countries: [
        CountryModel(
          isoCode: 'AE',
          flag: FlagIcons.unitedArabEmirates,
          name: 'United Arab Emirates',
          dialingInfo: CountryDialingInfoModel(
            dialCode: '+971',
            formatPattern: '5X XXX XXXX',
            validationRegex: r'^5[024568] \d{3} \d{4}$',
            digitGroups: const [2, 3, 4],
          ),
        ),
        CountryModel(
          isoCode: 'GB',
          flag: FlagIcons.unitedKingdom,
          name: 'United Kingdom',
          dialingInfo: CountryDialingInfoModel(
            dialCode: '+44',
            formatPattern: '7XXX XXXXXX',
            validationRegex: r'^7[1-57-9]\d{2} \d{6}$',
            digitGroups: const [4, 6],
          ),
        ),
        CountryModel(
          isoCode: 'US',
          flag: FlagIcons.unitedStates,
          name: 'United States',
          dialingInfo: CountryDialingInfoModel(
            dialCode: '+1',
            formatPattern: 'XXX XXX XXXX',
            validationRegex: r'^[2-9][0-8]\d{1} [2-9]\d{2} \d{4}$',
            digitGroups: const [3, 3, 4],
          ),
        ),
      ],
    ),
  ];

  @override
  List<CountryGroupModel> getCountries() {
    return _countries;
  }

  @override
  CountryModel? getCountryByDialCode(String dialCode) {
    for (final group in _countries) {
      for (final country in group.countries) {
        if (country.dialingInfo.dialCode == dialCode.trim()) {
          return country;
        }
      }
    }
    return null;
  }

  @override
  CountryModel? getCountryByIsoCode(String isoCode) {
    for (final group in _countries) {
      for (final country in group.countries) {
        if (country.isoCode == isoCode) {
          return country;
        }
      }
    }
    return null;
  }

  @override
  List<CountryModel> searchCountries(String query) {
    if (query.isNotEmpty) {
      final lowercaseQuery = query.toLowerCase();
      final results = <CountryModel>[];

      for (final group in _countries) {
        for (final country in group.countries) {
          if (country.name.toLowerCase().contains(lowercaseQuery)) {
            results.add(country);
          }
        }
      }

      return results;
    } else {
      return [];
    }
  }
}
