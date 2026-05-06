// lib/shared/widgets/common/inputs/location_picker_field.dart

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';

import '../../../../core/constants/regex/allowed_characters_regex.dart';
import '../../../../core/theme/foundation/app_icons.dart';
import '../../overlays/snackbars.dart';

import 'text_form_field.dart';

class LocationPickerField extends StatefulWidget {
  final TextEditingController controller;
  final ValueChanged<Position> onChange;

  const LocationPickerField({
    super.key,
    required this.controller,
    required this.onChange,
  });

  @override
  State<LocationPickerField> createState() => _LocationPickerFieldState();
}

class _LocationPickerFieldState extends State<LocationPickerField> {
  Future<Position> _determinePosition() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      return Future.error('Location services are disabled.');
    } else {
      LocationPermission permission = await Geolocator.checkPermission();

      switch (permission) {
        case LocationPermission.denied:
          permission = await Geolocator.requestPermission();

          if (permission == LocationPermission.denied) {
            return Future.error('Location permissions are denied.');
          } else if (permission == LocationPermission.deniedForever) {
            return Future.error('Location permissions are permanently denied, we cannot request permissions.');
          } else {
            return await Geolocator.getCurrentPosition();
          }
        case LocationPermission.deniedForever:
          return Future.error('Location permissions are permanently denied, we cannot request permissions.');
        case LocationPermission.whileInUse:
        case LocationPermission.always:
          return await Geolocator.getCurrentPosition();
        case LocationPermission.unableToDetermine:
          return Future.error('Unable to determine location permission status.');
      }
    }
  }

  Future<void> _onTextFormFieldTap() async {
    widget.controller.text = 'Loading...';

    try {
      final position = await _determinePosition();
      final placemarks = await placemarkFromCoordinates(position.latitude, position.longitude);

      if (placemarks.isNotEmpty) {
        final List<String?> rawData = [
          placemarks.first.subThoroughfare,
          placemarks.first.thoroughfare,
          placemarks.first.locality,
          placemarks.first.subAdministrativeArea,
          placemarks.first.administrativeArea,
          placemarks.first.country,
          placemarks.first.postalCode,
        ];

        final List<String?> data = rawData.map((String? element) {
          if (element != null && element.isNotEmpty) {
            return element;
          }
        }).toList();

        widget.controller.text = data.join(', ');
      } else {
        widget.controller.text = '${position.latitude}° N, ${position.longitude}° E';
      }

      widget.onChange(position);
    } catch (error) {
      if (mounted) {
        SnackBars.of(context).showErrorSnackBar(
          title: 'Location Access Failed',
          message: 'We couldn’t access your location. Please check your location permissions and try again.',
        );
      }
    } finally {
      if (mounted) {
        FocusScope.of(context).unfocus();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return CustomTextFormField(
      controller: widget.controller,
      inputFormatters: [
        TextInputFormatter.withFunction((TextEditingValue oldValue, TextEditingValue newValue) {
          if (RegExp(AllowedCharactersRegEx.words).hasMatch(newValue.text)) {
            return newValue;
          } else {
            return oldValue;
          }
        }),
      ],
      keyboardType: TextInputType.text,
      labelText: 'Shop Location',
      onTap: _onTextFormFieldTap,
      onSuffixIconPressed: _onTextFormFieldTap,
      prefixIcon: AppIcons.solidRoundedStoreLocation02,
      suffixIcon: AppIcons.solidRoundedLocation04,
      readOnly: true,
      textCapitalization: TextCapitalization.words,
      validator: (String? text) {
        if (text == null || text.isEmpty) {
          return 'Please enter your shop location.';
        } else {
          return null;
        }
      },
    );
  }
}
