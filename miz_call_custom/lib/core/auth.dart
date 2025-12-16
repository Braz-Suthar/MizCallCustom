import 'package:permission_handler/permission_handler.dart';

Future<void> requestMicPermission() async {
  final status = await Permission.microphone.request();
  if (!status.isGranted) {
    throw Exception("Microphone permission denied");
  }
}
