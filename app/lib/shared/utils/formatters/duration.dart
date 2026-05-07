// lib/shared/utils/formatters/duration.dart

String durationFormatter(int seconds) {
  if (seconds < 60) {
    return '${seconds.toString().padLeft(2, '0')}s';
  } else if (seconds < 3600) {
    return '${seconds ~/ 60}m ${(seconds % 60).toString().padLeft(2, '0')}s';
  } else {
    return '${seconds ~/ 3600}h ${(seconds % 3600) ~/ 60}m';
  }
}
