// lib/shared/widgets/other/phone_text_field/presentation/widgets/country_selection_dialog.dart

part of '../../phone_text_field.dart';

class CountrySelectionDialog extends StatefulWidget {
  final PhoneTextFieldController controller;

  const CountrySelectionDialog(
    this.controller, {
    super.key,
  });

  @override
  State<CountrySelectionDialog> createState() => _CountrySelectionDialogState();
}

class _CountrySelectionDialogState extends State<CountrySelectionDialog> {
  final TextEditingController _searchController = TextEditingController();
  final List<Country> _filteredCountries = <Country>[];
  bool _isTyping = false;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_listener);
  }

  void _listener() {
    final String text = _searchController.text.trim();

    final isTyping = text.isNotEmpty;
    if (_isTyping != isTyping) {
      setState(() {
        _isTyping = isTyping;
      });
    }

    if (_isTyping) {
      _filteredCountries.clear();
      _filteredCountries.addAll(
        widget.controller.searchCountries(
          text.toLowerCase(),
        ),
      );
      setState(() {});
    }
  }

  @override
  void dispose() {
    _searchController.removeListener(_listener);
    _searchController.dispose();
    super.dispose();
  }

  Widget _buildBlock(List<Country> countries) {
    return ListView.separated(
      itemCount: countries.length,
      itemBuilder: (BuildContext context, int index) {
        final country = countries[index];
        return ListTile(
          contentPadding: EdgeInsets.all(context.scale(12)),
          horizontalTitleGap: context.scale(18),
          minTileHeight: 0,
          minVerticalPadding: 0,
          leading: FlagIcon(
            country.flag,
            size: context.scale(18),
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(context.scale(8)),
          ),
          title: Text(
            country.name,
            style: TextStyle(
              color: context.appColors.neutralShade850,
              fontSize: context.scale(14),
            ),
          ),
          trailing: Text(
            country.dialingInfo.dialCode,
            style: TextStyle(
              color: context.appColors.blueShade100,
              fontSize: context.scale(14),
            ),
          ),
          onTap: () => context.pop<Country>(country),
        );
      },
      padding: EdgeInsets.all(context.scale(12)),
      physics: const ClampingScrollPhysics(),
      separatorBuilder: (BuildContext context, int index) => SizedBox(
        height: context.scale(6),
      ),
      shrinkWrap: true,
    );
  }

  @override
  Widget build(BuildContext context) {
    final double illustrationSize = context.screenWidth * 0.48;
    return SafeArea(
      child: Column(
        children: [
          CustomSearchBar(
            controller: _searchController,
            dividerColor: context.appColors.secondaryDividerColor,
            hintText: 'Choose a country',
            onClear: () => setState(() {
              _filteredCountries.clear();
            }),
          ),
          Expanded(
            child: Visibility(
              visible: _isTyping,
              replacement: ListView.separated(
                itemCount: widget.controller.countries.length,
                itemBuilder: (BuildContext context, int index) {
                  return _buildBlock(widget.controller.countries[index].countries);
                },
                padding: EdgeInsets.all(context.scale(12)),
                physics: const ClampingScrollPhysics(),
                separatorBuilder: (BuildContext context, int index) => Divider(
                  color: context.appColors.secondaryDividerColor,
                  height: context.scale(12),
                ),
                shrinkWrap: true,
              ),
              child: Visibility(
                visible: _filteredCountries.isEmpty,
                replacement: _buildBlock(_filteredCountries),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  mainAxisAlignment: MainAxisAlignment.center,
                  spacing: context.scale(32),
                  children: [
                    ThemeModeBuilder(
                      builder: (BuildContext context, bool isDarkMode) {
                        return SvgPicture.asset(
                          'assets/images/error/${isDarkMode ? 'dark' : 'light'}/not_found.svg',
                          width: illustrationSize,
                          placeholderBuilder: (BuildContext context) {
                            return Shimmer.fromColors(
                              baseColor: context.appColors.backgroundShade75,
                              highlightColor: context.appColors.backgroundShade150,
                              child: ShimmerContainer(
                                color: context.appColors.backgroundShade75,
                                width: illustrationSize,
                                height: illustrationSize,
                              ),
                            );
                          },
                        );
                      },
                    ),
                    Text(
                      'No Results',
                      style: TextStyle(
                        fontSize: context.scale(14),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
