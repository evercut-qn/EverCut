// lib/shared/widgets/overlays/sort_dialog.dart

import 'package:flutter/material.dart';

import '../../extensions/context/app_colors_extension.dart';
import '../../extensions/context/device_metrics_extension.dart';

void showSortDialog<T1, T2>({
  required BuildContext context,
  required T1 initialSortBy,
  required T2 initialSortOrder,
  required void Function(T1, T2) onChange,
  required Map<String, T1> sortByOptions,
  required Map<String, T2> sortOrderOptions,
}) {
  showModalBottomSheet(
    backgroundColor: Colors.transparent,
    barrierColor: Colors.black.withAlpha(31),
    barrierLabel: 'Close Sort Dialog',
    context: context,
    isDismissible: true,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (BuildContext context) => _SortDialogWidget<T1, T2>(
      initialSortBy: initialSortBy,
      initialSortOrder: initialSortOrder,
      onChange: onChange,
      sortByOptions: sortByOptions,
      sortOrderOptions: sortOrderOptions,
    ),
  );
}

class _SortDialogWidget<T1, T2> extends StatefulWidget {
  final T1 initialSortBy;
  final T2 initialSortOrder;
  final void Function(T1, T2) onChange;
  final Map<String, T1> sortByOptions;
  final Map<String, T2> sortOrderOptions;

  const _SortDialogWidget({
    super.key,
    required this.initialSortBy,
    required this.initialSortOrder,
    required this.onChange,
    required this.sortByOptions,
    required this.sortOrderOptions,
  });

  @override
  State<_SortDialogWidget<T1, T2>> createState() => _SortDialogWidgetState<T1, T2>();
}

class _SortDialogWidgetState<T1, T2> extends State<_SortDialogWidget<T1, T2>> {
  late T1 _sortByState;
  late T2 _sortOrderState;

  @override
  void initState() {
    super.initState();
    _sortByState = widget.initialSortBy;
    _sortOrderState = widget.initialSortOrder;
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.all(context.scale(12)),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              height: context.scale(6),
              width: context.scale(80),
              margin: EdgeInsets.symmetric(vertical: context.scale(8)),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(context.scale(3)),
                color: context.appColors.dialogBackgroundColor,
              ),
            ),
            Flexible(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(context.scale(16)),
                  color: context.appColors.dialogBackgroundColor,
                ),
                child: SingleChildScrollView(
                  scrollDirection: Axis.vertical,
                  child: Column(
                    children: [
                      Padding(
                        padding: EdgeInsets.all(context.scale(20)),
                        child: _SortDialogSectionWidget<T1>(
                          title: 'Sort By',
                          options: widget.sortByOptions,
                          currentValue: _sortByState,
                          onTap: (T1 value) {
                            if (_sortByState != value) {
                              setState(() {
                                _sortByState = value;
                              });
                              widget.onChange(_sortByState, _sortOrderState);
                            }
                          },
                        ),
                      ),
                      Divider(
                        color: context.appColors.secondaryDividerColor,
                        height: 1.0,
                      ),
                      Padding(
                        padding: EdgeInsets.all(context.scale(20)),
                        child: _SortDialogSectionWidget<T2>(
                          title: 'Sort Order',
                          options: widget.sortOrderOptions,
                          currentValue: _sortOrderState,
                          onTap: (T2 value) {
                            if (_sortOrderState != value) {
                              setState(() {
                                _sortOrderState = value;
                              });
                              widget.onChange(_sortByState, _sortOrderState);
                            }
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SortDialogSectionWidget<T> extends StatelessWidget {
  final String title;
  final Map<String, T> options;
  final T currentValue;
  final ValueSetter<T> onTap;

  const _SortDialogSectionWidget({
    super.key,
    required this.title,
    required this.options,
    required this.currentValue,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: context.scale(14),
            fontWeight: FontWeight.w600,
          ),
        ),
        Divider(
          color: context.appColors.secondaryDividerColor,
          height: context.scale(32),
        ),
        ListView.separated(
          itemBuilder: (BuildContext context, int index) {
            final label = options.keys.elementAt(index);
            final value = options.values.elementAt(index);
            return InkWell(
              onTap: () => onTap(value),
              overlayColor: WidgetStateColor.transparent,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: context.scale(13),
                    ),
                  ),
                  if (currentValue == value) ...[
                    Icon(
                      Icons.check,
                      color: context.appColors.neutralShade850,
                      size: context.scale(22),
                    ),
                  ] else ...[
                    SizedBox.square(
                      dimension: context.scale(22),
                    ),
                  ],
                ],
              ),
            );
          },
          itemCount: options.length,
          padding: EdgeInsets.zero,
          physics: const NeverScrollableScrollPhysics(),
          separatorBuilder: (BuildContext context, int index) => Divider(
            color: context.appColors.secondaryDividerColor,
            height: context.scale(32),
          ),
          shrinkWrap: true,
        ),
      ],
    );
  }
}
