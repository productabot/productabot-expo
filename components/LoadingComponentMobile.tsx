import * as React from 'react';
import { View, Animated, Easing } from 'react-native';
import { useTheme } from '@react-navigation/native';

export function LoadingComponentMobile() {
    const spinValue = new Animated.Value(0);
    Animated.loop(Animated.timing(spinValue, { toValue: 1, duration: 400, easing: Easing.sin, useNativeDriver: true })).start();
    const spin = spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const { colors } = useTheme();
    return (
        <View style={{ position: 'absolute', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 75, height: 75, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, borderColor: colors.text, borderWidth: 1, borderRadius: 10 }}>
                <Animated.View style={{ transform: [{ rotate: spin }], width: 40, height: 40, borderWidth: 5, borderRightColor: colors.background, borderRadius: 40, borderColor: colors.text }} />
            </View>
        </View>
    );
}