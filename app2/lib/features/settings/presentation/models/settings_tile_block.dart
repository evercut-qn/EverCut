// lib/features/settings/presentation/models/settings_tile_block.dart

import 'settings_tile.dart';

class SettingsTileBlock {
  final String heading;
  final Set<SettingsTile> tiles;

  const SettingsTileBlock({
    required this.heading,
    required this.tiles,
  });
}
