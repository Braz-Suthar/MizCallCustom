import 'package:flutter/material.dart';

class MicButton extends StatefulWidget {
  final VoidCallback onPressed;
  final VoidCallback onReleased;

  const MicButton({
    super.key,
    required this.onPressed,
    required this.onReleased,
  });

  @override
  State<MicButton> createState() => _MicButtonState();
}

class _MicButtonState extends State<MicButton> {
  bool pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) {
        setState(() => pressed = true);
        widget.onPressed();
      },
      onTapUp: (_) {
        setState(() => pressed = false);
        widget.onReleased();
      },
      onTapCancel: () {
        setState(() => pressed = false);
        widget.onReleased();
      },
      child: CircleAvatar(
        radius: 36,
        backgroundColor: pressed ? Colors.red : Colors.green,
        child: const Icon(Icons.mic, size: 32),
      ),
    );
  }
}
