// lib/core/connectivity/data/data_sources/remote/internet_status_remote_data_source_impl.dart

import 'package:http/http.dart' as http;

import 'internet_status_remote_data_source.dart';

class InternetStatusRemoteDataSourceImpl implements InternetStatusRemoteDataSource {
  final http.Client client;

  const InternetStatusRemoteDataSourceImpl(this.client);

  @override
  Future<bool> hasInternetConnection() async {
    try {
      final Uri url = Uri.https('clients3.google.com', '/generate_204');
      final http.Response response = await client.get(url).timeout(Duration(seconds: 3));
      return response.statusCode == 204;
    } catch (_) {
      return false;
    }
  }
}
