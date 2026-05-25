// lib/features/transactions/presentation/widgets/filter_dialog.dart

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/foundation/app_icons.dart';
import '../../../../shared/enums/date_range_type.dart';
import '../../../../shared/enums/sort.dart';
import '../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../shared/models/ranges/date_range.dart';
import '../../../../shared/models/ui/list_tile_option.dart';
import '../../../../shared/models/ui/sort_option.dart';
import '../../../../shared/utils/formatters/number.dart';
import '../../../../shared/widgets/common/inputs/text_form_field.dart';
import '../../../../shared/widgets/overlays/dialogs.dart';
import '../models/transaction_filter.dart';

class FilterDialogWidget extends StatefulWidget {
  final TransactionFilterModel initialValue;
  final ValueSetter<TransactionFilterModel> onApplyPressed;

  const FilterDialogWidget({
    super.key,
    required this.initialValue,
    required this.onApplyPressed,
  });

  @override
  State<FilterDialogWidget> createState() => _FilterDialogWidgetState();
}

class _FilterDialogWidgetState extends State<FilterDialogWidget> {
  final List<String> _tabs = ['Date Range', 'Amount', 'Status', 'Sort'];

  int _selectedTabIndex = 0;
  DateRangeModel _dateRange = DateRangeModel(
    from: DateTime.now(),
    to: DateTime.now(),
  );

  final GlobalKey<FormState> _amountFormKey = GlobalKey<FormState>();
  final TextEditingController _minAmountController = TextEditingController();
  final TextEditingController _maxAmountController = TextEditingController();

  // final List<TransactionAction> _selectedActions = [];
  // final List<TransactionStatus> _selectedStatuses = [];

  SortOptionModel _sortOption = SortOptionModel(
    sortBy: SortByEnum.date,
    sortOrder: SortOrderEnum.descending,
  );

  @override
  void initState() {
    super.initState();

    _dateRange = widget.initialValue.dateRange;

    _minAmountController.text = NumberFormatter.formatDouble(widget.initialValue.amountRange.min);
    _maxAmountController.text = NumberFormatter.formatDouble(widget.initialValue.amountRange.max);

    // _selectedActions.addAll(initial.actions);
    // _selectedStatuses.addAll(initial.statuses);

    _sortOption = widget.initialValue.sortOption ?? _sortOption;
  }

  // Future<void> _onApplyPressed() async {
  //   if (!_amountFormKey.currentState!.validate()) {
  //     if (_selectedTabIndex != 1) {
  //       setState(() {
  //         _selectedTabIndex = 1;
  //       });
  //     }
  //     return;
  //   }
  //   widget.onApplyPressed((
  //     dates: _dates,
  //     amount: (
  //       min: MoneyInputFormatter.getRawValue(_minAmountController.text),
  //       max: MoneyInputFormatter.getRawValue(_maxAmountController.text),
  //     ),
  //     actions: _selectedActions,
  //     statuses: _selectedStatuses,
  //     sort: (
  //       by: _sortBy,
  //       order: _sortOrder,
  //     ),
  //   ));
  // }

  @override
  void dispose() {
    _minAmountController.dispose();
    _maxAmountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.start,
            children: [
              Flexible(
                flex: 2,
                child: ListView.separated(
                  itemBuilder: (BuildContext context, int index) {
                    final selected = _selectedTabIndex == index;
                    return Material(
                      color: selected ? context.appColors.backgroundShade100.withAlpha(191) : Colors.transparent,
                      child: InkWell(
                        onTap: () {
                          if (!selected) {
                            setState(() {
                              _selectedTabIndex = index;
                            });
                          }
                        },
                        overlayColor: WidgetStatePropertyAll(context.appColors.backgroundShade200.withAlpha(127)),
                        child: Padding(
                          padding: EdgeInsets.all(context.scale(16)),
                          child: Text(
                            _tabs[index],
                            style: TextStyle(
                              color: context.appColors.neutralShade650,
                              fontSize: context.scale(12.75),
                              fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                  itemCount: _tabs.length,
                  padding: EdgeInsets.symmetric(vertical: context.scale(8)),
                  physics: const ClampingScrollPhysics(),
                  separatorBuilder: (BuildContext context, int index) => Divider(
                    color: context.appColors.secondaryDividerColor,
                    height: 1.0,
                  ),
                  shrinkWrap: true,
                ),
              ),
              VerticalDivider(
                color: context.appColors.secondaryDividerColor,
                width: 1.0,
              ),
              Flexible(
                flex: 4,
                child: IndexedStack(
                  index: _selectedTabIndex,
                  children: [
                    _DateSelectionWidget(
                      initialDateRange: _dateRange,
                      onDateChange: (DateRangeModel dateRange) {
                        _dateRange = dateRange;
                      },
                    ),
                    _AmountSelectionWidget(
                      formKey: _amountFormKey,
                      minAmountController: _minAmountController,
                      maxAmountController: _maxAmountController,
                    ),
                    const SizedBox(),
                    // _SelectableListWidget<TransactionAction>(
                    //   description: 'Select one or more types to filter transaction results.',
                    //   items: TransactionAction.values,
                    //   selectedItems: _selectedActions,
                    //   onSelectionChanged: (TransactionAction action, bool isSelected) {
                    //     setState(() {
                    //       if (isSelected) {
                    //         _selectedActions.add(action);
                    //       } else {
                    //         _selectedActions.remove(action);
                    //       }
                    //     });
                    //   },
                    // ),
                    // _SelectableListWidget<TransactionStatus>(
                    //   description: 'Select one or more statuses to filter transaction results.',
                    //   items: TransactionStatus.values,
                    //   selectedItems: _selectedStatuses,
                    //   onSelectionChanged: (TransactionStatus status, bool isSelected) {
                    //     setState(() {
                    //       if (isSelected) {
                    //         _selectedStatuses.add(status);
                    //       } else {
                    //         _selectedStatuses.remove(status);
                    //       }
                    //     });
                    //   },
                    // ),
                    _SortWidget<SortByEnum, SortOrderEnum>(
                      sortBy: _sortOption.sortBy,
                      sortOrder: _sortOption.sortOrder,
                      sortByOptions: const <ListTileOption<SortByEnum>>{
                        ListTileOption(icon: AppIcons.solidRoundedMoney02, title: 'Amount', value: SortByEnum.amount),
                        ListTileOption(icon: AppIcons.solidRoundedCalendar02, title: 'Date', value: SortByEnum.date),
                        ListTileOption(icon: AppIcons.solidRoundedInformationCircle, title: 'Status', value: SortByEnum.status),
                      },
                      sortOrderOptions: const <ListTileOption<SortOrderEnum>>{
                        ListTileOption(icon: AppIcons.solidRoundedSortByUp01, title: 'Ascending', value: SortOrderEnum.ascending),
                        ListTileOption(icon: AppIcons.solidRoundedSortByDown01, title: 'Descending', value: SortOrderEnum.descending),
                      },
                      onSortByChanged: (SortByEnum sortBy) {
                        if (sortBy != _sortOption.sortBy) {
                          setState(() {
                            _sortOption = _sortOption.copyWith(
                              sortBy: sortBy,
                            );
                          });
                        }
                      },
                      onSortOrderChanged: (SortOrderEnum sortOrder) {
                        if (sortOrder != _sortOption.sortOrder) {
                          setState(() {
                            _sortOption = _sortOption.copyWith(
                              sortOrder: sortOrder,
                            );
                          });
                        }
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        Divider(
          color: context.appColors.secondaryDividerColor,
          height: 1,
        ),
        Padding(
          padding: EdgeInsets.all(context.scale(20)),
          child: Row(
            spacing: context.scale(12),
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: Dialogs.of(context).closeDialog,
                  style: ButtonStyle(
                    padding: WidgetStatePropertyAll(
                      EdgeInsets.symmetric(
                        vertical: context.scale(12),
                        horizontal: context.scale(16),
                      ),
                    ),
                  ),
                  child: const Text('Cancel'),
                ),
              ),
              Expanded(
                child: FilledButton(
                  onPressed: () {}, // _onApplyPressed,
                  style: ButtonStyle(
                    padding: WidgetStatePropertyAll(
                      EdgeInsets.symmetric(
                        vertical: context.scale(12),
                        horizontal: context.scale(16),
                      ),
                    ),
                  ),
                  child: const Text('Apply'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _DateSelectionWidget extends StatefulWidget {
  final DateRangeModel initialDateRange;
  final ValueSetter<DateRangeModel> onDateChange;

  const _DateSelectionWidget({
    required this.initialDateRange,
    required this.onDateChange,
  });

  @override
  State<_DateSelectionWidget> createState() => _DateSelectionWidgetState();
}

class _DateSelectionWidgetState extends State<_DateSelectionWidget> {
  final TextEditingController _fromDateController = TextEditingController();
  final TextEditingController _toDateController = TextEditingController();

  DateRangeEnum _selectedDateRange = DateRangeEnum.today;

  String _formatDate(DateTime dateTime) => DateFormat('dd MMM yyyy').format(dateTime);
  DateTime _parseDate(String dateTime) => DateFormat('dd MMM yyyy').parse(dateTime);
  DateTime _stripTime(DateTime dateTime) => DateTime(dateTime.year, dateTime.month, dateTime.day);

  DateRangeEnum _handleChanges({
    required DateTime today,
    required DateTime fromDate,
    required DateTime toDate,
  }) {
    final yesterday = today.subtract(const Duration(days: 1));
    if (fromDate == toDate && toDate == yesterday) {
      return DateRangeEnum.yesterday;
    }

    if (fromDate == toDate && toDate == today) {
      return DateRangeEnum.today;
    }

    final tomorrow = today.add(const Duration(days: 1));
    if (fromDate == toDate && toDate == tomorrow) {
      return DateRangeEnum.tomorrow;
    }

    final thisWeekStart = today.subtract(Duration(days: today.weekday - 1));
    final thisWeekEnd = today;
    if (fromDate == thisWeekStart && thisWeekEnd == toDate) {
      return DateRangeEnum.thisWeek;
    }

    final lastWeekStart = today.subtract(Duration(days: today.weekday + 6));
    final lastWeekEnd = lastWeekStart.add(const Duration(days: 6));
    if (fromDate == lastWeekStart && lastWeekEnd == toDate) {
      return DateRangeEnum.lastWeek;
    }

    return DateRangeEnum.custom;
  }

  Future<void> _selectDate({bool isFromDate = false}) async {
    final today = _stripTime(DateTime.now());
    final fromDateText = _fromDateController.text;
    final toDateText = _toDateController.text;
    final fromDate = fromDateText.isNotEmpty ? _stripTime(_parseDate(fromDateText)) : today;
    final toDate = toDateText.isNotEmpty ? _stripTime(_parseDate(toDateText)) : today;

    return await showDatePicker(
      context: context,
      initialDate: isFromDate ? fromDate : toDate,
      firstDate: isFromDate ? DateTime(2026, 01, 01) : fromDate,
      lastDate: isFromDate ? toDate : today,
    ).then((dateTime) {
      if (dateTime == null) {
        return;
      } else {
        setState(() {
          final strippedDate = _stripTime(dateTime);

          if (isFromDate) {
            _fromDateController.text = _formatDate(strippedDate);

            final adjustedToDate = strippedDate.isAfter(toDate) ? strippedDate : toDate;
            _toDateController.text = _formatDate(adjustedToDate);
            _selectedDateRange = _handleChanges(
              today: today,
              fromDate: strippedDate,
              toDate: adjustedToDate,
            );

            widget.onDateChange(DateRangeModel(from: strippedDate, to: adjustedToDate));
          } else {
            _toDateController.text = _formatDate(strippedDate);

            final adjustedFromDate = strippedDate.isBefore(fromDate) ? strippedDate : fromDate;
            _fromDateController.text = _formatDate(adjustedFromDate);
            _selectedDateRange = _handleChanges(
              today: today,
              fromDate: adjustedFromDate,
              toDate: strippedDate,
            );

            widget.onDateChange(DateRangeModel(from: adjustedFromDate, to: strippedDate));
          }
        });
      }
    });
  }

  DateRangeModel? _calculateDateRange(DateRangeEnum range) {
    final today = _stripTime(DateTime.now());
    switch (range) {
      case DateRangeEnum.yesterday:
        final yesterday = today.subtract(Duration(days: 1));
        return DateRangeModel(from: yesterday, to: yesterday);
      case DateRangeEnum.today:
        return DateRangeModel(from: today, to: today);
      case DateRangeEnum.tomorrow:
        final tomorrow = today.add(const Duration(days: 1));
        return DateRangeModel(from: tomorrow, to: tomorrow);
      case DateRangeEnum.thisWeek:
        return DateRangeModel(
          from: today.subtract(Duration(days: today.weekday - 1)),
          to: today,
        );
      case DateRangeEnum.lastWeek:
        final lastWeekStart = today.subtract(Duration(days: today.weekday + 6));
        final lastWeekEnd = lastWeekStart.add(Duration(days: 6));
        return DateRangeModel(from: lastWeekStart, to: lastWeekEnd);
      case DateRangeEnum.custom:
        return null;
    }
  }

  void _applyDateRange(DateRangeEnum range) {
    final date = _calculateDateRange(range);
    if (date == null) {
      return;
    } else {
      setState(() {
        _selectedDateRange = range;
        _fromDateController.text = _formatDate(date.from);
        _toDateController.text = _formatDate(date.to);
      });

      widget.onDateChange(DateRangeModel(from: date.from, to: date.to));
    }
  }

  @override
  void initState() {
    super.initState();

    final strippedFromDate = _stripTime(widget.initialDateRange.from);
    final strippedToDate = _stripTime(widget.initialDateRange.to);

    _selectedDateRange = _handleChanges(
      today: _stripTime(DateTime.now()),
      fromDate: strippedFromDate,
      toDate: strippedToDate,
    );

    _fromDateController.text = _formatDate(strippedFromDate);
    _toDateController.text = _formatDate(strippedToDate);
  }

  @override
  void dispose() {
    _fromDateController.dispose();
    _toDateController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.all(context.scale(8)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: context.scale(20),
        children: [
          Text(
            'Select a date range to filter the transaction results.',
            style: TextStyle(
              color: context.appColors.neutralShade650,
              fontSize: context.scale(12),
            ),
          ),
          SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: context.scale(16),
              children: [
                CustomTextFormField(
                  controller: _fromDateController,
                  keyboardType: TextInputType.datetime,
                  labelText: 'From Date',
                  onTap: () => _selectDate(isFromDate: true),
                  prefixIcon: AppIcons.solidRoundedCalendar03,
                  readOnly: true,
                ),
                CustomTextFormField(
                  controller: _toDateController,
                  keyboardType: TextInputType.datetime,
                  labelText: 'To Date',
                  onTap: _selectDate,
                  prefixIcon: AppIcons.solidRoundedCalendar03,
                  readOnly: true,
                ),
                Wrap(
                  alignment: WrapAlignment.start,
                  crossAxisAlignment: WrapCrossAlignment.start,
                  runAlignment: WrapAlignment.start,
                  runSpacing: context.scale(12),
                  spacing: context.scale(12),
                  children: DateRangeEnum.values.map((DateRangeEnum type) {
                    return GestureDetector(
                      onTap: () => _applyDateRange(type),
                      child: Container(
                        decoration: BoxDecoration(
                          border: Border.all(color: (_selectedDateRange == type ? context.appColors.blueShade100 : context.appColors.backgroundShade300).withAlpha(0x8A)),
                          borderRadius: BorderRadius.circular(context.scale(21)),
                          color: (_selectedDateRange == type ? context.appColors.blueShade50 : context.appColors.backgroundShade200).withAlpha(63),
                        ),
                        padding: EdgeInsets.all(context.scale(14)),
                        child: Text(
                          type.label,
                          style: TextStyle(
                            color: context.appColors.neutralShade850,
                            fontSize: context.scale(12),
                            fontWeight: FontWeight.w500,
                            height: 1.0,
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AmountSelectionWidget extends StatelessWidget {
  final GlobalKey<FormState> formKey;
  final TextEditingController minAmountController;
  final TextEditingController maxAmountController;

  const _AmountSelectionWidget({
    required this.formKey,
    required this.minAmountController,
    required this.maxAmountController,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.all(context.scale(8)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: context.scale(20),
        children: [
          Text(
            'Select a range to filter transactions based on amount.',
            style: TextStyle(
              color: context.appColors.neutralShade650,
              fontSize: context.scale(12),
            ),
          ),
          SingleChildScrollView(
            child: Form(
              autovalidateMode: AutovalidateMode.always,
              key: formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: context.scale(16),
                children: [
                  CustomTextFormField(
                    controller: minAmountController,
                    errorMaxLines: 3,
                    inputFormatters: [NumberFormatter(maxValue: 10000)],
                    keyboardType: TextInputType.numberWithOptions(decimal: true),
                    labelText: 'Min Amount',
                    prefixIcon: AppIcons.solidRoundedMoney01,
                    validator: (String? value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Please enter a minimum amount.';
                      }

                      final minAmount = NumberFormatter.getRawValue(value);
                      if (minAmount < 0) return 'Min amount cannot be negative.';
                      if (minAmount > 4999) return 'Min amount cannot exceed ₹4999.';
                      if (maxAmountController.text.isNotEmpty) {
                        final maxAmount = NumberFormatter.getRawValue(maxAmountController.text);
                        if (minAmount >= maxAmount) {
                          return 'Min amount must be less than max amount.';
                        }
                      }

                      return null;
                    },
                  ),
                  CustomTextFormField(
                    controller: maxAmountController,
                    errorMaxLines: 3,
                    inputFormatters: [NumberFormatter(maxValue: 10000)],
                    keyboardType: TextInputType.numberWithOptions(decimal: true),
                    labelText: 'Max Amount',
                    prefixIcon: AppIcons.solidRoundedMoney01,
                    validator: (String? value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Please enter a maximum amount.';
                      }

                      final maxAmount = NumberFormatter.getRawValue(value);
                      if (maxAmount <= 0) return 'Max amount must be greater than zero.';
                      if (maxAmount > 5000) return 'Max amount cannot exceed ₹5000.';
                      if (minAmountController.text.isNotEmpty) {
                        final minAmount = NumberFormatter.getRawValue(minAmountController.text);
                        if (maxAmount <= minAmount) {
                          return 'Max amount must be greater than min amount.';
                        }
                      }

                      return null;
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// class _SelectableListWidget<T extends DisplayNameEnum> extends StatelessWidget {
//   final String description;
//   final List<T> items;
//   final List<T> selectedItems;
//   final void Function(T item, bool isSelected) onSelectionChanged;
//
//   const _SelectableListWidget({
//     required this.description,
//     required this.items,
//     required this.selectedItems,
//     required this.onSelectionChanged,
//   });
//
//   @override
//   Widget build(BuildContext context) {
//     return Padding(
//       padding: EdgeInsets.all(context.scale(8)),
//       child: Column(
//         crossAxisAlignment: CrossAxisAlignment.start,
//         spacing: context.scale(20),
//         children: [
//           Text(
//             description,
//             style: TextStyle(
//               color: context.appColors.neutral400,
//               fontSize: context.scale(11),
//               fontWeight: FontWeight.w500,
//             ),
//           ),
//           ListView.separated(
//             itemBuilder: (BuildContext context, int index) {
//               final item = items[index];
//               final isSelected = selectedItems.contains(item);
//               return Theme(
//                 data: ThemeData(
//                   checkboxTheme: Theme.of(context).checkboxTheme.copyWith(
//                     checkColor: WidgetStatePropertyAll(context.appColors.neutral000),
//                     fillColor: WidgetStateProperty.resolveWith((states) {
//                       if (states.contains(WidgetState.selected)) {
//                         return context.appColors.neutral600;
//                       } else {
//                         return Colors.transparent;
//                       }
//                     }),
//                     side: BorderSide(
//                       color: colorPalette!.neutral600,
//                       width: context.scale(1.75),
//                     ),
//                   ),
//                   highlightColor: Colors.transparent,
//                   listTileTheme: Theme.of(context).listTileTheme.copyWith(
//                     horizontalTitleGap: context.scale(12),
//                     minVerticalPadding: 0,
//                     minTileHeight: 0,
//                   ),
//                   splashColor: Colors.transparent,
//                   splashFactory: NoSplash.splashFactory,
//                 ),
//                 child: CheckboxListTile(
//                   contentPadding: EdgeInsets.zero,
//                   controlAffinity: ListTileControlAffinity.leading,
//                   dense: true,
//                   materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
//                   onChanged: (bool? value) {
//                     if (value != null) {
//                       onSelectionChanged(item, value);
//                     }
//                   },
//                   overlayColor: WidgetStateColor.transparent,
//                   title: Text(
//                     item.displayName,
//                     style: TextStyle(
//                       color: colorPalette.neutral700,
//                       fontSize: context.scale(13),
//                       fontWeight: FontWeight.normal,
//                     ),
//                   ),
//                   value: isSelected,
//                   visualDensity: VisualDensity.compact,
//                 ),
//               );
//             },
//             itemCount: items.length,
//             padding: EdgeInsets.zero,
//             physics: const ClampingScrollPhysics(),
//             separatorBuilder: (BuildContext context, int index) {
//               return Padding(
//                 padding: EdgeInsets.symmetric(
//                   vertical: context.scale(16),
//                 ).copyWith(left: context.scale(40)),
//                 child: Divider(
//                   color: context.appColors.neutralA200,
//                   height: 1.0,
//                 ),
//               );
//             },
//             shrinkWrap: true,
//           ),
//         ],
//       ),
//     );
//   }
// }

class _SortWidget<T1, T2> extends StatelessWidget {
  final T1 sortBy;
  final T2 sortOrder;
  final Set<ListTileOption<T1>> sortByOptions;
  final Set<ListTileOption<T2>> sortOrderOptions;
  final ValueSetter<T1> onSortByChanged;
  final ValueSetter<T2> onSortOrderChanged;

  const _SortWidget({
    required this.sortBy,
    required this.sortOrder,
    required this.sortByOptions,
    required this.sortOrderOptions,
    required this.onSortByChanged,
    required this.onSortOrderChanged,
  });

  Widget _buildSortSection<T>({
    required BuildContext context,
    required String title,
    required Set<ListTileOption<T>> options,
    required T currentValue,
    required ValueSetter<T> onTap,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: EdgeInsets.all(context.scale(16)),
          child: Text(
            title,
            style: TextStyle(
              color: context.appColors.neutralShade850,
              fontSize: context.scale(13),
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        Divider(
          color: context.appColors.backgroundShade200,
          height: 1.0,
        ),
        Theme(
          data: Theme.of(context).copyWith(
            highlightColor: Colors.transparent,
            splashColor: Colors.transparent,
          ),
          child: ListView.separated(
            itemBuilder: (BuildContext context, int index) {
              final option = options.elementAt(index);
              return ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(
                  option.icon,
                  color: context.appColors.neutralShade650,
                  size: context.scale(20),
                ),
                minLeadingWidth: 0,
                minTileHeight: 0,
                minVerticalPadding: 0,
                onTap: () {
                  if (option.value != null) {
                    onTap(option.value as T);
                  }
                },
                title: Text(
                  option.title,
                  style: TextStyle(
                    color: context.appColors.neutralShade650,
                    fontSize: context.scale(12),
                  ),
                ),
                trailing: () {
                  if (currentValue == option.value!) {
                    return Icon(
                      Icons.check,
                      color: context.appColors.neutralShade650,
                      size: context.scale(20),
                    );
                  } else {
                    return SizedBox.square(
                      dimension: context.scale(20),
                    );
                  }
                }(),
                visualDensity: VisualDensity.compact,
              );
            },
            itemCount: options.length,
            padding: EdgeInsets.all(context.scale(16)),
            physics: const NeverScrollableScrollPhysics(),
            separatorBuilder: (BuildContext context, int index) => Divider(
              color: context.appColors.backgroundShade200,
              height: context.scale(32) + 1.0,
            ),
            shrinkWrap: true,
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: context.scale(8)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: context.scale(20),
        children: [
          Padding(
            padding: EdgeInsets.symmetric(horizontal: context.scale(8)),
            child: Text(
              'Select a sorting option to organize transaction results.',
              style: TextStyle(
                color: context.appColors.neutralShade650,
                fontSize: context.scale(12),
              ),
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: context.scale(20),
                children: [
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: context.scale(8)),
                    child: Material(
                      borderRadius: BorderRadius.circular(context.scale(6)),
                      color: context.appColors.backgroundShade100,
                      child: _buildSortSection<T1>(
                        context: context,
                        currentValue: sortBy,
                        onTap: onSortByChanged,
                        options: sortByOptions,
                        title: 'Sort By',
                      ),
                    ),
                  ),
                  Divider(
                    color: context.appColors.secondaryDividerColor,
                    height: 1.0,
                  ),
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: context.scale(8)),
                    child: Material(
                      borderRadius: BorderRadius.circular(context.scale(6)),
                      color: context.appColors.backgroundShade100,
                      child: _buildSortSection<T2>(
                        context: context,
                        currentValue: sortOrder,
                        title: 'Sort Order',
                        onTap: onSortOrderChanged,
                        options: sortOrderOptions,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
