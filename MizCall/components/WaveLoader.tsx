import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface WaveLoaderProps {
  variant?: 'primary' | 'white' | 'black';
  size?: 'small' | 'medium' | 'large';
}

export const WaveLoader: React.FC<WaveLoaderProps> = ({
  variant = 'primary',
  size = 'medium',
}) => {
  // Create 8 animated values for 8 bars
  const animatedValues = useRef(
    Array.from({ length: 8 }, () => new Animated.Value(0.4))
  ).current;

  useEffect(() => {
    // Create staggered wave animations
    const animations = animatedValues.map((animValue, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: 1,
            duration: 500,
            delay: index * 100, // Stagger each bar by 100ms
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0.4,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
    });

    // Start all animations
    Animated.parallel(animations).start();

    return () => {
      animations.forEach((anim) => anim.stop());
    };
  }, [animatedValues]);

  // Determine sizes based on size prop
  let containerHeight = 40; // medium default
  let barWidth = 6;
  let barSpacing = 4;

  switch (size) {
    case 'small':
      containerHeight = 20;
      barWidth = 4;
      barSpacing = 2;
      break;
    case 'large':
      containerHeight = 64;
      barWidth = 8;
      barSpacing = 6;
      break;
    case 'medium':
    default:
      containerHeight = 40;
      barWidth = 6;
      barSpacing = 4;
      break;
  }

  // Determine bar color based on variant
  let barColor = '#5B9FFF'; // primary default
  switch (variant) {
    case 'white':
      barColor = '#FFFFFF';
      break;
    case 'black':
      barColor = '#000000';
      break;
    case 'primary':
    default:
      barColor = '#5B9FFF';
      break;
  }

  // Bar heights as percentages (matching the web version)
  const barHeightPercentages = [0.4, 0.6, 1.0, 0.4, 0.6, 1.0, 0.6, 0.4];

  return (
    <View style={[styles.container, { height: containerHeight }]}>
      {animatedValues.map((animValue, index) => {
        const baseHeight = containerHeight * barHeightPercentages[index];
        
        return (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              {
                width: barWidth,
                height: baseHeight,
                backgroundColor: barColor,
                marginHorizontal: barSpacing / 2,
                transform: [
                  {
                    scaleY: animValue, // Animate the scale
                  },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    borderRadius: 999,
  },
});

