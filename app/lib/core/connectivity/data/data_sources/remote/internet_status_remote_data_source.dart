// lib/core/connectivity/data/data_sources/remote/internet_status_remote_data_source.dart

abstract class InternetStatusRemoteDataSource {
  Future<bool> hasInternetConnection();
}
