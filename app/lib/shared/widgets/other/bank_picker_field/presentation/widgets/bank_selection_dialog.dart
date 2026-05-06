// lib/shared/widgets/other/bank_picker_field/presentation/widgets/bank_selection_dialog.dart

import 'package:flutter/material.dart';
import 'package:flutter_svg/svg.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';

import '../../../../../../core/theme/presentation/widgets/theme_mode_builder.dart';
import '../../../../../extensions/context/app_colors_extension.dart';
import '../../../../../extensions/context/device_metrics_extension.dart';
import '../../../../common/appbars/search_bar.dart';
import '../../../loaders/shimmer_container.dart';
import '../../data/data_sources/local/bank_local_data_source.dart';
import '../../data/data_sources/local/bank_local_data_source_impl.dart';
import '../../data/repositories/bank_repository_impl.dart';
import '../../domain/entities/bank.dart';
import '../../domain/entities/bank_group.dart';
import '../../domain/repositories/bank_repository.dart';
import '../../domain/use_cases/get_all_banks_use_case.dart';
import '../../domain/use_cases/search_banks_use_case.dart';

class BankSelectionDialog extends StatefulWidget {
  const BankSelectionDialog({super.key});

  @override
  State<BankSelectionDialog> createState() => _BankSelectionDialogState();
}

class _BankSelectionDialogState extends State<BankSelectionDialog> {
  late final BankLocalDataSource _bankLocalDataSource;
  late final BankRepository _bankRepository;
  late final GetAllBanksUseCase _getAllBanks;
  late final SearchBanksUseCase _searchBanks;
  late final TextEditingController _searchController;
  late final List<BankGroup> _banks;
  late final List<Bank> _filteredBanks;

  bool _isTyping = false;

  @override
  void initState() {
    super.initState();
    _bankLocalDataSource = BankLocalDataSourceImpl();
    _bankRepository = BankRepositoryImpl(_bankLocalDataSource);
    _getAllBanks = GetAllBanksUseCase(_bankRepository);
    _searchBanks = SearchBanksUseCase(_bankRepository);
    _searchController = TextEditingController();

    _banks = _getAllBanks();
    _filteredBanks = <Bank>[];

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
      _filteredBanks.clear();
      _filteredBanks.addAll(
        _searchBanks(
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

  Widget _buildBlock(List<Bank> banks) {
    return ListView.separated(
      itemCount: banks.length,
      itemBuilder: (BuildContext context, int index) {
        final bank = banks[index];
        return ListTile(
          contentPadding: EdgeInsets.all(context.scale(12)),
          horizontalTitleGap: context.scale(18),
          minTileHeight: 0,
          minVerticalPadding: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(context.scale(8)),
          ),
          title: Text(
            bank.name,
            style: TextStyle(
              color: context.appColors.neutralShade850,
              fontSize: context.scale(14),
            ),
          ),
          onTap: () => context.pop<String>(bank.name),
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
            hintText: 'Choose a bank',
            onClear: () => setState(() {
              _filteredBanks.clear();
            }),
          ),
          Expanded(
            child: Visibility(
              visible: _isTyping,
              replacement: ListView.separated(
                itemCount: _banks.length,
                itemBuilder: (BuildContext context, int index) {
                  return _buildBlock(_banks[index].banks);
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
                visible: _filteredBanks.isEmpty,
                replacement: _buildBlock(_filteredBanks),
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
                              baseColor: context.appColors.neutralShade200.withAlpha(50),
                              highlightColor: context.appColors.neutralShade300.withAlpha(150),
                              child: ShimmerContainer(
                                borderRadius: 4,
                                color: context.appColors.neutralShade200.withAlpha(150),
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
