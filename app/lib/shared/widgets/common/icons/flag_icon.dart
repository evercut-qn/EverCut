// lib/shared/widgets/common/icons/flag_icon.dart

import 'package:flutter/widgets.dart';

import '../../../extensions/context/device_metrics_extension.dart';

class FlagIcon extends StatelessWidget {
  final FlagIconData? icon;
  final String? semanticLabel;
  final List<Shadow>? shadows;
  final double? size;
  final TextDirection? textDirection;
  final double? weight;

  const FlagIcon(
    this.icon, {
    super.key,
    this.semanticLabel,
    this.shadows,
    this.size,
    this.textDirection,
    this.weight,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: semanticLabel,
      child: ExcludeSemantics(
        child: SizedBox(
          height: context.scale(size ?? 20),
          width: context.scale(size ?? 20),
          child: Center(
            child: RichText(
              overflow: TextOverflow.visible,
              textDirection: textDirection,
              text: TextSpan(
                text: String.fromCharCode(icon?.firstCodePoint ?? 0) + String.fromCharCode(icon?.secondCodePoint ?? 0),
                style: TextStyle(
                  fontFamily: icon?.fontFamily,
                  fontSize: context.scale(size ?? 20),
                  fontWeight: weight != null ? FontWeight.lerp(FontWeight.w100, FontWeight.w900, weight!) : null,
                  height: 1.0,
                  shadows: shadows,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class FlagIconData {
  final int firstCodePoint;
  final int secondCodePoint;
  final String fontFamily;

  FlagIconData(
    this.firstCodePoint,
    this.secondCodePoint, {
    required this.fontFamily,
  });
}

class FlagIcons {
  static FlagIconData afghanistan = FlagIconData(0x1F1E6, 0x1F1EB, fontFamily: 'NotoColorEmoji');
  static FlagIconData alandIslands = FlagIconData(0x1F1E6, 0x1F1FD, fontFamily: 'NotoColorEmoji');
  static FlagIconData albania = FlagIconData(0x1F1E6, 0x1F1F1, fontFamily: 'NotoColorEmoji');
  static FlagIconData algeria = FlagIconData(0x1F1E9, 0x1F1FF, fontFamily: 'NotoColorEmoji');
  static FlagIconData americanSamoa = FlagIconData(0x1F1E6, 0x1F1F8, fontFamily: 'NotoColorEmoji');
  static FlagIconData andorra = FlagIconData(0x1F1E6, 0x1F1E9, fontFamily: 'NotoColorEmoji');
  static FlagIconData angola = FlagIconData(0x1F1E6, 0x1F1F4, fontFamily: 'NotoColorEmoji');
  static FlagIconData anguilla = FlagIconData(0x1F1E6, 0x1F1EE, fontFamily: 'NotoColorEmoji');
  static FlagIconData antarctica = FlagIconData(0x1F1E6, 0x1F1F6, fontFamily: 'NotoColorEmoji');
  static FlagIconData antiguaAndBarbuda = FlagIconData(0x1F1E6, 0x1F1EC, fontFamily: 'NotoColorEmoji');
  static FlagIconData argentina = FlagIconData(0x1F1E6, 0x1F1F7, fontFamily: 'NotoColorEmoji');
  static FlagIconData armenia = FlagIconData(0x1F1E6, 0x1F1F2, fontFamily: 'NotoColorEmoji');
  static FlagIconData aruba = FlagIconData(0x1F1E6, 0x1F1FC, fontFamily: 'NotoColorEmoji');
  static FlagIconData ascensionIsland = FlagIconData(0x1F1E6, 0x1F1E8, fontFamily: 'NotoColorEmoji');
  static FlagIconData australia = FlagIconData(0x1F1E6, 0x1F1FA, fontFamily: 'NotoColorEmoji');
  static FlagIconData austria = FlagIconData(0x1F1E6, 0x1F1F9, fontFamily: 'NotoColorEmoji');
  static FlagIconData azerbaijan = FlagIconData(0x1F1E6, 0x1F1FF, fontFamily: 'NotoColorEmoji');
  static FlagIconData bahamas = FlagIconData(0x1F1E7, 0x1F1F8, fontFamily: 'NotoColorEmoji');
  static FlagIconData bahrain = FlagIconData(0x1F1E7, 0x1F1ED, fontFamily: 'NotoColorEmoji');
  static FlagIconData bangladesh = FlagIconData(0x1F1E7, 0x1F1E9, fontFamily: 'NotoColorEmoji');
  static FlagIconData barbados = FlagIconData(0x1F1E7, 0x1F1E7, fontFamily: 'NotoColorEmoji');
  static FlagIconData belarus = FlagIconData(0x1F1E7, 0x1F1FE, fontFamily: 'NotoColorEmoji');
  static FlagIconData belgium = FlagIconData(0x1F1E7, 0x1F1EA, fontFamily: 'NotoColorEmoji');
  static FlagIconData belize = FlagIconData(0x1F1E7, 0x1F1FF, fontFamily: 'NotoColorEmoji');
  static FlagIconData benin = FlagIconData(0x1F1E7, 0x1F1EF, fontFamily: 'NotoColorEmoji');
  static FlagIconData bermuda = FlagIconData(0x1F1E7, 0x1F1F2, fontFamily: 'NotoColorEmoji');
  static FlagIconData bhutan = FlagIconData(0x1F1E7, 0x1F1F9, fontFamily: 'NotoColorEmoji');
  static FlagIconData bolivia = FlagIconData(0x1F1E7, 0x1F1F4, fontFamily: 'NotoColorEmoji');
  static FlagIconData bosniaAndHerzegovina = FlagIconData(0x1F1E7, 0x1F1E6, fontFamily: 'NotoColorEmoji');
  static FlagIconData botswana = FlagIconData(0x1F1E7, 0x1F1FC, fontFamily: 'NotoColorEmoji');
  static FlagIconData bouvetIsland = FlagIconData(0x1F1E7, 0x1F1FB, fontFamily: 'NotoColorEmoji');
  static FlagIconData brazil = FlagIconData(0x1F1E7, 0x1F1F7, fontFamily: 'NotoColorEmoji');
  static FlagIconData britishIndianOceanTerritory = FlagIconData(0x1F1EE, 0x1F1F4, fontFamily: 'NotoColorEmoji');
  static FlagIconData britishVirginIslands = FlagIconData(0x1F1FB, 0x1F1EC, fontFamily: 'NotoColorEmoji');
  static FlagIconData brunei = FlagIconData(0x1F1E7, 0x1F1F3, fontFamily: 'NotoColorEmoji');
  static FlagIconData bulgaria = FlagIconData(0x1F1E7, 0x1F1EC, fontFamily: 'NotoColorEmoji');
  static FlagIconData burkinaFaso = FlagIconData(0x1F1E7, 0x1F1EB, fontFamily: 'NotoColorEmoji');
  static FlagIconData burundi = FlagIconData(0x1F1E7, 0x1F1EE, fontFamily: 'NotoColorEmoji');
  static FlagIconData caboVerde = FlagIconData(0x1F1E8, 0x1F1FB, fontFamily: 'NotoColorEmoji');
  static FlagIconData cambodia = FlagIconData(0x1F1F0, 0x1F1ED, fontFamily: 'NotoColorEmoji');
  static FlagIconData cameroon = FlagIconData(0x1F1E8, 0x1F1F2, fontFamily: 'NotoColorEmoji');
  static FlagIconData canada = FlagIconData(0x1F1E8, 0x1F1E6, fontFamily: 'NotoColorEmoji');
  static FlagIconData canaryIslands = FlagIconData(0x1F1EE, 0x1F1E8, fontFamily: 'NotoColorEmoji');
  static FlagIconData caribbeanNetherlands = FlagIconData(0x1F1E7, 0x1F1F6, fontFamily: 'NotoColorEmoji');
  static FlagIconData caymanIslands = FlagIconData(0x1F1F0, 0x1F1FE, fontFamily: 'NotoColorEmoji');
  static FlagIconData centralAfricanRepublic = FlagIconData(0x1F1E8, 0x1F1EB, fontFamily: 'NotoColorEmoji');
  static FlagIconData ceutaAndMelilla = FlagIconData(0x1F1EA, 0x1F1E6, fontFamily: 'NotoColorEmoji');
  static FlagIconData chad = FlagIconData(0x1F1F9, 0x1F1E9, fontFamily: 'NotoColorEmoji');
  static FlagIconData chile = FlagIconData(0x1F1E8, 0x1F1F1, fontFamily: 'NotoColorEmoji');
  static FlagIconData china = FlagIconData(0x1F1E8, 0x1F1F3, fontFamily: 'NotoColorEmoji');
  static FlagIconData christmasIsland = FlagIconData(0x1F1E8, 0x1F1FD, fontFamily: 'NotoColorEmoji');
  static FlagIconData clippertonIsland = FlagIconData(0x1F1E8, 0x1F1F5, fontFamily: 'NotoColorEmoji');
  static FlagIconData cocosIslands = FlagIconData(0x1F1E8, 0x1F1E8, fontFamily: 'NotoColorEmoji');
  static FlagIconData colombia = FlagIconData(0x1F1E8, 0x1F1F4, fontFamily: 'NotoColorEmoji');
  static FlagIconData comoros = FlagIconData(0x1F1F0, 0x1F1F2, fontFamily: 'NotoColorEmoji');
  static FlagIconData cookIslands = FlagIconData(0x1F1E8, 0x1F1F0, fontFamily: 'NotoColorEmoji');
  static FlagIconData coteDIvoire = FlagIconData(0x1F1E8, 0x1F1EE, fontFamily: 'NotoColorEmoji');
  static FlagIconData costaRica = FlagIconData(0x1F1E8, 0x1F1F7, fontFamily: 'NotoColorEmoji');
  static FlagIconData croatia = FlagIconData(0x1F1ED, 0x1F1F7, fontFamily: 'NotoColorEmoji');
  static FlagIconData cuba = FlagIconData(0x1F1E8, 0x1F1FA, fontFamily: 'NotoColorEmoji');
  static FlagIconData curacao = FlagIconData(0x1F1E8, 0x1F1FC, fontFamily: 'NotoColorEmoji');
  static FlagIconData cyprus = FlagIconData(0x1F1E8, 0x1F1FE, fontFamily: 'NotoColorEmoji');
  static FlagIconData czechia = FlagIconData(0x1F1E8, 0x1F1FF, fontFamily: 'NotoColorEmoji');
  static FlagIconData democraticRepublicOfTheCongo = FlagIconData(0x1F1E8, 0x1F1E9, fontFamily: 'NotoColorEmoji');
  static FlagIconData denmark = FlagIconData(0x1F1E9, 0x1F1F0, fontFamily: 'NotoColorEmoji');
  static FlagIconData djibouti = FlagIconData(0x1F1E9, 0x1F1EF, fontFamily: 'NotoColorEmoji');
  static FlagIconData dominica = FlagIconData(0x1F1E9, 0x1F1F2, fontFamily: 'NotoColorEmoji');
  static FlagIconData dominicanRepublic = FlagIconData(0x1F1E9, 0x1F1F4, fontFamily: 'NotoColorEmoji');
  static FlagIconData ecuador = FlagIconData(0x1F1EA, 0x1F1E8, fontFamily: 'NotoColorEmoji');
  static FlagIconData egypt = FlagIconData(0x1F1EA, 0x1F1EC, fontFamily: 'NotoColorEmoji');
  static FlagIconData elSalvador = FlagIconData(0x1F1F8, 0x1F1FB, fontFamily: 'NotoColorEmoji');
  static FlagIconData equatorialGuinea = FlagIconData(0x1F1EC, 0x1F1F6, fontFamily: 'NotoColorEmoji');
  static FlagIconData eritrea = FlagIconData(0x1F1EA, 0x1F1F7, fontFamily: 'NotoColorEmoji');
  static FlagIconData estonia = FlagIconData(0x1F1EA, 0x1F1EA, fontFamily: 'NotoColorEmoji');
  static FlagIconData eswatini = FlagIconData(0x1F1F8, 0x1F1FF, fontFamily: 'NotoColorEmoji');
  static FlagIconData ethiopia = FlagIconData(0x1F1EA, 0x1F1F9, fontFamily: 'NotoColorEmoji');
  static FlagIconData europeanUnion = FlagIconData(0x1F1EA, 0x1F1FA, fontFamily: 'NotoColorEmoji');
  static FlagIconData falklandIslands = FlagIconData(0x1F1EB, 0x1F1F0, fontFamily: 'NotoColorEmoji');
  static FlagIconData faroeIslands = FlagIconData(0x1F1EB, 0x1F1F4, fontFamily: 'NotoColorEmoji');
  static FlagIconData fiji = FlagIconData(0x1F1EB, 0x1F1EF, fontFamily: 'NotoColorEmoji');
  static FlagIconData finland = FlagIconData(0x1F1EB, 0x1F1EE, fontFamily: 'NotoColorEmoji');
  static FlagIconData france = FlagIconData(0x1F1EB, 0x1F1F7, fontFamily: 'NotoColorEmoji');
  static FlagIconData frenchGuiana = FlagIconData(0x1F1EC, 0x1F1EB, fontFamily: 'NotoColorEmoji');
  static FlagIconData frenchPolynesia = FlagIconData(0x1F1F5, 0x1F1EB, fontFamily: 'NotoColorEmoji');
  static FlagIconData frenchSouthernTerritories = FlagIconData(0x1F1F9, 0x1F1EB, fontFamily: 'NotoColorEmoji');
  static FlagIconData gabon = FlagIconData(0x1F1EC, 0x1F1E6, fontFamily: 'NotoColorEmoji');
  static FlagIconData gambia = FlagIconData(0x1F1EC, 0x1F1F2, fontFamily: 'NotoColorEmoji');
  static FlagIconData georgia = FlagIconData(0x1F1EC, 0x1F1EA, fontFamily: 'NotoColorEmoji');
  static FlagIconData germany = FlagIconData(0x1F1E9, 0x1F1EA, fontFamily: 'NotoColorEmoji');
  static FlagIconData ghana = FlagIconData(0x1F1EC, 0x1F1ED, fontFamily: 'NotoColorEmoji');
  static FlagIconData gibraltar = FlagIconData(0x1F1EC, 0x1F1EE, fontFamily: 'NotoColorEmoji');
  static FlagIconData greece = FlagIconData(0x1F1EC, 0x1F1F7, fontFamily: 'NotoColorEmoji');
  static FlagIconData greenland = FlagIconData(0x1F1EC, 0x1F1F1, fontFamily: 'NotoColorEmoji');
  static FlagIconData grenada = FlagIconData(0x1F1EC, 0x1F1E9, fontFamily: 'NotoColorEmoji');
  static FlagIconData guadeloupe = FlagIconData(0x1F1EC, 0x1F1F5, fontFamily: 'NotoColorEmoji');
  static FlagIconData guam = FlagIconData(0x1F1EC, 0x1F1FA, fontFamily: 'NotoColorEmoji');
  static FlagIconData guatemala = FlagIconData(0x1F1EC, 0x1F1F9, fontFamily: 'NotoColorEmoji');
  static FlagIconData guernsey = FlagIconData(0x1F1EC, 0x1F1EC, fontFamily: 'NotoColorEmoji');
  static FlagIconData guinea = FlagIconData(0x1F1EC, 0x1F1F3, fontFamily: 'NotoColorEmoji');
  static FlagIconData guineaBissau = FlagIconData(0x1F1EC, 0x1F1FC, fontFamily: 'NotoColorEmoji');
  static FlagIconData guyana = FlagIconData(0x1F1EC, 0x1F1FE, fontFamily: 'NotoColorEmoji');
  static FlagIconData haiti = FlagIconData(0x1F1ED, 0x1F1F9, fontFamily: 'NotoColorEmoji');
  static FlagIconData heardAndMcDonaldIslands = FlagIconData(0x1F1ED, 0x1F1F2, fontFamily: 'NotoColorEmoji');
  static FlagIconData honduras = FlagIconData(0x1F1ED, 0x1F1F3, fontFamily: 'NotoColorEmoji');
  static FlagIconData hongKong = FlagIconData(0x1F1ED, 0x1F1F0, fontFamily: 'NotoColorEmoji');
  static FlagIconData hungary = FlagIconData(0x1F1ED, 0x1F1FA, fontFamily: 'NotoColorEmoji');
  static FlagIconData iceland = FlagIconData(0x1F1EE, 0x1F1F8, fontFamily: 'NotoColorEmoji');
  static FlagIconData india = FlagIconData(0x1F1EE, 0x1F1F3, fontFamily: 'NotoColorEmoji');
  static FlagIconData indonesia = FlagIconData(0x1F1EE, 0x1F1E9, fontFamily: 'NotoColorEmoji');
  static FlagIconData iran = FlagIconData(0x1F1EE, 0x1F1F7, fontFamily: 'NotoColorEmoji');
  static FlagIconData iraq = FlagIconData(0x1F1EE, 0x1F1F6, fontFamily: 'NotoColorEmoji');
  static FlagIconData ireland = FlagIconData(0x1F1EE, 0x1F1EA, fontFamily: 'NotoColorEmoji');
  static FlagIconData isleOfMan = FlagIconData(0x1F1EE, 0x1F1F2, fontFamily: 'NotoColorEmoji');
  static FlagIconData israel = FlagIconData(0x1F1EE, 0x1F1F1, fontFamily: 'NotoColorEmoji');
  static FlagIconData italy = FlagIconData(0x1F1EE, 0x1F1F9, fontFamily: 'NotoColorEmoji');
  static FlagIconData jamaica = FlagIconData(0x1F1EF, 0x1F1F2, fontFamily: 'NotoColorEmoji');
  static FlagIconData japan = FlagIconData(0x1F1EF, 0x1F1F5, fontFamily: 'NotoColorEmoji');
  static FlagIconData jersey = FlagIconData(0x1F1EF, 0x1F1EA, fontFamily: 'NotoColorEmoji');
  static FlagIconData jordan = FlagIconData(0x1F1EF, 0x1F1F4, fontFamily: 'NotoColorEmoji');
  static FlagIconData kazakhstan = FlagIconData(0x1F1F0, 0x1F1FF, fontFamily: 'NotoColorEmoji');
  static FlagIconData kenya = FlagIconData(0x1F1F0, 0x1F1EA, fontFamily: 'NotoColorEmoji');
  static FlagIconData kiribati = FlagIconData(0x1F1F0, 0x1F1EE, fontFamily: 'NotoColorEmoji');
  static FlagIconData kosovo = FlagIconData(0x1F1FD, 0x1F1F0, fontFamily: 'NotoColorEmoji');
  static FlagIconData kuwait = FlagIconData(0x1F1F0, 0x1F1FC, fontFamily: 'NotoColorEmoji');
  static FlagIconData kyrgyzstan = FlagIconData(0x1F1F0, 0x1F1EC, fontFamily: 'NotoColorEmoji');
  static FlagIconData laos = FlagIconData(0x1F1F1, 0x1F1E6, fontFamily: 'NotoColorEmoji');
  static FlagIconData latvia = FlagIconData(0x1F1F1, 0x1F1FB, fontFamily: 'NotoColorEmoji');
  static FlagIconData lebanon = FlagIconData(0x1F1F1, 0x1F1E7, fontFamily: 'NotoColorEmoji');
  static FlagIconData lesotho = FlagIconData(0x1F1F1, 0x1F1F8, fontFamily: 'NotoColorEmoji');
  static FlagIconData liberia = FlagIconData(0x1F1F1, 0x1F1F7, fontFamily: 'NotoColorEmoji');
  static FlagIconData libya = FlagIconData(0x1F1F1, 0x1F1FE, fontFamily: 'NotoColorEmoji');
  static FlagIconData liechtenstein = FlagIconData(0x1F1F1, 0x1F1EE, fontFamily: 'NotoColorEmoji');
  static FlagIconData lithuania = FlagIconData(0x1F1F1, 0x1F1F9, fontFamily: 'NotoColorEmoji');
  static FlagIconData luxembourg = FlagIconData(0x1F1F1, 0x1F1FA, fontFamily: 'NotoColorEmoji');
  static FlagIconData macau = FlagIconData(0x1F1F2, 0x1F1F4, fontFamily: 'NotoColorEmoji');
  static FlagIconData madagascar = FlagIconData(0x1F1F2, 0x1F1EC, fontFamily: 'NotoColorEmoji');
  static FlagIconData malawi = FlagIconData(0x1F1F2, 0x1F1FC, fontFamily: 'NotoColorEmoji');
  static FlagIconData malaysia = FlagIconData(0x1F1F2, 0x1F1FE, fontFamily: 'NotoColorEmoji');
  static FlagIconData maldives = FlagIconData(0x1F1F2, 0x1F1FB, fontFamily: 'NotoColorEmoji');
  static FlagIconData mali = FlagIconData(0x1F1F2, 0x1F1F1, fontFamily: 'NotoColorEmoji');
  static FlagIconData malta = FlagIconData(0x1F1F2, 0x1F1F9, fontFamily: 'NotoColorEmoji');
  static FlagIconData marshallIslands = FlagIconData(0x1F1F2, 0x1F1ED, fontFamily: 'NotoColorEmoji');
  static FlagIconData martinique = FlagIconData(0x1F1F2, 0x1F1F6, fontFamily: 'NotoColorEmoji');
  static FlagIconData mauritania = FlagIconData(0x1F1F2, 0x1F1F7, fontFamily: 'NotoColorEmoji');
  static FlagIconData mauritius = FlagIconData(0x1F1F2, 0x1F1FA, fontFamily: 'NotoColorEmoji');
  static FlagIconData mayotte = FlagIconData(0x1F1FE, 0x1F1F9, fontFamily: 'NotoColorEmoji');
  static FlagIconData mexico = FlagIconData(0x1F1F2, 0x1F1FD, fontFamily: 'NotoColorEmoji');
  static FlagIconData micronesia = FlagIconData(0x1F1EB, 0x1F1F2, fontFamily: 'NotoColorEmoji');
  static FlagIconData moldova = FlagIconData(0x1F1F2, 0x1F1E9, fontFamily: 'NotoColorEmoji');
  static FlagIconData monaco = FlagIconData(0x1F1F2, 0x1F1E8, fontFamily: 'NotoColorEmoji');
  static FlagIconData mongolia = FlagIconData(0x1F1F2, 0x1F1F3, fontFamily: 'NotoColorEmoji');
  static FlagIconData montenegro = FlagIconData(0x1F1F2, 0x1F1EA, fontFamily: 'NotoColorEmoji');
  static FlagIconData montserrat = FlagIconData(0x1F1F2, 0x1F1F8, fontFamily: 'NotoColorEmoji');
  static FlagIconData morocco = FlagIconData(0x1F1F2, 0x1F1E6, fontFamily: 'NotoColorEmoji');
  static FlagIconData mozambique = FlagIconData(0x1F1F2, 0x1F1FF, fontFamily: 'NotoColorEmoji');
  static FlagIconData myanmar = FlagIconData(0x1F1F2, 0x1F1F2, fontFamily: 'NotoColorEmoji');
  static FlagIconData namibia = FlagIconData(0x1F1F3, 0x1F1E6, fontFamily: 'NotoColorEmoji');
  static FlagIconData nauru = FlagIconData(0x1F1F3, 0x1F1F7, fontFamily: 'NotoColorEmoji');
  static FlagIconData nepal = FlagIconData(0x1F1F3, 0x1F1F5, fontFamily: 'NotoColorEmoji');
  static FlagIconData netherlands = FlagIconData(0x1F1F3, 0x1F1F1, fontFamily: 'NotoColorEmoji');
  static FlagIconData newCaledonia = FlagIconData(0x1F1F3, 0x1F1E8, fontFamily: 'NotoColorEmoji');
  static FlagIconData newZealand = FlagIconData(0x1F1F3, 0x1F1FF, fontFamily: 'NotoColorEmoji');
  static FlagIconData nicaragua = FlagIconData(0x1F1F3, 0x1F1EE, fontFamily: 'NotoColorEmoji');
  static FlagIconData niger = FlagIconData(0x1F1F3, 0x1F1EA, fontFamily: 'NotoColorEmoji');
  static FlagIconData nigeria = FlagIconData(0x1F1F3, 0x1F1EC, fontFamily: 'NotoColorEmoji');
  static FlagIconData niue = FlagIconData(0x1F1F3, 0x1F1FA, fontFamily: 'NotoColorEmoji');
  static FlagIconData norfolkIsland = FlagIconData(0x1F1F3, 0x1F1EB, fontFamily: 'NotoColorEmoji');
  static FlagIconData northKorea = FlagIconData(0x1F1F0, 0x1F1F5, fontFamily: 'NotoColorEmoji');
  static FlagIconData northMacedonia = FlagIconData(0x1F1F2, 0x1F1F0, fontFamily: 'NotoColorEmoji');
  static FlagIconData northernMarianaIslands = FlagIconData(0x1F1F2, 0x1F1F5, fontFamily: 'NotoColorEmoji');
  static FlagIconData norway = FlagIconData(0x1F1F3, 0x1F1F4, fontFamily: 'NotoColorEmoji');
  static FlagIconData oman = FlagIconData(0x1F1F4, 0x1F1F2, fontFamily: 'NotoColorEmoji');
  static FlagIconData pakistan = FlagIconData(0x1F1F5, 0x1F1F0, fontFamily: 'NotoColorEmoji');
  static FlagIconData palau = FlagIconData(0x1F1F5, 0x1F1FC, fontFamily: 'NotoColorEmoji');
  static FlagIconData palestine = FlagIconData(0x1F1F5, 0x1F1F8, fontFamily: 'NotoColorEmoji');
  static FlagIconData panama = FlagIconData(0x1F1F5, 0x1F1E6, fontFamily: 'NotoColorEmoji');
  static FlagIconData papuaNewGuinea = FlagIconData(0x1F1F5, 0x1F1EC, fontFamily: 'NotoColorEmoji');
  static FlagIconData paraguay = FlagIconData(0x1F1F5, 0x1F1FE, fontFamily: 'NotoColorEmoji');
  static FlagIconData peru = FlagIconData(0x1F1F5, 0x1F1EA, fontFamily: 'NotoColorEmoji');
  static FlagIconData philippines = FlagIconData(0x1F1F5, 0x1F1ED, fontFamily: 'NotoColorEmoji');
  static FlagIconData pitcairnIslands = FlagIconData(0x1F1F5, 0x1F1F3, fontFamily: 'NotoColorEmoji');
  static FlagIconData poland = FlagIconData(0x1F1F5, 0x1F1F1, fontFamily: 'NotoColorEmoji');
  static FlagIconData portugal = FlagIconData(0x1F1F5, 0x1F1F9, fontFamily: 'NotoColorEmoji');
  static FlagIconData puertoRico = FlagIconData(0x1F1F5, 0x1F1F7, fontFamily: 'NotoColorEmoji');
  static FlagIconData qatar = FlagIconData(0x1F1F6, 0x1F1E6, fontFamily: 'NotoColorEmoji');
  static FlagIconData republicOfTheCongo = FlagIconData(0x1F1E8, 0x1F1EC, fontFamily: 'NotoColorEmoji');
  static FlagIconData reunion = FlagIconData(0x1F1F7, 0x1F1EA, fontFamily: 'NotoColorEmoji');
  static FlagIconData romania = FlagIconData(0x1F1F7, 0x1F1F4, fontFamily: 'NotoColorEmoji');
  static FlagIconData russia = FlagIconData(0x1F1F7, 0x1F1FA, fontFamily: 'NotoColorEmoji');
  static FlagIconData rwanda = FlagIconData(0x1F1F7, 0x1F1FC, fontFamily: 'NotoColorEmoji');
  static FlagIconData saintBarthelemy = FlagIconData(0x1F1E7, 0x1F1F1, fontFamily: 'NotoColorEmoji');
  static FlagIconData saintHelena = FlagIconData(0x1F1F8, 0x1F1ED, fontFamily: 'NotoColorEmoji');
  static FlagIconData saintKittsAndNevis = FlagIconData(0x1F1F0, 0x1F1F3, fontFamily: 'NotoColorEmoji');
  static FlagIconData saintLucia = FlagIconData(0x1F1F1, 0x1F1E8, fontFamily: 'NotoColorEmoji');
  static FlagIconData saintMartin = FlagIconData(0x1F1F2, 0x1F1EB, fontFamily: 'NotoColorEmoji');
  static FlagIconData saintPierreAndMiquelon = FlagIconData(0x1F1F5, 0x1F1F2, fontFamily: 'NotoColorEmoji');
  static FlagIconData saintVincentAndTheGrenadines = FlagIconData(0x1F1FB, 0x1F1E8, fontFamily: 'NotoColorEmoji');
  static FlagIconData samoa = FlagIconData(0x1F1FC, 0x1F1F8, fontFamily: 'NotoColorEmoji');
  static FlagIconData sanMarino = FlagIconData(0x1F1F8, 0x1F1F2, fontFamily: 'NotoColorEmoji');
  static FlagIconData saoTomeAndPrincipe = FlagIconData(0x1F1F8, 0x1F1F9, fontFamily: 'NotoColorEmoji');
  static FlagIconData saudiArabia = FlagIconData(0x1F1F8, 0x1F1E6, fontFamily: 'NotoColorEmoji');
  static FlagIconData senegal = FlagIconData(0x1F1F8, 0x1F1F3, fontFamily: 'NotoColorEmoji');
  static FlagIconData serbia = FlagIconData(0x1F1F7, 0x1F1F8, fontFamily: 'NotoColorEmoji');
  static FlagIconData seychelles = FlagIconData(0x1F1F8, 0x1F1E8, fontFamily: 'NotoColorEmoji');
  static FlagIconData sierraLeone = FlagIconData(0x1F1F8, 0x1F1F1, fontFamily: 'NotoColorEmoji');
  static FlagIconData singapore = FlagIconData(0x1F1F8, 0x1F1EC, fontFamily: 'NotoColorEmoji');
  static FlagIconData sintMaarten = FlagIconData(0x1F1F8, 0x1F1FD, fontFamily: 'NotoColorEmoji');
  static FlagIconData slovakia = FlagIconData(0x1F1F8, 0x1F1F0, fontFamily: 'NotoColorEmoji');
  static FlagIconData slovenia = FlagIconData(0x1F1F8, 0x1F1EE, fontFamily: 'NotoColorEmoji');
  static FlagIconData solomonIslands = FlagIconData(0x1F1F8, 0x1F1E7, fontFamily: 'NotoColorEmoji');
  static FlagIconData somalia = FlagIconData(0x1F1F8, 0x1F1F4, fontFamily: 'NotoColorEmoji');
  static FlagIconData southAfrica = FlagIconData(0x1F1FF, 0x1F1E6, fontFamily: 'NotoColorEmoji');
  static FlagIconData southGeorgiaAndSouthSandwichIslands = FlagIconData(0x1F1EC, 0x1F1F8, fontFamily: 'NotoColorEmoji');
  static FlagIconData southKorea = FlagIconData(0x1F1F0, 0x1F1F7, fontFamily: 'NotoColorEmoji');
  static FlagIconData southSudan = FlagIconData(0x1F1F8, 0x1F1F8, fontFamily: 'NotoColorEmoji');
  static FlagIconData spain = FlagIconData(0x1F1EA, 0x1F1F8, fontFamily: 'NotoColorEmoji');
  static FlagIconData sriLanka = FlagIconData(0x1F1F1, 0x1F1F0, fontFamily: 'NotoColorEmoji');
  static FlagIconData sudan = FlagIconData(0x1F1F8, 0x1F1E9, fontFamily: 'NotoColorEmoji');
  static FlagIconData suriname = FlagIconData(0x1F1F8, 0x1F1F7, fontFamily: 'NotoColorEmoji');
  static FlagIconData svalbardAndJanMayen = FlagIconData(0x1F1F8, 0x1F1EF, fontFamily: 'NotoColorEmoji');
  static FlagIconData sweden = FlagIconData(0x1F1F8, 0x1F1EA, fontFamily: 'NotoColorEmoji');
  static FlagIconData switzerland = FlagIconData(0x1F1E8, 0x1F1ED, fontFamily: 'NotoColorEmoji');
  static FlagIconData syria = FlagIconData(0x1F1F8, 0x1F1FE, fontFamily: 'NotoColorEmoji');
  static FlagIconData taiwan = FlagIconData(0x1F1F9, 0x1F1FC, fontFamily: 'NotoColorEmoji');
  static FlagIconData tajikistan = FlagIconData(0x1F1F9, 0x1F1EF, fontFamily: 'NotoColorEmoji');
  static FlagIconData tanzania = FlagIconData(0x1F1F9, 0x1F1FF, fontFamily: 'NotoColorEmoji');
  static FlagIconData thailand = FlagIconData(0x1F1F9, 0x1F1ED, fontFamily: 'NotoColorEmoji');
  static FlagIconData timorLeste = FlagIconData(0x1F1F9, 0x1F1F1, fontFamily: 'NotoColorEmoji');
  static FlagIconData togo = FlagIconData(0x1F1F9, 0x1F1EC, fontFamily: 'NotoColorEmoji');
  static FlagIconData tokelau = FlagIconData(0x1F1F9, 0x1F1F0, fontFamily: 'NotoColorEmoji');
  static FlagIconData tonga = FlagIconData(0x1F1F9, 0x1F1F4, fontFamily: 'NotoColorEmoji');
  static FlagIconData trinidadAndTobago = FlagIconData(0x1F1F9, 0x1F1F9, fontFamily: 'NotoColorEmoji');
  static FlagIconData tristanDaCunha = FlagIconData(0x1F1F9, 0x1F1E6, fontFamily: 'NotoColorEmoji');
  static FlagIconData tunisia = FlagIconData(0x1F1F9, 0x1F1F3, fontFamily: 'NotoColorEmoji');
  static FlagIconData turkey = FlagIconData(0x1F1F9, 0x1F1F7, fontFamily: 'NotoColorEmoji');
  static FlagIconData turkmenistan = FlagIconData(0x1F1F9, 0x1F1F2, fontFamily: 'NotoColorEmoji');
  static FlagIconData turksAndCaicosIslands = FlagIconData(0x1F1F9, 0x1F1E8, fontFamily: 'NotoColorEmoji');
  static FlagIconData tuvalu = FlagIconData(0x1F1F9, 0x1F1FB, fontFamily: 'NotoColorEmoji');
  static FlagIconData uganda = FlagIconData(0x1F1FA, 0x1F1EC, fontFamily: 'NotoColorEmoji');
  static FlagIconData ukraine = FlagIconData(0x1F1FA, 0x1F1E6, fontFamily: 'NotoColorEmoji');
  static FlagIconData unitedArabEmirates = FlagIconData(0x1F1E6, 0x1F1EA, fontFamily: 'NotoColorEmoji');
  static FlagIconData unitedKingdom = FlagIconData(0x1F1EC, 0x1F1E7, fontFamily: 'NotoColorEmoji');
  static FlagIconData unitedStates = FlagIconData(0x1F1FA, 0x1F1F8, fontFamily: 'NotoColorEmoji');
  static FlagIconData unitedStatesOutlyingIslands = FlagIconData(0x1F1FA, 0x1F1F2, fontFamily: 'NotoColorEmoji');
  static FlagIconData unitedStatesVirginIslands = FlagIconData(0x1F1FB, 0x1F1EE, fontFamily: 'NotoColorEmoji');
  static FlagIconData uruguay = FlagIconData(0x1F1FA, 0x1F1FE, fontFamily: 'NotoColorEmoji');
  static FlagIconData uzbekistan = FlagIconData(0x1F1FA, 0x1F1FF, fontFamily: 'NotoColorEmoji');
  static FlagIconData vanuatu = FlagIconData(0x1F1FB, 0x1F1FA, fontFamily: 'NotoColorEmoji');
  static FlagIconData vaticanCity = FlagIconData(0x1F1FB, 0x1F1E6, fontFamily: 'NotoColorEmoji');
  static FlagIconData venezuela = FlagIconData(0x1F1FB, 0x1F1EA, fontFamily: 'NotoColorEmoji');
  static FlagIconData vietnam = FlagIconData(0x1F1FB, 0x1F1F3, fontFamily: 'NotoColorEmoji');
  static FlagIconData wallisAndFutuna = FlagIconData(0x1F1FC, 0x1F1EB, fontFamily: 'NotoColorEmoji');
  static FlagIconData westernSahara = FlagIconData(0x1F1EA, 0x1F1ED, fontFamily: 'NotoColorEmoji');
  static FlagIconData yemen = FlagIconData(0x1F1FE, 0x1F1EA, fontFamily: 'NotoColorEmoji');
  static FlagIconData zambia = FlagIconData(0x1F1FF, 0x1F1F2, fontFamily: 'NotoColorEmoji');
  static FlagIconData zimbabwe = FlagIconData(0x1F1FF, 0x1F1FC, fontFamily: 'NotoColorEmoji');
}
