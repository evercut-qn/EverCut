
# EverCut — Flutter Integration Guide
## Presigned Upload Flow + Media Playback

**Document Version:** 2.0  
**Date:** May 2026  
**Stack:** Flutter / Dart · Dio · Riverpod  
**Classification:** Client Integration Blueprint

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Dependencies](#2-dependencies)
3. [Media Upload Service](#3-media-upload-service)
4. [Image Upload Flow](#4-image-upload-flow)
5. [Video Upload Flow (Multipart)](#5-video-upload-flow-multipart)
6. [Upload State Management](#6-upload-state-management)
7. [Error Handling & Retry](#7-error-handling--retry)
8. [UI Integration Patterns](#8-ui-integration-patterns)
9. [Video Playback](#9-video-playback)
10. [Migration Checklist](#10-migration-checklist)

---

## 1. Architecture Overview

### 1.1 Before (Cloudinary via Backend)

```
Flutter App → multipart/form-data → Node.js API → Cloudinary → URL back to Flutter
```

### 1.2 After (Presigned Direct Upload to R2)

```
Flutter App                        Node.js API                     Cloudflare R2
    │                                  │                                │
    │  POST /media/upload-url          │                                │
    │ ───────────────────────────────► │                                │
    │  ◄── { uploadUrl, mediaId }      │                                │
    │                                  │                                │
    │  PUT {uploadUrl} (binary)        │                                │
    │ ─────────────────────────────────────────────────────────────────►│
    │  ◄── 200 OK                      │                                │
    │                                  │                                │
    │  POST /media/confirm             │                                │
    │ ───────────────────────────────► │  HeadObject + validate         │
    │  ◄── { cdnUrl, mediaId }         │ ─────────────────────────────► │
    │                                  │                                │
```

### 1.3 Key Changes for Flutter

| Before | After |
|--------|-------|
| `MultipartFile` in request body | Binary PUT to presigned URL |
| Single API call | Three-step: request URL → upload → confirm |
| Backend handles upload errors | Client handles R2 upload errors + retry |
| No upload progress | Direct upload progress via Dio |
| No resume capability | Multipart resume for videos |
| Cloudinary URLs in responses | CDN URLs constructed from R2 keys |
| `POST /photos` for gallery | `POST /media/upload-url` → confirm → `POST /media/gallery` |
| `photo` field in forms | `photoMediaId` field (string, not file) |

### 1.4 API Contract Changes

Every endpoint that previously accepted a `photo` file field now accepts a `photoMediaId` string.
The file must be uploaded and confirmed **before** calling the entity endpoint.

| Before (multipart) | After (JSON) |
|---|---|
| `POST /employees` with `MultipartFile('photo')` | `POST /media/upload-url` → confirm → `POST /employees` with `photoMediaId` |
| `PATCH /shops/me/media/cover` with `MultipartFile('cover')` | `POST /media/upload-url` → confirm → `PATCH /shops/me/media/cover` with `{ mediaId }` |
| `POST /onboarding/customers` with `MultipartFile('photo')` | Upload → confirm → `POST /onboarding/customers` with `photoMediaId` |

---

## 2. Dependencies

```yaml
# pubspec.yaml additions
dependencies:
  dio: ^5.4.0                    # HTTP client (already likely present)
  flutter_secure_storage: ^9.0.0 # Persist multipart upload state for video resume
  path: ^1.9.0                  # File extension extraction
  mime: ^2.0.0                  # MIME type detection from file path
  image_picker: ^1.0.0          # Image selection (likely already present)
  file_picker: ^8.0.0           # Video/file selection
  media_kit: ^1.1.0             # Video playback (HLS support)
  media_kit_video: ^1.2.0       # Video player widget
```

---

## 3. Media Upload Service

```dart
// lib/core/services/media_upload_service.dart

import 'dart:io';
import 'package:dio/dio.dart';
import 'package:mime/mime.dart';

/// Result of a completed media upload.
class MediaUploadResult {
  final String mediaId;
  final String cdnUrl;
  final String r2Key;
  final String contentType;
  final int fileSize;

  const MediaUploadResult({
    required this.mediaId,
    required this.cdnUrl,
    required this.r2Key,
    required this.contentType,
    required this.fileSize,
  });
}

/// Service for uploading media via presigned URLs.
/// Uses two Dio instances:
///   - _apiClient: authenticated client for backend API calls
///   - _uploadClient: plain client for R2 presigned PUT (no auth interceptor)
class MediaUploadService {
  final Dio _apiClient;
  final Dio _uploadClient;

  MediaUploadService({required Dio apiClient})
    : _apiClient = apiClient,
      _uploadClient = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 30),
        sendTimeout: const Duration(minutes: 5),
        receiveTimeout: const Duration(seconds: 30),
      ));

  /// Full image upload flow: request URL → upload to R2 → confirm.
  /// Returns a [MediaUploadResult] with the confirmed mediaId and CDN URL.
  Future<MediaUploadResult> uploadImage({
    required File file,
    required String purpose,
    String? entityId,
    void Function(int sent, int total)? onProgress,
  }) async {
    // 1. Detect content type from file extension
    final mimeType = lookupMimeType(file.path) ?? 'image/jpeg';
    final fileSize = await file.length();

    // 2. Request presigned URL from backend
    final urlResponse = await _apiClient.post('/media/upload-url', data: {
      'contentType': mimeType,
      'sizeBytes': fileSize,
      'purpose': purpose,
      if (entityId != null) 'entityId': entityId,
    });

    final uploadUrl = urlResponse.data['data']['uploadUrl'] as String;
    final mediaId = urlResponse.data['data']['mediaId'] as String;

    // 3. Upload directly to R2 via presigned PUT
    final fileBytes = await file.readAsBytes();
    await _uploadClient.put(
      uploadUrl,
      data: Stream.fromIterable([fileBytes]),
      options: Options(
        headers: {
          'Content-Type': mimeType,
          'Content-Length': fileSize,
        },
      ),
      onSendProgress: onProgress,
    );

    // 4. Confirm upload with backend
    final confirmResponse = await _apiClient.post('/media/confirm', data: {
      'mediaId': mediaId,
    });

    final data = confirmResponse.data['data'];
    return MediaUploadResult(
      mediaId: data['mediaId'],
      cdnUrl: data['cdnUrl'],
      r2Key: data['r2Key'],
      contentType: data['contentType'],
      fileSize: data['fileSize'],
    );
  }
}
```

---

## 4. Image Upload Flow

### 4.1 Gallery Upload (Replaces POST /photos)

```dart
// BEFORE: Sent files directly to /photos
// final request = http.MultipartRequest('POST', photosUri);
// for (final file in selectedFiles) {
//   request.files.add(await http.MultipartFile.fromPath('photos', file.path));
// }
// request.fields['photoType'] = 'work_sample';

// AFTER: Upload each file → collect mediaIds → attach to gallery
final mediaIds = <String>[];
for (final file in selectedFiles) {
  final result = await mediaUploadService.uploadImage(
    file: file,
    purpose: 'gallery',
    entityId: shopId,
    onProgress: (sent, total) {
      final fileIndex = selectedFiles.indexOf(file);
      final overallProgress = (fileIndex + sent / total) / selectedFiles.length;
      uploadProgress.value = overallProgress;
    },
  );
  mediaIds.add(result.mediaId);
}

// Attach all uploaded media to gallery in one call
await apiClient.post('/media/gallery', data: {
  'mediaIds': mediaIds,
  'category': 'work_sample',
  'description': 'Latest haircuts',
});
```

### 4.2 Employee Photo (Replaces MultipartFile in /employees)

```dart
// BEFORE:
// final request = http.MultipartRequest('POST', employeesUri);
// request.files.add(await http.MultipartFile.fromPath('photo', file.path));
// request.fields['firstName'] = 'John';

// AFTER:
// Step 1: Upload photo first
final photoResult = await mediaUploadService.uploadImage(
  file: employeePhoto,
  purpose: 'employee',
  entityId: shopId,
);

// Step 2: Send employee data with mediaId (no file)
await apiClient.post('/employees', data: {
  'firstName': 'John',
  'lastName': 'Doe',
  // ... other fields
  'photoMediaId': photoResult.mediaId,
});
```

### 4.3 Onboarding Flow

```dart
// BEFORE:
// final request = http.MultipartRequest('POST', onboardingUri);
// request.files.add(await http.MultipartFile.fromPath('photo', file.path));
// request.fields['firstName'] = firstName;

// AFTER:
// Step 1: Upload photo first
final photoResult = await mediaUploadService.uploadImage(
  file: profilePhoto,
  purpose: 'onboarding',
);

// Step 2: Send onboarding data with mediaId (no file)
await apiClient.post('/onboarding/customers', data: {
  'firstName': firstName,
  'lastName': lastName,
  // ... other fields
  'photoMediaId': photoResult.mediaId,
});
```

### 4.4 Shop Cover / Profile Picture

```dart
// BEFORE:
// final request = http.MultipartRequest('PATCH', coverUri);
// request.files.add(await http.MultipartFile.fromPath('cover', file.path));

// AFTER:
final coverResult = await mediaUploadService.uploadImage(
  file: coverImage,
  purpose: 'cover',
  entityId: shopId,
);

await apiClient.patch('/shops/me/media/cover', data: {
  'mediaId': coverResult.mediaId,
});
```

---

## 5. Video Upload Flow (Multipart)

```dart
// lib/core/services/video_upload_service.dart

import 'dart:io';
import 'dart:math';
import 'dart:typed_data';
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class VideoUploadService {
  final Dio _apiClient;
  final Dio _uploadClient;
  final FlutterSecureStorage _secureStorage;

  static const int _partSize = 50 * 1024 * 1024; // 50 MB
  static const int _maxConcurrency = 3;
  static const int _maxRetries = 5;

  VideoUploadService({required Dio apiClient})
    : _apiClient = apiClient,
      _uploadClient = Dio(BaseOptions(sendTimeout: const Duration(minutes: 10))),
      _secureStorage = const FlutterSecureStorage();

  Future<String> uploadVideo({
    required File file,
    void Function(double progress)? onProgress,
  }) async {
    final fileSize = await file.length();
    final mimeType = 'video/mp4';

    // 1. Initiate multipart upload
    final initResponse = await _apiClient.post('/media/video/initiate', data: {
      'contentType': mimeType,
      'sizeBytes': fileSize,
    });

    final videoId = initResponse.data['data']['videoId'] as String;
    final uploadId = initResponse.data['data']['uploadId'] as String;
    final parts = (initResponse.data['data']['parts'] as List)
        .map((p) => _PartInfo(partNumber: p['partNumber'], uploadUrl: p['uploadUrl']))
        .toList();

    // 2. Upload parts with concurrency control and resume support
    final completedParts = <_CompletedPart>[];
    final totalParts = parts.length;
    int completedCount = 0;

    // Load previously completed parts (for resume)
    final savedState = await _loadUploadState(videoId);

    for (int i = 0; i < parts.length; i += _maxConcurrency) {
      final batch = parts.skip(i).take(_maxConcurrency);
      await Future.wait(batch.map((part) async {
        // Skip already completed parts
        if (savedState.containsKey(part.partNumber)) {
          completedParts.add(savedState[part.partNumber]!);
          completedCount++;
          return;
        }

        final start = (part.partNumber - 1) * _partSize;
        final end = min(start + _partSize, fileSize);
        final raf = await file.open();
        await raf.setPosition(start);
        final bytes = await raf.read(end - start);
        await raf.close();

        final etag = await _uploadPartWithRetry(videoId, part, bytes);
        final completed = _CompletedPart(partNumber: part.partNumber, etag: etag);
        completedParts.add(completed);
        await _savePartState(videoId, completed);

        completedCount++;
        onProgress?.call(completedCount / totalParts);
      }));
    }

    // 3. Complete multipart upload
    await _apiClient.post('/media/video/complete', data: {
      'videoId': videoId,
      'uploadId': uploadId,
      'parts': completedParts.map((p) => {'partNumber': p.partNumber, 'etag': p.etag}).toList(),
    });

    await _clearUploadState(videoId);
    return videoId;
  }

  Future<String> _uploadPartWithRetry(String videoId, _PartInfo part, Uint8List data) async {
    for (int attempt = 0; attempt < _maxRetries; attempt++) {
      try {
        final response = await _uploadClient.put(
          part.uploadUrl,
          data: Stream.fromIterable([data]),
          options: Options(headers: {
            'Content-Type': 'video/mp4',
            'Content-Length': data.length,
          }),
        );
        return response.headers.value('etag') ?? '';
      } on DioException catch (e) {
        if (e.response?.statusCode == 403 && attempt < _maxRetries - 1) {
          // URL expired — request a new one
          final newUrl = await _apiClient.post(
            '/media/video/part-url/$videoId/${part.partNumber}',
          );
          part = _PartInfo(
            partNumber: part.partNumber,
            uploadUrl: newUrl.data['data']['uploadUrl'],
          );
          continue;
        }
        if (attempt < _maxRetries - 1) {
          await Future.delayed(Duration(seconds: pow(2, attempt).toInt()));
          continue;
        }
        rethrow;
      }
    }
    throw Exception('Failed to upload part ${part.partNumber} after $_maxRetries attempts');
  }

  // ── Persist/resume helpers ────────────────────────────────────────────

  Future<Map<int, _CompletedPart>> _loadUploadState(String videoId) async {
    final raw = await _secureStorage.read(key: 'upload_$videoId');
    if (raw == null) return {};
    final map = jsonDecode(raw) as Map<String, dynamic>;
    return map.map((k, v) => MapEntry(int.parse(k), _CompletedPart.fromJson(v)));
  }

  Future<void> _savePartState(String videoId, _CompletedPart part) async {
    final current = await _loadUploadState(videoId);
    current[part.partNumber] = part;
    await _secureStorage.write(
      key: 'upload_$videoId',
      value: jsonEncode(current.map((k, v) => MapEntry(k.toString(), v.toJson()))),
    );
  }

  Future<void> _clearUploadState(String videoId) async {
    await _secureStorage.delete(key: 'upload_$videoId');
  }
}

class _PartInfo {
  final int partNumber;
  String uploadUrl;
  _PartInfo({required this.partNumber, required this.uploadUrl});
}

class _CompletedPart {
  final int partNumber;
  final String etag;
  const _CompletedPart({required this.partNumber, required this.etag});
  factory _CompletedPart.fromJson(Map<String, dynamic> json) =>
      _CompletedPart(partNumber: json['partNumber'], etag: json['etag']);
  Map<String, dynamic> toJson() => {'partNumber': partNumber, 'etag': etag};
}
```

---

## 6. Upload State Management

### 6.1 Riverpod Provider

```dart
// lib/core/providers/media_upload_provider.dart

enum UploadStatus { idle, uploading, confirming, completed, failed }

class UploadState {
  final UploadStatus status;
  final double progress;
  final String? mediaId;
  final String? cdnUrl;
  final String? error;

  const UploadState({
    this.status = UploadStatus.idle,
    this.progress = 0.0,
    this.mediaId,
    this.cdnUrl,
    this.error,
  });

  UploadState copyWith({
    UploadStatus? status,
    double? progress,
    String? mediaId,
    String? cdnUrl,
    String? error,
  }) => UploadState(
    status: status ?? this.status,
    progress: progress ?? this.progress,
    mediaId: mediaId ?? this.mediaId,
    cdnUrl: cdnUrl ?? this.cdnUrl,
    error: error ?? this.error,
  );
}
```

---

## 7. Error Handling & Retry

| Error | Cause | Client Action |
|-------|-------|---------------|
| `403` on presigned PUT | URL expired (> 15 min) | Re-request from `/media/upload-url`; use new mediaId |
| `400` on confirm | File not yet in R2 | Retry confirm after 2s delay (max 3 retries) |
| `400` "Content-Type mismatch" | Client sent wrong Content-Type header | Show error; re-select file |
| `400` "Magic byte mismatch" | File extension doesn't match content | Show error; reject file |
| Network timeout on PUT | Slow connection | Retry with exponential backoff (2^attempt seconds) |
| `413` on PUT | File too large (unlikely with presigned limit) | Show file size error |
| `404` on confirm | Wrong mediaId or wrong user | Check mediaId matches; re-authenticate |

---

## 8. UI Integration Patterns

### 8.1 Upload Progress Indicator

```dart
StreamBuilder<double>(
  stream: uploadProgressStream,
  builder: (context, snapshot) {
    final progress = snapshot.data ?? 0.0;
    return Column(
      children: [
        LinearProgressIndicator(value: progress),
        Text('${(progress * 100).toStringAsFixed(0)}%'),
      ],
    );
  },
)
```

### 8.2 Image Display from CDN URL

```dart
// API responses now return CDN URLs instead of Cloudinary URLs.
// No client-side change needed for display — just use the URL:
Image.network(
  shopData['coverUrl'],  // CDN URL: https://media.evercut.com/images/covers/...
  fit: BoxFit.cover,
  loadingBuilder: (context, child, progress) {
    if (progress == null) return child;
    return CircularProgressIndicator(
      value: progress.expectedTotalBytes != null
          ? progress.cumulativeBytesLoaded / progress.expectedTotalBytes!
          : null,
    );
  },
  errorBuilder: (context, error, stackTrace) {
    return const Icon(Icons.broken_image, size: 48);
  },
)
```

### 8.3 Gallery Display (API Response Change)

```dart
// BEFORE: API returned { photos: [...] }
// AFTER: API returns { gallery: [...] }

// Each gallery item now has:
// {
//   "id": "uuid",
//   "url": "https://media.evercut.com/images/gallery/...",
//   "photoUrl": "https://media.evercut.com/images/gallery/...",  ← backward compat
//   "category": "work_sample",
//   "description": "...",
//   "createdAt": "..."
// }
```

---

## 9. Video Playback

```dart
// Using media_kit for HLS playback
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';

final player = Player();
final videoController = VideoController(player);

// Play HLS stream from CDN
await player.open(Media(
  'https://media.evercut.com/videos/hls/{videoId}/master.m3u8?token={mediaToken}',
));
```

---

## 10. Migration Checklist

### 10.1 Infrastructure

- [ ] Add `dio` upload client (separate instance, no auth interceptor)
- [ ] Implement `MediaUploadService` with three-step flow
- [ ] Implement `VideoUploadService` with multipart + resume
- [ ] Add `UploadState` provider for state management

### 10.2 Feature Updates

- [ ] Update gallery upload flow: `POST /photos` → upload + `POST /media/gallery`
- [ ] Update employee CRUD: `MultipartFile('photo')` → `photoMediaId` string
- [ ] Update customer profile: `MultipartFile('photo')` → `photoMediaId` string
- [ ] Update shop cover: `MultipartFile('cover')` → `{ mediaId }` JSON body
- [ ] Update shop profile picture: `MultipartFile('photo')` → `{ mediaId }` JSON body
- [ ] Update customer onboarding: `MultipartFile('photo')` → `photoMediaId`
- [ ] Update barber onboarding: `MultipartFile('photo')` → `photoMediaId`

### 10.3 Cleanup

- [ ] Remove all `http.MultipartRequest` patterns from data sources
- [ ] Remove `multipart/form-data` content type headers for media endpoints
- [ ] Update API response parsing: `photos` array → `gallery` array where applicable
- [ ] Add upload progress indicators to all upload screens
- [ ] Add error handling for presigned URL expiry (re-request flow)
- [ ] Test offline/resume behavior for video uploads

---

*End of Flutter Integration Guide — Version 2.0*
